export function readFileSync(..._args: any[]): string {
  throw new Error("Filesystem is not available in the browser runtime.");
}

export function existsSync(): boolean {
  return false;
}

export function mkdirSync(..._args: any[]): void {}

export function writeFileSync(..._args: any[]): void {}

const fs = { readFileSync, existsSync, mkdirSync, writeFileSync };
export default fs;
