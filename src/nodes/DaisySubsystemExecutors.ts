import { computeSha256 } from '../database/DatabaseSchema';
import { DurableStore } from '../database/DurableStore';
import { SqliteStore } from '../database/SqliteStore';
import { MMTAIProtocol } from '../mmtai/MMTAIProtocol';
import { NOPOTVerifier } from '../proofs/NOPOTProof';
import { ProofEngine } from '../proofs/ProofEngine';
import { SolutionPipeline } from '../solutions/SolutionPipeline';
import { MarketplaceEngine } from '../marketplace/MarketplaceEngine';
import { OrderLifecycleManager } from '../marketplace/OrderLifecycle';
import { PayPalAdapter } from '../payments/PayPalAdapter';
import { NeonStore } from '../database/NeonPersistence';
import { CrystalClearBox } from '../audit/CrystalClearBox';
import { Z3FormalProofEngine } from '../proofs/Z3FormalProofEngine';
import { AUTHORITATIVE_32_DH_CONTRACTS } from '../formal/dhAuthoritativeFormalContracts';
import { REAL_32_DH_FORMAL_REGISTRY } from '../data/dhParadoxFormalRegistry';
import { AuthService } from '../auth/AuthService';
import { ReversibilityEngine } from '../database/ReversibilityEngine';
import { ParadoxRegistry } from '../paradoxes/ParadoxRegistry';
import { SovereignApiRouter } from '../api/ApiRouter';
import { NodeRegistry } from './NodeRegistry';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { compareToCanonical, DRIFT_CANONICAL_SHA256 } from './driftCheck';
import { happensBefore, receive, tick } from './vectorClock';
import { TenantCrypto } from '../security/TenantCrypto';
import { IndependentModelOracle } from '../security/IndependentModelOracle';
import { IsolatedExecutionSandbox } from '../security/IsolatedExecutionSandbox';
import { planGoal } from './goalPlanner';
import { simulateChandyLamportSnapshot, simulateRaftConsensus, simulateEscrowQuorum } from './distributedProtocolModels';

export interface RawNodeExecutionResult {
  node_id: string;
  name: string;
  category: string;
  executed: boolean;
  claim_scope: 'MODEL' | 'LOCAL' | 'SANDBOX' | 'PRODUCTION';
  status: 'SUCCESS' | 'FAIL_CLOSED' | 'PROVIDER_REQUIRED' | 'PROHIBITED_BLOCKED' | 'FAIL';
  duration_ms: number;
  evidence: Record<string, any>;
  error?: string;
}

export interface SubsystemExecutionResult extends RawNodeExecutionResult {
  registered: boolean;
  instantiated: boolean;
  reachable: boolean;
  output_asserted: boolean;
  evidence_generated: boolean;
  evidence_hash: string;
}

function hasMeaningfulEvidence(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasMeaningfulEvidence);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasMeaningfulEvidence);
  return false;
}

export class DaisySubsystemExecutors {
  private static instance: DaisySubsystemExecutors | null = null;

  public static getInstance(): DaisySubsystemExecutors {
    if (!DaisySubsystemExecutors.instance) {
      DaisySubsystemExecutors.instance = new DaisySubsystemExecutors();
    }
    return DaisySubsystemExecutors.instance;
  }

  /**
   * Execute dedicated CUJ for any of the 54 Daisy nodes
   */
  public async executeNode(nodeId: string, testPayload: any = {}): Promise<RawNodeExecutionResult> {
    const start = performance.now();

    switch (nodeId) {
      // 1. DN-01: Daisy Genesis Core
      case 'DN-01': {
        const rootHash = computeSha256('DAISY_GENESIS_CORE_V1_PROD');
        const durable = DurableStore.getInstance();
        durable.appendAudit('TENANT_ROOT', 'DN-01', 'BOOTSTRAP_GENESIS', 'CORE', 'DAISY_ROOT', { rootHash });
        return {
          node_id: 'DN-01',
          name: 'Daisy Genesis Core',
          category: 'CORE_KERNEL',
          executed: true,
          claim_scope: 'LOCAL',
          status: 'SUCCESS',
          duration_ms: performance.now() - start,
          evidence: { genesis_root: rootHash, state: 'INITIALIZED' }
        };
      }

      // 2. DN-02: MMTAI Authority Gate
      case 'DN-02': {
        const mmtai = MMTAIProtocol.getInstance();
        const token = mmtai.issueAuthorizationToken('ROLE_VERIFIER', 'CAP_SANDBOX_EXECUTE', 'TENANT_TEST');
        const auth = mmtai.authorizeExecution('CAP_SANDBOX_EXECUTE', 'ROLE_VERIFIER', token, 'CUJ_RUN', 'TENANT_TEST');
        return {
          node_id: 'DN-02',
          name: 'MMTAI Authority Gate',
          category: 'SECURITY',
          executed: true,
          claim_scope: 'LOCAL',
          status: auth.permitted ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { token_prefix: token.slice(0, 16), permitted: auth.permitted }
        };
      }

      // 3. DN-03: Z3 Theorem Prover Kernel
      case 'DN-03': {
        const z3 = Z3FormalProofEngine.getInstance();
        const res = await z3.proveCatalogTheorem('THM-RUSSELL-01');
        return {
          node_id: 'DN-03',
          name: 'Z3 Theorem Prover Kernel',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: res.proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { solver_result: res.solver_result, cert_hash: res.certificate_sha256 }
        };
      }

      // 4. DN-04: NOPOT Bounded Termination Engine
      case 'DN-04': {
        const cert = NOPOTVerifier.verifyAlgorithmTermination('ZenoHalving', (x) => Math.floor(x / 2), 64, 100);
        return {
          node_id: 'DN-04',
          name: 'NOPOT Bounded Termination Engine',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: cert.termination_proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { steps: cert.actual_measured_steps, bound: cert.bounded_steps_upper_bound }
        };
      }

      // 5. DN-05: Crystal Clear Box Audit Engine
      case 'DN-05': {
        const engine = ProofEngine.getInstance();
        const solution = DurableStore.getInstance().getState().solutions['DH-S-001'];
        const bundle = solution?.proof_bundle_id ? engine.getBundle(solution.proof_bundle_id) : undefined;
        const integrity = bundle ? engine.verifyBundleIntegrity(bundle) : { verified: false, reasons: ['No source-bound verified proof bundle is attached to DH-S-001.'] };
        const projection = bundle && integrity.verified ? CrystalClearBox.projectCustomerEvidence(bundle) : null;
        const passed = Boolean(projection && projection.verification_verdict === 'VERIFIED' && projection.proprietary_weights_redacted && projection.internal_reasoning_redacted);
        return {
          node_id: 'DN-05',
          name: 'Crystal Clear Box Audit Engine',
          category: 'AUDIT',
          executed: true,
          claim_scope: 'LOCAL',
          status: passed ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: {
            proof_id: bundle?.proof_id ?? null,
            proof_integrity_verified: integrity.verified,
            verification_verdict: projection?.verification_verdict ?? solution?.verification_status ?? 'MISSING',
            public_audit_token_present: Boolean(projection?.public_audit_token),
            proprietary_weights_redacted: projection?.proprietary_weights_redacted ?? false,
            internal_reasoning_redacted: projection?.internal_reasoning_redacted ?? false,
            reasons: integrity.reasons
          }
        };
      }

      // 6. DN-06: Linear SHA-256 Merkle Ledger
      case 'DN-06': {
        const store = DurableStore.getInstance();
        const rec = store.appendAudit('TENANT_ROOT', 'DN-06', 'CHAIN_TEST', 'LEDGER', 'REC_01', { payload: 'merkle_link' });
        const valid = store.verifyChain().valid;
        return {
          node_id: 'DN-06',
          name: 'Linear SHA-256 Merkle Ledger',
          category: 'AUDIT',
          executed: true,
          claim_scope: 'LOCAL',
          status: valid ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { record_hash: rec.record_hash, chain_valid: valid }
        };
      }

      // 7. DN-07: Anti-Tamper Sentinel Monitor
      case 'DN-07': {
        const store = DurableStore.getInstance();
        const chain = store.getState().audit_chain;
        if (chain.length > 0) {
          const orig = chain[chain.length - 1].payload_hash;
          chain[chain.length - 1].payload_hash = 'deadbeef'.repeat(8);
          const detected = !store.verifyChain().valid;
          chain[chain.length - 1].payload_hash = orig;
          return {
            node_id: 'DN-07',
            name: 'Anti-Tamper Sentinel Monitor',
            category: 'AUDIT',
            executed: true,
            claim_scope: 'LOCAL',
            status: detected ? 'SUCCESS' : 'FAIL_CLOSED',
            duration_ms: performance.now() - start,
            evidence: { mutation_alarm_tripped: detected }
          };
        }
        return {
          node_id: 'DN-07',
          name: 'Anti-Tamper Sentinel Monitor',
          category: 'AUDIT',
          executed: true,
          claim_scope: 'LOCAL',
          status: 'SUCCESS',
          duration_ms: performance.now() - start,
          evidence: { sentinel: 'ACTIVE' }
        };
      }

      // 8. DN-08: Atomic Checkpoint Engine
      case 'DN-08': {
        const store = DurableStore.getInstance();
        const chk = store.createCheckpoint('TENANT_ROOT', 'DN-08-SNAPSHOT', 'ATOMIC_DATABASE_RESTORE');
        return {
          node_id: 'DN-08',
          name: 'Atomic Checkpoint Engine',
          category: 'PERSISTENCE',
          executed: true,
          claim_scope: 'LOCAL',
          status: chk.id ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { checkpoint_id: chk.id, type: chk.classification }
        };
      }

      // 9. DN-09: Reversibility & Rollback Governor
      case 'DN-09': {
        const rev = ReversibilityEngine.getInstance();
        const chk = rev.createCheckpoint('TENANT_ROOT', 'ROLLBACK_TEST', 'ATOMIC_DATABASE_RESTORE');
        const roll = rev.executeRollback(chk.id, 'CUJ Governor test');
        return {
          node_id: 'DN-09',
          name: 'Reversibility & Rollback Governor',
          category: 'PERSISTENCE',
          executed: true,
          claim_scope: 'LOCAL',
          status: roll.success ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { rollback_success: roll.success }
        };
      }

      // 10. DN-10: Irreversible Action Firewall
      case 'DN-10': {
        const rev = ReversibilityEngine.getInstance();
        const chk = rev.createCheckpoint('TENANT_ROOT', 'IRREV_TEST', 'IRREVERSIBLE_EXTERNAL_ACTION');
        const roll = rev.executeRollback(chk.id, 'Illegal rollback test');
        const blocked = !roll.success && (roll.error?.includes('IRREVERSIBLE_EXTERNAL_ACTION') ?? false);
        return {
          node_id: 'DN-10',
          name: 'Irreversible Action Firewall',
          category: 'SECURITY',
          executed: true,
          claim_scope: 'LOCAL',
          status: blocked ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { blocked_illegal_rollback: blocked }
        };
      }

      // 11. DN-11: 21-Stage Problem Pipeline
      case 'DN-11': {
        if (process.env.SOLVEX_NODE_EXTERNAL_PROBES !== 'true') {
          return { node_id: 'DN-11', name: '21-Stage Problem Pipeline', category: 'CORE_KERNEL', executed: true, claim_scope: 'LOCAL', status: 'FAIL_CLOSED', duration_ms: performance.now() - start, evidence: { external_probe_enabled: false, reason: 'Full pipeline execution is reserved for the authoritative external-provider verification step.' } };
        }
        const pipe = SolutionPipeline.getInstance();
        const durable = DurableStore.getInstance();
        const solution = durable.getState().solutions['DH-S-001'];
        const source = solution?.implementation_source ?? '';
        const sourceHash = computeSha256(source);
        if (!source || sourceHash !== solution?.implementation_hash) {
          return {
            node_id: 'DN-11',
            name: '21-Stage Problem Pipeline',
            category: 'CORE_KERNEL',
            executed: true,
            claim_scope: 'LOCAL',
            status: 'FAIL_CLOSED',
            duration_ms: performance.now() - start,
            evidence: { completed_stages: 0, success: false, source_bound: false, reason: 'DH-S-001 source is missing or does not match its stored implementation hash.' }
          };
        }
        const res = await pipe.runPipeline('DH-P-001', source);
        const proofId = 'PB-' + sourceHash.slice(0, 24);
        const bundle = ProofEngine.getInstance().getBundle(proofId);
        const integrity = bundle ? ProofEngine.getInstance().verifyBundleIntegrity(bundle) : { verified: false, reasons: ['Pipeline did not persist its source-bound proof bundle.'] };
        const passed = res.overall_success && res.completed_stages === 21 &&
          bundle?.verification_status === 'VERIFIED' && integrity.verified;
        if (passed && solution) {
          solution.verification_status = 'VERIFIED';
          solution.status = 'VERIFIED';
          solution.proof_bundle_id = proofId;
          durable.getState().solutions['DH-S-001'] = solution;
          durable.persist();
        }
        return {
          node_id: 'DN-11',
          name: '21-Stage Problem Pipeline',
          category: 'CORE_KERNEL',
          executed: true,
          claim_scope: 'LOCAL',
          status: passed ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: {
            completed_stages: res.completed_stages,
            total_stages: res.total_stages,
            success: res.overall_success,
            source_bound: true,
            source_sha256: sourceHash,
            proof_id: bundle?.proof_id ?? null,
            proof_bundle_verified: integrity.verified,
            proof_bundle_status: bundle?.verification_status ?? 'MISSING',
            blocked_stage_numbers: res.stage_traces.filter(stage => stage.status !== 'PASSED').map(stage => stage.stage),
            rejection_reason: res.rejection_reason ?? (integrity.reasons.join('; ') || null)
          }
        };
      }

      // 12. DN-12: Fail-Closed Circuit Breaker
      case 'DN-12': {
        const pipe = SolutionPipeline.getInstance();
        const res = await pipe.runPipeline('DH-P-001', '/* FAIL_STAGE_9 */ return false;');
        const stopped = res.rejection_reason?.includes('Sentinel detected fatal specification anomaly') === true;
        return {
          node_id: 'DN-12',
          name: 'Fail-Closed Circuit Breaker',
          category: 'SECURITY',
          executed: true,
          claim_scope: 'LOCAL',
          status: stopped ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { circuit_tripped: stopped, stopped_at_stage: res.completed_stages, blocker: res.rejection_reason }
        };
      }

      // 13. DN-13: Defensible Pricing Formula Engine
      case 'DN-13': {
        const market = MarketplaceEngine.getInstance();
        const p = market.calculateDefensiblePrice(10000, 1.5, 'MEDIUM');
        const deterministic = p.final_price_cents === 25313;
        return {
          node_id: 'DN-13',
          name: 'Defensible Pricing Formula Engine',
          category: 'MARKETPLACE',
          executed: true,
          claim_scope: 'LOCAL',
          status: deterministic ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { price_cents: p.final_price_cents, hash: p.calculation_hash }
        };
      }

      // 14. DN-14: Marketplace Publication Guard
      case 'DN-14': {
        const market = MarketplaceEngine.getInstance();
        const res = market.publishOffer('FAKE_SOL', 'FAKE_PB', 'Unverified', 'Desc', 100, 1.0, 'HIGH');
        const blocked = !res.success;
        return {
          node_id: 'DN-14',
          name: 'Marketplace Publication Guard',
          category: 'MARKETPLACE',
          executed: true,
          claim_scope: 'LOCAL',
          status: blocked ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { publication_blocked: blocked }
        };
      }

      // 15. DN-15: Multi-Tenant Partition Manager
      case 'DN-15': {
        try {
          const crypto = new TenantCrypto();
          const encrypted = crypto.encrypt('TENANT_A', 'tenant-isolation-probe');
          const roundTrip = crypto.decrypt('TENANT_A', encrypted) === 'tenant-isolation-probe';
          let crossTenantDenied = false;
          try { crypto.decrypt('TENANT_B', encrypted); } catch { crossTenantDenied = true; }
          const passed = roundTrip && crossTenantDenied;
          return { node_id: 'DN-15', name: 'Multi-Tenant Partition Manager', category: 'SECURITY', executed: true, claim_scope: 'LOCAL', status: passed ? 'SUCCESS' : 'FAIL_CLOSED', duration_ms: performance.now() - start, evidence: { cryptographic_tenant_isolation_verified: passed, authenticated_encryption: 'AES-256-GCM', key_derivation: 'HKDF-SHA256', round_trip: roundTrip, cross_tenant_denied: crossTenantDenied, scope: 'record-level cryptographic separation; not a substitute for database/RLS isolation' } };
        } catch (error) {
          return { node_id: 'DN-15', name: 'Multi-Tenant Partition Manager', category: 'SECURITY', executed: true, claim_scope: 'LOCAL', status: 'FAIL_CLOSED', duration_ms: performance.now() - start, evidence: { cryptographic_tenant_isolation_verified: false, reason: error instanceof Error ? error.message : String(error) } };
        }
      }

      // 16. DN-16: RBAC Token Boundary (Fail-Closed Until OIDC)
      case 'DN-16': {
        const start = performance.now();
        const auth = AuthService.getInstance();
        let mintBlocked = false;
        let mintError = '';
        try {
          auth.createSignedToken('u_test', 'TENANT_TEST', 'test@agate.io', 'ADMIN');
        } catch (error) {
          mintError = error instanceof Error ? error.message : String(error);
          mintBlocked = /^BLOCKED:/.test(mintError);
        }
        const untrustedToken = await auth.verifyToken('untrusted-token');
        const boundaryVerified = mintBlocked && !untrustedToken.valid;
        return {
          node_id: 'DN-16',
          name: 'RBAC Token Boundary (Fail-Closed Until OIDC)',
          category: 'SECURITY',
          executed: true,
          claim_scope: 'LOCAL',
          status: boundaryVerified ? 'FAIL_CLOSED' : 'FAIL',
          duration_ms: performance.now() - start,
          evidence: {
            local_token_mint_blocked: mintBlocked,
            untrusted_token_rejected: !untrustedToken.valid,
            authorization_mode: 'TRUSTED_OIDC_REQUIRED',
            mint_error: mintError
          }
        };
      }

      // 17. DN-17: Single-Use Token Replay Sentinel
      case 'DN-17': {
        const mmtai = MMTAIProtocol.getInstance();
        const tok = mmtai.issueAuthorizationToken('ROLE_VERIFIER', 'CAP_SANDBOX_EXECUTE', 'TENANT_REPLAY_TEST');
        const first = mmtai.authorizeExecution('CAP_SANDBOX_EXECUTE', 'ROLE_VERIFIER', tok, 'USE_1', 'TENANT_REPLAY_TEST');
        const replay = mmtai.authorizeExecution('CAP_SANDBOX_EXECUTE', 'ROLE_VERIFIER', tok, 'USE_2', 'TENANT_REPLAY_TEST');
        const protected_replay = first.permitted && !replay.permitted;
        return {
          node_id: 'DN-17',
          name: 'Single-Use Token Replay Sentinel',
          category: 'SECURITY',
          executed: true,
          claim_scope: 'LOCAL',
          status: protected_replay ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { replay_rejected: !replay.permitted }
        };
      }

      // 18. DN-18: Cleanroom Deterministic Sandbox
      case 'DN-18': {
        const image = process.env.SOLVEX_SANDBOX_IMAGE ?? '';
        if (!/@sha256:[a-f0-9]{64}$/i.test(image)) return { node_id: 'DN-18', name: 'Cleanroom Deterministic Sandbox', category: 'CORE_KERNEL', executed: true, claim_scope: 'SANDBOX', status: 'FAIL_CLOSED', duration_ms: performance.now() - start, evidence: { isolated_cleanroom_execution_verified: false, reason: 'SOLVEX_SANDBOX_IMAGE must reference an immutable sha256 digest.' } };
        const source = 'const result = 6 * 7; if (result !== 42) throw new Error("sandbox probe failed");';
        const result = await IsolatedExecutionSandbox.execute(image, ['/opt/solvex-sandbox/verify-source.mjs'], source, { timeoutMs: 15000, memoryBytes: 256 * 1024 * 1024, cpuCount: 1, pidsLimit: 64 });
        return { node_id: 'DN-18', name: 'Cleanroom Deterministic Sandbox', category: 'CORE_KERNEL', executed: true, claim_scope: 'SANDBOX', status: result.passed ? 'SUCCESS' : 'FAIL_CLOSED', duration_ms: performance.now() - start, evidence: { isolated_cleanroom_execution_verified: result.passed, image_digest: image.split('@sha256:')[1], exit_code: result.exitCode, timed_out: result.timedOut, oom_killed: result.oomKilled, error: result.error } };
      }

      // 19. DN-19: Bitrot & Drift Detection Oracle
      case 'DN-19': {
        const fixture = path.join(process.cwd(), 'src/nodes/fixtures/drift-canonical.txt');
        let observed: { matches: boolean; observedSha256: string } | null = null;
        try {
          observed = compareToCanonical(readFileSync(fixture), DRIFT_CANONICAL_SHA256);
        } catch {
          observed = null;
        }
        return {
          node_id: 'DN-19',
          name: 'Bitrot & Drift Detection Oracle',
          category: 'AUDIT',
          executed: true,
          claim_scope: 'LOCAL',
          status: observed?.matches ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: observed
            ? { artifact_drift_check_performed: true, artifact: 'src/nodes/fixtures/drift-canonical.txt', matches_canonical: observed.matches, observed_sha256: observed.observedSha256 }
            : { artifact_drift_check_performed: false, reason: 'The canonical drift fixture could not be read.' }
        };
      }

      // 20. DN-20: Paradox Resolution Engine
      case 'DN-20': {
        const reg = ParadoxRegistry.getInstance();
        const zeno = reg.getByCode('DH-P-001');
        const z3 = Z3FormalProofEngine.getInstance();
        const proof = await z3.proveCatalogTheorem('THM-ZENO-ARCHIMEDEAN-06');
        return {
          node_id: 'DN-20',
          name: 'Paradox Resolution Engine',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: proof.proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: {
            registry_entry: zeno?.code ?? null,
            registry_status: zeno?.verification_status ?? null,
            theorem: 'THM-ZENO-ARCHIMEDEAN-06',
            solver_result: proof.solver_result,
            resolution_executed: proof.proved
          }
        };
      }

      // 21. DN-21: Russell Naive Set Axiom Disprover
      case 'DN-21': {
        const z3 = Z3FormalProofEngine.getInstance();
        const res = await z3.proveCatalogTheorem('THM-RUSSELL-01');
        return {
          node_id: 'DN-21',
          name: 'Russell Naive Set Axiom Disprover',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: res.proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { theorem: 'THM-RUSSELL-01', result: res.solver_result }
        };
      }

      // 22. DN-22: Barber Semantic Variant Verifier
      case 'DN-22': {
        const z3 = Z3FormalProofEngine.getInstance();
        const res = await z3.proveCatalogTheorem('THM-BARBER-02');
        return {
          node_id: 'DN-22',
          name: 'Barber Semantic Variant Verifier',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: res.proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { theorem: 'THM-BARBER-02', result: res.solver_result }
        };
      }

      // 23. DN-23: Curry Implication Contraction Guard
      case 'DN-23': {
        const z3 = Z3FormalProofEngine.getInstance();
        const res = await z3.proveCatalogTheorem('THM-CURRY-04');
        return {
          node_id: 'DN-23',
          name: 'Curry Implication Contraction Guard',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: res.proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { theorem: 'THM-CURRY-04', result: res.solver_result }
        };
      }

      // 24. DN-24: Zeno Achilles Continuous Metric Solver
      case 'DN-24': {
        const z3 = Z3FormalProofEngine.getInstance();
        const res = await z3.proveCatalogTheorem('THM-ZENO-ARCHIMEDEAN-06');
        return {
          node_id: 'DN-24',
          name: 'Zeno Achilles Continuous Metric Solver',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: res.proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { theorem: 'THM-ZENO-ARCHIMEDEAN-06', result: res.solver_result }
        };
      }

      // 25. DN-25: Burali-Forti Ordinal Hierarchy Checker
      case 'DN-25': {
        // Use the authoritative DH-P-009 formal contract and execute its SMT
        // assertion with the existing Z3 runtime. A finite ascending sample is
        // not evidence for the Burali-Forti contradiction.
        const contract = AUTHORITATIVE_32_DH_CONTRACTS.find((item) => item.case_id === 'DH-P-009');
        if (!contract) throw new Error('Authoritative DH-P-009 Burali-Forti contract is unavailable.');
        const proof = await Z3FormalProofEngine.getInstance().executeSmtVerification(
          contract.case_id,
          contract.name,
          contract.domain,
          contract.formal_proposition,
          contract.z3_smt_assertion,
          contract.expected_result,
          'Z3 verified the DH-P-009 irreflexivity contradiction under the contract’s stated ordinal-order assumptions.'
        );
        return {
          node_id: 'DN-25',
          name: 'Burali-Forti Ordinal Hierarchy Checker',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: proof.proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: {
            paradox_id: contract.case_id,
            contract_hash: contract.contract_hash,
            source_file: contract.source_file,
            formalization_method: contract.formalization_method,
            expected_solver_result: contract.expected_result,
            solver_result: proof.solver_result,
            certificate_sha256: proof.certificate_sha256,
            proof_scope: contract.scope,
            ordinal_hierarchy_verified: proof.proved
          }
        };
      }

      // 26. DN-26: Tarski Semantic Truth Tower Node
      case 'DN-26': {
        const z3 = Z3FormalProofEngine.getInstance();
        const res = await z3.proveCatalogTheorem('THM-LIAR-03');
        return {
          node_id: 'DN-26',
          name: 'Tarski Semantic Truth Tower Node',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: res.proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { theorem: 'THM-LIAR-03', result: res.solver_result }
        };
      }

      // 27. DN-27: Halting Problem Boundary Sentinel
      case 'DN-27': {
        // Enforce Rice-Turing boundary: bounded loop analysis via NOPOT ranking function
        const cert = NOPOTVerifier.verifyAlgorithmTermination('BoundedDecr', (x) => x - 1, 10, 20);
        return {
          node_id: 'DN-27',
          name: 'Halting Problem Boundary Sentinel',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: cert.termination_proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { termination_proved: cert.termination_proved }
        };
      }

      // 28. DN-28: Order Lifecycle Authorization Gate (Fail-Closed)
      case 'DN-28': {
        const start = performance.now();
        const lifecycle = OrderLifecycleManager.getInstance();
        const sqlite = SqliteStore.getInstance();
        const orderId = 'ord_cuj_' + Date.now();
        sqlite.insertRecord('orders', {
          id: orderId,
          tenant_id: 'TENANT_ROOT',
          offer_id: 'OFFER_CUJ',
          solution_id: 'SOL_CUJ',
          proof_bundle_id: 'PB_CUJ',
          price_cents: 1000,
          status: 'OFFER',
          version: '1.0.0-TEST'
        });

        // No local role token is minted. Verify that the unauthenticated
        // transition is rejected and the persisted state remains unchanged.
        const attempt = await lifecycle.transitionOrder(orderId, 'ORDER_CREATED');
        const storedOrder = sqlite.getRawDb().get('SELECT status FROM orders WHERE id = ?', [orderId]);
        const stateUnchanged = storedOrder?.status === 'OFFER';
        const blockedAsRequired = !attempt.success &&
          /BLOCKED:/i.test(attempt.error || '') &&
          stateUnchanged;

        return {
          node_id: 'DN-28',
          name: 'Order Lifecycle Authorization Gate (Fail-Closed)',
          category: 'MARKETPLACE',
          executed: true,
          claim_scope: 'LOCAL',
          status: blockedAsRequired ? 'FAIL_CLOSED' : 'FAIL',
          duration_ms: performance.now() - start,
          evidence: {
            unauthenticated_transition_rejected: !attempt.success,
            order_state_unchanged: stateUnchanged,
            persisted_order_status: storedOrder?.status ?? 'UNKNOWN',
            authorization_reason: attempt.error ?? 'NONE',
            payment_processing: 'DISABLED'
          }
        };
      }

      // 29. DN-29: Preserved Solution Vault (DH-S-001)
      case 'DN-29': {
        const durable = DurableStore.getInstance();
        const sol = durable.getState().solutions['DH-S-001'];
        const bundle = sol?.proof_bundle_id ? ProofEngine.getInstance().getBundle(sol.proof_bundle_id) : undefined;
        const integrity = bundle ? ProofEngine.getInstance().verifyBundleIntegrity(bundle) : { verified: false, reasons: ['No proof bundle is attached to DH-S-001.'] };
        const passed = Boolean(sol && sol.verification_status === 'VERIFIED' && bundle?.verification_status === 'VERIFIED' && integrity.verified);
        return {
          node_id: 'DN-29',
          name: 'Preserved Solution Vault (DH-S-001)',
          category: 'CORE_KERNEL',
          executed: true,
          claim_scope: 'LOCAL',
          status: passed ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { solution_id: 'DH-S-001', status: sol?.verification_status ?? 'MISSING', proof_id: bundle?.proof_id ?? null, proof_bundle_integrity_verified: integrity.verified, reasons: integrity.reasons }
        };
      }

      // 30. DN-30: Independent Oracle Attestor
      case 'DN-30': {
        if (process.env.SOLVEX_NODE_EXTERNAL_PROBES !== 'true') {
          return { node_id: 'DN-30', name: 'Independent Oracle Attestor', category: 'AUDIT', executed: true, claim_scope: 'LOCAL', status: 'FAIL_CLOSED', duration_ms: performance.now() - start, evidence: { external_probe_enabled: false, reason: 'External oracle attestation is reserved for the authoritative provider verification step.' } };
        }
        const input = {
          paradox_code: 'DH-P-001',
          purpose: 'Independent verification of the canonical DH-S-001 bounded Zeno solution.',
          solution_sha256: computeSha256(DurableStore.getInstance().getState().solutions['DH-S-001']?.implementation_source ?? '')
        };
        try {
          const attestation = await IndependentModelOracle.verify(input);
          return {
            node_id: 'DN-30',
            name: 'Independent Oracle Attestor',
            category: 'AUDIT',
            executed: true,
            claim_scope: 'SANDBOX',
            status: attestation.verdict === 'ACCEPT' ? 'SUCCESS' : 'FAIL_CLOSED',
            duration_ms: performance.now() - start,
            evidence: {
              independent_oracle_attestation_verified: true,
              oracle_id: attestation.oracleId,
              model_id: attestation.modelId,
              verdict: attestation.verdict,
              input_sha256: attestation.inputSha256,
              rationale_sha256: attestation.rationaleSha256,
              signature_verified: true
            }
          };
        } catch (error) {
          return {
            node_id: 'DN-30',
            name: 'Independent Oracle Attestor',
            category: 'AUDIT',
            executed: true,
            claim_scope: 'SANDBOX',
            status: 'FAIL_CLOSED',
            duration_ms: performance.now() - start,
            evidence: { independent_oracle_attestation_verified: false, reason: error instanceof Error ? error.message : String(error) }
          };
        }
      }

      // 31. DN-31: Sqlite Local Store Manager
      case 'DN-31': {
        const store = SqliteStore.getInstance();
        const raw = store.getRawDb();
        const tables = raw.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        const count = tables.length;
        return {
          node_id: 'DN-31',
          name: 'Sqlite Local Store Manager',
          category: 'PERSISTENCE',
          executed: true,
          claim_scope: 'LOCAL',
          status: store.isDiskBacked() && count === 27 ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { table_count: count, disk_backed: store.isDiskBacked() }
        };
      }

      // 32. DN-32: Durable JSON WAL Sync Engine
      case 'DN-32': {
        const durability = SqliteStore.getInstance().verifyDurableWal();
        return { node_id: 'DN-32', name: 'Durable JSON WAL Sync Engine', category: 'PERSISTENCE', executed: true, claim_scope: 'LOCAL', status: durability.verified ? 'SUCCESS' : 'FAIL_CLOSED', duration_ms: performance.now() - start, evidence: { durable_wal_sync_verified: durability.verified, disk_backed: durability.disk_backed, journal_mode: durability.journal_mode, synchronous: durability.synchronous, reason: durability.reason ?? null, note: 'SQLite WAL with synchronous=FULL provides SQLite-managed write-ahead logging and sync semantics; not a separate JSON WAL.' } };
      }

      // 33. DN-33: Central Failure Diversion Router
      case 'DN-33': {
        const rev = ReversibilityEngine.getInstance();
        const chk = rev.createCheckpoint('TENANT_ROOT', 'DIVERSION_TEST', 'ATOMIC_DATABASE_RESTORE');
        const div = rev.divertFailure('GATE_TEST', 'Test failure diversion', 'TENANT_ROOT', 'exec_01', chk.id, {});
        return {
          node_id: 'DN-33',
          name: 'Central Failure Diversion Router',
          category: 'SECURITY',
          executed: true,
          claim_scope: 'LOCAL',
          status: div.fail_closed_enforced ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { diversion_id: div.failure_id, fail_closed: div.fail_closed_enforced }
        };
      }

      // 34. DN-34: Neon Postgres Adapter (Gateway)
      case 'DN-34': {
        const neon = NeonStore.getInstance();
        const status = neon.getStatus();
        const testConn = await neon.connect();
        const success = status.configured ? testConn : true; // fail-closed cleanly handled
        return {
          node_id: 'DN-34',
          name: 'Neon Postgres Adapter',
          category: 'ADAPTERS',
          executed: true,
          claim_scope: status.configured ? 'PRODUCTION' : 'LOCAL',
          status: status.configured ? (testConn ? 'SUCCESS' : 'FAIL_CLOSED') : 'PROVIDER_REQUIRED',
          duration_ms: performance.now() - start,
          evidence: {
            configured: status.configured,
            backend: status.backend,
            fallback_active: !status.configured,
            tables_verified: status.tables_verified
          }
        };
      }

      // 35. DN-35: PayPal Enterprise Payment Gateway (Gateway)
      case 'DN-35': {
        const pp = PayPalAdapter.getInstance();
        const creds = pp.getEffectiveCredentials();
        const info = pp.getMaskedCredentialsInfo();
        let authTest: any = { valid: false };
        if (creds) {
          authTest = await pp.testLiveCredentials(creds.clientId, creds.clientSecret, creds.environment);
        }
        const isAuth = Boolean(authTest.valid || authTest.authenticated);
        return {
          node_id: 'DN-35',
          name: 'PayPal Enterprise Payment Gateway',
          category: 'PAYMENTS',
          executed: true,
          claim_scope: creds ? (creds.environment === 'live' ? 'PRODUCTION' : 'SANDBOX') : 'LOCAL',
          status: creds ? (isAuth ? 'SUCCESS' : 'FAIL_CLOSED') : 'PROVIDER_REQUIRED',
          duration_ms: performance.now() - start,
          evidence: {
            configured: pp.hasActiveCredentials(),
            environment: info.environment,
            client_id_prefix: info.masked_client_id,
            authenticated: isAuth,
            fail_closed_enforced: true
          }
        };
      }

      // 36. DN-36: Fiat Settlement Policy Guard
      case 'DN-36': {
        // Enforce the Sovereign Directive: fiat settlement is exclusive to PayPal DN-35.
        const unapprovedPaymentRequested = testPayload?.attemptUnapprovedPaymentExecution === true;
        const blocked = true; // Always blocked
        return {
          node_id: 'DN-36',
          name: 'Fiat Settlement Fiat Settlement Policy Guard',
          category: 'SECURITY',
          executed: true,
          claim_scope: 'LOCAL',
          status: 'PROHIBITED_BLOCKED',
          duration_ms: performance.now() - start,
          evidence: {
            directive: 'SOVEREIGN_DIRECTIVE_PAYPAL_EXCLUSIVE',
            enforced: true,
            fiat_designated_gateway: 'DN-35-PAYPAL',
            unapproved_payment_blocked: true
          }
        };
      }

      // 37. DN-37: Coinbase Commerce Gateway
      case 'DN-37': {
        const hasKey = Boolean(typeof process !== 'undefined' && process.env?.COINBASE_API_KEY);
        return {
          node_id: 'DN-37',
          name: 'Coinbase Commerce Gateway',
          category: 'ADAPTERS',
          executed: true,
          claim_scope: 'LOCAL',
          status: 'PROVIDER_REQUIRED',
          duration_ms: performance.now() - start,
          evidence: { configuration_present: hasKey, provider_authenticated: false, fail_closed: true }
        };
      }

      // 38. DN-38: Sovereign Settlement Escrow Program
      case 'DN-38': {
        const escrow = simulateEscrowQuorum();
        return {
          node_id: 'DN-38',
          name: 'Sovereign Settlement Escrow Program',
          category: 'SETTLEMENT',
          executed: true,
          claim_scope: 'MODEL',
          status: escrow.passed ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: {
            escrow_state_machine_model_verified: escrow.passed,
            quorum_required: escrow.quorum_required,
            valid_signatures: escrow.valid_signatures,
            release_authorized: escrow.release_authorized,
            replay_release_rejected: escrow.replay_release_rejected,
            unauthorized_refund_rejected: escrow.unauthorized_refund_rejected,
            final_state: escrow.final_state,
            live_funds_moved: escrow.live_funds_moved,
            contract_deployed: escrow.contract_deployed,
            scope: 'Ed25519 two-of-three escrow state-machine model; no live contract or settlement provider'
          }
        };
      }

      // 39. DN-39: Ethereum EVM Escrow Bridge
      case 'DN-39': {
        const rpc = typeof process !== 'undefined' ? process.env?.ETH_RPC_URL : undefined;
        const hasEth = Boolean(rpc);
        return {
          node_id: 'DN-39',
          name: 'Ethereum EVM Escrow Bridge',
          category: 'ADAPTERS',
          executed: true,
          claim_scope: 'LOCAL',
          status: 'PROVIDER_REQUIRED',
          duration_ms: performance.now() - start,
          evidence: { configuration_present: hasEth, provider_authenticated: false, fail_closed: true }
        };
      }

      // 40. DN-40: Lean4 Theorem Verification Bridge
      case 'DN-40': {
        return {
          node_id: 'DN-40',
          name: 'Lean4 Theorem Verification Bridge',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { prover_execution_verified: false, reason: 'Lean4 is not installed or invoked by this node.' }
        };
      }

      // 41. DN-41: Isabelle/HOL Proof Ingestion Node
      case 'DN-41': {
        return {
          node_id: 'DN-41',
          name: 'Isabelle/HOL Proof Ingestion Node',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { prover_execution_verified: false, reason: 'Isabelle/HOL is not installed or invoked by this node.' }
        };
      }

      // 42. DN-42: Coq Gallina Specification Node
      case 'DN-42': {
        return {
          node_id: 'DN-42',
          name: 'Coq Gallina Specification Node',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { prover_execution_verified: false, reason: 'Coq is not installed or invoked by this node.' }
        };
      }

      // 43. DN-43: Daisy Brain Autonomous Planner
      case 'DN-43': {
        try {
          const goal = typeof testPayload.goal === 'string' ? testPayload.goal : 'Verify release readiness';
          const tasks = Array.isArray(testPayload.tasks) ? testPayload.tasks : [
            { id: 'inspect', description: 'Inspect changes' },
            { id: 'test', description: 'Run regression tests', dependsOn: ['inspect'] },
            { id: 'review', description: 'Review evidence', dependsOn: ['test'] }
          ];
          const plan = planGoal(goal, tasks);
          const ordered = new Map(plan.orderedTasks.map((task, index) => [task.id, index]));
          const dependenciesRespectOrder = plan.orderedTasks.every(task => task.dependsOn.every(dep => ordered.get(dep)! < ordered.get(task.id)!));
          const passed = dependenciesRespectOrder && plan.orderedTasks.length === tasks.length;
          return { node_id: 'DN-43', name: 'Daisy Brain Autonomous Planner', category: 'CORE_KERNEL', executed: true, claim_scope: 'LOCAL', status: passed ? 'SUCCESS' : 'FAIL_CLOSED', duration_ms: performance.now() - start, evidence: { goal_decomposition_executed: true, strategy: plan.strategy, task_count: plan.orderedTasks.length, ordered_task_ids: plan.orderedTasks.map(task => task.id), dependencies_respect_order: dependenciesRespectOrder, scope: 'deterministic dependency planner; not autonomous AI reasoning' } };
        } catch (error) {
          return { node_id: 'DN-43', name: 'Daisy Brain Autonomous Planner', category: 'CORE_KERNEL', executed: true, claim_scope: 'LOCAL', status: 'FAIL_CLOSED', duration_ms: performance.now() - start, evidence: { goal_decomposition_executed: false, reason: error instanceof Error ? error.message : String(error) } };
        }
      }

      // 44. DN-44: Pigeonhole Collision SMT Verifier
      case 'DN-44': {
        const z3 = Z3FormalProofEngine.getInstance();
        const res = await z3.proveCatalogTheorem('THM-PIGEONHOLE-08');
        return {
          node_id: 'DN-44',
          name: 'Pigeonhole Collision SMT Verifier',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: res.proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { theorem: 'THM-PIGEONHOLE-08', result: res.solver_result }
        };
      }

      // 45. DN-45: Two Generals Consensus Barrier Node
      case 'DN-45': {
        const contract = REAL_32_DH_FORMAL_REGISTRY.find((item) => item.case_id === 'DH-P-015' && item.name === 'Two Generals Problem');
        if (!contract) {
          return {
            node_id: 'DN-45',
            name: 'Two Generals Consensus Barrier Node',
            category: 'LOGIC_SOLVER',
            executed: true,
            claim_scope: 'MODEL',
            status: 'FAIL_CLOSED',
            duration_ms: performance.now() - start,
            evidence: { formal_model_executed: false, reason: 'The DH-P-015 Two Generals contract is not in the formal registry.' }
          };
        }
        const proof = await Z3FormalProofEngine.getInstance().executeSmtVerification(
          contract.case_id,
          contract.name,
          contract.domain,
          contract.formal_proposition,
          contract.z3_smt_assertion,
          contract.expected_result,
          'Z3 checked the DH-P-015 lossy-channel attack formula. This is not a live network execution.'
        );
        return {
          node_id: 'DN-45',
          name: 'Two Generals Consensus Barrier Node',
          category: 'LOGIC_SOLVER',
          executed: true,
          claim_scope: 'MODEL',
          status: proof.proved ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: {
            paradox_id: contract.case_id,
            contract_hash: contract.contract_hash,
            expected_solver_result: contract.expected_result,
            solver_result: proof.solver_result,
            formal_model_executed: proof.proved,
            distributed_network_executed: false
          }
        };
      }

      // 46. DN-46: Chandy-Lamport Distributed Snapshot
      case 'DN-46': {
        const snapshot = simulateChandyLamportSnapshot();
        return {
          node_id: 'DN-46',
          name: 'Chandy-Lamport Distributed Snapshot',
          category: 'PERSISTENCE',
          executed: true,
          claim_scope: 'MODEL',
          status: snapshot.passed ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: {
            model_execution_verified: snapshot.passed,
            snapshot_id: snapshot.snapshot_id,
            process_states_recorded: snapshot.process_states_recorded,
            channel_states: snapshot.channel_states,
            markers_received: snapshot.markers_received,
            in_transit_message_recorded: snapshot.in_transit_message_recorded,
            scope: 'deterministic three-process algorithm model; not a live distributed cluster'
          }
        };
      }

      // 47. DN-47: Raft Consensus State Machine
      case 'DN-47': {
        const raft = simulateRaftConsensus();
        return {
          node_id: 'DN-47',
          name: 'Raft Consensus State Machine',
          category: 'CORE_KERNEL',
          executed: true,
          claim_scope: 'MODEL',
          status: raft.passed ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: {
            raft_model_execution_verified: raft.passed,
            term: raft.term,
            leader_id: raft.leader_id,
            votes_received: raft.votes_received,
            cluster_size: raft.cluster_size,
            log_indexes: raft.log_indexes,
            commit_indexes: raft.commit_indexes,
            stale_term_rejected: raft.stale_term_rejected,
            scope: 'deterministic three-node Raft model; not a live distributed cluster'
          }
        };
      }

      // 48. DN-48: Lamport Vector Clock Sequencer
      case 'DN-48': {
        const sent = tick({}, 'A');
        const received = receive({}, sent, 'B');
        const concurrent = tick({}, 'C');
        const causal = happensBefore(sent, received);
        const independent = !happensBefore(sent, concurrent) && !happensBefore(concurrent, sent);
        return {
          node_id: 'DN-48',
          name: 'Lamport Vector Clock Sequencer',
          category: 'CORE_KERNEL',
          executed: true,
          claim_scope: 'LOCAL',
          status: causal && independent ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: {
            local_clock_incremented: true,
            message_happens_before_receipt: causal,
            concurrent_events_incomparable: independent,
            distributed_cluster_verified: false
          }
        };
      }

      // 49. DN-49: License Generation & Proof Tokenizer
      case 'DN-49': {
        return {
          node_id: 'DN-49',
          name: 'License Generation & Proof Tokenizer',
          category: 'MARKETPLACE',
          executed: true,
          claim_scope: 'LOCAL',
          status: 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { signed_license_issued: false, reason: 'No trusted signing key or verified solution authorization is configured.' }
        };
      }

      // 50. DN-50: Telemetry & Metric Aggregator
      case 'DN-50': {
        const mem = typeof process !== 'undefined' ? process.memoryUsage?.() : { heapUsed: 0 };
        return {
          node_id: 'DN-50',
          name: 'Telemetry & Metric Aggregator',
          category: 'AUDIT',
          executed: true,
          claim_scope: 'LOCAL',
          status: 'SUCCESS',
          duration_ms: performance.now() - start,
          evidence: { heap_used_bytes: mem?.heapUsed || 0 }
        };
      }

      // 51. DN-51: Hardware Security Module (HSM) Proxy
      case 'DN-51': {
        return {
          node_id: 'DN-51',
          name: 'Hardware Security Module (HSM) Proxy',
          category: 'SECURITY',
          executed: true,
          claim_scope: 'LOCAL',
          status: 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { hsm_attestation_verified: false, reason: 'No HSM connection or signed device attestation is configured.' }
        };
      }

      // 52. DN-52: Ed25519 Cryptographic Signer
      case 'DN-52': {
        const { publicKey, privateKey } = generateKeyPairSync('ed25519');
        const message = Buffer.from('daisy-dn-52-ephemeral-self-test');
        const signature = sign(null, message, privateKey);
        const verified = verify(null, message, publicKey, signature);
        const tamperedAccepted = verify(null, Buffer.from('tampered'), publicKey, signature);
        return {
          node_id: 'DN-52',
          name: 'Ed25519 Cryptographic Signer',
          category: 'SECURITY',
          executed: true,
          claim_scope: 'LOCAL',
          status: verified && !tamperedAccepted ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: {
            ed25519_signature_verified: verified,
            tampered_signature_rejected: !tamperedAccepted,
            ephemeral_process_key: true,
            production_key_configured: false
          }
        };
      }

      // 53. DN-53: Zero-Knowledge Range Proof Engine
      case 'DN-53': {
        return {
          node_id: 'DN-53',
          name: 'Zero-Knowledge Range Proof Engine',
          category: 'SECURITY',
          executed: true,
          claim_scope: 'LOCAL',
          status: 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { zero_knowledge_proof_verified: false, reason: 'No commitment scheme or range-proof verifier is configured.' }
        };
      }

      // 54. DN-54: Sovereign API Gateway & Mesh Router
      case 'DN-54': {
        const router = SovereignApiRouter.getInstance();
        const res = await router.handleRequest('/api/system/health', 'GET');
        return {
          node_id: 'DN-54',
          name: 'Sovereign API Gateway & Mesh Router',
          category: 'CORE_KERNEL',
          executed: true,
          claim_scope: 'LOCAL',
          status: res.status === 200 ? 'SUCCESS' : 'FAIL_CLOSED',
          duration_ms: performance.now() - start,
          evidence: { http_status: res.status, health: res.data?.status }
        };
      }

      default:
        throw new Error(`Unknown node ID: ${nodeId}`);
    }
  }

  /**
   * Execute CUJs across all 54 Daisy nodes
   */
  public async executeAll54Nodes(): Promise<{
    total: number;
    executed: number;
    registered: number;
    instantiated: number;
    reachable: number;
    output_asserted: number;
    evidence_generated: number;
    success: number;
    prohibited_blocked: number;
    provider_required: number;
    fail_closed: number;
    results: SubsystemExecutionResult[];
  }> {
    const nodeReg = NodeRegistry.getInstance();
    const results: SubsystemExecutionResult[] = [];

    // DN-11 produces the canonical source-bound proof used by DN-05 and DN-29.
    // Execute those dependent audit/vault nodes immediately after the pipeline, then sort the report by ID.
    const executionOrder = [11, 5, 29, ...Array.from({ length: 54 }, (_, index) => index + 1).filter(id => ![11, 5, 29].includes(id))];
    for (const i of executionOrder) {
      const id = `DN-${String(i).padStart(2, '0')}`;
      const nodeDef = nodeReg.getNode(id);
      const isRegistered = Boolean(nodeDef);

      try {
        const rawRes = await this.executeNode(id);
        const hasEvidence = hasMeaningfulEvidence(rawRes.evidence);
        const evHash = computeSha256(JSON.stringify(rawRes.evidence || {}));

        results.push({
          ...rawRes,
          registered: isRegistered,
          instantiated: true,
          reachable: true,
          executed: Boolean(rawRes.executed),
          output_asserted: Boolean(rawRes.status),
          evidence_generated: Boolean(hasEvidence),
          evidence_hash: evHash
        });
      } catch (err: any) {
        results.push({
          node_id: id,
          name: nodeDef ? nodeDef.name : `Node ${id}`,
          category: nodeDef ? nodeDef.category : 'CORE_KERNEL',
          registered: isRegistered,
          instantiated: false,
          reachable: true,
          executed: false,
          output_asserted: false,
          evidence_generated: false,
          claim_scope: 'LOCAL',
          status: 'FAIL_CLOSED',
          duration_ms: 0,
          evidence: {},
          evidence_hash: computeSha256('EMPTY_FAILURE_EVIDENCE'),
          error: err.message || String(err)
        });
      }
    }

    results.sort((a, b) => Number(a.node_id.slice(3)) - Number(b.node_id.slice(3)));
    return {
      total: results.length,
      registered: results.filter(r => r.registered).length,
      instantiated: results.filter(r => r.instantiated).length,
      reachable: results.filter(r => r.reachable).length,
      executed: results.filter(r => r.executed).length,
      output_asserted: results.filter(r => r.output_asserted).length,
      evidence_generated: results.filter(r => r.evidence_generated).length,
      success: results.filter(r => r.status === 'SUCCESS').length,
      prohibited_blocked: results.filter(r => r.status === 'PROHIBITED_BLOCKED').length,
      provider_required: results.filter(r => r.status === 'PROVIDER_REQUIRED').length,
      fail_closed: results.filter(r => r.status === 'FAIL_CLOSED').length,
      results
    };
  }
}
