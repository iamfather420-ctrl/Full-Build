import React, { useEffect, useMemo, useState } from "react";
import { neonAuthClient } from "../auth/neonAuthClient";

type OAuthClientInfo = {
  client_id?: string;
  client_name?: string;
  name?: string;
  redirect_uris?: string[];
};

type AuthExtension = {
  oauth2: {
    continue(input: { selected: true }): Promise<{ error?: { message?: string } | null }>;
    publicClient(input: { query: { client_id: string } }): Promise<{ data: OAuthClientInfo | null; error?: { message?: string } | null }>;
    consent(input: { accept: boolean }): Promise<{ error?: { message?: string } | null }>;
  };
  emailOtp: {
    sendVerificationOtp(input: { email: string; type: "sign-in" }): Promise<{ error?: { message?: string } | null }>;
  };
  signIn: {
    emailOtp(input: { email: string; otp: string }): Promise<{ data?: { redirect?: boolean } | null; error?: { message?: string } | null }>;
  };
  signUp: {
    email(input: { email: string; password: string; name: string }): Promise<{ data?: { user?: { id: string; email: string }; token?: string | null } | null; error?: { message?: string } | null }>;
  };
};

// These methods are part of Neon Auth's Managed OAuth and email-OTP plugins.
// The current SDK runtime exposes them while its generated TypeScript client
// type omits those plugin method declarations.
const auth = neonAuthClient as typeof neonAuthClient & AuthExtension;

export function NeonAuthPages() {
  const isConsent = window.location.pathname === "/auth/consent";
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [client, setClient] = useState<OAuthClientInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  // Only continue an OAuth authorization when this page was opened with an OAuth request.
  const hasOAuthRequest = params.has("client_id") && params.has("redirect_uri");

  useEffect(() => {
    let alive = true;
    const resume = async () => {
      try {
        const { data } = await neonAuthClient.getSession();
        if (data?.user && hasOAuthRequest) {
          const result = await auth.oauth2.continue({ selected: true });
          if (result.error && alive) setError("This sign-in request expired. Return to SolveX and start again.");
        }
      } catch {
        // Signed-out visitors remain on the login form.
      }
    };
    if (!isConsent && hasOAuthRequest) void resume();
    if (isConsent) {
      const clientId = params.get("client_id") ?? "";
      if (!clientId) {
        setError("The OAuth request is missing its client identifier.");
        return () => { alive = false; };
      }
      void auth.oauth2.publicClient({ query: { client_id: clientId } })
        .then(({ data, error: requestError }) => {
          if (!alive) return;
          if (requestError || !data) setError("Unable to load the requesting application.");
          else setClient(data as OAuthClientInfo);
        })
        .catch(() => alive && setError("Unable to load the requesting application."));
    }
    return () => { alive = false; };
  }, [isConsent, params, hasOAuthRequest]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await neonAuthClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        const message = result.error.message || "Sign-in failed.";
        if (/verif|unverified/i.test(message)) {
          setNeedsVerification(true);
          setError("");
          setNotice("Your email needs verification. Send a one-time code, then enter it below.");
        } else if (/not found|no user|invalid email or password|invalid credentials/i.test(message)) {
          setError("We couldn't sign in with those details. If you have not created a SolveX account yet, choose Create account below.");
        } else {
          setError(message);
        }
      } else if (!result.data?.redirect && hasOAuthRequest) {
        const continued = await auth.oauth2.continue({ selected: true });
        if (continued.error) setError("This authorization request expired. Start again from SolveX.");
      } else if (!result.data?.redirect) {
        setNotice("You are signed in to SolveX.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally { setBusy(false); }
  };

  const signUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      setBusy(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const result = await auth.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
      });
      if (result.error) {
        const message = result.error.message || "Account creation failed.";
        if (/already exists|already registered|email.*taken/i.test(message)) {
          setError("An account already exists for this email. Switch to Sign in instead.");
        } else {
          setError(message);
        }
      } else {
        setMode("sign-in");
        setConfirmPassword("");
        setPassword("");
        setNeedsVerification(false);
        setOtp("");
        setNotice("Your SolveX account has been created. Sign in with this email and password to continue. If email verification is requested, send a one-time code below.");
        if (hasOAuthRequest) {
          const continued = await auth.oauth2.continue({ selected: true });
          if (continued.error) setNotice("Your account was created. The authorization request expired; return to SolveX and start sign-in again.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed.");
    } finally { setBusy(false); }
  };

  const sendVerification = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await auth.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
      if (result.error) setError(result.error.message || "Could not send a verification code.");
      else { setNeedsVerification(true); setOtp(""); setNotice("A new one-time sign-in code has been sent. Use the newest code from your inbox."); }
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send a verification code."); }
    finally { setBusy(false); }
  };

  const verifyEmail = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await auth.signIn.emailOtp({ email: email.trim(), otp: otp.trim() });
      if (result.error) setError(result.error.message || "Email-code sign-in failed.");
      else if (hasOAuthRequest) {
        const continued = await auth.oauth2.continue({ selected: true });
        if (continued.error) setError("Sign-in succeeded, but the authorization request expired. Start again from SolveX.");
      } else {
        setNotice("Email verified. You are signed in to SolveX.");
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Verification failed."); }
    finally { setBusy(false); }
  };

  const decideConsent = async (accept: boolean) => {
    setBusy(true); setError("");
    try {
      const result = await auth.oauth2.consent({ accept });
      if (result.error) setError(result.error.message || "Could not submit consent.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not submit consent."); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">SolveX Paradox Box</p>
        <h1 className="mt-3 text-2xl font-semibold">{isConsent ? "Authorize SolveX API access" : mode === "sign-up" ? "Create your SolveX account" : "Sign in to SolveX"}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {isConsent ? "Review the application requesting access before continuing." : mode === "sign-up" ? "Create your SolveX login using your email address." : "Sign in with your SolveX application account. Your Neon Console login is separate."}
        </p>
        {error && <p role="alert" className="mt-5 rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
        {notice && <p role="status" className="mt-5 rounded-lg border border-cyan-800 bg-cyan-950/40 p-3 text-sm text-cyan-200">{notice}</p>}

        {!isConsent && (
          <>
            {mode === "sign-up" ? (
              <form onSubmit={signUp} className="mt-6 space-y-4">
                <label className="block text-sm text-slate-300">Name
                  <input autoComplete="name" type="text" required value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500" />
                </label>
                <label className="block text-sm text-slate-300">Email
                  <input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500" />
                </label>
                <label className="block text-sm text-slate-300">Create password
                  <input autoComplete="new-password" type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500" />
                </label>
                <label className="block text-sm text-slate-300">Confirm password
                  <input autoComplete="new-password" type="password" minLength={8} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500" />
                </label>
                <button disabled={busy} className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Creating account…" : "Create account"}</button>
              </form>
            ) : (
              <form onSubmit={signIn} className="mt-6 space-y-4">
                <label className="block text-sm text-slate-300">Email
                  <input autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500" />
                </label>
                <label className="block text-sm text-slate-300">Password
                  <input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500" />
                </label>
                <button disabled={busy} className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Working…" : "Sign in"}</button>
              </form>
            )}
            <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setNotice(""); setNeedsVerification(false); }} disabled={busy} className="mt-4 w-full text-sm text-cyan-300 underline disabled:opacity-40">
              {mode === "sign-in" ? "Create a SolveX account" : "Already have an account? Sign in"}
            </button>
            {mode === "sign-in" && (
              <>
                {needsVerification && (
                  <form onSubmit={verifyEmail} className="mt-5 space-y-3 border-t border-slate-800 pt-5">
                    <label className="block text-sm text-slate-300">Email sign-in code
                      <input inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={e=>setOtp(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" />
                    </label>
                    <button disabled={busy} className="w-full rounded-lg border border-cyan-700 px-4 py-3 font-semibold text-cyan-200 disabled:opacity-50">Verify email</button>
                  </form>
                )}
                <button type="button" onClick={sendVerification} disabled={busy || !email.trim()} className="mt-4 w-full text-sm text-cyan-300 underline disabled:opacity-40">Send or resend sign-in code</button>
              </>
            )}
          </>
        )}

        {isConsent && (
          <div className="mt-6">
            {client ? (
              <>
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="font-semibold">{client.client_name || client.name || "Registered SolveX API client"}</p>
                  <p className="mt-2 break-all text-xs text-slate-400">Client ID: {client.client_id || params.get("client_id")}</p>
                  <p className="mt-3 text-xs text-slate-300">Requested scope: {params.get("scope") || "openid email profile offline_access"}</p>
                  <p className="mt-1 break-all text-xs text-slate-300">Protected resource: {params.get("resource") || "SolveX API"}</p>
                  <p className="mt-2 break-all text-xs text-slate-400">Redirect: {(client.redirect_uris || []).join(", ") || "Registered callback"}</p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button disabled={busy} onClick={()=>void decideConsent(false)} className="rounded-lg border border-slate-700 px-4 py-3 text-slate-300 disabled:opacity-50">Deny</button>
                  <button disabled={busy} onClick={()=>void decideConsent(true)} className="rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white disabled:opacity-50">Allow access</button>
                </div>
              </>
            ) : !error ? <p className="text-sm text-slate-400">Loading authorization details…</p> : null}
          </div>
        )}
        <p className="mt-6 text-xs text-slate-500">Protected by Neon Auth. SolveX workspace access also requires an active tenant membership.</p>
      </section>
    </main>
  );
}
