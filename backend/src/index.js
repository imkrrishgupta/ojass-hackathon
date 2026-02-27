import dotenv from "dotenv";
import { connectDB } from "./db/index.js";

dotenv.config({
    path: "./.env"
})

import { app } from "./app.js";

const PORT = `${process.env.PORT}`;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`✅ Server is running on port ${PORT}`)
        })
    })
    .catch((err) => {
        console.log("❌ MongoDB connection error", err);
    })