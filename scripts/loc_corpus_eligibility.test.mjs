import assert from "node:assert/strict";
import { test } from "node:test";
import { locBookEligibility } from "./loc_corpus_eligibility.mjs";

const boilerplate = "The books in this collection are in the public domain and are free to use and reuse.";
const blockedGate = { source_groups: [{ source_id: "loc-english-grammar-six-books", training_status: "not_approved", rights_and_review_status: "PENDING_REVIEW" }] };
const inventory = { item_id: "24000690", training_eligible: false, rights_status: "PENDING_REVIEW" };

test("boilerplate and a client flag do not make an unapproved book eligible", () => {
  const decision = locBookEligibility({
    source: { item_id: "24000690", loc_rights: boilerplate, training_eligible: true, approved: true },
    gate: blockedGate,
    inventorySource: inventory,
  });
  assert.equal(decision.trainingEligible, false);
  assert.equal(decision.approval, "NOT_APPROVED");
  assert.equal(decision.corpusStatus, "STAGING_ONLY");
  assert.equal(decision.use, "NOT_FOR_TRAINING");
  assert.match(decision.reasons.join(" "), /boilerplate/);
  assert.match(decision.reasons.join(" "), /client-supplied/);
});

test("missing or malformed review records block admission", () => {
  for (const gate of [null, "{", [], { source_groups: [] }, { source_groups: [{ source_id: "other" }] }]) {
    const decision = locBookEligibility({ source: { item_id: "24000690" }, gate, inventorySource: inventory });
    assert.equal(decision.trainingEligible, false);
    assert.match(decision.reasons.join(" "), /missing|malformed|duplicated/);
  }
});
