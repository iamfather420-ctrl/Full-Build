import { MMTAIProtocol } from '../mmtai/MMTAIProtocol';
import type {
  MMTAIChunkAuthorizationRequest, MMTAIChunkAuthorizationResult, MMTAIChunkAuthorizer
} from './types';

export interface MMTAIChunkApprovalDecision {
  approved: boolean;
  reason?: string;
}

export interface MMTAIChunkApprovalProvider {
  /**
   * Must be implemented by a trusted approval boundary outside the model/runtime.
   * A model-generated response or a hard-coded "approve" implementation is not a production human approval.
   */
  requestApproval(request: MMTAIChunkAuthorizationRequest): Promise<MMTAIChunkApprovalDecision>;
}

export interface MMTAIProtocolChunkAuthorizerConfig {
  tenantId: string;
  approvalProvider: MMTAIChunkApprovalProvider;
  protocol?: MMTAIProtocol;
}

/**
 * Adapts explicit upstream approval into an operation-bound, short-lived, single-use MMTAI token.
 * It intentionally has no default approval provider and cannot run without one.
 */
export class MMTAIProtocolChunkAuthorizer implements MMTAIChunkAuthorizer {
  private readonly protocol: MMTAIProtocol;

  constructor(private readonly config: MMTAIProtocolChunkAuthorizerConfig) {
    if (!config.tenantId.trim()) throw new Error('MMTAI blockchain authorizer requires a tenant ID.');
    if (!config.approvalProvider || typeof config.approvalProvider.requestApproval !== 'function') {
      throw new Error('A trusted MMTAI chunk approval provider is required.');
    }
    this.protocol = config.protocol ?? MMTAIProtocol.getInstance();
  }

  async authorizeChunk(request: MMTAIChunkAuthorizationRequest): Promise<MMTAIChunkAuthorizationResult> {
    if (
      request.capability !== 'BITCOIN_BLOCK_READ_VERIFY' ||
      !request.chunkId.trim() ||
      !Number.isSafeInteger(request.startHeight) ||
      !Number.isSafeInteger(request.endHeight) ||
      request.startHeight < 0 ||
      request.endHeight < request.startHeight
    ) {
      return { authorized: false, reason: 'Invalid or unsupported MMTAI blockchain chunk request.' };
    }

    let approval: MMTAIChunkApprovalDecision;
    try {
      approval = await this.config.approvalProvider.requestApproval(request);
    } catch (error) {
      return {
        authorized: false,
        reason: error instanceof Error ? `Trusted approval provider failed: ${error.message}` : 'Trusted approval provider failed.'
      };
    }
    if (approval.approved !== true) {
      return { authorized: false, reason: approval.reason || 'Trusted approval was not granted.' };
    }

    const operation = JSON.stringify({
      action: 'BITCOIN_BLOCK_READ_VERIFY',
      chunkId: request.chunkId,
      startHeight: request.startHeight,
      endHeight: request.endHeight
    });
    try {
      const role = 'ROLE_BLOCKCHAIN_VERIFIER';
      const capability = 'CAP_BITCOIN_BLOCK_READ_VERIFY';
      const token = this.protocol.issueScopedAuthorizationToken(role, capability, this.config.tenantId, operation);
      const result = this.protocol.authorizeScopedExecution(
        capability, role, token, operation, this.config.tenantId
      );
      return result.permitted
        ? { authorized: true }
        : { authorized: false, reason: result.error || 'MMTAI scoped authorization denied.' };
    } catch (error) {
      return {
        authorized: false,
        reason: error instanceof Error ? error.message : 'MMTAI scoped authorization failed.'
      };
    }
  }
}