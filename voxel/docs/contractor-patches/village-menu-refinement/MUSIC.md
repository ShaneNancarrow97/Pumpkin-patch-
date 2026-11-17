# Five supplied songs — contractor handover

The offline music catalogue now has 31 songs. The existing Settings song selector, Next song and shuffle bag all read `MUSIC_TRACKS`, so they include these additions without another interface or playback system.

| Song | Credit | Catalogue ID | Duration | Notes |
| --- | --- | --- | --- | --- |
| Dancing in the Moonlight | Your supplied MIDI | `dancing-in-the-moonlight` | 186.7 s | 3,381 |
| Bitter Sweet Symphony | The Verve | `bitter-sweet-symphony` | 256.8 s | 6,295 |
| Duality | Slipknot | `duality` | 258.1 s | 8,394 |
| Paint It, Black | The Rolling Stones | `paint-it-black` | 222.5 s | 7,479 |
| Fireflies | Owl City | `fireflies` | 266.7 s | 1,671 |

The artist for Dancing in the Moonlight is left unspecified: the upload contains instrument names but no artist credit. Bitter Sweet Symphony explicitly identifies The Verve in its embedded track metadata. The other credits follow the supplied song names and established song attribution.

All five files are copied byte for byte into `assets/music/`, with stable filenames matching their catalogue IDs. Their original names, byte counts, SHA-256 hashes, parsed note counts, timing and MIDI header/tempo data are appended to `assets/music/supplied-catalogue-additions.json`. This adds 230,310 source bytes. No arrangement is rewritten, shortened, looped or converted to recorded audio.

## Dependencies and integration

| Change | Dependencies | Preserve |
| --- | --- | --- |
| Five `.mid` imports and appended entries in `src/ui/music-tracks.js` | Existing binary MIDI loader, `decodeMidi`, Settings catalogue selector | Existing IDs and saved track selections; no main/index/build changes |
| Original MIDI assets and source manifest | Existing `tools/audit-music-catalogue.mjs` | Exact supplied bytes, note timings, tempo and percussion/program channels |
| Selection and shuffle | Existing `audio.js` and `music-queue.js` consume the full catalogue | User volume/mute/repeat preferences, village attenuation, narration ducking and 64-voice cap |
| Focused tests | Actual source MIDI, existing fake Web Audio harness | No runtime dependency, save schema or economy change |

The complete catalogue contains 976,496 MIDI bytes. The five additions peak at 11–24 source notes at once, below the existing synthesiser's 64-voice limit. Fireflies has a high MIDI tick resolution (15,360 ticks per quarter); the current parser handles it without a special case.

## Verification

From `voxel/`, run:

```sh
node tools/audit-music-catalogue.mjs
node --test test/midi.test.mjs test/audio-player.test.mjs
```

The catalogue audit checks all 31 original sources against the bundled entries and verifies finite, nonempty note timing. The MIDI tests inspect each new upload's actual tempo/tick data. The audio harness selects every new ID, checks its duration and saved-volume behaviour, and covers a complete shuffle round. Final HTML, browser and Android delivery checks belong to the parent integration pass.
