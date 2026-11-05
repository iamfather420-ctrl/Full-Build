import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BitcoinCoreRpcClient } from '../src/blockchain/BitcoinCoreRpcClient';
import { MMTAIBlockchainDaisyChain } from '../src/blockchain/MMTAIBlockchainDaisyChain';
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

async function main() {
  const tx0 = sha256(Buffer.from('fixture-transaction-0')).toString('hex');
  const tx1 = sha256(Buffer.from('fixture-transaction-1')).toString('hex');
  const genesis = makeBlock(0, '0'.repeat(64), tx0);
  const next = makeBlock(1, genesis.hash, tx1);
  const fixtures = new Map([[0, genesis], [1, next]]);
  const pipeline = new MMTAIBlockchainDaisyChain(new FixtureRpc(fixtures));
  const report = await pipeline.processRange(0, 1, { chunkSize: 1, concurrency: 2 });

  assert.equal(report.status, 'VERIFIED');
  assert.equal(report.processed_blocks, 2);
  assert.equal(report.failed_blocks, 0);
  assert.equal(report.raw_data_mutated, false);
  assert.deepEqual(report.blocks.map(block => block.height), [0, 1]);
  assert.equal(report.chunks.length, 2);
  assert.ok(report.blocks.every(block => block.header_hash_valid && block.proof_of_work_valid && block.merkle_root_valid));

  const corruptedRpc: BitcoinCoreRpc = {
    getBlockHash: height => new FixtureRpc(fixtures).getBlockHash(height),
    getRawBlock: hash => new FixtureRpc(fixtures).getRawBlock(hash),
    async getVerboseBlock(hash) {
      const block = await new FixtureRpc(fixtures).getVerboseBlock(hash);
      return block.height === 1
        ? { ...block, tx: [{ txid: 'f'.repeat(64) }] }
        : block;
    }
  };
  const corrupted = await new MMTAIBlockchainDaisyChain(corruptedRpc).processRange(0, 1, { chunkSize: 2, concurrency: 1 });
  assert.equal(corrupted.status, 'BLOCKED');
  assert.equal(corrupted.failed_blocks, 1);
  assert.equal(corrupted.blocks[1].merkle_root_valid, false);

  await assert.rejects(() => pipeline.processRange(-1, 1), /Invalid inclusive block-height range/);
  await assert.rejects(
    async () => new BitcoinCoreRpcClient({ url: 'http://example.com:8332', username: 'user', password: 'pass' }),
    /must use HTTPS/
  );
  assert.throws(
    () => new BitcoinCoreRpcClient({ url: 'https://node.example.com', username: '', password: '' }),
    /credentials are required/
  );

  process.stdout.write('MMTAI blockchain daisy-chain tests passed: valid parallel range, fail-closed Merkle mismatch, range validation, and RPC transport policy.\n');
}

main().catch(error => {
  process.stderr.write(`MMTAI blockchain daisy-chain tests failed: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
