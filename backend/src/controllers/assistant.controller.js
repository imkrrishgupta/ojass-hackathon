import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { runLLMJson } from "../utils/llm.js";

/* ============================
   CONSTANTS
============================ */

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

const normalizePhone = (phone) => String(phone ?? "").replace(/\D/g, "").slice(-10);

/* ============================
   GET VOLUNTEER QUESTIONS
============================ */

export const getVolunteerQuestions = asyncHandler(async (req, res) => {
  const { incidentType = "other", volunteerPhone = "" } = req.query;
  const type = volunteerQuestionBank[incidentType] ? incidentType : "other";
  const cleanPhone = normalizePhone(volunteerPhone);

  let volunteerProfile = null;
  if (cleanPhone) {
    volunteerProfile = await User.findOne({ phone: cleanPhone }).select(
      "fullName phone skills volunteerRating volunteerAssessment"
    );
  }

  let questions;

  try {
    const profileContext = volunteerProfile
      ? {
          fullName: volunteerProfile.fullName,
          skills: volunteerProfile.skills || [],
          volunteerRating: volunteerProfile.volunteerRating || 0,
          previousAssessment: volunteerProfile.volunteerAssessment || [],
        }
      : null;

    const llmOutput = await runLLMJson({
      systemPrompt:
        "You generate adaptive volunteer assessment interview questions for emergency response. Return JSON only.",
      userPrompt: `Generate exactly 6 concise interview questions for incident type '${type}'. Make them dynamic and practical for on-ground response. Include 2 common and 4 incident-specific questions. For each question, expect free-text answers (not fixed options).${
        profileContext
          ? ` Personalize question difficulty using this volunteer profile: ${JSON.stringify(profileContext)}.`
          : ""
      } Return JSON with keys: questions(array of {id, question, weight, intent}). id must be lowercase snake_case. weight between 1.0 and 1.8. intent is a short phrase on what capability this question tests.`,
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
        answerMode: "text",
        questions,
      },
      "Volunteer assessment questions generated"
    )
  );
});

/* ============================
   RATE VOLUNTEER (UPDATED)
============================ */

export const rateVolunteer = asyncHandler(async (req, res) => {
  const { incidentType = "other", answers = [], skills = [], volunteerPhone } = req.body;

  if (!Array.isArray(answers) || answers.length === 0) {
    throw new ApiError(400, "answers array is required");
  }

  const type = incidentType;

  const normalizedAnswers = answers.map((item, index) => {
    const questionId = String(item.questionId || `q_${index + 1}`);
    const answerText = String(item.answerText || item.answer || "").trim();
    const lower = answerText.toLowerCase();

    let score = 1;

    // Meaning-based scoring (not text length)
    if (/\b(doctor|paramedic|nurse|emt|surgeon)\b/i.test(lower)) score = 5;
    else if (/\b(always available|always ready)\b/i.test(lower)) score = 5;
    else if (/\b(very confident|highly confident)\b/i.test(lower)) score = 4;
    else if (/\b(confident|experienced|trained)\b/i.test(lower)) score = 4;
    else if (/\b(basic first aid|cpr)\b/i.test(lower)) score = 3;
    else if (/\b(sometimes|moderate|some experience)\b/i.test(lower)) score = 3;
    else if (/\b(not sure|rarely|little)\b/i.test(lower)) score = 2;
    else if (/\b(no|never|panic|can't|cannot)\b/i.test(lower)) score = 1;

    return {
      questionId,
      answerText,
      score,
    };
  });

  let llmRating = null;

  try {
    llmRating = await runLLMJson({
      systemPrompt: `
You are a strict emergency volunteer capability evaluator.

Users may answer in messy English, short text, or confident claims.

Understand meaning deeply.

Rules:
- Doctor/paramedic/nurse → 90+
- Always available + calm → 80+
- Basic first aid → 50–70
- Sometimes available → reduce
- Panic / unsure → below 40
- Joke/irrelevant → below 20

Do NOT score based on text length.
Do NOT give same score for everyone.

Return STRICT JSON:

{
 "rating": number 0-100,
 "grade": "A" | "B" | "C" | "D" | "E",
 "strengths": ["point","point"],
 "improvements": ["point","point"],
 "questionScores":[
   {"questionId":"id","score":1-5,"rationale":"short"}
 ]
}

rating must always exist.
Return JSON only.
`,
      userPrompt: `
Incident type: ${type}
Answers:
${JSON.stringify(normalizedAnswers, null, 2)}
`,
      temperature: 0.2,
      maxTokens: 700,
    });

    if (llmRating?.score && !llmRating?.rating) {
      llmRating.rating = llmRating.score;
    }

  } catch (err) {
    console.log("LLM ERROR:", err.message);
  }

  // fallback rating (FIXED)
  const avg = normalizedAnswers.reduce((sum, a) => sum + a.score, 0) / normalizedAnswers.length;

  const fallbackRating = Math.max(
    35,
    Math.round((avg / 5) * 100)
  );

  const rating = Math.max(
    0,
    Math.min(100, Math.round(Number(llmRating?.rating ?? fallbackRating)))
  );

  const grade =
    llmRating?.grade ||
    (rating >= 85 ? "A" :
     rating >= 70 ? "B" :
     rating >= 55 ? "C" :
     "D");

  let targetUser = null;

  if (req.user?._id) {
    targetUser = await User.findById(req.user._id);
  }

  if (!targetUser && volunteerPhone) {
    const cleanPhone = String(volunteerPhone).replace(/\D/g, "").slice(-10);
    targetUser = await User.findOne({ phone: cleanPhone });
  }

  if (!targetUser) {
    throw new ApiError(404, "Volunteer not found");
  }

  const user = await User.findByIdAndUpdate(
    targetUser._id,
    {
      volunteerRating: rating,
      volunteerRatingUpdatedAt: new Date(),
      skills: Array.isArray(skills) ? skills : targetUser.skills || [],
    },
    { returnDocument: "after" }
  ).select("fullName phone volunteerRating volunteerRatingUpdatedAt skills");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        volunteer: user,
        rating,
        grade,
        strengths: llmRating?.strengths || [],
        improvements: llmRating?.improvements || [],
      },
      "Volunteer rated successfully"
    )
  );
});

/* ============================
   CRISIS GUIDANCE
============================ */

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