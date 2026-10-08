import { daisyAct } from "/agents/daisy-haminja.mjs";
import { judgeScorecard } from "/engine/scorecard.mjs";
import {
  POLICY,
  compileIntent,
  evaluate,
  rewriteSafe,
  signAuthorization,
  buildReceipt,
  verifyReceipt,
  actionDiff,
  stageSeal,
  explainRefusal,
} from "/engine/proof-engine.mjs";

const $ = (id) => document.getElementById(id);
const steps = ["Propose", "Prove", "Authorize", "Execute", "Observe", "Reverse"];
const attacks = [
  ["Smuggle production", "production"],
  ["Steal another auth", "stolen"],
  ["Expire the JIT", "stale"],
  ["Drop the inverse", "no-inverse"],
];

let action = null;
let proof = null;
let receipt = null;
let selected = null;
let applied = false;
let ledger = { account: "acct_demo_014", status: "active", checkpoint: null };
let trail = [];
let seals = "";

function policyFromUi() {
  return { ...POLICY, maxBlast: Number($("blast").value), jitWindowMs: Number($("jit").value) * 1000, allowProductionGrant: false };
}

function setToolState(state, text) {
  const node = $("tool-state");
  node.textContent = text;
  node.className = `tool-state ${state}`;
}

function hostRunner(gated) {
  if (!gated || gated.environment !== "sandbox" || gated.productionGrant || gated.tenant !== POLICY.demoTenant) {
    return { status: "BLOCKED" };
  }
  ledger = { account: gated.targetIds[0] || "acct_demo_014", status: "suspended", checkpoint: "ckpt_demo_014" };
  applied = true;
  renderLedger();
  return { status: "APPLIED", target: ledger.account };
}

function toast(text) {
  const node = $("toast");
  node.hidden = false;
  node.textContent = text;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.hidden = true; }, 2200);
}

function log(title, detail) {
  seals = stageSeal(title, detail, seals);
  trail.unshift({ title, detail, seal: seals.slice(0, 10) });
  trail = trail.slice(0, 8);
  $("trail").innerHTML = trail.map((item) => `<li><b>${item.title}</b> · ${item.seal}<br>${item.detail}</li>`).join("");
}

function renderLoop(active) {
  $("loop").innerHTML = steps.map((name, i) => `<li class="${i <= active ? "on" : ""}"><b>0${i + 1}</b>${name}</li>`).join("");
}

function showObligation(id) {
  if (!proof) return;
  selected = id;
  const row = proof.obligations.find((o) => o.id === id) || proof.obligations[0];
  document.querySelectorAll(".ob").forEach((node) => node.classList.toggle("active", node.dataset.id === row.id));
  $("detail-title").textContent = row.id;
  $("detail-tag").textContent = row.result;
  $("detail-tag").className = `kicker ${row.result}`;
  $("detail").textContent = row.holds
    ? `Witness\n${row.witness}\n\nNo countermodel of the negation in PBP-1.`
    : `Countermodel\n${JSON.stringify(row.counterexample, null, 2)}\n\nThis is why power is withheld.`;
}

function renderProof() {
  const held = proof ? proof.obligations.filter((o) => o.holds).length : 0;
  $("decision").textContent = proof ? proof.decision : "IDLE";
  $("decision").className = proof ? proof.decision : "";
  $("meaning").textContent = proof ? proof.meaning : "Compile a request. The proof is the obligation table, not a paragraph.";
  $("hold-count").textContent = proof ? `${held}/8` : "0/8";
  $("prove-ms").textContent = proof ? `${proof.elapsedMs}ms` : "—";
  $("commit-short").textContent = proof ? proof.commitment.slice(0, 8) : "—";
  $("obligations").innerHTML = proof ? proof.obligations.map((o) => `
    <button class="ob ${o.id === selected ? "active" : ""}" data-id="${o.id}">
      <span>${o.id}</span><span class="tag ${o.result}">${o.result}</span><span>${o.claim}</span>
    </button>`).join("") : "";
  if (proof) showObligation(selected || proof.counterexamples[0]?.obligation || proof.obligations[0].id);
}

function renderSupport(current) {
  const safe = rewriteSafe({ ...current, auth: null });
  const other = evaluate(safe, policyFromUi(), Date.now());
  $("lanes").innerHTML = [["Proposal", proof], ["Rewritten candidate", other]].map(([label, item]) => `
    <article class="lane">
      <span class="kicker">${label}</span>
      <b class="${item.decision}">${item.decision}</b>
      <span>${item.obligations.filter((row) => row.holds).length}/8 held · ${item.commitment.slice(0, 8)}</span>
      <div class="dots">${item.obligations.map((row) => `<i class="${row.holds ? "held" : "open"}" title="${row.id}"></i>`).join("")}</div>
    </article>`).join("");
  $("reasons").innerHTML = explainRefusal(proof).map((item) => `<div class="reason"><code>${item.id}</code><span>${item.plain}</span></div>`).join("");
  $("formula").innerHTML = proof.obligations.map((row) => `<span class="${row.holds ? "held" : "open"}">${row.id}</span>`).join("");
  $("seal").textContent = proof.decision === "ALLOW" ? "UNSAT" : "SAT";
}

function renderDiff(before, after) {
  const rows = actionDiff(before, after);
  $("diff-count").textContent = `${rows.filter((row) => row.changed).length} fields change`;
  $("diff").innerHTML = rows.map((row) => `
    <div class="diff-row ${row.changed ? "changed" : ""}">
      <span>${row.field}</span><span>${format(row.from)}</span><b>${format(row.to)}</b>
    </div>`).join("");
}

function format(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function renderLedger() {
  $("acct-status").textContent = ledger.status;
  $("acct-status").className = ledger.status === "suspended" ? "suspended" : "";
  $("ckpt").textContent = ledger.checkpoint || "no checkpoint";
  $("ledger-state").textContent = applied ? "MUTATED" : ledger.checkpoint ? "CHECKPOINT" : "UNCHANGED";
}

function renderReceipt() {
  $("receipt").textContent = receipt ? JSON.stringify(receipt, null, 2) : "A receipt is sealed after the loop and re-checked from canonical bytes.";
  $("hash-line").textContent = receipt ? receipt.receiptHash : "unsealed";
  $("receipt-state").textContent = receipt ? "SEALED" : "NONE";
  ["export", "copy", "tamper", "recheck"].forEach((id) => { $(id).disabled = !receipt; });
}

function setActions(step) {
  renderLoop(step);
  $("authorize").disabled = !proof || proof.decision === "ALLOW";
  $("execute").disabled = !(proof && proof.decision === "ALLOW" && !applied);
  $("rollback").disabled = !applied;
}

function bench(current) {
  const samples = [];
  let worst = 0;
  for (let i = 0; i < 200; i++) {
    const ms = evaluate(current, policyFromUi(), Date.now()).elapsedMs;
    samples.push(ms);
    worst = Math.max(worst, ms);
  }
  $("p99").textContent = `${worst}ms`;
  const peak = Math.max(1, ...samples);
  $("spark").innerHTML = samples.slice(0, 40).map((ms) => `<i style="height:${Math.max(8, (ms / peak) * 100)}%"></i>`).join("");
}

function proveFrom(next, now = Date.now()) {
  action = next;
  proof = evaluate(action, policyFromUi(), now);
  selected = proof.counterexamples[0]?.obligation || proof.obligations[0].id;
  renderProof();
  renderSupport(action);
  renderDiff(action, rewriteSafe({ ...action, auth: null }));
  setActions(1);
  bench(action);
  log(proof.decision, `${proof.counterexamples.length} countermodels · ${proof.commitment.slice(0, 12)}`);
  setToolState("dry", "Dry prove. Tool not armed.");
}

function runDaisy(intent, ctx = {}) {
  const turn = daisyAct(intent, { policy: policyFromUi(), now: ctx.now, auth: ctx.auth || null, host: ctx.host }, hostRunner);
  const next = turn.gate.proceed ? turn.gate.action : compileIntent(intent);
  proveFrom(next, ctx.now);
  $("agent").textContent = turn.transcript.join("\n");
  log("DAISY", turn.toolRan ? "tool invoked in scope" : "tool not invoked");
  setToolState(turn.toolRan ? "ran" : "blocked", turn.toolRan ? "Tool ran in scope" : "Tool blocked");
  toast(turn.toolRan ? "Daisy's tool ran in scope." : "Daisy proposed. The tool did not run.");
  return turn;
}

$("scenarios").innerHTML = `<button data-s="unsafe">Unsafe shortcut</button><button data-s="safe">Bounded sandbox</button><button data-s="unknown">Unknown op</button><button data-s="rewrite">Accept rewrite</button>`;
$("scenarios").onclick = (event) => {
  const id = event.target.dataset.s;
  if (!id) return;
  if (id === "unsafe") $("intent").value = "Update all production account statuses to suspended.";
  if (id === "safe") $("intent").value = "Update account acct_demo_014 status in the demo tenant sandbox, with checkpoint and inverse.";
  if (id === "unknown") $("intent").value = "Delete every production record.";
  if (id === "rewrite") {
    const safe = rewriteSafe(action || compileIntent($("intent").value));
    $("intent").value = "Update account acct_demo_014 status in the demo tenant sandbox, with checkpoint and inverse.";
    proveFrom(safe);
    setToolState("dry", "Rewrite only. Tool not armed.");
    return;
  }
  runDaisy($("intent").value, id === "safe" ? { host: { checkpoint: true, inverseDefined: true, tenant: POLICY.demoTenant, environment: "sandbox", targetCount: 1, targetIds: ["acct_demo_014"] } } : {});
};

$("attacks").innerHTML = attacks.map(([label, id]) => `<button data-a="${id}">${label}</button>`).join("");
$("attacks").onclick = (event) => {
  const id = event.target.dataset.a;
  if (!id) return;
  const base = rewriteSafe(compileIntent("Update account acct_demo_014 status in the demo tenant sandbox."));
  const commitment = evaluate(base, policyFromUi()).commitment;
  const issuedAt = Date.now() - (id === "stale" ? policyFromUi().jitWindowMs + 5000 : 1000);
  const auth = signAuthorization({ commitment, issuedAt });
  let next = { ...base, auth };
  if (id === "production") next = { ...next, environment: "production", tenant: "TENANT_PRODUCTION", targetIds: ["*"], targetCount: 1284 };
  if (id === "stolen") next = { ...next, auth: { ...auth, commitment: "deadbeef".padEnd(64, "0") } };
  if (id === "no-inverse") next = { ...next, inverseDefined: false, checkpoint: false };
  $("intent").value = `Adversary · ${attacks.find((item) => item[1] === id)[0]}`;
  proveFrom(next);
  setToolState("blocked", "Adversary blocked. Tool not armed.");
  $("agent").textContent = `Daisy Haminja: I will not carry this attempt.\ngate: ${proof.decision}\ntool: not invoked`;
};

$("scorecard").onclick = () => {
  const card = judgeScorecard();
  $("score").textContent = `${card.passed}/${card.total}`;
  $("checks").innerHTML = card.checks.map((check) => `<li><b>${check.pass ? "PASS" : "FAIL"}</b> ${check.id}</li>`).join("");
  toast(card.passed === card.total ? "All gate checks passed." : "A gate check failed.");
};

$("daisy-act").onclick = () => runDaisy($("intent").value);
$("full-build").onclick = () => {
  $("intent").value = "Update all production account statuses to suspended.";
  const turn = runDaisy($("intent").value);
  $("agent").textContent = [
    "Source: iamfather420-ctrl/Full-Build",
    "Execution: exec_pipeline_1790883815879",
    "GATE-14: BLOCKED_MISSING_EXTERNAL_CREDENTIALS",
    "",
    turn.transcript.join("\n"),
  ].join("\n");
  log("FULL-BUILD", "GATE-14 proposal refused by PBP-1");
};
$("prove").onclick = () => {
  const text = $("intent").value;
  const safeHint = /sandbox|checkpoint/i.test(text);
  proveFrom(compileIntent(text, safeHint ? { checkpoint: true, inverseDefined: true, environment: "sandbox", tenant: POLICY.demoTenant, targetCount: 1, targetIds: ["acct_demo_014"] } : {}));
};
$("obligations").onclick = (event) => {
  const node = event.target.closest(".ob");
  if (node) showObligation(node.dataset.id);
};
$("blast").oninput = () => { $("blast-val").textContent = $("blast").value; if (action) proveFrom(action); };
$("jit").oninput = () => { $("jit-val").textContent = `${$("jit").value}s`; if (action) proveFrom(action); };

$("authorize").onclick = () => {
  const safe = action?.checkpoint ? action : rewriteSafe(action || compileIntent($("intent").value));
  const commitment = evaluate({ ...safe, auth: null }, policyFromUi()).commitment;
  const auth = signAuthorization({ actor: "judge.demo", commitment });
  $("intent").value = "Update account acct_demo_014 status in the demo tenant sandbox, with checkpoint and inverse.";
  proveFrom({ ...safe, auth });
  $("agent").textContent = `Daisy Haminja: Authorization is bound to ${commitment.slice(0, 12)}.\nI can propose the bounded call. I still do not skip the gate.`;
  setActions(2);
  log("AUTHORIZE", auth.token);
  toast("Authorization bound to this commitment.");
};

$("execute").onclick = () => {
  if (!proof || proof.decision !== "ALLOW" || !action?.auth) return;
  runDaisy($("intent").value, {
    auth: action.auth,
    host: {
      operation: action.operation,
      tenant: action.tenant,
      environment: action.environment,
      targetCount: action.targetCount,
      targetIds: action.targetIds,
      checkpoint: action.checkpoint,
      inverseDefined: action.inverseDefined,
    },
  });
  if (!applied) return;
  setActions(4);
  receipt = buildReceipt({ action, proof, execution: { status: "APPLIED", checkpoint: ledger.checkpoint, caller: "daisy.haminja" }, recovery: { status: "PENDING" } });
  renderReceipt();
};

$("rollback").onclick = () => {
  ledger = { account: "acct_demo_014", status: "active", checkpoint: "ckpt_demo_014" };
  applied = false;
  renderLedger();
  setActions(5);
  receipt = buildReceipt({ action, proof, execution: { status: "APPLIED", checkpoint: "ckpt_demo_014" }, recovery: { status: "ROLLED_BACK" } });
  renderReceipt();
  $("receipt-state").textContent = verifyReceipt(receipt).ok ? "VERIFIED" : "FAIL";
  log("REVERSE", "status restored to active");
  toast("State restored. Receipt re-sealed.");
};

$("export").onclick = async () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" }));
  a.download = "uarefake-proof-receipt.json";
  a.click();
  const posted = await fetch("/bridge/receipt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(receipt) }).then((response) => response.json());
  toast(posted.accepted ? "Receipt accepted by uarefake.com." : posted.reason);
  log(posted.accepted ? "ORIGIN ACCEPT" : "ORIGIN REFUSED", posted.reason || posted.origin);
};
$("copy").onclick = async () => {
  await navigator.clipboard.writeText(receipt.receiptHash);
  toast("Hash copied.");
};
$("tamper").onclick = () => {
  receipt = { ...receipt, decision: "ALLOW_EVERYTHING" };
  renderReceipt();
  $("receipt-state").textContent = "TAMPERED";
  log("TAMPER", "decision field altered");
  toast("One field altered.");
};
$("recheck").onclick = () => {
  const result = verifyReceipt(receipt);
  $("receipt-state").textContent = result.ok ? "VERIFIED" : "FAIL CLOSED";
  $("detail-title").textContent = "Offline check";
  $("detail").textContent = result.reason;
  log(result.ok ? "RECHECK OK" : "RECHECK FAIL", result.reason);
  toast(result.ok ? "Receipt verified." : "Receipt failed closed.");
};
$("paste-check").onclick = () => {
  try {
    $("paste-result").textContent = verifyReceipt(JSON.parse($("paste").value)).reason;
  } catch {
    $("paste-result").textContent = "That text is not a receipt JSON.";
  }
};

$("reset").onclick = () => {
  action = null; proof = null; receipt = null; applied = false; selected = null;
  ledger = { account: "acct_demo_014", status: "active", checkpoint: null };
  $("intent").value = "Update all production account statuses to suspended.";
  $("decision").textContent = "IDLE";
  $("decision").className = "";
  $("meaning").textContent = "Compile a request. The proof is the obligation table, not a paragraph.";
  $("lanes").innerHTML = "";
  $("reasons").innerHTML = "";
  $("formula").innerHTML = "";
  $("seal").textContent = "";
  $("obligations").innerHTML = "";
  $("diff").innerHTML = "";
  renderLedger();
  renderReceipt();
  setActions(-1);
  toast("Demo reset.");
};

const tourBeats = [
  ["Refuse", "Daisy proposes the unsafe shortcut. The gate refuses, so her tool does not run.", () => { $("intent").value = "Update all production account statuses to suspended."; runDaisy($("intent").value); }],
  ["Inspect", "Read the plain-language refusal. Then open a failing obligation.", () => showObligation("ENV_SAFE")],
  ["Bind", "Sign authorization. The rewrite is one demo account, and the token binds to that hash.", () => $("authorize").click()],
  ["Execute", "Power is granted only after every obligation holds.", () => $("execute").click()],
  ["Reverse", "Rollback is part of success.", () => $("rollback").click()],
  ["Tamper", "Change one field. Offline verification fails closed.", () => { $("tamper").click(); $("recheck").click(); }],
];
let tourTimer = null;
$("tour").onclick = () => {
  clearInterval(tourTimer);
  let index = 0;
  const run = () => {
    const beat = tourBeats[index];
    $("tour-step").textContent = `${index + 1}/6`;
    $("tour-copy").textContent = beat[1];
    beat[2]();
    index += 1;
    if (index >= tourBeats.length) clearInterval(tourTimer);
  };
  run();
  tourTimer = setInterval(run, 1700);
};

document.addEventListener("keydown", (event) => {
  if (event.target.matches("textarea, input")) return;
  if (event.key === "1") $("prove").click();
  if (event.key === "2" && !$("authorize").disabled) $("authorize").click();
  if (event.key === "3" && !$("execute").disabled) $("execute").click();
  if (event.key === "4" && !$("rollback").disabled) $("rollback").click();
  if (event.key.toLowerCase() === "t" && !$("tamper").disabled) $("tamper").click();
});

$("intent").value = "Update all production account statuses to suspended.";
renderLoop(-1);
renderLedger();
renderReceipt();
log("READY", "gate idle");

fetch("/bridge/status").then((response) => response.json()).then((status) => {
  const node = $("origin");
  node.textContent = "";
  node.insertAdjacentHTML("afterbegin", "<i></i>");
  node.append(` ${status.ok ? "www.uarefake.com live" : "uarefake.com unreachable"}`);
  node.className = status.ok ? "live" : "live down";
  log(status.ok ? "ORIGIN" : "ORIGIN DOWN", status.note || status.origin);
}).catch(() => {
  $("origin").append(" bridge down");
});
