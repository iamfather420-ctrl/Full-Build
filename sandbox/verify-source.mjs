import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

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
const receipt = {
  accepted,
  input_sha256: inputSha,
  exit_code: run.status,
  timed_out: run.error?.code === 'ETIMEDOUT',
  stderr_sha256: createHash('sha256').update(run.stderr ?? '').digest('hex')
};
process.stdout.write(JSON.stringify(receipt));
