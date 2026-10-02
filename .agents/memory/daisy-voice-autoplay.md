---
name: dAIsy voice / browser autoplay
description: Why TTS playback silently failed and the gesture-unlock pattern that fixes it
---
**Rule:** Any Web Audio playback that starts after an async delay (TTS fetch takes seconds) must use an AudioContext created/resumed *synchronously inside the user-gesture handler*, not at playback time.
**Why:** OpenAI TTS synthesis took ~20s server-side; an AudioContext created at playback time was suspended by browser autoplay policy → 200 responses but zero sound. Classic silent failure: server logs look healthy.
**How to apply:** In DaisyFloat-style flows: unlockAudio() in every click/keydown handler (submit, mic, follow-up, replay), keep the ctx in a ref, resume() before start(), detach onended before superseding a source, and cap TTS text at a sentence boundary (~700 chars) to keep latency tolerable. Surface a "click then replay" error if ctx stays suspended.
