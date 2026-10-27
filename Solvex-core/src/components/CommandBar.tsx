/**
 * Recovered CommandBar layout with server-authoritative chat and no payment triggers.
 * Chat responses are proposals/information only; they cannot authorize actions.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Loader2, Shield, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../types';

interface CommandBarProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onSelectTrigger: (trigger: { amount: number; provider: string; item: string }) => void;
}

const SUGGESTED_COMMANDS = [
  'Inspect the current system gate status',
  'Explain which operations are blocked and why',
  'Summarize the latest verification evidence',
];

export default function CommandBar({ messages, onSendMessage, isLoading }: CommandBarProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputText.trim();
    if (!value || isLoading) return;
    onSendMessage(value);
    setInputText('');
  };

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col h-[520px]" id="command_bar_module">
      <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="font-display font-medium text-white">Daisy Command Console</h2>
            <span className="text-[10px] font-mono text-neutral-400 tracking-wider uppercase">Human-directed · server-gated</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-amber-300 border border-amber-900/60 bg-amber-950/30 px-2 py-1 rounded flex items-center gap-1"><Shield className="h-3 w-3" /> NO AUTHORITY</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTED_COMMANDS.map((command) => (
          <button key={command} type="button" disabled={isLoading} onClick={() => onSendMessage(command)}
            className="text-[10px] font-mono border border-neutral-800 rounded px-2 py-1.5 text-neutral-400 hover:text-cyan-200 hover:border-cyan-900 disabled:opacity-40">
            <Sparkles className="inline h-3 w-3 mr-1" />{command}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 no-scrollbar">
        {messages.map((message) => {
          const isUser = message.sender === 'user';
          return (
            <div key={message.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className="text-[9px] font-mono text-neutral-500 mb-1 px-1">{isUser ? 'USER_TERMINAL' : message.sender === 'system' ? 'SYSTEM_STATUS' : 'DAISY_RESPONSE'} · {message.timestamp}</div>
              <div className={`text-xs font-mono p-3 rounded-lg max-w-[95%] leading-relaxed border whitespace-pre-wrap break-words ${isUser ? 'bg-cyan-950/20 border-cyan-800/60 text-cyan-100' : 'bg-neutral-900/50 border-neutral-800 text-neutral-200'}`}>
                {message.text}
              </div>
            </div>
          );
        })}
        {isLoading && <div className="flex items-center gap-2 text-neutral-500 text-xs font-mono"><Loader2 className="h-3.5 w-3.5 animate-spin" />Waiting for the server response; no outcome is assumed.</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={submit} className="border-t border-neutral-900 pt-3 flex gap-2">
        <input id="command_input" type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask Daisy to analyze or explain…" disabled={isLoading}
          className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-800" autoComplete="off" />
        <button type="submit" id="btn_send_command" disabled={isLoading || !inputText.trim()}
          className="px-3 py-2 rounded border border-cyan-900/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-950/50 disabled:opacity-40" aria-label="Send command">
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="text-[9px] font-mono text-neutral-600 mt-3">Responses do not grant authorization, trigger payments, or prove execution.</p>
    </div>
  );
}
