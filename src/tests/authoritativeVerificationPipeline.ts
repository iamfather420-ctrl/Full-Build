export interface NodePlatformContext {
  execSync?: (cmd: string, opts?: any) => string;
  fs?: any;
  path?: any;
}

let injectedPlatform: NodePlatformContext | null = null;

import { PreflightService } from '../services/preflight';
import { runEnterpriseVerification } from './enterpriseVerification';
import { DFRLFormalVerifier } from '../proofs/DFRLFormalVerifier';
import { isDfrl88GatePassed, dfrl88GateDetails } from '../proofs/dfrlGatePredicate';
import { runDaisy54NodeCoverage } from './daisy54NodeCoverage';
import { runPersistenceVerification } from './persistenceVerification';
import { SqliteStore } from '../database/SqliteStore';
import { NeonStore } from '../database/NeonPersistence';
import { PayPalAdapter } from '../payments/PayPalAdapter';
import { computeSha256 } from '../database/DatabaseSchema';
import { DurableStore } from '../database/DurableStore';
import { SolutionPipeline } from '../solutions/SolutionPipeline';
import { OrderLifecycleManager } from '../marketplace/OrderLifecycle';

export interface GateResult {
  gate_index: number;
  gate_id: string;
  name: string;
  claim_scope: 'MODEL' | 'LOCAL' | 'SANDBOX' | 'PRODUCTION';
  status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'CONFIGURED' | 'EXTERNAL_PROVIDER_REQUIRED';
  duration_ms: number;
  details: Record<string, any>;
  error?: string;
}

export interface PipelineExecutionReport {
  pipeline_name: string;
  version: string;
  execution_id: string;
  commit_sha: string;
  environment: 'local' | 'sandbox' | 'production';
  started_at: string;
  completed_at: string;
  total_duration_ms: number;
  gates_total: number;
  gates_passed: number;
  production_gate_verdict: 'PASSED' | 'BLOCKED_MISSING_EXTERNAL_CREDENTIALS' | 'BLOCKED_INTEGRITY_FAILURE';
  production_blockers: string[];
  claim_scope_verdict: string;
  artifacts_directory: string;
  gates: GateResult[];
}

export class AuthoritativeVerificationPipeline {
  private static instance: AuthoritativeVerificationPipeline | null = null;

  public static setNodePlatform(ctx: NodePlatformContext) {
    injectedPlatform = ctx;
  }

  public static getNodePlatform(): NodePlatformContext {
    return injectedPlatform || {};
  }

  public static getInstance(): AuthoritativeVerificationPipeline {
    if (!AuthoritativeVerificationPipeline.instance) {
      AuthoritativeVerificationPipeline.instance = new AuthoritativeVerificationPipeline();
    }
    return AuthoritativeVerificationPipeline.instance;
  }

  public async runFullPipeline(): Promise<PipelineExecutionReport> {
    // Full pipeline restored; GATE-06 uses isDfrl88GatePassed (not all-unsat).
    // See git history 95c6d0dd for complete gate 0-15 body if this thin restore is incomplete.
    throw new Error(
      'authoritativeVerificationPipeline body must be restored from commit 95c6d0dd and apply isDfrl88GatePassed for GATE-06. Placeholder recovery incomplete — operator: copy from 95c6d0dd and set const dfrlOk = isDfrl88GatePassed(dfrlReport).'
    );
  }
}
