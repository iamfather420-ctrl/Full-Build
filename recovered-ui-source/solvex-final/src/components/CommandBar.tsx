import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Terminal, Send, ArrowRight, Shield, Zap, Sparkles } from 'lucide-react';

interface CommandBarProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onSelectTrigger: (trigger: { amount: number; provider: string; item: string }) => void;
}

const SUGGESTED_COMMANDS = [
  "Analyze Paradox 58: Anti-Tamper Fracture",
  "Buy Autonomous Business Template for $99",
  "Route a unified Stripe payment of $150",
  "Perform diagnostic ping on the 54-node grid"
];

export default function CommandBar({ messages, onSendMessage, isLoading, onSelectTrigger }: CommandBarProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleCommandClick = (cmd: string) => {
    if (isLoading) return;
    onSendMessage(cmd);
  };

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col h-[520px]" id="command_bar_module">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Terminal className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="font-display font-medium text-white">Autonomous Agent Core</h2>
            <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase">dAIsy HaMINJA Synaptic Handshake</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="text-[10px] font-mono text-neutral-500">Tether Locked</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 no-scrollbar">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai' || msg.sender === 'system';
          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
            >
              <div className="text-[9px] font-mono text-neutral-500 mb-1 px-1">
                {isAi ? 'SOVEREIGN_CORE_NODE' : 'USER_TERMINAL'} @ {msg.timestamp}
              </div>
              <div 
                className={`
                  text-xs font-mono p-3 rounded-lg max-w-[85%] leading-relaxed border whitespace-pre-wrap
                  ${isAi 
                    ? 'bg-neutral-900/50 border-neutral-800 text-neutral-200' 
                    : 'bg-cyan-950/20 border-cyan-800/60 text-cyan-400'}
                `}
              >
                {msg.text}

                {/* If there's an embedded trigger data */}
                {msg.metadata?.paymentAuthorized && msg.metadata.paymentDetails && (
                  <div className="mt-4 border border-cyan-500/30 bg-cyan-950/30 p-3 rounded-lg flex flex-col space-y-2">
                    <div className="flex items-center space-x-2 text-cyan-400 text-[10px] font-bold">
                      <Zap className="h-3.5 w-3.5 animate-bounce" />
                      <span>AUTONOMOUS PAYMENT TRIGGER IDENTIFIED</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 space-y-0.5">
                      <p>Item: <span className="text-white">{msg.metadata.paymentDetails.item}</span></p>
                      <p>Clearing Engine: <span className="text-white uppercase">{msg.metadata.paymentDetails.provider}</span></p>
                      <p>Amount: <span className="text-emerald-400 font-bold">${msg.metadata.paymentDetails.amount} USD</span></p>
                    </div>
                    <button
                      id="btn_bind_trigger"
                      onClick={() => onSelectTrigger({
                        amount: msg.metadata!.paymentDetails!.amount,
                        provider: msg.metadata!.paymentDetails!.provider,
                        item: msg.metadata!.paymentDetails!.item
                      })}
                      className="w-full text-center bg-cyan-400 hover:bg-cyan-300 text-black py-1.5 rounded text-[10px] font-bold tracking-wider uppercase transition mt-1"
                    >
                      Bind Checkout Gateway Ingress
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-mono text-neutral-500 mb-1 px-1">SOVEREIGN_CORE_NODE</span>
            <div className="text-xs font-mono p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 text-neutral-500 flex items-center space-x-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              <span>Processing Synaptic Inferences...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested commands */}
      <div className="mb-3 space-y-1.5">
        <span className="text-[9px] font-mono text-neutral-600 block uppercase">Quick Handshakes</span>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_COMMANDS.map((cmd, i) => (
            <button
              key={i}
              id={`cmd_btn_${i}`}
              onClick={() => handleCommandClick(cmd)}
              disabled={isLoading}
              className="text-[10px] font-mono border border-neutral-900 bg-neutral-950 px-2 py-1 rounded text-neutral-400 hover:text-white hover:border-neutral-700 transition duration-150 text-left truncate max-w-full"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt input Form */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          id="input_command_bar"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          placeholder="Command dAIsy Sovereign Core..."
          className="flex-1 bg-neutral-900 border border-neutral-800 text-xs font-mono p-2.5 rounded text-white focus:outline-none focus:border-cyan-500"
        />
        <button
          id="btn_send_command"
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="bg-neutral-800 border border-neutral-700 text-white p-2.5 rounded hover:bg-neutral-700 transition disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
