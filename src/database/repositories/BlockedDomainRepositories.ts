/**
 * Fail-closed typed domain repositories.
 * Wired as the default until staging verifies schema columns, RLS, and readback.
 * Never silently falls back to payload_json or SQLite for cloud domain writes.
 */
import {
  AuditRecord,
  AuditRepository,
  OfferRecord,
  OfferRepository,
  OrderRecord,
  OrderRepository,
  ProblemRecord,
  ProblemRepository,
  RepositoryWriteResult,
  SolutionRecord,
  SolutionRepository,
} from './DomainRepositoryTypes';

const BLOCKED: RepositoryWriteResult<never> = {
  success: false,
  code: 'TYPED_REPOSITORY_NOT_ENABLED',
  error:
    'Typed Neon domain repositories are not enabled. Apply reviewed migrations on a disposable staging branch, verify columns/RLS/readback, then replace this adapter. Generic payload_json writes remain disabled.',
};

export class BlockedProblemRepository implements ProblemRepository {
  async create(): Promise<RepositoryWriteResult<ProblemRecord>> {
    return { ...BLOCKED };
  }
  async getById(): Promise<ProblemRecord | null> {
    return null;
  }
  async listByTenant(): Promise<ProblemRecord[]> {
    return [];
  }
}

export class BlockedSolutionRepository implements SolutionRepository {
  async create(): Promise<RepositoryWriteResult<SolutionRecord>> {
    return { ...BLOCKED };
  }
  async getById(): Promise<SolutionRecord | null> {
    return null;
  }
}

export class BlockedOfferRepository implements OfferRepository {
  async create(): Promise<RepositoryWriteResult<OfferRecord>> {
    return { ...BLOCKED };
  }
  async getById(): Promise<OfferRecord | null> {
    return null;
  }
  async listPublished(): Promise<OfferRecord[]> {
    return [];
  }
}

export class BlockedOrderRepository implements OrderRepository {
  async create(): Promise<RepositoryWriteResult<OrderRecord>> {
    return { ...BLOCKED };
  }
  async getById(): Promise<OrderRecord | null> {
    return null;
  }
  async getByIdempotencyKey(): Promise<OrderRecord | null> {
    return null;
  }
}

export class BlockedAuditRepository implements AuditRepository {
  async append(): Promise<RepositoryWriteResult<AuditRecord>> {
    return { ...BLOCKED };
  }
  async listByTenant(): Promise<AuditRecord[]> {
    return [];
  }
}

export function createBlockedDomainRepositories() {
  return {
    problems: new BlockedProblemRepository(),
    solutions: new BlockedSolutionRepository(),
    offers: new BlockedOfferRepository(),
    orders: new BlockedOrderRepository(),
    audit: new BlockedAuditRepository(),
  };
}
