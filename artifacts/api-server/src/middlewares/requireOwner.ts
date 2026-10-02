import { type Request, type Response, type NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const allowedId = process.env.OWNER_USER_ID;
  if (allowedId && req.user.id !== allowedId) {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  next();
}
