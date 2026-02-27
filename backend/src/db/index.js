import mongoose from "mongoose";

export async function connectDB(){
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error("MongoDB URI is missing. Set MONGO_URI or MONGODB_URI in .env");
        }

        await mongoose.connect(mongoUri)
        console.log("MongoDB connected successfully");

    } catch (error) {
        console.log("MongoDB Connection error", error.message);
        process.exit(1)
    }
}