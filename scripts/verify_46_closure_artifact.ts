import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'artifacts', 'system-46-closure-gate.json');
if (!fs.existsSync(file)) throw new Error('Separate GATE-46 closure evidence is missing.');
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
if (report.sequence_gate_count !== 45 || report.total_gates !== 1 || report.gate?.gate_id !== 'GATE-46') {
  throw new Error('GATE-46 evidence is not a separate closure gate after the 45-gate sequence.');
}
console.log('[SEPARATE-GATE-46]', JSON.stringify({ gate_id: report.gate.gate_id, status: report.gate.status, source_commit_sha: report.source_commit_sha }));
if (report.gate.status !== 'PASSED') process.exitCode = 1;
