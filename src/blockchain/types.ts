export interface BitcoinTransactionSummary { txid: string; }
export interface BitcoinVerboseBlock {
  hash: string;
  height: number;
  merkleroot: string;
  tx: BitcoinTransactionSummary[];
  previousblockhash?: string;
}
export interface BitcoinCoreRpc {
  getBlockHash(height: number): Promise<string>;
  getRawBlock(hash: string): Promise<string>;
  getVerboseBlock(hash: string): Promise<BitcoinVerboseBlock>;
}
export interface MMTAIChunkAuthorizationRequest {
  chunkId: string;
  startHeight: number;
  endHeight: number;
  capability: 'BITCOIN_BLOCK_READ_VERIFY';
}
export interface MMTAIChunkAuthorizationResult {
  authorized: boolean;
  reason?: string;
}
export interface MMTAIChunkAuthorizer {
  authorizeChunk(request: MMTAIChunkAuthorizationRequest): Promise<MMTAIChunkAuthorizationResult>;
}
export interface BitcoinBlockVerification {
  height: number;
  block_hash: string;
  previous_block_hash: string;
  merkle_root: string;
  transaction_count: number;
  raw_block_sha256: string;
  header_hash_valid: boolean;
  proof_of_work_valid: boolean;
  merkle_root_valid: boolean;
  transaction_count_valid: boolean;
  verified: boolean;
  errors: string[];
}
export interface BitcoinChunkResult {
  chunk_id: string;
  start_height: number;
  end_height: number;
  processed_blocks: number;
  authorization_status: 'AUTHORIZED' | 'BLOCKED';
  status: 'VERIFIED' | 'BLOCKED';
}
export interface BitcoinDaisyChainReport {
  subsystem: 'MMTAI_PARADOX_BLOCKCHAIN_DAISY_CHAIN';
  network: 'BITCOIN_MAINNET_OR_CONFIGURED_NETWORK';
  status: 'VERIFIED' | 'BLOCKED';
  verification_scope: 'HEADER_POW_MERKLE_AND_CHAIN_LINKS';
  start_height: number;
  end_height: number;
  processed_blocks: number;
  failed_blocks: number;
  chunks: BitcoinChunkResult[];
  blocks: BitcoinBlockVerification[];
  source: 'BITCOIN_CORE_RPC';
  raw_data_mutated: false;
  limitations: string[];
  generated_at: string;
}