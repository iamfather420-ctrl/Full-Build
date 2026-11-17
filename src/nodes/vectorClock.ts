export type VectorClock = Record<string, number>;

export function tick(clock: VectorClock, processId: string): VectorClock {
  return { ...clock, [processId]: (clock[processId] ?? 0) + 1 };
}

export function receive(local: VectorClock, incoming: VectorClock, processId: string): VectorClock {
  const keys = new Set([...Object.keys(local), ...Object.keys(incoming), processId]);
  const merged: VectorClock = {};
  for (const key of keys) merged[key] = Math.max(local[key] ?? 0, incoming[key] ?? 0);
  merged[processId] = (merged[processId] ?? 0) + 1;
  return merged;
}

/** True only when every component of left is <= right and at least one is strictly less. */
export function happensBefore(left: VectorClock, right: VectorClock): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  let strictlyLess = false;
  for (const key of keys) {
    const a = left[key] ?? 0;
    const b = right[key] ?? 0;
    if (a > b) return false;
    if (a < b) strictlyLess = true;
  }
  return strictlyLess;
}
