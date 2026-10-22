// Database schema and cryptographic utilities for SOLVEX + dAIsy haMINJA

function getCryptoModule(): any {
  try {
    // @ts-ignore
    if (typeof window === 'undefined' && typeof require === 'function') {
      // @ts-ignore
      return require('crypto');
    }
  } catch {}
  return null;
}

// Pure JS SHA-256 fallback for environments without Node crypto (browser execution)
export function sha256Pure(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let compositeClear = '\x80';
  while ((ascii.length + 1 + compositeClear.length) % 64 !== 56) {
    compositeClear += '\x00';
  }
  const padded = ascii + compositeClear;
  for (i = 0; i < padded.length; i++) {
    const code = padded.charCodeAt(i);
    words[i >> 2] |= code << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = (i < 16) ? (w[i] || 0) : ((w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + w[i]) | 0;
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function computeSha256(data: string): string {
  const cryptoMod = getCryptoModule();
  if (cryptoMod && cryptoMod.createHash) {
    return cryptoMod.createHash('sha256').update(data).digest('hex');
  }
  return sha256Pure(data);
}

export interface ProofBundleEntity {
  proof_id: string;
  subject_id: string;
  claim: string;
  claim_hash: string;
  evidence: string[];
  tests: {
    test_id: string;
    description: string;
    passed: boolean;
    duration_ms: number;
    receipt_hash: string;
  }[];
  formal_proofs: {
    system: string;
    specification: string;
    checked: boolean;
    proof_term_hash: string;
  }[];
  independent_oracles: {
    oracle_id: string;
    name: string;
    method: string;
    attestation_hash: string;
    verified: boolean;
  }[];
  replay_results: {
    replay_id: string;
    status: 'MATCH' | 'MISMATCH';
    expected_hash: string;
    observed_hash: string;
  }[];
  implementation_hash: string;
  environment_hash: string;
  dependency_hash: string;
  source_references: string[];
  timestamp: number;
  verifier_identity: string;
  verification_status: 'PARTIAL' | 'VERIFIED' | 'REJECTED' | 'FAIL' | 'HOLD';
  limitations: string[];
  reproducibility_instructions: string;
}

export interface TenantEntity {
  id: string;
  name: string;
  tier: 'ENTERPRISE' | 'PRO' | 'STANDARD';
  isolated_storage_key: string;
  created_at: number;
  status?: string;
}

export interface ProblemEntity {
  id: string;
  tenant_id: string;
  raw_problem: string;
  normalized_title: string;
  domain: string;
  detected_constraints: string[];
  invariants: string[];
  status: string;
  created_at?: number;
  version?: string;
}

export interface SolutionEntity {
  id?: string;
  code: string;
  title: string;
  domain: string;
  problem_ref: string;
  paradox_ref?: string;
  implementation_source: string;
  implementation_hash: string;
  verification_status: 'VERIFIED' | 'CLAIM_ONLY' | 'REJECTED' | 'PARTIAL';
  proof_bundle_id: string;
  performance_boost_percent: number;
  reversibility_guaranteed: boolean;
  status?: string;
  created_at?: number;
}

export interface OfferEntity {
  id?: string;
  offer_id?: string;
  tenant_id?: string;
  solution_id: string;
  proof_bundle_id: string;
  title: string;
  description: string;
  cost_basis_cents: number;
  verification_complexity_factor: number;
  risk_class: 'LOW' | 'MEDIUM' | 'HIGH';
  price_cents: number;
  sla_tier?: string;
  published: boolean;
  verification_status: string;
  publication_blocked_reason?: string;
  created_at?: number;
}

export interface OrderEntity {
  id: string;
  tenant_id: string;
  offer_id: string;
  solution_id: string;
  proof_bundle_id: string;
  price_cents: number;
  status: 'OFFER' | 'ORDER_CREATED' | 'ESCROW_FUNDED' | 'SANDBOX_PROVISIONED' | 'REPLAY_VERIFIED' | 'DEPLOYED' | 'FAILED' | 'ROLLED_BACK';
  payment_id?: string;
  deployment_id?: string;
  created_at?: number;
}

export interface AuditRecordEntity {
  id: string;
  tenant_id: string;
  index_num: number;
  timestamp: number;
  actor: string;
  action: string;
  target_entity: string;
  target_id: string;
  payload: any;
  payload_hash: string;
  previous_hash: string;
  record_hash: string;
}

export interface CheckpointEntity {
  id: string;
  tenant_id: string;
  checkpoint_id: string;
  target_mutation: string;
  classification: 'ATOMIC_DATABASE_RESTORE' | 'IRREVERSIBLE_EXTERNAL_ACTION';
  snapshot_state: any;
  timestamp: number;
}
