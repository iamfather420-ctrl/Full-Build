import { GridNode, ParadoxOperator, PaymentProvider } from './types';

// Generate 54 nodes for the grid programmatically with varying statuses and workloads
export const getInitialNodes = (): GridNode[] => {
  const roles = [
    'Tether Core', 'Synaptic Router', 'Paradox Solver', 'JIT Obfuscator',
    'Binary Watermarker', 'Anti-Tamper Monitor', 'Local RAG Sync', 'Tether Node'
  ];

  const activities = [
    'Axiomatic inference running', 'Obfuscation pass 3/5', 'Verification loop idle',
    'Tethering synaptic knowledge', 'Computing entropy metrics', 'Monitoring memory bounds',
    'Executing SHA-256 validation', 'Mapping Solutions in grid'
  ];

  return Array.from({ length: 54 }, (_, i) => {
    const id = i + 1;
    let status: GridNode['status'] = 'active';
    if (id % 13 === 0) status = 'critical';
    else if (id % 7 === 0) status = 'isolated';
    else if (id % 3 === 0) status = 'synced';

    const roleIndex = (id * 3) % roles.length;
    const activityIndex = (id * 5) % activities.length;
    const load = Math.floor(15 + ((id * 7) % 75));
    const temperature = Math.floor(35 + ((id * 11) % 45));
    let uptime = `${Math.floor(24 + (id * 1.5))}h ${Math.floor((id * 7) % 60)}m`;
    if (status === 'isolated') uptime = '0h 0m (Rebooting)';

    return {
      id,
      label: `NODE_${String(id).padStart(3, '0')}`,
      role: roles[roleIndex],
      status,
      activity: status === 'isolated' ? 'Re-establishing tether handshake...' : activities[activityIndex],
      uptime,
      temperature,
      load: status === 'isolated' ? 0 : load
    };
  });
};

// Sample paradox registry recovered from archive (not the formal 88-operator Z3 corpus).
export const PARADOX_REGISTRY: ParadoxOperator[] = [
  {
    id: 1,
    name: 'Temporal Loop Consensus Paradox',
    type: 'proprietary',
    solutionId: 4,
    solutionName: 'Retrocausal Consensus Lock',
    proofOfEfficacy: 'Restores chronological consistency across 54 network branches without state rollbacks. Attenuation rate: 100.0%.',
    description: 'Occurs when distributed state engines resolve transactions out of strict causal alignment, creating recursive double-spend dependencies.'
  },
  {
    id: 12,
    name: 'Zero-Knowledge State Leakage',
    type: 'shared',
    solutionId: 19,
    solutionName: 'Homomorphic Noise Shield',
    proofOfEfficacy: 'Injects calibrated noise into proof transcripts without altering verification outcomes.',
    description: 'Information leakage through timing and transcript side-channels during zero-knowledge exchanges.'
  },
  {
    id: 42,
    name: 'Quantum Superposition Desync',
    type: 'proprietary',
    solutionId: 58,
    solutionName: 'Phase-Coherence Anchor',
    proofOfEfficacy: 'Aligns quantum-secure seeds on the 54-node grid using microsecond heartbeat synchronization. Drifts: < 1ps/day.',
    description: 'Random seed generation drifting due to multi-node thread interference, leading to deterministic verification failure.'
  },
  {
    id: 58,
    name: 'Anti-Tamper Seal Fracture',
    type: 'proprietary',
    solutionId: 82,
    solutionName: 'Cryptographic Heat Death Pulse',
    proofOfEfficacy: 'De-authorizes nodes displaying micro-probing signatures, forcing isolated rebuilds. Response time: < 40ns.',
    description: 'Triggers on unauthorized environment inspection, timing analyses, or binary introspection within client browsers.'
  },
  {
    id: 77,
    name: 'Synthetic Entropy Depletion',
    type: 'shared',
    solutionId: 101,
    solutionName: 'Cosmic Background Noise Injector',
    proofOfEfficacy: 'Re-seeds entropy generators via live chaotic astronomical data feeds. Randomness rating: 1.0 (NIST SP 800-22).',
    description: 'Localized pseudo-random sequence exhaustion during continuous autonomous packaging and binary compilation.'
  },
  {
    id: 88,
    name: 'Dual-Market Sovereign Mismatch',
    type: 'proprietary',
    solutionId: 105,
    solutionName: 'Tether-Bounded Clearing Engine',
    proofOfEfficacy: 'Balances white-labeled template sales with custom-built institutional solutions in real-time. Slippage: 0.000%.',
    description: 'Clearing delays between instant automatic template deliveries and custom institutional resolution orders.'
  }
];

// All providers inactive — no fabricated Stripe/Unified active connections (archive had demo actives).
export const INITIAL_PROVIDERS: PaymentProvider[] = [
  {
    id: 'paypal',
    name: 'PayPal Checkout',
    type: 'wallet',
    status: 'inactive',
    icon: 'Wallet'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Commerce',
    type: 'crypto',
    status: 'inactive',
    icon: 'Coins'
  }
];
