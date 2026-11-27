/** Observed from manifests/learning-engine-gate-2026-11-27.json. Not a training authorization. */
export const OBSERVED_LANGUAGE_GATE = {
  repository: "Solvex-Paradox-Box/loc-english-grammar-source-collection",
  manifest: "manifests/learning-engine-gate-2026-11-27.json",
  register: "manifests/source-candidate-register-2026-11-27.json",
  observedOn: "2026-11-27",
  modelTrainingAuthorizedByManifest: false,
  trainingPipelineEnabled: false,
  trainingCorpusGenerated: false,
  addedToTrainingInputs: 0,
  acquiredFromReview: 0,
  locBooksTrainingStatus: "not_approved",
  locBooksReview: "PENDING_REVIEW",
} as const;

export const AUTHORED_CORPUS_ID = "solvex-authored-instructional-seed-v1";

export interface AdmissionDecision {
  corpusId: string;
  admitted: false;
  state: "BLOCKED";
  documentsAdmitted: 0;
  reason: string;
}

export function admitCorpus(corpusId: string): AdmissionDecision | { corpusId: string; admitted: true; state: "AUTHORIZED"; documentsAdmitted: 0 } {
  if (corpusId === AUTHORED_CORPUS_ID) {
    return {
      corpusId,
      admitted: true,
      state: "AUTHORIZED",
      documentsAdmitted: 0,
    };
  }
  return {
    corpusId,
    admitted: false,
    state: "BLOCKED",
    documentsAdmitted: 0,
    reason: `${corpusId} is not an approved training corpus. The language-source manifest sets model_training_authorized_by_this_manifest=false, training_pipeline_enabled=false, and added_to_training_inputs=0.`,
  };
}

export function languageSourceAdmission(): AdmissionDecision {
  return {
    corpusId: "loc-english-grammar-source-collection",
    admitted: false,
    state: "BLOCKED",
    documentsAdmitted: 0,
    reason: "Source candidate only. LOC books remain PENDING_REVIEW and training_eligible is not granted. DiscoverEngineClient does not ingest this repository.",
  };
}
