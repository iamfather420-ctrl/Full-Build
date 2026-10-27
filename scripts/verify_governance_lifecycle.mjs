#!/usr/bin/env node
const ALLOWED = {
  PROBLEM: {
    DRAFT: ['SUBMITTED', 'ARCHIVED', 'BLOCKED'],
    SUBMITTED: ['IN_REVIEW', 'REJECTED', 'BLOCKED'],
    IN_REVIEW: ['VERIFIED', 'REJECTED', 'BLOCKED'],
    VERIFIED: ['ARCHIVED', 'BLOCKED'],
    REJECTED: ['DRAFT', 'ARCHIVED', 'BLOCKED'],
    ARCHIVED: ['BLOCKED'],
    BLOCKED: [],
  },
  OFFER: {
    DRAFT: ['IN_REVIEW', 'BLOCKED'],
    IN_REVIEW: ['PUBLISHED', 'REJECTED', 'BLOCKED'],
    PUBLISHED: ['ARCHIVED', 'BLOCKED'],
    REJECTED: ['DRAFT', 'BLOCKED'],
    ARCHIVED: ['BLOCKED'],
    BLOCKED: [],
  },
  ORDER: {
    DRAFT: ['ORDERED', 'CANCELLED', 'BLOCKED'],
    ORDERED: ['CANCELLED', 'BLOCKED'],
    FULFILLED: ['ARCHIVED', 'BLOCKED'],
    CANCELLED: ['ARCHIVED', 'BLOCKED'],
    BLOCKED: [],
  },
};

function can(entity, from, to) {
  const edges = ALLOWED[entity]?.[from];
  if (!edges || !edges.includes(to)) return { allowed: false, reason: `Illegal ${entity} ${from}→${to}` };
  if (entity === 'ORDER' && to === 'FULFILLED') return { allowed: false, reason: 'ORDER→FULFILLED blocked (payments disabled)' };
  return { allowed: true };
}

const cases = [
  ['OFFER', 'IN_REVIEW', 'PUBLISHED', true],
  ['OFFER', 'DRAFT', 'PUBLISHED', false],
  ['ORDER', 'DRAFT', 'ORDERED', true],
  ['ORDER', 'ORDERED', 'FULFILLED', false],
  ['ORDER', 'DRAFT', 'FULFILLED', false],
  ['PROBLEM', 'IN_REVIEW', 'VERIFIED', true],
  ['PROBLEM', 'BLOCKED', 'VERIFIED', false],
];

let failed = 0;
for (const [entity, from, to, expect] of cases) {
  const r = can(entity, from, to);
  const ok = r.allowed === expect;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${entity} ${from}→${to} expected=${expect} got=${r.allowed}`);
  if (!ok) failed++;
}
if (failed > 0) {
  console.error(`Governance lifecycle verification FAILED (${failed} cases).`);
  process.exit(1);
}
console.log('Governance lifecycle verification PASSED.');
process.exit(0);
