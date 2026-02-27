import axios from "axios";
import { ApiError } from "./ApiError.js";

const normalizePhone = (phone) => String(phone ?? "").replace(/\D/g, "").slice(-10);

export const sendEmergencySMS = async ({ phones = [], message }) => {
  const normalizedPhones = [...new Set(phones.map(normalizePhone).filter((item) => item.length === 10))];

  if (!normalizedPhones.length) {
    throw new ApiError(400, "No valid phone numbers to notify");
  }

  if (!message || !String(message).trim()) {
    throw new ApiError(400, "SMS message is required");
  }

  const fastSmsApiKey = process.env.FAST2SMS_API_KEY;

  if (!fastSmsApiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV ALERT SMS] ${normalizedPhones.join(",")}: ${message}`);
      return {
        success: true,
        sentTo: normalizedPhones,
        provider: "dev-log",
      };
    }

    throw new ApiError(500, "Fast2SMS API key is not configured");
  }

  const payload = {
    route: process.env.FAST2SMS_ROUTE || "q",
    language: "english",
    numbers: normalizedPhones.join(","),
    message: String(message).slice(0, 159),
  };

  const response = await axios.post("https://www.fast2sms.com/dev/bulkV2", payload, {
    headers: {
      authorization: fastSmsApiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response?.data?.return) {
    throw new ApiError(500, `Failed to send alert SMS: ${response?.data?.message || "Unknown error"}`);
  }

  return {
    success: true,
    sentTo: normalizedPhones,
    provider: "fast2sms",
    data: response.data,
  };
};
