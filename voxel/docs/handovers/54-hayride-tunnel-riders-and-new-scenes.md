# 54 — Hayride ride-along: the tunnel, fellow riders, pacing and two new scenes

Branch: `voxel-reference` (lead), following handover 53. The player asked to make the ride-along even better.

## Pacing (`hayride-view.js`)

- **`hayridePace(stops, length)`:** maps the ride's time to its progress.
  - The wagon creeps past each scene at about 0.7 of its cruising speed and picks up to about 1.66 between scenes.
  - It starts and stops gently.
  - The ride's total time is unchanged.
- **Encounter cues:** now carry `at: run.elapsed`.

## Jolts and sounds

- **`AXLES` and `rootJolt(d, length)`:**
  - The front axle runs 2.68 behind the tractor's place on the route, the rear one 4.92.
  - Each root is felt twice, the rear axle the harder, since it is under the rider.
  - The camera and the passengers both ride `rootJolt`.
- **`hayrideRoots(length)`:** the number of roots. `buildRideLand` lays exactly those, so a jolt never comes where there is no root.
- **Cues:**

  | Cue | When | Gentle mode |
  | --- | --- | --- |
  | `bump` | Once per axle per root | Off |
  | `lights` | 6 units before the pursuit and the bus (`LIGHTS_OUT`) | Off |
  | `tunnel` | As the wagon's front axle passes into the hill | On, since it is not motion |

- **Audio (`ui/hayride-audio.js`):**
  - **`bump`:** a thud, a knock and a creak.
  - **`sputter`:** the engine coughs, the bulb fizzes, then a clunk.
  - **`tunnel`:** a rumble closing in, a low drone and dripping water.
  - **Screams:** the graveyard and the thicket now have screamers.

## Lights out (`lampFailure` in `hayride-world.js`)

- **Approaching the pursuit and the bus:**
  - The headlamp and the wagon's lantern sputter, then die to 5–10% while the scene's own glow carries on, then flare back.
  - The lane's lanterns dim with them.
- **Limits:** the flicker stays under three flashes a second. Gentle mode keeps the lamps steady.

## Fellow riders (`hayride-riders.js`, new; two draw calls)

- **Who:** costumed visitors (a witch, vampire, ghost, scarecrow, skeleton, mummy and werewolf) on the benches.
- **Where they sit:**
  - Only on benches at least 1.6 ahead of the rider's eye, so the nearest heads sit low in the corners of the view rather than filling them.
  - That gives two passengers on the small wagon and four on the larger ones.
- **What they do:**
  - They jog over the same roots as the camera and swing their feet.
  - They turn their heads to each scene as it comes level, but not inside the hill.
  - At each scene they jump: arms flung up, hands to faces, or a grab at a neighbour. Then they settle.
  - One in three points at the scene.
- **Gentle mode:** they stay calm.
- **Wiring:** `createRiders({ wagon, seats, eye, scene })` is built with the ride's vehicle. `tick()` takes the same jolt as the camera.

## The way in (`buildRideHill` in `hayride-station.js`, `HAYRIDE_RIDE_HILL`)

- **The route:**
  - The ride starts at the mouth of a wooded hill (x −27 to −7, z 16.5 to 23.8).
  - The lane runs through it from 2.7 to 10 units along the route, and the scarecrows wait just beyond.
- **The bore's arch (`RIDE_ARCH`):** half-width 1.75, springing at 2.6, rising 1.15.
  - It is taller than the farm's arch, because the tractor's canopy stands 3.22 high.
  - `tunnelMouth` now takes the arch as a parameter.
- **Inside:**
  - Coursed stone walls under a vault, with roots hanging only at the haunches.
  - Lanterns hung close to the walls, since the wagon's rails pass within 0.32 of them.
  - Niches of bones.
- **Outside:**
  - The skull-keystone mouth faces the boarding wagon, with "Into the Hollow" over it and lit jack-o'-lanterns at its foot.
  - Dead trees and old graves stand on the ridge.
- **Cost:** only the hill's exposed faces are drawn, about 3,000 boxes. The ground under it is not drawn. The forest, the lane's lanterns and the falling leaves keep out of it.
- **Lighting:**
  - The tunnel's lamps are halos (`lampHalos`, one additive Points draw), not lights. The wagon's lantern and the headlamp light the bore.
  - The lamps were tried in the lantern pool first. The pool takes the first four lanterns in range, so close-set lamps made the lane's lights pop on and off.
- **`hayrideUnderHill(x, z)`:** inside the hill, the director keeps its gaze ahead, and the passengers don't turn to the scarecrows through the wall.

## Moonlight (`hayride-moonlight.js`, new; two draw calls)

- **Placement:** shafts beside the lane every 14–21 units, leaning towards the moon, each with a pool of light on the ground.
- **Look:**
  - A small shader fades the shafts' edge-on surfaces, so their sides are soft.
  - It also fades them into the fog. Fading towards the fog's colour would brighten them.
  - They shimmer slowly.
- **Clearance:** `lane(x, z)` keeps every shaft 3.4 from any part of the route, which matters where the longer routes pass near themselves. `clear(x, z)` keeps them off the scenes, the depot and the hill.

## New scenes (`hayride-sets.js`)

- **The forgotten graveyard (route level 1 and up):**
  - **Dressing:** rough grass, a crumbling back wall and an iron fence with its gate swung in. There are headstones of four kinds, leaning and lichened, candles, dead flowers and ravens, an open grave with a shovel, and a family crypt with columns, a pediment, urns and a cold glow inside.
  - **Actors:**
    - Hands claw up out of three graves in turn.
    - A pale shade rises from the open grave and reaches for the wagon.
    - A weeping angel lowers its hands and turns to watch.
    - The crypt door swings open, with eyes in the dark behind it.
  - **Layout:** the painted reaper from `hayride-scares.js` lunges at the set's centre, so these actors keep to the sides.
- **The crooked thicket (route level 2):**
  - **Dressing:** bramble banks and three thorn arches over the lane, all above the wagon. There are bones in the briar, a ring of stones with an antlered totem, and a web across a gap for the thicket's spider.
  - **Actors:**
    - A gibbet cage swings from the middle arch at the lane's edge, its skeleton reaching for the wagon.
    - Twig figures twist on their cords.
    - Tendrils rise from the briar and reach out.
    - Eyes blink in the dark.
- **Building:** `makeScenicSet` now builds every scene through `buildRoadsideSet`. The old builders in `hayride-world.js` are gone, and with them the branch for actors without `animate`.

## Checks

- **`npm test`:** 550 pass. New and changed tests:
  - New files: `hayride-riders.test.mjs`, `hayride-sets.test.mjs` and `hayride-ride-feel.test.mjs`. They cover the clearances of the scenes and the hill, the pacing, the jolts, the cues and the moonlight.
  - An audio test covers the new sounds and screams.
  - The view test now expects the tunnel cue in gentle mode.
  - The roadside-sets test covers the new scenes.
- **Smoke:** 52 pass.
- **Cost:**

  | Route level | Drawables (was) | Boxes (was) |
  | --- | --- | --- |
  | 0 | 125 (118) | 108k (107k) |
  | 1 | 157 (146) | 139k (140k) |
  | 2 | 173 (163) | 160k (157k) |

- **Known issue:** the farm's own tunnel mouths keep the old, lower arch. The tractor's canopy slides under its crown, out of sight from the farm camera. Raising it would mean taller hills and a taller return bank, so it is left as is.

## For Codex next

- **The thicket's arches:** read as beaded canes. One `LineSegments` or thicker overlapping canes would smooth them.
- **The bus:** steam from the bonnet, as particles in `hayride-atmosphere.js`, is still open from handover 53.
