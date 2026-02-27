import { OTP } from "../models/otp.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ApiError(400, "Phone and OTP required");
  }

  const cleanPhone = phone.replace(/\D/g, "");

  const user = await User.findOne({ phone: cleanPhone });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otpRecord = await OTP.findOne({ userId: user._id });
  
  if (!otpRecord) {
    throw new ApiError(400, "OTP not found. Please login again");
  }

  // check expiry
  if (otpRecord.expiresAt < Date.now()) {
    await OTP.deleteMany({ userId: user._id });
    throw new ApiError(400, "OTP expired. Request new OTP");
  }

  // max attempts = 3
  if (otpRecord.attempts >= 3) {
    await OTP.deleteMany({ userId: user._id });
    throw new ApiError(400, "Maximum attempts reached. Request new OTP");
  }

  // wrong OTP
  if (otpRecord.otp !== otp) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    const left = 3 - otpRecord.attempts;

    if (left <= 0) {
      await OTP.deleteMany({ userId: user._id });
      throw new ApiError(400, "Maximum attempts reached. Request new OTP");
    }

    throw new ApiError(400, `Invalid OTP. Attempts left: ${left}`);
  }

  // correct OTP → delete record
  await OTP.deleteMany({ userId: user._id });

  const loggedInUser = await User.findById(user._id).select("-refreshToken location");

  return res.status(200).json(
    new ApiResponse(
      200,
      {loggedInUser},
      "Logged in successfully"
    )
  );
});