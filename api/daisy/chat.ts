import type { Request, Response } from 'express';
import handler from '../_daisy-app.js';

export default function chat(req: Request, res: Response) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  req.url = `/api/daisy/chat${url.search}`;
  return handler(req, res);
}
