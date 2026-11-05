import { BitcoinBlockVerifier } from './BitcoinBlockVerifier';
import type {
  BitcoinBlockVerification, BitcoinChunkResult, BitcoinCoreRpc, BitcoinDaisyChainReport,
  MMTAIChunkAuthorizer
} from './types';

export interface DaisyChainOptions { chunkSize?: number; concurrency?: number; }
interface HeightChunk { id: string; start: number; end: number; }

export class MMTAIBlockchainDaisyChain {
  private readonly verifier = new BitcoinBlockVerifier();
  constructor(private readonly rpc: BitcoinCoreRpc, private readonly authorizer?: MMTAIChunkAuthorizer) {}

  async processRange(startHeight: number, endHeight: number, options: DaisyChainOptions = {}): Promise<BitcoinDaisyChainReport> {
    const chunkSize = options.chunkSize ?? 100;
    const concurrency = options.concurrency ?? 4;
    if (!Number.isSafeInteger(startHeight) || startHeight < 0 || !Number.isSafeInteger(endHeight) || endHeight < startHeight) {
      throw new Error('Invalid inclusive block-height range.');
    }
    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > 10_000) throw new Error('chunkSize must be an integer between 1 and 10000.');
    if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 32) throw new Error('concurrency must be an integer between 1 and 32.');

    const chunks = this.createChunks(startHeight, endHeight, chunkSize);
    const chunkResults: BitcoinChunkResult[] = [];
    const blockResults: BitcoinBlockVerification[] = [];
    let nextChunk = 0;

    const workers = Array.from({ length: Math.min(concurrency, chunks.length) }, async () => {
      while (true) {
        const index = nextChunk++;
        if (index >= chunks.length) return;
        const chunk = chunks[index];
        let authorized = false;
        let authorizationReason = 'No MMTAI chunk authorizer is configured; execution is fail-closed.';
        try {
          const decision = await this.authorizer?.authorizeChunk({
            chunkId: chunk.id, startHeight: chunk.start, endHeight: chunk.end,
            capability: 'BITCOIN_BLOCK_READ_VERIFY'
          });
          authorized = decision?.authorized === true;
          if (!authorized && decision?.reason) authorizationReason = decision.reason;
        } catch (error) {
          authorizationReason = error instanceof Error ? error.message : 'MMTAI authorization failed.';
        }

        if (!authorized) {
          for (let height = chunk.start; height <= chunk.end; height++) {
            blockResults.push(this.blockedBlock(height, authorizationReason));
          }
          chunkResults.push({
            chunk_id: chunk.id, start_height: chunk.start, end_height: chunk.end,
            processed_blocks: 0, authorization_status: 'BLOCKED', status: 'BLOCKED'
          });
          continue;
        }

        const results: BitcoinBlockVerification[] = [];
        for (let height = chunk.start; height <= chunk.end; height++) results.push(await this.processBlock(height));
        blockResults.push(...results);
        chunkResults.push({
          chunk_id: chunk.id, start_height: chunk.start, end_height: chunk.end,
          processed_blocks: results.length, authorization_status: 'AUTHORIZED',
          status: results.every(result => result.verified) ? 'VERIFIED' : 'BLOCKED'
        });
      }
    });
    await Promise.all(workers);

    blockResults.sort((a, b) => a.height - b.height);
    chunkResults.sort((a, b) => a.start_height - b.start_height);

    let previousHash: string | null = null;
    if (startHeight > 0) {
      try { previousHash = await this.rpc.getBlockHash(startHeight - 1); }
      catch (error) {
        const reason = error instanceof Error ? error.message : 'Unable to obtain preceding block anchor.';
        for (const block of blockResults) {
          block.verified = false;
          block.errors.push(`Unable to verify requested-range anchor: ${reason}`);
        }
      }
    }
    for (const block of blockResults) {
      if (previousHash !== null && block.previous_block_hash !== previousHash) {
        block.verified = false;
        block.errors.push('Previous-block hash does not link to the preceding height in the requested chain.');
      }
      previousHash = block.block_hash;
    }

    for (const chunk of chunkResults) {
      const members = blockResults.filter(block => block.height >= chunk.start_height && block.height <= chunk.end_height);
      chunk.status = chunk.authorization_status === 'AUTHORIZED' && members.every(block => block.verified) ? 'VERIFIED' : 'BLOCKED';
    }
    const failedBlocks = blockResults.filter(block => !block.verified).length;
    return {
      subsystem: 'MMTAI_PARADOX_BLOCKCHAIN_DAISY_CHAIN',
      network: 'BITCOIN_MAINNET_OR_CONFIGURED_NETWORK',
      status: failedBlocks === 0 && chunkResults.every(chunk => chunk.authorization_status === 'AUTHORIZED') ? 'VERIFIED' : 'BLOCKED',
      verification_scope: 'HEADER_POW_MERKLE_AND_CHAIN_LINKS',
      start_height: startHeight, end_height: endHeight,
      processed_blocks: chunkResults.reduce((total, chunk) => total + chunk.processed_blocks, 0),
      failed_blocks: failedBlocks, chunks: chunkResults, blocks: blockResults,
      source: 'BITCOIN_CORE_RPC', raw_data_mutated: false,
      limitations: [
        'Read-only: this pipeline does not mine, broadcast transactions, or alter blockchain data.',
        'Every chunk requires an external MMTAI authorizer. Missing, denied, or failed authorization blocks execution.',
        'It checks block header hashes, compact proof-of-work targets, transaction Merkle roots, transaction counts, and requested-range parent links.',
        'Transaction IDs are obtained from Bitcoin Core verbosity-2 decoding; this milestone does not independently execute every transaction script or reproduce all Bitcoin consensus validation.',
        'The RPC node remains a data source. Production-grade independent validation requires a fully synchronized, non-pruned Bitcoin Core node with its own consensus validation.'
      ],
      generated_at: new Date().toISOString()
    };
  }

  private createChunks(start: number, end: number, size: number): HeightChunk[] {
    const chunks: HeightChunk[] = [];
    for (let current = start; current <= end; current += size) {
      const chunkEnd = Math.min(end, current + size - 1);
      chunks.push({
        id: `BTC-${current.toString().padStart(10, '0')}-${chunkEnd.toString().padStart(10, '0')}`,
        start: current, end: chunkEnd
      });
    }
    return chunks;
  }

  private blockedBlock(height: number, reason: string): BitcoinBlockVerification {
    return {
      height, block_hash: '', previous_block_hash: '', merkle_root: '',
      transaction_count: 0, raw_block_sha256: '',
      header_hash_valid: false, proof_of_work_valid: false,
      merkle_root_valid: false, transaction_count_valid: false,
      verified: false, errors: [reason]
    };
  }

  private async processBlock(height: number): Promise<BitcoinBlockVerification> {
    try {
      const hash = await this.rpc.getBlockHash(height);
      const [rawBlockHex, verbose] = await Promise.all([this.rpc.getRawBlock(hash), this.rpc.getVerboseBlock(hash)]);
      if (verbose.height !== height || verbose.hash.toLowerCase() !== hash.toLowerCase()) {
        throw new Error('Bitcoin Core returned block metadata inconsistent with the requested height/hash.');
      }
      return this.verifier.verify({
        height, expectedHash: hash, rawBlockHex,
        transactionIds: verbose.tx.map(transaction => transaction.txid)
      });
    } catch (error) {
      return this.blockedBlock(height, error instanceof Error ? error.message : 'Unknown RPC or processing error.');
    }
  }
}