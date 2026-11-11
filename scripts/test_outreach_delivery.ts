import assert from "node:assert/strict";
import { executeClaimedOutreachDelivery } from "../artifacts/api-server/src/lib/outreachDelivery.ts";

async function testTimeoutAfterRemoteAcceptanceDoesNotRetry() {
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
      // Gmail accepted the message, but its response was lost in transit.
      throw new Error("socket timeout after remote acceptance");
    },
    markDelivered: async () => { stage = "delivered"; },
    recordDelivered: async () => {},
    recordUnknown: async () => { unknownEvents += 1; },
    recordPersistenceIncomplete: async () => { throw new Error("not expected"); },
  });

  assert.equal(await attempt(), "delivery_unknown");
  assert.equal(acceptedByGmail, 1);
  assert.equal(stage, "sending", "ambiguous delivery retains its atomic claim");
  assert.equal(await attempt(), "not_claimed", "retry must be blocked");
  assert.equal(sendCalls, 1, "Gmail stub must only be called once");
  assert.equal(unknownEvents, 1);
}

async function testConfirmedSendPersistsMessageIdBeforeDeliveredStage() {
  let stage = "composed";
  let persistedId = "";
  const outcome = await executeClaimedOutreachDelivery({
    claim: async () => { stage = "sending"; return true; },
    send: async () => ({ id: "stub-gmail-message-123" }),
    markDelivered: async (id) => {
      assert.equal(persistedId, id);
      stage = "delivered";
    },
    recordDelivered: async (id) => { persistedId = id; },
    recordUnknown: async () => { throw new Error("not expected"); },
    recordPersistenceIncomplete: async () => { throw new Error("not expected"); },
  });
  assert.equal(outcome, "delivered");
  assert.equal(stage, "delivered");
  assert.equal(persistedId, "stub-gmail-message-123");
}

async function testPersistenceFailureAfterConfirmedSendStillBlocksRetry() {
  let stage = "composed";
  let sendCalls = 0;
  let reconciliationId = "";
  const attempt = () => executeClaimedOutreachDelivery({
    claim: async () => {
      if (stage !== "composed") return false;
      stage = "sending";
      return true;
    },
    send: async () => {
      sendCalls += 1;
      return { id: "stub-gmail-message-456" };
    },
    recordDelivered: async () => { throw new Error("database write failed"); },
    markDelivered: async () => { stage = "delivered"; },
    recordUnknown: async () => { throw new Error("not expected"); },
    recordPersistenceIncomplete: async (id) => { reconciliationId = id; },
  });
  assert.equal(await attempt(), "persistence_incomplete");
  assert.equal(stage, "sending");
  assert.equal(reconciliationId, "stub-gmail-message-456");
  assert.equal(await attempt(), "not_claimed");
  assert.equal(sendCalls, 1);
}

await testTimeoutAfterRemoteAcceptanceDoesNotRetry();
await testConfirmedSendPersistsMessageIdBeforeDeliveredStage();
await testPersistenceFailureAfterConfirmedSendStillBlocksRetry();
console.log("PASS outreach delivery fault-injection tests (stub only; no Gmail API calls)");
