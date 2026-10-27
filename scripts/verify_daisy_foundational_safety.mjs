import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const instruction = read('DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md');
const server = read('Solvex-core/server_native.ts');

assert.match(instruction, /Capability ≠ Authority ≠ Authorization ≠ Execution/);
assert.match(instruction, /Human purpose comes first/);
assert.match(instruction, /Evidence comes before claims/);
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

console.log('PASS: canonical Daisy instruction is wired in; payment creation and simulated success paths fail closed.');
