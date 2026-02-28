import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "./models/user.model.js";

dotenv.config({ path: "./.env" });

const ADMIN_PHONE = process.env.ADMIN_PHONE || "9625113505";
const ADMIN_NAME = process.env.ADMIN_NAME || "NearHelp Admin";

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[Seeder] Connected to MongoDB");

    const normalizedPhone = ADMIN_PHONE.replace(/\D/g, "").slice(-10);

    const existing = await User.findOne({ phone: normalizedPhone });

    if (existing) {
      // Ensure the role is set to admin
      if (existing.role !== "admin") {
        existing.role = "admin";
        await existing.save({ validateBeforeSave: false });
        console.log(`[Seeder] Updated existing user "${existing.fullName}" (${normalizedPhone}) to admin role`);
      } else {
        console.log(`[Seeder] Admin already exists: "${existing.fullName}" (${normalizedPhone})`);
      }
    } else {
      const admin = await User.create({
        fullName: ADMIN_NAME,
        phone: normalizedPhone,
        role: "admin",
        trustScore: 10,
        volunteerRating: 100,
      });
      console.log(`[Seeder] Admin created: "${admin.fullName}" (${admin.phone})`);
    }

    await mongoose.disconnect();
    console.log("[Seeder] Done");
    process.exit(0);
  } catch (err) {
    console.error("[Seeder] Error:", err.message);
    process.exit(1);
  }
}

seedAdmin();
