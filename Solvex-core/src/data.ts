/**
 * Native UI seed data.
 * Nodes are illustrative grid slots only — not proof of live execution.
 * Payment providers are seeded inactive; no credentials are exercised.
 */
import type { GridNode, PaymentProvider } from './types';

const NODE_ROLES = [
  'Tether Core', 'Evidence Gate', 'Auth Boundary', 'Persistence Layer',
  'Ledger Writer', 'Formal Verifier', 'Replay Engine', 'Activation Gate',
  'Marketplace Router', 'JIT Compiler', 'Audit Stream', 'Recovery Agent',
] as const;

export function getInitialNodes(): GridNode[] {
  const nodes: GridNode[] = [];
  for (let i = 1; i <= 54; i++) {
    const role = NODE_ROLES[(i - 1) % NODE_ROLES.length];
    nodes.push({
      id: i,
      label: `Node-${String(i).padStart(2, '0')}`,
      role,
      status: i % 17 === 0 ? 'isolated' : i % 11 === 0 ? 'synced' : 'active',
      activity: 'Awaiting authoritative activation evidence. No live workload claimed.',
      uptime: '—',
      temperature: 38 + (i % 12),
      load: Math.min(15 + (i % 40), 95),
    });
  }
  return nodes;
}

export const INITIAL_PROVIDERS: PaymentProvider[] = [
  {
    id: 'paypal',
    name: 'PayPal',
    type: 'wallet',
    status: 'inactive',
    icon: 'paypal',
  },
  {
    id: 'card-rail',
    name: 'Card Rail',
    type: 'card',
    status: 'inactive',
    icon: 'credit-card',
  },
  {
    id: 'bank-ach',
    name: 'Bank / ACH',
    type: 'bank',
    status: 'inactive',
    icon: 'landmark',
  },
];
