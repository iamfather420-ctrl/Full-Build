import app from "./_auth-app.js";
import type { Request, Response } from "express";
export default function handler(req: Request, res: Response) {
  const url = new URL(req.url ?? "/", "http://localhost");
  req.url = `/callback${url.search}`;
  return app(req, res);
}
