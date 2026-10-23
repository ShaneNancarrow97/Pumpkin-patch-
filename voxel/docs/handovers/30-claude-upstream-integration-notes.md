# 30 — Claude upstream integration notes

Read alongside [Claude’s handover 27](27-claude-demand-tables-ambience-intro-maze-walk.md), [handover 28](28-claude-fresh-wanted-and-orders.md) and [the contractor’s first-person maze handover 29](29-first-person-maze.md).

## Inspected lead baseline

On 23 October 2026, published `voxel-reference` was `ac698dca2410091694c00b011eb7098ba7556d0d` (`Let neighbours send orders for batches of pumpkins`). It descends from the previous contractor delivery, `cc9dd6c31c5c4771fc313f86076866a4a2a05f7b`; those earlier contractor changes are already included. The first-person maze started against `cc9dd6c` and was then integrated onto this updated lead baseline in isolated branch `contractor/first-person-hollow-house` (runtime commit `3c10605`).

Claude’s intervening work includes fuller baskets and the market cart, 50-guest capacity, fresh/wanted pumpkin premiums, neighbours’ orders, furniture on tables and shelves, measured placement bounds, the selected-piece camera, the new-game introduction, drifting mist and lake lighting, three MIDI tracks, the moth courier, the southward farm extension, and fully visible lantern-walk routes to the maze and each guest’s place at Skyla’s counter.

Do not use the old-base HTML as the current game. It would omit the new `fresh`, `wanted`, `orders` and `introSeen` save fields. Since these are additive fields without a save-version change, preserving the newest model/restore/save code is necessary; a successful old-build load alone would not prove that it retains them.

## Integration boundaries

The new standalone ride modules and PNGs have no same-path upstream additions at this lead baseline. `foyer-view.js`, `ui/audio.js` and `ui/hollow-sheet.js` are unchanged upstream since `cc9dd6c`. The overlapping integration points are:

| File | Keep together |
| --- | --- |
| `build.mjs` | Both `ui/intro.css` and `ui/maze-ride.css` in the inline stylesheet list. |
| `src/main.js` | Intro creation, settings and skip flow; mist/lake defaults; order/wanted events and order sending; maze UI/audio/preferences and entry/return hooks. Expose both `intro` and `maze` in the QA API. Both overlays must own their keyboard input while active. |
| `src/scene.js` | Ambience, table-top picking, measured furniture placement, `keepInView`/`reach`/camera glide, plus maze scene selection and isolated input. Pointer/wheel code must retain both the maze exclusion and glide cancellation. |

The owner walkthrough reads restoration, tier and active prefab ownership, then freezes a transient route snapshot. It must not create a second ticket ledger or alter Claude’s autonomous visitor routing.

Preserve these lead contracts:

- Fresh/wanted premiums come only from change after filling the base-price basket. Keep the wanted wish purse restricted to that variety.
- Neighbour orders respect held baskets and send oldest pumpkins first. Keep the new save validation.
- Lower-yard positions use `DROP = 3` or derive from the layout constants. The back buildings remain in place.
- Maze guests use the visible `HOLLOW_LINK` and west lane; keep `counterPlace(spot)`/`hollowLinkFrom(place)` and route-version migration. Do not restore off-map transfer phases.
- Furniture riders keep their host-relative frame. Use measured bodies, `placementRange` and the selected-piece camera; do not return to whole-cell collision/clamping.
- Keep the fixed Boost slot, mist/lake preferences, intro state and the three added MIDI tracks.

## Integration review and remaining verification

Independent source review of `3c10605` against `ac698dc` found the overlapping contracts retained in `main.js`, `scene.js` and `build.mjs`: both stylesheets, intro flow/API and keyboard guard, mist/lake settings, order handlers/sending, ambience, table-top picking, camera reach/glide and the maze input exclusions. The existing rules/model remain upstream versions. The integrated build and ride checks are now recorded in handover 29 and the verification directory. The ordinary game smoke run is in progress.

Use an isolated review worktree based on the exact lead hash, preserving unpublished lead work. Build the downloadable HTML from the integrated source, then run the complete rule/art suite, ordinary smoke flow and maze QA. Any fresh-save browser harness must call `PumpkinVoxel.intro.skip()` before attempting world/menu input; Claude’s updated smoke script already does this.

Check round trips of the new save fields, ordinary pumpkin/order sales, table/shelf placement, the selected-piece camera, real foyer-door entry, free-tour ledger isolation, pause/replay/Exit, touch look and phone/Fold layouts. Software WebGL screenshots establish layout/rendering, not physical-device frame rate.

This note records inspected source and integration requirements. Final integrated commit, build hash, test results and download links belong in the delivery manifest and verification report; none are asserted here before those checks finish. The contractor does not push or replace `voxel-reference`.
