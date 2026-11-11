export type OutreachDeliveryOutcome = "not_claimed" | "delivered" | "delivery_unknown";

export interface OutreachDeliveryDependencies {
  claim(): Promise<boolean>;
  send(): Promise<{ id: string }>;
  markDelivered(messageId: string): Promise<void>;
  recordDelivered(messageId: string): Promise<void>;
  recordUnknown(): Promise<void>;
}

/**
 * Runs delivery only after an atomic claim. Once send() is entered, every
 * failure is ambiguous: Gmail may have accepted the message before a timeout
 * or a later persistence failure. Never release the claim for automatic retry.
 */
export async function executeClaimedOutreachDelivery(
  deps: OutreachDeliveryDependencies,
): Promise<OutreachDeliveryOutcome> {
  const claimed = await deps.claim();
  if (!claimed) return "not_claimed";

  try {
    const result = await deps.send();
    // Persist the returned Gmail ID before marking the prospect delivered.
    await deps.recordDelivered(result.id);
    await deps.markDelivered(result.id);
    return "delivered";
  } catch {
    // A failure can happen after Gmail accepted the message. Keep the
    // prospect in "sending" and require manual reconciliation before retry.
    try {
      await deps.recordUnknown();
    } catch {
      // Preserve the no-retry state even if the audit event cannot be written.
    }
    return "delivery_unknown";
  }
}
