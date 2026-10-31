// Browser-safe stand-in for the Node crypto calls this console actually makes.
// HMAC and SHA-256 stay synchronous so the original call sites do not change.

function rotr(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount));
}

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256(bytes: Uint8Array): Uint8Array {
  const bitLen = bytes.length * 8;
  const withPad = bitLen % 512 < 448 ? 512 : 1024;
  const total = Math.ceil((bitLen + 1 + 64) / 512) * 512;
  void withPad;
  const padded = new Uint8Array(total / 8);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const hi = Math.floor(bitLen / 0x100000000);
  view.setUint32(padded.length - 8, hi);
  view.setUint32(padded.length - 4, bitLen >>> 0);

  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  hash.forEach((word, i) => outView.setUint32(i * 4, word));
  return out;
}

function toBytes(input: string | Uint8Array | ArrayBuffer): Uint8Array {
  if (typeof input === "string") return new TextEncoder().encode(input);
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

class Hash {
  private chunks: Uint8Array[] = [];
  constructor(private readonly hmacKey?: Uint8Array) {}
  update(data: string | Uint8Array) {
    this.chunks.push(toBytes(data));
    return this;
  }
  digest(encoding?: "hex"): Uint8Array | string {
    const length = this.chunks.reduce((n, c) => n + c.length, 0);
    const message = new Uint8Array(length);
    let offset = 0;
    for (const chunk of this.chunks) {
      message.set(chunk, offset);
      offset += chunk.length;
    }
    const digest = this.hmacKey ? hmacSha256(this.hmacKey, message) : sha256(message);
    return encoding === "hex" ? toHex(digest) : digest;
  }
}

function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const block = 64;
  let k = key;
  if (k.length > block) k = sha256(k);
  if (k.length < block) {
    const padded = new Uint8Array(block);
    padded.set(k);
    k = padded;
  }
  const o = new Uint8Array(block);
  const i = new Uint8Array(block);
  for (let n = 0; n < block; n++) {
    o[n] = k[n] ^ 0x5c;
    i[n] = k[n] ^ 0x36;
  }
  const inner = new Uint8Array(block + message.length);
  inner.set(i);
  inner.set(message, block);
  const outer = new Uint8Array(block + 32);
  outer.set(o);
  outer.set(sha256(inner), block);
  return sha256(outer);
}

export function createHash(algorithm: string): any {
  if (algorithm !== "sha256") throw new Error(`Unsupported hash ${algorithm}`);
  return new Hash();
}

export function createHmac(algorithm: string, key: string | Uint8Array): any {
  if (algorithm !== "sha256") throw new Error(`Unsupported hmac ${algorithm}`);
  return new Hash(toBytes(key));
}

export function randomBytes(size: number): any {
  const bytes = new Uint8Array(size);
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  return {
    toString(encoding?: string) {
      if (encoding === "hex") return toHex(bytes);
      return bytes;
    },
    length: bytes.length,
  };
}

export function timingSafeEqual(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function createPublicKey(..._args: any[]): any {
  throw new Error("JWK verification is not available in this browser runtime.");
}

export function verify(..._args: any[]): boolean {
  return false;
}

const nodeCrypto = { createHash, createHmac, randomBytes, timingSafeEqual, createPublicKey, verify };
export default nodeCrypto;
