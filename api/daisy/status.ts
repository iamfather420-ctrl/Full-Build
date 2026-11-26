import type { Request, Response } from 'express';
import app from '../[...path]';

export default function handler(req: Request, res: Response) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  req.url = `/api/daisy/status${url.search}`;
  return app(req, res);
}
