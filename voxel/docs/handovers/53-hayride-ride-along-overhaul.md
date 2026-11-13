# 53 — Hayride ride-along overhaul: motion, air and scenes

Branch: `voxel-reference` (lead), following handover 52. The player asked for a visual and dynamic overhaul of the ride-along.

## Motion (`hayride-view.js`)

- **The track:**
  - The rider feels ruts (two sine bands), plus a jolt over a root every `RUT_GAP` (13.3 units).
  - `buildRideLand` lays a root across the lane at the same spacing, so you see each one as you feel it.
- **Bends:** the wagon leans into them. Roll follows the heading's rate of turn, smoothed and capped at about 3.4°.
- **Eyes:** the rider's gaze wanders slightly. A deliberate look or the scene director overrides it.
- **Scares:** each encounter cue sets a decaying shake and a seven-degree field-of-view punch-in.
- **Gentle mode:** turns all of this off. The view tests (boarding position, director framing, gentle forward view) still pass.
- **Camera position:** `HAYRIDE_VEHICLE.rearCamera` is now `[0, 2.72, 1.75]`, standing at the back rail. Before, the benches and side rails filled the lower half of the screen and hid the lane and anything low beside it. The look target is 0.6 lower and 9 ahead.

## Air (`hayride-atmosphere.js`, new; four draw calls)

- **Contents:**
  - 150 leaves, an InstancedMesh lit by the lamps;
  - 64 mist puffs, Points with a soft canvas texture, low on the ground;
  - 12 will-o'-wisps, additive Points kept off the lane by a `clear(x, z)` test;
  - 5 bats: rigs with two-part flapping wings, drawn as a brood.
- **Placement:** everything is anchored in the world and wraps round the camera, so it streams past.
- **Gentle mode:** leaves fall slower and the bats leave.
- **In Node:** with no `document`, the mist has no texture.

## The lane

- **Lane cells:** quarter tiles, with two wheel ruts (puddles here and there), a raised grassy crown, edges and leaves.
- **Wood floor:** half tiles with scattered leaves.
- **Roots:** one every `RUT_GAP`.

## Scenes (`hayride-sets.js`, new)

`buildRoadsideSet(id, v, group, r)` builds `scarecrows`, `bride`, `pursuit` and `bus` in their set frame (x along the lane, +z towards it). `makeScenicSet` uses it for those four; the graveyard and thicket keep the old builders. Static dressing goes into the scene's voxels. Actors are jointed rigs: each actor's `animate(ctx)` is called every frame, and each scene's brood is added to the ride root, in world space.

- **Scarecrow patch:**
  - **Dressing:** tilled furrows, two ragged rows of dry corn, a split-rail fence with a rail down, crows with red eyes, pumpkins among vines (some carved and lit), and a bonfire in a stone ring.
  - **Actors:** four scarecrows with tattered coats, rope belts and straw hands. Three have carved jack-o'-lantern heads in witch hats, and one a stitched sack. The heads turn to track the rider (`turning-scarecrows`).
- **The bride's manor:**
  - **Dressing:** a two-storey board-sided house with a stone foundation and a spired tower with a round window. It has violet and candlelit arched windows, a loose shutter, a door ajar with cold light, and a porch on columns. Outside are spear-tipped iron railings with an open gate, dead roses, a bare tree, a cross and headstones.
  - **Actors:** the painted bride stays in the doorway. A skeletal groom in a tailcoat and top hat, lantern in hand, walks out through the gate (`bride-procession`).
- **Spectral pursuit:**
  - **Dressing:** crooked crosses, a ruined arch, glowing ectoplasm, and two investigators with lit packs and their beams. There is also a toppled equipment cart.
  - **Actors:** a hooded wraith with a peaked hood, burning eyes, a tattered hem and reaching arms. It leaves the clearing and races alongside and ahead of the wagon (`spectral-burst`).
- **Prison bus:**
  - **Dressing:** a grimy grey bus with rust and hazard stripes, nose-first in a tree. It has barred windows with arms through them and eyes behind, a wheel off, one headlight still burning, a red beacon, the door burst open with its chain snapped, and broken glass.
  - **Actors:** three zombies in orange jumpsuits shamble out towards the rail, arms out (`bus-breakout`).
- **Lane clearance:** everything static stays clear of the corridor. The zombies' reach brings their hands near the wagon's side, deliberately.

## Checks

- `npm test`: 539 pass. New tests cover each detailed set's actors, dressing and animation, and the cave's lane clearance, which now ignores ground clutter and roots.
- Smoke: 52 pass.
- **A full ride:** completes in normal and gentle mode with all five cues.
- **Cost:** the ride scene has 118 drawables (was 109) and about 107k boxes (was 87k).
- `tools/qa-hayride.mjs`:
  - It times out at its third step, waiting for `[data-attraction="hayride"]`.
  - It does the same against the merge commit `2636e3b`, so it is stale against the merged game, not broken by this work.
  - Its launcher also defaults to `/usr/bin/chromium`; pass `CHROMIUM_PATH`.

## For Codex next

- Give the graveyard and thicket the same treatment in `hayride-sets.js`.
- Possible next steps:
  - a bump sound on the roots;
  - steam from the bus's bonnet as particles in `hayride-atmosphere.js`;
  - a short slow creep into each scene. This would need the run's progress-to-time mapping, and the view tests that pin it, to change together.
