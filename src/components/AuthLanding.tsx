import React from "react";

export function AuthLanding({ loading }: { loading: boolean }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">SolveX Paradox Box</p>
        <h1 className="mt-3 text-3xl font-semibold">Secure sign-in required</h1>
        <p className="mt-3 text-slate-400">Continue through Neon Auth. SolveX checks your verified identity and active tenant membership before opening the workspace.</p>
        {loading ? <p className="mt-6 text-sm text-cyan-300">Checking your session…</p> : (
          <a href="/api/login" className="mt-6 inline-flex rounded-lg bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-500">Continue with Neon Auth</a>
        )}
      </section>
    </main>
  );
}
