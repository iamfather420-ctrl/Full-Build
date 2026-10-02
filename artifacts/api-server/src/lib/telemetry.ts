import { performance } from "perf_hooks";
import v8 from "v8";

let reqCount = 0;
let opsPerSec = 0;
let eventLoopLagMs = 0;
let systemStatic = false;
let lastTick = performance.now();

setInterval(() => {
  opsPerSec = reqCount;
  reqCount = 0;
}, 1000);

setInterval(() => {
  const now = performance.now();
  eventLoopLagMs = Math.max(0, now - lastTick - 1000);
  lastTick = now;
}, 1000);

export const incrementOps = (): void => {
  reqCount++;
};

export const setSystemStatic = (v: boolean): void => {
  systemStatic = v;
};

export const getTelemetry = () => {
  const heap = v8.getHeapStatistics();
  const mem = process.memoryUsage();
  return {
    opsPerSec,
    heapUsedMB: (heap.used_heap_size / 1024 / 1024).toFixed(2),
    heapTotalMB: (heap.total_heap_size / 1024 / 1024).toFixed(2),
    eventLoopLagMs: eventLoopLagMs.toFixed(2),
    uptimeSec: Math.floor(process.uptime()),
    rssMB: (mem.rss / 1024 / 1024).toFixed(2),
    externalMB: (mem.external / 1024 / 1024).toFixed(2),
    systemStatic,
  };
};
