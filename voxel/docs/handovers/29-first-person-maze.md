# 29 — First-person Hollow House walkthrough

For Claude. This delivery is on `contractor/first-person-hollow-house`, based on published lead `ac698dca2410091694c00b011eb7098ba7556d0d`. Runtime integration is `3c10605`, with darker atmosphere/close scares in `0dd25ce`; the manifest pins the exact packaged source commit and artifact hashes. The integrated ride and final atmosphere checks are complete. The implementation follows [the written plan](../plans/first-person-horror-maze.md) and preserves [Claude’s intervening work](30-claude-upstream-integration-notes.md). Earlier checks of the old `cc9dd6c` build do not certify the integrated HTML.

## Player flow and progression

A purchased, restored Hollow House gains an **Experience** action. The actual maze doorway inside the foyer opens the same briefing. Derelict/restoring houses reject entry; a restored but closed attraction permits a free owner preview. Start is a gesture, with separate maze sound, volume and gentle-motion controls.

The camera follows a continuous rail at 1.65-unit eye height; dragging adjusts bounded yaw/pitch without pointer lock. The farm HUD and editing/navigation surfaces are hidden. Exit returns immediately to the foyer. Escape pauses movement and closes the briefing/result; Pause freezes the walkthrough and its audio. Hiding the tab pauses it, and returning requires explicit Resume. Completion offers Replay or Return, with a factual recap and no reward. Replay creates a new clock and cue ids from the same snapshot; reopening takes a fresh progression snapshot.

| Foyer tier | Added chamber | Total tour |
| --- | --- | --- |
| 1 | Forgotten passage | 28 seconds |
| 2 | Cobweb cellar | 35 seconds |
| 3 | Séance parlour, including the haunted girl | 42 seconds |
| 4 | Storm laboratory | 49 seconds |
| 5 | Velvet crypt | 56 seconds |

Every chamber has a baseline encounter. Only the existing five authoritative `MAZE_PREFABS` that are **owned, active and tier-valid** add their extra encounters/effects. Changing an installation affects the next new entry. Cues are deterministic, at least five seconds apart, with anticipation/reveal/retreat staging and no strobe. The refined version uses dense short-range fog, very low global illumination and sparse warm amber/cool blue, teal and violet light pools. Actors lunge from their recesses towards the rail, reaching roughly 1–2.6 units from the viewer at the authored reveal, then retreat before the camera passes. Gentle motion defaults from `prefers-reduced-motion`, removes head bob and reduces actor movement.

## Architecture and compatibility

- `content/maze-ride.js` defines chamber bounds, a rounded orthogonal rail and actor/cue content. `rules/maze-ride.js` builds a frozen snapshot, validates availability, advances a finite run, pauses and emits each encounter/completion once. Rail sampling uses arc distance, so curves retain a consistent travel speed.
- `maze-ride-world.js` builds sealed native voxel rooms, wide connected corridors and physical actor recesses. `maze-ride-view.js` owns the dedicated perspective scene, rail camera, bounded look, actor envelopes, fog and fixed light pool. `scene.js` renders it through the existing renderer/composer and disables ordinary world picking while inside; it adds no second canvas or WebGL context.
- `maze-ride-actors.js` and `maze-ride-actor-meta.js` load generated art with transparent cutouts, shared pose scales and ground anchors. `assets/maze-scare-actors.png` contains the ghoul/clown/scarecrow/wraith in a 4×2 lurking/reveal sheet; `assets/maze-haunted-girl.png` adds a 2×1 two-pose sheet for tier 3. Actors stand in the world and emerge from recesses. The UI uses `assets/maze-ride-icons.png`.
- `ui/maze-ride-ui.js` and `ui/maze-ride.css` provide the briefing, edge controls, pause/result states, keyboard/visibility handling and mobile safe areas. `ui/maze-audio.js` synthesises bounded offline ambience and cues through gain/compression. Start unlocks audio; pause, mute, visibility loss, restart and Exit clear active voices. Muted cues are consumed rather than queued for later. Farm music is ducked during the experience and restored on leaving.
- `main.js`, foyer doorway picking and attraction menus connect entry/return. `build.mjs` embeds the additional art and stylesheet in the offline HTML. `window.PumpkinVoxel.maze` exposes `open/start/pause/restart/close/advance`, config and status for QA.

The owner tour creates no visitor, ticket, queue place, occupancy or purse, and awards no currency/XP. The existing simulation remains the only ledger, with its original 28-second abstract NPC maze visit. The farm continues in the background under its existing pause rules; pausing the tour does not pause the farm. Run state is transient. Sound/volume/gentle settings use the existing preferences store, not farm save fields, so this increment needs no save-schema bump or migration. The root 2D game is outside this increment.

## Review this increment

Use a clean review checkout at the exact base, leaving unpublished lead changes in their own checkout. The package contains one incremental binary patch:

```sh
git worktree add ../pumpkin-maze-review -b review/first-person-maze ac698dca2410091694c00b011eb7098ba7556d0d
cd ../pumpkin-maze-review
git apply --check /path/to/first-person-maze-from-ac698dc.patch
git apply /path/to/first-person-maze-from-ac698dc.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-maze-review.html
node voxel/tools/qa-maze-ride.mjs /tmp/pumpkin-maze-review.html /tmp/maze-ride-review
```

The patch must include binary PNG changes (`git diff --binary` when preparing it). The package manifest is authoritative for source and hashes. This new base already includes all earlier contractor parts. Do not apply an older contractor patch to it or merge the artifact branch into source. If Claude already changed overlapping modules, review/apply in isolation and integrate the resulting changes rather than replacing their working tree.

The integrated build retains Claude’s freshness/wanted premiums, neighbour orders, furniture riders and measured placement, selected-piece camera, introduction, new MIDI tracks, mist/lake lighting and fully visible lantern-walk visitor routes. Do not use the old-base preview as the latest game: its older model/save code omits these additive fields. Fresh-save browser QA must skip the introduction via `PumpkinVoxel.intro.skip()` before world input.

Pure tests cover all five tiers and 32 installation combinations, gating, snapshots, clear rails, pause/invalid/large deltas, cue idempotency, replay, completion and ledger/save isolation. World/art/audio tests cover their own native geometry, pose and voice lifecycle contracts; the view test also bounds peak camera-to-actor distance and portrait framing. `tools/qa-maze-ride.mjs` is the browser verification entry point for actual doorway entry, progression, touch look, audio/isolation, replay/Exit, desktop, 390×844 portrait, 844×390 landscape and 874×787 Fold layouts. Run software-WebGL jobs sequentially; emulation is not a physical-device frame-rate claim.

## Delivery verification

All 49 Node test files pass on the final darker runtime. The integrated core flow passes 71 browser checks, followed by 31 final focused checks on the darker build with Sharp, DPR 2, bloom, shadows and FXAA. These cover actual doorway entry, ticket/save isolation, live farm independence, modal focus and mobile layouts. The final reveal screenshot is held at cue +1.35 seconds with the pause shade hidden for deterministic art inspection; its metadata records that intervention. Peak actor distance and portrait framing also have native view tests.

HTML SHA-256: `ee06c643160dc1bd1b0eda9ac654d9a3f892f158e72282d19952b57ff3d63352`. A clean patch application on the exact lead base rebuilds an identical HTML. Reports and screenshots live in `docs/contractor-patches/haunted-house-estate/verification/first-person-maze/`, with build stages labelled. The full core flow predates the final visual atmosphere pass; the final focused report and Node suite verify that pass. The ordinary game smoke also passes all 48 desktop/phone checks, with no page errors. The completed run uses the existing SMOKE_LITE profile and omits optional screenshots; the high-resolution maze image is verified separately.

The downloads-only branch is `contractor/shocktober-download-2026-10-21`; it contains the HTML, HTML ZIP, contractor patch ZIP and separate furnishing-art ZIP. The manifest inside the patch ZIP pins source/base and checksums. Do not merge the artifact branch into source.

This is a guided attraction, with no free-walking physics, combat, VR or layout editor. Existing paid attraction management and foyer decoration remain available outside the tour. Cooking and the twenty-level roadmap remain separate work.
