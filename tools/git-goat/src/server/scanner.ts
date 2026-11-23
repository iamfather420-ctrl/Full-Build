import { randomUUID } from 'node:crypto';
import { Finding, RULES, ScanCoverage, ScanReport, Severity } from '../shared/contracts.js';
import { scoreFindings } from '../shared/scoring.js';

const GH = 'https://api.github.com';
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'git-goat-readonly-scanner/0.2',
  'X-GitHub-Api-Version': '2022-11-28',
};
const maxFileBytes = 1024 * 1024;
const maxTotalBytes = 64 * 1024 * 1024;
const maxInspectedFiles = 2_000;
const maxExclusionEntries = 10_000;
const fetchConcurrency = 8;
const binaryExtension = /\.(?:7z|aiff?|apk|avi|bin|bmp|class|dmg|docx?|eot|exe|flac|gif|gz|ico|jar|jpeg|jpg|m4a|mkv|mov|mp3|mp4|o|obj|otf|pdf|png|pptx?|psd|rar|so|tar|tgz|ttf|wasm|wav|webm|webp|woff2?|xls[xm]?|zip)$/i;
const codeExtension = /\.(?:c|cc|cpp|cs|css|go|h|html?|java|js|jsx|kt|mjs|cjs|php|py|rb|rs|sh|sql|swift|ts|tsx|vue|xml)$/i;

export type TreeEntry = { path: string; type: 'blob' | 'tree' | 'commit'; size?: number; mode: string };
type InspectedText = { path: string; text: string; bytes: number };
type InspectionResult = InspectedText | { path: string; reason: string };

export function contentSkipReason(file: Pick<TreeEntry, 'path' | 'size'>, reservedBytes: number, reservedFiles: number): string | undefined {
  if (binaryExtension.test(file.path)) return 'Binary/media/archive extension; path and Git blob size inventoried, text inspection not applicable.';
  if (file.size === undefined) return 'Git tree did not include a blob size; content was not fetched.';
  if (file.size > maxFileBytes) return `Blob exceeds the per-file text inspection limit (${maxFileBytes} bytes); path and size inventoried.`;
  if (reservedFiles >= maxInspectedFiles) return `Text inspection file cap reached (${maxInspectedFiles}); path inventoried.`;
  if (reservedBytes + file.size > maxTotalBytes) return `Aggregate text inspection budget reached (${maxTotalBytes} bytes); path and size inventoried.`;
  return undefined;
}

export function prioritizeForInspection(file: Pick<TreeEntry, 'path'>): number {
  if (codeExtension.test(file.path)) return 0;
  if (/\.(?:json|ya?ml|toml|ini|cfg|conf|md|rst|txt|lock)$/i.test(file.path) || /(?:^|\/)(?:Dockerfile|Makefile|LICENSE|NOTICE|Gemfile|Procfile)(?:$|\.)/i.test(file.path)) return 1;
  return 2;
}

async function mapLimited<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const result = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      result[index] = await fn(items[index]);
    }
  }));
  return result;
}

async function githubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    const status = response.status === 404 ? 404 : response.status === 403 || response.status === 429 ? 429 : 502;
    const message = response.status === 404
      ? 'Repository not found or not publicly accessible.'
      : status === 429
        ? 'GitHub API rate limit reached. Try again later or connect authorized access.'
        : `GitHub API returned HTTP ${response.status}.`;
    throw Object.assign(new Error(message), { status });
  }
  return await response.json() as T;
}

function makeFinding(index: number, evidence: string[], status: Finding['status']): Finding {
  const [title, category, severity, candidates] = RULES[index];
  const present = status === 'VERIFIED_COMPLETE';
  const blocked = status === 'BLOCKED';
  return {
    id: `R${String(index + 1).padStart(2, '0')}`,
    title,
    category,
    severity: severity as Severity,
    status,
    detail: present
      ? `Found repository evidence for ${title.toLowerCase()}. This confirms presence only, not operational quality.`
      : blocked
        ? 'This control cannot be confirmed through unauthenticated public repository contents.'
        : `No matching repository evidence was found for ${title.toLowerCase()}.`,
    evidence: evidence.length ? evidence.slice(0, 5) : [`Checked ${candidates.length ? candidates.join(', ') : 'GitHub repository settings'}`],
    nextStep: present
      ? 'Review whether the control is enforced and current.'
      : blocked
        ? 'Connect authorized repository access to inspect this control.'
        : `Add and verify ${candidates[0] || 'the required repository setting'}.`,
  };
}

async function fetchTextFile(owner: string, name: string, commit: string, file: TreeEntry): Promise<InspectionResult> {
  const path = file.path.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${encodeURIComponent(commit)}/${path}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return { path: file.path, reason: `Content fetch returned HTTP ${response.status}; path and size inventoried.` };
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maxFileBytes) return { path: file.path, reason: 'Content-Length exceeds the per-file inspection limit; path and size inventoried.' };
    if (!response.body) return { path: file.path, reason: 'Content response had no readable body; path and size inventoried.' };
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxFileBytes) {
        await reader.cancel();
        return { path: file.path, reason: 'Downloaded content exceeded the per-file inspection limit; path and size inventoried.' };
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), size);
    if (bytes.includes(0)) return { path: file.path, reason: 'NUL byte detected; treated as binary, path and size inventoried.' };
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return { path: file.path, text, bytes: size };
    } catch {
      return { path: file.path, reason: 'Content is not valid UTF-8 text; path and size inventoried.' };
    }
  } catch {
    return { path: file.path, reason: 'Content fetch timed out or failed; path and size inventoried.' };
  }
}

export async function scanPublicRepository(input: string): Promise<ScanReport> {
  let url: URL;
  try { url = new URL(input.trim()); }
  catch { throw Object.assign(new Error('Enter a valid public GitHub repository URL.'), { status: 400 }); }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password) {
    throw Object.assign(new Error('Only https://github.com/owner/repository URLs are supported.'), { status: 400 });
  }
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) throw Object.assign(new Error('Include both the GitHub owner and repository name.'), { status: 400 });
  const owner = parts[0];
  const name = parts[1].replace(/\.git$/i, '');
  if (!/^[A-Za-z0-9-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(name)) {
    throw Object.assign(new Error('Repository URL contains an unsupported owner or repository name.'), { status: 400 });
  }

  const repoUrl = `${GH}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const meta = await githubJson<{ full_name: string; default_branch: string; html_url: string; private: boolean; size: number }>(repoUrl);
  if (meta.private) throw Object.assign(new Error('Private repository access requires GitHub authorization, which is not configured.'), { status: 401 });
  const branch = meta.default_branch;
  const branchData = await githubJson<{ commit: { sha: string } }>(`${repoUrl}/branches/${encodeURIComponent(branch)}`);
  const commit = branchData.commit.sha;
  const tree = await githubJson<{ tree: TreeEntry[]; truncated: boolean }>(`${repoUrl}/git/trees/${encodeURIComponent(commit)}?recursive=1`);
  if (tree.truncated) throw Object.assign(new Error('GitHub truncated the repository tree; refusing to report an incomplete file inventory.'), { status: 413 });

  // Every Git blob from the pinned tree is inventoried. Content reads prioritize executable/configuration text but do not execute it.
  const files = tree.tree.filter(entry => entry.type === 'blob');
  const exclusions: ScanReport['exclusions'] = [];
  const plan: TreeEntry[] = [];
  let reservedBytes = 0;
  const ordered = [...files].sort((a, b) => prioritizeForInspection(a) - prioritizeForInspection(b) || a.path.localeCompare(b.path));
  for (const file of ordered) {
    const reason = contentSkipReason(file, reservedBytes, plan.length);
    if (reason) exclusions.push({ path: file.path, reason });
    else {
      plan.push(file);
      reservedBytes += file.size ?? 0;
    }
  }

  const results = await mapLimited(plan, fetchConcurrency, file => fetchTextFile(owner, name, commit, file));
  const content = new Map<string, string>();
  let contentBytes = 0;
  for (const result of results) {
    if ('text' in result) {
      content.set(result.path, result.text);
      contentBytes += result.bytes;
    } else exclusions.push({ path: result.path, reason: result.reason });
  }

  const findings: Finding[] = RULES.map(([title, , , candidates], index) => {
    if (index === 24) return makeFinding(index, [], 'BLOCKED');
    const matched = files.filter(file => candidates.some(candidate => file.path.toLowerCase() === candidate.toLowerCase() || file.path.toLowerCase().startsWith(`${candidate.toLowerCase()}/`)));
    return makeFinding(index, matched.map(file => file.path), matched.length ? 'VERIFIED_COMPLETE' : 'REMEDIATION_REQUIRED');
  });

  const secretPatterns = [
    /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"'\s]{12,}["']/ig,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g,
  ];
  let secretCount = 0;
  for (const text of content.values()) {
    if (secretPatterns.some(pattern => { pattern.lastIndex = 0; return pattern.test(text); })) secretCount++;
  }
  findings.unshift({
    id: 'S01', title: 'Potential hard-coded secrets', category: 'Security', severity: 'Critical',
    status: secretCount ? 'REMEDIATION_REQUIRED' : 'NOT RUN',
    detail: secretCount
      ? `Potential credential patterns detected in ${secretCount} inspected file(s). This heuristic needs human confirmation.`
      : `No matching high-confidence patterns found in ${content.size} inspected text files. This heuristic is incomplete; secret cleanliness is NOT verified.`,
    evidence: secretCount
      ? ['Review source locally; the summary intentionally withholds matched paths.']
      : [`Inspected ${content.size} text files; repository history was not scanned.`],
    nextStep: 'Enable provider-native secret scanning and scan repository history; rotate any exposed credentials.',
  });

  const sourcePaths = files.filter(file => /\.[cm]?[jt]sx?$/i.test(file.path));
  const inspectedSourcePaths = sourcePaths.filter(file => content.has(file.path));
  const imports = [...content.entries()]
    .filter(([path]) => /\.[cm]?[jt]sx?$/i.test(path))
    .flatMap(([path, text]) => [...text.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*["']([^"']+)["']/g)].map(match => ({ path, specifier: match[1] })));
  if (sourcePaths.length) {
    const complete = inspectedSourcePaths.length === sourcePaths.length;
    findings.push({
      id: 'D01', title: 'JavaScript/TypeScript import graph', category: 'Architecture', severity: 'Low',
      status: complete ? 'VERIFIED_COMPLETE' : 'NOT RUN',
      detail: complete
        ? `Extracted ${imports.length} import edges from all ${sourcePaths.length} JavaScript/TypeScript files. This is a static approximation, not an execution test.`
        : `Only ${inspectedSourcePaths.length} of ${sourcePaths.length} JavaScript/TypeScript files were readable; the import graph is incomplete.`,
      evidence: imports.slice(0, 8).map(item => `${item.path} → ${item.specifier}`),
      nextStep: 'Review dependency boundaries and unexpected external imports; run the project’s own build/tests only in a properly isolated environment.',
    });
  }

  const inventoryComplete = !tree.truncated;
  const contentOmitted = files.length - content.size;
  const exclusionByPath = new Map(exclusions.map(item => [item.path, item.reason]));
  const fileInventory = files.slice(0, maxExclusionEntries).map(file => {
    const reason = exclusionByPath.get(file.path);
    return { path: file.path, size: file.size ?? null, contentStatus: content.has(file.path) ? 'TEXT_INSPECTED' as const : 'NOT_INSPECTED' as const, ...(reason ? { reason } : {}) };
  });
  const coverage: ScanCoverage = {
    inventoryComplete,
    totalFiles: files.length,
    totalBytes: files.reduce((sum, file) => sum + (file.size ?? 0), 0),
    contentInspected: content.size,
    contentOmitted,
    contentBytes,
    exclusionsTruncated: exclusions.length > maxExclusionEntries,
    inventoryEntriesReturned: fileInventory.length,
    inventoryEntriesTruncated: files.length > maxExclusionEntries,
    executionStatus: 'BLOCKED',
    executedFiles: 0,
    executionReason: 'No isolated execution backend is configured. Repository code was not executed; there is no fallback to the application host.',
  };
  const scored = scoreFindings(findings);
  const notes = [
    `Read-only scan pinned to commit ${commit}. The complete Git Trees API file inventory is used; repository content is never changed.`,
    `Content inspection attempted across all eligible small non-binary files. Inspected ${content.size} text files (${contentBytes.toLocaleString()} bytes); ${contentOmitted} files were not text-inspected. Each omitted path has a reason${coverage.exclusionsTruncated ? ', but the exclusions list is capped at 10,000 entries' : ''}. Per-file cap: ${maxFileBytes} bytes; aggregate budget: ${maxTotalBytes} bytes; content-fetch cap: ${maxInspectedFiles} files.`,
    'Code execution and test/build commands are BLOCKED: no isolated execution backend is configured. No repository code was run, including individual files. A container used to host this app is not an execution sandbox.',
    `GitHub repository size metadata reports ${meta.size} KiB; the scanner does not download or extract an archive. Tree truncation is refused rather than reported as complete.`,
    'Presence checks and secret-pattern matches are heuristics, not proof that controls are effective or a repository is safe. Branch protection, workflow outcomes, dependency advisories, and repository-history secret scanning are not verified.',
  ];
  return {
    id: randomUUID(), repository: meta.html_url, owner, name, commit, branch, scannedAt: new Date().toISOString(),
    files: files.length,
    fileInventory,
    exclusions: exclusions.slice(0, maxExclusionEntries),
    coverage,
    findings,
    ...scored,
    durability: process.env.MONGO_URL ? 'mongodb' : 'volatile',
    notes,
  };
}
