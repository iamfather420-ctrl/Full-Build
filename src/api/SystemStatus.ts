import { DurableStore } from '../database/DurableStore';
import { ExternalAdapterRegistry } from '../adapters/ExternalAdapters';
import { B2BReferenceCaseService } from '../b2b/B2BReferenceCaseService';

export class SystemStatusService {
  public static computeStatus(): any {
    const chain = DurableStore.getInstance().verifyChain();
    const paypal = ExternalAdapterRegistry.getInventory().find(adapter => adapter.adapter_id === 'DN-35');
    const b2b = B2BReferenceCaseService.getInstance().getReadiness('DH-C-B28A191DCBFE70D0');
    return {
      product: 'SOLVEX B2B Platform',
      version: '2.0.0',
      durable_audit_chain_valid: chain.valid,
      audit_records_count: chain.total_records,
      payment_provider_status: paypal?.status || 'EXTERNAL_PROVIDER_REQUIRED',
      verification_boundary: 'Candidate generation, marketplace verification, and payment verification are independent gates.',
      b2b_readiness: b2b,
      fail_closed_active: true,
      timestamp: Date.now()
    };
  }
}
