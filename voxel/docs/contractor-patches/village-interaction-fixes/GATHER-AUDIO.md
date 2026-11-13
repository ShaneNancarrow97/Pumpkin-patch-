# Material-specific village gathering sounds

`src/ui/village-gather-audio.js` provides short gathering effects through the existing shared audio context, noise buffer and dynamics limiter. It creates no audio context, asset, dependency, timer or game-state mutation of its own. `src/ui/audio.js` exposes the bridge as `audio.gather(event)`.

## Event contract

```js
audio.gather({ id: node.id, material: node.material, job: jobNumber, phase: "start" });
audio.gather({ id: node.id, material: node.material, job: jobNumber, phase: "strike" });
audio.gather({ id: node.id, material: node.material, job: jobNumber, phase: "complete" });
// On interruption, rejected completion, travel or cancellation:
audio.gather({ id: node.id, material: node.material, job: jobNumber, phase: "cancel" });
```

The village caller emits `start` only after accepting gathering, `strike` at real tool contacts, `complete` after an actual successful gather and `cancel` when interrupted. Use a monotonic job number so a delayed cancellation or contact cannot affect later work at the same node. There are at most three audible contacts per accepted job. A completion is accepted once. Unknown materials, unsupported phases, stale work and contacts without accepted work remain silent.

Do not emit cancellation immediately before a successful completion: cancellation intentionally clears the active audio job. A cancellation without an `id` stops all gathering effects. The helper returns true only when it accepts a playable effect; presentation never determines whether gathering succeeds.

## Sound direction

| Material group | Character |
| --- | --- |
| Logs, hardwood | Low wooden thud, a brief chip and dry splinters. |
| Stone, iron, clay, moonstone, star amber | Restrained pick clink and short grit. |
| Fibre, herbs, moth silk, emberbloom | Small pluck and leaf rustle. |
| Cursed spores / Blackroot / `blight:*` | Damp root pull, low wet movement and a short spore rustle. |

The score is deterministic, with a small fixed pitch variation per node. Starts are quiet preparation sounds, not premature impact sounds. Every source lasts less than 0.3 seconds. Gathering does not play the generic interface ding.

## Audio and lifecycle boundaries

- Effects reuse the existing limiter directly. They bypass the music-volume gain so music can be off or at zero while enabled gathering SFX still play.
- The existing MIDI master gain, music selection, shuffle, scene/narration mix and queue behaviour are unchanged.
- `prefs.sound` and the existing first-gesture policy remain authoritative. No context opens from gathering simulation or settings alone.
- Sound mute through `audio.sync()`, document visibility loss, scene gain below one, village departure, cancellation or a new job stop old gathering sources immediately.
- Unmuting, returning to the page or restoring the scene mix does not replay interrupted contacts or completions. Fresh accepted work must start again.
- At most eight gathering sources are active. Finished and stopped sources disconnect their source, filter and gain nodes. Existing audio test doubles without a filter `Q` property remain supported.
- `audio.status.gathering` exposes `{voices, limit, job, strikes}` for diagnostics. Its `job` is a node ID, and no status is saved.

The shared synth currently unlocks on an actual pointer or keyboard gesture. Normal controller play after tapping Start works. A browser opened and operated solely by Gamepad may require a trusted tap/key before WebAudio is permitted; a synthetic gathering event is deliberately not treated as that permission.

## Dependency matrix

| Surface | Responsibility |
| --- | --- |
| `village-game.js` | Accept/reject work and emit start, contact, completion and cancellation events. |
| `main.js` | Forward the existing `onGatherSound` hook to `audio.gather`. Parent owns this integration. |
| `village-gather-audio.js` | Pure profiles plus bounded effect lifecycle; no resource rewards or progress. |
| `audio.js` | Reuse its context/noise/limiter, preserve trusted unlock and preferences, stop effects on existing lifecycle boundaries. |
| Saves, economy, resource cooldowns | Unchanged. |

## Validation

Eighteen actual named tests pass:

```sh
node --test --test-isolation=none test/village-gather-audio.test.mjs \
  test/audio-player.test.mjs test/maze-audio.test.mjs
```

Seven new tests cover distinct deterministic short profiles, accepted contacts/completion and stale jobs, the eight-source physical ceiling with real scheduled-stop doubles, natural node cleanup, filter compatibility, music-off playback through one context/limiter/noise buffer, mute/hidden/scene stop boundaries and unchanged MIDI gain/shuffle/narration state. Existing music, maze and ride audio regressions pass. `git diff --check` passes.

No browser, build, main/village entry-point, art, rules, save, commit or push changes were made by this audio subtask. Parent integration owns the live controller/contact timing and listening checks.
