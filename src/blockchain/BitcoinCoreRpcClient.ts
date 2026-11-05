import type { BitcoinCoreRpc, BitcoinVerboseBlock } from './types';

export interface BitcoinCoreRpcConfig {
  url: string;
  username: string;
  password: string;
  timeoutMs?: number;
}
export class BitcoinRpcError extends Error {
  constructor(message: string, public readonly rpcCode?: number) {
    super(message);
    this.name = 'BitcoinRpcError';
  }
}
export class BitcoinCoreRpcClient implements BitcoinCoreRpc {
  private requestId = 0;
  private readonly timeoutMs: number;
  constructor(private readonly config: BitcoinCoreRpcConfig, private readonly fetchImpl: typeof fetch = fetch) {
    const endpoint = new URL(config.url);
    const loopback = endpoint.hostname === 'localhost' || endpoint.hostname === '127.0.0.1' || endpoint.hostname === '::1';
    if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && loopback)) {
      throw new Error('Bitcoin RPC must use HTTPS, or HTTP on loopback only.');
    }
    if (!config.username || !config.password) throw new Error('Bitcoin RPC credentials are required.');
    this.timeoutMs = config.timeoutMs ?? 15_000;
  }
  static fromEnvironment(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): BitcoinCoreRpcClient {
    const url = env.BITCOIN_RPC_URL, username = env.BITCOIN_RPC_USER, password = env.BITCOIN_RPC_PASSWORD;
    if (!url || !username || !password) throw new Error('BITCOIN_RPC_URL, BITCOIN_RPC_USER, and BITCOIN_RPC_PASSWORD are required.');
    return new BitcoinCoreRpcClient({ url, username, password, timeoutMs: Number(env.BITCOIN_RPC_TIMEOUT_MS || 15_000) }, fetchImpl);
  }
  getBlockHash(height: number): Promise<string> { return this.call<string>('getblockhash', [height]); }
  getRawBlock(hash: string): Promise<string> { return this.call<string>('getblock', [hash, 0]); }
  getVerboseBlock(hash: string): Promise<BitcoinVerboseBlock> { return this.call<BitcoinVerboseBlock>('getblock', [hash, 2]); }

  private async call<T>(method: string, params: unknown[]): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const authorization = Buffer.from(`${this.config.username}:${this.config.password}`, 'utf8').toString('base64');
    try {
      const response = await this.fetchImpl(this.config.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Basic ${authorization}` },
        body: JSON.stringify({ jsonrpc: '2.0', id: ++this.requestId, method, params }),
        signal: controller.signal
      });
      if (!response.ok) throw new BitcoinRpcError(`Bitcoin RPC HTTP error: ${response.status}`);
      const payload = await response.json() as { result?: T; error?: { code?: number; message?: string } | null };
      if (payload.error) throw new BitcoinRpcError(payload.error.message || `Bitcoin RPC method failed: ${method}`, payload.error.code);
      if (!Object.prototype.hasOwnProperty.call(payload, 'result')) throw new BitcoinRpcError(`Bitcoin RPC returned no result for ${method}`);
      return payload.result as T;
    } catch (error) {
      if (error instanceof BitcoinRpcError) throw error;
      if (controller.signal.aborted) throw new BitcoinRpcError(`Bitcoin RPC timed out after ${this.timeoutMs}ms: ${method}`);
      throw new BitcoinRpcError(`Bitcoin RPC request failed for ${method}: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally { clearTimeout(timeout); }
  }
}