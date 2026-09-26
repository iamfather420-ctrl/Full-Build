import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, Lock, Zap, ArrowRight } from 'lucide-react';
import { PayPalAdapter, PayPalVerificationTestResult } from '../payments/PayPalAdapter';

interface PayPalHubProps {
  onCredentialsUpdated: () => void;
}

export const PayPalHub: React.FC<PayPalHubProps> = ({ onCredentialsUpdated }) => {
  const adapter = PayPalAdapter.getInstance();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'live'>('sandbox');
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<PayPalVerificationTestResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [info, setInfo] = useState(adapter.getMaskedCredentialsInfo());

  useEffect(() => {
    refreshInfo();
  }, []);

  const refreshInfo = () => {
    const credInfo = adapter.getMaskedCredentialsInfo();
    setInfo(credInfo);
    setEnvironment(credInfo.environment);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) return;

    adapter.setSessionCredentials(clientId.trim(), clientSecret.trim(), environment);
    refreshInfo();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    onCredentialsUpdated();
  };

  const handleClearCredentials = () => {
    adapter.clearSessionCredentials();
    setClientId('');
    setClientSecret('');
    setTestResult(null);
    refreshInfo();
    onCredentialsUpdated();
  };

  const handleRunLiveTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const activeClientId = clientId.trim() || undefined;
      const activeSecret = clientSecret.trim() || undefined;
      const res = await adapter.testLiveCredentials(activeClientId, activeSecret, environment);
      setTestResult(res);
      if (res.valid && activeClientId && activeSecret) {
        // Automatically save verified credentials to active session
        adapter.setSessionCredentials(activeClientId, activeSecret, environment);
        refreshInfo();
        onCredentialsUpdated();
      }
    } catch (err: any) {
      setTestResult({
        valid: false,
        status_code: 500,
        environment,
        gateway_state: 'PAYPAL_API_ERROR',
        client_id_preview: clientId.substring(0, 8) || 'NONE',
        message: `Execution failure: ${err.message}`,
        timestamp: Date.now()
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Explainer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-blue-900/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-7 w-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                PP
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">PayPal DN-35 Gateway & Credentials Hub</h2>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Server-authoritative fiat payment gateway with strict fail-closed enforcement.
              Configure your PayPal Developer REST API credentials below for live client token generation,
              verifiable order escrow captures, and cryptographic license release.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 font-mono text-xs ${
              info.configured
                ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800 text-amber-300'
            }`}>
              {info.configured ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>PAYPAL_ACTIVE ({info.environment.toUpperCase()})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>CREDENTIALS_REQUIRED</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Credentials Form & Test Card */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="font-semibold text-white flex items-center gap-2 text-base">
              <Key className="w-4 h-4 text-cyan-400" />
              Configure PayPal REST API Credentials
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Source: <span className="text-cyan-400">{info.source}</span>
            </span>
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-4">
            {/* Environment Toggle */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Gateway Environment Target
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEnvironment('sandbox')}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-medium border text-center transition cursor-pointer ${
                    environment === 'sandbox'
                      ? 'bg-blue-900/30 border-blue-500 text-blue-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Sandbox (api-m.sandbox.paypal.com)
                </button>
                <button
                  type="button"
                  onClick={() => setEnvironment('live')}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-medium border text-center transition cursor-pointer ${
                    environment === 'live'
                      ? 'bg-emerald-900/30 border-emerald-500 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Live Production (api-m.paypal.com)
                </button>
              </div>
            </div>

            {/* Client ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  PayPal Client ID
                </label>
                {info.configured && (
                  <span className="text-[11px] font-mono text-slate-500">
                    Current: {info.masked_client_id}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. ASp_7e...8X2q"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Client Secret */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  PayPal Secret Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                >
                  {showSecret ? 'Hide' : 'Reveal'}
                </button>
              </div>
              <input
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="e.g. EIvQ9...23kM"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!clientId.trim() || !clientSecret.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <Lock className="w-3.5 h-3.5" />
                Activate Session Credentials
              </button>

              <button
                type="button"
                onClick={handleRunLiveTest}
                disabled={isTesting || (!clientId.trim() && !info.configured)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-2 cursor-pointer border border-slate-700"
              >
                {isTesting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                )}
                {isTesting ? 'Validating API...' : 'Test PayPal Connection'}
              </button>

              {info.configured && (
                <button
                  type="button"
                  onClick={handleClearCredentials}
                  className="px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900 text-rose-300 text-xs font-medium transition cursor-pointer"
                >
                  Clear Stored Creds
                </button>
              )}
            </div>

            {savedSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Credentials saved to active secure session. PayPal adapter is armed!</span>
              </div>
            )}
          </form>

          {/* Test Result Display */}
          {testResult && (
            <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
              testResult.valid
                ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  {testResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  {testResult.valid ? 'PayPal OAuth2 Authentication PASSED' : 'Authentication FAILED'}
                </span>
                <span className="text-[11px] opacity-75">Status: {testResult.status_code}</span>
              </div>
              <p className="text-xs opacity-90">{testResult.message}</p>
              {testResult.app_id && (
                <div className="pt-2 border-t border-emerald-800/40 grid grid-cols-2 gap-2 text-[11px]">
                  <div>App ID: <span className="text-white">{testResult.app_id}</span></div>
                  <div>Token Type: <span className="text-white">{testResult.token_type}</span></div>
                  <div>Expires In: <span className="text-white">{testResult.expires_in}s</span></div>
                  <div>Target: <span className="text-white">{testResult.environment.toUpperCase()}</span></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fail-Closed & Architecture Specifications */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Fail-Closed Compliance Standards
            </h3>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-medium text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Zero Synthetic Receipts
                </div>
                <p className="text-slate-400 leading-relaxed">
                  In absence of valid credentials, the system strictly halts with <code className="text-amber-300">EXTERNAL_PROVIDER_REQUIRED</code>. No fake transactions or speculative completions are permitted.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-medium text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Cryptographic Receipt Hashing
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Every order capture evaluates an idempotency key and commits an irreversible SHA-256 hash to the tamper-evident Merkle ledger.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-medium text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Irreversible External Action Firewall
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Financial captures are categorized as <code className="text-amber-300">IRREVERSIBLE_EXTERNAL_ACTION</code> checkpoints, blocking illegal programmatic rollbacks.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <h4 className="font-medium text-white text-xs uppercase tracking-wider mb-2 font-mono text-slate-400">
              Developer Documentation Links
            </h4>
            <div className="space-y-2 text-xs">
              <a
                href="https://developer.paypal.com/dashboard/applications/sandbox"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded bg-slate-950 hover:bg-slate-800 text-blue-400 hover:text-blue-300 transition"
              >
                <span>PayPal Developer Apps & Credentials</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://developer.paypal.com/docs/api/orders/v2/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded bg-slate-950 hover:bg-slate-800 text-blue-400 hover:text-blue-300 transition"
              >
                <span>Orders v2 REST API Reference</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
