export default function handler(
  _req: unknown,
  res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void },
) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({ status: 'ok', payments_enabled: false }));
}
