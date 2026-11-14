import express from "express";
import cors from "cors";
import { desc, gt, sql } from "drizzle-orm";
import { db, outreachProspects, outreachEvents } from "@workspace/db";
import { logger } from "./lib/logger";
import { startOutreachEngine } from "./lib/outreach";

function safeDatabaseTarget() {
  const raw = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
  if (!raw) return { configured: false };
  try {
    const parsed = new URL(raw);
    return {
      configured: true,
      host: parsed.hostname,
      user: decodeURIComponent(parsed.username),
      database: parsed.pathname.replace(/^\/+/, "").split("/")[0] || "default",
    };
  } catch {
    return { configured: true, parseable: false };
  }
}

const app = express();
const port = Number(process.env.PORT ?? 8080);
app.use(cors({ origin: process.env.APP_ORIGIN ?? false }));
app.use(express.json());


/**
 * Stage 14 evaluator gateway.
 * The OpenAI credential remains in Fly.io's secret store. GitHub Actions
 * authenticates with a short-lived GitHub OIDC token; no long-lived OpenAI
 * credential is copied into GitHub Actions.
 */
import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";

const STAGE14_AUDIENCE = "solvex-stage14-evaluator";
const TRUSTED_REPOSITORY = "iamfather420-ctrl/Full-Build";
const TRUSTED_REPOSITORY_ID = "1388681071";
const TRUSTED_WORKFLOWS = new Set([
  "refs/heads/main",
  "refs/heads/fix/46-gate-baseline-lifecycle-sandbox",
]);
let githubJwksCache: { expiresAt: number; keys: any[] } | undefined;

async function verifyStage14GitHubToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (header.alg !== "RS256" || typeof header.kid !== "string") return false;
    const now = Math.floor(Date.now() / 1000);
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const trustedWorkflow = typeof claims.workflow_ref === "string" &&
      claims.workflow_ref.startsWith(`${TRUSTED_REPOSITORY}/.github/workflows/ci.yml@`);
    const trustedPush = claims.event_name === "push" &&
      typeof claims.ref === "string" && TRUSTED_WORKFLOWS.has(claims.ref) &&
      claims.workflow_ref === `${TRUSTED_REPOSITORY}/.github/workflows/ci.yml@${claims.ref}`;
    // For pull_request, GitHub executes the base-branch workflow. Only accept
    // same-repository PRs targeting main from the single protected work branch.
    const trustedPullRequest = claims.event_name === "pull_request" &&
      claims.base_ref === "main" &&
      claims.head_ref === "fix/46-gate-baseline-lifecycle-sandbox" &&
      claims.head_repository === TRUSTED_REPOSITORY &&
      String(claims.head_repository_id) === TRUSTED_REPOSITORY_ID &&
      trustedWorkflow;
    if (claims.iss !== "https://token.actions.githubusercontent.com" ||
        !audience.includes(STAGE14_AUDIENCE) || !Number.isFinite(claims.exp) ||
        claims.exp <= now || (Number.isFinite(claims.nbf) && claims.nbf > now) ||
        claims.repository !== TRUSTED_REPOSITORY ||
        String(claims.repository_id) !== TRUSTED_REPOSITORY_ID ||
        !(trustedPush || trustedPullRequest)) return false;

    if (!githubJwksCache || githubJwksCache.expiresAt <= Date.now()) {
      const response = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return false;
      const jwks = await response.json() as { keys?: any[] };
      if (!Array.isArray(jwks.keys)) return false;
      githubJwksCache = { keys: jwks.keys, expiresAt: Date.now() + 10 * 60_000 };
    }
    const jwk = githubJwksCache.keys.find((key) => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return false;
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    return verifySignature(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2], "base64url"),
    );
  } catch {
    return false;
  }
}

function parseStage14Evaluation(raw: string): { verdict: "ACCEPT" | "REJECT"; rationale: string } | null {
  try {
    const value = JSON.parse(raw);
    if (!value || !["ACCEPT", "REJECT"].includes(value.verdict) ||
        typeof value.rationale !== "string" || !value.rationale.trim() ||
        value.rationale.length > 4000) return null;
    return { verdict: value.verdict, rationale: value.rationale.trim() };
  } catch { return null; }
}

app.post("/api/stage14/evaluate", express.json({ limit: "64kb" }), async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const bearer = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer || !(await verifyStage14GitHubToken(bearer))) {
    return res.status(401).json({ error: "trusted_github_oidc_identity_required" });
  }
  const { payload, inputSha256, modelId } = req.body ?? {};
  if (typeof payload !== "string" || payload.length > 48_000 ||
      typeof inputSha256 !== "string" || !/^[a-f0-9]{64}$/.test(inputSha256) ||
      createHash("sha256").update(payload).digest("hex") !== inputSha256 ||
      typeof modelId !== "string" || !/^[a-zA-Z0-9._-]{1,80}$/.test(modelId)) {
    return res.status(400).json({ error: "invalid_or_unbound_evaluation_input" });
  }
  let decoded: any;
  try { decoded = JSON.parse(payload); } catch { return res.status(400).json({ error: "invalid_evaluation_payload" }); }
  if (decoded?.protocol !== "solvex-single-openai-evaluator-v1" || !("input" in decoded)) {
    return res.status(400).json({ error: "unsupported_evaluation_protocol" });
  }
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.SOLVEX_FLY ?? "";
  if (!apiKey) return res.status(503).json({ error: "fly_openai_credential_not_configured" });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(45_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        store: false,
        input: [
          { role: "system", content: [{ type: "input_text", text:
            "You are the single-model SolveX Stage 14 evidence evaluator. Review only the supplied evidence. Return ACCEPT only when the evidence is internally consistent, bound to the submitted input hash, and supports the stated verification claims. Do not infer missing tests, proofs, runtime facts, or external attestations. Otherwise return REJECT. Provide concise, specific rationale."
          }] },
          { role: "user", content: [{ type: "input_text", text: payload }] },
        ],
        text: { format: { type: "json_schema", name: "solvex_stage14_verdict", strict: true,
          schema: { type: "object", properties: {
            verdict: { type: "string", enum: ["ACCEPT", "REJECT"] },
            rationale: { type: "string" },
          }, required: ["verdict", "rationale"], additionalProperties: false } } },
      }),
    });
    if (!response.ok) {
      logger.error({ status: response.status }, "Stage 14 OpenAI evaluator request failed");
      return res.status(502).json({ error: `openai_evaluator_http_${response.status}` });
    }
    const body = await response.json() as any;
    let output = typeof body.output_text === "string" ? body.output_text : "";
    if (!output) {
      output = (body.output ?? []).flatMap((item: any) => item.content ?? [])
        .filter((part: any) => part.type === "output_text" && typeof part.text === "string")
        .map((part: any) => part.text).join("\\n");
    }
    const evaluation = parseStage14Evaluation(output);
    if (!evaluation) return res.status(502).json({ error: "openai_returned_invalid_structured_verdict" });
    return res.json(evaluation);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : "unknown" }, "Stage 14 evaluator gateway failed");
    return res.status(502).json({ error: "stage14_evaluator_unavailable" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "solvex-outreach", database: "configured" }));
app.get("/api/outreach/ai-status", async (_req, res) => {
  const { getLocalInferenceRuntime } = await import("../../../src/inference/LocalInferenceRuntime");
  const local = await getLocalInferenceRuntime().probe();
  const externalOptIn = process.env.ALLOW_EXTERNAL_OUTREACH_PROVIDER === "true";
  const externalConfigured = Boolean(process.env.OPENAI_API_KEY ?? process.env.SOLVEX_FLY);
  res.json({
    configured: local.ready || (externalOptIn && externalConfigured),
    mode: local.ready ? "daisy-local-assets-configured" :
      externalOptIn && externalConfigured ? "explicit-external-fallback" : "lead-discovery-only",
    firstParty: {
      assetsPresent: local.ready,
      probeReady: local.ready,
      inferenceExecutionVerified: false,
      runtimeId: local.runtimeId,
      modelId: local.modelId,
      modelVersion: local.modelVersion,
      offlineCapable: local.offlineCapable,
    },
    externalProvider: {
      enabledByExplicitOptIn: externalOptIn,
      configured: externalConfigured,
      model: externalOptIn ? (process.env.OUTREACH_AI_MODEL ?? "gpt-4o-mini") : null,
    },
    deliveryEnabled: false,
  });
});
app.get("/api/outreach/stats", async (_req, res) => {
  try {
    const [row] = await db.select({
      total: sql<number>`count(*)::int`,
      newLeads: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'discovered')::int`,
      draftsReady: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'composed')::int`,
      delivered: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'delivered')::int`,
      replies: sql<number>`count(*) filter (where ${outreachProspects.stage} = 'replied')::int`,
      unanswered: sql<number>`count(*) filter (where ${outreachProspects.unanswered})::int`,
    }).from(outreachProspects);
    res.json({ ...row, channelConnected: false });
  } catch (err) { logger.error({ err }, "outreach stats query failed"); res.status(503).json({ error: "Outreach database query failed" }); }
});
app.get("/api/outreach/prospects", async (_req, res) => {
  try { res.json(await db.select().from(outreachProspects).orderBy(desc(outreachProspects.updatedAt)).limit(60)); }
  catch (err) { logger.error({ err }, "outreach prospects query failed"); res.status(503).json({ error: "Outreach database query failed" }); }
});
app.get("/api/outreach/events", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "40"), 10) || 40, 200);
    res.json(await db.select().from(outreachEvents).where(gt(outreachEvents.id, 0)).orderBy(desc(outreachEvents.createdAt)).limit(limit));
  } catch (err) { logger.error({ err }, "outreach events query failed"); res.status(503).json({ error: "Outreach database query failed" }); }
});
app.listen(port, () => { logger.info({ port, databaseTarget: safeDatabaseTarget() }, "SolveX outreach API listening"); startOutreachEngine(); });
