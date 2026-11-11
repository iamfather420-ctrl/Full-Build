import app from "./app";
import { logger } from "./lib/logger";
import { startHeartbeat } from "./lib/heartbeat";
import { initializeWorkerPool } from "./lib/workers";
import { initVaultSidecar } from "./lib/vault";
import { runKineticCore } from "./lib/kinetic";
import { startAutonomousCrawler } from "./lib/crawler";
import { startOutreachEngine } from "./lib/outreach";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  initVaultSidecar();
  initializeWorkerPool();
  startHeartbeat();
  runKineticCore();
  startAutonomousCrawler();
  startOutreachEngine();

  logger.info("SOLVEX-CORE-FINALIZED: ACTIVE | Sovereign Operating Mode | 54-Node Grid + Keyless Vault + Kinetic Resolver + Autonomous Crawler + Outreach");
});
