import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShoppingCart,
  Cpu,
  BookOpen,
  Eye,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { Header } from './components/Header';
import { MarketplaceView } from './components/MarketplaceView';
import { Z3TheoremsView } from './components/Z3TheoremsView';
import { DFRLRegistryView } from './components/DFRLRegistryView';
import { ProofBundlesView } from './components/ProofBundlesView';
import { DaisyBrainView } from './components/DaisyBrainView';
import { AuditLedgerView } from './components/AuditLedgerView';
import { EnterpriseAuditRunner } from './components/EnterpriseAuditRunner';
import { UserContext } from './auth/AuthService';
import { DurableStore } from './database/DurableStore';

type ActiveTab =
  | 'OVERVIEW'
  | 'MARKETPLACE'
  | 'Z3_PROVER'
  | 'DFRL_88'
  | 'PROOF_VAULT'
  | 'DAISY_BRAIN'
  | 'MERKLE_LEDGER'
  | 'AUDIT_SUITE';

export default function App() {
  const durableStore = DurableStore.getInstance();

  const [activeTab, setActiveTab] = useState<ActiveTab>('OVERVIEW');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserContext>({
    user_id: 'unauthenticated-demo-session',
    tenant_id: 'TENANT_ENTERPRISE_DEMO',
    email: 'not-authenticated@invalid',
    role: 'CUSTOMER',
    issued_at: Date.now()
  });

  const [chainValid, setChainValid] = useState(true);
  const [auditHead, setAuditHead] = useState('');

  useEffect(() => {
    refreshSystemStatus();
    let active = true;
    fetch('/api/auth/me', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((user) => {
        if (active && user && typeof user.user_id === 'string' && typeof user.tenant_id === 'string') {
          setCurrentUser(user as UserContext);
          setIsAuthenticated(true);
        }
      })
      .catch(() => { if (active) setIsAuthenticated(false); });
    return () => { active = false; };
  }, []);

  const handleSignIn = () => { window.location.assign('/auth/login'); };
  const handleSignOut = async () => {
    try { await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }); }
    finally { window.location.assign('/'); }
  };

  const refreshSystemStatus = () => {
    const chainVerification = durableStore.verifyChain();
    setChainValid(chainVerification.valid);
    const chain = durableStore.getState().audit_chain;
    if (chain.length > 0) {
      setAuditHead(chain[chain.length - 1].record_hash);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Sovereign Header */}
      <Header
        currentUser={currentUser}
        chainValid={chainValid}
        auditHead={auditHead}
        isAuthenticated={isAuthenticated}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Navigation Tabs Bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 lg:px-8 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-1 py-2 min-w-max">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'OVERVIEW'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Overview & Parity Control</span>
          </button>

          <button
            onClick={() => setActiveTab('MARKETPLACE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'MARKETPLACE'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
            <span>B2B Marketplace & Pricing</span>
          </button>

          <button
            onClick={() => setActiveTab('Z3_PROVER')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'Z3_PROVER'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Z3 SMT Prover Kernel</span>
          </button>

          <button
            onClick={() => setActiveTab('DFRL_88')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'DFRL_88'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>DFRL 88 Paradoxes</span>
          </button>

          <button
            onClick={() => setActiveTab('PROOF_VAULT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'PROOF_VAULT'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span>Crystal Clear Box Vault</span>
          </button>

          <button
            onClick={() => setActiveTab('DAISY_BRAIN')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'DAISY_BRAIN'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>dAIsy haMINJA Brain</span>
          </button>

          <button
            onClick={() => setActiveTab('MERKLE_LEDGER')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'MERKLE_LEDGER'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Merkle Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT_SUITE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'AUDIT_SUITE'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>30-Stage Audit Suite</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Hero / Executive Overview */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300 text-xs font-mono font-medium">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Sovereign Verification Console • Deployment Gates Pending
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Project AGATE Sovereign Core &amp; Solvex B2B Platform
                </h1>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Unified orchestration suite for formal verification, defensible pricing metadata, and evidence-gated access control. Payment capture is disabled pending separate production approval.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">

                  <button
                    onClick={() => setActiveTab('MARKETPLACE')}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold tracking-wide transition flex items-center gap-2 cursor-pointer border border-slate-700"
                  >
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <span>Browse Solutions</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('AUDIT_SUITE')}
                    className="px-5 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700 text-emerald-300 text-xs font-semibold tracking-wide transition flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Run Local Verification Suite</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-slate-400 font-mono text-xs">Sovereign Mesh Nodes</span>
                <div className="text-2xl font-bold font-mono text-white">54 Nodes</div>
                <span className="text-[11px] text-emerald-400 font-mono">51 Code Executed • 3 Adapters</span>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-slate-400 font-mono text-xs">Formal Paradox Registry</span>
                <div className="text-2xl font-bold font-mono text-cyan-400">88 Invariants</div>
                <span className="text-[11px] text-cyan-300 font-mono">Native Z3 corpus: 120/120 • WASM pipeline pending</span>
              </div>

              <div className="bg-slate-900/70 border border-amber-900 rounded-2xl p-5 space-y-1">
                <span className="text-slate-400 font-mono text-xs">Payment Processing</span>
                <div className="text-2xl font-bold font-mono text-amber-300">DISABLED</div>
                <span className="text-[11px] text-slate-400 font-mono">Access is evidence-gated</span>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-slate-400 font-mono text-xs">Linear Merkle Ledger</span>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {chainValid ? 'VERIFIED' : 'TAMPERED'}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Anti-Tamper Sentinel Active</span>
              </div>
            </div>

            {/* 4 Invariant Architecture Highlights */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-white text-base">
                Core Architectural Invariants Enforced
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-cyan-400 font-bold block">1. CAPABILITY != AUTHORITY</span>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Intended invariant: runtime code or credentials must not confer execution authority. Deployed API enforcement and tenant partitioning remain production verification gates.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-indigo-400 font-bold block">2. AUTHORITY != AUTHORIZATION</span>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Intended invariant: roles require a validated authorization token. Single-use enforcement and replay resistance must be demonstrated by the deployed identity/runtime path.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-amber-400 font-bold block">3. AUTHORIZATION != EXECUTION</span>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Prior to mutation execution, an atomic deep checkpoint is staged. If any gate fails, the system executes fail-closed diversion, reverting to the verified snapshot.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-emerald-400 font-bold block">4. EXECUTION != REVERSIBILITY</span>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Irreversible commitments (such as captured fiat payments or signed legal releases) are explicitly classified as <code className="text-amber-300">IRREVERSIBLE_EXTERNAL_ACTION</code>, blocking false programmatic rollbacks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'MARKETPLACE' && (
          <MarketplaceView
            currentUser={currentUser}
            onNavigateToEvidence={(proofId) => setActiveTab('PROOF_VAULT')}
          />
        )}

        {activeTab === 'Z3_PROVER' && <Z3TheoremsView />}

        {activeTab === 'DFRL_88' && <DFRLRegistryView />}

        {activeTab === 'PROOF_VAULT' && <ProofBundlesView />}

        {activeTab === 'DAISY_BRAIN' && <DaisyBrainView />}

        {activeTab === 'MERKLE_LEDGER' && (
          <AuditLedgerView onChainVerified={refreshSystemStatus} />
        )}

        {activeTab === 'AUDIT_SUITE' && <EnterpriseAuditRunner />}
      </main>

      {/* Enterprise Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-4 lg:px-8 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Project AGATE Sovereign Core • SOLVEX Platform • Applet ID: 95462d32-717e-4ef0-b68a-e192b05cc395
          </div>
          <div className="flex items-center gap-3">
            <span>Fail-Closed: ACTIVE</span>
            <span>•</span>
            <span>Payment Capture: Disabled</span>
            <span>•</span>
            <span className="text-amber-300">Production certification pending</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
