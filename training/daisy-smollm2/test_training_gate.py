import unittest
from datetime import datetime, timezone
from pathlib import Path
from training_gate import block_reason, block_reason_for_gate, guarded_optimizer_step

OPEN = {
    "model_training_authorized_by_this_manifest": True,
    "training_pipeline_enabled": True,
    "signature": "owner-signature",
    "valid": True,
}
GATE = Path("sources/loc-english-grammar-source-collection/manifests/learning-engine-gate-2026-11-27.json")

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

    def test_real_gate_blocks_before_the_optimizer(self):
        calls = []
        reason = guarded_optimizer_step(lambda: block_reason_for_gate(GATE), lambda: calls.append("updated"))
        self.assertEqual(reason, "Trusted verification key is unavailable.")
        self.assertEqual(calls, [])

    def test_missing_gate_blocks_before_the_optimizer(self):
        calls = []
        reason = guarded_optimizer_step(lambda: block_reason_for_gate(Path("/tmp/missing-learning-gate.json")), lambda: calls.append("updated"))
        self.assertIn("missing", reason or "")
        self.assertEqual(calls, [])

if __name__ == "__main__":
    unittest.main()
