import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCw, ShieldCheck, AlertTriangle, ShieldAlert, Cpu, Terminal, Layers, Info, CheckCircle2, ChevronRight, Server, FileCode, Check, RefreshCw } from 'lucide-react';
import { Pipeline, PipelineStep } from '../types';

export default function CicdOrchestration() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeId, setSelectedPipeId] = useState<string>('sovereign-kernel');
  const [loading, setLoading] = useState<boolean>(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [redeployingId, setRedeployingId] = useState<string | null>(null);
  const [expandedManifest, setExpandedManifest] = useState<string | null>(null);

  const fetchPipelines = async () => {
    try {
      const res = await fetch('/api/cicd/pipelines');
      if (res.ok) {
        const data = await res.json();
        setPipelines(data);
      }
    } catch (e) {
      console.error("Error fetching pipelines", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
    const interval = setInterval(fetchPipelines, 1500); // Poll frequently during runs
    return () => clearInterval(interval);
  }, []);

  const handleTrigger = async (id: string) => {
    setTriggeringId(id);
    try {
      const res = await fetch(`/api/cicd/pipelines/${id}/trigger`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchPipelines();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setTriggeringId(null), 1000);
    }
  };

  const handleRedeploy = async (id: string) => {
    setRedeployingId(id);
    try {
      const res = await fetch(`/api/cicd/pipelines/${id}/redeploy`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchPipelines();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setRedeployingId(null), 1000);
    }
  };

  const activePipe = pipelines.find(p => p.id === selectedPipeId);

  // Simulated Kubernetes file configurations for display
  const manifests: Record<string, string> = {
    'Dockerfile': `FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src
COPY server.ts ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /usr/src/app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/server.cjs"]`,

    'deployment.yaml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: sovereign-kernel
  namespace: daisy-prod
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
        - name: sovereign-kernel
          image: ghcr.io/solvex/sovereign-kernel:latest
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"`,

    'ci-pipeline.yml': `name: "CI/CD: Sovereign Kernel"
on:
  push:
    branches: [ "main" ]
jobs:
  security-sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Snyk Security Scan
        uses: snyk/actions/node@master
      - name: Trivy Safety Audit
        uses: aquasecurity/trivy-action@master`
  };

  return (
    <div className="space-y-6" id="cicd-orchestration-container">
      
      {/* Upper Status Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Microservice Pipeline Selector Card */}
        <div className="lg:col-span-1 bg-slate-950/80 border border-slate-900 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <div>
              <h3 className="text-sm font-display font-bold text-slate-100 uppercase tracking-tight">Sovereign Grid Nodes</h3>
              <p className="text-[10px] text-slate-400 font-mono">Microservice CI/CD Pipelines</p>
            </div>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="h-14 bg-slate-900 rounded-xl"></div>
                ))}
              </div>
            ) : (
              pipelines.map(pipe => {
                const isActive = pipe.id === selectedPipeId;
                const isRunning = pipe.lastBuildStatus === 'running';

                return (
                  <button
                    key={pipe.id}
                    onClick={() => setSelectedPipeId(pipe.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group cursor-pointer ${
                      isActive
                        ? 'bg-slate-900/60 border-indigo-500/40 text-slate-100 shadow-md shadow-indigo-500/5'
                        : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
                    }`}
                  >
                    {/* Running Left Glow */}
                    {isRunning && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 animate-pulse"></div>
                    )}

                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-sans text-xs font-bold text-slate-200 tracking-tight group-hover:text-slate-100 transition-colors">
                          {pipe.name}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]">
                          {pipe.repository}
                        </div>
                      </div>

                      {/* Build status label */}
                      <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        pipe.lastBuildStatus === 'success'
                          ? 'bg-emerald-950/30 border border-emerald-500/20 text-emerald-400'
                          : pipe.lastBuildStatus === 'running'
                          ? 'bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 animate-pulse'
                          : 'bg-slate-900 text-slate-400'
                      }`}>
                        {pipe.lastBuildStatus.toUpperCase()}
                      </span>
                    </div>

                    {/* Lower summary bar */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-900/60 font-mono text-[9px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">CVEs:</span>
                        {pipe.vulns.critical > 0 ? (
                          <span className="text-rose-400 font-bold flex items-center gap-0.5 animate-pulse">
                            <ShieldAlert className="w-2.5 h-2.5" /> {pipe.vulns.critical}
                          </span>
                        ) : pipe.vulns.high > 0 ? (
                          <span className="text-amber-400 font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> {pipe.vulns.high}
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-0.5 font-bold">
                            <ShieldCheck className="w-2.5 h-2.5" /> 0
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-slate-500">
                        <span>REPLICAS:</span>
                        <span className={`font-bold ${pipe.k8s.availableReplicas > 0 ? 'text-slate-300' : 'text-rose-400 animate-pulse'}`}>
                          {pipe.k8s.availableReplicas}/{pipe.k8s.replicas}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed Pipeline Running Steps & K8s Cluster Status */}
        <div className="lg:col-span-2 bg-slate-950/80 border border-slate-900 rounded-2xl p-5 space-y-6">
          {activePipe ? (
            <>
              {/* Header Details with Action Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-4">
                <div>
                  <h3 className="text-base font-display font-bold text-slate-100">{activePipe.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 text-indigo-400 truncate">
                      {activePipe.dockerImage}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTrigger(activePipe.id)}
                    disabled={activePipe.lastBuildStatus === 'running' || triggeringId === activePipe.id}
                    className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      activePipe.lastBuildStatus === 'running'
                        ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10'
                    }`}
                  >
                    <Play className={`w-3.5 h-3.5 ${activePipe.lastBuildStatus === 'running' ? 'animate-spin' : ''}`} />
                    {activePipe.lastBuildStatus === 'running' ? 'RUNNING...' : 'TRIGGER CI/CD'}
                  </button>

                  <button
                    onClick={() => handleRedeploy(activePipe.id)}
                    disabled={redeployingId === activePipe.id}
                    className="px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-slate-100 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${redeployingId === activePipe.id ? 'animate-spin' : ''}`} />
                    REDEPLOY K8S
                  </button>
                </div>
              </div>

              {/* Middle Section: Dual panel (Pipeline Progress + K8s replica monitor) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Panel 1: Pipeline Execution Steps */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 border-b border-slate-900 pb-1.5">
                    <span>CI/CD STEP METRIC</span>
                    <span>STATUS</span>
                  </div>

                  <div className="space-y-2">
                    {activePipe.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all font-sans text-xs ${
                          step.status === 'success'
                            ? 'bg-emerald-950/5 border-emerald-500/10 text-emerald-300'
                            : step.status === 'running'
                            ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-200 animate-pulse'
                            : 'bg-slate-950 border-slate-900 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500">0{idx + 1}</span>
                          <span className="font-bold">{step.name}</span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          {step.status === 'success' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : step.status === 'running' ? (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                          ) : (
                            <span className="text-slate-600">PENDING</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 2: Live Kubernetes Cluster replica monitor */}
                <div className="bg-slate-950 border border-slate-900/60 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 border-b border-slate-900 pb-2">
                    <span>KUBERNETES DEPLOYMENT STATE</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950/20 text-emerald-400 border border-emerald-500/15 rounded font-bold">
                      PROD CLUSTER
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Pod Namespace:</span>
                      <span className="font-mono font-bold text-slate-200">{activePipe.k8s.namespace}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Target Replicas:</span>
                      <span className="font-mono font-bold text-indigo-400">{activePipe.k8s.replicas} Pods</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Available Pods:</span>
                      <span className={`font-mono font-bold ${activePipe.k8s.availableReplicas === activePipe.k8s.replicas ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                        {activePipe.k8s.availableReplicas} / {activePipe.k8s.replicas}
                      </span>
                    </div>

                    {/* Progress replica balls */}
                    <div className="flex items-center gap-2 pt-1">
                      {Array.from({ length: activePipe.k8s.replicas }).map((_, i) => {
                        const isOnline = i < activePipe.k8s.availableReplicas;
                        return (
                          <div
                            key={i}
                            className={`h-4 flex-1 rounded-md transition-all duration-500 border ${
                              isOnline
                                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                                : 'bg-slate-900 border-slate-800 animate-pulse'
                            }`}
                            title={isOnline ? `Pod ${activePipe.k8s.name}-${i} active` : `Pod ${activePipe.k8s.name}-${i} starting...`}
                          ></div>
                        );
                      })}
                    </div>

                    {/* Performance metrics inside container */}
                    <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-[10px]">
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-900">
                        <div className="text-slate-500">POD CPU</div>
                        <div className="text-slate-200 font-bold mt-1 text-xs">{activePipe.k8s.cpuUtilization}%</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-900">
                        <div className="text-slate-500">POD MEMORY</div>
                        <div className="text-slate-200 font-bold mt-1 text-xs">{activePipe.k8s.memoryUtilization}%</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Section: Step-by-Step Live Runner Logs */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 border-b border-slate-900 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" /> ACTIVE RUNNER LOG OUTPUT
                  </span>
                  <span className="text-[9px] text-slate-500">UTF-8 ENCODED SECURE STREAM</span>
                </div>

                <div className="bg-slate-900/60 border border-slate-950 rounded-lg p-3 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {activePipe.steps.map((step) => {
                    if (step.status === 'pending') return null;
                    return step.logs.map((logLine, lineIdx) => (
                      <div key={`${step.name}-${lineIdx}`} className="leading-relaxed flex items-start gap-2">
                        <span className="text-indigo-500 shrink-0 select-none">&gt;</span>
                        <span className={step.status === 'running' ? 'text-indigo-300 animate-pulse' : 'text-slate-300'}>{logLine}</span>
                      </div>
                    ));
                  })}
                  {activePipe.lastBuildStatus === 'running' && (
                    <div className="text-indigo-400 font-bold animate-pulse flex items-center gap-1.5 pt-1.5">
                      <span className="w-1.5 h-3 bg-indigo-400 animate-pulse"></span>
                      <span>Execution in progress... holding active subgrid tether...</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 font-mono text-xs">
              No active sovereign microservice pipeline selected.
            </div>
          )}
        </div>

      </div>

      {/* Manifest Configuration Files Explorer (Infrastructure as Code) */}
      <div className="bg-slate-950/80 border border-slate-900 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <div>
            <h3 className="text-sm font-display font-bold text-slate-100 uppercase tracking-tight">Infrastructure as Code (IaC)</h3>
            <p className="text-[10px] text-slate-400 font-mono">Declarative K8s Manifests & Dockerfiles</p>
          </div>
          <FileCode className="w-4 h-4 text-emerald-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.keys(manifests).map((fileName) => (
            <div key={fileName} className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-slate-900/40 border-b border-slate-900 px-3.5 py-2.5 flex items-center justify-between">
                <span className="font-mono text-xs text-slate-300 font-bold flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" /> {fileName}
                </span>
                <button
                  onClick={() => setExpandedManifest(expandedManifest === fileName ? null : fileName)}
                  className="font-mono text-[9px] font-bold px-2 py-0.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  {expandedManifest === fileName ? 'CLOSE' : 'VIEW'}
                </button>
              </div>

              <AnimatePresence>
                {expandedManifest === fileName && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-900 bg-slate-900/10"
                  >
                    <pre className="p-4 font-mono text-[10px] text-slate-400 overflow-x-auto leading-relaxed bg-slate-950 max-h-[300px]">
                      <code>{manifests[fileName]}</code>
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-3 bg-slate-900/10 border-t border-slate-900/40 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>Hardened anti-tamper watermark: verified</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
