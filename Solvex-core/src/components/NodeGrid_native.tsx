import React, { useState } from 'react';
import { GridNode } from '../types';
import { Shield, Activity, RefreshCw, Cpu, Server, Thermometer, Zap } from 'lucide-react';

interface NodeGridProps {
  nodes: GridNode[];
  onUpdateNode: (updatedNode: GridNode) => void;
}

export default function NodeGrid({ nodes, onUpdateNode }: NodeGridProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(1);
  const [isPinging, setIsPinging] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];

  const handlePingNode = () => {
    if (!selectedNode) return;
    setIsPinging(true);
    setTimeout(() => {
      setIsPinging(false);
      // Increase load slightly on ping
      onUpdateNode({
        ...selectedNode,
        load: Math.min(selectedNode.load + 5, 100),
        activity: `Received diagnostic ping. Verification handshake active.`
      });
    }, 800);
  };

  const handleRebootNode = () => {
    if (!selectedNode) return;
    setIsRebooting(true);
    
    // Simulate re-initializing
    onUpdateNode({
      ...selectedNode,
      status: 'isolated',
      activity: 'Initiating system reboot cycle...',
      load: 0,
      uptime: '0h 0m'
    });

    setTimeout(() => {
      setIsRebooting(false);
      onUpdateNode({
        ...selectedNode,
        status: 'active',
        load: 25,
        temperature: 42,
        activity: 'Tether Core synchronized. Sync complete.',
        uptime: '0h 1m'
      });
    }, 2500);
  };

  // Stats summaries
  const totalNodes = nodes.length;
  const activeCount = nodes.filter(n => n.status === 'active').length;
  const syncedCount = nodes.filter(n => n.status === 'synced').length;
  const criticalCount = nodes.filter(n => n.status === 'critical').length;
  const isolatedCount = nodes.filter(n => n.status === 'isolated').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="node_grid_module">
      {/* 54-Node Grid Matrix Panel */}
      <div className="lg:col-span-2 border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-cyan-400 animate-pulse-cyan" />
              <h2 className="font-display font-medium text-lg text-white">54-Node Autonomous Tether Grid</h2>
            </div>
            <div className="text-xs font-mono text-neutral-500">
              Heartbeat: <span className="text-cyan-400">NOMINAL (440ms)</span>
            </div>
          </div>

          <p className="text-xs text-neutral-400 mb-6 font-sans">
            Sovereign dual-market network controllers. Each agent runs isolated secure pipelines matching binary artifacts, security rules, and real-time transaction routes.
          </p>

          {/* Indicators Bar */}
          <div className="grid grid-cols-4 gap-2 mb-6 text-center text-xs font-mono py-2 px-3 bg-neutral-900/50 rounded border border-neutral-900">
            <div className="flex items-center justify-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-neutral-400">{activeCount} Active</span>
            </div>
            <div className="flex items-center justify-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
              <span className="text-neutral-400">{syncedCount} Synced</span>
            </div>
            <div className="flex items-center justify-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
              <span className="text-neutral-400">{isolatedCount} Isolated</span>
            </div>
            <div className="flex items-center justify-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span className="text-neutral-400">{criticalCount} Crit</span>
            </div>
          </div>

          {/* Visual Matrix dots */}
          <div className="grid grid-cols-9 gap-3 p-4 bg-black rounded-lg border border-neutral-900 justify-items-center">
            {nodes.map((node) => {
              const statusColors = {
                active: 'bg-emerald-500 ring-emerald-500/20 hover:bg-emerald-400',
                synced: 'bg-cyan-400 ring-cyan-400/20 hover:bg-cyan-300',
                isolated: 'bg-amber-500 ring-amber-500/20 hover:bg-amber-400 animate-pulse',
                critical: 'bg-rose-500 ring-rose-500/20 hover:bg-rose-400 animate-ping-slow'
              };

              const isSelected = selectedNodeId === node.id;

              return (
                <button
                  key={node.id}
                  id={`node_btn_${node.id}`}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`
                    relative group w-8 h-8 rounded flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-150
                    ${isSelected ? 'bg-neutral-800 text-cyan-400 ring-2 ring-cyan-500' : 'bg-neutral-900/60 text-neutral-500 border border-neutral-800 hover:border-neutral-600'}
                  `}
                  title={`${node.label}: ${node.role} (${node.status.toUpperCase()})`}
                >
                  <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${statusColors[node.status]}`}></span>
                  {node.id}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center text-[10px] font-mono text-neutral-500 border-t border-neutral-900 pt-4">
          <span>COMPILED GRID INGRESS: ACTIVE</span>
          <span>SHA-256 MATCH: PASS</span>
        </div>
      </div>

      {/* Selected Node Telemetry details */}
      <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-4 border-b border-neutral-900 pb-3">
            <Server className="h-5 w-5 text-neutral-400" />
            <div>
              <h3 className="font-display font-medium text-white">{selectedNode.label} Telemetry</h3>
              <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase">{selectedNode.role}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Status Segment */}
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">Operational Status</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${
                  selectedNode.status === 'active' ? 'bg-emerald-500' :
                  selectedNode.status === 'synced' ? 'bg-cyan-400' :
                  selectedNode.status === 'isolated' ? 'bg-amber-500' : 'bg-rose-500'
                }`}></span>
                <span className="text-xs font-mono font-medium text-white uppercase">{selectedNode.status}</span>
              </div>
            </div>

            {/* Load progress bar */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-1">
                <span>COMPUTE WORKLOAD</span>
                <span>{selectedNode.load}%</span>
              </div>
              <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    selectedNode.status === 'critical' ? 'bg-rose-500' : 'bg-cyan-500'
                  }`} 
                  style={{ width: `${selectedNode.load}%` }}
                ></div>
              </div>
            </div>

            {/* Temperature bar */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-1">
                <span>CORE TEMPERATURE</span>
                <span>{selectedNode.temperature}°C</span>
              </div>
              <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-300" 
                  style={{ width: `${(selectedNode.temperature / 100) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Activity Stream */}
            <div className="p-3 bg-neutral-900 rounded border border-neutral-800/80">
              <span className="text-[10px] font-mono text-neutral-500 block uppercase mb-1">Live Synaptic Process</span>
              <p className="text-xs font-mono text-neutral-300 leading-relaxed min-h-12 break-words">
                {selectedNode.activity}
              </p>
            </div>

            {/* Details details */}
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="border border-neutral-900 p-2 rounded bg-neutral-900/30">
                <span className="text-[10px] text-neutral-500 block">UPTIME</span>
                <span className="text-white font-medium">{selectedNode.uptime}</span>
              </div>
              <div className="border border-neutral-900 p-2 rounded bg-neutral-900/30">
                <span className="text-[10px] text-neutral-500 block">PROTOCOL</span>
                <span className="text-white font-medium">Tether v1.0.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node commands */}
        <div className="mt-6 pt-4 border-t border-neutral-900 space-y-2">
          <button
            id="btn_ping_node"
            onClick={handlePingNode}
            disabled={isPinging || isRebooting || selectedNode.status === 'isolated'}
            className="w-full flex items-center justify-center space-x-2 text-xs font-mono font-medium py-2 px-4 rounded border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900 text-white transition disabled:opacity-50"
          >
            <Activity className={`h-4 w-4 text-cyan-400 ${isPinging ? 'animate-pulse' : ''}`} />
            <span>{isPinging ? 'Pinging Node Core...' : 'Send Diagnostic Ping'}</span>
          </button>
          
          <button
            id="btn_reboot_node"
            onClick={handleRebootNode}
            disabled={isRebooting || isPinging}
            className="w-full flex items-center justify-center space-x-2 text-xs font-mono font-medium py-2 px-4 rounded border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-950/50 hover:border-cyan-500/50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRebooting ? 'animate-spin' : ''}`} />
            <span>{isRebooting ? 'Rebooting Secure Core...' : 'Force Node Sovereign Reboot'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
