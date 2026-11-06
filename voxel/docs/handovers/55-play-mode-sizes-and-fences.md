# 55 — Play mode: one size whichever way they face, and the farm's fences

Branch: `voxel-reference` (lead), following handover 54. The player said Shane and Natalie changed size in play mode when they turned sideways, and asked for a review of play mode.

## Sizes (`player-view-size.js`, `player-view-scale.js`, `tools/measure_player_views.py`)

- **What was wrong:**
  - The turnarounds (the side walks, the backs, and the plant, harvest and water poses) already matched the front sprites' height to within 2%.
  - They looked bigger because their heads are bigger. The side art's head is about 1.33 times as wide as the front's for Natalie and 1.38 for Shane. The back is about 1.15 times bulkier.
  - Taking control of Shane also made him 4% bigger, because the controlled front sprite used `frontScale`.
- **The fix:**
  - `tools/measure_player_views.py` measures each view's head width (the top fifth of the standing figure, in world units) against the front sprite's. It scales the view by (front ÷ view)^0.35, kept between 0.85 and 1. A full match would shrink the body to a child's.
  - It writes `src/player-view-scale.js` (`PLAYER_VIEW_SCALE`). Re-run it after re-baking any owner sheet or adding an outfit.
  - `playerViewScale(id, view)` sizes every view against the front sprite at its own size, so taking control no longer changes it.
- **On screen** (heights on the farm at zoom 4.5; the parlour scales the same):

  | | Front | Side | Back |
  | --- | --- | --- | --- |
  | Natalie | 171 px | 149 px | 159–163 px |
  | Shane | 171 px | 152 px | 168–173 px |

  The side views stand shorter, which brings their heads closer to the front sprite's. A full match would need side art redrawn with the front's proportions.

## Standing still

- **Standing frames:** the side and back walks have no standing frame. Standing side-on now shows the walk's passing frame (`standSide`). Standing with the back turned shows the frame with the feet closest together (`standBack`). Before, both froze mid-stride.
- **Turning to the camera:**
  - After 0.8 s standing still (`SETTLE_SECONDS`), the owner turns to face the camera and shows the front sprite's idle.
  - Pushing against a fence doesn't count as standing still, and nor does time while the game is paused.
- **No mirroring:** the front sprites never mirror. They're portraits of real people, with tattoos and a holster on set sides. They face the viewer nearly straight on, so turning from either profile reads as a turn to the camera.
- **Home poses (`player-home-poses.js`):** they now set the whole scale, not only `scale.x`. A turnaround drawn just before a pose used to leave its height behind and squash the pose art.

## Where the owner can walk (`farmPlayerGeometry` in `player-control.js`)

- **Was:**
  - The bounds ran 0.75 past the front fence, so the owner could walk out through it.
  - With the truck bought, the bounds widened to x 53.2 at every depth, so the owner could walk through the east fence into the wilds.
- **Now:**
  - Feet stop half a unit inside every fence, however far the field has grown.
  - East of the yard's fence line (x 39), the only open ground is the truck's paving (to z 7.5) and, once bought, the meadow inside its fences.
  - The meadow's front fence runs on to the lane. A grown field passes that stretch, so it is a block of its own.
  - The owner walks round the cocoa kiosk. `cocoaKioskWidth` is now in `content/festival-meadow.js`, shared with the kiosk's builder.
- Every target stays in reach: plots, the shop, home, the truck and litter.

## Checked and left alone

- With nothing in reach, the action button is disabled, so no action starts on nothing.
- Inside the house, the room's bounds and the furniture's measured bodies still apply.
- Lamp posts and the arch's pillars still aren't blocks. They're thin and stand at the edges.

## QA hooks

- `scene.player.figure()` returns the controlled figure's group, for measuring how it is drawn.

## Checks

- **`npm test`:** 556 pass.
  - **New file:** `player-views.test.mjs` checks every outfit has factors in range and valid standing frames.
  - **Added to `player-navigation.test.mjs`:** fences, paving, the meadow and the kiosk.
  - **Added to `player-feel.test.mjs`:** turning to the camera, pausing, and pushing into a fence.
- **Smoke:** 52 pass.

## For Codex next

- **Side art:** redrawing the side turnarounds with the front sprites' proportions would let `PLAYER_VIEW_SCALE` go back to 1, for a full match.
- **Idles:** two or three breathing frames for the side and back views would let the owner stand side-on without turning to the camera.
