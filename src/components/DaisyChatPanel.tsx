import React, { useEffect, useState } from 'react';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type DaisyStatus = {
  status?: string;
  inference?: {
    chatEnabled?: boolean;
    state?: string;
    runtimeId?: string;
    modelId?: string | null;
    modelVersion?: string | null;
  };
};

export const DaisyChatPanel: React.FC = () => {
  const [status, setStatus] = useState<DaisyStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/daisy/status', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || body.code || 'Daisy status is unavailable.');
        return body as DaisyStatus;
      })
      .then((body) => {
        setStatus(body);
        setStatusError('');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatusError(error instanceof Error ? error.message : 'Daisy status is unavailable.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setStatusLoading(false);
      });
    return () => controller.abort();
  }, []);

  const chatEnabled = status?.inference?.chatEnabled === true;
  const statusLabel = statusLoading
    ? 'Checking local runtime…'
    : statusError
      ? 'Status unavailable'
      : chatEnabled
        ? 'Configured · generation not yet verified'
        : 'Blocked · model or engine unavailable';

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || !chatEnabled || sending) return;

    setSending(true);
    setRequestError('');
    setPrompt('');
    try {
      const response = await fetch('/api/daisy/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ prompt: text, history: messages.slice(-20) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success !== true || typeof body.text !== 'string' || !body.text.trim()) {
        throw new Error(body.message || body.code || 'First-party Daisy inference did not return a verified completion.');
      }
      setMessages((previous) => [
        ...previous,
        { role: 'user', content: text },
        { role: 'assistant', content: body.text.trim() },
      ].slice(-20));
    } catch (error: unknown) {
      setPrompt(text);
      setRequestError(error instanceof Error ? error.message : 'First-party Daisy inference failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-900/60 bg-slate-900/80 p-5 md:p-6 space-y-4" aria-label="Daisy first-party chat">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Daisy Haminja · First-party inference</h3>
          <p className="mt-1 text-xs text-slate-400">Authenticated chat through Full-Build’s local inference runtime. No simulated or external-provider replies.</p>
        </div>
        <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-[11px] font-mono ${chatEnabled ? 'border-amber-800 bg-amber-950/30 text-amber-200' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
          {statusLabel}
        </span>
      </div>

      {status?.inference && (
        <div className="text-[11px] text-slate-500 font-mono">
          {status.inference.modelId || 'Model not identified'}
          {status.inference.modelVersion ? ` · ${status.inference.modelVersion}` : ''}
          {status.inference.state ? ` · ${status.inference.state}` : ''}
        </div>
      )}

      {statusError && <p className="text-sm text-amber-200" role="status">{statusError}</p>}

      <div className="min-h-24 max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">No conversation yet. A real response will appear here only after the local model returns non-empty output.</p>
        )}
        {messages.map((message, index) => (
          <div key={`${index}-${message.role}`} className={message.role === 'user' ? 'text-right' : 'text-left'}>
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">{message.role === 'user' ? 'You' : 'Daisy · local model'}</span>
            <p className={`inline-block max-w-full whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-cyan-950/70 text-cyan-100' : 'bg-slate-800 text-slate-100'}`}>{message.content}</p>
          </div>
        ))}
        {sending && <p className="text-xs text-cyan-300" role="status">Waiting for local inference…</p>}
      </div>

      {requestError && <p className="text-sm text-amber-200" role="alert">{requestError}</p>}

      <form onSubmit={sendMessage} className="flex flex-col sm:flex-row gap-2">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={2}
          maxLength={8000}
          disabled={!chatEnabled || sending}
          placeholder={chatEnabled ? 'Send a prompt to Daisy…' : 'Chat is unavailable until the first-party model and engine are configured.'}
          className="min-h-12 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!chatEnabled || sending || !prompt.trim()}
          className="rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {sending ? 'Generating…' : 'Send'}
        </button>
      </form>
      <p className="text-[10px] text-slate-500">The status probe checks configuration only. The first successful chat response is the evidence of actual generation.</p>
    </section>
  );
};
