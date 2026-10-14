import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const artifactsDir = path.resolve(process.cwd(), "artifacts");
const currentCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/i.test(currentCommit)) {
  throw new Error("Cannot bind verification receipts to an exact Git commit.");
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(artifactsDir, name), "utf8"));
}

function sha256File(name) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(artifactsDir, name))).digest("hex");
}

const formal = readJson("formal-aggregation.json");
const summary = readJson("z3-120-formal-verification-summary.json");
const forensic = readJson("final-forensic-report.json");
const artifacts = [
  "formal-aggregation.json",
  "z3-120-formal-verification-summary.json",
  "final-forensic-report.json",
];

for (const [name, artifact] of [
  ["formal-aggregation.json", formal],
  ["z3-120-formal-verification-summary.json", summary],
  ["final-forensic-report.json", forensic],
]) {
  if (artifact.commit_sha !== currentCommit) {
    throw new Error(`${name} is bound to ${artifact.commit_sha}, not current HEAD ${currentCommit}.`);
  }
}

const total = formal.total;
const checks = {
  required_cases: total.required === 120,
  actual_executions: total.actual_z3_executions === 120,
  replay_count: total.replays === 120,
  replay_matches: total.replay_matches === 120,
  unknown_zero: total.distribution.unknown === 0,
  errors_zero: total.distribution.error === 0,
  dfrl_verified: formal.dfrl.status === "VERIFIED" &&
    formal.dfrl.actual_z3_executions === 88 &&
    formal.dfrl.expected_result_matches === 88 &&
    formal.dfrl.replay_matches === 88,
  dfrl_provenance: formal.dfrl.authored_models === 88 &&
    formal.dfrl.theorem_specific_models === 68 &&
    formal.dfrl.generated_generalized_models === 0,
  dh_verified: formal.dh.status === "VERIFIED" &&
    formal.dh.actual_z3_executions === 32 &&
    formal.dh.expected_result_matches === 32 &&
    formal.dh.replay_matches === 32 &&
    formal.dh.blocked === 0,
  per_case_dfrl_receipts: formal.dfrl.results.length === 88 &&
    formal.dfrl.results.every(result => result.proved === true &&
      result.solver_result === result.expected_solver_result &&
      (result.solver_result === "sat" || result.solver_result === "unsat")) &&
    formal.dfrl.replays.length === 88 &&
    formal.dfrl.replays.every(replay => replay.replay_match === true &&
      replay.original_result === replay.replay_result),
  per_case_dh_receipts: formal.dh.results.length === 32 &&
    formal.dh.results.every(result => result.verified === true &&
      result.actual_result === result.expected_result &&
      result.replay_match === true &&
      result.source_integrity === "PASS" &&
      result.evidence_integrity === "PASS" &&
      result.evidence_hash === crypto.createHash("sha256").update(
        `${result.case_id}:${result.contract_hash}:${result.source_hash}:${result.actual_result}:${result.replay_result}:${result.commit_sha}`
      ).digest("hex")),
  combined_root_recomputed: total.combined_root_sha256 === crypto.createHash("sha256").update(
    `${formal.dfrl.root_hash}:${formal.dh.root_hash}:${currentCommit}`
  ).digest("hex"),
  summary_root_matches: summary.combined_root_sha256 === total.combined_root_sha256,
  forensic_root_matches: forensic.executive_summary.combined_root_sha256 === total.combined_root_sha256,
  summary_counts_match: summary.total_z3_executions === 120 &&
    summary.replay_matches === 120 &&
    summary.expected_result_matches === 120,
  adversarial_tests_passed: [
    forensic.adversarial_verification?.dfrl_mutation,
    forensic.adversarial_verification?.dfrl_failure_injection,
    forensic.adversarial_verification?.dfrl_artifact_tamper,
    forensic.adversarial_verification?.dh_smt_mutation,
    forensic.adversarial_verification?.dh_failure_injection,
    forensic.adversarial_verification?.dh_artifact_tamper,
  ].every(result => result?.passed === true),
  contract_hash_guard: forensic.adversarial_verification?.contract_hash_guard === true,
  source_hash_guard: forensic.adversarial_verification?.source_hash_guard === true,
  replay_mismatch_guard: forensic.adversarial_verification?.replay_mismatch_guard === true,
};
const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length > 0 || total.closure_verdict !== "PROVEN_120_FORMAL_CLOSURE") {
  throw new Error(`Current 120-case evidence did not close: ${failed.join(", ") || total.closure_verdict}`);
}

const manifest = {
  schema_version: "1.0.0",
  evidence_type: "CURRENT_COMMIT_120_CASE_FORMAL_VERIFICATION",
  repository: "iamfather420-ctrl/Full-Build",
  branch: process.env.GITHUB_REF_NAME || "local",
  commit_sha: currentCommit,
  generated_at: new Date().toISOString(),
  scope: "LOCAL/MODEL FORMAL VERIFICATION ONLY; NOT PRODUCTION CERTIFICATION",
  status: "PASS",
  cases: {
    total: 120,
    dfrl: 88,
    dh: 32,
    executions: total.actual_z3_executions,
    expected_result_matches: summary.expected_result_matches,
    replays: total.replays,
    replay_matches: total.replay_matches,
    unsat: total.distribution.unsat,
    sat: total.distribution.sat,
    unknown: total.distribution.unknown,
    errors: total.distribution.error,
  },
  verification_root_sha256: total.combined_root_sha256,
  checks,
  source_artifacts: Object.fromEntries(artifacts.map(name => [name, sha256File(name)])),
  production_boundary: "No Neon writes, PayPal calls, or production certification performed by this workflow.",
};
fs.writeFileSync(path.join(artifactsDir, "current-120-verification-run.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
