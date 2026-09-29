import fs from 'node:fs';
import path from 'node:path';
import { SolutionPipeline } from '../src/solutions/SolutionPipeline';

async function main() {
  const source = `export function zenoConvergenceStep(distance: number, epsilon: number): number {
  if (!Number.isFinite(distance) || !Number.isFinite(epsilon) || epsilon <= 0) throw new Error('finite distance and positive epsilon required');
  return distance <= epsilon ? 0 : distance / 2;
}`;
  const result = SolutionPipeline.getInstance().runPipeline('DH-P-001', source, 'TENANT_SOVEREIGN_ROOT');
  const report = {
    execution_classification: result.execution_classification,
    origin_classification: 'EXISTING_REGISTRY',
    input_registry_reference: 'DH-P-001',
    candidate_result: result,
    marketplace_action: 'NOT_ATTEMPTED',
    publication_reason: 'Candidate remains PARTIAL pending authorized sandbox execution, candidate-specific proof, independent verification, and evidence binding.'
  };
  const destination = path.resolve(process.cwd(), 'artifacts', 'daisy-candidate-execution-v2.json');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
