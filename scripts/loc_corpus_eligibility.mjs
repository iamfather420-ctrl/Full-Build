export function locBookEligibility({ source, gate, inventorySource, bookApproval }) {
  const reasons = [];
  if (!gate || typeof gate !== "object" || Array.isArray(gate) || !Array.isArray(gate.source_groups)) {
    reasons.push("Source-review record is missing or malformed.");
  } else {
    const groups = gate.source_groups.filter((group) => group && group.source_id === "loc-english-grammar-six-books");
    if (groups.length !== 1) reasons.push("LOC six-book review record is missing or duplicated.");
    else if (groups[0].training_status !== "approved" || String(groups[0].rights_and_review_status || "").includes("PENDING_REVIEW")) {
      reasons.push("LOC six books remain NOT_APPROVED.");
    }
  }
  if (!inventorySource || typeof inventorySource !== "object") reasons.push("Inventory record is missing.");
  else if (inventorySource.training_eligible !== true || inventorySource.rights_status === "PENDING_REVIEW" || inventorySource.rights_review === "PENDING_REVIEW") {
    reasons.push("Source inventory does not approve this book.");
  }
  if (!source || typeof source !== "object") reasons.push("Source record is missing.");
  if (!bookApproval || bookApproval.verified !== true
    || bookApproval.sourceId !== String(source?.item_id ?? "")
    || bookApproval.sourceSha256 !== String(source?.text_sha256 ?? "").toLowerCase()) {
    reasons.push("A cryptographically verified, source-digest-bound individual book approval is required.");
  }
  if (source && (source.trainingEligible === true || source.training_eligible === true || source.approved === true)) {
    reasons.push("A client-supplied approval flag cannot authorize training.");
  }
  const trainingEligible = reasons.length === 0;
  return {
    trainingEligible,
    corpusStatus: trainingEligible ? "APPROVED" : "STAGING_ONLY",
    approval: trainingEligible ? "APPROVED" : "NOT_APPROVED",
    use: trainingEligible ? "TRAINING" : "NOT_FOR_TRAINING",
    reasons,
  };
}
