import express from "express";
import cookieParser from "cookie-parser";
import pino from "pino";
import pinoHttp from "pino-http";
import { authMiddleware } from "../artifacts/api-server/src/middlewares/authMiddleware.js";
import authRouter from "../artifacts/api-server/src/routes/auth_native.js";

// Vercel routes /api/* requests to this serverless function. Reuse the same
// middleware and OIDC router mounted by the full Express server.
const app = express();
app.disable("x-powered-by");
app.use(pinoHttp({ logger: pino({ level: process.env.LOG_LEVEL ?? "info" }) }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  // The shared auth router is normally mounted at /api. Vercel passes the
  // complete URL, so strip that mount prefix before dispatching.
  if (req.url?.startsWith("/api/")) req.url = req.url.slice(4);
  else if (req.url === "/api") req.url = "/";
  next();
});
app.use(authMiddleware);
app.use(authRouter);
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log?.error({ err, requestId: req.id }, "Authentication API request failed");
  if (!res.headersSent) res.status(500).json({ error: "AUTH_API_FAILED", request_id: req.id });
});

export default app;
