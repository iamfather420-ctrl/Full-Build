import express from "express";
import cookieParser from "cookie-parser";
import pino from "pino";
import pinoHttp from "pino-http";
import { authMiddleware } from "../artifacts/api-server/src/middlewares/authMiddleware";
import authRouter from "../artifacts/api-server/src/routes/auth_native";

const app = express();
app.disable("x-powered-by");
app.use(pinoHttp({ logger: pino({ level: process.env.LOG_LEVEL ?? "info" }) }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(authMiddleware);
app.use(authRouter);
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log?.error({ err, requestId: req.id }, "Authentication API request failed");
  if (!res.headersSent) res.status(500).json({ error: "AUTH_API_FAILED", request_id: req.id });
});
export default app;
