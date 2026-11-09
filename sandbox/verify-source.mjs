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
const inputSha = createHash('sha256').update(source).digest('hex');
const run = spawnSync(process.execPath, ['--input-type=module'], {
  input: source,
  encoding: 'utf8',
  timeout: 15_000,
  maxBuffer: 128 * 1024,
  env: { PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin', NODE_OPTIONS: '--max-old-space-size=128' },
  cwd: '/tmp'
});
const accepted = run.status === 0 && !run.error;
const readMetric = async path => { try { const value = (await readFile(path, 'utf8')).trim(); return value === 'max' ? null : Number(value); } catch { return null; } };
const [memoryCurrent, memoryPeak, memoryLimit, memoryEvents] = await Promise.all([
  readMetric('/sys/fs/cgroup/memory.current'), readMetric('/sys/fs/cgroup/memory.peak'),
  readMetric('/sys/fs/cgroup/memory.max'), readFile('/sys/fs/cgroup/memory.events', 'utf8').catch(() => '')
]);
const oomLine = memoryEvents.split('\\n').find(line => line.startsWith('oom '));
const receipt = {
  accepted,
  input_sha256: inputSha,
  exit_code: run.status,
  timed_out: run.error?.code === 'ETIMEDOUT',
  stderr_sha256: createHash('sha256').update(run.stderr ?? '').digest('hex'),
  cgroup_memory_current_bytes: memoryCurrent,
  cgroup_memory_peak_bytes: memoryPeak,
  cgroup_memory_limit_bytes: memoryLimit,
  cgroup_oom_events: oomLine ? Number(oomLine.split(/\\s+/)[1]) : null
};
process.stdout.write(JSON.stringify(receipt));
