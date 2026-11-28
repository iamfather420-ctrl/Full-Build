import unittest
from datetime import datetime, timezone
from training_gate import block_reason

OPEN = {
    "model_training_authorized_by_this_manifest": True,
    "training_pipeline_enabled": True,
    "signature": "owner-signature",
    "valid": True,
}

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

    def test_complete_record_is_the_only_open_path(self):
        self.assertIsNone(block_reason(OPEN))

if __name__ == "__main__":
    unittest.main()
