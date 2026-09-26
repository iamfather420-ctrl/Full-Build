import React from 'react';
import { Shield, Key, Database, RefreshCw, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SovereignRole, UserContext } from '../auth/AuthService';
import { PayPalAdapter } from '../payments/PayPalAdapter';

interface HeaderProps {
  currentUser: UserContext;
  onRoleChange: (role: SovereignRole) => void;
  activeTenant: string;
  onTenantChange: (tenant: string) => void;
  chainValid: boolean;
  auditHead: string;
  paypalConnected: boolean;
  onOpenPayPalHub: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onRoleChange,
  activeTenant,
  onTenantChange,
  chainValid,
  auditHead,
  paypalConnected,
  onOpenPayPalHub
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
                <CheckCircle2 className="w-3 h-3 inline" /> dAIsy haMINJA Active
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

          {/* PayPal Credentials Badge */}
          <button
            onClick={onOpenPayPalHub}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
              paypalConnected
                ? 'bg-blue-950/60 border-blue-700 text-blue-300 hover:bg-blue-900/50'
                : 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            <span className="font-bold tracking-wide">PayPal DN-35</span>
            {paypalConnected ? (
              <span className="flex items-center gap-1 text-[11px] text-blue-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Credentials Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-400">
                <Key className="w-3.5 h-3.5" /> Configure Creds
              </span>
            )}
          </button>

          {/* Tenant Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={activeTenant}
              onChange={(e) => onTenantChange(e.target.value)}
              className="bg-transparent text-slate-300 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="TENANT_ENTERPRISE_DEMO" className="bg-slate-900">Demo Enterprise</option>
              <option value="TENANT_SOVEREIGN_ROOT" className="bg-slate-900">Sovereign Root</option>
              <option value="TENANT_TEST" className="bg-slate-900">Sandbox Test</option>
            </select>
          </div>

          {/* RBAC Role Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={currentUser.role}
              onChange={(e) => onRoleChange(e.target.value as SovereignRole)}
              className="bg-transparent text-slate-300 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="OWNER" className="bg-slate-900">OWNER (Superadmin)</option>
              <option value="ADMIN" className="bg-slate-900">ADMIN</option>
              <option value="VERIFIER" className="bg-slate-900">VERIFIER</option>
              <option value="CUSTOMER" className="bg-slate-900">CUSTOMER</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
