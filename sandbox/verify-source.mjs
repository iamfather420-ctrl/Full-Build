import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

let source = '';
for await (const chunk of process.stdin) {
  source += chunk.toString('utf8');
  if (Buffer.byteLength(source) > 100_000) {
    process.stdout.write(JSON.stringify({ accepted: false, reason: 'source exceeds 100 KB' }));
    process.exit(0);
  }
}

// Bind the receipt to the exact submitted bytes, not to transpiled output.
const inputSha = createHash('sha256').update(source).digest('hex');
const limits = {
  encoding: 'utf8',
  timeout: 15_000,
  maxBuffer: 128 * 1024,
  env: { PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin', NODE_OPTIONS: '--max-old-space-size=128' },
  cwd: '/tmp'
};

// Transpile TypeScript to JavaScript inside the isolated, digest-pinned image.
// The original source hash above remains the value carried by the sandbox receipt.
const transpile = spawnSync('esbuild', ['--loader=ts', '--format=esm', '--target=node22', '--log-level=error'], {
  ...limits,
  input: source
});
let run = null;
if (!transpile.error && transpile.status === 0) {
  run = spawnSync(process.execPath, ['--input-type=module'], {
    ...limits,
    input: transpile.stdout ?? ''
  });
}
const accepted = Boolean(run && run.status === 0 && !run.error);
const readMetric = async path => { try { const value = (await readFile(path, 'utf8')).trim(); return value === 'max' ? null : Number(value); } catch { return null; } };
const [memoryCurrent, memoryPeak, memoryLimit, memoryEvents] = await Promise.all([
  readMetric('/sys/fs/cgroup/memory.current'), readMetric('/sys/fs/cgroup/memory.peak'),
  readMetric('/sys/fs/cgroup/memory.max'), readFile('/sys/fs/cgroup/memory.events', 'utf8').catch(() => '')
]);
const eventCounts = new Map(memoryEvents.split('\n').filter(Boolean).map(line => {
  const [name, count] = line.trim().split(/\s+/);
  return [name, Number(count)];
}));
const oom = eventCounts.get('oom');
const oomKill = eventCounts.get('oom_kill');
const oomEvents = oom === undefined || oomKill === undefined ? null : oom + oomKill;
const stderr = (transpile.stderr ?? '') + (run?.stderr ?? '') + (transpile.error?.message ?? '') + (run?.error?.message ?? '');
const receipt = {
  accepted,
  input_sha256: inputSha,
  exit_code: run ? run.status : (transpile.status ?? null),
  timed_out: transpile.error?.code === 'ETIMEDOUT' || run?.error?.code === 'ETIMEDOUT',
  stderr_sha256: createHash('sha256').update(stderr).digest('hex'),
  cgroup_memory_current_bytes: memoryCurrent,
  cgroup_memory_peak_bytes: memoryPeak,
  cgroup_memory_limit_bytes: memoryLimit,
  cgroup_oom_events: oomEvents
};
process.stdout.write(JSON.stringify(receipt));
