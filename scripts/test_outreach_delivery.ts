import assert from "node:assert/strict";
import { executeClaimedOutreachDelivery } from "../artifacts/api-server/src/lib/outreachDelivery.ts";

async function testTimeoutAfterGmailAcceptsDoesNotRetry() {
  let stage = "composed";
  let acceptedByGmail = 0;
  let sendCalls = 0;
  let unknownEvents = 0;
  const attempt = () => executeClaimedOutreachDelivery({
    claim: async () => {
      if (stage !== "composed") return false;
      stage = "sending";
      return true;
    },
    send: async () => {
      sendCalls += 1;
      acceptedByGmail += 1;
      // Simulate remote acceptance followed by a lost response / timeout.
      throw new Error("socket timeout after remote acceptance");
    },
    markDelivered: async () => { stage = "delivered"; },
    recordDelivered: async () => {},
    recordUnknown: async () => { unknownEvents += 1; },
  });

  assert.equal(await attempt(), "delivery_unknown");
  assert.equal(acceptedByGmail, 1, "stub models one remote acceptance");
  assert.equal(stage, "sending", "ambiguous delivery must retain its claim");
  assert.equal(await attempt(), "not_claimed", "retry must be blocked");
  assert.equal(sendCalls, 1, "Gmail stub must only be invoked once");
  assert.equal(unknownEvents, 1, "one reconciliation event should be recorded");
}

async function testSuccessfulSendPersistsMessageIdBeforeDeliveredStage() {
  let stage = "composed";
  let persistedId = "";
  const outcome = await executeClaimedOutreachDelivery({
    claim: async () => { stage = "sending"; return true; },
    send: async () => ({ id: "stub-gmail-message-123" }),
    markDelivered: async (id) => {
      assert.equal(persistedId, id, "message ID must be persisted before delivered stage");
      stage = "delivered";
    },
    recordDelivered: async (id) => { persistedId = id; },
    recordUnknown: async () => { throw new Error("must not record unknown"); },
  });
  assert.equal(outcome, "delivered");
  assert.equal(stage, "delivered");
  assert.equal(persistedId, "stub-gmail-message-123");
}

await testTimeoutAfterGmailAcceptsDoesNotRetry();
await testSuccessfulSendPersistsMessageIdBeforeDeliveredStage();
console.log("PASS outreach delivery fault-injection tests (stub only; no Gmail API calls)");
