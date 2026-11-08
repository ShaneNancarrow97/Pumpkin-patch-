# Current game delivery — shared public exit

The village now uses the existing public road past Maisie’s site, including its eastern continuation after buying that land. The separate side arch and spur are removed. A small grounded road marker replaces the portal, and the endpoint remains reachable by walking, interacting or clicking. Food service stays separate from travel. See [the full shared plan and dependency notes](FARM-ENTRANCE.md).

The final standalone game is 58,259,782 bytes. SHA-256: `9314af490ecceb32d030b6ac57772927a15013790f910146ff27ccaf0d54ce17`.

## Verification

- Full game regression: **961/961 tests passed** on the shared-exit logic candidate (`d72d1d63`), [log](verification/shared-exit-node-tests.log).
- **24/24 exact-HTML browser checks** on that candidate cover base, kitchen-only and expanded meadow walking, real pointer approaches, live return frames, and cooking at Maisie’s counter. [Report and declared fixture scope](verification/shared-exit/README.md).
- A final visual delta moves four nearby crowns, reserves a narrow projected sightline in the procedural forest, and tightens full-crown boundary rejection. Hill floors remain rendered. **32/32 focused tests passed** on final source, including real generated forest meshes and retained ground: [log](verification/final-shared-exit-node-tests.log).
- **10/10 final exact-HTML browser checks passed** on `9314af49`, with normal desktop/base/expanded and portrait photos, real pointer approaches and live returns. [Final evidence](verification/shared-exit-final/README.md). The road and forest opening are clear; the small physical signpost deliberately remains subtle at management zoom.
- Both browser passes report zero page/shader errors and zero external asset requests. Draw-hold phases are functional checks; screenshots restore normal glow/shadows. Physical device, Bluetooth and FPS certification are separate.

Earlier 57/17/54 reports remain attached to the initial polish build, as documented in [the initial delivery receipt](DELIVERY.md); their hashes were not relabelled. The final visual pass was scoped to its geometry delta rather than repeating unrelated menus.

## Integration

Keep `content/village-gateway.js`, `main.js`, `player-control.js`, `scene.js`, `farm-village-gate.js`, `cooking-world.js`, the four authored canopy poses and `wilds.js` together. The shared exit plan controls the approach, click target, narrow walk corridor, continuation and framing. The real built continuation alone enters the ground footprint; extra sightline clearance never removes forest floor. Original guest route arrays, payment timers, economy, progression and save format 18 are retained.

Source remains isolated on `contractor/village-play-polish`. Claude’s working checkout and `voxel-reference` were not modified. The checked lead remained `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`. Review in a clean worktree; do not overwrite independently changed files. The game patch kit starts at `ff6b5803686c449b902d405037f8958d03e3e2d8`; public artifact metadata records the exact source commit and clean replay.

The HTML and ZIP are verified and published before the final Android rebuild. Android is a separate contractor addition under `voxel/android`, with its own source, native-only adapters, signing instructions and honest install/hardware-test scope.
