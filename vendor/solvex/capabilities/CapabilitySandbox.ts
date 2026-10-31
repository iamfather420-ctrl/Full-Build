import { CapabilityRegistry } from './CapabilityRegistry';
import { ProcedureStore } from '../knowledge/ProcedureStore';
import { HumanApprovalGate } from '../governance/HumanApprovalGate';
import type { UserContext } from '../auth/AuthService';

export interface SandboxRequest {
  name: string;
  description: string;
  procedureBody: string;
  tests: Array<(body: string) => boolean>;
}

export interface SandboxReport {
  status: 'BLOCKED' | 'APPROVAL_REQUIRED';
  deployed: false;
  capability_id: string;
  evidence_sha256: string | null;
  tests_passed: number;
  tests_failed: number;
  reason: string;
}

/**
 * Development runs here. The sandbox can verify a proposal. It cannot deploy,
 * publish, pay, or treat its own result as authorization.
 */
export class CapabilitySandbox {
  constructor(
    private readonly registry: CapabilityRegistry,
    private readonly procedures: ProcedureStore,
    private readonly approvals: HumanApprovalGate,
  ) {}

  public develop(input: SandboxRequest, user: UserContext | null = null): SandboxReport {
    const capability = this.registry.propose(input.name, input.description);
    const procedure = this.procedures.add('VALIDATED_PROCEDURE', input.procedureBody);
    const review = this.procedures.review(procedure.id);
    let passed = 0;
    let failed = 0;
    for (const test of input.tests) {
      if (test(input.procedureBody)) passed += 1;
      else failed += 1;
    }
    if (!review.ok || failed > 0) {
      const reason = review.reason ?? 'BLOCKED: sandbox tests failed.';
      this.registry.block(capability.id, reason);
      return {
        status: 'BLOCKED',
        deployed: false,
        capability_id: capability.id,
        evidence_sha256: review.sha256 || null,
        tests_passed: passed,
        tests_failed: failed,
        reason,
      };
    }
    const marked = this.procedures.markValidated(procedure.id, review.sha256);
    const verified = marked.ok ? this.registry.markVerified(capability.id, review.sha256) : marked;
    if (!verified.ok) {
      this.registry.block(capability.id, verified.reason);
      return {
        status: 'BLOCKED',
        deployed: false,
        capability_id: capability.id,
        evidence_sha256: review.sha256,
        tests_passed: passed,
        tests_failed: failed,
        reason: verified.reason,
      };
    }
    const deployment = this.registry.deploy(capability.id, user);
    const modelAttempt = this.approvals.decideFromModel(input.procedureBody);
    return {
      status: 'APPROVAL_REQUIRED',
      deployed: false,
      capability_id: capability.id,
      evidence_sha256: review.sha256,
      tests_passed: passed,
      tests_failed: failed,
      reason: deployment.deployed ? modelAttempt.reason : deployment.reason,
    };
  }
}
