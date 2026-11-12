import express from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import authRouter from "../artifacts/api-server/src/routes/auth_native";
import { authMiddleware } from "../artifacts/api-server/src/middlewares/authMiddleware";
import { logger } from "../artifacts/api-server/src/lib/logger";

// Vercel catch-all function for the same-origin Neon OIDC endpoints.
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb", strict: true }));
app.use("/api", pinoHttp({ logger }), cookieParser(), authMiddleware, authRouter);

export default app;
