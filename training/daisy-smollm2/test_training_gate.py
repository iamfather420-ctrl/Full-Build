import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from training_gate import (
    AuthorizationBlocked,
    block_reason,
    cryptographic_block,
    fresh_step_authorization,
    independent_binding,
    loc_books_review_block,
    install_trainer_step_boundary,
    seal_optimizer,
)
from train import bind_training_optimizer as bind_train
from train_text import bind_training_optimizer as bind_text

OPEN = {
    "model_training_authorized_by_this_manifest": True,
    "training_pipeline_enabled": True,
    "signature": "owner-signature",
    "valid": True,
}
ROOT = Path(__file__).resolve().parents[2]
GATE = ROOT / "sources/loc-english-grammar-source-collection/manifests/learning-engine-gate-2026-11-27.json"
DATASET = ROOT / "artifacts/training/loc-english/language-model-corpus.jsonl"


class CountingOptimizer:
    def __init__(self):
        self.inner_steps = 0

    def step(self):
        self.inner_steps += 1


class TrainingGateTest(unittest.TestCase):
    def test_current_gate_blocks(self):
        reason = block_reason({"model_training_authorized_by_this_manifest": False, "training_pipeline_enabled": False})
        self.assertIn("model_training_authorized_by_this_manifest", reason or "")

    def test_unsigned_expired_revoked_and_invalid_block(self):
        self.assertEqual(block_reason({**OPEN, "signature": " "}), "Authorization is unsigned.")
        self.assertEqual(block_reason({**OPEN, "expiresAt": "2020-01-01T00:00:00+00:00"}, datetime(2026, 11, 27, tzinfo=timezone.utc)), "Authorization is expired.")
        self.assertEqual(block_reason({**OPEN, "revokedAt": "2026-11-27T00:00:00+00:00"}), "Authorization is revoked.")
        self.assertEqual(block_reason({**OPEN, "valid": False}), "Authorization is invalid.")
        self.assertEqual(block_reason(None), "Invalid authorization record.")

    def test_a_nonempty_signature_is_not_authorization(self):
        self.assertIn("not cryptographic", block_reason(OPEN) or "")

    def test_expected_binding_is_not_taken_from_an_authorization_record(self):
        binding = independent_binding(DATASET)
        self.assertIsInstance(binding, dict)
        self.assertEqual(binding["documentId"], "loc-english-language-model-corpus")
        self.assertEqual(binding["tenant"], "iamfather420-ctrl/Full-Build")
        self.assertEqual(binding["sourceSha256"], hashlib.sha256(DATASET.read_bytes()).hexdigest())
        self.assertEqual(binding["sourceSha256"], "79a9c60a64357713b98c90f1bffc82066f0b48cb3cc2b9e155cdd6229845a6f7")

    def test_modified_dataset_does_not_match_the_manifest(self):
        with tempfile.TemporaryDirectory() as directory:
            altered = Path(directory) / "altered.jsonl"
            altered.write_bytes(DATASET.read_bytes() + b"\n")
            reason = independent_binding(altered)
            self.assertEqual(reason, "Dataset content hash does not match the manifest.")

    def _assert_zero_updates(self, bind, dataset, gate=GATE):
        optimizer = CountingOptimizer()
        bind(optimizer, dataset, gate)
        for _ in range(4):
            with self.assertRaises(AuthorizationBlocked):
                optimizer.step()
        self.assertEqual(optimizer.inner_steps, 0)

    def test_real_entry_points_count_zero_updates_for_blocked_authorization(self):
        for bind in (bind_train, bind_text):
            self._assert_zero_updates(bind, DATASET, GATE)

    def test_real_entry_points_count_zero_updates_for_missing_invalid_and_modified_data(self):
        missing_gate = Path("/tmp/missing-learning-gate.json")
        malformed_gate = Path("/tmp/malformed-learning-gate.json")
        malformed_gate.write_text("{", encoding="utf-8")
        with tempfile.TemporaryDirectory() as directory:
            altered = Path(directory) / "altered.jsonl"
            altered.write_bytes(DATASET.read_bytes() + b"\n")
            for bind in (bind_train, bind_text):
                self._assert_zero_updates(bind, DATASET, missing_gate)
                self._assert_zero_updates(bind, altered, GATE)
                self._assert_zero_updates(bind, DATASET, malformed_gate)
                self._assert_zero_updates(bind, Path("/tmp/dataset-does-not-exist.jsonl"), GATE)

    def test_trainer_step_boundary_checks_every_update(self):
        class Trainer:
            def __init__(self):
                self.optimizer = None

            def create_optimizer(self):
                self.optimizer = CountingOptimizer()

            def train(self):
                self.create_optimizer()
                self.optimizer.step()
                self.optimizer.step()

        calls = {"n": 0}

        def verify():
            calls["n"] += 1
            return "Authorization is expired." if calls["n"] == 1 else "Authorization is revoked."

        trainer = Trainer()
        install_trainer_step_boundary(trainer, verify)
        with self.assertRaises(AuthorizationBlocked):
            trainer.train()
        self.assertEqual(trainer.optimizer.inner_steps, 0)
        self.assertEqual(calls["n"], 1)
        with self.assertRaises(AuthorizationBlocked) as caught:
            trainer.optimizer.step()
        self.assertIn("revoked", str(caught.exception))
        self.assertEqual(trainer.optimizer.inner_steps, 0)

    def test_fresh_step_refuses_forged_gate_without_a_production_key(self):
        forged = Path("/tmp/forged-training-authorization.json")
        forged.write_text(
            json.dumps({
                "source_groups": [{
                    "source_id": "loc-english-grammar-six-books",
                    "training_status": "approved",
                    "rights_and_review_status": "APPROVED test fixture only",
                }],
                "authorization": {
                    "schema": "daisy-training-authorization/v1",
                    "documentId": "loc-english-language-model-corpus",
                    "sourceSha256": "79a9c60a64357713b98c90f1bffc82066f0b48cb3cc2b9e155cdd6229845a6f7",
                    "tenant": "iamfather420-ctrl/Full-Build",
                    "signature": "bm90LWEgc2lnbmF0dXJl",
                },
            }),
            encoding="utf-8",
        )
        reason = fresh_step_authorization(forged, DATASET)
        self.assertEqual(reason, "Trusted verification key is unavailable.")
        self._assert_zero_updates(bind_train, DATASET, forged)
        self._assert_zero_updates(bind_text, DATASET, forged)

    def test_loc_books_stay_not_approved(self):
        reason = fresh_step_authorization(GATE, DATASET)
        self.assertIn("not_approved", reason or "")
        self.assertIn("PENDING_REVIEW", reason or "")

    def test_loc_review_gate_fails_closed_when_missing_malformed_or_source_group_missing(self):
        missing = Path("/tmp/missing-loc-review-gate.json")
        self.assertIn("missing", loc_books_review_block(missing) or "")
        with tempfile.TemporaryDirectory() as directory:
            malformed = Path(directory) / "malformed.json"
            malformed.write_text("{", encoding="utf-8")
            self.assertIn("malformed", loc_books_review_block(malformed) or "")
            no_group = Path(directory) / "no-loc-group.json"
            no_group.write_text(json.dumps({"source_groups": []}), encoding="utf-8")
            self.assertIn("exactly one", loc_books_review_block(no_group) or "")
            duplicate = Path(directory) / "duplicate-loc-group.json"
            group = {"source_id": "loc-english-grammar-six-books", "training_status": "approved"}
            duplicate.write_text(json.dumps({"source_groups": [group, group]}), encoding="utf-8")
            self.assertIn("exactly one", loc_books_review_block(duplicate) or "")

    def test_both_trainers_seal_the_optimizer_before_train(self):
        for name in ("train.py", "train_text.py"):
            text = (Path(__file__).resolve().parent / name).read_text(encoding="utf-8")
            self.assertIn("install_trainer_step_boundary(", text)
            self.assertLess(text.index("install_trainer_step_boundary("), text.index("trainer.train("))
            self.assertIn("proprietary_from_scratch_daisy", text)
            self.assertIn("smollm2-supervised-finetune", text)

    def test_wrong_tenant_mismatched_hash_and_unapproved_source_make_zero_updates(self):
        document_id = "fixture-document"
        tenant = "iamfather420-ctrl/Full-Build"
        source_sha256 = "ab" * 32
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            trust = root / "trust"
            gate = root / "gate.json"
            self._write_fixture(trust, gate, document_id, source_sha256, tenant, "2027-12-01T00:00:00.000Z", "valid")
            cases = {
                "wrong-tenant": dict(source_sha256=source_sha256, document_id=document_id, tenant="unauthorized-actor", trust_dir=trust),
                "mismatched-hash": dict(source_sha256="cd" * 32, document_id=document_id, tenant=tenant, trust_dir=trust),
            }
            for name, kwargs in cases.items():
                optimizer = CountingOptimizer()
                seal_optimizer(optimizer, lambda kwargs=kwargs: cryptographic_block(gate, **kwargs))
                with self.assertRaises(AuthorizationBlocked):
                    optimizer.step()
                self.assertEqual(optimizer.inner_steps, 0, name)
        for bind in (bind_train, bind_text):
            optimizer = CountingOptimizer()
            bind(optimizer, DATASET, GATE)
            with self.assertRaises(AuthorizationBlocked) as caught:
                optimizer.step()
            self.assertIn("not_approved", str(caught.exception))
            self.assertEqual(optimizer.inner_steps, 0)

    def test_valid_signature_passes_and_bad_cases_stay_blocked(self):
        document_id = "fixture-document"
        tenant = "iamfather420-ctrl/Full-Build"
        source_sha256 = "ab" * 32
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            trust = root / "trust"
            empty = root / "empty-trust"
            empty.mkdir()
            gate = root / "gate.json"
            self._write_fixture(trust, gate, document_id, source_sha256, tenant, "2027-12-01T00:00:00.000Z", "valid")
            self.assertIsNone(cryptographic_block(gate, source_sha256=source_sha256, document_id=document_id, tenant=tenant, trust_dir=trust))
            self.assertEqual(
                cryptographic_block(gate, source_sha256=source_sha256, document_id=document_id, tenant=tenant, trust_dir=empty),
                "Trusted verification key is unavailable.",
            )
            invalid = root / "invalid.json"
            self._write_fixture(trust, invalid, document_id, source_sha256, tenant, "2027-12-01T00:00:00.000Z", "invalid")
            self.assertIn("forged", cryptographic_block(invalid, source_sha256=source_sha256, document_id=document_id, tenant=tenant, trust_dir=trust) or "")
            expired = root / "expired.json"
            self._write_fixture(trust, expired, document_id, source_sha256, tenant, "2020-01-01T00:00:00.000Z", "valid")
            self.assertIn("expired", cryptographic_block(expired, source_sha256=source_sha256, document_id=document_id, tenant=tenant, trust_dir=trust) or "")
            revoked = root / "revoked.json"
            self._write_fixture(trust, revoked, document_id, source_sha256, tenant, "2027-12-01T00:00:00.000Z", "revoked")
            self.assertIn("revoked", cryptographic_block(revoked, source_sha256=source_sha256, document_id=document_id, tenant=tenant, trust_dir=trust) or "")
            altered = root / "altered.jsonl"
            altered.write_bytes(DATASET.read_bytes() + b"\n")
            optimizer = CountingOptimizer()
            seal_optimizer(optimizer, lambda: independent_binding(altered))
            with self.assertRaises(AuthorizationBlocked):
                optimizer.step()
            self.assertEqual(optimizer.inner_steps, 0)
            production_keys = list((ROOT / "training/daisy-smollm2/trust-root").glob("*.spki.pem"))
            self.assertEqual(production_keys, [])

    def _write_fixture(self, trust: Path, gate: Path, document_id: str, source_sha256: str, tenant: str, expires: str, mode: str) -> None:
        script = r"""
import { mkdirSync, writeFileSync } from "node:fs";
import { generateKeyPairSync, sign } from "node:crypto";
import { canonicalBytes } from process.env.VERIFIER;
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const record = {
  schema: "daisy-training-authorization/v1",
  documentId: process.env.DOC,
  sourceSha256: process.env.SHA,
  scope: "optimizer-update",
  approver: "test-approver",
  keyId: "test-root",
  tenant: process.env.TENANT,
  issuedAt: "2026-11-27T00:00:00.000Z",
  expiresAt: process.env.EXPIRES,
};
record.signature = sign(null, canonicalBytes(record), privateKey).toString("base64");
if (process.env.MODE === "invalid") record.signature = Buffer.alloc(64).toString("base64");
const payload = { authorization: record, revocations: [] };
if (process.env.MODE === "revoked") {
  const revocation = {
    schema: "daisy-training-revocation/v1",
    documentId: record.documentId,
    sourceSha256: record.sourceSha256,
    keyId: "test-root",
    tenant: record.tenant,
    revokedAt: "2026-11-27T12:00:00.000Z",
  };
  revocation.signature = sign(null, canonicalBytes(revocation), privateKey).toString("base64");
  payload.revocations = [revocation];
}
mkdirSync(process.env.TRUST, { recursive: true });
writeFileSync(`${process.env.TRUST}/test-root.spki.pem`, publicKey.export({ type: "spki", format: "pem" }));
writeFileSync(process.env.GATE, JSON.stringify(payload));
"""
        # The import line above is rewritten below; this string is a template.
        verifier = Path(__file__).resolve().parent / "verify-authorization.mjs"
        script = script.replace("import { canonicalBytes } from process.env.VERIFIER;", f"import {{ canonicalBytes }} from {json.dumps(verifier.as_uri())};")
        env = os.environ.copy()
        env.update({"DOC": document_id, "SHA": source_sha256, "TENANT": tenant, "EXPIRES": expires, "MODE": mode, "TRUST": str(trust), "GATE": str(gate)})
        completed = subprocess.run(["node", "--input-type=module", "--eval", script], env=env, capture_output=True, text=True)
        if completed.returncode != 0:
            raise AssertionError(completed.stderr or completed.stdout)


if __name__ == "__main__":
    unittest.main()
