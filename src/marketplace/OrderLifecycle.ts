import { SqliteStore } from '../database/SqliteStore';
import { DurableStore } from '../database/DurableStore';
import { UserContext } from '../auth/AuthService';

export class OrderLifecycleManager {
  private static instance: OrderLifecycleManager | null = null;
  private sqlite: SqliteStore;
  private durableStore: DurableStore;

  private validTransitions: Record<string, string[]> = {
    OFFER: ['ORDER_CREATED', 'FAILED'],
    ORDER_CREATED: ['ESCROW_FUNDED', 'FAILED'],
    ESCROW_FUNDED: ['SANDBOX_PROVISIONED', 'FAILED'],
    SANDBOX_PROVISIONED: ['REPLAY_VERIFIED', 'FAILED'],
    REPLAY_VERIFIED: ['DEPLOYED', 'FAILED'],
    DEPLOYED: ['ROLLED_BACK'],
    FAILED: [],
    ROLLED_BACK: []
  };

  private constructor() {
    this.sqlite = SqliteStore.getInstance();
    this.durableStore = DurableStore.getInstance();
  }

  public static getInstance(): OrderLifecycleManager {
    if (!OrderLifecycleManager.instance) {
      OrderLifecycleManager.instance = new OrderLifecycleManager();
    }
    return OrderLifecycleManager.instance;
  }

  public transitionOrder(
    orderId: string,
    targetState: string,
    user?: UserContext,
    evidencePayload?: any
  ): { success: boolean; order?: any; error?: string } {
    const rawDb = this.sqlite.getRawDb();
    const order = rawDb.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return { success: false, error: `Order [${orderId}] not found in SQLite store` };
    }

    const currentStatus = order.status;
    const allowed = this.validTransitions[currentStatus] || [];
    if (!allowed.includes(targetState)) {
      return {
        success: false,
        error: `Illegal state transition: Cannot transition order from [${currentStatus}] directly to [${targetState}]. Allowed: [${allowed.join(', ')}]`
      };
    }

    this.sqlite.updateTenantRecord('orders', order.tenant_id, orderId, {
      status: targetState,
      evidence_reference: evidencePayload ? JSON.stringify(evidencePayload) : null
    });

    const updated = { ...order, status: targetState };
    this.durableStore.appendAudit(
      order.tenant_id,
      user?.email || 'SYSTEM_LIFECYCLE',
      'ORDER_TRANSITION',
      'ORDER',
      orderId,
      { from: currentStatus, to: targetState, evidence: evidencePayload }
    );

    return { success: true, order: updated };
  }
}
