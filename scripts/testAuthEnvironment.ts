/** Configure an ephemeral in-memory identity fixture only for isolated CI verification. */
export function configureTestAuthEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Verification runner refused to enable test identity fixtures in NODE_ENV=production.');
  }
  if (process.env.SOLVEX_ENV !== 'ci') {
    throw new Error('Verification identity fixtures are restricted to SOLVEX_ENV=ci.');
  }
  process.env.NODE_ENV = 'test';
  process.env.SOLVEX_TEST_IDENTITY_ENABLED = 'true';
}
