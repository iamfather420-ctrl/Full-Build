import app from "../_auth-app";
import type { Request, Response } from "express";
export default function handler(req: Request, res: Response) {
  req.url = "/auth/tenant-session";
  return app(req, res);
}
