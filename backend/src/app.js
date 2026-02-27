import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const allowedOrigin =
    `${process.env.NODE_ENV}` === "production"
        ? `${process.env.CORS_ORIGIN_PROD || process.env.FRONTEND_URL}`
        : `${process.env.CORS_ORIGIN_DEV || process.env.FRONTEND_URL || "http://localhost:5173"}`;

app.use(
    cors({
        origin: allowedOrigin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
)

// common middleware

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({ extended: true, limit: "16kb"}))  // To come up the data in the url encoded format
app.use(express.static("public"))
app.use(cookieParser())

// import routes

import { errorHandler } from "./middlewares/error.middleware.js";
import userRouter from "./routes/user.route.js";
import otpRouter from "./routes/otp.route.js";
import incidentRouter from "./routes/incident.route.js";
import assistantRouter from "./routes/assistant.route.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/otp", otpRouter);
app.use("/api/v1/incidents", incidentRouter);
app.use("/api/v1/assistant", assistantRouter);

app.use(errorHandler);

export { app };