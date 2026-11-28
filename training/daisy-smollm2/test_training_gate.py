import hashlib
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from training_gate import (
    AuthorizationBlocked,
    block_reason,
    fresh_step_authorization,
    independent_binding,
    install_trainer_step_boundary,
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
            '{"authorization":{"schema":"daisy-training-authorization/v1","documentId":"loc-english-language-model-corpus",'
            '"sourceSha256":"79a9c60a64357713b98c90f1bffc82066f0b48cb3cc2b9e155cdd6229845a6f7","tenant":"iamfather420-ctrl/Full-Build",'
            '"signature":"bm90LWEgc2lnbmF0dXJl"}}',
            encoding="utf-8",
        )
        reason = fresh_step_authorization(forged, DATASET)
        self.assertEqual(reason, "Trusted verification key is unavailable.")
        self._assert_zero_updates(bind_train, DATASET, forged)
        self._assert_zero_updates(bind_text, DATASET, forged)


if __name__ == "__main__":
    unittest.main()
