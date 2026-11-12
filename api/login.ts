import app from "./_auth-app";
import type { Request, Response } from "express";
export default function handler(req: Request, res: Response) {
  const url = new URL(req.url ?? "/", "http://localhost");
  req.url = `/login${url.search}`;
  return app(req, res);
}
