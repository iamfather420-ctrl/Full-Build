import { NodeRegistry } from '../nodes/NodeRegistry';
import { DurableStore } from '../database/DurableStore';
import { ExternalAdapterRegistry } from '../adapters/ExternalAdapters';

export class SystemStatusService {
  public static computeStatus(): any {
    const nodeReg = NodeRegistry.getInstance();
    const durable = DurableStore.getInstance();
    const chainVerification = durable.verifyChain();
    const adapters = ExternalAdapterRegistry.getInventory();
    const paypal = adapters.find(a => a.adapter_id === 'DN-35');

    return {
      product: 'Project AGATE Sovereign Core & SOLVEX Sovereign Platform',
      engine: 'dAIsy haMINJA Core Engine',
      version: '1.0.0-PROD',
      registered_nodes: nodeReg.getAllNodes().length,
      chain_valid: chainVerification.valid,
      audit_records_count: chainVerification.total_records,
      payment_provider_status: paypal ? paypal.status : 'EXTERNAL_PROVIDER_REQUIRED',
      fail_closed_active: true,
      timestamp: Date.now()
    };
  }
}
