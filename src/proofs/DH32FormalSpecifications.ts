/**
 * PROJECT AGATE / DAISY / SOLVEX
 * Unified 32-case DH witness specifications.
 *
 * The authoritative source is the same SAT witness registry consumed by
 * DHFormalVerifier. This adapter intentionally removes the former duplicate
 * UNSAT theorem registry so the 120-case pipeline cannot diverge.
 */
import { AUTHORITATIVE_32_DH_CONTRACTS } from '../formal/dhAuthoritativeFormalContracts';

export interface DH32ParadoxSpec {
  code: string;
  name: string;
  domain: string;
  canonical_family: string;
  claim: string;
  mathematical_rationale: string;
  expected_result: 'sat';
  z3_smt_assertion: string;
}

export const DH32_PARADOX_SPECS: DH32ParadoxSpec[] =
  AUTHORITATIVE_32_DH_CONTRACTS.map(contract => ({
    code: contract.case_id,
    name: contract.name,
    domain: contract.domain,
    canonical_family: contract.domain,
    claim: contract.formal_proposition,
    mathematical_rationale: contract.statement,
    expected_result: 'sat',
    z3_smt_assertion: contract.z3_smt_assertion
  }));
