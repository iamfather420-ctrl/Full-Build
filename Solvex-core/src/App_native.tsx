import React, { useState } from 'react';
import { getInitialNodes, INITIAL_PROVIDERS } from './data';
import { ChatMessage, GridNode, PaymentProvider } from './types';
import NodeGrid from './components/NodeGrid';
import PaymentGateway from './components/PaymentGateway';
import ParadoxLedger from './components/ParadoxLedger';
import JitFactory from './components/JitFactory';
import CommandBar from './components/CommandBar';
import GithubUnifier from './components/GithubUnifier';
import { 
  Shield, 
  Cpu, 
  Coins, 
  Activity, 
  Database, 
  Zap, 
  CloudLightning,
  Layers,
  Sparkles,
  Lock,
  GitMerge
} from 'lucide-react';

export default function App() {
  // Application registries states
  const [nodes, setNodes] = useState<GridNode[]>(getInitialNodes());
  const [providers, setProviders] = useState<PaymentProvider[]>(INITIAL_PROVIDERS);
  
  // Persistent messages for the AI Agent
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_handshake',
      sender: 'system',
      text: `[Handshake Active - Core Secure Mode]\n\nI am the dAIsy HaMINJA Sovereign Core, central intelligence engine for the SolveX Institutional Marketplace. My 54-node grid and dual-market routing gateways are online.\n\nType a request to examine a paradoxical failure (e.g. Paradox 58), analyze grid workloads, or ask to purchase an autonomous business template checkout.`,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Active tab selection
  const [activeTab, setActiveTab] = useState<'grid' | 'payments' | 'paradoxes' | 'jit' | 'unifier'>('grid');

  // Interactive checkout link states (when pre-filled from chat)
  const [paymentPreFill, setPaymentPreFill] = useState<{
    amount: number;
    provider: string;
    item: string;
  } | null>(null);

  // Update a single node state
  const handleUpdateNode = (updatedNode: GridNode) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
  };

  // Toggle provider connection state
  const handleToggleProvider = (id: string) => {
    setProviders(prev => prev.map(p => {
      if (p.id === id) {
        const isCurrentlyActive = p.status === 'active' || p.status === 'configured';
        return {
          ...p,
          status: isCurrentlyActive ? 'inactive' : 'active',
          connectionId: isCurrentlyActive ? undefined : `conn_${id}_0x${Math.random().toString(16).substring(2, 6)}`
        };
      }
      return p;
    }));
  };

  // Chat message submission handler
  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          messageHistory: messages.filter(m => m.sender !== 'system') // Skip system welcome in chat hist
        })
      });

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: data.text,
        timestamp: new Date().toLocaleTimeString(),
        metadata: data.trigger ? {
          paymentAuthorized: true,
          paymentDetails: {
            amount: data.trigger.amount,
            provider: data.trigger.provider,
            checkoutUrl: `https://checkout.solvex.marketplace/pay?provider=${data.trigger.provider}&amount=${data.trigger.amount}`,
            item: data.trigger.item || 'Autonomous Template Package'
          }
        } : undefined
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Failed to communicate with sovereign core:', err);
      // Fallback fallback error msg
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'ai',
        text: `⚠️ Communication link fracture identified. Resetting network transceiver ports...`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(true); // wait, let's set it to false!
      setIsAiLoading(false);
    }
  };

  // Add simulated success payment transaction to ledger
  const handleAddTransaction = (provider: string, amount: number, item: string) => {
    const successMsg: ChatMessage = {
      id: `msg_success_${Date.now()}`,
      sender: 'system',
      text: `✅ [UNIFIED CLEARING SETTLEMENT RECEIVED]\n\nSovereign settlement of $${amount.toFixed(2)} USD completed successfully via ${provider.toUpperCase()}.\n\nItem Authorized: "${item}"\nClearing Ledger Hash: sha256:${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, successMsg]);

    // Update nodes load due to compilation activity
    setNodes(prev => prev.map(n => n.id % 4 === 0 ? {
      ...n,
      load: Math.min(n.load + 15, 100),
      activity: `Processing clearing ledger transaction validation.`
    } : n));
  };

  // Bind a recommended payment trigger from chat directly into sandbox
  const handleSelectTrigger = (trigger: { amount: number; provider: string; item: string }) => {
    setPaymentPreFill(trigger);
    
    // Switch to payments tab
    setActiveTab('payments');

    // Auto connect provider if inactive
    setProviders(prev => prev.map(p => {
      if (p.id === trigger.provider && p.status === 'inactive') {
        return {
          ...p,
          status: 'active',
          connectionId: `conn_${trigger.provider}_0x${Math.random().toString(16).substring(2, 6)}`
        };
      }
      return p;
    }));

    // Post system message
    const alertMsg: ChatMessage = {
      id: `msg_alert_${Date.now()}`,
      sender: 'system',
      text: `🔄 Handshake parameters bound to Unified API checkout generator. Check transaction sandbox below to initialize checkout.`,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, alertMsg]);
  };

  return (
    <div className="bg-black text-neutral-100 bg-grid-pattern min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200" id="sovereign_control_hub">
      {/* Upper Navigation / Status Banner */}
      <header className="border-b border-neutral-900 bg-black/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-neutral-900/80 rounded border border-neutral-800 glow-border">
            <Lock className="h-6 w-6 text-cyan-400 animate-pulse-cyan" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-display font-medium text-xl text-white tracking-tight">SolveX Sovereign Core</h1>
              <span className="text-[9px] font-mono font-bold bg-cyan-950/40 text-cyan-400 border border-cyan-900 px-2 py-0.5 rounded uppercase">
                v1.0.0 Stable
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-sans mt-0.5">
              dAIsy HaMINJA Unified Autonomous Infrastructure & Multi-Market Gateway
            </p>
          </div>
        </div>

        {/* Global state telemetry indicators */}
        <div className="flex items-center space-x-4 text-xs font-mono py-2 px-4 bg-neutral-950 rounded border border-neutral-900/60 shadow-inner">
          <div className="flex items-center space-x-1.5">
            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span className="text-neutral-400">Nodes:</span>
            <span className="text-white font-bold">54/54</span>
          </div>
          <div className="w-px h-4 bg-neutral-800"></div>
          <div className="flex items-center space-x-1.5">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span className="text-neutral-400">Paradoxes:</span>
            <span className="text-cyan-400 font-bold">58 Locked</span>
          </div>
          <div className="w-px h-4 bg-neutral-800"></div>
          <div className="flex items-center space-x-1.5">
            <CloudLightning className="h-4 w-4 text-amber-400" />
            <span className="text-neutral-400">Hosting:</span>
            <span className="text-white font-bold uppercase">Cloud Run</span>
          </div>
        </div>
      </header>

      {/* Main Core Dashboard Layout */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (Dual Monitors Control Deck) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Deck Selector Tabs */}
          <div className="border border-neutral-900 bg-neutral-950/60 p-1.5 rounded-lg flex space-x-1 overflow-x-auto no-scrollbar" id="monitors_navigation">
            <button
              id="tab_grid"
              onClick={() => setActiveTab('grid')}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded text-xs font-mono font-medium transition duration-150 whitespace-nowrap
                ${activeTab === 'grid' ? 'bg-neutral-900 text-white border border-neutral-800 shadow' : 'text-neutral-500 hover:text-neutral-300'}
              `}
            >
              <Cpu className="h-4 w-4" />
              <span>54-Node Grid Matrix</span>
            </button>

            <button
              id="tab_payments"
              onClick={() => setActiveTab('payments')}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded text-xs font-mono font-medium transition duration-150 whitespace-nowrap
                ${activeTab === 'payments' ? 'bg-neutral-900 text-white border border-neutral-800 shadow' : 'text-neutral-500 hover:text-neutral-300'}
              `}
            >
              <Coins className="h-4 w-4" />
              <span>Unified Payment Gateway</span>
            </button>

            <button
              id="tab_paradoxes"
              onClick={() => setActiveTab('paradoxes')}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded text-xs font-mono font-medium transition duration-150 whitespace-nowrap
                ${activeTab === 'paradoxes' ? 'bg-neutral-900 text-white border border-neutral-800 shadow' : 'text-neutral-500 hover:text-neutral-300'}
              `}
            >
              <Database className="h-4 w-4" />
              <span>88 Paradox Ledger</span>
            </button>

            <button
              id="tab_jit"
              onClick={() => setActiveTab('jit')}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded text-xs font-mono font-medium transition duration-150 whitespace-nowrap
                ${activeTab === 'jit' ? 'bg-neutral-900 text-white border border-neutral-800 shadow' : 'text-neutral-500 hover:text-neutral-300'}
              `}
            >
              <Layers className="h-4 w-4" />
              <span>JIT Build Factory</span>
            </button>

            <button
              id="tab_unifier"
              onClick={() => setActiveTab('unifier')}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded text-xs font-mono font-medium transition duration-150 whitespace-nowrap
                ${activeTab === 'unifier' ? 'bg-neutral-900 text-white border border-neutral-800 shadow' : 'text-neutral-500 hover:text-neutral-300'}
              `}
            >
              <GitMerge className="h-4 w-4 text-cyan-400" />
              <span>GitHub Unifier</span>
            </button>
          </div>

          {/* Active View Deck */}
          <div className="transition-all duration-300" id="active_viewport">
            {activeTab === 'grid' && (
              <NodeGrid nodes={nodes} onUpdateNode={handleUpdateNode} />
            )}
            
            {activeTab === 'payments' && (
              <PaymentGateway 
                providers={providers} 
                onToggleProvider={handleToggleProvider}
                onAddTransaction={handleAddTransaction}
              />
            )}

            {activeTab === 'paradoxes' && (
              <ParadoxLedger />
            )}

            {activeTab === 'jit' && (
              <JitFactory />
            )}

            {activeTab === 'unifier' && (
              <GithubUnifier 
                onNotifySystem={(notificationText) => {
                  setMessages(prev => [...prev, {
                    id: `msg_unify_${Date.now()}`,
                    sender: 'system',
                    text: notificationText,
                    timestamp: new Date().toLocaleTimeString()
                  }]);
                }}
              />
            )}
          </div>
        </div>

        {/* Right Column (Persistent Chat/Command Console Bar) */}
        <div className="xl:col-span-1">
          <CommandBar
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isAiLoading}
            onSelectTrigger={handleSelectTrigger}
          />
        </div>
      </main>

      {/* Aesthetic Footer */}
      <footer className="border-t border-neutral-950 bg-black/90 py-6 px-6 mt-12 text-center text-[10px] font-mono text-neutral-600">
        <p>dAIsy HaMINJA SOVEREIGN GRID ARCHITECTURE • SECURED WITH 58 PARADOX OPERATORS</p>
        <p className="mt-1">ISO_42001 & SOC2-TYPE-II COMPLIANT • ZERO KNOWLEDGE RAG ENCRYPTED</p>
      </footer>
    </div>
  );
}
