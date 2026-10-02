/**
 * VAULT BRIDGE ENGINE — Brain Resolution → Vault Product Mapping
 *
 * Deterministic, zero-hallucination mapping from TETHER-BUBBLE resolution
 * types to specific vault product IDs. Each resolution type is anchored to
 * 2-3 vault products and a set of institutional compliance controls.
 *
 * Mapping is hash-locked: SHA-256(brainId + productIds + lamport) = manifestHash
 */

import crypto from "crypto";
import { nanoid } from "nanoid";
import { db, vaultBridgeTable, paradoxProductsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { tickLamport } from "./lamport";
import { logger } from "./logger";
import type { ResolutionType } from "./heuristic-kernel";

// ── Product catalogue snapshot (canonical IDs from paradox_products) ──────────
interface ProductRef {
  id: string;
  name: string;
}

// ── Resolution → Vault mapping spec ──────────────────────────────────────────
interface VaultMapping {
  primary: string;       // product ID
  secondary?: string;
  tertiary?: string;
  rationale: string;
  complianceFrameworks: string[];
  nistControls: string[];
  soc2Controls: string[];
  isoControls: string[];
}

const RESOLUTION_TO_VAULT: Record<string, VaultMapping> = {
  TETHER_BUBBLE_CALCULUS: {
    primary:   "SOLVEX-HFT-07",
    secondary: "SOLVEX-HFT-10",
    tertiary:  "SOLVEX-HFT-52",
    rationale: "Convergence-series resolution maps directly to latency and settlement pipeline products. " +
      "The Achilles framework (infinite sub-steps → finite total cost) is the exact mathematical model " +
      "underlying ultra-low-latency order routing and real-time gross settlement optimisation. " +
      "VWAP/TWAP execution applies limit-theory to time-sliced order placement.",
    complianceFrameworks: ["NIST SP 800-53 Rev 5", "ISO 27001:2022"],
    nistControls: ["SI-7", "AU-12", "SC-5", "SA-17"],
    soc2Controls: ["CC7.1", "CC9.1"],
    isoControls: ["A.12.1.3", "A.17.2.1"],
  },

  TETHER_BUBBLE_BAYESIAN: {
    primary:   "SOLVEX-GOV-92",
    secondary: "SOLVEX-GOV-83",
    tertiary:  "SOLVEX-GOV-24",
    rationale: "Posterior-update resolution maps to continuous model validation and drift detection. " +
      "Bayesian conditioning is the mathematical core of Model Drift Monitoring — each new " +
      "data batch updates the prior probability distribution of model validity. " +
      "Hallucination firewalls apply likelihood-ratio testing to flag distributional anomalies.",
    complianceFrameworks: ["NIST AI RMF 1.0", "ISO/IEC 42001:2023", "SR 11-7"],
    nistControls: ["SA-10", "SI-3", "RA-3"],
    soc2Controls: ["CC6.8", "CC7.2"],
    isoControls: ["A.14.2.7", "A.18.1.4"],
  },

  TETHER_BUBBLE_FUZZY_LOGIC: {
    primary:   "SOLVEX-IAM-20",
    secondary: "SOLVEX-IAM-72",
    tertiary:  "SOLVEX-IAM-81",
    rationale: "Binary→spectrum resolution (Sorites) maps directly to Zero-Trust RBAC and adaptive " +
      "MFA risk scoring. Classical access control treats identity as binary (granted/denied); " +
      "the Sorites resolution forces a spectrum model — exactly what risk-scored, contextual " +
      "entitlement engines implement. Entitlement intelligence continuously re-evaluates " +
      "the gradient rather than applying a fixed threshold.",
    complianceFrameworks: ["NIST SP 800-53 Rev 5", "NIST SP 800-207 (Zero Trust)", "ISO 27001:2022"],
    nistControls: ["AC-2", "AC-6", "IA-2", "IA-3", "AC-17"],
    soc2Controls: ["CC6.1", "CC6.2", "CC6.3"],
    isoControls: ["A.9.2.1", "A.9.4.1", "A.9.4.5"],
  },

  TETHER_BUBBLE_IDENTITY_THEORY: {
    primary:   "SOLVEX-ZK-45",
    secondary: "SOLVEX-ZK-35",
    tertiary:  "SOLVEX-IAM-23",
    rationale: "Continuity-vs-constitution resolution (Ship of Theseus) maps to zero-knowledge " +
      "identity binding and selective disclosure. The paradox of whether an entity remains " +
      "'the same' through incremental change is resolved by ZK proofs — you prove attribute " +
      "membership without revealing the underlying credential, preserving identity continuity " +
      "without full disclosure. Verifiable Credentials are the protocol implementation.",
    complianceFrameworks: ["NIST SP 800-53 Rev 5", "GDPR Art. 25 (PbD)", "ISO 27001:2022"],
    nistControls: ["IA-5", "IA-8", "SC-12", "SC-17"],
    soc2Controls: ["CC6.1", "CC6.7"],
    isoControls: ["A.9.4.2", "A.18.1.4"],
  },

  TETHER_BUBBLE_SET_THEORY: {
    primary:   "SOLVEX-ZK-04",
    secondary: "SOLVEX-ZK-01",
    tertiary:  "SOLVEX-ZK-05",
    rationale: "Type-stratification barrier resolution (Russell/Barber/Kleene-Rosser) maps to " +
      "Byzantine Fault Tolerant escrow and ZK-KYC settlement. Russell's resolution of self-referential " +
      "paradoxes introduced type theory — exactly the trust model in BFT consensus where no single " +
      "node can simultaneously be inside and outside the quorum. MPC Custody Core uses threshold " +
      "secret sharing to prevent any signer from being its own verifier.",
    complianceFrameworks: ["NIST SP 800-53 Rev 5", "ISO 27001:2022", "FIPS 140-3"],
    nistControls: ["SC-12", "SC-28", "SC-13", "SI-7"],
    soc2Controls: ["CC6.6", "CC6.7", "CC9.2"],
    isoControls: ["A.10.1.1", "A.10.1.2", "A.18.1.5"],
  },

  TETHER_BUBBLE_FRACTAL_GEOMETRY: {
    primary:   "SOLVEX-RCM-97",
    secondary: "SOLVEX-RCM-103",
    tertiary:  "SOLVEX-RCM-104",
    rationale: "Scale-dependent measurement resolution (Coastline) maps to capital stress testing " +
      "and climate risk modelling. The coastline paradox is the formal description of risk " +
      "surface expansion under finer resolution — the same phenomenon that causes Basel III " +
      "stress tests to produce different VaR at different time horizons. Climate risk is " +
      "inherently fractal: macro trends fragment into tail-risk micro-events at finer resolution.",
    complianceFrameworks: ["BCBS 239", "NIST SP 800-53 Rev 5", "IFRS 9", "TCFD"],
    nistControls: ["AU-3", "AU-9", "RA-3", "RA-5"],
    soc2Controls: ["CC9.1", "CC9.2"],
    isoControls: ["A.18.1.4", "A.12.4.1"],
  },

  TETHER_BUBBLE_INFORMATION_THEORY: {
    primary:   "SOLVEX-SEC-14",
    secondary: "SOLVEX-GOV-85",
    tertiary:  "SOLVEX-GOV-84",
    rationale: "Signal-partitioning resolution (Simpson's) maps to immutable audit logging and " +
      "AI decision trail generation. Simpson's paradox is the canonical demonstration that " +
      "aggregate audit logs conceal the true signal — SOC2 immutable logs are the partition " +
      "mechanism. Federated Learning Privacy Orchestrator applies the same principle: " +
      "federated partitioning prevents aggregate data from concealing per-silo anomalies.",
    complianceFrameworks: ["SOC 2 Type II", "NIST SP 800-53 Rev 5", "ISO 27001:2022"],
    nistControls: ["AU-2", "AU-9", "AU-12", "SI-12"],
    soc2Controls: ["CC7.2", "CC7.3", "A1.2"],
    isoControls: ["A.12.4.1", "A.12.4.2", "A.12.4.3"],
  },

  TETHER_BUBBLE_CAUSAL_LOOP: {
    primary:   "SOLVEX-RCM-102",
    secondary: "SOLVEX-RCM-100",
    tertiary:  "SOLVEX-RCM-101",
    rationale: "Self-consistent temporal logic resolution (Grandfather/Bootstrap) maps to regulatory " +
      "change management and AML transaction monitoring. Causal-loop paradoxes arise in compliance " +
      "when a regulation references its own enforcement mechanism — Regulatory Change Management " +
      "resolves this by externalising the causal chain into a dependency graph with no cycles. " +
      "AML monitoring applies the same principle: transaction sequences are modelled as a DAG, " +
      "not a loop, with Sanctions Screening as the terminal node.",
    complianceFrameworks: ["NIST SP 800-53 Rev 5", "FATF Recommendations", "SOC 2 Type II"],
    nistControls: ["PM-9", "RA-2", "AU-3", "SI-12"],
    soc2Controls: ["CC9.2", "PI1.5"],
    isoControls: ["A.18.1.1", "A.18.2.1", "A.6.1.1"],
  },

  TETHER_BUBBLE_PREDICATE_LOGIC: {
    primary:   "SOLVEX-SEC-13",
    secondary: "SOLVEX-SEC-15",
    tertiary:  "SOLVEX-SEC-63",
    rationale: "Tautological resolution (Drinker/Voting) maps to cloud attestation and real-time " +
      "threat detection. Predicate logic paradoxes resolve when the domain quantifier is fixed — " +
      "OSFI B-13 Cloud Attestation does exactly this: it defines a fixed institutional domain " +
      "against which every cloud control predicate is evaluated. Threat anomaly sentinel applies " +
      "predicate logic to rule-based detection: if-and-only-if conditions that fire without ambiguity.",
    complianceFrameworks: ["NIST SP 800-53 Rev 5", "OSFI Guideline B-13", "SOC 2 Type II", "ISO 27001:2022"],
    nistControls: ["CA-2", "CA-8", "RA-5", "IR-4"],
    soc2Controls: ["CC6.6", "CC7.1", "CC7.2"],
    isoControls: ["A.12.6.1", "A.16.1.1", "A.16.1.5"],
  },

  TETHER_BUBBLE_BEHAVIORAL: {
    primary:   "SOLVEX-IAM-22",
    secondary: "SOLVEX-GOV-86",
    tertiary:  "SOLVEX-GOV-27",
    rationale: "Purpose-over-pleasure reframe resolution (Paradox of Hedonism) maps to behavioral " +
      "biometric verification and AI bias detection. The Hedonism paradox resolves by shifting " +
      "the optimization target from the outcome metric to the underlying purpose — the identical " +
      "move that Behavioral Biometric Verifiers make: instead of optimising for credential " +
      "correctness, they optimise for behavioral consistency. Bias Detection Suite applies " +
      "the same reframe to model evaluation: optimise for fairness, not accuracy alone.",
    complianceFrameworks: ["NIST AI RMF 1.0", "NIST SP 800-53 Rev 5", "ISO/IEC 42001:2023"],
    nistControls: ["IA-3", "IA-5", "SI-10", "PM-26"],
    soc2Controls: ["CC6.1", "CC6.3"],
    isoControls: ["A.9.4.2", "A.18.1.4"],
  },

  TETHER_BUBBLE_RELEVANCE_LOGIC: {
    primary:   "SOLVEX-ZK-34",
    secondary: "SOLVEX-ZK-39",
    tertiary:  "SOLVEX-GOV-90",
    rationale: "Entailment-restriction resolution maps to ZK regulatory reporting and audit trail " +
      "compression. Relevance logic resolves ex falso paradoxes by restricting what can be " +
      "derived — ZK proofs implement this exactly: the verifier learns only the specific " +
      "entailment (the report is compliant) without gaining access to the full data set. " +
      "ZK-Audit Trail Compressor eliminates irrelevant audit noise via the same restriction.",
    complianceFrameworks: ["NIST SP 800-53 Rev 5", "GDPR Art. 5 (Data Minimisation)", "ISO 27001:2022"],
    nistControls: ["SC-12", "AU-9", "SI-12", "AC-3"],
    soc2Controls: ["CC6.7", "A1.2"],
    isoControls: ["A.12.4.3", "A.18.1.4"],
  },

  SOVEREIGN_HOLD: {
    primary:   "SOLVEX-MASTER-29",
    secondary: "SOLVEX-APEX-105",
    rationale: "Paradox held for senior review — no automated key match. Escalated to the Master " +
      "Apex Bundle which provides the full 29-product institutional coverage for unclassified " +
      "edge cases requiring human expert adjudication.",
    complianceFrameworks: ["NIST SP 800-53 Rev 5"],
    nistControls: ["PM-1", "CA-5"],
    soc2Controls: [],
    isoControls: [],
  },
};

// ── Product name lookup from DB ───────────────────────────────────────────────
const productNameCache = new Map<string, string>();

async function lookupProductName(productId: string): Promise<string> {
  if (productNameCache.has(productId)) return productNameCache.get(productId)!;
  try {
    const [row] = await db
      .select({ name: paradoxProductsTable.name })
      .from(paradoxProductsTable)
      .where(eq(paradoxProductsTable.id, productId))
      .limit(1);
    const name = row?.name ?? productId;
    productNameCache.set(productId, name);
    return name;
  } catch {
    return productId;
  }
}

// ── Bridge a single brain entry to vault products ─────────────────────────────
export async function bridgeResolutionToVault(opts: {
  brainId: string;
  paradoxId: number;
  paradoxTitle: string;
  resolutionType: string;
  lamport: number;
}): Promise<void> {
  const mapping = RESOLUTION_TO_VAULT[opts.resolutionType] ?? RESOLUTION_TO_VAULT.SOVEREIGN_HOLD;

  const [primaryName, secondaryName, tertiaryName] = await Promise.all([
    lookupProductName(mapping.primary),
    mapping.secondary ? lookupProductName(mapping.secondary) : Promise.resolve(undefined),
    mapping.tertiary  ? lookupProductName(mapping.tertiary)  : Promise.resolve(undefined),
  ]);

  const lamport = opts.lamport ?? tickLamport();
  const productSig = [mapping.primary, mapping.secondary ?? "", mapping.tertiary ?? ""].join("|");
  const manifestHash = crypto
    .createHash("sha256")
    .update(`${opts.brainId}:${productSig}:${lamport}`)
    .digest("hex");

  await db
    .insert(vaultBridgeTable)
    .values({
      manifestId: nanoid(),
      brainId: opts.brainId,
      paradoxId: opts.paradoxId,
      paradoxTitle: opts.paradoxTitle,
      resolutionType: opts.resolutionType,
      primaryProductId: mapping.primary,
      primaryProductName: primaryName,
      secondaryProductId: mapping.secondary ?? null,
      secondaryProductName: secondaryName ?? null,
      tertiaryProductId: mapping.tertiary ?? null,
      tertiaryProductName: tertiaryName ?? null,
      institutionalRationale: mapping.rationale,
      complianceFrameworks: JSON.stringify(mapping.complianceFrameworks),
      nistControls: JSON.stringify(mapping.nistControls),
      soc2Controls: JSON.stringify(mapping.soc2Controls),
      isoControls: JSON.stringify(mapping.isoControls),
      manifestHash,
      lamport,
    })
    .onConflictDoNothing();
}

// ── Backfill all existing brain entries that have no bridge record ─────────────
export async function bridgeAll(): Promise<{ bridged: number; skipped: number }> {
  const { daisyBrainTable } = await import("@workspace/db");
  const brainEntries = await db.select().from(daisyBrainTable);
  const existing = await db.select({ brainId: vaultBridgeTable.brainId }).from(vaultBridgeTable);
  const bridgedIds = new Set(existing.map(r => r.brainId));

  let bridged = 0;
  let skipped = 0;

  for (const entry of brainEntries) {
    if (bridgedIds.has(entry.brainId)) { skipped++; continue; }
    try {
      await bridgeResolutionToVault({
        brainId: entry.brainId,
        paradoxId: entry.paradoxId,
        paradoxTitle: entry.paradoxTitle,
        resolutionType: entry.resolutionType,
        lamport: entry.lamport,
      });
      bridged++;
    } catch (err) {
      logger.error({ err, brainId: entry.brainId }, "vault-bridge: failed to bridge entry");
      skipped++;
    }
  }

  return { bridged, skipped };
}

// ── Evidence bundle for a single paradox (for the API) ────────────────────────
export async function getEvidenceBundle(paradoxId: number) {
  const rows = await db
    .select()
    .from(vaultBridgeTable)
    .where(eq(vaultBridgeTable.paradoxId, paradoxId));

  return rows.map(r => ({
    manifestId: r.manifestId,
    manifestHash: r.manifestHash,
    resolutionType: r.resolutionType,
    products: [
      { id: r.primaryProductId, name: r.primaryProductName, rank: "PRIMARY" },
      ...(r.secondaryProductId ? [{ id: r.secondaryProductId, name: r.secondaryProductName, rank: "SECONDARY" }] : []),
      ...(r.tertiaryProductId  ? [{ id: r.tertiaryProductId,  name: r.tertiaryProductName,  rank: "TERTIARY"  }] : []),
    ],
    institutionalRationale: r.institutionalRationale,
    compliance: {
      frameworks: JSON.parse(r.complianceFrameworks),
      nist: JSON.parse(r.nistControls),
      soc2: JSON.parse(r.soc2Controls),
      iso: JSON.parse(r.isoControls),
    },
    lamport: r.lamport,
    createdAt: r.createdAt,
  }));
}
