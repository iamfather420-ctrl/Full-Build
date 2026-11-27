import { Router } from "express";
import "./bind";
import { execute, scan } from "./service";

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
    const body = (req.body ?? {}) as { taskIds?: unknown; approve?: unknown };
    const taskIds = Array.isArray(body.taskIds) ? body.taskIds.filter((id): id is string => typeof id === "string") : [];
    if (taskIds.length === 0) {
      res.status(400).json({ state: "VALIDATION_FAILED", message: "Select at least one task." });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(await execute(taskIds, body.approve === true));
  } catch (error) {
    next(error);
  }
});
