# 34 — Claude: the Hollow House rebuilt (maze, walkthrough screen, foyer and haunts)

For Codex. Follows handover 33. Base your next branch on the head of `voxel-reference` (this handover's commit or later).

The user asked Claude to take over production of the Hollow House and improve three things: the scare maze's interior, the foyer and the experience mode. Later they added: "make the foyer's enabled elements more exciting looking and well made", meaning the five haunts. All of that is below. The hold in handover 33 is lifted: you may branch from these files again, but please read this first.

## The maze: route and pacing (`content/maze-ride.js`, `rules/maze-ride.js`)

- **The route is built from rooms.** `buildMazeRideRoute(tier)` makes the following, and `mazeRideRegions` gives the same rooms, passages and halls to the world builder.
  - An entry hall whose doors swing open.
  - A curve round each chamber's centrepiece. Chambers alternate sides; see `side` on each chamber.
  - A passage between chambers.
  - An exit hall that opens on the foyer's candlelight.
- **The walk is timed by distance.** The rail is walked at `MAZE_RIDE_PACE.cruise` (1.9 m/s).
  - It slows to a creep as each scare comes up and holds while the doors open.
  - `buildMazeRideTimeline` samples that walk every `step` seconds.
  - Length now grows with the house: about 18 s at tier 1, 80–94 s at tier 5.
- **Use the timeline, not ratios.**
  - Progress is `mazeProgressAt(config, elapsed)`, never `elapsed / duration`.
  - A cue's time is `mazeTimeAtDistance(timeline, d)` for its scare point. Baseline scares sit early in a chamber and an installed haunt's late, at least five seconds apart.
  - The config key is now `maze-ride-v2:`.

## The maze: chambers (`maze-ride-world.js`, `maze-ride-view.js`)

Each chamber has its own finish (`MAZE_RIDE_FINISH`: floor, base, panel, rail, paper, crown, ceiling, fog, tint) and its own dressing.

| Chamber | Dressing |
| --- | --- |
| Passage | Boards and damask, a hall table, a clock with a swinging pendulum, portraits, a glowing mirror |
| Cellar | Flagstones, barrels, wine racks, roots, chains, puddles, a spider on its thread |
| Parlour | Crimson paper, a séance table with a pulsing crystal ball and floating cups, a chandelier, curtains, a piano, a fireplace |
| Laboratory | Tiles and brick, an operating table, two crackling coils, glowing jars, a control panel, a lightning window |
| Crypt | Stone and velvet, a sarcophagus whose lid shifts, upright coffins, skull piles |

`world.tick(time, gentle, { elapsed, duration })` moves the doors, pendulum, spider, crystal, cups, arcs, window flash and lid.

**Lighting** (`maze-ride-view.js`):
- Six pool lights follow the nearest lamps; flames flicker and arcs crackle.
- A tinted hemisphere fill and fog are coloured per chamber.
- One spare light serves the reveal rim, the exit door's glow or the chamber tint.
- The camera glances towards each centrepiece, never during a scare.
- Maze exposure is 1.3 (`scene.js`).

**Fixed along the way:** floor tiles on negative coordinates took an undefined colour and rendered white. The pattern now uses `& 1`.

## The experience mode (`ui/maze-ride-ui.js`, `ui/maze-ride.css`, `maze-ride-view.js`)

- **The veil:** a vignette over the walk.
  - It flashes red at each new cue.
  - It fades up from black as the doors open (`--dusk`).
  - It turns to warm candlelight at the end (`--dawn`).
- **Chapter cards:** "II · Cobweb cellar" rises and fades as you step into each chamber.
- **The top bar fades while you watch** (`.idle` after 2.8 s). A touch, pointer or key brings it back.
- **The progress bar** has a tick where each chamber begins.
- **The finish card** shows chambers, scares and time, with a fright meter. `frightName(terror)` gives the wording.
- **In 3D,** each cue gives a short camera shake and a 5° lens punch (`jolt`).
- **Gentle motion** turns off the jolt, the shake and the red flash.

## The foyer (`hollow-house-world.js`, `foyer-view.js`)

- **A runner** leads from the front door to a medallion under the chandelier, then on to the maze door. It lies only inside `foyerLayout().reserved`, so placed decor never sits on it. It is left out on the carpet floor.
- **The chandelier hangs over the medallion** (`hub`) and changes with the lighting finish:
  - an iron ring;
  - silver with crystals (moon);
  - two brass tiers (amber).
- **A lighting finish recolours only flames,** meaning glows whose colour is in `FLAME`. Windows, the fire and the maze door keep their own light.
- **The maze door:**
  - a smooth pointed arch (`archBand`);
  - a parted curtain, with violet light leaking from the corridor;
  - a lit "MAZE" sign in pixel letters (`LETTERS`);
  - pumpkins either side.
- **The front doorway** is a low oak and gilt arch, so the phone's closer camera still sees the hall.
- **New lights:** the chandelier's pool and the corridor's pulsing violet light. Mist curls out under the curtain.
- **The middle ceiling beam is gone,** so nothing crosses the back wall.

## The haunts (`maze-effects.js`)

All five were rebuilt, each kept clear of the foyer's fixed pieces: the sign, the landing, the windows, the painting and the chandelier.

| Haunt | Now |
| --- | --- |
| Cobweb canopy | Corner webs strung across both back corners (spokes, rings, dew drops), and a spider with a red hourglass dropping from each |
| Whispering portraits | Three gilt portraits with crests and lit eyes: two climb the staircase wall, one hangs beside the landing |
| Spectral parade | A lady in a bonnet, a gentleman in a top hat and a child, fading from bright heads to deep hems, with wisps. They float into the hall from the maze door |
| Thunder chamber | Copper Tesla coils with brass crowns between the painting and the door, an arc between them and three runes |
| Phantom finale | A hooded phantom with a skull face and raised hands rises from the stair landing under a violet arch. Its text always said "beyond the stairs" |

The prefab test's limits still hold: everything sits between y 2.4 and 4.85, inside the walls, under 500 boxes and in at most 8 batches.

## Verification

- `npm test`: 266 pass.
- `tools/qa-maze-ride.mjs`: see the PR description for this run's result.
- Survey screenshots of every chamber, the screen effects and each foyer finish were checked on desktop (1280×800) and phone (390×844).
