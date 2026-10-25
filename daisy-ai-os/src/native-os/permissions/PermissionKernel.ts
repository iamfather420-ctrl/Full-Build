/**
 * AI-OS NATIVE BRANCH — Permissions
 *
 * Until signed caller identity and operation-bound human authorization are
 * implemented, only read-only access to explicitly public resources is allowed.
 */
import type { PermissionGrant } from '../types.ts';

export class PermissionKernel {
  private grants: PermissionGrant[] = [];

  request(subject: string, resource: string, action: PermissionGrant['action']): PermissionGrant {
    const allowed = action === 'read' && resource.startsWith('public:');
    const grant: PermissionGrant = {
      subject,
      resource,
      action,
      granted: allowed,
      reason: allowed
        ? 'Allowed: public read-only resource'
        : 'BLOCKED: verified identity and operation-bound human authorization are not implemented',
    };
    this.grants.push(grant);
    return grant;
  }

  list(): PermissionGrant[] {
    return [...this.grants];
  }
}
