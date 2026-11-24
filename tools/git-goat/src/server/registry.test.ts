import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScanReport } from '../shared/contracts.js';
import { publishScanToRegistry } from './registry.js';

const report = { id: 'scan_12345678', repository: 'https://github.com/example/project', owner: 'example', name: 'project', branch: 'main', commit: 'a'.repeat(40), scannedAt: '2026-11-23T12:00:00.000Z' } as ScanReport;
const originalFetch = globalThis.fetch;
const originalOrigin = process.env.SOLVEX_REGISTRY_API_ORIGIN;
afterEach(() => { globalThis.fetch = originalFetch; if (originalOrigin === undefined) delete process.env.SOLVEX_REGISTRY_API_ORIGIN; else process.env.SOLVEX_REGISTRY_API_ORIGIN = originalOrigin; vi.restoreAllMocks(); });

describe('explicit G.O.A.T. Registry publishing', () => {
  it('fails closed without a gate identity', async () => { process.env.SOLVEX_REGISTRY_API_ORIGIN = 'https://registry.example'; await expect(publishScanToRegistry(report, null, 'goat.example')).rejects.toThrow(/gate identity/i); });
  it('does not send a request when the Registry origin is missing', async () => { delete process.env.SOLVEX_REGISTRY_API_ORIGIN; await expect(publishScanToRegistry(report, 'signed-token', 'goat.example')).rejects.toThrow(/not configured/i); });
  it('writes then independently reads back the same ID, digest, and pinned commit', async () => {
    process.env.SOLVEX_REGISTRY_API_ORIGIN = 'https://registry.example'; const digest = 'b'.repeat(64);
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ status: 'RECORDED', assessmentId: report.id, digest, readbackPath: '/api/v1/assessments/' + encodeURIComponent(report.id) }), { status: 201, headers: { 'content-type': 'application/json' } })).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'READ_BACK', verified: true, assessmentId: report.id, digest, commit: report.commit }), { status: 200, headers: { 'content-type': 'application/json' } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch; const result = await publishScanToRegistry(report, 'signed-token', 'goat.example');
    expect(result.status).toBe('RECORDED'); expect(result.digest).toBe(digest); expect(fetchMock).toHaveBeenCalledTimes(2); expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ 'x-grok-identity': 'signed-token', 'x-forwarded-host': 'goat.example' });
  });
  it('rejects a mismatched independent readback digest', async () => {
    process.env.SOLVEX_REGISTRY_API_ORIGIN = 'https://registry.example';
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ status: 'RECORDED', assessmentId: report.id, digest: 'b'.repeat(64), readbackPath: '/api/v1/assessments/' + encodeURIComponent(report.id) }), { status: 201 })).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'READ_BACK', verified: true, assessmentId: report.id, digest: 'c'.repeat(64), commit: report.commit }), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch; await expect(publishScanToRegistry(report, 'signed-token', 'goat.example')).rejects.toThrow(/did not match/i);
  });
});