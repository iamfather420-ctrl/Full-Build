import { readFile } from 'node:fs/promises';
import { memoryUsage, resourceUsage } from 'node:process';
import { getHeapStatistics } from 'node:v8';

export interface MemorySafetySnapshot {
  rssBytes: number; heapUsedBytes: number; heapLimitBytes: number;
  externalBytes: number; arrayBuffersBytes: number; maxRssBytes: number;
  cgroupCurrentBytes?: number; cgroupPeakBytes?: number; cgroupLimitBytes?: number;
  cgroupOomEvents?: number; withinLimit: boolean; instrumentationAvailable: boolean;
}
async function readNumber(path: string): Promise<number | undefined> {
  try { const value = (await readFile(path, 'utf8')).trim(); if (value === 'max') return undefined; const n = Number(value); return Number.isFinite(n) ? n : undefined; } catch { return undefined; }
}
export class MemorySafetyInstrumentation {
  static async snapshot(limitBytes: number): Promise<MemorySafetySnapshot> {
    if (!Number.isSafeInteger(limitBytes) || limitBytes < 16 * 1024 * 1024) throw new Error('Memory limit must be a safe integer of at least 16 MiB.');
    const m = memoryUsage(), h = getHeapStatistics(), r = resourceUsage();
    const [current, peak, limit, eventsText] = await Promise.all([
      readNumber('/sys/fs/cgroup/memory.current'), readNumber('/sys/fs/cgroup/memory.peak'),
      readNumber('/sys/fs/cgroup/memory.max'), readFile('/sys/fs/cgroup/memory.events', 'utf8').catch(() => '')
    ]);
    const oomLine = eventsText.split('\n').find(line => line.startsWith('oom '));
    const oom = oomLine ? Number(oomLine.split(/\s+/)[1]) : undefined;
    const cgroupLimitBytes = limit;
    const measured = Math.max(m.rss, current ?? 0);
    const withinLimit = measured <= limitBytes && (cgroupLimitBytes === undefined || cgroupLimitBytes <= limitBytes) && (oom ?? 0) === 0;
    return { rssBytes: m.rss, heapUsedBytes: m.heapUsed, heapLimitBytes: h.heap_size_limit,
      externalBytes: m.external, arrayBuffersBytes: m.arrayBuffers, maxRssBytes: r.maxRSS * 1024,
      cgroupCurrentBytes: current, cgroupPeakBytes: peak, cgroupLimitBytes, cgroupOomEvents: oom,
      withinLimit, instrumentationAvailable: current !== undefined && peak !== undefined && limit !== undefined };
  }
}