import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runEnterpriseVerification } from './enterpriseVerification';
import { DFRLFormalVerifier } from '../proofs/DFRLFormalVerifier';
import { SqliteStore } from '../database/SqliteStore';
import { NeonStore } from '../database/NeonPersistence';
import { PayPalAdapter } from '../payments/PayPalAdapter';

export interface GateResult {
  gate_index: number;
  gate_id: string;
  name: string;
  claim_scope: 'LOCAL' | 'MODEL' | 'SANDBOX' | 'PRODUCTION';
  status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'EXTERNAL_PROVIDER_REQUIRED';
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
  completed_at: string;
  gates_total: number;
  gates_passed: number;
  production_gate_verdict: 'PASSED' | 'SANDBOX_VERIFIED' | 'BLOCKED_MISSING_EXTERNAL_CREDENTIALS' | 'BLOCKED_INTEGRITY_FAILURE';
  production_blockers: string[];
  claim_scope_verdict: string;
  artifacts_directory: string;
  gates: GateResult[];
}

/** Production claims require the GitHub Actions secrets already stored on the repository. No asset-specific PayPal product is required. */
export class AuthoritativeVerificationPipeline {
  private static instance: AuthoritativeVerificationPipeline | null = null;

  public static getInstance(): AuthoritativeVerificationPipeline {
    if (!AuthoritativeVerificationPipeline.instance) {
      AuthoritativeVerificationPipeline.instance = new AuthoritativeVerificationPipeline();
    }
    return AuthoritativeVerificationPipeline.instance;
  }

  public async runFullPipeline(): Promise<PipelineExecutionReport> {
    const started = Date.now();
    const gates: GateResult[] = [];
    const artifacts = path.resolve(process.cwd(), 'artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    const add = (
      id: string,
      name: string,
      scope: GateResult['claim_scope'],
      status: GateResult['status'],
      details: Record<string, any>,
      error?: string
    ) => gates.push({ gate_index: gates.length, gate_id: id, name, claim_scope: scope, status, duration_ms: Date.now() - started, details, error });

    const env = ((process.env.SOLVEX_ENV || 'local').toLowerCase() as PipelineExecutionReport['environment']);
    let commitSha = 'SOURCE_SNAPSHOT_UNVERSIONED';
    try {
      commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      commitSha = 'SOURCE_SNAPSHOT_UNVERSIONED';
    }

    const enterprise = await runEnterpriseVerification();
    add(
      'GATE-01',
      'Security and tenant-isolation regressions',
      'LOCAL',
      enterprise.allPassed ? 'PASSED' : 'FAILED',
      { total: enterprise.totalTests, passed: enterprise.passedTests },
      enterprise.allPassed ? undefined : 'One or more security gates failed'
    );

    const dfrl = await DFRLFormalVerifier.getInstance().verifyAll88();
    add(
      'GATE-02',
      'DFRL model verification',
      'MODEL',
      dfrl.overall_status === 'VERIFIED' ? 'PASSED' : 'FAILED',
      { executed: dfrl.executed, unsat: dfrl.unsat_count, scope: dfrl.claim_scope }
    );

    const candidates = SqliteStore.getInstance().findAllRecords<any>('solutions', 1000);
    const verified = candidates.filter(candidate => candidate.verification_status === 'VERIFIED').length;
    add('GATE-03', 'Marketplace publication inventory', 'LOCAL', 'PASSED', {
      total_solution_records: candidates.length,
      independently_verified: verified,
      marketplace_published: 0,
      policy: 'Inventory is reported. It is not a production credential.'
    });

    const paypal = await PayPalAdapter.getInstance().verifyCredentials();
    const neon = NeonStore.getInstance();
    const neonConnected = neon.isConfigured() ? await neon.connect() : false;
    const neonStatus = neon.getStatus();
    const blockers: string[] = [];
    const sandboxReady = paypal.ok && paypal.environment === 'sandbox';
    const liveReady = paypal.ok && paypal.environment === 'live' && env === 'production';
    if (!sandboxReady && !liveReady) {
      blockers.push(paypal.error || 'PayPal sandbox OAuth did not succeed. Expected Actions secrets PAYPAL_SANDBOX_CLIENT_ID and PAYPAL_SANDBOX_CLIENT_SECRET.');
    }
    if (!neonConnected) {
      blockers.push(neonStatus.last_error || 'Neon connection failed. Expected Actions secret NEON_DATABASE_URL.');
    }

    const integrityFailed = gates.some(gate => gate.status === 'FAILED');
    const providerReady = !integrityFailed && blockers.length === 0 && (sandboxReady || liveReady);
    const claimScope = liveReady ? 'PRODUCTION' : sandboxReady ? 'SANDBOX' : 'LOCAL';
    add(
      'GATE-04',
      'PayPal provider boundary',
      claimScope,
      providerReady ? 'PASSED' : 'BLOCKED',
      {
        paypal_environment: paypal.environment,
        paypal_authenticated: paypal.ok,
        live_api_called: paypal.environment === 'live',
        neon_configured: neon.isConfigured(),
        neon_connected: neonConnected,
        blockers
      },
      providerReady ? undefined : blockers.join(' ')
    );

    const report: PipelineExecutionReport = {
      pipeline_name: 'SOLVEX Truth-Boundary Verification',
      version: '2.2.0',
      execution_id: `verification_${Date.now()}`,
      commit_sha: commitSha,
      environment: env,
      completed_at: new Date().toISOString(),
      gates_total: gates.length,
      gates_passed: gates.filter(gate => gate.status === 'PASSED').length,
      production_gate_verdict: providerReady
        ? (liveReady ? 'PASSED' : 'SANDBOX_VERIFIED')
        : integrityFailed
          ? 'BLOCKED_INTEGRITY_FAILURE'
          : 'BLOCKED_MISSING_EXTERNAL_CREDENTIALS',
      production_blockers: blockers,
      claim_scope_verdict: liveReady && providerReady
        ? 'PRODUCTION_VERIFIED'
        : sandboxReady && providerReady
          ? 'SANDBOX_VERIFIED'
          : 'LOCAL_SECURITY_VERIFIED / MODEL_VERIFIED; PROVIDER_CHECK_BLOCKED',
      artifacts_directory: artifacts,
      gates
    };

    fs.writeFileSync(path.join(artifacts, 'authoritative-verification-v2.json'), JSON.stringify({ report, enterprise, dfrl_summary: { executed: dfrl.executed, status: dfrl.overall_status, root: dfrl.verification_root_sha256 } }, null, 2));
    fs.writeFileSync(path.join(artifacts, 'production-gate-evaluation.json'), JSON.stringify(report, null, 2));
    return report;
  }
}
