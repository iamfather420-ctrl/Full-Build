import { SqliteStore } from '../database/SqliteStore';
import { DurableStore } from '../database/DurableStore';
import { UserContext, AuthService } from '../auth/AuthService';

export class OrderLifecycleManager {
  private static instance: OrderLifecycleManager | null = null;
  private readonly sqlite = SqliteStore.getInstance();
  private readonly durableStore = DurableStore.getInstance();
  private readonly validTransitions: Record<string, string[]> = {
    ORDER_CREATED: ['FAILED'],
    ESCROW_FUNDED: ['SANDBOX_PROVISIONED', 'FAILED'],
    SANDBOX_PROVISIONED: ['REPLAY_VERIFIED', 'FAILED'],
    REPLAY_VERIFIED: ['DEPLOYED', 'FAILED'],
    DEPLOYED: ['ROLLED_BACK'],
    FAILED: [], ROLLED_BACK: []
  };

  public static getInstance(): OrderLifecycleManager {
    if (!OrderLifecycleManager.instance) OrderLifecycleManager.instance = new OrderLifecycleManager();
    return OrderLifecycleManager.instance;
  }

  public transitionOrder(orderId: string, targetState: string, user: UserContext, evidencePayload?: any): { success: boolean; order?: any; error?: string } {
    const order = this.sqlite.findTenantRecordById<any>('orders', user.tenant_id, orderId);
    if (!order) return { success: false, error: 'Order not found in the authenticated tenant' };
    const action = targetState === 'DEPLOYED' ? 'DEPLOY_RUNTIME' : 'VERIFY_PAYMENT';
    const authorization = AuthService.getInstance().authorize(user, action, order.tenant_id);
    if (!authorization.authorized) return { success: false, error: authorization.reason };
    if (targetState === 'ESCROW_FUNDED') return { success: false, error: 'ESCROW_FUNDED is reserved for server-side PayPal verification' };
    const allowed = this.validTransitions[order.status] || [];
    if (!allowed.includes(targetState)) return { success: false, error: `Illegal transition ${order.status} -> ${targetState}` };
    if (!evidencePayload || typeof evidencePayload !== 'object' || !evidencePayload.evidence_hash) return { success: false, error: 'Transition evidence with an evidence_hash is required' };
    this.sqlite.transaction(() => {
      this.sqlite.updateTenantRecord('orders', user.tenant_id, orderId, { status: targetState, evidence_reference: evidencePayload });
      this.durableStore.appendAudit(order.tenant_id, user.user_id, 'ORDER_TRANSITION', 'ORDER', orderId, { from: order.status, to: targetState, evidence_hash: evidencePayload.evidence_hash });
    });
    return { success: true, order: { ...order, status: targetState, evidence_reference: evidencePayload } };
  }
}
