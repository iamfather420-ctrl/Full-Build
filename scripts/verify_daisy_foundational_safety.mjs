import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const instruction = read('DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md');
const server = read('Solvex-core/server_native.ts');
const entrypoint = read('Solvex-core/server.ts');
const brain = read('src/brain/DaisyBrain.ts');
const nativeUi = read('Solvex-core/src/App_native.tsx');

assert.match(instruction, /Capability ≠ Authority ≠ Authorization ≠ Execution/);
assert.match(instruction, /Human purpose comes first/);
assert.match(instruction, /Evidence comes before claims/);
assert.match(entrypoint, /import ['\"]\.\/server_native['\"]/);
assert.match(server, /readFileSync/);
assert.match(server, /systemInstruction:\s*foundationalSystemInstruction/);
assert.match(server, /FOUNDATIONAL_INSTRUCTION_UNAVAILABLE/);
assert.match(server, /PAYMENTS_DISABLED/);
assert.match(server, /res\.status\(410\)/);
assert.doesNotMatch(server, /pending_checkout|simulatedRepos|txn_\$\{|payment-trigger/);
assert.match(server, /GITHUB_LOOKUP_UNAVAILABLE/);
assert.match(server, /UNIFICATION_NOT_IMPLEMENTED/);
assert.match(server, /No simulated response was generated/);
assert.doesNotMatch(server, /--allow-unauthenticated/);
assert.match(brain, /private verifiedDFRLCount: number = 0/);
assert.match(brain, /private verifiedReplayCount: number = 0/);
assert.match(brain, /canonical_ledger_status: 'UNVERIFIED'/);
assert.match(brain, /anti_mock_attestation: 'UNVERIFIED/);
assert.match(brain, /mock_patterns_detected: null/);
assert.doesNotMatch(brain, /canonical_ledger_status: 'PARITY_SYNCHRONIZED'/);

assert.doesNotMatch(nativeUi, /UNIFIED CLEARING SETTLEMENT RECEIVED|checkout\\.solvex\\.marketplace/);
assert.match(nativeUi, /BLOCKED: PayPal and all payment processing are disabled/);
assert.match(nativeUi, /a chat suggestion cannot authorize a purchase/);
assert.doesNotMatch(nativeUi, /connectionId: isCurrentlyActive|status: isCurrentlyActive \\?/);
console.log('PASS: canonical Daisy instruction is wired in; payment creation and simulated success paths fail closed.');
