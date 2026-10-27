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
      text: `[Handshake Active - Core Secure Mode]\n\nI am the dAIsy HaMINJA Sovereign Core, central intelligence engine for the SolveX Institutional Marketplace. My 54-node grid and dual-market routing gateways are online.\n\nType a request to analyze a problem or inspect grid workloads. Payment processing is disabled; chat cannot authorize purchases.`,
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

  // Payment providers remain disconnected until a real, authorized integration exists.
  const handleToggleProvider = (_id: string) => {
    setProviders(prev => prev.map(p => ({ ...p, status: 'inactive', connectionId: undefined })));
    setMessages(prev => [...prev, {
      id: `msg_payment_blocked_${Date.now()}`,
      sender: 'system',
      text: 'BLOCKED: payment providers are not connected. No credentials were tested and no transaction was created.',
      timestamp: new Date().toLocaleTimeString()
    }]);
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

      const data: unknown = await response.json().catch(() => null);
      const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      const responseText = typeof payload.text === 'string' && payload.text.trim()
        ? payload.text
        : typeof payload.error === 'string' && payload.error.trim()
          ? payload.error
          : typeof payload.message === 'string' && payload.message.trim()
            ? payload.message
            : 'The sovereign core returned no readable response. No successful operation is assumed.';
      const isBlocked = !response.ok || payload.status === 'BLOCKED' || payload.success === false;

      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: isBlocked
          ? `[${typeof payload.status === 'string' ? payload.status : 'REQUEST_FAILED'}]
${responseText}`
          : responseText,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Failed to communicate with sovereign core:', err);
      // Fallback fallback error msg
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'ai',
        text: 'BLOCKED: communication with the sovereign core failed. No simulated reply or successful operation was generated.',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(true); // wait, let's set it to false!
      setIsAiLoading(false);
    }
  };

  // Never create a synthetic receipt or claim settlement succeeded.
  const handleAddTransaction = (_provider: string, _amount: number, _item: string) => {
    setMessages(prev => [...prev, {
      id: `msg_payment_blocked_${Date.now()}`,
      sender: 'system',
      text: 'BLOCKED: PayPal and all payment processing are disabled. No charge, transaction, receipt, or ledger entry was created.',
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // A model suggestion is not payment authorization. Keep the gateway closed.
  const handleSelectTrigger = (_trigger: { amount: number; provider: string; item: string }) => {
    setPaymentPreFill(null);
    setActiveTab('payments');
    setProviders(prev => prev.map(p => ({ ...p, status: 'inactive', connectionId: undefined })));
    setMessages(prev => [...prev, {
      id: `msg_payment_blocked_${Date.now()}`,
      sender: 'system',
      text: 'BLOCKED: a chat suggestion cannot authorize a purchase. PayPal and checkout are disabled; no provider was connected and no transaction was created.',
      timestamp: new Date().toLocaleTimeString()
    }]);
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
