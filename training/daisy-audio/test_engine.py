#!/usr/bin/env python3
"""Tests for fail-closed audio ingestion. No optimizer and no invented transcript."""
from __future__ import annotations

import array
import subprocess
import tempfile
import unittest
import wave
from pathlib import Path

from engine import PRESERVED_DIGEST, checkpoint_fingerprint, detect_format, ingest_file, ingest_manifest

FFMPEG = "ffmpeg"


def pcm(samples: list[int], rate: int = 16000) -> bytes:
    data = array.array("h", samples)
    return data.tobytes()


def write_wav(path: Path, samples: list[int], rate: int = 16000) -> None:
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        handle.writeframes(pcm(samples, rate))


def encode(source: Path, dest: Path, codec: list[str]) -> None:
    subprocess.run(
        [FFMPEG, "-y", "-hide_banner", "-v", "error", "-i", str(source), *codec, str(dest)],
        check=True,
        capture_output=True,
        timeout=20,
    )


class AudioIngestTests(unittest.TestCase):
    def setUp(self) -> None:
        self.before = checkpoint_fingerprint()
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.tone = [int(8000 * ((index // 20) % 2)) for index in range(16000)]

    def tearDown(self) -> None:
        self.tmp.cleanup()
        self.assertEqual(checkpoint_fingerprint(), self.before)
        self.assertEqual(self.before["preserved_weight_digest"], PRESERVED_DIGEST)

    def _wav(self, name: str = "tone.wav", samples: list[int] | None = None) -> Path:
        path = self.root / name
        write_wav(path, self.tone if samples is None else samples)
        return path

    def test_signatures_and_transcodes(self) -> None:
        wav = self._wav()
        specs = {
            "wav": [],
            "mp3": ["-c:a", "libmp3lame", "-f", "mp3"],
            "ogg": ["-c:a", "libvorbis", "-f", "ogg"],
            "opus": ["-c:a", "libopus", "-f", "ogg"],
            "flac": ["-c:a", "flac", "-f", "flac"],
            "m4a": ["-c:a", "aac", "-f", "mp4"],
        }
        expected = {"wav": "wav", "mp3": "mp3", "ogg": "ogg", "opus": "ogg", "flac": "flac", "m4a": "m4a"}
        for name, codec in specs.items():
            dest = wav if name == "wav" else self.root / f"tone.{name if name != 'opus' else 'opus'}"
            if name != "wav":
                encode(wav, dest, codec)
            kind = detect_format(dest.read_bytes())
            self.assertEqual(kind, expected[name], name)
            item = ingest_file(dest, {"license": "CC0-1.0", "license_evidence": "test fixture dedication"})
            self.assertIn(item["status"], {"RIGHTS_RECORDED_NOT_APPROVED", "QUARANTINED"})
            self.assertFalse(item["authorization"]["training_authorized"])
            self.assertEqual(item["optimizer_invocations"], 0)
            self.assertIsNone(item["transcription"]["text"])
            self.assertEqual(item["transcription"]["status"], "BLOCKED_NO_LOCAL_ASR")
            self.assertEqual(item["daisy_exchange_count"], 0)

    def test_false_signature_corrupt_truncated_empty_and_silent(self) -> None:
        mismatch = self.root / "fake.wav"
        mismatch.write_bytes(b"OggS" + b"\x00" * 64)
        self.assertEqual(ingest_file(mismatch)["failure"]["code"], "EXTENSION_SIGNATURE_MISMATCH")
        garbage = self.root / "noise.mp3"
        garbage.write_bytes(b"ID3" + b"\xff" * 32)
        self.assertIn(ingest_file(garbage)["failure"]["code"], {"DECODE_FAILED", "UNSUPPORTED_OR_CORRUPT"})
        truncated = self.root / "cut.wav"
        truncated.write_bytes(b"RIFF\x00\x00\x00\x00WAVE")
        self.assertEqual(ingest_file(truncated)["failure"]["code"], "DECODE_FAILED")
        empty = self.root / "empty.wav"
        empty.write_bytes(b"")
        self.assertEqual(ingest_file(empty)["failure"]["code"], "EMPTY")
        silent = self._wav("silent.wav", [0] * 16000)
        item = ingest_file(silent, {"license": "PUBLIC_DOMAIN_US", "license_evidence": "US federal work statement"})
        self.assertEqual(item["activity"]["state"], "SILENCE")
        self.assertFalse(item["activity"]["speech_verified"])
        self.assertIsNone(item["inferred"]["pronunciation"])

    def test_rights_duplicates_hash_and_training_lock(self) -> None:
        wav = self._wav()
        self.assertEqual(ingest_file(wav, {"source_url": "https://example.edu/a.wav"})["authorization"]["rights_state"], "QUARANTINED")
        self.assertEqual(ingest_file(wav)["authorization"]["rights_state"], "QUARANTINED")
        conflict = ingest_file(wav, {"license": "CC0-1.0", "license_evidence": "page", "restrictions": ["noncommercial"]})
        self.assertEqual(conflict["authorization"]["rights_state"], "QUARANTINED")
        self.assertFalse(ingest_file(wav, {"license": "CC0-1.0", "license_evidence": "page", "admit_to_training": True})["authorization"]["training_authorized"])
        digest = __import__("hashlib").sha256(wav.read_bytes()).hexdigest()
        changed = ingest_file(wav, {"sha256": "0" * 64, "license": "CC0-1.0", "license_evidence": "page"})
        self.assertEqual(changed["failure"]["code"], "SOURCE_HASH_MISMATCH")
        seen: set[str] = set()
        first = ingest_file(wav, {"license": "CC0-1.0", "license_evidence": "page"}, seen=seen)
        second = ingest_file(wav, {"license": "CC0-1.0", "license_evidence": "page"}, seen=seen)
        self.assertNotEqual(first["status"], "DUPLICATE")
        self.assertEqual(second["status"], "DUPLICATE")
        self.assertEqual(ingest_file(wav, {"source_id": "loc-english-grammar-six-books"})["failure"]["code"], "EXCLUDED_SOURCE")
        tiny = ingest_file(wav, limits={"max_bytes": 100})
        self.assertEqual(tiny["failure"]["code"], "RESOURCE_LIMIT")

    def test_manifest_does_not_train_or_invent_daisy(self) -> None:
        wav = self._wav()
        report = ingest_manifest({
            "items": [{
                "path": str(wav),
                "license": "CC0-1.0",
                "license_evidence": "fixture",
                "teacher_messages": [{"role": "teacher", "speaker": "grok", "text": "What did you hear?"}],
            }]
        })
        self.assertFalse(report["training_started"])
        self.assertEqual(report["optimizer_invocations"], 0)
        self.assertFalse(report["model_weights_changed"])
        self.assertEqual(report["daisy_first_party_inference"], "BLOCKED")
        self.assertEqual(report["daisy_exchange_count"], 0)
        self.assertEqual(report["items"][0]["teacher_messages"][0]["is_daisy_output"], False)
        self.assertIsNone(report["items"][0]["language"]["language"])
        self.assertEqual(report["items"][0]["diarization"]["speakers"], [])
        self.assertIsNone(report["items"][0]["transcription"]["word_timestamps"])
        blocked = ingest_manifest({"items": [{"path": str(wav), "teacher_messages": [{"role": "daisy", "text": "I understood."}]}]})
        self.assertEqual(blocked["items"][0]["failure"]["code"], "DAISY_OUTPUT_REJECTED")


    def test_voa_learning_english_rights_are_recorded_but_not_approved(self) -> None:
        wav = self._wav("voa-lesson1.wav")
        item = ingest_file(wav, {
            "source_id": "voa-learning-english-level1-lesson1",
            "source_url": "https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html",
            "publisher": "VOA Learning English",
            "creator": "Voice of America",
            "license": "PUBLIC_DOMAIN_US",
            "license_evidence": "https://learningenglish.voanews.com/p/6861.html",
            "restrictions": ["Exclude third-party agency material."],
        })
        self.assertEqual(item["status"], "RIGHTS_RECORDED_NOT_APPROVED")
        self.assertEqual(item["source"]["publisher"], "VOA Learning English")
        self.assertEqual(item["source"]["license_evidence"], "https://learningenglish.voanews.com/p/6861.html")
        self.assertFalse(item["authorization"]["training_authorized"])
        self.assertFalse(item["authorization"]["training_eligible"])
        self.assertEqual(item["optimizer_invocations"], 0)


if __name__ == "__main__":
    unittest.main()
