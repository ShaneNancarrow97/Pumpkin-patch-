# 61 — Caretakers, and the Hollow Man's longer, scarier breakdown

Branch: `voxel-reference` (lead), following handover 60. The player asked:

- "Add janitor into visitor upgrade path unlocked when first litter is dropped, maximum of two, visitors can drop anywhere in farm."
- "Make the hollow man section much scarier and longer (when on the experience itself) lights up visible to the player akin to freddy fazbear, creepy jingle accompanied, he skulks around the tractor, the pov camera has heartbeat sounds and blinks and then he stretches over the tractor hands connecting to the side and up in your face before the chase which should appear much more frantic, his pixel count should be higher and more jack skellington other mother like quality creepiness."
- "His pumpkin face should open up like a demogorgan with teeth inside a deep red flesh colour."
- "Grab screenshot along the way."

The caretakers went out in `b080d72`; the Hollow Man is this round's second commit. The farm round (skins, a makeover animation, density, spookiness, the hayride's site) is still next; see the end.

## Caretakers (`rules/cleanliness.js`, `content/farm-walks.js`)

- **A visitor upgrade now.** "A caretaker" is in Visitors & VIPs › Arrivals (`VISITOR_UPGRADES` in `rules/selling.js`), with two tiers: Hettie for £450, then her twin Hattie for £1,800. There are never more than two. It opens when the first piece of litter is dropped (`visitorLevel("litter")` reads `cleanliness.nextId > 0`), not at a level, and stays open once bought.
- **Old saves:** a save that had Hettie hired (`cleanliness.janitor === true`) restores as the first tier (`visitorUpgrades.janitor = 1`), and she stands where she was.
- **Litter anywhere:** guests drop it where they stand (`visitorGround`):
  - on the lane, at the counter, in the meadow and its chat spots, on the lantern walk, in the hayride's queue and at the food truck's tables;
  - never in the pumpkin patch;
  - indoors, in the Hollow House or on the wagon, they drop nothing.

  What a guest carries becomes the litter: a cocoa cup, or a snack wrapper. With no guest outside, it lands on the lane as before. Drops are still one per four sales, at most 24, and deterministic.
- **The walks** (`content/farm-walks.js`, new): every guest route of the attractions that are open, joined into one network.
  - Line ends join other lines part-way along (T-junctions within 1.2 units).
  - `walkRoute(s, from, to)` steps onto the nearest walk, follows it by Dijkstra, and steps off at the end. The graph is cached per set of open attractions and per field size.
  - Caretakers keep to these walks, so they never cut across the patch or through a building.
- **Two at work:** each caretaker goes for the nearest piece the other isn't after. They wait by the top of the lane (`JANITOR_REST`) when the farm is clean. A long simulation step still walks every way and sweeps each piece (1.4 s each).
- **Hattie** is Hettie's sheet recoloured by `tools/recolour_twin.py`: a slate-blue suit and cap and a mustard scarf (`assets/hattie-janitor*.webp`). `cleanliness-view.js` draws up to two. The Home & care sheet's card has a Caretakers button that opens the upgrade.
- **Tests:** `test/cleanliness.test.mjs` covers:
  - drops at guests' feet;
  - the unlock and the cap of two;
  - walks that never cross the patch;
  - both caretakers sweeping;
  - long steps, save round trips and the old-save migration.

## The Hollow Man, overhauled (`hayride-stall.js`)

The breakdown is twice as long: the wagon now stands for `STALL.hold` = 18.6 s, not 9.6. The beats, from `STALL_CUES`, with the dark (`stallLamps`) unchanged in kind:

| t (s) | Cue | What happens |
| --- | --- | --- |
| -2.4 | `sputter` | The engine coughs and the lamps fail. |
| 0 | `stall` | It dies, and the wheels go quiet. |
| 1.6 | `steps` | Footsteps circle the wagon. His face is embers in the trees. |
| 3.2 | `breath` | Breathing, close behind. |
| 4.2 | `jingle` | **A music box** starts somewhere in the dark. With each note his face flickers on, a jack-o'-lantern skulking round the tractor and the wagon. |
| 6, 10.4 | `ignition` | The starter grinds and fails. The headlamp browns out for a moment. |
| 14.2 | (the hush) | The tune stops dead. It's pitch dark, with only your heartbeat. Your eyes shut for a long blink (14.55, 0.85 s). |
| 15.2 | `climb` | When they open, he's crouched on the tractor's roof. The canopy groans. |
| 16.2 | `stretch` | His joints crack as he stretches over the wagon. His hands slide down its sides, and his face comes toward yours. |
| 16.6 | `crank` | The starter turns once more, under him... |
| 17.4 | `hollow` (encounter) | **His face is in yours.** Then it splits open: five petals peel back on a maw of deep red flesh ringed with teeth. |
| 18.6 | `roar` | The engine catches. You flinch (a blink), and he's flung off the roof into the lane behind. |
| 19.2, 23.6 | `chase` | He scrambles after the wagon, frantic. |
| 30 | `howl` | He howls as it gets away. |

- **The music box** (`content/hayride-jingle.js`, new): an original 22-note waltz in D minor that slows as it plays, like a box running down, and stops dead at 10 s (`JINGLE_LENGTH`).
  - `musicBox()` in `ui/hayride-audio.js` plays it with two voices taking alternate notes, three steel tines each (1, 2.76 and 5.4 times the note), slightly out of tune. There's an echo off the trees (0.23 s), all as one of the ride's voices.
- **His face flickers to the tune** (`jingleFlicker(u)`): each note flares it (decaying over 0.26 s), and now and then it stutters. That's fewer than three flickers a second, kept under the photosensitivity limit. While it flickers, his face lights what's round him (`light`), so you see him in snatches, Freddy Fazbear style.
- **He skulks** (`SKULK`) on a loop round the tractor and the wagon (7.2 units along, 3.2 to each side, a lap every 9.5 s). Each time you blink, he jumps 0.07 of a lap further round. The director only half turns you to him (`gaze` 0.55) while he skulks.
- **Blinks** (`BLINKS`, `stallBlink(t)`): seven, ending with the flinch at the roar. The ride UI has eyelids (`.hayride-ride-lid`, curved, driven by `--blink`). `status.blink` carries how shut they are each frame.
- **The heartbeat** (`status.heart`, `setTension(value, heart)`): from the stall until the roar, it pounds about twice as loud and a little deeper.
- **On the roof and the stretch:**
  - He perches on the canopy, 0.6 units ahead of the tractor's place, at 3.2 high.
  - `stretchTrunk` aims his spine at a point and lengthens the torso and neck together.
  - `reachArm` does the same for each arm, to a point on the wagon's side that slides down toward the rider.
  - His face ends 0.62 units in front of the camera.
  - Close to the camera, his face and its light dim (`near` in `hayride-world.js`), so the carving burns out of a dark pumpkin rather than glaring.
- **The face opens** (`open`, 0 to 1, from 0.2 to 0.6 s after the reveal). Each petal has three joints:
  - `hinge`, set on the rim and turned to the petal's angle;
  - `opener`, which swings it out by `open × 2.05` radians, writhing a little;
  - `counter`, which turns back so the face's voxels stay square while it's shut.

  The face's voxels are a 0.05 grid over a squircle. `wedge(x, y)` gives each to the petal it falls in, and `carved(x, y)` decides what glows: slanted eyes, a nose, and a notched grin sewn shut with stitches. Each petal's inside carries flesh in ridges and a row of teeth down each edge. Behind the petals is the maw: flesh darkening in rings down to a black throat, and two rings of teeth, some old and yellowed.
- **The chase is frantic:**
  - He zig-zags across the lane, 3.3 to 5.1 units behind the rider.
  - Every 1.7 s he lunges. He springs off both feet and dives face first at the rail, his head level with yours, his arms flung wide, his fingers splayed and his maw open. The lunge is straight down the lane and never nearer than 2 units, or the camera would see only his trouser leg.
  - The wagon shakes all through the chase, and each lunge jolts it and punches the field of view in.
  - The gallop is one voice of many footfalls, with claws on the lane and three snarls.
- **The rig** (`createHollowMan`): 464 blocks for his body and 123 that glow, in two instanced draws. It's made to be creepy in the way of Jack Skellington and the Other Mother:
  - a pinstriped tailcoat in nine slices with long tails and a ragged hem;
  - a bat for a bow tie;
  - arms like rods, with needle fingers of three joints each and a thumb;
  - spindly legs with spats and curled toes;
  - a knobbled neck;
  - a tall, ribbed, cracked pumpkin head with a curling stem.

  Skin joints (`torso`, `neckSkin`, each arm's `upper` and `fore`) stretch; what hangs off their ends (`chest`, `head`, `elbow`, `wrist`) sits on the next joint, so it doesn't stretch.
- **The photo** for the result card is now taken at the reveal plus 0.8 s: "The Hollow Man, face to face".

## Sounds, and the voice limit

The ride plays at most 22 voices at once (`MAX_VOICES`). Long runs of hits (footsteps, joint cracks, the gallop) now go through `pulses({ times, pans, ... })`: one source struck at each time and panned for each one, so the run counts as one voice. Use it for anything with more than a handful of hits, or the limit cuts the cue short.

New or changed cues:

- `jingle`: the music box.
- `climb`: a thud on the roof, the canopy groaning, and fingers scraping.
- `stretch`: joint cracks, a sinew's groan, a rising drone and breaths.
- `hollow`: now also a shriek, a wet tear and a rattle from the maw as the face opens.
- `chase`: the frantic gallop.

## On screen

The cinema's vignette, grain and ember flash are as before, and the eyelids are new. Gentle mode still skips the whole breakdown.

## Checking

- 604 unit tests pass. These are new or rewritten:
  - in `hayride-stall.test.mjs`:
    - the dark, the flicker under 3 Hz, and the blinks;
    - each mode's place, including the chase never nearer than 2 units;
    - the engine;
    - the rig keeping its feet, stretching to its aim, and its petals opening onto flesh and teeth;
  - in `maze-audio.test.mjs` (the harness now knows `createDelay`): the music box's notes, its end at 10 s, and the new cues within the voice limit;
  - in `hayride-view.test.mjs`: a held ride moves only when advanced.
- The smoke test passes 54/54 (`CHROMIUM_PATH=/opt/pw-browsers/chromium node smoke.mjs`).
- Browser QA scripts (not committed):
  - `.ride-hollow-qa.mjs` walks the breakdown beat by beat; `FACE=1` gives the face opening and the chase, `QUICK=1` a short pass.
  - `.ride-lunge-qa.mjs` shoots exact moments: the roar, the flinch and each lunge. It holds the ride's clock (`PumpkinVoxel.hayride.hold(true)`, new) and steps it with `PumpkinVoxel.hayride.advance()`, so software WebGL's second a frame doesn't move the ride on between shots. Freezing the page's own clock (`page.clock.install()`) doesn't work: screenshots then wait for a frame forever.

## Not done yet

- **The farm round:**
  - skins for the farm (warm purples and orange; green and decrepit; abandoned, cold and ghostly) with a makeover transformation as they change;
  - more density, farm character and spookiness;
  - the hayride station's look on the farm.
- **The engine on the farm:** `createTractorEngine` is still ready for the tractor leaving and coming back to the station.
