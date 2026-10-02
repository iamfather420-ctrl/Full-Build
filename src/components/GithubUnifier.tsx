import React, { useState, useEffect } from 'react';
import { Github, Key, Check, ArrowRight, Settings, AlertCircle, Info, Sliders, Shield } from 'lucide-react';

interface GithubRepo {
  id: string;
  name: string;
  owner: string;
  stars: number;
  openIssues: number;
  language: string;
  branch: string;
  lastCommit: string;
  unificationEligible: boolean;
  status: 'unconnected' | 'connected' | 'unifying';
}

interface GithubUnifierProps {
  onBuildCreated: () => void;
  setActiveTab: (tab: string) => void;
}

export default function GithubUnifier({ onBuildCreated, setActiveTab }: GithubUnifierProps) {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [patToken, setPatToken] = useState('ghp_dAIsy_HaMINJA_SovereignCore_Token_98231FF');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>(['repo-1', 'repo-2', 'repo-3', 'repo-4']);
  
  // Custom compiler configuration options
  const [watermark, setWatermark] = useState('dAIsy_HaMINJA_Core');
  const [obfuscationLevel, setObfuscationLevel] = useState('High');
  const [antiTamperSeal, setAntiTamperSeal] = useState(true);
  const [networkId, setNetworkId] = useState('SOLVEX_ENTERPRISE_MAINNET');
  const [buildLoading, setBuildLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/github/repos');
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  // Securely Authenticate / Map repos in sandbox
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patToken) {
      setErrorMsg("Personal Access Token (PAT) is required.");
      return;
    }

    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/github/repos/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: patToken,
          repoIds: ['repo-1', 'repo-2', 'repo-3', 'repo-4'] // Auth all 4 in sandbox
        })
      });

      if (res.ok) {
        setConnectionSuccess(true);
        fetchRepos();
        setTimeout(() => setConnectionSuccess(false), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed secure handshake.");
      }
    } catch (e) {
      setErrorMsg("Failed to communicate with sandbox OAuth proxy.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Toggle selection
  const toggleRepo = (id: string) => {
    if (selectedRepoIds.includes(id)) {
      setSelectedRepoIds(selectedRepoIds.filter(item => item !== id));
    } else {
      setSelectedRepoIds([...selectedRepoIds, id]);
    }
  };

  // Start JIT Unification Build
  const handleTriggerBuild = async () => {
    if (selectedRepoIds.length === 0) {
      setErrorMsg("Please select at least one repository to unify into the build payload.");
      return;
    }

    setBuildLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reposToUnify: selectedRepoIds,
          config: {
            "SOVEREIGN_PASSPHRASE": "************",
            "WATERMARK": watermark,
            "OBFUSCATION_LEVEL": obfuscationLevel,
            "ANTI_TAMPER": antiTamperSeal ? "ENABLED" : "DISABLED",
            "GRID_NETWORK_ID": networkId
          }
        })
      });

      if (res.ok) {
        onBuildCreated();
        // Redirect to compiler factory tab
        setActiveTab('compiler');
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to start JIT Unification Build.");
      }
    } catch (e) {
      setErrorMsg("Sovereign JIT Engine communication failed.");
    } finally {
      setBuildLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="github-unifier-module">
      
      {/* Repository List Section */}
      <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between">
        <div>
          <div className="mb-5 pb-4 border-b border-slate-800">
            <h2 className="text-xl font-display font-semibold text-slate-100 flex items-center gap-2">
              <Github className="text-indigo-400 w-5 h-5" />
              Sovereign Repository Workspace
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select connected enterprise source repositories to unify and compile into a single hardware-bound binary.
            </p>
          </div>

          {/* Handshake/Access token block */}
          <form onSubmit={handleConnect} className="mb-5 bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                SANDBOX GITHUB HANDSHAKE AUTHENTICATION (PAT)
              </label>
              <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> SECURE TUNNEL
              </span>
            </div>

            <div className="flex gap-2.5">
              <input 
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
                value={patToken}
                onChange={(e) => setPatToken(e.target.value)}
                className="flex-1 bg-slate-900 text-slate-100 font-mono text-xs px-3.5 py-2 rounded-lg border border-slate-800 focus:border-slate-700 focus:outline-none placeholder-slate-700"
              />
              <button
                type="submit"
                disabled={isConnecting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isConnecting ? "Validating..." : "Connect Workspace"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {connectionSuccess && (
              <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 p-2 rounded">
                ✓ Handbook token validated. 4 corporate repositories unlocked for sandbox unification pipeline.
              </div>
            )}
          </form>

          {/* Repository List */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">TARGET REPOSITORIES FOR UNIFICATION:</h3>
            
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {repos.map(repo => {
                const isSelected = selectedRepoIds.includes(repo.id);
                const isConnected = repo.status !== 'unconnected';
                return (
                  <div 
                    key={repo.id}
                    onClick={() => isConnected && toggleRepo(repo.id)}
                    className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                      !isConnected ? 'opacity-50 border-slate-900 bg-slate-950/20' :
                      isSelected ? 'bg-slate-950/90 border-indigo-500/80 shadow-md shadow-indigo-950/10' :
                      'bg-slate-950/40 border-slate-800 hover:border-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      {isConnected ? (
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-slate-800 bg-slate-950 flex items-center justify-center text-[10px] text-slate-600 font-mono">!</div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-display font-semibold text-slate-200">{repo.name}</h4>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-900 border border-slate-800 rounded text-slate-400">
                            {repo.language}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono max-w-[480px] truncate">{repo.lastCommit}</p>
                      </div>
                    </div>

                    <div className="text-right text-[10px] font-mono shrink-0">
                      <span className="text-slate-500 block">BRANCH: {repo.branch.toUpperCase()}</span>
                      <span className={`block text-[9px] mt-0.5 ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isConnected ? "● INTEGRATED" : "○ LOCKED"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 text-[10px] font-mono p-2.5 rounded mt-4 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Compiler JIT Configuration Panel */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between">
        <div>
          <div className="mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-md font-display font-semibold text-slate-100 flex items-center gap-1.5">
              <Sliders className="text-indigo-400 w-4.5 h-4.5" />
              Sovereign Compile Config
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Customize build parameters for hardened APK/binary output.</p>
          </div>

          <div className="space-y-4 py-3">
            {/* Watermark name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 block uppercase">HARDENED WATERMARK HEADER</label>
              <input 
                type="text"
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-slate-700 focus:outline-none"
              />
              <span className="text-[9px] font-mono text-slate-500 block">Ensures secure verification tracing within client sandboxes.</span>
            </div>

            {/* Obfuscation level selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 block uppercase">OBFUSCATION AGGRESSION</label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg text-[9px] font-mono">
                {['Low', 'Medium', 'High', 'Extreme'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setObfuscationLevel(lvl)}
                    className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${obfuscationLevel === lvl ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <span className="text-[9px] font-mono text-slate-500 block">Scrambles memory register offsets and logic jumps.</span>
            </div>

            {/* Target Network ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 block uppercase">TARGET DEPLOYMENT NETWORK ID</label>
              <input 
                type="text"
                value={networkId}
                onChange={(e) => setNetworkId(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-slate-700 focus:outline-none"
              />
            </div>

            {/* Anti tamper check */}
            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
              <div className="space-y-0.5 pr-2">
                <span className="text-[10px] font-mono text-slate-300 block font-bold">ANTI-TAMPER CORE SEAL</span>
                <span className="text-[9px] font-mono text-slate-500 block">Inject RSA-4096 anti-tamper wrapper to verify build authenticity.</span>
              </div>
              
              <button
                type="button"
                onClick={() => setAntiTamperSeal(!antiTamperSeal)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${antiTamperSeal ? 'bg-emerald-500' : 'bg-slate-700'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${antiTamperSeal ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 mb-3 text-[10px] font-sans text-slate-400 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>Unifying will combine selection ASTs, compile them, watermark the binaries, and generate secure deployment hashes.</span>
          </div>

          <button
            onClick={handleTriggerBuild}
            disabled={buildLoading || selectedRepoIds.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-800 text-white text-xs font-mono py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-950/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {buildLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Unifying Repository Core...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-emerald-100" />
                Initialize JIT Unification Compile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
