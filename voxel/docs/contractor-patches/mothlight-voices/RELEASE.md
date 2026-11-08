# Recording delivery and verification

## Source

- Branch: `contractor/mothlight-voices`.
- Asset/tool commit: `05f52f6`.
- Runtime/UI commit: `13d2f92`.
- Prerequisite: `b530974` from `contractor/village-design-and-cast`; underlying lead base `604fe23`.
- The lead branch was checked again during this work and still pointed to `604fe23`. No lead files or unpublished work were reset.

## Audio coverage

164 recordings, 9,992 synthesis characters, 654.336 seconds and 5,273,392 bytes of MP3 audio. Both introductions are complete: eight farm title/dialogue clips and eleven Mothlight tour cues. Elowen has 104 and Rowan has 41 existing greeting/chat/gift clips.

168 authored clips remain (11,258 characters), including quest dialogue and the remaining cast. ElevenLabs stopped with `quota_exceeded` at the available 10,000-credit quota. The remainder is explicitly listed in the recording status and audit receipt. Unrecorded dialogue remains text-only; playback availability never gates progress. No additional generation or billing change was attempted after the quota response.

The first preferred professional voice rejected the test request with HTTP 402. A stock British voice succeeded and is the Natalie voice in the delivered cast. Shane also uses a stock British voice; no private cloned voice was used.

## Checks completed

- Original full Node run: 133 test files passed. The newly added asset integrity test and final focused eight-file run also passed, covering 134 distinct test files in total.
- Offline recording tool: 14 tests passed, including dry run, cache validation, partial publication, bounded generation, quota failures, uncertain-request recovery, priority order and coverage refresh.
- Asset audit: every packaged clip's speaker/text, cast/settings, file size, MP3 header and SHA-256 matched. Partial coverage is verified and explicitly marked incomplete.
- Full offline HTML built; credential scan passed across 555 source, metadata and build files.
- Narration browser journey: 95 checks passed, eight screenshots, no page/console errors or external requests. Native MP3 decoding/playing events were observed in Chromium.
- Desktop, phone, Fold-sized and landscape intro layouts met 44px targets and had no horizontal overflow. Screenshots were reviewed.

The browser suite used a declared staged quest to verify multi-speaker text fallback; it did not claim to unlock unfinished village progression. Save compatibility tests load retained older fixtures. Physical Safari/Z Fold/controller hardware and human listening to every performance were not available. Direct `file:` navigation in this managed Chromium was blocked by its administrator policy; the identical self-contained file was tested over loopback HTTP instead.

## Downloads

Immutable build commit: `b58ecdd3d0673eafd88e464e31051bc228889baa` on `contractor/mothlight-voices-html`.

- [Full game ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/b58ecdd3d0673eafd88e464e31051bc228889baa/Pumpkin-Patch-Voiced-Mothlight.zip)
- [Full game HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/b58ecdd3d0673eafd88e464e31051bc228889baa/Pumpkin-Patch-Voiced-Mothlight.html)
- [Optional unsaved village explorer](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/b58ecdd3d0673eafd88e464e31051bc228889baa/Mothlight-Voiced-Explorer.html)

Game HTML: 48,374,845 bytes; SHA-256 `a921d3fda5332a3a2957ea8accfd6491b6d83d4341684475dc86d812318c9fa3`.
Game ZIP: 34,804,574 bytes; SHA-256 `1de208fbdba4539dc6f7ea50c36ff4380193d8a4177b9dce0f29e911136da151`.

Extract the ZIP and open its HTML. Existing players should export their farm from Settings before switching downloaded files, then import that save into this build. Narration is entirely local; no key belongs in a game build.
