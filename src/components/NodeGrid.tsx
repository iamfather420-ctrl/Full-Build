import React, { useState, useEffect } from 'react';
import { GridNode } from '../types.js';
import { Cpu, RefreshCw, ShieldAlert, Heart, Zap, CheckCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface NodeGridProps {
  systemStatus: any;
  onRefreshSystem: () => void;
}

export default function NodeGrid({ systemStatus, onRefreshSystem }: NodeGridProps) {
  const [nodes, setNodes] = useState<GridNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GridNode | null>(null);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch nodes
  const fetchNodes = async () => {
    try {
      setLoadingNodes(true);
      const res = await fetch('/api/grid/nodes');
      if (res.ok) {
        const data = await res.json();
        setNodes(data);
        
        // Update selected node if currently open
        if (selectedNode) {
          const updated = data.find((n: GridNode) => n.id === selectedNode.id);
          if (updated) setSelectedNode(updated);
        }
      }
    } catch (e) {
      console.error("Error fetching nodes", e);
    } finally {
      setLoadingNodes(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 4000);
    return () => clearInterval(interval);
  }, []);

  // Action: Reboot node
  const handleReboot = async (id: string) => {
    setActionLoading(true);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/grid/nodes/${id}/reboot`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActionSuccess(`Node ${id} successfully entered reboot sequence. Returning online shortly.`);
        fetchNodes();
        onRefreshSystem();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Diagnostic Repair
  const handleDiagnostic = async (id: string) => {
    setActionLoading(true);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/grid/nodes/${id}/diagnostic`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActionSuccess(`Diagnostic repair completed. Cryptographic health restored to 100%.`);
        fetchNodes();
        onRefreshSystem();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Get color for status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500 border-emerald-400 shadow-emerald-950/40 text-emerald-100';
      case 'online': return 'bg-sky-500 border-sky-400 shadow-sky-950/40 text-sky-100';
      case 'diagnostic': return 'bg-amber-500 border-amber-400 animate-pulse text-amber-100 shadow-amber-950/40';
      case 'rebooting': return 'bg-indigo-500 border-indigo-400 animate-spin text-indigo-100';
      default: return 'bg-slate-600 border-slate-500 text-slate-100';
    }
  };

  // Count nodes by status
  const activeCount = nodes.filter(n => n.status === 'active').length;
  const onlineCount = nodes.filter(n => n.status === 'online').length;
  const diagnosticCount = nodes.filter(n => n.status === 'diagnostic').length;
  const rebootingCount = nodes.filter(n => n.status === 'rebooting').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="node-grid-module">
      {/* 54-Node Interactive Matrix */}
      <div className="lg:col-span-3 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-display font-semibold text-slate-100 flex items-center gap-2">
              <Cpu className="text-emerald-500 w-5 h-5" />
              Sovereign Grid Core <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 rounded-md text-emerald-400 border border-slate-700">54 Nodes Active</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Autonomous multi-node verification grid executing zero-trust cryptographic validations.</p>
          </div>
          
          <button 
            onClick={fetchNodes}
            className="text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loadingNodes ? 'animate-spin' : ''}`} />
            Force Grid Sync
          </button>
        </div>

        {/* Live Grid Key */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 bg-slate-950/40 border border-slate-800/60 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <div className="text-xs font-mono text-slate-300">Active ({activeCount})</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <div className="text-xs font-mono text-slate-300">Online ({onlineCount})</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <div className="text-xs font-mono text-slate-300">Diagnostic ({diagnosticCount})</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <div className="text-xs font-mono text-slate-300">Rebooting ({rebootingCount})</div>
          </div>
        </div>

        {/* 54-Node Interactive Matrix Map */}
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-3 justify-center items-center">
          {nodes.map((node, index) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <motion.button
                key={node.id}
                id={`btn-node-${node.id}`}
                whileHover={{ scale: 1.15, zIndex: 10 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedNode(node)}
                className={`relative h-11 rounded-lg border flex flex-col justify-center items-center transition-all cursor-pointer ${
                  isSelected 
                    ? 'ring-2 ring-emerald-400 border-white bg-slate-950 scale-110 shadow-lg' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full mb-1 ${
                  node.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                  node.status === 'online' ? 'bg-sky-500 shadow-[0_0_8px_#0ea5e9]' :
                  node.status === 'diagnostic' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse' :
                  node.status === 'rebooting' ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' : 'bg-slate-600'
                }`}></span>
                <span className="text-[10px] font-mono font-medium text-slate-400">{String(index + 1).padStart(2, '0')}</span>

                {node.cryptHealth < 90 && node.status !== 'rebooting' && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Node Context & Control Sidebar */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between">
        {selectedNode ? (
          <div className="flex flex-col h-full justify-between" id="node-control-panel">
            <div>
              <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-display font-semibold text-slate-100">{selectedNode.name}</h3>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">{selectedNode.id}</p>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  selectedNode.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  selectedNode.status === 'online' ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' :
                  selectedNode.status === 'diagnostic' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse' :
                  'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                }`}>
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>

              {/* Node Stats */}
              <div className="space-y-4 py-5">
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                    <span>Grid Job Type</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono">
                    {selectedNode.jobType}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-2.5">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">LATENCY</span>
                    <span className="text-base font-mono font-semibold text-slate-200 mt-1 block">
                      {selectedNode.status === 'rebooting' ? '--' : `${selectedNode.latency} ms`}
                    </span>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-2.5">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">UTILIZATION</span>
                    <span className="text-base font-mono font-semibold text-slate-200 mt-1 block">
                      {selectedNode.status === 'rebooting' ? '0%' : `${selectedNode.utilization}%`}
                    </span>
                  </div>
                </div>

                {/* Cryptographic Integrity Indicator */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                    <span className="text-slate-400">Cryptographic Integrity</span>
                    <span className={`font-semibold ${selectedNode.cryptHealth > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedNode.cryptHealth}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${selectedNode.cryptHealth > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${selectedNode.cryptHealth}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-500">
                  <span className="block">LAST SYNCED TIMESTAMP:</span>
                  <span className="block text-slate-400 truncate mt-0.5">{selectedNode.lastPing}</span>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              {actionSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono p-2.5 rounded mb-2">
                  {actionSuccess}
                </div>
              )}

              <button
                onClick={() => handleDiagnostic(selectedNode.id)}
                disabled={actionLoading || selectedNode.status === 'rebooting'}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono py-2 px-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Diagnostic Calibration
              </button>

              <button
                onClick={() => handleReboot(selectedNode.id)}
                disabled={actionLoading || selectedNode.status === 'rebooting'}
                className="w-full bg-red-950/20 hover:bg-red-950/40 text-red-300 text-xs font-mono py-2 px-3 rounded-lg border border-red-900/30 hover:border-red-800/50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-red-400 ${selectedNode.status === 'rebooting' ? 'animate-spin' : ''}`} />
                Sovereign Node Reboot
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10" id="node-unselected-panel">
            <Cpu className="text-slate-700 w-12 h-12 mb-3 animate-pulse-slow" />
            <h3 className="text-slate-300 font-display font-medium text-sm">Select Node to Interrogate</h3>
            <p className="text-xs text-slate-500 max-w-[200px] mt-1.5">
              Click any of the 54 autonomous grid nodes to query telemetry stats and trigger hardware diagnostics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
