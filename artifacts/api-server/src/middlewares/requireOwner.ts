import { type Request, type Response, type NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

/**
 * Owner access is fail-closed: an absent/blank OWNER_USER_ID must never turn
 * every authenticated account into an owner. The ID comparison is against
 * the subject established by the validated OIDC session middleware.
 */
export function isConfiguredOwner(userId: string | undefined, configuredOwnerId = process.env.OWNER_USER_ID): boolean {
  const expected = configuredOwnerId?.trim();
  return Boolean(userId && expected && userId === expected);
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const allowedId = process.env.OWNER_USER_ID?.trim();
  if (!allowedId) {
    res.status(503).json({ error: "Owner access is not configured; OWNER_USER_ID must be set." });
    return;
  }
  if (!isConfiguredOwner(req.user.id, allowedId)) {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  next();
}
