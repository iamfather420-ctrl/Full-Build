import * as client from "openid-client";
import crypto from "crypto";
import { type Request, type Response } from "express";
import { authSql } from "../../../../packages/db/src/index.js";
import type { AuthUser } from "../../../../lib/api-zod/src/generated/types/authUser.js";

export const ISSUER_URL = process.env.OIDC_ISSUER_URL ?? "";
export const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID ?? "";
export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  tenant_claims: Record<string, unknown>;
  tenant_token: string;
  /** Original OIDC issuer subject; distinct from the internal database user id. */
  oidc_subject: string;
}

let oidcConfig: client.Configuration | null = null;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (!ISSUER_URL || !OIDC_CLIENT_ID) {
    throw new Error("OIDC_ISSUER_URL and OIDC_CLIENT_ID must be configured for authentication.");
  }
  if (!oidcConfig) {
    oidcConfig = await client.discovery(new URL(ISSUER_URL), OIDC_CLIENT_ID);
  }
  return oidcConfig;
}

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL);
  await authSql`
    WITH session_context AS MATERIALIZED (
      SELECT set_config('app.session_sid', ${sid}, true) AS sid
    )
    INSERT INTO public.auth_sessions (sid, sess, expire)
    SELECT ${sid}, ${JSON.stringify(data)}::jsonb, ${expires.toISOString()}::timestamptz
      FROM session_context
  `;
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  if (!/^[a-f0-9]{64}$/.test(sid)) return null;
  const rows = await authSql`
    WITH session_context AS MATERIALIZED (
      SELECT set_config('app.session_sid', ${sid}, true) AS sid
    )
    SELECT s.sess, s.expire
      FROM public.auth_sessions s
      CROSS JOIN session_context
     WHERE s.sid = ${sid}
     LIMIT 1
  `;
  const row = rows[0] as { sess: Record<string, unknown>; expire: Date | string } | undefined;
  if (!row || new Date(row.expire) < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }
  return row.sess as unknown as SessionData;
}

export async function updateSession(sid: string, data: SessionData): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(sid)) throw new Error("Invalid session identifier.");
  const expires = new Date(Date.now() + SESSION_TTL);
  await authSql`
    WITH session_context AS MATERIALIZED (
      SELECT set_config('app.session_sid', ${sid}, true) AS sid
    )
    UPDATE public.auth_sessions
       SET sess = ${JSON.stringify(data)}::jsonb,
           expire = ${expires.toISOString()}::timestamptz
      FROM session_context
     WHERE public.auth_sessions.sid = ${sid}
  `;
}

export async function deleteSession(sid: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(sid)) return;
  await authSql`
    WITH session_context AS MATERIALIZED (
      SELECT set_config('app.session_sid', ${sid}, true) AS sid
    )
    DELETE FROM public.auth_sessions
     USING session_context
     WHERE public.auth_sessions.sid = ${sid}
  `;
}

export async function clearSession(res: Response, sid?: string): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return req.cookies?.[SESSION_COOKIE];
}
