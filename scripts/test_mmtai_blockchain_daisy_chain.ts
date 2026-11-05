import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { BitcoinCoreRpcClient } from '../src/blockchain/BitcoinCoreRpcClient';
import { MMTAIBlockchainDaisyChain } from '../src/blockchain/MMTAIBlockchainDaisyChain';
import { MMTAIProtocolChunkAuthorizer } from '../src/blockchain/MMTAIProtocolChunkAuthorizer';
import { SignedHumanRootApprovalProvider } from '../src/blockchain/SignedHumanRootApprovalProvider';
import { MMTAIProtocol } from '../src/mmtai/MMTAIProtocol';
import type { BitcoinCoreRpc, BitcoinVerboseBlock } from '../src/blockchain/types';

function sha256(data: Buffer): Buffer { return createHash('sha256').update(data).digest(); }
function doubleSha256(data: Buffer): Buffer { return sha256(sha256(data)); }
function displayHash(data: Buffer): string { return Buffer.from(data).reverse().toString('hex'); }

function makeBlock(height: number, previousHash: string, txid: string) {
  const header = Buffer.alloc(80);
  header.writeInt32LE(1, 0);
  Buffer.from(previousHash, 'hex').reverse().copy(header, 4);
  Buffer.from(txid, 'hex').reverse().copy(header, 36);
  header.writeUInt32LE(1_700_000_000 + height, 68);
  header.writeUInt32LE(0x207fffff, 72);
  let hash = '';
  for (let nonce = 0; nonce <= 0xffffffff; nonce++) {
    header.writeUInt32LE(nonce, 76);
    hash = displayHash(doubleSha256(header));
    if (BigInt(`0x${hash}`) <= (0x7fffffn << 232n)) break;
    if (nonce === 0xffffffff) throw new Error('Could not construct a regtest-target test header.');
  }
  return { hash, raw: Buffer.concat([header, Buffer.from([1])]).toString('hex'), txid };
}

class FixtureRpc implements BitcoinCoreRpc {
  constructor(private readonly fixtures: Map<number, ReturnType<typeof makeBlock>>) {}
  async getBlockHash(height: number): Promise<string> {
    const block = this.fixtures.get(height);
    if (!block) throw new Error(`Unknown fixture height ${height}`);
    return block.hash;
  }
  async getRawBlock(hash: string): Promise<string> {
    const block = [...this.fixtures.values()].find(item => item.hash === hash);
    if (!block) throw new Error('Unknown fixture block hash');
    return block.raw;
  }
  async getVerboseBlock(hash: string): Promise<BitcoinVerboseBlock> {
    const entry = [...this.fixtures.entries()].find(([, item]) => item.hash === hash);
    if (!entry) throw new Error('Unknown fixture block hash');
    const [height, block] = entry;
    return { hash: block.hash, height, merkleroot: block.txid, tx: [{ txid: block.txid }] };
  }
}

const allowChunk = { authorizeChunk: async () => ({ authorized: true }) };

async function main() {
  const tx0 = sha256(Buffer.from('fixture-transaction-0')).toString('hex');
  const tx1 = sha256(Buffer.from('fixture-transaction-1')).toString('hex');
  const genesis = makeBlock(0, '0'.repeat(64), tx0);
  const next = makeBlock(1, genesis.hash, tx1);
  const fixtures = new Map([[0, genesis], [1, next]]);
  const rpc = new FixtureRpc(fixtures);
  const pipeline = new MMTAIBlockchainDaisyChain(rpc, allowChunk);
  const report = await pipeline.processRange(0, 1, { chunkSize: 1, concurrency: 2 });

  assert.equal(report.status, 'VERIFIED');
  assert.equal(report.processed_blocks, 2);
  assert.equal(report.failed_blocks, 0);
  assert.equal(report.raw_data_mutated, false);
  assert.deepEqual(report.blocks.map(block => block.height), [0, 1]);
  assert.equal(report.chunks.length, 2);
  assert.ok(report.chunks.every(chunk => chunk.authorization_status === 'AUTHORIZED'));
  assert.ok(report.blocks.every(block => block.header_hash_valid && block.proof_of_work_valid && block.merkle_root_valid));

  const approvalRequests: string[] = [];
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const usedNonces = new Set<string>();
  const signedRequest = {
    tenantId: 'TENANT_SIGNED_TEST', capability: 'BITCOIN_BLOCK_READ_VERIFY' as const,
    chunkId: 'BTC-SIGNED-0000', startHeight: 0, endHeight: 1,
    approverId: 'human-root-test', issuedAt: Date.now(), expiresAt: Date.now() + 60_000,
    nonce: 'nonce_for_signed_test_0001'
  };
  const signedPayload = Buffer.from(JSON.stringify(signedRequest));
  const signedApproval = { ...signedRequest, signature: sign(null, signedPayload, privateKey).toString('base64') };
  const signedProvider = new SignedHumanRootApprovalProvider({
    tenantId: 'TENANT_SIGNED_TEST', publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    source: { async requestSignedApproval() { return signedApproval; } },
    nonceStore: { async consumeIfAbsent(nonce) { if (usedNonces.has(nonce)) return false; usedNonces.add(nonce); return true; } }
  });
  const signedDecision = await signedProvider.requestApproval({
    chunkId: 'BTC-SIGNED-0000', startHeight: 0, endHeight: 1, capability: 'BITCOIN_BLOCK_READ_VERIFY'
  });
  assert.equal(signedDecision.approved, true);
  const replayDecision = await signedProvider.requestApproval({
    chunkId: 'BTC-SIGNED-0000', startHeight: 0, endHeight: 1, capability: 'BITCOIN_BLOCK_READ_VERIFY'
  });
  assert.equal(replayDecision.approved, false);
  assert.match(replayDecision.reason || '', /replay/i);
  const wrongScopeProvider = new SignedHumanRootApprovalProvider({
    tenantId: 'TENANT_SIGNED_TEST', publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    source: { async requestSignedApproval() { return signedApproval; } },
    nonceStore: { async consumeIfAbsent() { return true; } }
  });
  const wrongScope = await wrongScopeProvider.requestApproval({
    chunkId: 'BTC-OTHER', startHeight: 0, endHeight: 1, capability: 'BITCOIN_BLOCK_READ_VERIFY'
  });
  assert.equal(wrongScope.approved, false);
  assert.match(wrongScope.reason || '', /scope/i);
  const protocolAuthorizer = new MMTAIProtocolChunkAuthorizer({
    tenantId: 'TENANT_BLOCKCHAIN_TEST',
    approvalProvider: {
      async requestApproval(request) {
        approvalRequests.push(request.chunkId);
        return { approved: true, reason: 'Explicit test fixture approval.' };
      }
    }
  });
  const scopedReport = await new MMTAIBlockchainDaisyChain(rpc, protocolAuthorizer)
    .processRange(0, 1, { chunkSize: 1, concurrency: 2 });
  assert.equal(scopedReport.status, 'VERIFIED');
  assert.deepEqual(approvalRequests.sort(), ['BTC-0000000000-0000000000', 'BTC-0000000001-0000000001']);

  const deniedRpc: BitcoinCoreRpc = {
    async getBlockHash() { throw new Error('RPC must not run when MMTAI denies a chunk.'); },
    async getRawBlock() { throw new Error('RPC must not run when MMTAI denies a chunk.'); },
    async getVerboseBlock() { throw new Error('RPC must not run when MMTAI denies a chunk.'); }
  };

  const deniedApproval = new MMTAIProtocolChunkAuthorizer({
    tenantId: 'TENANT_BLOCKCHAIN_DENIED',
    approvalProvider: { async requestApproval() { return { approved: false, reason: 'Human approval absent.' }; } }
  });
  const deniedByProtocol = await new MMTAIBlockchainDaisyChain(deniedRpc, deniedApproval)
    .processRange(0, 1, { chunkSize: 2, concurrency: 1 });
  assert.equal(deniedByProtocol.status, 'BLOCKED');
  assert.equal(deniedByProtocol.processed_blocks, 0);
  assert.match(deniedByProtocol.blocks[0].errors[0], /Human approval absent/);

  const mmtai = MMTAIProtocol.getInstance();
  const scopedOperation = JSON.stringify({ action: 'BITCOIN_BLOCK_READ_VERIFY', chunkId: 'BTC-TEST', startHeight: 7, endHeight: 9 });
  const scopedToken = mmtai.issueScopedAuthorizationToken(
    'ROLE_BLOCKCHAIN_VERIFIER', 'CAP_BITCOIN_BLOCK_READ_VERIFY', 'TENANT_SCOPE_TEST', scopedOperation
  );
  const wrongOperation = mmtai.authorizeScopedExecution(
    'CAP_BITCOIN_BLOCK_READ_VERIFY', 'ROLE_BLOCKCHAIN_VERIFIER', scopedToken,
    JSON.stringify({ action: 'BITCOIN_BLOCK_READ_VERIFY', chunkId: 'BTC-OTHER', startHeight: 7, endHeight: 9 }),
    'TENANT_SCOPE_TEST'
  );
  assert.equal(wrongOperation.permitted, false);
  const scopedReplay = mmtai.authorizeScopedExecution(
    'CAP_BITCOIN_BLOCK_READ_VERIFY', 'ROLE_BLOCKCHAIN_VERIFIER', scopedToken, scopedOperation, 'TENANT_SCOPE_TEST'
  );
  assert.equal(scopedReplay.permitted, false);
  const downgradeToken = mmtai.issueScopedAuthorizationToken(
    'ROLE_BLOCKCHAIN_VERIFIER', 'CAP_BITCOIN_BLOCK_READ_VERIFY', 'TENANT_DOWNGRADE_TEST', scopedOperation
  );
  const legacyDowngrade = mmtai.authorizeExecution(
    'CAP_BITCOIN_BLOCK_READ_VERIFY', 'ROLE_BLOCKCHAIN_VERIFIER', downgradeToken, scopedOperation, 'TENANT_DOWNGRADE_TEST'
  );
  assert.equal(legacyDowngrade.permitted, false);
  const afterDowngrade = mmtai.authorizeScopedExecution(
    'CAP_BITCOIN_BLOCK_READ_VERIFY', 'ROLE_BLOCKCHAIN_VERIFIER', downgradeToken, scopedOperation, 'TENANT_DOWNGRADE_TEST'
  );
  assert.equal(afterDowngrade.permitted, false);
  assert.throws(
    () => mmtai.issueScopedAuthorizationToken('ROLE_VERIFIER', 'CAP_BITCOIN_BLOCK_READ_VERIFY', 'TENANT_SCOPE_TEST', scopedOperation),
    /ROLE_BLOCKCHAIN_VERIFIER/
  );

  const corruptedRpc: BitcoinCoreRpc = {
    getBlockHash: height => rpc.getBlockHash(height),
    getRawBlock: hash => rpc.getRawBlock(hash),
    async getVerboseBlock(hash) {
      const block = await rpc.getVerboseBlock(hash);
      return block.height === 1 ? { ...block, tx: [{ txid: 'f'.repeat(64) }] } : block;
    }
  };
  const corrupted = await new MMTAIBlockchainDaisyChain(corruptedRpc, allowChunk).processRange(0, 1, { chunkSize: 2, concurrency: 1 });
  assert.equal(corrupted.status, 'BLOCKED');
  assert.equal(corrupted.failed_blocks, 1);
  assert.equal(corrupted.blocks[1].merkle_root_valid, false);

  const denied = await new MMTAIBlockchainDaisyChain(deniedRpc, {
    authorizeChunk: async () => ({ authorized: false, reason: 'Test authorization denied.' })
  }).processRange(0, 1, { chunkSize: 2, concurrency: 1 });
  assert.equal(denied.status, 'BLOCKED');
  assert.equal(denied.processed_blocks, 0);
  assert.equal(denied.chunks[0].authorization_status, 'BLOCKED');

  const noGate = await new MMTAIBlockchainDaisyChain(rpc).processRange(0, 1);
  assert.equal(noGate.status, 'BLOCKED');
  assert.equal(noGate.processed_blocks, 0);

  await assert.rejects(() => pipeline.processRange(-1, 1), /Invalid inclusive block-height range/);
  await assert.rejects(
    async () => new BitcoinCoreRpcClient({ url: 'http://example.com:8332', username: 'user', password: 'pass' }),
    /must use HTTPS/
  );
  assert.throws(
    () => new BitcoinCoreRpcClient({ url: 'https://node.example.com', username: '', password: '' }),
    /credentials are required/
  );

  process.stdout.write('MMTAI blockchain daisy-chain tests passed: parallel verification, Merkle failure, MMTAI operation-bound authorization, approval denial, replay rejection, fail-closed defaults, range validation, and RPC transport policy.\n');
}

main().catch(error => {
  process.stderr.write(`MMTAI blockchain daisy-chain tests failed: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
