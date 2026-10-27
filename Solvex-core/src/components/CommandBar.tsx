/** Recovered from archive; payment-buy suggestions removed. */
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Terminal, Send } from 'lucide-react';

interface CommandBarProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onSelectTrigger?: (trigger: { amount: number; provider: string; item: string }) => void;
}

const SUGGESTED_COMMANDS = [
  'Analyze Paradox 58: Anti-Tamper Fracture',
  'Report payment gateway status',
  'Perform diagnostic ping on the 54-node grid',
  'Summarize formal verification blockers',
];

export default function CommandBar({ messages, onSendMessage, isLoading }: CommandBarProps) {
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

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col h-[520px]" id="command_bar_module">
      <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Terminal className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="font-display font-medium text-white">Autonomous Agent Core</h2>
            <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase">dAIsy HaMINJA</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-neutral-500">Chat fails closed without model</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 no-scrollbar">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai' || msg.sender === 'system';
          return (
            <div key={msg.id} className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
              <span className="text-[9px] font-mono text-neutral-500 mb-1 px-1">{isAi ? 'SOVEREIGN_CORE' : 'OPERATOR'}</span>
              <div className={`text-xs font-mono p-3 rounded-lg max-w-[90%] whitespace-pre-wrap ${
                isAi ? 'bg-neutral-900/50 border border-neutral-800 text-neutral-200' : 'bg-cyan-950/30 border border-cyan-900 text-cyan-100'
              }`}>{msg.text}</div>
            </div>
          );
        })}
        {isLoading && (
          <div className="text-xs font-mono text-neutral-500">Awaiting model response…</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {SUGGESTED_COMMANDS.map((cmd, i) => (
          <button
            key={i}
            type="button"
            disabled={isLoading}
            onClick={() => onSendMessage(cmd)}
            className="text-[10px] font-mono border border-neutral-900 bg-neutral-950 px-2 py-1 rounded text-neutral-400 hover:text-white"
          >{cmd}</button>
        ))}
      </div>

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
        <button id="btn_send_command" type="submit" disabled={isLoading || !inputText.trim()} className="bg-neutral-800 border border-neutral-700 text-white p-2.5 rounded disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
