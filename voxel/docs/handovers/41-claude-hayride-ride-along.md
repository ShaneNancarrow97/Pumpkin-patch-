# 41 — Claude: a longer, better-lit hayride ride-along with screams and woodland sounds

For Codex. Follows 40. Base your next branch on the head of `voxel-reference`.

The owner asked for better lighting on the tractor ride-along, screams, a longer track and eerie woodland sounds. All four are in. The paying guests' side of the hayride is unchanged, apart from one rules fix.

## A longer track

- **The route** (`content/hayride-layout.js`) is a loop round the edge of a bigger wood: out north, across to the far west, down the west side and back along the south.
  - It is about 187 units long, up from 104.5.
  - Its bends wander outwards, so the middle stays one deep wood. No two stretches of lane come within 11 units of each other.
  - `HAYRIDE_RIDE_BOUNDS` grows to x −76…−8, z −20…42.
  - The five sets sit at 0.1, 0.28, 0.46, 0.64 and 0.8 of the loop, each facing the open middle.
- **The owner's ride-along takes 150 seconds** (`HAYRIDE_PROPERTY.rideAlongSeconds`, up from 90). The briefing says "About 2½ minutes".
- **Paying guests' circuits stay 90 seconds** (`circuitSeconds`). A longer guest circuit holds each rider's visitor slot longer. In `tools/simulate-hayride.mjs`, that cut retail by up to 16% and turned up to ten guests away from the queue. With guests at 90 seconds, the simulator's numbers are identical to before. The farm never shows a wagon's speed in the woods, so the two can differ.
- **Timings near a set are in units of lane, not shares of the loop.** `hayrideSpan(units)` converts. `hayrideScarePose`, the camera's turn towards each set and the set props' movement all use it, so the scares keep their pace on any route length.

## Lighting (`hayride-world.js`, `hayride-view.js`)

- **Moonlight and a thinner fog.** The sky light is 1.0 and the moon 1.25 (were 0.22 and 0.28). The fog is a lighter blue at 0.052 (was 0.085), so trees read as shapes and the far wood fades out.
- **The tractor's headlamp** now sits at the tractor's front whichever way it faces; before, it was always placed to the north. It is brighter and wider.
- **A lantern hangs over the wagon** and flickers a little.
- **Lanterns along the lane** stand every 12.5 units on alternate sides, clear of the sets and the station (`land.lanterns`). Four pooled lights follow the lanterns from 10 units behind to 36 ahead and fade in at the far edge. Every fifth lantern gutters.
- **Each set has its own light** as you near it, from 18 units out until just past it: bonfire orange for the scarecrows, sickly green for the spiders, cold moonlight for the bride, violet for the spectre and red for the bus (`SET_LIGHT`). The focus light that turns the camera to a set takes the same colour.
- **The ride scene has a fixed set of lights:** seven point lights, the headlamp, the moon, the lightning and the sky. A test checks the count never changes, so no shader recompiles mid-ride.

## A bigger wood that costs no more

- **The forest is built in 16-unit squares** (`chunkedVoxels` in `voxels.js`), and so is the ride's ground. Each square is its own pair of meshes, so the renderer skips the squares out of view.
- **The ride camera's far plane is 48** (was 120). The fog hides everything beyond about 40 units.
- **Trees stand only within 14 units of the lane.** The forest is 66,000 boxes in 30 squares (was 32,000 in one), and only the nearby squares are drawn.
- **Eyes in the dark:** pairs of glowing eyes, yellow, red or green, stand back among the trees every few stretches.

## Sound (`ui/hayride-audio.js`, `ui/scare-voices.js`)

- **The maze's screams are shared.** `ui/scare-voices.js` now holds `SCREAMS`, `screamRig`, `stingerRig`, `envelope` and `distortionCurve`. `maze-audio.js` imports them (and still exports `SCREAMS`); its sound is unchanged.
- **Each set screams** (`SCREAMERS`): the thing in the woods first, then someone on the wagon half a second later, on a loud bus with a hard limiter as in the maze.
  - Scarecrow, then a passenger.
  - A passenger, then the girl's shriek at the spiders.
  - The girl at the bride's manor, then a passenger.
  - The wraith, then a passenger.
  - The ghoul at the bus, then a passenger.

  A stinger hit lands with each scare, except in gentle mode, which keeps the screams softer.
- **The woods between the sets** (`WOODS`, each on its own clock, seeded so a ride sounds alike each time):
  - wind in the trees, drifting and gusting;
  - owls, crows and snapping twigs;
  - creaking branches;
  - a far-off wolf;
  - now and then, a muffled scream deep in the woods (not in gentle mode).

  They are panned left and right where the browser can.

## A rules fix

When a wagon unloaded, `settle` replaced it with an empty one and stopped before calling the next queued guest to board. With small steps the next step caught it at once. One long step (`updateHayride(s, 120)`) waited for the queue's next deadline instead, up to 52 seconds, and sold up to 4 fewer tickets than small steps. `updateHayride` now settles again whenever the wagon changes. A new test compares one long step with short ones across a wagon's return.

## Verification

- **`npm test`:** 340 pass. New or changed tests cover:
  - the longer route;
  - the chunked forest, with its eyes and box budget;
  - the ride's fixed light set, and lit lights standing by the lane;
  - the scare cast at the bride's new place;
  - screams, the stinger, gentle mode and the woodland sounds;
  - long and short steps agreeing.
- **`tools/simulate-hayride.mjs`:** identical results before and after. Its fixture now starts at level 11, where the hayride opens; it failed at the old level 8.
- **Screenshots** along the whole ride, at desktop and phone sizes, with no page errors.
- **Not rerun:** `tools/qa-hayride.mjs`. The owner asked not to review the hayride too closely yet.

## Left as it was

- At the manor, the bride's voxel figure can stand in front of the girl actor from some angles. That predates this change.
