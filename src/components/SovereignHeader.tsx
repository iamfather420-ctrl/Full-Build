import { Cpu, ShieldCheck, Heart, LogIn, LogOut, Chrome, Brain } from "lucide-react";
import { SOVEREIGN_TIERS } from "../lib/sovereignShield";

interface SovereignHeaderProps {
  token: string | null;
  onDisconnect: () => void;
  activeNodes: number;
  userTier?: string;
  buildCount?: number;
  onUpgradeClick?: () => void;
  userEmail?: string | null;
  onGoogleLoginClick?: () => void;
  onGoogleLogoutClick?: () => void;
  onOpenBrainInspector?: () => void;
}

export default function SovereignHeader({
  token,
  onDisconnect,
  activeNodes,
  userTier = "FREE",
  buildCount = 0,
  onUpgradeClick,
  userEmail = null,
  onGoogleLoginClick,
  onGoogleLogoutClick,
  onOpenBrainInspector
}: SovereignHeaderProps) {
  const currentTierInfo = SOVEREIGN_TIERS[userTier] || SOVEREIGN_TIERS.FREE;
  const isFree = userTier === "FREE";

  return (
    <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-2xl" id="sovereign-header">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Brand logo & title */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-950/60 border border-cyan-500/30 rounded-lg shadow-inner shadow-cyan-500/10 shrink-0">
            <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[9px] sm:text-[10px] font-mono tracking-wider text-cyan-400 uppercase bg-cyan-950/70 px-1.5 sm:px-2 py-0.5 rounded border border-cyan-800/50">
                dAIsy HaMINJA Sovereign v1.0
              </span>
              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-emerald-400 bg-emerald-950/70 px-1.5 sm:px-2 py-0.5 rounded border border-emerald-800/50">
                <Heart className="w-2.5 h-2.5 animate-bounce fill-emerald-500" /> Heartbeat: ACTIVE
              </span>
              {!isFree ? (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 font-semibold font-mono">
                    ⚡ {currentTierInfo.name.toUpperCase()} ({buildCount}/{currentTierInfo.buildLimit} BUILDS)
                  </span>
                  <button
                    onClick={onUpgradeClick}
                    className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Change Tier
                  </button>
                </div>
              ) : (
                <button
                  onClick={onUpgradeClick}
                  className="flex items-center gap-1 text-[9px] sm:text-[10px] text-cyan-300 bg-cyan-950 hover:bg-cyan-900 px-2 py-0.5 rounded border border-cyan-700/60 hover:border-cyan-400 transition-all font-mono font-bold"
                  title="Unlock Infinite Parallel Compiler Pipelines"
                >
                  🔒 FREE TRIAL ({buildCount}/1 build used) - UPGRADE
                </button>
              )}
            </div>
            <h1 className="font-display text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white mt-0.5 truncate">
              SolveX <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Monorepo Orchestrator</span>
            </h1>
          </div>
        </div>

        {/* Sovereign State Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Brain Inspector Trigger Button */}
          {onOpenBrainInspector && (
            <button
              onClick={onOpenBrainInspector}
              className="flex items-center gap-1.5 bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-900/60 text-cyan-300 px-2.5 py-1 rounded-lg transition-all font-mono text-[10px] sm:text-[11px] font-bold shadow-md shadow-cyan-950/40"
              title="Inspect Sovereign Brain Manifest, 88 Paradoxes & 5 Chambers"
              id="open-brain-inspector-btn"
            >
              <Brain className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>AI Brain Matrix</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            <div className="flex gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < 3 ? "bg-cyan-500 shadow-sm shadow-cyan-500/50" : "bg-cyan-500/30 animate-pulse"
                  }`}
                />
              ))}
            </div>
            <span className="text-slate-400 font-mono text-[10px] sm:text-[11px]">
              Grid Status: <span className="text-cyan-400 font-semibold">{activeNodes}/54 Nodes</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400 font-mono text-[10px] sm:text-[11px]">
              Compliance: <span className="text-emerald-400 font-semibold">SOC2 / ISO 42001</span>
            </span>
          </div>

          {/* Google SSO Status & Administration */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            <Chrome className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 font-mono text-[10px] sm:text-[11px] flex items-center gap-1">
              {userEmail ? (
                <>
                  <span className="text-slate-500 hidden xs:inline">SSO:</span> 
                  <span className="text-cyan-400 font-semibold max-w-[100px] sm:max-w-[140px] truncate" title={userEmail}>
                    {userEmail}
                  </span>
                  {userEmail === "gods.battle.axe.88@gmail.com" && (
                    <span className="bg-amber-950/60 text-amber-400 border border-amber-800/40 text-[8px] px-1 rounded font-bold uppercase animate-pulse">
                      Admin
                    </span>
                  )}
                  <button
                    onClick={onGoogleLogoutClick}
                    className="ml-0.5 text-rose-400 hover:text-rose-300 transition-colors p-0.5"
                    title="Log out from Google Account"
                    id="google-logout-btn"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <button
                  onClick={onGoogleLoginClick}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition-all"
                  id="google-login-btn"
                >
                  <LogIn className="w-3 h-3" /> Sign in with Google
                </button>
              )}
            </span>
          </div>

          {token && (
            <button
              onClick={onDisconnect}
              className="px-2.5 py-1 bg-rose-950/40 border border-rose-800/50 hover:bg-rose-900/50 text-rose-400 font-mono text-[10px] sm:text-[11px] rounded-lg transition-all"
              id="disconnect-tether-btn"
            >
              Disconnect Tether
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

