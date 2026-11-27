import { evidence } from "./evidence";
import { isRecord, type GitHubClient } from "./github";
import { CANONICAL_TARGETS, NOTABLE_PATHS, TRANSITIONAL_GGUF, type CanonicalTarget } from "./registry";
import type { EvidenceRecord, RepoProbe } from "./types";

interface TreeEntry {
  path: string;
  type: string;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

async function readRepo(client: GitHubClient, target: CanonicalTarget): Promise<{
  probe: RepoProbe;
  paths: string[];
  evidence: EvidenceRecord[];
}> {
  const repository = `${target.owner}/${target.repo}`;
  const url = `https://api.github.com/repos/${target.owner}/${target.repo}`;
  let status = 0;
  let body: unknown = null;
  try {
    const response = await client.getJson(url);
    status = response.status;
    body = response.body;
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    return {
      probe: {
        id: target.id,
        role: target.role,
        owner: target.owner,
        repo: target.repo,
        httpStatus: null,
        privateOrMissing: true,
        defaultBranch: null,
        commitSha: null,
        pushedAt: null,
        description: null,
        fileCount: null,
        treeTruncated: null,
        state: "BLOCKED",
        note: message,
      },
      paths: [],
      evidence: [
        evidence({
          category: "repository-integrity",
          repository,
          testExecuted: `GET ${url}`,
          expected: "HTTP 200 repository metadata",
          actual: message,
          status: "BLOCKED",
          state: "BLOCKED",
          failure: "The GitHub API could not be reached.",
          remediation: "Retry when network access to api.github.com is available. Do not mark the repository connected.",
        }),
      ],
    };
  }

  if (status !== 200 || !isRecord(body)) {
    const state = status === 401 || status === 403 || status === 404 ? "AUTHORIZATION_REQUIRED" : "BLOCKED";
    return {
      probe: {
        id: target.id,
        role: target.role,
        owner: target.owner,
        repo: target.repo,
        httpStatus: status,
        privateOrMissing: true,
        defaultBranch: null,
        commitSha: null,
        pushedAt: null,
        description: null,
        fileCount: null,
        treeTruncated: null,
        state,
        note: `${target.note} Public API status ${status}. A 404 from an unauthenticated call does not prove the repository is absent.`,
      },
      paths: [],
      evidence: [
        evidence({
          category: "repository-integrity",
          repository,
          testExecuted: `GET ${url}`,
          expected: "HTTP 200 with default_branch and a commit SHA",
          actual: `HTTP ${status}`,
          status: "BLOCKED",
          state,
          failure: "Repository contents were not readable with the current credentials.",
          remediation: "Authorize this repository for the scanner, or confirm the owner and name. Do not treat a 404 as a completed inspection.",
        }),
      ],
    };
  }

  const branch = asString(body.default_branch);
  const commitUrl = `https://api.github.com/repos/${target.owner}/${target.repo}/commits/${branch ?? "HEAD"}`;
  const commitResponse = await client.getJson(commitUrl);
  const commitSha = isRecord(commitResponse.body) ? asString(commitResponse.body.sha) : null;
  let paths: string[] = [];
  let truncated: boolean | null = null;
  let fileCount: number | null = null;
  if (commitSha) {
    const treeResponse = await client.getJson(
      `https://api.github.com/repos/${target.owner}/${target.repo}/git/trees/${commitSha}?recursive=1`,
    );
    if (treeResponse.status === 200 && isRecord(treeResponse.body) && Array.isArray(treeResponse.body.tree)) {
      truncated = treeResponse.body.truncated === true;
      const entries = treeResponse.body.tree.filter(isRecord) as unknown as TreeEntry[];
      paths = entries.filter((entry) => entry.type === "blob" && typeof entry.path === "string").map((entry) => entry.path);
      fileCount = paths.length;
    }
  }

  const probe: RepoProbe = {
    id: target.id,
    role: target.role,
    owner: target.owner,
    repo: target.repo,
    httpStatus: status,
    privateOrMissing: false,
    defaultBranch: branch,
    commitSha,
    pushedAt: asString(body.pushed_at),
    description: asString(body.description),
    fileCount,
    treeTruncated: truncated,
    state: commitSha ? "VERIFIED" : "VALIDATION_FAILED",
    note: target.note,
  };

  const rows: EvidenceRecord[] = [
    evidence({
      category: "repository-integrity",
      repository,
      branch,
      commitSha,
      testExecuted: `GET ${url} and commit ${commitUrl}`,
      expected: "Readable repository with a resolved head commit",
      actual: `branch ${branch ?? "unknown"} commit ${commitSha ?? "unresolved"} files ${fileCount ?? "unknown"} truncated ${String(truncated)}`,
      status: commitSha ? "PASSED" : "FAILED",
      state: commitSha ? "VERIFIED" : "VALIDATION_FAILED",
      failure: commitSha ? null : "The head commit was not resolved, so recursive inspection did not run.",
      remediation: commitSha ? null : "Re-read the default branch head before scanning files.",
    }),
  ];

  if (target.subpath) {
    const present = paths.some((path) => path === target.subpath || path.startsWith(`${target.subpath}/`));
    rows.push(
      evidence({
        category: "integration-wiring",
        repository,
        branch,
        commitSha,
        filePath: target.subpath,
        testExecuted: "Recursive git tree membership for the engine location",
        expected: "Engine location is identified without treating the file as a successful run",
        actual: present
          ? `${target.subpath} is in the tree at ${commitSha}. Execution was not performed by this check.`
          : `${target.subpath} was not in the retrieved tree.`,
        status: "UNVERIFIED",
        state: present ? "REVIEW_REQUIRED" : "VALIDATION_FAILED",
        failure: "A located file is not a passed engine.",
        remediation: "Run the engine task. Do not convert this discovery row into a pass.",
        artifact: present ? "located-not-executed" : "not-located",
      }),
    );
  }

  return { probe, paths, evidence: rows };
}

export async function scanRepositories(client: GitHubClient): Promise<{
  probes: RepoProbe[];
  evidence: EvidenceRecord[];
  pathsByRepo: Map<string, string[]>;
}> {
  const jsonCache = new Map<string, ReturnType<GitHubClient["getJson"]>>();
  const textCache = new Map<string, ReturnType<GitHubClient["getText"]>>();
  const cached: GitHubClient = {
    getJson(url) {
      const hit = jsonCache.get(url);
      if (hit) return hit;
      const pending = client.getJson(url);
      jsonCache.set(url, pending);
      return pending;
    },
    getText(url) {
      const hit = textCache.get(url);
      if (hit) return hit;
      const pending = client.getText(url);
      textCache.set(url, pending);
      return pending;
    },
  };
  const probes: RepoProbe[] = [];
  const rows: EvidenceRecord[] = [];
  const pathsByRepo = new Map<string, string[]>();
  for (const target of CANONICAL_TARGETS) {
    const result = await readRepo(cached, target);
    probes.push(result.probe);
    rows.push(...result.evidence);
    pathsByRepo.set(`${target.owner}/${target.repo}`, result.paths);
  }

  const fullBuild = probes.find((probe) => probe.id === "full-build");
  const fullPaths = pathsByRepo.get("iamfather420-ctrl/Full-Build") ?? [];
  if (fullBuild?.commitSha) {
    for (const notable of NOTABLE_PATHS) {
      const present = fullPaths.includes(notable);
      rows.push(
        evidence({
          category: "code-completeness",
          repository: "iamfather420-ctrl/Full-Build",
          branch: fullBuild.defaultBranch,
          commitSha: fullBuild.commitSha,
          filePath: notable,
          testExecuted: "Notable-path tree membership",
          expected: "Path is recorded. Membership alone must not pass a behavioral check.",
          actual: present ? "present" : "absent",
          status: "UNVERIFIED",
          state: present ? "REVIEW_REQUIRED" : "VALIDATION_FAILED",
          failure: "Filename or path presence is not proof the component runs.",
          remediation: "Execute the behavior and store the observed result on a separate evidence row.",
        }),
      );
    }

    const rawUrl = `https://raw.githubusercontent.com/iamfather420-ctrl/Full-Build/${fullBuild.commitSha}/${TRANSITIONAL_GGUF.sourceFile}`;
    const raw = await cached.getText(rawUrl);
    const stillTemporary = raw.status === 200 && raw.body.includes(TRANSITIONAL_GGUF.sha256);
    rows.push(
      evidence({
        category: "proprietary-ai",
        weight: 3,
        repository: "iamfather420-ctrl/Full-Build",
        branch: fullBuild.defaultBranch,
        commitSha: fullBuild.commitSha,
        filePath: TRANSITIONAL_GGUF.sourceFile,
        lineStart: TRANSITIONAL_GGUF.lineStart,
        lineEnd: TRANSITIONAL_GGUF.lineEnd,
        testExecuted: `GET ${rawUrl} and search for the transitional GGUF sha256`,
        expected: "Temporary chat weights are either gone or explicitly still blocking proprietary completion",
        actual: raw.status !== 200
          ? `HTTP ${raw.status}`
          : stillTemporary
            ? `sha256 ${TRANSITIONAL_GGUF.sha256} is still the named chat artifact (${TRANSITIONAL_GGUF.bytes} bytes, ${TRANSITIONAL_GGUF.quantization})`
            : "The recorded transitional sha256 was not found in the file",
        status: stillTemporary ? "FAILED" : raw.status === 200 ? "UNVERIFIED" : "BLOCKED",
        state: stillTemporary ? "BLOCKED" : raw.status === 200 ? "REVIEW_REQUIRED" : "BLOCKED",
        failure: stillTemporary
          ? "The transitional GGUF is still the chat-model identity. Daisy is not proprietary-complete."
          : "The temporary-model check could not be confirmed.",
        remediation: "Train and verify a replacement, point inference at those weights only, then remove this GGUF identity. Do not rename the GGUF.",
        artifact: TRANSITIONAL_GGUF.sha256,
      }),
    );

    const runtimeUrl = `https://raw.githubusercontent.com/iamfather420-ctrl/Full-Build/${fullBuild.commitSha}/src/brain/FirstPartyInferenceRuntime.ts`;
    const runtime = await cached.getText(runtimeUrl);
    const notImplemented = runtime.status === 200 && runtime.body.includes("FIRST_PARTY_INFERENCE_NOT_IMPLEMENTED");
    rows.push(
      evidence({
        category: "inference-readiness",
        weight: 3,
        repository: "iamfather420-ctrl/Full-Build",
        branch: fullBuild.defaultBranch,
        commitSha: fullBuild.commitSha,
        filePath: "src/brain/FirstPartyInferenceRuntime.ts",
        testExecuted: "Read FirstPartyInferenceRuntime source and search for the not-implemented code",
        expected: "A verified first-party generateResponse returns model text",
        actual: runtime.status !== 200
          ? `HTTP ${runtime.status}`
          : notImplemented
            ? "Source still returns FIRST_PARTY_INFERENCE_NOT_IMPLEMENTED"
            : "The not-implemented marker was not found; execution was still not observed",
        status: "FAILED",
        state: "VALIDATION_FAILED",
        failure: "Reading the runtime file does not execute inference. The current source explicitly refuses to claim a local model response.",
        remediation: "Load verified weights and generate a response through the runtime. Keep the external GGUF from being a silent fallback.",
      }),
    );
  }

  const loc = probes.find((probe) => probe.id === "loc-grammar");
  rows.push(
    evidence({
      category: "ai-training",
      weight: 2,
      repository: "Solvex-Paradox-Box/loc-english-grammar-source-collection",
      branch: loc?.defaultBranch ?? null,
      commitSha: loc?.commitSha ?? null,
      testExecuted: "Repository discovery versus training admission",
      expected: "Source candidate discovered, then separately licensed, extracted, and split before training",
      actual: loc?.commitSha
        ? `Repository readable at ${loc.commitSha} with ${loc.fileCount ?? "unknown"} blobs. No document was extracted or admitted to the training set.`
        : `Repository was not readable (HTTP ${loc?.httpStatus ?? "none"}).`,
      status: "FAILED",
      state: loc?.commitSha ? "REVIEW_REQUIRED" : "AUTHORIZATION_REQUIRED",
      failure: "A reachable language repository is not verified training data.",
      remediation: "Inventory licenses, checksums, extraction quality, and duplicates. Keep raw, processed, and training-ready data separate.",
    }),
  );

  const discover = probes.find((probe) => probe.id === "discover-engine");
  const discoverPaths = pathsByRepo.get("iamfather420-ctrl/Discover-Engine") ?? [];
  const mentionsLoc = discoverPaths.some((path) => path.toLowerCase().includes("loc-english") || path.toLowerCase().includes("grammar-source"));
  rows.push(
    evidence({
      category: "integration-wiring",
      weight: 2,
      repository: "iamfather420-ctrl/Discover-Engine",
      branch: discover?.defaultBranch ?? null,
      commitSha: discover?.commitSha ?? null,
      testExecuted: "Tree path search for the language-source repository name",
      expected: "Discover-Engine contains an executable ingestion path for the language-source repository",
      actual: discover?.commitSha
        ? mentionsLoc
          ? "A path name mentions the language source. Ingestion was not executed."
          : `No path in the retrieved tree (${discover.fileCount ?? 0} files) mentions loc-english or grammar-source.`
        : `Discover-Engine was not readable (HTTP ${discover?.httpStatus ?? "none"}).`,
      status: "FAILED",
      state: discover?.commitSha ? "VALIDATION_FAILED" : "AUTHORIZATION_REQUIRED",
      failure: "Full-Build's DiscoverEngineClient only posts withheld assertions. It was not observed ingesting the language repository.",
      remediation: "Connect discovery to the language-source commit and record ingested documents. Do not mark discovery complete from a client filename.",
    }),
  );

  return { probes, evidence: rows, pathsByRepo };
}
