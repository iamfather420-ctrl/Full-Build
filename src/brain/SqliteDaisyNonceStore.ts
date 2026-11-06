import { SqliteStore } from '../database/SqliteStore';
import type { NonceStore } from './DaisyConsensusRuntime';

/**
 * Durable replay protection. Refuses the in-memory SqliteStore fallback because
 * it cannot provide restart persistence or cross-process atomic uniqueness.
 */
export class SqliteDaisyNonceStore implements NonceStore {
  private readonly db;

  constructor(store: SqliteStore = SqliteStore.getInstance()) {
    if (!store.isDiskBacked()) {
      throw new Error('DAISY_NONCE_STORE_BLOCKED:DISK_BACKED_SQLITE_REQUIRED');
    }
    this.db = store.getRawDb();
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daisy_consumed_nonces (
        nonce TEXT PRIMARY KEY NOT NULL,
        proposal_sha256 TEXT NOT NULL,
        consumed_at INTEGER NOT NULL
      ) STRICT;
    `);
  }

  public async consumeOnce(nonce: string, proposalSha256: string, consumedAt: number): Promise<boolean> {
    if (!nonce.trim() || !/^[a-f0-9]{64}$/.test(proposalSha256) || !Number.isSafeInteger(consumedAt)) {
      return false;
    }
    try {
      this.db.exec('BEGIN IMMEDIATE;');
      this.db.run(
        'INSERT INTO daisy_consumed_nonces (nonce, proposal_sha256, consumed_at) VALUES (?, ?, ?)',
        [nonce, proposalSha256, consumedAt]
      );
      this.db.exec('COMMIT;');
      return true;
    } catch {
      try { this.db.exec('ROLLBACK;'); } catch {}
      return false;
    }
  }
}
