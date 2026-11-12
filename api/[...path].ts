import express from "express";
import cookieParser from "cookie-parser";
import pino from "pino";
import pinoHttp from "pino-http";
import { authMiddleware } from "../artifacts/api-server/src/middlewares/authMiddleware.js";
import authRouter from "../artifacts/api-server/src/routes/auth_native.js";

const app = express();
app.disable("x-powered-by");
app.use(pinoHttp({ logger: pino({ level: process.env.LOG_LEVEL ?? "info" }) }));
app.use(cookieParser());
app.use(express.json({ limit: "64kb", strict: true }));

// Vercel's catch-all function serves same-origin /api/* requests. Normalize
// the path to the Express router's mount point; preserve the query string.
app.use((req, _res, next) => {
  if (req.url?.startsWith("/api/")) req.url = req.url.slice(4);
  else if (req.url === "/api") req.url = "/";
  next();
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "solvex-auth",
    oidc_configured: Boolean(
      process.env.OIDC_ISSUER_URL &&
      process.env.OIDC_CLIENT_ID &&
      process.env.OIDC_RESOURCE_URL
    ),
    database_configured: Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL),
    payments_enabled: false,
  });
});

app.use((req, res, next) => {
  Promise.resolve(authMiddleware(req, res, next)).catch(next);
});
app.use(authRouter);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log?.error({ err, requestId: req.id }, "Authentication API request failed");
  if (!res.headersSent) {
    res.status(500).json({ error: "AUTH_API_FAILED", request_id: req.id });
  }
});

export default app;
