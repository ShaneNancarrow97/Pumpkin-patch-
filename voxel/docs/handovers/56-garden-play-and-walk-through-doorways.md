# 56 — Play mode: the garden, and walking through doorways

Branch: `voxel-reference` (lead), following handover 55. The player asked for play mode to visit the garden, and for Shane and Natalie to walk through doorways into the next room with no button press, blurring as they pass.

## Ways through (`play-ways.js`, new; no renderer)

- **What a way is:** a strip just inside a doorway where the owner's feet stop, the direction they must be walking to go through, and where they come out on the other side, facing on. `playWays(state, place)` lists them, for `"farm"`, `"estate"` (the garden) or `"room:<id>"`.
- **The ways:**

  | From | Way | To |
  | --- | --- | --- |
  | Farm | The hedge arch in the back fence (`HEDGE_ARCH`, now in `content/farm-layout.js`) | Just inside the garden gate, heading up the path |
  | Garden | The front door | The front of the parlour, heading in |
  | Garden | The gate | The farm, just through the arch |
  | Parlour, kitchen | The doorway between them | The other room's doorway |
  | Parlour, kitchen | The open front of the room | The garden, on the doorstep |
  | Parlour, bedroom, attic | Stairs and ladders | The foot or top of the matching stair in the other room |

- **The bedroom's landing:** at house level 3 the ladder to the attic stands on the stairs' landing. Walking right at the landing row climbs the ladder; walking into the stairwell's side lower down goes downstairs. At lower levels the landing leads down.
- **Upstairs rooms:** they have no way out but the stairs. Their "Leave the house" button still works and lands on the garden doorstep (`leaveHouse`).
- **Firing:** `wayThrough(ways, feet, heading, armed)` fires when the feet are in a strip and the stick points into the way (more than 60° off misses).
- **Arriving:** an owner who arrives inside a strip has that way shut until they step out of it, so nothing fires twice. Every arrival lands outside the strips of the place it reaches anyway (`play-ways.test.mjs`).

## Passing through (`player-control.js`, `main.js`, `ui/place-veil.js`)

- **Who decides:** `createPlayerControl` takes `onWay(way)`. When a way fires, `main.js`'s `passThrough` takes it, unless a sheet, the intro or a celebration is open, or a pass is already running.
- **While passing:** the owner holds still (`passing`). `ui/place-veil.js` adds `.place-veil` to the canvas, which blurs it 14px and dims it over 0.22 s (`play-controls.css`). The place changes behind the blur, two frames render, and the blur clears over 0.32 s. The controls and the HUD stay sharp. With reduced motion it only dims.
- **Arriving:** `arrive(spot)` stands the owner where the way comes out, heading on, and snaps the camera to them. It always runs, even if the place couldn't change, so the owner is never left frozen.
- **Buttons:** the action button still works at every way: the farm's "Go home", the rooms' "Go through" and "Leave", and the garden's two new prompts. They take the same way, with the same blur, through `hold(way)`.

## The garden in play mode (`garden-play.js`, new; `house-estate-view.js`)

- **The figure:** the garden is its own scene, so `createGardenPlay` builds the played owner's sprite there with the same `character()` the rooms use.
  - It rebuilds when the outfit changes or `refreshLooks` runs.
  - It faces the garden's perspective camera each frame, with the farm's lean and its stretch for the camera's pitch.
  - Switching character swaps the figure in place.
- **Walk limits (`gardenGeometry`):** inside the fence, round the house (plinth included), its kitchen wing from level 2, the porch posts, the gate's open leaves and every placed piece of decor. The rose arch is two posts, so the owner can walk under it. The house sizes are shared as `ESTATE_HOUSE_SIZES` and `ESTATE_KITCHEN_WING` in `content/house-estate.js`.
- **Camera (`estateView.play`):** follows the owner, keeping whatever angle the right stick (or a drag) gives it. It starts behind them at the farm's 36° pitch, 15 units back, and can come in to 8. C recentres it.
- **Prompts:** "Go inside" at the door and "Back to the farm" at the gate.
- **The decorating bar is hidden in play mode,** like the farm's dock.

## Found on the way: helping hands never rested

- **The bug:** `scene.player` was `{ ...player }`, and a spread copies a getter's value once, so `scene.player.enabled` was always `false`. As a result `state.handsOn` never turned on, and helping hands kept working while you played.
- **The fix:** the wrapper now has live `enabled` and `passing` getters. In the build, taking control now sets `handsOn`.

## Checks

- **`npm test`:** 564 pass.
  - **New file:** `play-ways.test.mjs`. It checks every way at every house level and two garden sizes: it lands on open ground outside the strips it reaches, its strip is where walking feet stop, and walking into it goes through. It also covers arming, the bedroom's landing, the farm, garden and house joining up both ways, the garden's walk limits and its prompts.
  - **Added to `player-feel.test.mjs`:** the arch fires once, the owner holds still while passing, and the way stays shut until they step out of it.
- **In the build:** one walk with the stick only: the farm, through the arch to the garden, up the path and in at the door, across to the kitchen and back, up to the bedroom and down, out of the parlour's front, and through the gate to the farm. Each pass blurred and cleared, with no page errors.
- **Smoke:** 52 pass.

## For Codex next

- **Garden prompts:** benches and the fire bowl could take the rooms' "Sit" pose.
- **The other owner:** they could wait in the garden by the porch while you play.
- **The shop:** play mode doesn't reach it yet; its door could become a way like the others.
