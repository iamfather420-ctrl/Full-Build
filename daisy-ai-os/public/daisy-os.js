const $ = (id) => document.getElementById(id);
const state = { messages: [], ready: false, busy: false };
const form = $('chat-form');
const prompt = $('prompt');
const send = $('send');
const messages = $('messages');
const notice = $('notice');

function appendMessage(role, text) {
  $('empty-state')?.remove();
  const item = document.createElement('div');
  item.className = `message ${role}`;
  item.textContent = text;
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}

function setBusy(busy) {
  state.busy = busy;
  send.disabled = busy || !state.ready;
  send.querySelector('span:first-child').textContent = busy ? 'Thinking…' : 'Send';
}

function showBlocked(message) {
  notice.textContent = message;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  return `${(bytes / 1_000_000_000).toFixed(2)} GB (${Number(bytes).toLocaleString()} bytes)`;
}

function renderRegistry(registry) {
  const model = registry?.models?.find((entry) => entry.selected);
  if (!model) {
    $('registry-state').textContent = 'NOT REGISTERED';
    $('registry-state').className = 'chip blocked';
    $('registry-model').textContent = registry?.reason || 'No registered model is selected.';
    return;
  }

  $('registry-state').textContent = registry.ready ? 'CONFIGURED' : 'BLOCKED';
  $('registry-state').className = `chip ${registry.ready ? 'ready' : 'blocked'}`;
  $('registry-model').textContent = `${model.displayName} · ${model.version}`;
  $('registry-format').textContent = `${model.format} · ${model.quantization}`;
  $('registry-license').textContent = model.license;
  $('registry-size').textContent = formatBytes(model.expectedSizeBytes);
  $('registry-integrity').textContent = model.weights.status === 'verified'
    ? `SHA-256 verified${model.weights.actualSizeBytes === model.expectedSizeBytes ? ' · exact size' : ''}`
    : ({
      not_installed: 'Not installed',
      not_a_file: 'Configured path is not a file',
      size_mismatch: 'Size mismatch',
      sha256_mismatch: 'SHA-256 mismatch',
      not_selected: 'Not selected',
    }[model.weights.status] || model.weights.status);
  $('registry-engine').textContent = ({
    executable: 'llama.cpp · llama-cli executable found',
    not_configured: 'Not configured',
    not_executable: 'Missing or not executable',
    wrong_executable: 'Wrong executable; expected llama-cli',
    not_selected: 'Not selected',
  }[model.engine.status] || model.engine.status);
  $('registry-sha').textContent = model.expectedSha256;
  $('registry-card').href = model.modelCardUrl;
  $('registry-download').href = model.downloadUrl;
}

async function refreshHealth() {
  $('state-label').textContent = 'Checking local runtime…';
  $('state-dot').className = 'dot';
  try {
    const response = await fetch('/api/health', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Local runtime is unavailable.');
    renderRegistry(data.modelRegistry);
    const inference = data.inference || {};
    state.ready = inference.ready === true;
    $('state-label').textContent = state.ready ? 'Local model configured' : 'Local model unavailable';
    $('state-dot').className = `dot ${state.ready ? 'ready' : 'blocked'}`;
    $('claim-chip').textContent = data.claimScope || 'BLOCKED';
    $('claim-chip').className = `chip ${data.claimScope === 'BLOCKED' ? 'blocked' : 'ready'}`;
    $('activation').textContent = data.runtime?.activation || 'UNKNOWN';
    $('claim-scope').textContent = data.claimScope || 'UNKNOWN';
    $('inference-state').textContent = state.ready ? 'LOCAL ENGINE CONFIGURED' : 'BLOCKED · REGISTERED MODEL REQUIRED';
    $('model-id').textContent = inference.modelId || 'Not configured';
    $('runtime-note').textContent = inference.notes || 'No runtime details returned.';
    $('updated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
    send.disabled = !state.ready || state.busy;
    prompt.disabled = !state.ready || state.busy;
    if (!state.ready) {
      showBlocked(`Chat is blocked: ${data.modelRegistry?.reason || 'the registered model and local engine are not ready.'} No external AI provider will be used.`);
    } else if (notice.textContent.startsWith('Chat is blocked')) {
      notice.textContent = '';
    }
  } catch (error) {
    state.ready = false;
    send.disabled = true;
    prompt.disabled = true;
    $('state-label').textContent = 'Local server unavailable';
    $('state-dot').className = 'dot blocked';
    $('claim-chip').textContent = 'OFFLINE';
    $('claim-chip').className = 'chip blocked';
    $('inference-state').textContent = 'Unavailable';
    $('runtime-note').textContent = error instanceof Error ? error.message : 'Unable to reach the local server.';
    $('updated').textContent = 'Not connected';
    showBlocked('This page needs the Daisy local server at 127.0.0.1. No remote inference service is contacted.');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = prompt.value.trim();
  if (!text || !state.ready || state.busy) return;
  const next = [...state.messages, { role: 'user', content: text }].slice(-12);
  appendMessage('user', text);
  state.messages = next;
  prompt.value = '';
  notice.textContent = '';
  setBusy(true);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messages: state.messages }),
      cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      showBlocked(`Local inference blocked (${data.code || response.status}): ${data.error || 'No reply was generated.'}`);
      return;
    }
    const answer = String(data.text || '').trim();
    if (!answer) {
      showBlocked('The local inference engine returned no text. No response was substituted.');
      return;
    }
    appendMessage('assistant', answer);
    state.messages = [...state.messages, { role: 'assistant', content: answer }].slice(-12);
  } catch (error) {
    showBlocked(`Local inference request failed: ${error instanceof Error ? error.message : 'unknown error'}. No external fallback was attempted.`);
  } finally {
    setBusy(false);
    prompt.focus();
  }
});

$('refresh').addEventListener('click', () => void refreshHealth());
void refreshHealth();
