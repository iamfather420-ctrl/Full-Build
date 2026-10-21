/**
 * Compatibility adapter for the authoritative DH witness registry.
 *
 * This file used to contain a second, contradictory 32-case registry.
 * Keeping a duplicate registry created the possibility of executing one set
 * of propositions while displaying another. The authoritative SAT witness
 * contracts now have a single source of truth.
 */
import { AUTHORITATIVE_32_DH_CONTRACTS } from '../formal/dhAuthoritativeFormalContracts';
import { computeSha256 } from '../database/DatabaseSchema';

export type DHScope = 'MODEL_VERIFIED' | 'MODEL_VERIFIED_BOUNDED' | 'MODEL_VERIFIED_AXIOMATIC';

export interface DHFormalContract {
  case_id: string;
  name: string;
  domain: string;
  statement: string;
  formal_proposition: string;
  assumptions: string[];
  axioms: string[];
  constraints: string[];
  expected_result: 'sat';
  scope: DHScope;
  formalization_method: string;
  z3_smt_assertion: string;
  contract_hash: string;
  source_hash: string;
}

export const AUTHORITATIVE_DH_CONTRACTS: DHFormalContract[] =
  AUTHORITATIVE_32_DH_CONTRACTS.map(contract => ({
    ...contract,
    expected_result: 'sat',
    source_hash: computeSha256(contract.source_file)
  }));

export const DH_FORMAL_CONTRACTS = AUTHORITATIVE_DH_CONTRACTS;
export const DH32_FORMAL_CONTRACTS = AUTHORITATIVE_DH_CONTRACTS;
