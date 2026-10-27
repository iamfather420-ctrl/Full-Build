/**
 * CommandBar — chat console surface for the native UI.
 * Sends prompts to /api/chat; does not invent replies when the server returns BLOCKED.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Loader2 } from 'lucide-react';
import type { ChatMessage } from '../types';

interface CommandBarProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onSelectTrigger: (trigger: { amount: number; provider: string; item: string }) => void;
}

export default function CommandBar({
  messages,
  onSendMessage,
  isLoading,
}: CommandBarProps) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isLoading) return;
    setDraft('');
    onSendMessage(text);
  };

  return (
    <div
      className="border border-neutral-800 bg-neutral-950 rounded-lg flex flex-col h-[min(70vh,640px)] glow-border"
      id="command_bar_module"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-900">
        <Terminal className="h-4 w-4 text-cyan-400" />
        <h2 className="font-display font-medium text-sm text-white">Sovereign Command Console</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 font-mono text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.sender === 'user'
                ? 'text-neutral-200'
                : m.sender === 'system'
                  ? 'text-neutral-500'
                  : 'text-cyan-100/90'
            }
          >
            <span className="text-[10px] uppercase text-neutral-600 mr-2">
              [{m.sender}] {m.timestamp}
            </span>
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed mt-0.5">
              {m.text}
            </pre>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-neutral-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Waiting on sovereign core…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="border-t border-neutral-900 p-3 flex gap-2">
        <input
          id="command_input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Request analysis or inspect grid state…"
          disabled={isLoading}
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-800"
          autoComplete="off"
        />
        <button
          type="submit"
          id="btn_send_command"
          disabled={isLoading || !draft.trim()}
          className="px-3 py-2 rounded border border-cyan-900/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-950/50 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
