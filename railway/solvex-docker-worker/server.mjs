import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { timingSafeEqual, createHash } from "node:crypto";

const port = Number(process.env.PORT || 8080);
// Default to loopback. Set SOLVEX_WORKER_HOST=0.0.0.0 only when a trusted
// platform ingress or host firewall enforces the public TLS/auth boundary.
const host = process.env.SOLVEX_WORKER_HOST || "127.0.0.1";
const token = process.env.SOLVEX_WORKER_TOKEN || "";
const image = process.env.SOLVEX_SANDBOX_IMAGE || "";
const maxBody = 100_000;
const maxOutput = 128 * 1024;
const timeoutMs = 15_000;
let active = 0;

const json = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(data), "cache-control": "no-store" });
  res.end(data);
};
const authOK = value => {
  if (!token || !value?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(value.slice(7));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
};
const run = (args, input, timeout = timeoutMs) => new Promise(resolve => {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"], env: { PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin" } });
  let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), settled = false;
  const append = (current, chunk) => Buffer.concat([current, chunk]).subarray(-maxOutput);
  const finish = (code, reason = null) => {
    if (settled) return;
    settled = true; clearTimeout(timer);
    resolve({ code, reason, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8") });
  };
  const timer = setTimeout(() => { child.kill("SIGKILL"); finish(null, "timeout"); }, timeout);
  child.stdout.on("data", chunk => { stdout = append(stdout, chunk); });
  child.stderr.on("data", chunk => { stderr = append(stderr, chunk); });
  child.on("error", error => finish(null, error.code || "spawn_error"));
  child.on("close", code => finish(code));
  child.stdin.on("error", () => {});
  child.stdin.end(input);
});

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    if (!token || !/@sha256:[a-f0-9]{64}$/.test(image)) return json(res, 503, { ok: false, reason: "worker_not_configured" });
    const probe = await run(["info", "--format", "{{.ServerVersion}}"], "", 3000);
    return json(res, probe.code === 0 ? 200 : 503, { ok: probe.code === 0, docker: probe.code === 0 ? probe.stdout.trim() : "unavailable", image_digest_pinned: true });
  }
  if (req.method !== "POST" || req.url !== "/v1/jobs") return json(res, 404, { error: "not_found" });
  if (!authOK(req.headers.authorization)) return json(res, 401, { error: "unauthorized" });
  if (!/@sha256:[a-f0-9]{64}$/.test(image)) return json(res, 503, { error: "sandbox_image_not_digest_pinned" });
  if (active >= 2) return json(res, 429, { error: "worker_busy" });
  let source = "";
  try {
    for await (const chunk of req) {
      source += chunk.toString("utf8");
      if (Buffer.byteLength(source) > maxBody) return json(res, 413, { error: "source_too_large" });
    }
  } catch { return json(res, 400, { error: "invalid_body" }); }
  if (!source.trim()) return json(res, 400, { error: "empty_source" });
  active++;
  try {
    const args = [
      "run", "--rm", "-i", "--pull=never",
      "--network=none", "--read-only",
      "--cap-drop=ALL", "--security-opt=no-new-privileges",
      "--memory=256m", "--memory-swap=256m", "--cpus=0.5", "--pids-limit=64",
      "--user=65534:65534", "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
      "--env=NODE_OPTIONS=--max-old-space-size=128",
      image
    ];
    const result = await run(args, source);
    const receipt = {
      accepted: result.code === 0 && result.reason === null,
      exit_code: result.code,
      timed_out: result.reason === "timeout",
      reason: result.reason,
      stdout: result.stdout,
      stderr_sha256: createHash("sha256").update(result.stderr).digest("hex"),
      image
    };
    return json(res, result.reason === "timeout" ? 408 : 200, receipt);
  } finally { active--; }
});
server.listen(port, host);
