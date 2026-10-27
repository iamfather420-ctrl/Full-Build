/**
 * Problem / solution / offer / order governance lifecycle.
 * Illegal transitions fail closed. Payment-linked transitions stay BLOCKED.
 */

export type LifecycleEntity = 'PROBLEM' | 'SOLUTION' | 'OFFER' | 'ORDER' | 'DEPLOYMENT';

export type LifecycleState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ORDERED'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'ARCHIVED'
  | 'BLOCKED';

const ALLOWED: Record<LifecycleEntity, Partial<Record<LifecycleState, LifecycleState[]>>> = {
  PROBLEM: {
    DRAFT: ['SUBMITTED', 'ARCHIVED', 'BLOCKED'],
    SUBMITTED: ['IN_REVIEW', 'REJECTED', 'BLOCKED'],
    IN_REVIEW: ['VERIFIED', 'REJECTED', 'BLOCKED'],
    VERIFIED: ['ARCHIVED', 'BLOCKED'],
    REJECTED: ['DRAFT', 'ARCHIVED', 'BLOCKED'],
    ARCHIVED: ['BLOCKED'],
    BLOCKED: [],
  },
  SOLUTION: {
    DRAFT: ['SUBMITTED', 'BLOCKED'],
    SUBMITTED: ['IN_REVIEW', 'REJECTED', 'BLOCKED'],
    IN_REVIEW: ['VERIFIED', 'REJECTED', 'BLOCKED'],
    VERIFIED: ['ARCHIVED', 'BLOCKED'],
    REJECTED: ['DRAFT', 'BLOCKED'],
    ARCHIVED: ['BLOCKED'],
    BLOCKED: [],
  },
  OFFER: {
    DRAFT: ['IN_REVIEW', 'BLOCKED'],
    IN_REVIEW: ['PUBLISHED', 'REJECTED', 'BLOCKED'],
    PUBLISHED: ['ARCHIVED', 'BLOCKED'],
    REJECTED: ['DRAFT', 'BLOCKED'],
    ARCHIVED: ['BLOCKED'],
    BLOCKED: [],
  },
  ORDER: {
    DRAFT: ['ORDERED', 'CANCELLED', 'BLOCKED'],
    ORDERED: ['CANCELLED', 'BLOCKED'],
    FULFILLED: ['ARCHIVED', 'BLOCKED'],
    CANCELLED: ['ARCHIVED', 'BLOCKED'],
    BLOCKED: [],
  },
  DEPLOYMENT: {
    DRAFT: ['IN_REVIEW', 'BLOCKED'],
    IN_REVIEW: ['VERIFIED', 'REJECTED', 'BLOCKED'],
    VERIFIED: ['BLOCKED'],
    REJECTED: ['DRAFT', 'BLOCKED'],
    BLOCKED: [],
  },
};

export interface TransitionResult {
  allowed: boolean;
  from: LifecycleState;
  to: LifecycleState;
  entity: LifecycleEntity;
  reason?: string;
}

export function canTransition(
  entity: LifecycleEntity,
  from: LifecycleState,
  to: LifecycleState,
): TransitionResult {
  const edges = ALLOWED[entity]?.[from];
  if (!edges) {
    return {
      allowed: false,
      from,
      to,
      entity,
      reason: `No transitions defined from ${from} for ${entity}.`,
    };
  }
  if (!edges.includes(to)) {
    return {
      allowed: false,
      from,
      to,
      entity,
      reason: `Illegal ${entity} transition ${from} → ${to}. Fail-closed.`,
    };
  }
  if (entity === 'ORDER' && to === 'FULFILLED') {
    return {
      allowed: false,
      from,
      to,
      entity,
      reason: 'ORDER → FULFILLED requires verified fulfillment authorization; payment remains disabled.',
    };
  }
  return { allowed: true, from, to, entity };
}

export function assertTransition(
  entity: LifecycleEntity,
  from: LifecycleState,
  to: LifecycleState,
): TransitionResult {
  return canTransition(entity, from, to);
}
