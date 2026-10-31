import { MarketplaceEngine } from '../marketplace/MarketplaceEngine';
import { corpusShape, runCorpus120, summarizeCorpus } from '../proofs/Corpus120';
import { REAL_88_PARADOX_REGISTRY } from '../data/paradoxData';

const shape = corpusShape();
if (!shape.ok) throw new Error(shape.reason || 'shape');

const blocked = summarizeCorpus(
  true,
  undefined,
  { executed: 0, not_executed_count: 88, unsat_count: 0, error_count: 0, overall_status: 'FAILED' },
  { executed: 0, error_count: 32, expected_result_matches: 0, overall_status: 'FAILED' },
);
if (blocked.status !== 'BLOCKED' || blocked.passed !== 0) throw new Error('solver miss was treated as a result');

const catalog = MarketplaceEngine.getInstance().listCatalog();
if (catalog.listed.length !== 0) throw new Error('an offer listed without a verified bundle');
if (!catalog.held.some((item) => /proof bundle/i.test(item.reason))) {
  throw new Error(`expected a proof-bundle hold, got ${JSON.stringify(catalog.held)}`);
}

const live = await runCorpus120();
if (live.status === 'VERIFIED') throw new Error('corpus certified without a solver');
const dumped = JSON.stringify(live);
if (REAL_88_PARADOX_REGISTRY.some((item) => dumped.includes(item.z3_smt_assertion))) {
  throw new Error('public corpus summary leaked an assertion');
}

console.log('corpus-market-ok', live.status, catalog.held.length);
