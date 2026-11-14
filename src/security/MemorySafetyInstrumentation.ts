import { readFile } from 'node:fs/promises';
import { memoryUsage, resourceUsage } from 'node:process';
import { getHeapStatistics } from 'node:v8';

export interface MemorySafetySnapshot {
  rssBytes: number; heapUsedBytes: number; heapLimitBytes: number;
  externalBytes: number; arrayBuffersBytes: number; maxRssBytes: number;
  cgroupCurrentBytes?: number; cgroupPeakBytes?: number; cgroupLimitBytes?: number;
  cgroupOomEvents?: number; cgroupInstrumentationAvailable: boolean;
  withinLimit: boolean; instrumentationAvailable: boolean;
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
    const eventCounts = new Map(eventsText.split('\n').filter(Boolean).map(line => {
      const [name, count] = line.trim().split(/\s+/);
      return [name, Number(count)] as const;
    }));
    const oom = eventCounts.get('oom');
    const oomKill = eventCounts.get('oom_kill');
    const oomEvents = oom === undefined || oomKill === undefined ? undefined : oom + oomKill;
    const maxRssBytes = r.maxRSS * 1024;
    const processInstrumentationAvailable = [m.rss, m.heapUsed, h.heap_size_limit, maxRssBytes, m.external, m.arrayBuffers]
      .every(value => Number.isFinite(value) && value >= 0);
    const cgroupInstrumentationAvailable = current !== undefined && peak !== undefined && limit !== undefined &&
      oom !== undefined && oomKill !== undefined;
    // The submitted code's hard memory ceiling is enforced by its dedicated sandbox cgroup.
    // The trusted orchestrator is observed using process RSS/heap/max-RSS; a runner's
    // unbounded host cgroup must not be mistaken for missing process instrumentation.
    const processWithinLimit = processInstrumentationAvailable &&
      m.rss <= limitBytes && m.heapUsed <= limitBytes && maxRssBytes <= limitBytes;
    const cgroupWithinLimit = !cgroupInstrumentationAvailable ||
      (Math.max(current!, peak!) <= limitBytes && limit! <= limitBytes && oomEvents === 0);
    const withinLimit = processWithinLimit && cgroupWithinLimit;
    return {
      rssBytes: m.rss, heapUsedBytes: m.heapUsed, heapLimitBytes: h.heap_size_limit,
      externalBytes: m.external, arrayBuffersBytes: m.arrayBuffers, maxRssBytes,
      cgroupCurrentBytes: current, cgroupPeakBytes: peak, cgroupLimitBytes: limit,
      cgroupOomEvents: oomEvents, cgroupInstrumentationAvailable,
      withinLimit, instrumentationAvailable: processInstrumentationAvailable
    };
  }
}