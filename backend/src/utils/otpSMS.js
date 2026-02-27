// import axios from "axios";
// import { ApiError } from "./ApiError.js";

// export const sendOTPSMS = async (phone, otp) => {
//   try {
//     if (!phone) throw new ApiError(400, "Phone number required");
//     if (!otp) throw new ApiError(400, "OTP required");

//     const cleanPhone = phone.replace(/\D/g, "");
//     if (cleanPhone.length !== 10) {
//       throw new ApiError(400, "Phone must be 10 digits");
//     }

//     const apiKey = process.env.FAST2SMS_API_KEY;
//     if (!apiKey) {
//       throw new ApiError(500, "FAST2SMS_API_KEY missing");
//     }

//     const message = `Your OTP is ${otp}. Valid for 5 minutes.`;

//     const response = await axios.post(
//       "https://www.fast2sms.com/dev/bulkV2",
//       {
//         route: "q",
//         message: message,
//         language: "english",
//         numbers: cleanPhone
//       },
//       {
//         headers: {
//           authorization: apiKey,
//           "Content-Type": "application/json"
//         }
//       }
//     );

//     if (!response.data.return) {
//       throw new ApiError(500, response.data.message || "SMS failed");
//     }

//     return true;

//   } catch (error) {
//     if (error instanceof ApiError) throw error;

//     if (error.response) {
//       throw new ApiError(
//         error.response.status,
//         error.response.data?.message || "SMS provider error"
//       );
//     }

//     throw new ApiError(500, "OTP send failed");
//   }
// };



import { ApiError } from "./ApiError.js";

export const sendOTPSMS = async (phone, otp) => {
  try {
    if (!phone) throw new ApiError(400, "Phone number required");
    if (!otp) throw new ApiError(400, "OTP required");

    const cleanPhone = phone.toString().replace(/\D/g, "");

    if (cleanPhone.length !== 10) {
      throw new ApiError(400, "Phone must be 10 digits");
    }

    // 🔥 DEV PURPOSE ONLY — PRINT OTP IN TERMINAL
    console.log("\n===============================");
    console.log("📲 OTP GENERATED (DEV MODE)");
    console.log("Phone:", cleanPhone);
    console.log("OTP:", otp);
    console.log("===============================\n");

    // pretend SMS sent successfully
    return true;

  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error.message || "OTP generation failed");
  }
};