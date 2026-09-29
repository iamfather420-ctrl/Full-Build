export const GITHUB_FULL_BUILD_INTEGRATION = {
  repository: 'https://github.com/iamfather420-ctrl/full-build',
  source_classification: 'PUBLIC_REPOSITORY' as const,
  integration_mode: 'PROVENANCE_RECORDED_COMPATIBLE_LINEAGE' as const,
  trust_boundary: 'Upstream code is not treated as production evidence until independently reviewed and verified.',
  current_tree_authority: 'SOLVEX_HARDENED_TREE' as const,
  compatible_assets: [
    'src/paradoxes/GitHubDHBootstrapParadoxRegistry.ts',
    'scripts/verify_paypal_dual_env.ts',
    'artifacts/paypal-dual-environment-test.json'
  ]
};
