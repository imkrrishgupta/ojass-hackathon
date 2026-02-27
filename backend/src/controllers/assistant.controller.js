import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { runLLMJson } from "../utils/llm.js";

const guidanceMap = {
  fire: [
    "Move everyone away from smoke and flames immediately.",
    "Call fire services and share exact location and nearby landmark.",
    "Do not use elevators; use stairs and stay low to avoid smoke.",
  ],
  road: [
    "Ensure scene safety and avoid standing in active traffic.",
    "Call emergency services and provide number of injured people.",
    "Do not move seriously injured persons unless there is immediate danger.",
  ],
  theft: [
    "Move to a safe place first and avoid confrontation.",
    "Call police and share suspect direction, description, and vehicle details.",
    "Preserve evidence and avoid touching possible fingerprints.",
  ],
  health: [
    "Check responsiveness and breathing immediately.",
    "Call emergency medical services and report symptoms.",
    "If trained, start first aid or CPR until professionals arrive.",
  ],
  other: [
    "Move people to a safe area and prevent crowding.",
    "Call relevant emergency service and share exact location.",
    "Keep communication clear and assign one person to coordinate updates.",
  ],
};

const volunteerQuestionBank = {
  common: [
    { id: "availability", question: "How available are you during emergencies?", weight: 1.2 },
    { id: "calmness", question: "How confident are you staying calm under pressure?", weight: 1.2 },
  ],
  fire: [
    { id: "fire_basics", question: "How well do you know basic fire safety and evacuation steps?", weight: 1.4 },
    { id: "fire_extinguisher", question: "Can you operate a fire extinguisher safely?", weight: 1.1 },
  ],
  road: [
    { id: "traffic_safety", question: "How familiar are you with road incident safety procedures?", weight: 1.3 },
    { id: "basic_first_aid", question: "Can you provide basic first-aid before ambulance arrival?", weight: 1.5 },
  ],
  health: [
    { id: "medical_first_aid", question: "How confident are you in basic medical first-aid/CPR?", weight: 1.6 },
    { id: "patient_handling", question: "Can you assess urgency and communicate symptoms clearly?", weight: 1.2 },
  ],
  theft: [
    { id: "personal_safety", question: "Can you secure victims and scene without confrontation?", weight: 1.3 },
    { id: "evidence_awareness", question: "Do you know how to preserve evidence for police?", weight: 1.0 },
  ],
  other: [
    { id: "coordination", question: "How strong are your coordination and communication skills?", weight: 1.2 },
    { id: "situational_awareness", question: "How well can you assess risks quickly on-site?", weight: 1.2 },
  ],
};

const levelToScore = {
  never: 1,
  basic: 2,
  intermediate: 3,
  advanced: 4,
  expert: 5,
};

const normalizePhone = (phone) => String(phone ?? "").replace(/\D/g, "").slice(-10);

export const getVolunteerQuestions = asyncHandler(async (req, res) => {
  const { incidentType = "other" } = req.query;
  const type = volunteerQuestionBank[incidentType] ? incidentType : "other";

  let questions;

  try {
    const llmOutput = await runLLMJson({
      systemPrompt:
        "You generate volunteer assessment questions for emergency response. Return JSON only.",
      userPrompt: `Generate 6 concise volunteer-rating questions for incident type '${type}'. Include 2 common and 4 incident-specific. Return JSON with keys: scale(array with never,basic,intermediate,advanced,expert), questions(array of {id, question, weight}). id must be lowercase snake_case. weight between 1.0 and 1.8.`,
      temperature: 0.3,
      maxTokens: 700,
    });

    questions = Array.isArray(llmOutput?.questions) ? llmOutput.questions : null;
  } catch {
    questions = null;
  }

  if (!questions || !questions.length) {
    questions = [...volunteerQuestionBank.common, ...volunteerQuestionBank[type]];
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        incidentType: type,
        scale: ["never", "basic", "intermediate", "advanced", "expert"],
        questions,
      },
      "Volunteer assessment questions generated"
    )
  );
});

export const rateVolunteer = asyncHandler(async (req, res) => {
  const { incidentType = "other", answers = [], skills = [], volunteerPhone } = req.body;

  if (!Array.isArray(answers) || answers.length === 0) {
    throw new ApiError(400, "answers array is required");
  }

  const type = volunteerQuestionBank[incidentType] ? incidentType : "other";

  const normalizedAnswers = answers
    .map((item, index) => {
      const questionId = String(item.questionId || `q_${index + 1}`);
      const question = String(item.question || "").trim() || `Question ${index + 1}`;
      const normalizedLevel = String(item.answer || "basic").toLowerCase();
      const score = levelToScore[normalizedLevel] || Number(item.score) || 1;

      return {
        questionId,
        question,
        answer: normalizedLevel,
        score,
      };
    })
    .filter(Boolean);

  if (!normalizedAnswers.length) {
    throw new ApiError(400, "No valid answers provided");
  }

  let llmRating;

  try {
    llmRating = await runLLMJson({
      systemPrompt:
        "You are an emergency volunteer evaluator. Output strict JSON only with practical scoring.",
      userPrompt: `Incident type: ${type}. Evaluate volunteer response quality using this answer set: ${JSON.stringify(
        normalizedAnswers
      )}. Return JSON keys: rating(number 0-100), grade(one of A,B,C,D), strengths(array of 2-4 strings), improvements(array of 2-4 strings), questionScores(array of {questionId, score, rationale}).`,
      temperature: 0.2,
      maxTokens: 900,
    });
  } catch {
    llmRating = null;
  }

  const weightedAverage =
    normalizedAnswers.reduce((sum, item) => sum + item.score, 0) / normalizedAnswers.length;
  const fallbackRating = Math.round((weightedAverage / 5) * 100);

  const rating = Math.max(0, Math.min(100, Math.round(Number(llmRating?.rating ?? fallbackRating))));
  const grade = llmRating?.grade || (rating >= 80 ? "A" : rating >= 65 ? "B" : rating >= 50 ? "C" : "D");

  const llmQuestionScores = Array.isArray(llmRating?.questionScores) ? llmRating.questionScores : [];
  const llmScoreMap = new Map(llmQuestionScores.map((item) => [item.questionId, Number(item.score || 0)]));

  const storedAssessment = normalizedAnswers.map((item) => ({
    questionId: item.questionId,
    answer: item.answer,
    score: llmScoreMap.get(item.questionId) || item.score,
  }));

  let targetUser = null;

  if (req.user?._id) {
    targetUser = await User.findById(req.user._id);
  }

  if (!targetUser) {
    const cleanPhone = normalizePhone(volunteerPhone);
    if (!cleanPhone) {
      throw new ApiError(400, "volunteerPhone is required when not logged in");
    }

    targetUser = await User.findOne({ phone: cleanPhone });
  }

  if (!targetUser) {
    throw new ApiError(404, "Volunteer user not found for rating");
  }

  const user = await User.findByIdAndUpdate(
    targetUser._id,
    {
      volunteerRating: rating,
      volunteerAssessment: storedAssessment,
      volunteerRatingUpdatedAt: new Date(),
      skills: Array.isArray(skills) ? skills : targetUser.skills || [],
    },
    { new: true }
  ).select("fullName phone volunteerRating volunteerRatingUpdatedAt skills");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        volunteer: user,
        incidentType: type,
        rating,
        grade,
        strengths: llmRating?.strengths || [],
        improvements: llmRating?.improvements || [],
      },
      "Volunteer rated successfully"
    )
  );
});

export const getCrisisGuidance = asyncHandler(async (req, res) => {
  const { type = "other", description = "" } = req.body;

  if (!type) {
    throw new ApiError(400, "Incident type is required");
  }

  const normalizedType = guidanceMap[type] ? type : "other";
  let llmOutput;

  try {
    llmOutput = await runLLMJson({
      systemPrompt:
        "You are an emergency-response AI. Return compact, practical JSON only.",
      userPrompt: `Generate response for crisis type '${normalizedType}' with context '${String(
        description || ""
      ).slice(0, 600)}'. Return JSON with keys: type, firstResponseSteps(array of 3 short steps), emergencySummary(short ready-to-read message), debriefPrompt(short post-resolution prompt).`,
      temperature: 0.2,
      maxTokens: 500,
    });
  } catch {
    llmOutput = null;
  }

  const firstResponseSteps =
    llmOutput?.firstResponseSteps?.length ? llmOutput.firstResponseSteps : guidanceMap[normalizedType];
  const emergencySummary =
    llmOutput?.emergencySummary ||
    `Emergency type: ${normalizedType}. Location: [fill location]. Details: ${String(
      description || "No additional description provided"
    ).slice(0, 300)}. Immediate support requested.`;
  const debriefPrompt =
    llmOutput?.debriefPrompt ||
    "After resolution, capture what happened, what actions were most effective, what delays occurred, and how to improve future response.";

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        type: normalizedType,
        firstResponseSteps,
        emergencySummary,
        debriefPrompt,
      },
      "Crisis guidance generated"
    )
  );
});
