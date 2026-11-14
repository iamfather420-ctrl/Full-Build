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
    const eventCounts = new Map(eventsText.split('\\n').filter(Boolean).map(line => {
      const [name, count] = line.trim().split(/\\s+/);
      return [name, Number(count)] as const;
    }));
    const oom = eventCounts.get('oom');
    const oomKill = eventCounts.get('oom_kill');
    const oomEvents = oom === undefined || oomKill === undefined ? undefined : oom + oomKill;
    const maxRssBytes = r.maxRSS * 1024;
    const processMetricsAvailable = Number.isFinite(m.rss) && Number.isFinite(maxRssBytes) && maxRssBytes > 0;
    const cgroupMetricsAvailable = current !== undefined && peak !== undefined && limit !== undefined &&
      oom !== undefined && oomKill !== undefined;
    const cgroupWithinLimit = !cgroupMetricsAvailable ||
      (Math.max(current!, peak!) <= limitBytes && limit! <= limitBytes && oomEvents === 0);
    // The orchestrator runs on a shared CI host where the root cgroup can be
    // unlimited. Enforce its actual current and lifetime peak RSS separately;
    // the submitted program itself is independently bounded by the sandbox
    // container's cgroup limit, peak, and OOM counters.
    const withinLimit = processMetricsAvailable && m.rss <= limitBytes &&
      maxRssBytes <= limitBytes && cgroupWithinLimit;
    return {
      rssBytes: m.rss, heapUsedBytes: m.heapUsed, heapLimitBytes: h.heap_size_limit,
      externalBytes: m.external, arrayBuffersBytes: m.arrayBuffers, maxRssBytes,
      cgroupCurrentBytes: current, cgroupPeakBytes: peak, cgroupLimitBytes: limit,
      cgroupOomEvents: oomEvents, withinLimit,
      instrumentationAvailable: processMetricsAvailable && (!cgroupMetricsAvailable || cgroupWithinLimit)
    };
  }
}
