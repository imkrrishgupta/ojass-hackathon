import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const allowedOrigin = `${process.env.NODE_ENV}` === "production" ? `${process.env.CORS_ORIGIN_PROD}` : `${process.env.CORS_ORIGIN_DEV}`;

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
import userRoutes from "./routes/user.route.js";

app.use(errorHandler);

export { app };