import type { ScanReport } from "../shared/contracts.js";

type RegistryAck = { status?: string; assessmentId?: string; digest?: string; readbackPath?: string };
type RegistryReadback = { status?: string; verified?: boolean; assessmentId?: string; digest?: string; commit?: string };

function requiredHeader(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function publishScanToRegistry(
  report: ScanReport,
  identityToken: string | null,
  forwardedHost: string | null,
): Promise<{ status: "RECORDED" | "ALREADY_RECORDED"; assessmentId: string; digest: string; commit: string }> {
  if (!identityToken) throw Object.assign(new Error("No verified gate identity was supplied. Open G.O.A.T. through its authenticated application URL."), { status: 401 });
  const configured = process.env.SOLVEX_REGISTRY_API_ORIGIN?.trim();
  if (!configured) throw Object.assign(new Error("SOLVEX_REGISTRY_API_ORIGIN is not configured; no Registry request was sent."), { status: 503 });
  let origin: URL;
  try { origin = new URL(configured); }
  catch { throw Object.assign(new Error("Registry API origin is invalid."), { status: 503 }); }
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw Object.assign(new Error("Registry API origin must be a clean HTTPS origin."), { status: 503 });
  }
  const base = origin.origin;
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    "x-grok-identity": identityToken,
  };
  if (forwardedHost) headers["x-forwarded-host"] = forwardedHost;

  const payload = { source: "git-goat", assessmentId: report.id, report };
  const post = await fetch(base + "/api/v1/assessments", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  const postBody = await post.json().catch(() => ({})) as RegistryAck & { error?: string };
  if (!post.ok || !postBody.digest || postBody.assessmentId !== report.id || !postBody.readbackPath) {
    throw Object.assign(new Error(postBody.error || `Registry write failed with HTTP ${post.status}; no readback was accepted.`), { status: post.status >= 400 && post.status < 500 ? post.status : 502 });
  }

  const readbackUrl = new URL(postBody.readbackPath, base);
  if (readbackUrl.origin !== base || readbackUrl.pathname !== "/api/v1/assessments/" + encodeURIComponent(report.id)) {
    throw Object.assign(new Error("Registry returned an unexpected readback destination."), { status: 502 });
  }
  const read = await fetch(readbackUrl, {
    headers: { accept: "application/json", "x-grok-identity": identityToken, ...(forwardedHost ? { "x-forwarded-host": forwardedHost } : {}) },
    signal: AbortSignal.timeout(20_000),
  });
  const readBody = await read.json().catch(() => ({})) as RegistryReadback & { error?: string };
  if (!read.ok || readBody.status !== "READ_BACK" || readBody.verified !== true ||
      readBody.assessmentId !== report.id || readBody.digest !== postBody.digest ||
      readBody.commit !== report.commit) {
    throw Object.assign(new Error(readBody.error || "Registry independent readback did not match the written assessment, digest, and pinned commit."), { status: 502 });
  }
  return {
    status: postBody.status === "ALREADY_RECORDED" ? "ALREADY_RECORDED" : "RECORDED",
    assessmentId: report.id,
    digest: postBody.digest,
    commit: report.commit,
  };
}

export function getIdentityHeader(value: string | string[] | undefined): string | null {
  return requiredHeader(value);
}
