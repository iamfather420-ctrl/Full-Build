import app from "./app";
import { logger } from "./lib/logger";
import { startHeartbeat } from "./lib/heartbeat";
import { initializeWorkerPool } from "./lib/workers";
import { initVaultSidecar } from "./lib/vault";
import { runKineticCore } from "./lib/kinetic";
import { startAutonomousCrawler } from "./lib/crawler";
import { startOutreachEngine } from "./lib/outreach";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripeClient";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORTValue: "${rawPort}"`);
}

async function initStripe(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL missing — skipping Stripe init");
    return;
  }
  try {
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");

    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe backfill complete"))
      .catch((err) => logger.warn({ err }, "Stripe backfill failed (non-fatal)"));
  } catch (err) {
    logger.warn({ err }, "Stripe init failed — payments unavailable until Stripe integration is connected");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Pillar 5: Vault sidecar first — forks child process, then erases secrets from main env
  initVaultSidecar();

  // Pillar 1: 54-node worker grid with consensus
  initializeWorkerPool();

  // Pillar 2: Homeostatic watchdog
  startHeartbeat();

  // Kinetic Resolver: synaptic entropy loop — Force-Collapse armed at threshold 0.85
  runKineticCore();

  // Autonomous Crawler: HN + Reddit + StackOverflow — fires 5s after boot, then every 10min
  startAutonomousCrawler();

  // Autonomous Outreach Engine: dAIsy discovers prospects, pitches, negotiates pricing, closes deals — no operator input
  startOutreachEngine();

  // Payment rails: Stripe schema + webhook + backfill (non-blocking, graceful if not connected)
  initStripe();

  logger.info("SOLVEX-CORE-FINALIZED: ACTIVE | Sovereign Operating Mode | 54-Node Grid + Keyless Vault + Kinetic Resolver + Autonomous Crawler + Payments");
});
