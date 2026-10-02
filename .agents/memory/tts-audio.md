---
name: TTS audio format gotcha
description: Why browser audio playback failed and the correct TTS pattern
---
`textToSpeechStream` from the openai-ai-server integration lib yields **base64-encoded PCM16 text chunks**, NOT binary audio. Piping them raw to the browser (whatever the Content-Type claims) produces an undecodable body — `decodeAudioData` fails and voice appears "broken".
**Rule:** for browser playback use non-streaming `textToSpeech(text, voice, "wav")` which returns a complete RIFF WAV buffer; serve it with `Content-Type: audio/wav`. Streaming buys nothing anyway because the client awaits the full arrayBuffer before decoding.
**Why:** user reported "audio don't work" in the published app; endpoint was returning 112KB of base64 text with audio/mpeg header.
