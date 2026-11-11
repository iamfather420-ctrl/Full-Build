// Gmail delivery uses a user-authorized Google OAuth access token supplied at runtime.
function b64url(input: string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function accessToken(): string {
  const token = process.env.GMAIL_ACCESS_TOKEN;
  if (!token) throw new Error("GMAIL_ACCESS_TOKEN is not configured; email delivery is disabled.");
  return token;
}
export async function gmailConnected(): Promise<boolean> {
  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${accessToken()}` },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch { return false; }
}
export async function sendEmail(to: string, subject: string, body: string): Promise<{ id: string }> {
  if (/[\r\n]/.test(to) || /[\r\n]/.test(subject)) throw new Error("Invalid characters in email headers");
  const raw = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}`;
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64url(raw) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Gmail send failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return await res.json() as { id: string };
}
