import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { resolveOidcTenantIdentity, type OidcTenantIdentity } from "@workspace/db";
import {
  clearSession, getOidcConfig, getSessionId, createSession, deleteSession,
  SESSION_COOKIE, SESSION_TTL, ISSUER_URL, OIDC_CLIENT_ID, type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}
function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL });
}
function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: OIDC_COOKIE_TTL });
}
function getSafeReturnTo(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(GetCurrentAuthUserResponse.parse({ user: req.isAuthenticated() ? req.user : null }));
});
router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl, scope: "openid email profile offline_access",
    code_challenge: codeChallenge, code_challenge_method: "S256",
    prompt: "login", state, nonce,
  });
  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", getSafeReturnTo(req.query.returnTo));
  res.redirect(redirectTo.href);
});
router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;
  if (!codeVerifier || !expectedState) { res.redirect("/api/login"); return; }
  const currentUrl = new URL(`${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`);
  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier, expectedNonce: nonce, expectedState, idTokenExpected: true,
    });
  } catch { res.redirect("/api/login"); return; }
  const returnTo = getSafeReturnTo(req.cookies?.return_to);
  for (const name of ["code_verifier", "nonce", "state", "return_to"]) res.clearCookie(name, { path: "/" });
  const claims = tokens.claims();
  if (!claims) { res.redirect("/api/login"); return; }
  const subject = typeof claims.sub === "string" ? claims.sub : "";
  const email = typeof claims.email === "string" ? claims.email : "";
  if (!subject || !email || claims.email_verified !== true) {
    res.status(403).json({ error: "A verified OIDC email and subject are required for tenant access." });
    return;
  }
  let identity: OidcTenantIdentity;
  try {
    identity = await resolveOidcTenantIdentity(subject, email);
  } catch (error) {
    req.log.warn({ error }, "OIDC login denied: no unique active tenant membership");
    res.status(403).json({ error: "No unique active SolveX tenant membership is assigned to this account." });
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: { id: identity.user_id, email: identity.email, firstName: identity.display_name, lastName: null, profileImageUrl: null },
    access_token: tokens.access_token, refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    tenant_claims: { user_id: identity.user_id, tenant_id: identity.tenant_id, email: identity.email, role: identity.role },
    tenant_token: identity.signed_token,
  };
  setSessionCookie(res, await createSession(sessionData));
  res.redirect(returnTo);
});
router.get("/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);
  await clearSession(res, getSessionId(req));
  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: OIDC_CLIENT_ID, post_logout_redirect_uri: origin,
  });
  res.redirect(endSessionUrl.href);
});
router.post("/mobile-auth/token-exchange", async (req: Request, res: Response) => {
  const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Missing or invalid required parameters" }); return; }
  const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;
  try {
    const config = await getOidcConfig();
    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("iss", ISSUER_URL);
    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: code_verifier, expectedNonce: nonce ?? undefined, expectedState: state, idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims) { res.status(401).json({ error: "No claims in ID token" }); return; }
    const subject = typeof claims.sub === "string" ? claims.sub : "";
    const email = typeof claims.email === "string" ? claims.email : "";
    if (!subject || !email || claims.email_verified !== true) {
      res.status(403).json({ error: "A verified OIDC email and subject are required for tenant access." });
      return;
    }
    const identity = await resolveOidcTenantIdentity(subject, email);
    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: { id: identity.user_id, email: identity.email, firstName: identity.display_name, lastName: null, profileImageUrl: null },
      access_token: tokens.access_token, refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
      tenant_claims: { user_id: identity.user_id, tenant_id: identity.tenant_id, email: identity.email, role: identity.role },
      tenant_token: identity.signed_token,
    };
    res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: await createSession(sessionData) }));
  } catch (err) {
    req.log.error({ err }, "Mobile token exchange error");
    res.status(500).json({ error: "Token exchange failed" });
  }
});
router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) await deleteSession(sid);
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});
export default router;
