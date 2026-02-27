import axios from "axios";
import { ApiError } from "./ApiError.js";

export const sendOTPSMS = async (phone, otp) => {
	try {
		if (!phone || phone.trim().length === 0) {
			throw new ApiError(400, "Phone number is required");
		}

		if (!otp || otp.toString().trim().length === 0) {
			throw new ApiError(400, "OTP is required");
		}

		const cleanPhone = phone.replace(/\D/g, "");

		if (cleanPhone.length !== 10) {
			throw new ApiError(400, "Phone number must be 10 digits");
		}

		const fastSmsApiKey = process.env.FAST2SMS_API_KEY;

		if (!fastSmsApiKey) {
			throw new ApiError(
				500,
				"Fast2SMS API key is not configured in environment variables"
			);
		}

		const fastSmsRoute = process.env.FAST2SMS_ROUTE;

		const message = `Your OTP is ${otp}. This code will expire in 10 minutes. Do not share it with anyone.`;

		const payload = {
			route: fastSmsRoute,
			language: "english",
			numbers: cleanPhone.toString(),
		};

		if (fastSmsRoute === "otp") {
			payload.variables_values = otp;
		} else {
			payload.message = message;
		}

		const response = await axios.post(
			"https://www.fast2sms.com/dev/bulkV2",
			payload,
			{
				headers: {
					authorization: fastSmsApiKey,
					"Content-Type": "application/json",
				},
			}
		);

		if (!response?.data?.return) {
      throw new ApiError(500, `Failed to send OTP: ${response?.data?.message || "Unknown error"}`);
    }

		return {
			success: true,
			message: "OTP sent successfully",
			data: response.data,
		};
	} catch (error) {
		if (error instanceof ApiError) throw error;

		if (error.response) {
			throw new ApiError(
				error.response.status || 500,
				error.response.data?.message || "Failed to send OTP via SMS"
			);
		}

		if (error.request) {
			throw new ApiError(503, "SMS service is currently unavailable");
		}

		throw new ApiError(500, error.message || "Failed to send OTP");
	}
};
