# Village play polish — Claude contractor handover

This is an isolated contractor update on `contractor/village-play-polish`, based on the previous Village Journey handover `ff6b5803686c449b902d405037f8958d03e3e2d8`. Claude's working checkout and lead branch are untouched. The checked lead at the start of this update was `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`.

## What changes for the player

- The village opens in a closer third-person follow camera. Manual orbit stays under the player's control, and recenter eases behind the actual walking heading. Farm following uses the same smoothing helper; interiors retain their own framing.
- Returning from the village works through the Farm button, Circle/back, the contextual carriage action or walking through the carriage threshold. A controller interaction now ends its frame before a removed actor can be referenced. Travel releases held inputs before farm controls resume.
- The village map uses the world's actual district outlines, roads, plots and clearings. All five areas are visible. Selecting a locked pin brings its level/story requirements to the top of the panel. Future chapters remain explicitly locked; this patch does not pretend those districts are playable.
- Six illustrated village shortcuts remain easy to find. Options opens a compact navigation hub. The followed quest, journal and conversations have clearer priorities and readable cream text on plum surfaces.
- Nearby resources and quest pages gain soft ground rings. The owner has a quiet pool of warm light at their feet. Villagers have a thin painted-edge rim, without duplicate silhouettes or new scene lights.
- The Moth Tree crown dissolves when it obstructs the player or camera. The plaza's well, stall and noticeboard have more space around them, with aligned talking routes, hits, perches and quest-page placement. Nearby grass blades thin away on the GPU.
- Grass has a new finer repeat tile. Logs, rocks and herbs are slightly larger with more model detail. Existing resource IDs, cooldowns and seeded spawn-site pools are retained.
- Two or three existing visitor types stroll and pause on broad village lanes. They are cosmetic, bounded and transient; they neither consume farm visitor capacity nor create revenue or quest progress.
- Village music runs at 38% of the user's normal music level, without changing that preference, restarting the song or muting interaction sounds. Narration ducking still composes with this mix. Leaving restores the farm mix.
- A small reminder appears every ten minutes of an unpaused village visit and fades after 2.6 seconds. It waits behind menus, dialogue, tours and gathering, resets on leaving and never interrupts play.
- The home catalogue has 20 matching illustrated category icons. Village navigation has 12 custom icons. Controller legends use recreated vector DualSense symbols from the user's reference, with restrained face-button colours and amber active states.
- The stick cursor keeps its position after a menu rebuild or selection. A detached old button can no longer pull it towards the screen origin. Both vertical and horizontal catalogue scroll positions are retained.
- Build controls distinguish choosing a piece from positioning it, emphasise the real primary action and remove duplicate controller/touch instructions. The village's old header `Done` actually closed/cancelled editing; it is now labelled `Close`.
- Village travel now follows the existing northeast public exit road past Maisie’s site. The extra arch and spur have been removed. A small grounded waymark sits beside the road; the approach, click target and walk-through trigger follow the same state-aware exit when the eastern area opens. Narrow road access preserves the surrounding farm boundaries. See [the shared-exit notes](FARM-ENTRANCE.md).

## Controller quick reference

| Context | Control | Action |
| --- | --- | --- |
| Farm | R3 | Toggle zoom/pan mode |
| Farm camera mode | Left stick | Pan in all four directions |
| Farm camera mode | Right stick up/down | Zoom in/out |
| Farm camera mode | R3 or Circle | Finish; require neutral controls before walking resumes |
| Village | Left/right stick | Walk / look |
| Village | Cross | The highlighted nearby action |
| Village | R3 | Smoothly recenter behind the owner |
| Village | Square / Triangle | Map / People |
| Village | Options | Navigation hub |
| Village | D-pad Up | Expand/collapse followed quest, while no menu has input |
| Village keyboard | E / C / Q and R | Interact / recenter / turn camera |

## Dependency matrix

| Change | Dependencies to keep together | Integration concern |
| --- | --- | --- |
| Follow camera | `follow-camera.js`, scene/player adapters, village `follow` heading and sprite-facing selection | Manual camera-relative steering must not auto-orbit into a spiral. Preserve wrapped yaw, zoom and scene handoff. |
| Safe travel | Village interaction frame boundary, actor lifetime, main callbacks, play input boundary | Do not continue a controller frame after closing the village. Release button/axis ownership before the farm resumes. |
| Farm R3 mode | Scene camera API, play controls, input boundary, mode legend | Intercept R3 before the farm cursor. Preserve owner enabled/position state; keep interior/village R3 behaviour. |
| Spatial map | District/road/fixture content, actual rules, chapter renderer and district click binding | A level/story goal alone must not unlock an unimplemented district. Map pins use the same coordinates as the world. |
| Plaza and farm gateway | Models, ground recipe, collision, hits, routes, map, perches, story object location | Shared fixtures/layout exports are authoritative. The first letter page follows the relocated well. |
| Visibility and lighting | Village view calls, tree's private crown materials, grass GPU uniforms, proximity pool, sprite rim | No new lights or per-blade CPU updates. Reset crown/grass state on leaving, tours or indoor views. |
| Roamers | Pure lane routines, existing visitor factory, camera adapter and disposal | Maximum three; no saved customers or mutable gameplay RNG. Never dispose shared atlas geometry/textures. |
| Icons and catalogue | Generated atlases, metadata, pure markup, one browser installer, scroll memory | Retain text names and minimum 44px targets. Install each atlas once; do not embed image data per tile. |
| Controller symbols/build UI | `dualsense-icons.js`, global glyph adapter, village keycaps, final build stylesheet | Legends must describe actual bindings for the current phase; avoid duplicate zoom and overlapping bars. |
| Music and reminder | Separate village music multiplier, entry/leave callbacks, transient reminder clock | Preserve volume/shuffle/track preferences and save shape. Do not use the ride's scene-gain switch to mute village effects. |

## Save and integration notes

Save format stays at version 18. No new economy, progression or saved NPC fields are introduced. Ownership and found letter IDs remain valid. As with the previous village patch, an older decoration that overlaps a newly reserved fixed footprint may return to storage on restore; ownership is retained.

Inspect in a separate checkout:

```sh
git fetch origin contractor/village-play-polish
git worktree add ../review-village-play-polish origin/contractor/village-play-polish
```

Read the focused notes in this folder before merging shared files into independently changed lead code: [camera](CAMERA.md), [farm input](FARM-CAMERA-INPUT.md), [entrance](FARM-ENTRANCE.md), [world readability](WORLD-READABILITY.md), [map/dialogue](MAP-AND-DIALOGUE.md), and [cursor/catalogue](CURSOR-AND-HOME-ICONS.md).

## Verification and delivery

Run from `voxel/`: `npm test`, `node build.mjs --out /absolute/path/game.html`, and the exact-HTML browser runner `tools/village-play-polish-qa.mjs`. Some asset tests invoke Python; the execution profile must allow child processes. Reports distinguish fixture setup, real controller/touch actions, held drawing, screenshots and viewport emulation.

The current shared-exit build and its exact verification scope are recorded in [the latest delivery receipt](SHARED-EXIT-DELIVERY.md). Initial polish provenance remains in [the earlier receipt](DELIVERY.md). Browser viewport tests do not certify physical Z Fold, Bluetooth, TV or native Android performance. Android packaging is a separate final job after the HTML and ZIP have passed their checks.

## Android delivery

The offline Android host was built last from the checked shared-exit HTML. See [the Android contractor addendum](ANDROID-HANDOVER.md) and [source/rebuild guide](../../../android/README.md) for asset caching, native input, save transfer, signing and the unverified hardware-test scope. The Android code does not change browser game rules or artwork.

## Download files and patch order

[Complete downloads and Claude patch order](FINAL-DOWNLOADS.md) includes the checked HTML, ZIP, Android test build, five game patches and separate native addendum. All public file hashes were verified after pushing.
