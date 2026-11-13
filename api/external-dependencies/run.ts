import { timingSafeEqual } from 'node:crypto';

export const config = { maxDuration: 60 };

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Vary', 'Authorization');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const callerSecret = process.env.EXTERNAL_DEPENDENCY_GATE_CALLER_TOKEN;
  const workerSecret = process.env.EXTERNAL_DEPENDENCY_RAILWAY_TOKEN;
  const workerUrl = process.env.EXTERNAL_DEPENDENCY_RAILWAY_URL;

  if (!callerSecret || !workerSecret || !workerUrl) {
    return res.status(503).json({ error: 'External dependency verification is not configured.' });
  }

  const authorization = String(req.headers?.authorization || '');
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!supplied || !safeEqual(supplied, callerSecret)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const sourceCommit = String(req.body?.source_commit_sha || '').trim().toLowerCase();
  if (sourceCommit && !/^[a-f0-9]{40}$/.test(sourceCommit)) {
    return res.status(400).json({ error: 'Invalid source commit SHA.' });
  }

  let target: URL;
  try {
    target = new URL('/internal/external-dependencies/run', workerUrl);
    if (target.protocol !== 'https:') throw new Error('HTTPS required');
  } catch {
    return res.status(503).json({ error: 'External verifier endpoint is invalid.' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 52_000);
  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${workerSecret}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ source_commit_sha: sourceCommit || null }),
      signal: controller.signal,
    });

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return res.status(502).json({ error: 'External verifier returned an invalid response.' });
    }
    const report = await upstream.json();
    if (!upstream.ok && !report?.summary) {
      return res.status(502).json({ error: 'External verifier request failed.' });
    }
    return res.status(report?.summary?.verdict === 'PASS' ? 200 : 503).json(report);
  } catch (error: any) {
    const timedOut = error?.name === 'AbortError';
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? 'External verification exceeded the Vercel proxy time limit.'
        : 'External verifier could not be reached.',
    });
  } finally {
    clearTimeout(timer);
  }
}
