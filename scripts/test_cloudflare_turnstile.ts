import assert from 'node:assert/strict';
import { CloudflareTurnstileVerifier } from '../src/blockchain/CloudflareTurnstileVerifier';

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
}

async function main() {
  let requestedBody = '';
  const successVerifier = new CloudflareTurnstileVerifier({
    secretKey: 'test-secret',
    allowedHostnames: ['approval.example.test'],
    fetchImpl: async (_input, init) => {
      requestedBody = String(init?.body ?? '');
      return jsonResponse({
        success: true,
        hostname: 'approval.example.test',
        action: 'mmtai-human-root'
      });
    }
  });
  const success = await successVerifier.verify('single-use-test-token', '192.0.2.10');
  assert.equal(success.verified, true);
  assert.equal(success.hostname, 'approval.example.test');
  assert.ok(requestedBody.includes('secret=test-secret'));
  assert.ok(requestedBody.includes('response=single-use-test-token'));
  assert.ok(requestedBody.includes('remoteip=192.0.2.10'));

  assert.equal((await successVerifier.verify('')).errorCode, 'MISSING_TOKEN');

  const wrongHost = new CloudflareTurnstileVerifier({
    secretKey: 'test-secret',
    allowedHostnames: ['approval.example.test'],
    fetchImpl: async () => jsonResponse({
      success: true, hostname: 'attacker.example', action: 'mmtai-human-root'
    })
  });
  assert.equal((await wrongHost.verify('valid-looking-token')).errorCode, 'HOSTNAME_MISMATCH');

  const wrongAction = new CloudflareTurnstileVerifier({
    secretKey: 'test-secret',
    allowedHostnames: ['approval.example.test'],
    fetchImpl: async () => jsonResponse({
      success: true, hostname: 'approval.example.test', action: 'login'
    })
  });
  assert.equal((await wrongAction.verify('valid-looking-token')).errorCode, 'ACTION_MISMATCH');

  const rejected = new CloudflareTurnstileVerifier({
    secretKey: 'test-secret',
    allowedHostnames: ['approval.example.test'],
    fetchImpl: async () => jsonResponse({ success: false, 'error-codes': ['invalid-input-response'] })
  });
  assert.equal((await rejected.verify('expired-token')).errorCode, 'SITEVERIFY_REJECTED');

  const unavailable = new CloudflareTurnstileVerifier({
    secretKey: 'test-secret',
    allowedHostnames: ['approval.example.test'],
    fetchImpl: async () => { throw new Error('network unavailable'); }
  });
  assert.equal((await unavailable.verify('valid-looking-token')).errorCode, 'VERIFICATION_UNAVAILABLE');

  assert.throws(
    () => new CloudflareTurnstileVerifier({ secretKey: '', allowedHostnames: ['approval.example.test'] }),
    /TURNSTILE_SECRET_KEY/
  );
  assert.throws(
    () => new CloudflareTurnstileVerifier({ secretKey: 'test-secret', allowedHostnames: [] }),
    /hostname allowlist/
  );

  process.stdout.write('Cloudflare Turnstile verifier tests passed: success, missing token, hostname/action mismatch, provider rejection, network failure, and fail-closed configuration.\\n');
}

main().catch(error => {
  process.stderr.write(`Cloudflare Turnstile tests failed: ${error instanceof Error ? error.stack : String(error)}\\n`);
  process.exitCode = 1;
});
