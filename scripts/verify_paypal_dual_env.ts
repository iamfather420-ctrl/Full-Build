import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

type Check = 'PASS' | 'FAIL' | 'NOT_TESTED';

export interface DualEnvForensicResult {
  configuration: {
    sandbox_client_id: Check;
    sandbox_client_secret: Check;
    sandbox_var_names_used: string[];
    live_credentials_read: false;
    active_environment: 'sandbox' | 'invalid';
  };
  authentication: { sandbox_auth: Check; live_auth: 'NOT_TESTED' };
  api_connectivity: { sandbox_oauth_endpoint: Check; live_api: 'NOT_TESTED' };
  environment_isolation: {
    sandbox_host_only: Check;
    payments_disabled: Check;
  };
  transaction_safety: {
    real_transaction_executed: false;
    real_money_moved: false;
  };
  final_status: {
    paypal_sandbox_authenticated: Check;
    paypal_live_authenticated: 'NOT_TESTED';
    production_transaction_ready: 'NOT_TESTED';
  };
  payment_processing: 'DISABLED';
  network_requests_made: number;
  stop_conditions_tripped: string[];
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function runPayPalDualEnvForensicTest(): Promise<{
  result: DualEnvForensicResult;
  formattedReport: string;
  evidenceHash: string;
  artifactPath: string;
}> {
  const stop: string[] = [];
  const result: DualEnvForensicResult = {
    configuration: {
      sandbox_client_id: 'NOT_TESTED',
      sandbox_client_secret: 'NOT_TESTED',
      sandbox_var_names_used: [],
      live_credentials_read: false,
      active_environment: 'invalid',
    },
    authentication: { sandbox_auth: 'NOT_TESTED', live_auth: 'NOT_TESTED' },
    api_connectivity: { sandbox_oauth_endpoint: 'NOT_TESTED', live_api: 'NOT_TESTED' },
    environment_isolation: { sandbox_host_only: 'NOT_TESTED', payments_disabled: 'NOT_TESTED' },
    transaction_safety: { real_transaction_executed: false, real_money_moved: false },
    final_status: {
      paypal_sandbox_authenticated: 'NOT_TESTED',
      paypal_live_authenticated: 'NOT_TESTED',
      production_transaction_ready: 'NOT_TESTED',
    },
    payment_processing: 'DISABLED',
    network_requests_made: 0,
    stop_conditions_tripped: stop,
  };

  const formatted = (status: string) => [
    '# PayPal Sandbox Authentication Verification',
    `STATUS: ${status}`,
    'Only the PayPal sandbox OAuth token endpoint is contacted.',
    'No live credentials are read. No order, capture, refund, or payment transaction is created.',
    'Payment processing remains disabled.',
    '',
    ...stop.map((item) => `STOP: ${item}`),
  ].join('\\n');

  try {
    if (process.env.PAYPAL_ENVIRONMENT !== 'sandbox') {
      stop.push('PAYPAL_ENVIRONMENT_MUST_EQUAL_SANDBOX');
      throw new Error('PAYPAL_ENVIRONMENT must be exactly sandbox');
    }
    if (process.env.PAYMENTS_ENABLED !== 'false') {
      stop.push('PAYMENTS_MUST_REMAIN_DISABLED');
      throw new Error('PAYMENTS_ENABLED must be exactly false');
    }
    result.configuration.active_environment = 'sandbox';
    result.environment_isolation.payments_disabled = 'PASS';

    const clientId = required('PAYPAL_SANDBOX_CLIENT_ID');
    const clientSecret = required('PAYPAL_SANDBOX_CLIENT_SECRET');
    result.configuration.sandbox_var_names_used = [
      'PAYPAL_SANDBOX_CLIENT_ID',
      'PAYPAL_SANDBOX_CLIENT_SECRET',
    ];
    result.configuration.sandbox_client_id = 'PASS';
    result.configuration.sandbox_client_secret = 'PASS';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      result.network_requests_made = 1;
      response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: 'grant_type=client_credentials',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (new URL(response.url).hostname !== 'api-m.sandbox.paypal.com') {
      stop.push('NON_SANDBOX_PAYPAL_HOST_REJECTED');
      throw new Error('PayPal response did not originate from the sandbox host');
    }
    result.environment_isolation.sandbox_host_only = 'PASS';
    const payload = await response.json() as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
    };
    if (!response.ok || typeof payload.access_token !== 'string' ||
        payload.access_token.length < 20 || payload.token_type?.toLowerCase() !== 'bearer' ||
        typeof payload.expires_in !== 'number' || payload.expires_in <= 0) {
      result.authentication.sandbox_auth = 'FAIL';
      result.api_connectivity.sandbox_oauth_endpoint = response.ok ? 'FAIL' : 'FAIL';
      stop.push(`PAYPAL_SANDBOX_OAUTH_REJECTED_HTTP_${response.status}`);
      throw new Error(`PayPal sandbox OAuth failed with HTTP ${response.status}`);
    }
    // Never persist or print the returned access token.
    result.authentication.sandbox_auth = 'PASS';
    result.api_connectivity.sandbox_oauth_endpoint = 'PASS';
    result.final_status.paypal_sandbox_authenticated = 'PASS';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown PayPal verification failure';
    if (result.authentication.sandbox_auth === 'NOT_TESTED') {
      result.authentication.sandbox_auth = 'FAIL';
      result.final_status.paypal_sandbox_authenticated = 'FAIL';
    }
    if (!stop.length) stop.push('SANDBOX_AUTHENTICATION_OR_CONFIGURATION_FAILED');
    const report = formatted('FAIL — sandbox authentication not proven');
    const artifact = {
      test_suite: 'PAYPAL_SANDBOX_OAUTH_AUTHENTICATION',
      timestamp: new Date().toISOString(),
      results: result,
      formatted_report: report,
      error: message,
      truth_boundary_attestation: 'No live credentials read; no transaction attempted; no token persisted.',
    };
    const artifactStr = JSON.stringify(artifact, null, 2);
    const artifactsDir = path.resolve('artifacts');
    fs.mkdirSync(artifactsDir, { recursive: true });
    const artifactPath = path.join(artifactsDir, 'paypal-dual-environment-test.json');
    fs.writeFileSync(artifactPath, artifactStr, 'utf8');
    fs.writeFileSync(path.resolve('paypal-dual-environment-test.json'), artifactStr, 'utf8');
    return {
      result,
      formattedReport: report,
      evidenceHash: crypto.createHash('sha256').update(artifactStr).digest('hex'),
      artifactPath,
    };
  }

  const report = formatted('PASS — sandbox OAuth authenticated; payments remain disabled');
  const artifact = {
    test_suite: 'PAYPAL_SANDBOX_OAUTH_AUTHENTICATION',
    timestamp: new Date().toISOString(),
    results: result,
    formatted_report: report,
    truth_boundary_attestation: 'No live credentials read; no transaction attempted; no token persisted.',
  };
  const artifactStr = JSON.stringify(artifact, null, 2);
  const artifactsDir = path.resolve('artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const artifactPath = path.join(artifactsDir, 'paypal-dual-environment-test.json');
  fs.writeFileSync(artifactPath, artifactStr, 'utf8');
  fs.writeFileSync(path.resolve('paypal-dual-environment-test.json'), artifactStr, 'utf8');
  return {
    result,
    formattedReport: report,
    evidenceHash: crypto.createHash('sha256').update(artifactStr).digest('hex'),
    artifactPath,
  };
}

if (process.argv[1]?.endsWith('verify_paypal_dual_env.ts')) {
  runPayPalDualEnvForensicTest().then(({ formattedReport, evidenceHash, artifactPath, result }) => {
    console.log(formattedReport);
    console.log(`Sandbox OAuth: ${result.authentication.sandbox_auth}`);
    console.log(`Network requests: ${result.network_requests_made}`);
    console.log(`Artifact Path: ${artifactPath}`);
    console.log(`SHA-256 Hash: ${evidenceHash}`);
    if (result.authentication.sandbox_auth !== 'PASS') process.exitCode = 1;
  }).catch((error) => {
    console.error('PayPal sandbox verification failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
}
