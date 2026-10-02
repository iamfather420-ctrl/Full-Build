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
    // Set explicit parameters for some key nodes, randomize the rest slightly but deterministically
    let status: GridNode['status'] = 'active';
    if (id % 13 === 0) status = 'critical';
    else if (id % 7 === 0) status = 'isolated';
    else if (id % 3 === 0) status = 'synced';

    const roleIndex = (id * 3) % roles.length;
    const activityIndex = (id * 5) % activities.length;
    
    // Deterministic load & temp calculations
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

// Paradox Operators Registry (88 paradoxes mapped to 105 solutions)
export const PARADOX_REGISTRY: ParadoxOperator[] = [
  {
    id: 1,
    name: "Temporal Loop Consensus Paradox",
    type: "proprietary",
    solutionId: 4,
    solutionName: "Retrocausal Consensus Lock",
    proofOfEfficacy: "Restores chronological consistency across 54 network branches without state rollbacks. Attenuation rate: 100.0%.",
    description: "Occurs when distributed state engines resolve transactions out of strict causal alignment, creating recursive double-spend dependencies."
  },
  {
    id: 12,
    name: "Zero-Knowledge State Leakage",
    type: "shared",
    solutionId: 19,
    solutionName: "Homomorphic Noise Shield",
    proofOfEfficacy: "Injects entropy vectors directly into proof layers. Privacy integrity: 99.999999% compliance (SOC2 / ISO_42001).",
    description: "Caused by cryptographic timing variances that reveal proof-complexity metadata during high-concurrency verification passes."
  },
  {
    id: 24,
    name: "Infinite Recursion Buffer Overflow",
    type: "proprietary",
    solutionId: 33,
    solutionName: "Non-Linear Stack Limiter",
    proofOfEfficacy: "Clamps execution depth safely using localized synaptic memory boundaries. System overhead: < 1.2%.",
    description: "Self-referencing autonomous templates that trigger exponential call-depth chains, threatening container stack health."
  },
  {
    id: 42,
    name: "Quantum Superposition Desync",
    type: "proprietary",
    solutionId: 58,
    solutionName: "Phase-Coherence Anchor",
    proofOfEfficacy: "Aligns quantum-secure seeds on the 54-node grid using microsecond heartbeat synchronization. Drifts: < 1ps/day.",
    description: "Random seed generation drifting due to multi-node thread interference, leading to deterministic verification failure."
  },
  {
    id: 58,
    name: "Anti-Tamper Seal Fracture",
    type: "proprietary",
    solutionId: 82,
    solutionName: "Cryptographic Heat Death Pulse",
    proofOfEfficacy: "De-authorizes nodes displaying micro-probing signatures, forcing isolated rebuilds. Response time: < 40ns.",
    description: "Triggers on unauthorized environment inspection, timing analyses, or binary introspection within client browsers."
  },
  {
    id: 77,
    name: "Synthetic Entropy Depletion",
    type: "shared",
    solutionId: 101,
    solutionName: "Cosmic Background Noise Injector",
    proofOfEfficacy: "Re-seeds entropy generators via live chaotic astronomical data feeds. Randomness rating: 1.0 (NIST SP 800-22).",
    description: "Localized pseudo-random sequence exhaustion during continuous autonomous APK packaging and binary compilation."
  },
  {
    id: 88,
    name: "Dual-Market Sovereign Mismatch",
    type: "proprietary",
    solutionId: 105,
    solutionName: "Tether-Bounded Clearing Engine",
    proofOfEfficacy: "Balances white-labeled template sales with custom-built institutional solutions in real-time. Slippage: 0.000%.",
    description: "Clearing delays between instant automatic template deliveries and custom institutional resolution orders."
  }
];

// Unified payment connections presets
export const INITIAL_PROVIDERS: PaymentProvider[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    type: 'card',
    status: 'configured',
    icon: 'CreditCard',
    connectionId: 'conn_stripe_0x4f92'
  },
  {
    id: 'paypal',
    name: 'PayPal Checkout',
    type: 'wallet',
    status: 'inactive',
    icon: 'Wallet'
  },
  {
    id: 'square',
    name: 'Square POS Online',
    type: 'card',
    status: 'inactive',
    icon: 'Smartphone'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Commerce',
    type: 'crypto',
    status: 'inactive',
    icon: 'Coins'
  },
  {
    id: 'unified_to',
    name: 'Unified.to Core Gateway',
    type: 'bank',
    status: 'active',
    icon: 'Shield',
    connectionId: 'conn_unified_0x0001'
  }
];
