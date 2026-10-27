/**
 * Typed domain repository contracts for Neon.
 * Generic payload_json writes remain blocked in NeonStore.
 * Implementations must map real columns, enforce tenant_id, and support
 * idempotency + restart readback before any production enablement.
 */

export type DomainEntityStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'BLOCKED';

export interface TenantScopedId {
  tenant_id: string;
  id: string;
}

export interface ProblemRecord extends TenantScopedId {
  title: string;
  description: string;
  status: DomainEntityStatus;
  created_at: number;
  updated_at: number;
}

export interface SolutionRecord extends TenantScopedId {
  problem_id: string;
  verification_status: DomainEntityStatus;
  proof_bundle_id: string | null;
  created_at: number;
}

export interface OfferRecord extends TenantScopedId {
  solution_id: string;
  proof_bundle_id: string;
  title: string;
  price_cents: number;
  published: boolean;
  verification_status: DomainEntityStatus;
  created_at: number;
}

export interface OrderRecord extends TenantScopedId {
  offer_id: string;
  status: 'OFFER' | 'AUTHORIZED' | 'FULFILLED' | 'CANCELLED' | 'BLOCKED';
  price_cents: number;
  idempotency_key: string | null;
  created_at: number;
}

export interface AuditRecord extends TenantScopedId {
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  payload_hash: string;
  created_at: number;
}

export interface RepositoryWriteResult<T> {
  success: boolean;
  record?: T;
  error?: string;
  code?: string;
}

export interface ProblemRepository {
  create(tenantId: string, input: Omit<ProblemRecord, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<RepositoryWriteResult<ProblemRecord>>;
  getById(tenantId: string, id: string): Promise<ProblemRecord | null>;
  listByTenant(tenantId: string, limit?: number): Promise<ProblemRecord[]>;
}

export interface SolutionRepository {
  create(tenantId: string, input: Omit<SolutionRecord, 'id' | 'tenant_id' | 'created_at'>): Promise<RepositoryWriteResult<SolutionRecord>>;
  getById(tenantId: string, id: string): Promise<SolutionRecord | null>;
}

export interface OfferRepository {
  create(tenantId: string, input: Omit<OfferRecord, 'id' | 'tenant_id' | 'created_at'>): Promise<RepositoryWriteResult<OfferRecord>>;
  getById(tenantId: string, id: string): Promise<OfferRecord | null>;
  listPublished(tenantId: string, limit?: number): Promise<OfferRecord[]>;
}

export interface OrderRepository {
  create(tenantId: string, input: Omit<OrderRecord, 'id' | 'tenant_id' | 'created_at'>): Promise<RepositoryWriteResult<OrderRecord>>;
  getById(tenantId: string, id: string): Promise<OrderRecord | null>;
  getByIdempotencyKey(tenantId: string, key: string): Promise<OrderRecord | null>;
}

export interface AuditRepository {
  append(record: Omit<AuditRecord, 'id'>): Promise<RepositoryWriteResult<AuditRecord>>;
  listByTenant(tenantId: string, limit?: number): Promise<AuditRecord[]>;
}
