# Final five-song catalogue delta

Exact delivered HTML SHA-256: `e5858bc666dbf4f8160e5d964249044eddfe2e70dc7bc1d0cc9bbfd175c7c4e0` (58,911,354 bytes).

**14/14 browser checks passed**, with zero page/shader errors and zero external requests. Chromium and the loopback server closed normally. The unchanged HTML bytes were served offline; this music-only addition does not repeat unrelated game/UI workflows or normal screenshots.

Actual Settings controls verified all five new titles in the 31-track chooser. Each selection ran the native WebAudio context, parsed finite positive playback duration and scheduled within the existing 64-voice cap. Native select typeahead found Fireflies. The actual Next song buttons traversed one complete shuffled round with all 31 unique tracks, including all five additions, and avoided a repeat across the next-round boundary. Shuffle off selected the next song in order and wrapped to the first track. Actual Music mute stopped scheduling.

The separate [catalogue audit](catalogue-audit.json) passes all 31 original embedded MIDI sources, their hashes, positive notes and finite timings: 976,496 MIDI bytes. New source counts are:

| Song | Notes | Playback seconds | Peak source voices |
| --- | ---: | ---: | ---: |
| Dancing in the Moonlight | 3,381 | 186.665 | 12 |
| Bitter Sweet Symphony | 6,295 | 256.819 | 24 |
| Duality | 8,394 | 258.107 | 14 |
| Paint It, Black | 7,479 | 222.516 | 17 |
| Fireflies | 1,671 | 266.670 | 11 |

The native browser status supplies playback duration/context/voice counts; note counts come from the same-source audit, not an invented browser diagnostic. The master music volume was set to zero through the real volume control, so this verifies decoding/scheduling rather than subjective sound quality. Other fixture preferences keep normal rendering options, while expensive draws are held for logic checks.

The [startup attempt](../music-final-e5858bc6-startup-attempt/ATTEMPT.md) is retained with the QA callback flag error before any music actions. Its browser closed and the corrected harness explicitly passes both startup flags. No game fix was required.

The approved [normal TV UI photo](../final-38895eb4/09-tv-resource-legend.png) belongs to exact UI hash 38895EB4. The final E5858BC6 bytes add only the track registry and five MIDI uploads; the earlier photo is retained with its honest appearance/hash scope. Earlier gameplay, controller and presenter results keep their own hashes in the verification index. Physical hardware, Bluetooth, audible fidelity and FPS are not certified by this browser fixture.
