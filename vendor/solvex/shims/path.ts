export function join(...parts: string[]): string {
  return parts.filter(Boolean).join("/");
}

export function resolve(...parts: string[]): string {
  return join(...parts);
}

export function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i <= 0 ? "." : p.slice(0, i);
}

const path = { join, resolve, dirname };
export default path;
