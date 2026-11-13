import { computeSha256 } from '../src/database/DatabaseSchema';
import { IsolatedExecutionSandbox } from '../src/security/IsolatedExecutionSandbox';

const image = process.env.SOLVEX_SANDBOX_IMAGE ?? '';
if (!/@sha256:[a-f0-9]{64}$/i.test(image)) throw new Error('SOLVEX_SANDBOX_IMAGE must be an immutable sha256 digest reference.');
const source = 'export const solvexStage6Probe = true;\n';
const sourceSha256 = computeSha256(source);
const memoryLimitBytes = 256 * 1024 * 1024;
const result = await IsolatedExecutionSandbox.execute(image, ['/opt/solvex-sandbox/verify-source'], source, {
  timeoutMs: 30_000, memoryBytes: memoryLimitBytes, cpuCount: 1, pidsLimit: 64
});
if (!result.passed) {
  console.error(JSON.stringify({ stage: 6, status: 'FAILED', reason: result.error ?? 'Sandbox execution failed',
    exit_code: result.exitCode, timed_out: result.timedOut, oom_killed: result.oomKilled }, null, 2));
  process.exitCode = 1;
} else {
  let receipt: {
    accepted?: boolean; input_sha256?: string; exit_code?: number | null; timed_out?: boolean;
    cgroup_memory_current_bytes?: number | null; cgroup_memory_peak_bytes?: number | null;
    cgroup_memory_limit_bytes?: number | null; cgroup_oom_events?: number | null;
  };
  try { receipt = JSON.parse(result.output.trim()); } catch { throw new Error('Sandbox did not return a valid JSON receipt.'); }
  const telemetryPresent = Number.isFinite(receipt.cgroup_memory_current_bytes) &&
    Number.isFinite(receipt.cgroup_memory_peak_bytes) && Number.isFinite(receipt.cgroup_memory_limit_bytes) &&
    Number.isFinite(receipt.cgroup_oom_events);
  const passed = receipt.accepted === true && receipt.input_sha256 === sourceSha256 &&
    receipt.exit_code === 0 && receipt.timed_out === false && telemetryPresent &&
    (receipt.cgroup_memory_peak_bytes as number) <= memoryLimitBytes &&
    (receipt.cgroup_memory_limit_bytes as number) <= memoryLimitBytes && receipt.cgroup_oom_events === 0;
  console.log(JSON.stringify({ stage: 6, status: passed ? 'PASSED' : 'FAILED',
    image_digest: image.split('@sha256:')[1], source_sha256: sourceSha256, receipt,
    host_runner_isolated: true }, null, 2));
  if (!passed) process.exitCode = 1;
}
