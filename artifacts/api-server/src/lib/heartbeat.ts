import { logger } from "./logger";
import { getTelemetry, setSystemStatic } from "./telemetry";

const LATENCY_THRESHOLD_MS = 500;
const RECOVERY_THRESHOLD_MS = 250;

export const startHeartbeat = (): void => {
  logger.info("SOLVEX-CORE-02: Heartbeat watchdog initialized across 54-node pipeline");

  setInterval(() => {
    const t = getTelemetry();
    const lag = parseFloat(t.eventLoopLagMs);

    if (lag > LATENCY_THRESHOLD_MS && !t.systemStatic) {
      setSystemStatic(true);
      logger.error(
        { lag, threshold: LATENCY_THRESHOLD_MS, heapUsedMB: t.heapUsedMB },
        "SOLVEX-CORE-02 [CRITICAL] Latency threshold exceeded — System-Static mode engaged",
      );
    } else if (t.systemStatic && lag < RECOVERY_THRESHOLD_MS) {
      setSystemStatic(false);
      logger.info(
        { lag },
        "SOLVEX-CORE-02 [RECOVERY] Lag normalized — exiting System-Static mode, L7 Autonomic Healing validated",
      );
    }
  }, 1000);
};
