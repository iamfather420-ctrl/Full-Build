// Gmail delivery channel — via Replit Gmail connector integration
import { ReplitConnectors } from "@replit/connectors-sdk";

function b64url(input: string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function gmailConnected(): Promise<boolean> {
  try {
    const connectors = new ReplitConnectors();
    const res = await connectors.proxy("google-mail", "/gmail/v1/users/me/profile", { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendEmail(to: string, subject: string, body: string): Promise<{ id: string }> {
  if (/[\r\n]/.test(to) || /[\r\n]/.test(subject)) {
    throw new Error("Invalid characters in email headers");
  }
  const connectors = new ReplitConnectors();
  const raw =
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n` +
    `\r\n` +
    body;
  const res = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64url(raw) }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string };
  return data;
}
