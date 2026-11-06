import { createPublicKey, verify as verifySignature } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import type { MMTAIChunkAuthorizationRequest } from './types';
import type { MMTAIChunkApprovalDecision, MMTAIChunkApprovalProvider } from './MMTAIProtocolChunkAuthorizer';

export interface SignedHumanRootApproval {
  tenantId: string;
  capability: 'BITCOIN_BLOCK_READ_VERIFY';
  chunkId: string;
  startHeight: number;
  endHeight: number;
  approverId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  signature: string;
}

export interface HumanRootApprovalSource {
  /** Obtains an approval signed outside the model/runtime by the configured human-root authority. */
  requestSignedApproval(
    request: MMTAIChunkAuthorizationRequest,
    tenantId: string
  ): Promise<SignedHumanRootApproval | null>;
}

export interface ApprovalNonceStore {
  /** Atomically records a nonce if it has never been used; false means replay. Must be durable in production. */
  consumeIfAbsent(nonce: string, expiresAt: number): Promise<boolean>;
}

export interface SignedHumanRootApprovalProviderConfig {
  tenantId: string;
  publicKeyPem: string;
  source: HumanRootApprovalSource;
  nonceStore: ApprovalNonceStore;
  maxValidityMs?: number;
  now?: () => number;
}

function canonicalPayload(approval: Omit<SignedHumanRootApproval, 'signature'>): Buffer {
  return Buffer.from(JSON.stringify({
    tenantId: approval.tenantId,
    capability: approval.capability,
    chunkId: approval.chunkId,
    startHeight: approval.startHeight,
    endHeight: approval.endHeight,
    approverId: approval.approverId,
    issuedAt: approval.issuedAt,
    expiresAt: approval.expiresAt,
    nonce: approval.nonce
  }), 'utf8');
}

/**
 * Verifies an externally signed Ed25519 human-root approval. This class does not create
 * approvals or infer consent: a separate trusted authority must sign the exact chunk scope.
 */
export class SignedHumanRootApprovalProvider implements MMTAIChunkApprovalProvider {
  private readonly publicKey: KeyObject;
  private readonly maxValidityMs: number;
  private readonly now: () => number;

  constructor(private readonly config: SignedHumanRootApprovalProviderConfig) {
    if (!config.tenantId.trim()) throw new Error('Human-root approval requires a tenant ID.');
    if (!config.publicKeyPem.trim()) throw new Error('Human-root approval public key is required.');
    if (!config.source || typeof config.source.requestSignedApproval !== 'function') {
      throw new Error('A signed human-root approval source is required.');
    }
    if (!config.nonceStore || typeof config.nonceStore.consumeIfAbsent !== 'function') {
      throw new Error('A durable approval nonce store is required.');
    }
    this.publicKey = createPublicKey(config.publicKeyPem);
    if (this.publicKey.asymmetricKeyType !== 'ed25519') {
      throw new Error('Human-root approval key must be Ed25519.');
    }
    this.maxValidityMs = config.maxValidityMs ?? 120_000;
    if (!Number.isSafeInteger(this.maxValidityMs) || this.maxValidityMs < 1_000 || this.maxValidityMs > 300_000) {
      throw new Error('Human-root approval validity must be between 1 and 300 seconds.');
    }
    this.now = config.now ?? Date.now;
  }

  async requestApproval(request: MMTAIChunkAuthorizationRequest): Promise<MMTAIChunkApprovalDecision> {
    let approval: SignedHumanRootApproval | null;
    try {
      approval = await this.config.source.requestSignedApproval(request, this.config.tenantId);
    } catch {
      return { approved: false, reason: 'Human-root approval source failed.' };
    }
    if (!approval) return { approved: false, reason: 'Human-root approval was not supplied.' };

    const now = this.now();
    const { signature, ...payload } = approval;
    const exactScope =
      payload.tenantId === this.config.tenantId &&
      payload.capability === request.capability &&
      payload.chunkId === request.chunkId &&
      payload.startHeight === request.startHeight &&
      payload.endHeight === request.endHeight;
    const validShape =
      typeof payload.approverId === 'string' && payload.approverId.trim().length > 0 &&
      typeof payload.nonce === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(payload.nonce) &&
      Number.isSafeInteger(payload.issuedAt) && Number.isSafeInteger(payload.expiresAt) &&
      typeof signature === 'string' && /^[A-Za-z0-9+/]+=*$/.test(signature);
    if (!exactScope || !validShape) {
      return { approved: false, reason: 'Human-root approval scope or payload is invalid.' };
    }
    if (
      payload.issuedAt > now + 5_000 ||
      payload.expiresAt <= now ||
      payload.expiresAt <= payload.issuedAt ||
      payload.expiresAt - payload.issuedAt > this.maxValidityMs
    ) {
      return { approved: false, reason: 'Human-root approval is expired or outside its permitted validity window.' };
    }

    let signatureValid = false;
    try {
      signatureValid = verifySignature(
        null,
        canonicalPayload(payload),
        this.publicKey,
        Buffer.from(signature, 'base64')
      );
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) return { approved: false, reason: 'Human-root approval signature is invalid.' };

    try {
      const firstUse = await this.config.nonceStore.consumeIfAbsent(payload.nonce, payload.expiresAt);
      if (!firstUse) return { approved: false, reason: 'Human-root approval nonce replay detected.' };
    } catch {
      return { approved: false, reason: 'Human-root approval replay store unavailable; execution blocked.' };
    }
    return { approved: true, reason: `Signed human-root approval verified for approver ${payload.approverId}.` };
  }
}
