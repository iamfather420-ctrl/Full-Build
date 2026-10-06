/**
 * AI-OS NATIVE BRANCH — Permissions
 * Fail-closed grants for Daisy system resources.
 */
import type { PermissionGrant } from '../types.ts';

export class PermissionKernel {
  private grants: PermissionGrant[] = [];

  request(subject: string, resource: string, action: PermissionGrant['action']): PermissionGrant {
    const allowed =
      subject === 'daisy' ||
      subject === 'trustee' ||
      subject === 'system' ||
      (action === 'read' && resource.startsWith('public:'));

    const grant: PermissionGrant = {
      subject,
      resource,
      action,
      granted: allowed,
      reason: allowed ? 'Daisy native policy allow' : 'Fail-closed: insufficient privilege',
    };
    this.grants.push(grant);
    return grant;
  }

  list(): PermissionGrant[] {
    return [...this.grants];
  }
}
