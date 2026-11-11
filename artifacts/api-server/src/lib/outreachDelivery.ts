export type OutreachDeliveryOutcome = "not_claimed" | "delivered" | "delivery_unknown" | "persistence_incomplete";

export interface OutreachDeliveryDependencies {
  claim(): Promise<boolean>;
  send(): Promise<{ id: string }>;
  markDelivered(messageId: string): Promise<void>;
  recordDelivered(messageId: string): Promise<void>;
  recordUnknown(): Promise<void>;
  recordPersistenceIncomplete(messageId: string): Promise<void>;
}

/**
 * A failed Gmail request is ambiguous: remote acceptance may have happened
 * before the client timed out. Keep the atomic claim and never auto-retry.
 * If Gmail returns an ID but persistence then fails, delivery is confirmed;
 * retain the claim and reconcile storage without sending again.
 */
export async function executeClaimedOutreachDelivery(
  deps: OutreachDeliveryDependencies,
): Promise<OutreachDeliveryOutcome> {
  const claimed = await deps.claim();
  if (!claimed) return "not_claimed";

  let result: { id: string };
  try {
    result = await deps.send();
  } catch {
    try {
      await deps.recordUnknown();
    } catch {
      // The prospect remains "sending" even if event persistence also fails.
    }
    return "delivery_unknown";
  }

  try {
    await deps.recordDelivered(result.id);
    await deps.markDelivered(result.id);
    return "delivered";
  } catch {
    try {
      await deps.recordPersistenceIncomplete(result.id);
    } catch {
      // Keep the claim: a confirmed send must never be automatically repeated.
    }
    return "persistence_incomplete";
  }
}
