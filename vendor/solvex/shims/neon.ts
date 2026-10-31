export class Pool {
  constructor() {
    throw new Error("Neon is not configured in this preview.");
  }
}

export function neon(): never {
  throw new Error("Neon is not configured in this preview.");
}

export default { Pool, neon };
