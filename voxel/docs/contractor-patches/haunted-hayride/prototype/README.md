# Native voxel tractor and hay wagon — contractor prototype

This is an inspectable **native voxel model**, separate from the live game. No unlock, tickets, route, economy or save code is installed by it. The parent [hayride handover](../../../handovers/32-haunted-hayride-roadmap.md) owns the proposed attraction.

`convoy.js` supplies `convoyGeometry()` (plain box data) and `buildHayrideConvoy(THREE, Voxels)`, using the existing game's batching class. It has a pine-green tractor, burgundy hubs, brass grille, pumpkin bonnet badge, open canopy and driver's seat, bent chimney, small amber lamps and a walnut wagon with straw benches. Geometry is sealed boxes viewed from all sides, not a painted plane. Each wheel is its own batch and rolls about its axle. The rear gate pivots; the two boarding steps disappear while riding. No point lights are allocated.

## Coordinates and assembly

- Units match the game: Y up, local forward **−Z**. Tractor origin is the rear axle's ground projection. Tractor envelope is approximately 2.7 wide × 4.2 long × 3.22 high, including canopy and bumper.
- Wagon origin is its chassis centre on the ground; approximately 2.94 wide × 4.1 long, plus drawbar/front, deployed rear steps and open gate (overall local Z −2.96…3.18). Its maximum hardware height is 2.05. This is a prototype scale, to compare to the current visitor sprite height before integration.
- Tractor hitch `[0,.65,.88]` mates with wagon hitch `[0,.65,−2.92]`; straight wagon offset is **+3.8 Z**. Tractor and wagon must each be sampled/oriented along the route; never rotate a long rigid convoy around a bend. The later route solver must keep the hitch aligned and reserve a swept envelope, including corner cutting.
- Four inward-facing passenger seat anchors live in `CONVOY.seats`; rear opening is 1.1 units wide. Guests board from the **back**, not through a side rail. Seat Y=1.20 is the straw cushion surface: adjust sprite feet/pelvis to a seated pose rather than standing them on it.
- `setBoarding(true)` swings the gate outwards and shows two rear steps. Call it only while stationary at a protected platform. `setRollDistance(distance)` is a visual wheel helper; it cannot dispatch or charge a guest.
- `CONVOY.rearCamera` is a **wagon-local** suggested eye point; add the wagon world transform. It is an interior ride-along seat, not an aerial rear camera. A later experience needs bounded look, narrow visibility, scene cues, pause/Exit and gentle motion. The preview's Ride seat button demonstrates framing only.

## Inspect

[Download the standalone preview ZIP](https://github.com/ShaneNancarrow97/Pumpkin-patch-/raw/refs/heads/contractor/hayride-design-downloads-2026-10-23/Hollow-Hayride-Tractor-Preview.zip), extract it and open the HTML. This is the vehicle inspection demo, not a playable hayride. The downloads-only branch must not be merged into source.

```sh
node voxel/docs/contractor-patches/haunted-hayride/prototype/check.mjs
node voxel/docs/contractor-patches/haunted-hayride/prototype/build-preview.mjs --out /tmp/hayride-convoy.html
```

The build accepts `--deps /absolute/path/to/node_modules` when inspecting from a worktree without its own dependencies. The HTML is standalone/offline and has rear/front/side/seat views, touch orbit, gate and wheel controls. It does not read localStorage or the game state. The prototype uses one instanced batch per independently moving part (plus small glow batches); choose final LOD/draw-call treatment when integrating the attraction. Keep already-visible tractor and wagon batches cached between frames.

The later runtime should register this model alongside existing world assets after lead review, then implement real boarding, passengers, drawbar articulation, vehicle collision and the full woodland circuit. This delivery does not claim those systems are playable.

Call `convoy.dispose()` if removing the model permanently. It frees its materials and instance buffers but preserves the native `Voxels` class's shared box geometry, which other live models still use.

## Validation

`check.mjs` passes: **1,129 positive finite boxes, 12 named moving/body parts, eight axle-centred wheels, four seat anchors and six emissive glass boxes**. It verifies hierarchy, hitch alignment and assembled bounds, including the open gate. Actual tractor bounds: X ±1.335, Y 0…3.22, Z −3.18…0.94. Actual wagon bounds with open gate/steps: X ±1.43, Y .04…2.05, Z −2.94…3.14.

The standalone preview renders on desktop and portrait phone with no page errors; gate/step toggling, all wheel rotations and 44px mobile controls pass. The rear, front and seated-view screenshots plus `verification/checks.json` record the preview, not full-attraction acceptance. The preview renders 14 draw calls including the display ground. Software WebGL does not establish physical-device frame rate.
