/**
 * UAREFAKE Proof-Before-Power engine (PBP-1).
 * A finite, decidable policy theory. Not a language-model opinion.
 *
 * executable(a) holds only if every obligation holds.
 * A failing obligation is a SAT countermodel of its negation.
 * All obligations holding means the unsafe state is UNSAT in this theory.
 */

export const POLICY = {
  id: "PBP-1",
  name: "Proof Before Power",
  allowlist: ["ACCOUNT_STATUS_UPDATE"],
  demoTenant: "TENANT_ENTERPRISE_DEMO",
  maxBlast: 1,
  jitWindowMs: 120_000,
  theory:
    "executable(a) iff allowlisted(op) ∧ tenantBound ∧ envSafe ∧ blastBounded ∧ reversible ∧ authPresent ∧ authBinds(commitment) ∧ jitFresh",
};

const textEncoder = new TextEncoder();

function rotr(x, n) {
  return (x >>> n) | (x << (32 - n));
}

/** Pure SHA-256. Matches the NIST test vector for "abc". */
export function sha256(input) {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : input;
  const bitLen = bytes.length * 8;
  const withOne = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  withOne.set(bytes);
  withOne[bytes.length] = 0x80;
  const view = new DataView(withOne.buffer);
  const hi = Math.floor(bitLen / 0x100000000);
  view.setUint32(withOne.length - 8, hi);
  view.setUint32(withOne.length - 4, bitLen >>> 0);

  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let offset = 0; offset < withOne.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + k[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((n) => n.toString(16).padStart(8, "0")).join("");
}

export function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
}

export function compileIntent(text, overrides = {}) {
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  const production = /\b(production|prod|live records)\b/.test(lower);
  const bulk = /\b(bulk|all|every)\b/.test(lower);
  const known = /\b(status|suspend|account)\b/.test(lower);
  return {
    intent: raw,
    operation: overrides.operation || (known ? "ACCOUNT_STATUS_UPDATE" : "UNKNOWN_OP"),
    tenant: overrides.tenant || (production ? "TENANT_PRODUCTION" : POLICY.demoTenant),
    environment: overrides.environment || (production ? "production" : "sandbox"),
    targetCount: overrides.targetCount ?? (bulk ? 1284 : 1),
    targetIds: overrides.targetIds || (bulk ? ["*"] : ["acct_demo_014"]),
    productionGrant: Boolean(overrides.productionGrant),
    checkpoint: overrides.checkpoint ?? false,
    inverseDefined: overrides.inverseDefined ?? false,
    auth: overrides.auth ?? null,
    compiledBy: "deterministic-intent-compiler",
  };
}

export function commitmentOf(action) {
  return sha256(canonical({
    operation: action.operation,
    tenant: action.tenant,
    environment: action.environment,
    targetCount: action.targetCount,
    targetIds: action.targetIds,
    checkpoint: action.checkpoint,
    inverseDefined: action.inverseDefined,
    productionGrant: Boolean(action.productionGrant),
  }));
}

export function signAuthorization({ actor = "judge.demo", commitment, issuedAt = Date.now() }) {
  if (!commitment) throw new Error("Authorization must bind a commitment.");
  const token = `jit.${sha256(`${actor}|${commitment}|${issuedAt}`)}`;
  return { actor, issuedAt, commitment, token };
}

export function tokenMatches(auth) {
  if (!auth || !auth.token || !auth.actor || !auth.commitment || auth.issuedAt == null) return false;
  return auth.token === `jit.${sha256(`${auth.actor}|${auth.commitment}|${auth.issuedAt}`)}`;
}

function row(id, claim, holds, witness, counterexample) {
  return { id, claim, result: holds ? "UNSAT" : "SAT", holds, witness, counterexample: holds ? null : counterexample };
}

export function evaluate(action, policy = POLICY, now = Date.now()) {
  const t0 = Date.now();
  const commitment = commitmentOf(action);
  const allow = policy.allowlist.includes(action.operation);
  const tenantOk = action.tenant === policy.demoTenant || (policy.allowProductionGrant === true && action.productionGrant);
  const envOk = action.environment !== "production" || (policy.allowProductionGrant === true && action.productionGrant);
  const blastOk = Number.isInteger(action.targetCount) && action.targetCount >= 1 && action.targetCount <= policy.maxBlast && !action.targetIds.includes("*");
  const reversible = action.checkpoint === true && action.inverseDefined === true;
  const tokenOk = tokenMatches(action.auth);
  const authPresent = tokenOk;
  const authBinds = tokenOk && action.auth.commitment === commitment;
  const age = tokenOk ? now - action.auth.issuedAt : Infinity;
  const fresh = authPresent && age >= 0 && age <= policy.jitWindowMs;

  const obligations = [
    row("OP_ALLOWLIST", `${action.operation} ∈ {${policy.allowlist.join(", ")}}`, allow,
      allow ? `${action.operation} is on the allowlist` : null,
      { operation: action.operation, allowlist: policy.allowlist }),
    row("TENANT_BIND", `tenant = ${policy.demoTenant} unless a production grant exists`, tenantOk,
      tenantOk ? action.tenant : null,
      { tenant: action.tenant, required: policy.demoTenant, productionGrant: action.productionGrant }),
    row("ENV_SAFE", "environment = sandbox, or an explicit production grant is present", envOk,
      envOk ? action.environment : null,
      { environment: action.environment, productionGrant: false }),
    row("BLAST_RADIUS", `1 ≤ targets ≤ ${policy.maxBlast} and target is not a wildcard`, blastOk,
      blastOk ? action.targetIds : null,
      { targetCount: action.targetCount, targetIds: action.targetIds, max: policy.maxBlast }),
    row("REVERSIBLE", "checkpoint sealed and inverse operation defined before mutation", reversible,
      reversible ? "checkpoint+inverse" : null,
      { checkpoint: action.checkpoint, inverseDefined: action.inverseDefined }),
    row("AUTH_PRESENT", "human token matches sha256(actor|commitment|issuedAt)", authPresent,
      authPresent ? action.auth.actor : null,
      { auth: null }),
    row("AUTH_BINDS", "authorization.commitment = sha256(canonical(action without auth))", authBinds,
      authBinds ? commitment.slice(0, 16) : null,
      { expected: commitment, got: action.auth?.commitment || null }),
    row("JIT_FRESH", `authorization age ≤ ${policy.jitWindowMs}ms`, fresh,
      fresh ? `${age}ms` : null,
      { ageMs: Number.isFinite(age) ? age : null, windowMs: policy.jitWindowMs }),
  ];

  const failed = obligations.filter((o) => !o.holds);
  const decision = failed.length === 0 ? "ALLOW" : "REFUSE";
  return {
    policy: policy.id,
    theory: policy.theory,
    decision,
    meaning: decision === "ALLOW"
      ? "Unsafe execution state is UNSAT in PBP-1. Power may be granted for this scope only."
      : "A countermodel exists. Capability is not authority. Power is withheld.",
    commitment,
    obligations,
    counterexamples: failed.map((o) => ({ obligation: o.id, model: o.counterexample })),
    elapsedMs: Date.now() - t0,
    notAModel: true,
  };
}

export function rewriteSafe(action) {
  return {
    ...action,
    tenant: POLICY.demoTenant,
    environment: "sandbox",
    targetCount: 1,
    targetIds: ["acct_demo_014"],
    productionGrant: false,
    checkpoint: true,
    inverseDefined: true,
    operation: POLICY.allowlist.includes(action.operation) ? action.operation : "ACCOUNT_STATUS_UPDATE",
    rewrittenFrom: commitmentOf(action),
    auth: null,
  };
}

export function buildReceipt({ action, proof, execution, recovery }) {
  const body = {
    schema: "UAF-RECEIPT.v2",
    policy: proof.policy,
    theory: proof.theory,
    decision: proof.decision,
    commitment: proof.commitment,
    operation: action.operation,
    tenant: action.tenant,
    environment: action.environment,
    targets: action.targetIds,
    obligations: proof.obligations.map((o) => ({ id: o.id, result: o.result })),
    authorization: action.auth ? { actor: action.auth.actor, commitment: action.auth.commitment, token: action.auth.token } : null,
    execution: execution || null,
    recovery: recovery || null,
  };
  return { ...body, receiptHash: sha256(canonical(body)) };
}

export function verifyReceipt(receipt) {
  if (!receipt || typeof receipt !== "object") return { ok: false, reason: "Receipt missing." };
  const { receiptHash, ...body } = receipt;
  const actual = sha256(canonical(body));
  if (actual !== receiptHash) {
    return { ok: false, reason: "Receipt hash mismatch. The body was altered after sealing.", expected: actual, got: receiptHash };
  }
  return { ok: true, reason: "Receipt re-verified offline from canonical bytes. UI was not trusted.", receiptHash: actual };
}

export function actionDiff(before, after) {
  const keys = ["operation", "tenant", "environment", "targetCount", "targetIds", "checkpoint", "inverseDefined", "productionGrant"];
  return keys.map((field) => ({
    field,
    from: before?.[field] ?? null,
    to: after?.[field] ?? null,
    changed: canonical(before?.[field] ?? null) !== canonical(after?.[field] ?? null),
  }));
}

export function stageSeal(label, payload, previous = "") {
  return sha256(canonical({ label, payload, previous }));
}

const PLAIN = {
  OP_ALLOWLIST: "The operation is not on the allowlist.",
  TENANT_BIND: "The tenant is outside the granted scope.",
  ENV_SAFE: "Production was requested without a production grant.",
  BLAST_RADIUS: "The target set is wider than the blast limit.",
  REVERSIBLE: "No checkpoint and inverse were sealed before mutation.",
  AUTH_PRESENT: "No human authorization is present.",
  AUTH_BINDS: "The authorization was issued for a different action.",
  JIT_FRESH: "The authorization is outside the JIT window.",
};

export function explainRefusal(proof) {
  if (!proof || proof.decision === "ALLOW") return [{ id: "CLEAR", plain: "Every obligation holds. Power is limited to this scope." }];
  return proof.counterexamples.map((item) => ({ id: item.obligation, plain: PLAIN[item.obligation] || "An obligation failed." }));
}

export const SCENARIOS = {
  unsafe: {
    id: "unsafe",
    title: "Unsafe shortcut",
    prompt: "Update all production account statuses to suspended.",
  },
  safe: {
    id: "safe",
    title: "Bounded sandbox",
    prompt: "Update account acct_demo_014 status in the demo tenant sandbox, with checkpoint and inverse.",
  },
};
