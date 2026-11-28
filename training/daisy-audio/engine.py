#!/usr/bin/env python3
"""Audio ingestion for the Full-Build learning pipeline.

AUDIO INGESTION is not source approval, learning evidence, training
authorization, or an optimizer step. This module never imports a trainer.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "solvex-daisy-audio-ingestion/v1"
MAX_BYTES = 32 * 1024 * 1024
MAX_DURATION_SECONDS = 30 * 60
MAX_PCM_BYTES = 16000 * 2 * MAX_DURATION_SECONDS
SAMPLE_RATE = 16000
FRAME_SAMPLES = 320  # 20 ms
SILENCE_RMS = 0.01
EXCLUDED_SOURCE_IDS = {"loc-english-grammar-six-books"}
EXCLUDED_PATH_PART = "loc-english-grammar-source-collection"
RECORDED_LICENSES = {"CC0-1.0", "PUBLIC_DOMAIN_US"}
CHECKPOINT = (
    Path(__file__).resolve().parents[2]
    / "src/readiness/artifacts/experimental-grammar-cycle-weights.json"
)
PRESERVED_DIGEST = "9a1d7520e6c8070aa4f2fe42346c6930c28cc3a604a01f7cc9508a568234d907"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def checkpoint_fingerprint(path: Path = CHECKPOINT) -> dict:
    if not path.is_file():
        return {"path": str(path), "present": False, "sha256": None, "preserved_weight_digest": PRESERVED_DIGEST}
    return {"path": str(path), "present": True, "sha256": sha256_file(path), "preserved_weight_digest": PRESERVED_DIGEST}


def detect_format(data: bytes) -> str | None:
    if len(data) >= 12 and data[0:4] == b"RIFF" and data[8:12] == b"WAVE":
        return "wav"
    if len(data) >= 4 and data[0:4] == b"fLaC":
        return "flac"
    if len(data) >= 4 and data[0:4] == b"OggS":
        return "ogg"
    if len(data) >= 3 and (data[0:3] == b"ID3" or (data[0] == 0xFF and data[1] & 0xE0 == 0xE0)):
        return "mp3"
    if len(data) >= 12 and data[4:8] == b"ftyp":
        brand = data[8:12]
        if brand in {b"M4A ", b"mp42", b"isom", b"mp41", b"dash", b"MSNV"}:
            return "m4a"
    return None


def _fail(code: str, reason: str, **extra) -> dict:
    item = {
        "status": "REJECTED",
        "failure": {"code": code, "reason": reason},
        "authorization": _closed_authorization("REJECTED"),
        "optimizer_invocations": 0,
    }
    item.update(extra)
    return item


def _closed_authorization(rights_state: str) -> dict:
    return {
        "rights_state": rights_state,
        "training_authorized": False,
        "training_eligible": False,
        "learning_evidence_status": "NOT_TRAINING_MATERIAL",
        "optimizer_invocations": 0,
    }


def _rights(record: dict) -> dict:
    license_name = str(record.get("license") or "").strip()
    evidence = str(record.get("license_evidence") or "").strip()
    restrictions = [str(item).lower() for item in record.get("restrictions") or []]
    url = str(record.get("source_url") or "")
    if record.get("source_id") in EXCLUDED_SOURCE_IDS:
        return _closed_authorization("QUARANTINED") | {"reason": "Excluded Library of Congress grammar collection."}
    if any(flag in " ".join(restrictions) for flag in ("noncommercial", "non-commercial", "no-derivatives", "share-alike", "conflicting")):
        return _closed_authorization("QUARANTINED") | {"reason": "Restrictions conflict with a clean training claim."}
    if not license_name or not evidence:
        reason = "A .edu or .gov address is not a license." if re.search(r"\.(edu|gov)(/|$)", url, re.I) else "License or license evidence is missing."
        return _closed_authorization("QUARANTINED") | {"reason": reason}
    if license_name not in RECORDED_LICENSES:
        return _closed_authorization("QUARANTINED") | {"reason": f"License {license_name} is not cleared for training."}
    state = _closed_authorization("RIGHTS_RECORDED_NOT_APPROVED")
    state["reason"] = "Rights were recorded. Recording rights is not training approval."
    return state


def _decoder_version() -> str:
    binary = shutil.which("ffmpeg")
    if not binary:
        return "MISSING"
    try:
        out = subprocess.run([binary, "-version"], check=False, capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.TimeoutExpired):
        return "UNAVAILABLE"
    return out.stdout.splitlines()[0].strip() if out.stdout else "UNAVAILABLE"


def _probe(path: Path) -> dict:
    binary = shutil.which("ffmpeg")
    if not binary:
        return {"ok": False, "code": "DECODER_MISSING", "reason": "ffmpeg is not installed."}
    try:
        out = subprocess.run(
            [binary, "-hide_banner", "-i", str(path), "-f", "null", "-"],
            check=False,
            capture_output=True,
            text=True,
            timeout=20,
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "code": "RESOURCE_LIMIT", "reason": "ffmpeg probe timed out."}
    text = (out.stderr or "").split("Stream mapping")[0]
    duration = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", text)
    audio = re.search(r"Stream #\d+:\d+.*Audio:\s*([^,\n]+),\s*(\d+)\s*Hz,\s*([^,\n]+)", text)
    if not duration or not audio:
        return {"ok": False, "code": "DECODE_FAILED", "reason": "ffmpeg could not read an audio stream."}
    hours, minutes, seconds = int(duration.group(1)), int(duration.group(2)), float(duration.group(3))
    total = hours * 3600 + minutes * 60 + seconds
    layout = audio.group(3).strip().lower()
    channels = 1 if "mono" in layout else 2 if "stereo" in layout else None
    channel_match = re.search(r"(\d+)\s+channels", layout)
    if channel_match:
        channels = int(channel_match.group(1))
    codec = audio.group(1).strip()
    bit_match = re.search(r"pcm_s(\d+)|s(\d+)", text)
    bit_depth = int(next(group for group in bit_match.groups() if group)) if bit_match else None
    return {
        "ok": True,
        "codec": codec,
        "sample_rate": int(audio.group(2)),
        "channels": channels,
        "duration_seconds": round(total, 6),
        "bit_depth": bit_depth,
    }


def _decode(path: Path, max_pcm_bytes: int) -> dict:
    binary = shutil.which("ffmpeg")
    if not binary:
        return {"ok": False, "code": "DECODER_MISSING", "reason": "ffmpeg is not installed."}
    try:
        out = subprocess.run(
            [
                binary, "-nostdin", "-hide_banner", "-v", "error",
                "-i", str(path),
                "-f", "s16le", "-ac", "1", "-ar", str(SAMPLE_RATE),
                "pipe:1",
            ],
            check=False,
            capture_output=True,
            timeout=30,
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "code": "RESOURCE_LIMIT", "reason": "ffmpeg decode timed out."}
    if out.returncode != 0 or not out.stdout:
        detail = (out.stderr or b"").decode("utf-8", "replace")[-300:]
        return {"ok": False, "code": "DECODE_FAILED", "reason": detail or "ffmpeg produced no PCM."}
    if len(out.stdout) > max_pcm_bytes:
        return {"ok": False, "code": "RESOURCE_LIMIT", "reason": "Decoded audio exceeds the PCM byte limit."}
    return {"ok": True, "pcm": out.stdout, "sha256": sha256_bytes(out.stdout)}


def _activity(pcm: bytes) -> dict:
    import array

    samples = array.array("h")
    usable = len(pcm) - (len(pcm) % 2)
    samples.frombytes(pcm[:usable])
    segments = []
    start = None
    for index in range(0, len(samples), FRAME_SAMPLES):
        frame = samples[index:index + FRAME_SAMPLES]
        if not frame:
            continue
        energy = sum(value * value for value in frame) / len(frame)
        rms = (energy ** 0.5) / 32768
        active = rms >= SILENCE_RMS
        at = index / SAMPLE_RATE
        if active and start is None:
            start = at
        if not active and start is not None:
            segments.append({"start": round(start, 3), "end": round(at, 3)})
            start = None
    if start is not None:
        segments.append({"start": round(start, 3), "end": round(len(samples) / SAMPLE_RATE, 3)})
    return {
        "method": "rms_vad_v1",
        "state": "ACTIVE" if segments else "SILENCE",
        "active_segments": segments,
        "speech_verified": False,
        "speech_claim": "UNVERIFIED" if segments else "NO_ENERGY",
        "reason": "Energy is not speech recognition. No words, speakers, or language were inferred.",
    }


def _excluded_path(path: Path) -> bool:
    return EXCLUDED_PATH_PART in path.resolve().parts or EXCLUDED_PATH_PART in str(path)


def ingest_file(path: Path, record: dict | None = None, *, limits: dict | None = None, seen: set[str] | None = None) -> dict:
    record = dict(record or {})
    limits = limits or {}
    max_bytes = int(limits.get("max_bytes", MAX_BYTES))
    max_duration = float(limits.get("max_duration_seconds", MAX_DURATION_SECONDS))
    max_pcm = int(limits.get("max_pcm_bytes", MAX_PCM_BYTES))
    record.pop("training_authorized", None)
    record.pop("training_eligible", None)
    record.pop("admit_to_training", None)
    if record.get("source_id") in EXCLUDED_SOURCE_IDS or _excluded_path(path):
        return _fail("EXCLUDED_SOURCE", "The six Library of Congress grammar books are outside this audio initiative.", source_id=record.get("source_id"))
    if any(str(message.get("role", "")).lower() in {"daisy", "assistant"} for message in record.get("teacher_messages") or []):
        return _fail("DAISY_OUTPUT_REJECTED", "A client cannot supply Daisy's reply.")
    try:
        data = path.read_bytes()
    except OSError as exc:
        return _fail("UNREADABLE", str(exc))
    if not data:
        return _fail("EMPTY", "The file is empty.")
    if len(data) > max_bytes:
        return _fail("RESOURCE_LIMIT", f"File is {len(data)} bytes; limit is {max_bytes}.")
    digest = sha256_bytes(data)
    expected = str(record.get("sha256") or "")
    if expected and expected.lower() != digest:
        return _fail("SOURCE_HASH_MISMATCH", "The recorded SHA-256 does not match the file bytes.", sha256=digest)
    kind = detect_format(data)
    if kind is None:
        return _fail("UNSUPPORTED_OR_CORRUPT", "The file signature is not WAV, MP3, OGG/Opus, FLAC, or M4A/AAC.", sha256=digest)
    suffix = path.suffix.lower().lstrip(".")
    suffix = {"opus": "ogg", "aac": "m4a", "wave": "wav"}.get(suffix, suffix)
    if suffix and suffix != kind:
        return _fail("EXTENSION_SIGNATURE_MISMATCH", f"Extension .{suffix} does not match signature {kind}.", sha256=digest, detected_format=kind)
    if seen is not None and digest in seen:
        return {
            "status": "DUPLICATE",
            "sha256": digest,
            "detected_format": kind,
            "failure": {"code": "DUPLICATE", "reason": "The same audio bytes were already ingested."},
            "authorization": _closed_authorization("QUARANTINED"),
            "optimizer_invocations": 0,
        }
    media = _probe(path)
    if not media.get("ok"):
        return _fail(media.get("code", "DECODE_FAILED"), media.get("reason", "Probe failed."), sha256=digest, detected_format=kind)
    if media["duration_seconds"] <= 0 or media["duration_seconds"] > max_duration:
        return _fail("RESOURCE_LIMIT", f"Duration {media['duration_seconds']}s is outside 0 to {max_duration}s.", sha256=digest)
    if media.get("channels") is not None and media["channels"] > 8:
        return _fail("SUSPICIOUS_STREAM", "More than 8 channels is rejected.", sha256=digest)
    decoded = _decode(path, max_pcm)
    if not decoded.get("ok"):
        return _fail(decoded.get("code", "DECODE_FAILED"), decoded.get("reason", "Decode failed."), sha256=digest, detected_format=kind)
    if seen is not None:
        seen.add(digest)
    rights = _rights(record)
    activity = _activity(decoded["pcm"])
    teacher = []
    for message in record.get("teacher_messages") or []:
        if message.get("role") == "teacher" and message.get("speaker") == "grok" and str(message.get("text") or "").strip():
            teacher.append({"speaker": "grok", "role": "teacher", "text": message["text"], "is_daisy_output": False})
    return {
        "status": rights["rights_state"],
        "sha256": digest,
        "detected_format": kind,
        "source": {
            "source_url": record.get("source_url"),
            "media_url": record.get("media_url"),
            "reference_transcript_url": record.get("reference_transcript_url"),
            "reference_transcript_status": (
                "PUBLISHER_PROVIDED_REFERENCE_NOT_ASR"
                if record.get("reference_transcript_url")
                else "NOT_PROVIDED"
            ),
            "publisher": record.get("publisher"),
            "creator": record.get("creator"),
            "license": record.get("license"),
            "license_evidence": record.get("license_evidence"),
            "restrictions": record.get("restrictions") or [],
            "acquired_at": datetime.now(timezone.utc).isoformat(),
            "source_id": record.get("source_id"),
        },
        "media": {
            "codec": media["codec"],
            "sample_rate": media["sample_rate"],
            "channels": media["channels"],
            "duration_seconds": media["duration_seconds"],
            "bit_depth": media["bit_depth"],
            "size_bytes": len(data),
            "decoder": _decoder_version(),
        },
        "processing": {"pcm_sha256": decoded["sha256"], "pcm_sample_rate": SAMPLE_RATE, "pcm_channels": 1},
        "activity": activity,
        "language": {"status": "BLOCKED_NO_LOCAL_LID", "language": None, "confidence": None},
        "transcription": {
            "status": "BLOCKED_NO_LOCAL_ASR",
            "text": None,
            "confidence": None,
            "word_timestamps": None,
            "reason": "No local speech-to-text engine is installed. Missing words were not invented.",
        },
        "diarization": {"status": "UNSUPPORTED", "speakers": [], "uncertainty": 1.0},
        "alignment": {"status": "UNSUPPORTED", "reason": "No forced aligner is installed."},
        "observed": {"audio_activity": activity["state"], "active_segments": activity["active_segments"]},
        "inferred": {
            "vocabulary": None,
            "grammar": None,
            "pronunciation": None,
            "rhythm": "NOT_MEASURED",
            "reason": "Observed energy is not a linguistic analysis.",
        },
        "teacher_messages": teacher,
        "daisy_first_party_inference": "BLOCKED",
        "daisy_exchange_count": 0,
        "authorization": rights,
        "failure": None,
        "optimizer_invocations": 0,
    }


def ingest_manifest(manifest: dict, *, root: Path | None = None, limits: dict | None = None) -> dict:
    before = checkpoint_fingerprint()
    seen: set[str] = set()
    items = []
    for raw in manifest.get("items") or []:
        path = Path(raw["path"])
        if root and not path.is_absolute():
            path = root / path
        items.append(ingest_file(path, raw, limits=limits, seen=seen))
    after = checkpoint_fingerprint()
    return {
        "schema": SCHEMA,
        "status": "STAGED_NOT_TRAINING",
        "training_started": False,
        "training_authorized": False,
        "optimizer_invocations": 0,
        "model_weights_changed": before != after,
        "checkpoint_before": before,
        "checkpoint_after": after,
        "daisy_first_party_inference": "BLOCKED",
        "daisy_exchange_count": 0,
        "grok_is_teacher_not_daisy": True,
        "items": items,
        "safety_note": "A decoded audio file is not an approved source and not a training run.",
    }


def main() -> int:
    import argparse
    import sys

    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    report = ingest_manifest(json.loads(args.manifest.read_text(encoding="utf-8")), root=args.manifest.parent)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if report["model_weights_changed"] or report["optimizer_invocations"] != 0:
        print("AUDIO_INGEST_BLOCKED: checkpoint or optimizer invariant failed", file=sys.stderr)
        return 1
    print(json.dumps({"status": report["status"], "items": len(report["items"]), "optimizer_invocations": 0}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
