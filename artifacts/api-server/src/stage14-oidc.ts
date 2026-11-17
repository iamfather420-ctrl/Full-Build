export const STAGE14_AUDIENCE = 'solvex-stage14-evaluator';
export const STAGE14_TRUSTED_REPOSITORY = 'iamfather420-ctrl/Full-Build';
const REPOSITORY_ID = '1388681071';
const TRUSTED_PUSH_REFS = new Set(['refs/heads/main', 'refs/heads/fix/46-gate-baseline-lifecycle-sandbox']);
const TRUSTED_PULL_REQUEST_REFS = new Set(['refs/pull/130/merge', 'refs/pull/132/merge', 'refs/pull/133/merge', 'refs/pull/136/merge', 'refs/pull/137/merge', 'refs/pull/140/merge']);
const TRUSTED_PULL_REQUEST_HEADS = new Set(['fix/46-gate-baseline-lifecycle-sandbox', 'fix/gate05-deterministic-pipeline-test-20261114', 'fix/stage14-rationale-and-zeno-evidence-20261114', 'feat/daisy-ecosystem-link-20261116', 'repair/remaining-17-nodes', 'fix/proof-closure-disposable-lifecycle', 'fix/gate12-disposable-neon-identity-20261117']);

export function stage14ClaimsTrusted(claims: any, now = Math.floor(Date.now() / 1000)): boolean {
  if (!claims || typeof claims !== 'object') return false;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const workflowPrefix = `${STAGE14_TRUSTED_REPOSITORY}/.github/workflows/ci.yml@`;
  const trustedWorkflow = typeof claims.workflow_ref === 'string' && claims.workflow_ref.startsWith(workflowPrefix);
  const trustedPush = claims.event_name === 'push' &&
    TRUSTED_PUSH_REFS.has(claims.ref) &&
    claims.workflow_ref === `${workflowPrefix}${claims.ref}`;
  const trustedPullRequest = claims.event_name === 'pull_request' &&
    claims.sub === `repo:${STAGE14_TRUSTED_REPOSITORY}:pull_request` &&
    TRUSTED_PULL_REQUEST_REFS.has(claims.ref) &&
    typeof claims.head_ref === 'string' && TRUSTED_PULL_REQUEST_HEADS.has(claims.head_ref) &&
    trustedWorkflow;
  return claims.iss === 'https://token.actions.githubusercontent.com' &&
    audiences.includes(STAGE14_AUDIENCE) &&
    Number.isFinite(claims.exp) && claims.exp > now &&
    !(Number.isFinite(claims.nbf) && claims.nbf > now) &&
    claims.repository === STAGE14_TRUSTED_REPOSITORY &&
    String(claims.repository_id) === REPOSITORY_ID &&
    (trustedPush || trustedPullRequest);
}
