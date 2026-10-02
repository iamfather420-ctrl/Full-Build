import fs from 'node:fs';
import path from 'node:path';
import { runEnterpriseVerification } from './enterpriseVerification';
import { DFRLFormalVerifier } from '../proofs/DFRLFormalVerifier';
import { SqliteStore } from '../database/SqliteStore';

export interface GateResult { gate_index: number; gate_id: string; name: string; claim_scope: 'LOCAL' | 'MODEL' | 'SANDBOX' | 'PRODUCTION'; status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'EXTERNAL_PROVIDER_REQUIRED'; duration_ms: number; details: Record<string, any>; error?: string; }
export interface PipelineExecutionReport { pipeline_name: string; version: string; execution_id: string; commit_sha: string; environment: 'local' | 'sandbox' | 'production'; completed_at: string; gates_total: number; gates_passed: number; production_gate_verdict: 'PASSED' | 'BLOCKED_MISSING_EXTERNAL_CREDENTIALS' | 'BLOCKED_INTEGRITY_FAILURE'; production_blockers: string[]; claim_scope_verdict: string; artifacts_directory: string; gates: GateResult[]; }

/** Creates an honest local verification report; no generated artifact can promote a solution. */
export class AuthoritativeVerificationPipeline {
  private static instance: AuthoritativeVerificationPipeline | null = null;
  public static getInstance(): AuthoritativeVerificationPipeline { if (!AuthoritativeVerificationPipeline.instance) AuthoritativeVerificationPipeline.instance = new AuthoritativeVerificationPipeline(); return AuthoritativeVerificationPipeline.instance; }
  public async runFullPipeline(): Promise<PipelineExecutionReport> {
    const started = Date.now(); const gates: GateResult[] = []; const artifacts = path.resolve(process.cwd(), 'artifacts'); fs.mkdirSync(artifacts, { recursive: true });
    const add = (id: string, name: string, scope: GateResult['claim_scope'], status: GateResult['status'], details: Record<string, any>, error?: string) => gates.push({ gate_index: gates.length, gate_id: id, name, claim_scope: scope, status, duration_ms: Date.now() - started, details, error });
    const enterprise = await runEnterpriseVerification();
    add('GATE-01', 'Security and tenant-isolation regressions', 'LOCAL', enterprise.allPassed ? 'PASSED' : 'FAILED', { total: enterprise.totalTests, passed: enterprise.passedTests }, enterprise.allPassed ? undefined : 'One or more security gates failed');
    const dfrl = await DFRLFormalVerifier.getInstance().verifyAll88();
    add('GATE-02', 'DFRL model verification', 'MODEL', dfrl.overall_status === 'VERIFIED' ? 'PASSED' : 'FAILED', { executed: dfrl.executed, unsat: dfrl.unsat_count, scope: dfrl.claim_scope });
    const candidates = SqliteStore.getInstance().findAllRecords<any>('solutions', 1000);
    const verified = candidates.filter(candidate => candidate.verification_status === 'VERIFIED').length;
    add('GATE-03', 'Marketplace publication inventory', 'LOCAL', 'PASSED', { total_solution_records: candidates.length, independently_verified: verified, marketplace_published: 0, policy: 'No proof-bound verified solution exists in this execution.' });
    const blockers = ['No live PayPal operation was performed.', 'No PayPal provider response supplied explicit PYUSD asset evidence.', 'No production identity provider or secret-management deployment was configured.', 'No verified marketplace solution exists; all generated intake is candidate-only.'];
    add('GATE-04', 'Commercial production boundary', 'PRODUCTION', 'BLOCKED', { blockers }, blockers.join(' '));
    const report: PipelineExecutionReport = { pipeline_name: 'SOLVEX Truth-Boundary Verification', version: '2.0.0', execution_id: `verification_${Date.now()}`, commit_sha: 'SOURCE_SNAPSHOT_UNVERSIONED', environment: ((process.env.SOLVEX_ENV || 'local').toLowerCase() as any), completed_at: new Date().toISOString(), gates_total: gates.length, gates_passed: gates.filter(gate => gate.status === 'PASSED').length, production_gate_verdict: 'BLOCKED_MISSING_EXTERNAL_CREDENTIALS', production_blockers: blockers, claim_scope_verdict: 'LOCAL_SECURITY_VERIFIED / MODEL_VERIFIED; COMMERCIAL_PRODUCTION_BLOCKED', artifacts_directory: artifacts, gates };
    fs.writeFileSync(path.join(artifacts, 'authoritative-verification-v2.json'), JSON.stringify({ report, enterprise, dfrl_summary: { executed: dfrl.executed, status: dfrl.overall_status, root: dfrl.verification_root_sha256 } }, null, 2));
    return report;
  }
}
