import * as oidc from "openid-client";
import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { resolveOidcTenantIdentity, verifyOidcTenantToken } from "@workspace/db";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  updateSession,
  type SessionData,
} from "../lib/auth.js";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
      tenantClaims?: Record<string, unknown> | undefined;
      tenantToken?: string | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;

  if (!session.refresh_token) return null;

  try {
    const config = await getOidcConfig();
    const tokens = await oidc.refreshTokenGrant(
      config,
      session.refresh_token,
    );
    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token ?? session.refresh_token;
    session.expires_at = tokens.expiresIn()
      ? now + tokens.expiresIn()!
      : session.expires_at;
    await updateSession(sid, session);
    return session;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    next();
    return;
  }

  // Re-resolve membership on every request. This both detects revoked/ambiguous
  // memberships immediately and rotates the 15-minute DB-signed tenant token.
  try {
    let claims = refreshed.tenant_token
      ? await verifyOidcTenantToken(refreshed.tenant_token)
      : null;
    if (claims && claims.user_id !== refreshed.user.id) claims = null;

    if (!claims) {
      // The OIDC issuer subject is not the internal database user id.
      // Older sessions without this field fail closed and must sign in again.
      if (!refreshed.oidc_subject) {
        await clearSession(res, sid);
        next();
        return;
      }
      const identity = await resolveOidcTenantIdentity(
        refreshed.oidc_subject,
        refreshed.user.email ?? "",
      );
      if (identity.user_id !== refreshed.user.id) {
        await clearSession(res, sid);
        next();
        return;
      }
      refreshed.tenant_claims = {
        user_id: identity.user_id,
        tenant_id: identity.tenant_id,
        email: identity.email,
        role: identity.role,
      };
      refreshed.tenant_token = identity.signed_token;
      claims = refreshed.tenant_claims;
    } else {
      refreshed.tenant_claims = claims;
    }
    await updateSession(sid, refreshed);
    req.user = refreshed.user;
    req.tenantClaims = refreshed.tenant_claims;
    req.tenantToken = refreshed.tenant_token;
    next();
  } catch (error) {
    req.log?.warn({ error }, "OIDC session has no valid active tenant membership");
    await clearSession(res, sid);
    next();
  }
}
