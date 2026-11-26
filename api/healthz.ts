import type { Request, Response } from 'express';
import app from './[...path]';

// Exact file so /api/healthz is a filesystem function, not one segment of the catch-all.
export default function handler(req: Request, res: Response) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  req.url = `/api/healthz${url.search}`;
  return app(req, res);
}
