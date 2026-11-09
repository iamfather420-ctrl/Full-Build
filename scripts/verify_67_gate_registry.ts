import { validateVerificationGateCatalog, TOTAL_VERIFICATION_GATE_COUNT } from '../src/verification/VerificationGateRegistry';
const result = validateVerificationGateCatalog();
console.log(JSON.stringify({ ...result, expected_total: TOTAL_VERIFICATION_GATE_COUNT, evidence_scope: 'CATALOG_STRUCTURE_ONLY' }, null, 2));
if (!result.valid || result.total !== 67) process.exit(1);
