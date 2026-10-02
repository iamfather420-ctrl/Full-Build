import React, { useState } from 'react';
import { GitHubRepo, UnificationResult } from '../types';
import { GitBranch, GitMerge, Search, Key, Check, AlertCircle, Cpu, Cloud, FileCode, CheckCircle2, Lock, ArrowRight, Layers, HelpCircle } from 'lucide-react';

interface GithubUnifierProps {
  onNotifySystem: (text: string) => void;
}

export default function GithubUnifier({ onNotifySystem }: GithubUnifierProps) {
  const [username, setUsername] = useState('opinionuncuffed');
  const [token, setToken] = useState('');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepoNames, setSelectedRepoNames] = useState<string[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  
  const [applyObfuscation, setApplyObfuscation] = useState(true);
  const [applyWatermarking, setApplyWatermarking] = useState(true);
  const [isUnifying, setIsUnifying] = useState(false);
  const [unifyResult, setUnifyResult] = useState<UnificationResult | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const [activeCodeTab, setActiveCodeTab] = useState<'dockerfile' | 'cloudbuild' | 'entrypoints'>('dockerfile');

  const handleFetchRepos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoadingRepos(true);
    setWarningMessage(null);
    setRepos([]);
    setSelectedRepoNames([]);
    setUnifyResult(null);

    try {
      const res = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token })
      });

      const data = await res.json();
      if (data.success) {
        setRepos(data.repos);
        if (data.warning) {
          setWarningMessage(data.warning);
        }
        // Auto-select first two repos for smooth UX
        if (data.repos.length > 0) {
          setSelectedRepoNames([data.repos[0].name, data.repos[1]?.name].filter(Boolean));
        }
      } else {
        throw new Error(data.error || 'Failed to retrieve repository signatures.');
      }
    } catch (err: any) {
      setWarningMessage(err.message || 'Connection error to GitHub Endpoint.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleToggleRepo = (name: string) => {
    setSelectedRepoNames(prev => 
      prev.includes(name) 
        ? prev.filter(r => r !== name) 
        : [...prev, name]
    );
  };

  const handleTriggerUnify = async () => {
    if (selectedRepoNames.length === 0) return;
    setIsUnifying(true);
    setUnifyResult(null);

    try {
      const res = await fetch('/api/github/unify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          repos: selectedRepoNames,
          applyObfuscation,
          applyWatermarking
        })
      });

      const data = await res.json();
      if (data.success) {
        setUnifyResult(data);
        onNotifySystem(`🔄 [MONOREPO ORCHESTRATION INITIATED]
Unifying ${selectedRepoNames.length} GitHub repositories for profile "${username}" into a single consolidated Google Cloud Run build footprint (${data.unifiedId}). Apply Watermarking: ${applyWatermarking ? 'ON' : 'OFF'}. Obfuscation: ${applyObfuscation ? 'ON' : 'OFF'}.`);
      }
    } catch (err) {
      console.error('Failed to unify repositories:', err);
    } finally {
      setIsUnifying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="github_unifier_module">
      {/* Profile Ingress & Repos List */}
      <div className="xl:col-span-1 border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-neutral-900 pb-3">
            <div className="flex items-center space-x-2">
              <GitBranch className="h-5 w-5 text-cyan-400" />
              <h2 className="font-display font-medium text-lg text-white">GitHub Ingress Portal</h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-900/50 px-2 py-0.5 rounded">
              INGRESS ACTIVE
            </span>
          </div>

          <p className="text-xs text-neutral-400 mb-6 font-sans">
            Connect your GitHub profile parameters. Fetch repository endpoints and map their branches autonomously to compile a single container footprint.
          </p>

          {/* Form */}
          <form onSubmit={handleFetchRepos} className="space-y-3 mb-6">
            <div>
              <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">GitHub Username / Org</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-neutral-600" />
                <input
                  id="github_username_input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs font-mono pl-9 pr-3 py-2.5 rounded text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. solvex-labs"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase block">GitHub Personal Access Token</label>
                <span className="text-[9px] font-mono text-neutral-600 uppercase">Optional</span>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-3.5 w-3.5 text-neutral-600" />
                <input
                  id="github_token_input"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs font-mono pl-9 pr-3 py-2.5 rounded text-white focus:outline-none focus:border-cyan-500"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
            </div>

            <button
              id="btn_fetch_github_repos"
              type="submit"
              disabled={isLoadingRepos}
              className="w-full text-center bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 hover:border-neutral-700 py-2.5 rounded text-xs font-mono font-medium transition"
            >
              {isLoadingRepos ? 'Fetching Profile Repositories...' : 'Fetch Repository Signatures'}
            </button>
          </form>

          {/* Error Warning info block */}
          {warningMessage && (
            <div className="p-3 bg-cyan-950/20 border border-cyan-900/50 rounded mb-4 text-[10px] font-mono text-cyan-400 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{warningMessage}</span>
            </div>
          )}

          {/* Loaded Repos checkboxes */}
          {repos.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-neutral-500 uppercase block">Select Repositories to Unify ({selectedRepoNames.length} selected)</span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 no-scrollbar border border-neutral-900 p-2 rounded bg-black/40">
                {repos.map((repo) => {
                  const isChecked = selectedRepoNames.includes(repo.name);
                  return (
                    <button
                      key={repo.id}
                      type="button"
                      id={`repo_checkbox_${repo.name}`}
                      onClick={() => handleToggleRepo(repo.name)}
                      className={`
                        w-full flex items-start justify-between p-2 rounded border text-left font-mono transition duration-100
                        ${isChecked ? 'border-cyan-500/50 bg-cyan-950/10 text-white' : 'border-neutral-900 bg-neutral-950/40 text-neutral-400 hover:border-neutral-800'}
                      `}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-neutral-700'}`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">{repo.name}</span>
                          <span className="text-[9px] text-neutral-500 truncate block max-w-[140px]">{repo.description}</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-neutral-500 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded uppercase shrink-0">
                        {repo.language}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="text-[9px] font-mono text-neutral-600 mt-6 pt-4 border-t border-neutral-900">
          SECURE PROTOCOL LOCKED: NO REPO SECRETS ARE PERSISTED ON PLATFORM SERVER
        </div>
      </div>

      {/* Orchestration Configurations & Actions */}
      <div className="xl:col-span-2 border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-4 border-b border-neutral-900 pb-3">
            <GitMerge className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="font-display font-medium text-white">Monorepo Orchestrator Console</h3>
              <span className="text-[10px] font-mono text-neutral-500 uppercase">JIT Monorepo Synthesis & Deployment Configuration</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side options */}
            <div className="space-y-4 font-mono text-xs">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 block uppercase mb-2">Consolidation Options</span>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 border border-neutral-900 rounded bg-black/40 cursor-pointer hover:border-neutral-800">
                    <input
                      type="checkbox"
                      checked={applyObfuscation}
                      onChange={(e) => setApplyObfuscation(e.target.checked)}
                      className="form-checkbox bg-neutral-900 border-neutral-800 text-cyan-400 focus:ring-0 focus:ring-offset-0 rounded"
                    />
                    <div>
                      <span className="text-white block font-bold text-[11px]">Apply 58-Operator Obfuscation</span>
                      <span className="text-[9px] text-neutral-500 block mt-0.5">XOR dynamic routing & entry timing scramble layers.</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border border-neutral-900 rounded bg-black/40 cursor-pointer hover:border-neutral-800">
                    <input
                      type="checkbox"
                      checked={applyWatermarking}
                      onChange={(e) => setApplyWatermarking(e.target.checked)}
                      className="form-checkbox bg-neutral-900 border-neutral-800 text-cyan-400 focus:ring-0 focus:ring-offset-0 rounded"
                    />
                    <div>
                      <span className="text-white block font-bold text-[11px]">Secure Binary Watermarking</span>
                      <span className="text-[9px] text-neutral-500 block mt-0.5">Inject unique SHA-256 anti-piracy tags into binary.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-neutral-900 rounded border border-neutral-800/60 text-neutral-400 leading-relaxed text-[11px]">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-bold mb-1">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>The "Link-it-all" Architecture</span>
                </div>
                <span>Our sovereign orchestrator generates a single Express.js gateway container, fetching specified repos to `/services` directory. The master AI core intercepts incoming queries, routes requests, and applies global payment modules autonomously.</span>
              </div>

              <button
                id="btn_trigger_unification"
                onClick={handleTriggerUnify}
                disabled={isUnifying || selectedRepoNames.length === 0}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded text-xs font-mono font-bold bg-white text-black hover:bg-neutral-200 transition disabled:opacity-50"
              >
                {isUnifying ? (
                  <span>Compiling Orchestration Matrix...</span>
                ) : (
                  <>
                    <span>Unify Selected Repositories</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Right side Output configuration viewer */}
            <div className="border border-neutral-900 rounded bg-black/60 p-4 font-mono text-[11px] flex flex-col justify-between overflow-hidden">
              {unifyResult ? (
                <div className="flex flex-col justify-between h-full space-y-3">
                  <div>
                    {/* View code tabs */}
                    <div className="flex border-b border-neutral-900 text-[10px] pb-1.5 mb-3 gap-2">
                      <button
                        onClick={() => setActiveCodeTab('dockerfile')}
                        className={`font-bold uppercase pb-1 px-1.5 ${activeCodeTab === 'dockerfile' ? 'text-cyan-400 border-b border-cyan-500' : 'text-neutral-500'}`}
                      >
                        Dockerfile
                      </button>
                      <button
                        onClick={() => setActiveCodeTab('cloudbuild')}
                        className={`font-bold uppercase pb-1 px-1.5 ${activeCodeTab === 'cloudbuild' ? 'text-cyan-400 border-b border-cyan-500' : 'text-neutral-500'}`}
                      >
                        cloudbuild.yaml
                      </button>
                      <button
                        onClick={() => setActiveCodeTab('entrypoints')}
                        className={`font-bold uppercase pb-1 px-1.5 ${activeCodeTab === 'entrypoints' ? 'text-cyan-400 border-b border-cyan-500' : 'text-neutral-500'}`}
                      >
                        AI Router Map
                      </button>
                    </div>

                    <div className="bg-neutral-950/80 p-3 rounded border border-neutral-900 h-44 overflow-y-auto text-[10px] text-cyan-400 no-scrollbar leading-relaxed">
                      {activeCodeTab === 'dockerfile' && (
                        <pre className="whitespace-pre-wrap">{unifyResult.config.dockerfile}</pre>
                      )}
                      {activeCodeTab === 'cloudbuild' && (
                        <pre className="whitespace-pre-wrap">{unifyResult.config.cloudbuild}</pre>
                      )}
                      {activeCodeTab === 'entrypoints' && (
                        <div className="space-y-3">
                          <div className="text-[10px] text-neutral-500 uppercase">Unified API Entry Points</div>
                          {unifyResult.config.entrypoints.map((entry, idx) => (
                            <div key={idx} className="border-b border-neutral-900 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                              <div className="text-white font-bold">{entry.service} service</div>
                              <div className="text-emerald-400 mt-0.5">Route: {entry.route}</div>
                              <div className="text-neutral-500 text-[9px] mt-0.5">Env: {entry.environment.join(', ')}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-900 space-y-2">
                    <div className="flex items-center space-x-1.5 text-emerald-400 text-[10px] font-bold">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>MONOREPO CONFIGURATION GENERATED</span>
                    </div>
                    <div className="text-[9px] text-neutral-500">
                      ID: <span className="text-white">{unifyResult.unifiedId}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-between py-12 text-center text-neutral-600">
                  <div className="flex flex-col items-center">
                    <Layers className="h-8 w-8 text-neutral-800 mb-2 animate-pulse" />
                    <span className="text-neutral-500 text-xs">Waiting for repository consolidation...</span>
                    <span className="text-[9px] mt-1 max-w-xs leading-relaxed">Configure your ingress profile, select repos, and click Unify Selected Repositories.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono text-neutral-500 mt-4 border-t border-neutral-900 pt-4 flex justify-between">
          <span>ENDPOINT: /api/github/unify</span>
          <span>ORCHESTRATOR STATUS: NOMINAL</span>
        </div>
      </div>
    </div>
  );
}
