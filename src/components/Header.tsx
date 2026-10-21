import React from 'react';
import { Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { UserContext } from '../auth/AuthService';

interface HeaderProps {
  currentUser: UserContext;
  chainValid: boolean;
  auditHead: string;
  isAuthenticated: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  chainValid,
  auditHead,
  isAuthenticated,
  onSignIn,
  onSignOut,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Core Engine */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold text-lg">
            💎
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-lg">Project AGATE</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                SOVEREIGN CORE v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <span>SOLVEX B2B Engine</span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 inline" /> dAIsy haMINJA Console · Local Preview
              </span>
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Audit Chain Head */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono">
            <span className="text-slate-400">Merkle Head:</span>
            <span className={chainValid ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
              {auditHead ? `${auditHead.slice(0, 10)}...${auditHead.slice(-6)}` : 'GENESIS'}
            </span>
            {chainValid ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Audit chain continuous" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            )}
          </div>

          {/* Payment capability intentionally disabled in this release. */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-800 bg-amber-950/30 text-xs font-medium text-amber-300" role="status">
            <span className="font-bold tracking-wide">Payments Disabled</span>
            <span className="text-[11px]">No payment / no capture</span>
          </div>

          {/* This UI is not an identity provider; do not allow client-side role or tenant elevation. */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${isAuthenticated ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300' : 'border-rose-900 bg-rose-950/30 text-rose-300'}`} role="status">
            <Shield className="w-3.5 h-3.5" />
            {isAuthenticated ? (
              <>
                <span>{currentUser.email}</span>
                <span className="text-[11px]">{currentUser.role}</span>
                <button type="button" onClick={onSignOut} className="ml-1 rounded border border-slate-700 px-2 py-1 hover:bg-slate-800">Sign out</button>
              </>
            ) : (
              <>
                <span>Demo session · not authenticated</span>
                <button type="button" onClick={onSignIn} className="ml-1 rounded border border-rose-700 px-2 py-1 hover:bg-rose-900/50">Sign in</button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
