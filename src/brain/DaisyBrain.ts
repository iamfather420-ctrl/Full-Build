import { NodeRegistry } from '../nodes/NodeRegistry';
import { ParadoxRegistry } from '../paradoxes/ParadoxRegistry';
import { DurableStore } from '../database/DurableStore';
import { SqliteStore } from '../database/SqliteStore';
import { REAL_88_PARADOX_REGISTRY } from '../data/paradoxData';
import { vaultService } from '../services/vaultService';
import { PayPalAdapter } from '../payments/PayPalAdapter';
import { NeonStore } from '../database/NeonPersistence';
import { DaisyActivationGate } from './DaisyActivationGate';
import { DaisyReasoningKernel, ReasoningComponent, TetherEdge, CompositeCandidate } from './DaisyReasoningKernel';

export interface CompleteBrainState {
  core_engine: string;
  version: string;
  environment: 'local' | 'sandbox' | 'production';
  architecture: string;
  status: string;
  claim_scope: 'MODEL_VERIFIED' | 'LOCAL_VERIFIED' | 'SANDBOX_VERIFIED' | 'PRODUCTION_VERIFIED' | 'EXTERNAL_PROVIDER_REQUIRED';
  intelligence_nexus: {
    total_nodes: number;
    code_executed_nodes: number;
    external_provider_nodes: number;
    dfrl_operators: number;
    dfrl_machine_checked: number;
    solvex_paradoxes: number;
    solvex_verified: number;
    pipeline_stages: number;
    sqlite_relational_tables: number;
    solutions_preserved: number;
    proof_bundles_sealed: number;
  };
  consensus_telemetry: {
    network: string;
    merkle_root: string;
    total_minted_supply_agate: number;
    total_burned_waste_kg: number;
    active_harvesters: number;
    confirmed_transactions: number;
    canonical_ledger_status: string;
  };
  formal_reasoning: {
    prover_engine: string;
    kernel_version: string;
    logic_standard: string;
    smt_propositions_verified: number;
    total_propositions: number;
    formal_proof_rate: string;
    deterministic_replays_matched: number;
    claim_scope: string;
  };
  gateways_status: {
    paypal_dn35: {
      status: string;
      configured: boolean;
      environment: string;
      claim_scope: string;
    };
    neon_dn34: {
      status: string;
      configured: boolean;
      claim_scope: string;
      local_fallback_active: boolean;
    };
    escrow_dn38: {
      status: string;
      mode: string;
      claim_scope: string;
    };
    stripe_dn36: {
      status: string;
      policy: string;
    };
  };
  activation_status: 'INACTIVE' | 'ACTIVE' | 'BLOCKED';
  integrity_sentinel: {
    fail_closed_active: boolean;
    audit_chain_continuous: boolean;
    audit_chain_blocks: number;
    anti_tamper_monitor: string;
    anti_mock_attestation: string;
    mock_patterns_detected: number | null;
  };
  truth_pillars: {
    pillar_1_identity: string;
    pillar_2_privacy: string;
    pillar_3_financial_health: string;
    pillar_4_guardianship: string;
  };
  timestamp: number;
}

export class DaisyBrain {
  private static instance: DaisyBrain | null = null;
  private verifiedDFRLCount: number = 0;
  private verifiedReplayCount: number = 0;
  private readonly reasoningKernel = new DaisyReasoningKernel();

  private constructor() {}

  public static getInstance(): DaisyBrain {
    if (!DaisyBrain.instance) {
      DaisyBrain.instance = new DaisyBrain();
    }
    return DaisyBrain.instance;
  }

  public recordDFRLVerification(verifiedCount: number, replayCount: number): void {
    // Counts are accepted only after the activation record carries a complete,
    // fresh-shaped corpus/gate result. Missing or incomplete evidence resets to zero.
    const evidence = DaisyActivationGate.read();
    const corpus = evidence?.corpus;
    const gates = evidence?.mandatory_gates;
    const complete = evidence?.status === 'ACTIVE'
      && corpus?.total_required === 120
      && corpus?.dfrl_required === 88
      && corpus?.dh_required === 32
      && corpus?.executed === 120
      && corpus?.deterministic_replays === 120
      && corpus?.unknown === 0
      && corpus?.errors === 0
      && typeof gates?.total === 'number'
      && gates.total > 0
      && gates.passed === gates.total
      && gates.failed === 0;
    const validCounts = Number.isInteger(verifiedCount)
      && Number.isInteger(replayCount)
      && verifiedCount >= 0 && verifiedCount <= 88
      && replayCount >= 0 && replayCount <= 88;
    if (!complete || !validCounts) {
      this.verifiedDFRLCount = 0;
      this.verifiedReplayCount = 0;
      return;
    }
    this.verifiedDFRLCount = verifiedCount;
    this.verifiedReplayCount = replayCount;
  }

  public isAutonomousReasoningActive(): boolean {
    return DaisyActivationGate.isActive();
  }

  public proposeCompositeCandidate(
    problemId: string,
    components: ReasoningComponent[],
    tetherEdges: TetherEdge[],
    rationale: string
  ): CompositeCandidate {
    // The reasoning kernel itself fail-closes against the corpus activation gate.
    return this.reasoningKernel.proposeCompositeCandidate(problemId, components, tetherEdges, rationale);
  }

  public getLiveBrainState(): CompleteBrainState {
    const nodeReg = NodeRegistry.getInstance();
    const paradoxReg = ParadoxRegistry.getInstance();
    const durable = DurableStore.getInstance();
    const chainVerification = durable.verifyChain();
    const ledger = vaultService.getLedger();
    const nodes = nodeReg.getAllNodes();

    const env = ((typeof process !== 'undefined' && process.env?.SOLVEX_ENV) || 'local').toLowerCase() as 'local' | 'sandbox' | 'production';
    const activationGate = DaisyActivationGate.read();
    const brainActive = activationGate?.status === 'ACTIVE';

    const pp = PayPalAdapter.getInstance();
    const ppCreds = pp.getEffectiveCredentials();
    const hasPayPal = pp.hasActiveCredentials();

    const neon = NeonStore.getInstance();
    const hasNeon = neon.isConfigured();

    // Compute exact claim scope based on genuine environment & provider states
    let brainClaimScope: CompleteBrainState['claim_scope'] = 'LOCAL_VERIFIED';
    if (env === 'production') {
      // Per Sovereign Directive: Credentials alone must never select production. Production evidence requires actual production execution.
      brainClaimScope = 'EXTERNAL_PROVIDER_REQUIRED';
    } else if (env === 'sandbox') {
      brainClaimScope = 'LOCAL_VERIFIED';
    } else {
      brainClaimScope = 'LOCAL_VERIFIED';
    }

    // Dynamic relational tables count from SQLite master
    let sqliteTableCount = 0;
    try {
      const db = SqliteStore.getInstance().getRawDb();
      const tables = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      sqliteTableCount = tables.length;
    } catch {
      sqliteTableCount = 0;
    }

    const totalOps = REAL_88_PARADOX_REGISTRY.length;
    const proofPct = totalOps > 0 ? ((this.verifiedDFRLCount / totalOps) * 100).toFixed(1) : '0.0';

    return {
      core_engine: 'dAIsy haMINJA Autonomous Problem Solving & Formal Reasoning Brain',
      version: `1.0.0-${env.toUpperCase()} (SOLVEX + Daisy Haminja Sovereign Unified Core)`, 
      environment: env,
      architecture: 'Neural-Symbolic SMT Formal Verifier + 54-Node Sovereign Mesh',
      status: brainActive ? brainClaimScope : 'EXTERNAL_PROVIDER_REQUIRED',
      claim_scope: brainActive ? brainClaimScope : 'EXTERNAL_PROVIDER_REQUIRED',
      intelligence_nexus: {
        total_nodes: nodes.length,
        code_executed_nodes: nodes.filter(n => n.execution_mode === 'CODE_EXECUTED').length,
        external_provider_nodes: nodes.filter(n => n.execution_mode === 'EXTERNAL_PROVIDER_REQUIRED').length,
        dfrl_operators: totalOps,
        dfrl_machine_checked: this.verifiedDFRLCount,
        solvex_paradoxes: paradoxReg.getAllParadoxes().length,
        solvex_verified: paradoxReg.getStatusBreakdown()['VERIFIED'] || 0,
        pipeline_stages: 21,
        sqlite_relational_tables: sqliteTableCount,
        solutions_preserved: Object.keys(durable.getState().solutions).length,
        proof_bundles_sealed: Object.keys(durable.getState().proof_bundles).length
      },
      consensus_telemetry: {
        network: ledger.network || 'UNVERIFIED',
        merkle_root: ledger.merkle_root,
        total_minted_supply_agate: ledger.Sovereign_Wallet_System.total_supply,
        total_burned_waste_kg: ledger.Sovereign_Wallet_System.burned_waste_kg_total,
        active_harvesters: ledger.Sovereign_Wallet_System.active_harvesters_count,
        confirmed_transactions: ledger.transactions.length,
        canonical_ledger_status: 'UNVERIFIED'
      },
      formal_reasoning: {
        prover_engine: 'Microsoft Research Z3 Automated Theorem Prover',
        kernel_version: 'WebAssembly Native Kernel v5.2.0',
        logic_standard: 'SMT-LIB v2.6 (QF_UF, QF_LIA, QF_BV)',
        smt_propositions_verified: this.verifiedDFRLCount,
        total_propositions: totalOps,
        formal_proof_rate: `${proofPct}% (${this.verifiedDFRLCount}/${totalOps} UNSAT Proved)`,
        deterministic_replays_matched: this.verifiedReplayCount,
        claim_scope: 'MODEL_VERIFIED'
      },
      gateways_status: {
        paypal_dn35: {
          status: hasPayPal ? 'CONFIGURED' : 'EXTERNAL_PROVIDER_REQUIRED',
          configured: hasPayPal,
          environment: ppCreds?.environment || 'sandbox',
          claim_scope: hasPayPal ? 'LOCAL' : 'LOCAL'
        },
        neon_dn34: {
          status: hasNeon ? 'CONFIGURED' : 'EXTERNAL_PROVIDER_REQUIRED',
          configured: hasNeon,
          claim_scope: 'LOCAL',
          local_fallback_active: !hasNeon
        },
        escrow_dn38: {
          status: 'CODE_EXECUTED',
          mode: 'SOVEREIGN_SETTLEMENT_ESCROW_ENGINE',
          claim_scope: 'LOCAL'
        },
        stripe_dn36: {
          status: 'PROHIBITED_BLOCKED',
          policy: 'Stripe prohibited per Sovereign Directive; fiat settlements exclusively route via PayPal DN-35'
        }
      },
      activation_status: brainActive ? 'ACTIVE' : 'BLOCKED',
      integrity_sentinel: {
        fail_closed_active: true,
        audit_chain_continuous: chainVerification.valid,
        audit_chain_blocks: durable.getState().audit_chain.length,
        anti_tamper_monitor: 'UNVERIFIED', 
        anti_mock_attestation: 'UNVERIFIED: independent mock-pattern scan evidence is not connected',
        mock_patterns_detected: null
      },
      truth_pillars: {
        pillar_1_identity: 'Human-controlled identity: authentication remains blocked until identity and recovery controls are verified',
        pillar_2_privacy: 'Privacy by design: data sharing and telemetry require explicit authorization and verified controls',
        pillar_3_financial_health: 'Financial safety: payment processing remains disabled until provider integration and authorization are verified',
        pillar_4_guardianship: 'Human guardianship: consequential execution requires explicit authorization and fail-closed controls'
      },
      timestamp: Date.now()
    };
  }
}
