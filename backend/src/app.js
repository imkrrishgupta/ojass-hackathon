import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const allowedOrigin =
  `${process.env.NODE_ENV}` === "production"
    ? `${process.env.CORS_ORIGIN_PROD}`
    : `${process.env.CORS_ORIGIN_DEV}`;

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// common middleware
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// import routes
import { errorHandler } from "./middlewares/error.middleware.js";
import userRouter from "./routes/user.route.js";
import otpRouter from "./routes/otp.route.js";
import incidentRouter from "./routes/incident.route.js";
import chatRouter from "./routes/chat.route.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/otp", otpRouter);
app.use("/api/v1/incident", incidentRouter);
app.use("/api/v1/chat", chatRouter);

app.use(errorHandler);

export { app };