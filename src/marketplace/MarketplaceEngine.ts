import { computeSha256, OfferEntity, OrderEntity } from '../database/DatabaseSchema';
import { DurableStore } from '../database/DurableStore';
import { SqliteStore } from '../database/SqliteStore';
import { ProofEngine } from '../proofs/ProofEngine';

export interface DefensiblePriceResult {
  cost_basis_cents: number;
  complexity_factor: number;
  risk_class: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_multiplier: number;
  margin_factor: number;
  final_price_cents: number;
  calculation_hash: string;
}

/** Marketplace writes are allowed only for independently bound, verified evidence. */
export class MarketplaceEngine {
  private static instance: MarketplaceEngine | null = null;
  private readonly durableStore: DurableStore;
  private readonly sqlite: SqliteStore;

  private constructor() {
    this.durableStore = DurableStore.getInstance();
    this.sqlite = SqliteStore.getInstance();
  }

  public static getInstance(): MarketplaceEngine {
    if (!MarketplaceEngine.instance) MarketplaceEngine.instance = new MarketplaceEngine();
    return MarketplaceEngine.instance;
  }

  public calculateDefensiblePrice(costBasisCents: number, complexityFactor: number, riskClass: 'LOW' | 'MEDIUM' | 'HIGH'): DefensiblePriceResult {
    if (!Number.isInteger(costBasisCents) || costBasisCents <= 0 || !Number.isFinite(complexityFactor) || complexityFactor <= 0) {
      throw new Error('Pricing inputs must be positive deterministic values');
    }
    const riskMultiplier = riskClass === 'LOW' ? 1.10 : riskClass === 'MEDIUM' ? 1.25 : 1.50;
    const marginFactor = 1.35;
    const finalPriceCents = Math.round(costBasisCents * complexityFactor * riskMultiplier * marginFactor);
    return {
      cost_basis_cents: costBasisCents,
      complexity_factor: complexityFactor,
      risk_class: riskClass,
      risk_multiplier: riskMultiplier,
      margin_factor: marginFactor,
      final_price_cents: finalPriceCents,
      calculation_hash: computeSha256(`V2:${costBasisCents}:${complexityFactor.toFixed(4)}:${riskClass}:${riskMultiplier}:${marginFactor}:${finalPriceCents}`)
    };
  }

  public publishOffer(solutionId: string, proofBundleId: string, title: string, description: string, costBasisCents: number, complexityFactor: number, riskClass: 'LOW' | 'MEDIUM' | 'HIGH'): { success: boolean; offer?: OfferEntity; error?: string } {
    const state = this.durableStore.getState();
    const solution = state.solutions[solutionId];
    const bundle = state.proof_bundles[proofBundleId];
    if (!solution || solution.verification_status !== 'VERIFIED') return { success: false, error: 'Publication blocked: solution is not independently VERIFIED' };
    if (!bundle || bundle.verification_status !== 'VERIFIED') return { success: false, error: 'Publication blocked: proof bundle is not independently VERIFIED' };
    if (solution.proof_bundle_id !== proofBundleId || bundle.subject_id !== solutionId) return { success: false, error: 'Publication blocked: solution/proof subject binding mismatch' };
    if (bundle.implementation_hash !== solution.implementation_hash) return { success: false, error: 'Publication blocked: implementation hash does not match the verified bundle' };
    const integrity = ProofEngine.getInstance().verifyBundleIntegrity(bundle);
    if (!integrity.verified) return { success: false, error: `Publication blocked: evidence integrity failed (${integrity.reasons.join('; ')})` };

    const price = this.calculateDefensiblePrice(costBasisCents, complexityFactor, riskClass);
    const offerId = `off_${computeSha256(`${solutionId}:${proofBundleId}:${price.calculation_hash}`).slice(0, 20)}`;
    const existing = state.offers[offerId];
    if (existing) return { success: true, offer: existing };

    const offer: OfferEntity = {
      id: offerId, offer_id: offerId, tenant_id: 'TENANT_SOVEREIGN_ROOT', solution_id: solutionId, proof_bundle_id: proofBundleId,
      title, description, cost_basis_cents: costBasisCents, verification_complexity_factor: complexityFactor,
      risk_class: riskClass, price_cents: price.final_price_cents, sla_tier: 'EVIDENCE_BOUND', published: true,
      verification_status: 'VERIFIED', created_at: Date.now()
    };
    this.sqlite.transaction(() => {
      this.sqlite.insertRecord('offers', { ...offer, status: 'PUBLISHED', publication_evidence_hash: computeSha256(`${solutionId}:${proofBundleId}:${bundle.claim_hash}:${bundle.implementation_hash}`) });
      state.offers[offerId] = offer;
      this.durableStore.appendAudit('TENANT_SOVEREIGN_ROOT', 'MARKETPLACE_PUBLICATION_GATE', 'OFFER_PUBLISHED', 'OFFER', offerId, { solution_id: solutionId, proof_bundle_id: proofBundleId, implementation_hash: solution.implementation_hash });
      this.durableStore.persist();
    });
    return { success: true, offer };
  }

  public listPublishedOffers(): OfferEntity[] {
    return Object.values(this.durableStore.getState().offers).filter(offer => offer.published && offer.verification_status === 'VERIFIED');
  }

  public createOrder(tenantId: string, offerId: string): { success: boolean; order?: OrderEntity; error?: string } {
    const offer = this.durableStore.getState().offers[offerId];
    if (!offer || !offer.published || offer.verification_status !== 'VERIFIED') return { success: false, error: 'Order creation blocked: offer is not verified and published' };
    const orderId = `ord_${computeSha256(`${tenantId}:${offerId}:${Date.now()}`).slice(0, 20)}`;
    const order: OrderEntity = {
      id: orderId, tenant_id: tenantId, offer_id: offerId, solution_id: offer.solution_id, proof_bundle_id: offer.proof_bundle_id,
      price_cents: offer.price_cents, status: 'ORDER_CREATED', created_at: Date.now()
    };
    this.sqlite.transaction(() => {
      this.sqlite.insertRecord('orders', { ...order, currency: 'USD', payment_asset_policy: 'PYUSD_ONLY', status: 'ORDER_CREATED' });
      this.durableStore.appendAudit(tenantId, 'MARKETPLACE_ORDER_GATE', 'ORDER_CREATED', 'ORDER', orderId, { offer_id: offerId, price_cents: order.price_cents, currency: 'USD', payment_asset_policy: 'PYUSD_ONLY' });
    });
    return { success: true, order };
  }
}
