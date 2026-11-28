import { Router } from "express";
import "./bind";
import { execute, scan } from "./service";
import { hasVerifiedTenantSession, isTrainingTaskSelection } from "./authorization";

export const scanRouter = Router();
scanRouter.get("/scan", async (_req, res, next) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(await scan());
  } catch (error) {
    next(error);
  }
});

export const executeRouter = Router();
executeRouter.post("/execute", async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as { taskIds?: unknown };
    const taskIds = Array.isArray(body.taskIds) ? body.taskIds.filter((id): id is string => typeof id === "string") : [];
    if (taskIds.length === 0) {
      res.status(400).json({ state: "VALIDATION_FAILED", message: "Select at least one task." });
      return;
    }
    const auth = req as typeof req & {
      isAuthenticated?: () => boolean;
      user?: { id?: string };
      tenantClaims?: Record<string, unknown>;
    };
    if (!hasVerifiedTenantSession({
      authenticated: auth.isAuthenticated?.() === true,
      userId: auth.user?.id,
      tenantUserId: auth.tenantClaims?.user_id,
    })) {
      res.status(401).json({ state: "AUTHORIZATION_REQUIRED", message: "A verified OIDC session and active tenant membership are required." });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    if (isTrainingTaskSelection(taskIds)) {
      res.status(403).json({
        state: "AUTHORIZATION_REQUIRED",
        message: "Training remains blocked until a server-verified cryptographic source-approval mechanism is configured. A client-supplied approve flag is never authorization.",
      });
      return;
    }
    res.status(200).json(await execute(taskIds, false));
  } catch (error) {
    next(error);
  }
});
