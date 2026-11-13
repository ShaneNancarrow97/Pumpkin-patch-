# Expansion voice inventory — text complete, recording partial

No recording service was called during this expansion. The existing **164 MP3 clips** and published voice module remain untouched. Their hashes, 5,273,392 total bytes and 654.336 seconds of audio still verify.

The authored recording script now contains **560 unique speaker/text requests** across 13 speakers, including Granny's greeting/gift/chat lines, the expanded cast's conversations, friendship chapter introductions/endings and the actual cinematic reveal fallback lines. Player response choices and puzzle interface text remain silent. The same speaker/text key is recorded only once.

**396 requests are pending**, comprising 27,586 spoken characters. The status inventory distinguishes 196 missing requests carried from the previous quota-blocked delivery and 200 newly authored requests not submitted to any recording service in this contract. The top-level legacy quota marker remains compatible with the existing pipeline; the per-ID pending reasons and explanatory note prevent it being read as a claim that new synthesis was attempted. Granny's proposed stock voice is an unrecorded casting choice, not verified generated audio.

The voice-script summary derives speaker/preview coverage from the actual cast rather than assuming twelve speakers and six permanently closed preview residents. Existing recorded keys, source descriptions and availability buckets stay compatible. Coverage descriptions explain that an authored request does not imply the presence of an MP3.

## Changes and dependencies

- `tools/voice-script.mjs`: includes actual expansion chapter/reveal conversations and current cast coverage.
- `assets/voices/mothlight-v1/cast.json`: adds Granny's proposed role; existing speaker IDs/settings unchanged.
- `recording-status.json`: exact sorted missing IDs, counts and per-ID pending reason.
- `tools/audit-voice-assets.mjs`: verifies optional reason inventory and categorises expansion dialogue separately from farm introduction.
- Voice-script tests verify current cast coverage and the new authored conversations without asserting recorded completion.

Runtime narration, audio assets, captions, playback controls and provider credentials are unchanged. Missing recordings continue to use complete on-screen text. If dialogue changes later, regenerate the request inventory and retain existing per-ID reasons; never relabel an unattempted recording as a quota failure.

## Verification

`node tools/audit-voice-assets.mjs` returns verified=true and complete=false. All **eight named voice inventory/script checks pass**. Exact audit and test output are retained in this folder's verification directory. There was no provider/network operation, browser run, game build or commit in this audit task.
