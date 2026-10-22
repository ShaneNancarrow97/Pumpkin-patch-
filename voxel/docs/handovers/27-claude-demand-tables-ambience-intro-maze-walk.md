# 27 — Claude handover: demand, things on tables, shelves, freer placement, ambience, the introduction, Boost, the moth and the lantern walk

For Codex. Read this before your next contractor branch. Base your next branch on the head of `voxel-reference` (this handover's commit or later; it contains your `cc9dd6c` unchanged underneath). Everything below is merged, tested and pushed.

## What landed on top of `cc9dd6c`

| Commit | What |
| --- | --- |
| `87de669` | Pumpkin demand: fuller baskets, Bigger baskets, a market cart, 50 guests (section 1) |
| `6c9b3b5` | Three more supplied MIDIs (section 2) |
| `31c303c` | Things on tables and shelves, blank shelves in six finishes, the cauldron's brew (sections 3, 4, 6) |
| `a4ef4be` | Mist, and the far lake and its lights (section 7) |
| `ccd9f64` | Furniture collides by its measured size (section 5) |
| `e645dd5` | Docs |
| `c4960b8` | Boost stays put, with a gold ring (section 9) |
| `29c834b` | The new-game introduction (section 8) |
| `3c02418` | Mist thins over the pumpkins and clears round buildings (section 7) |
| `ee543b3` | Sandy's moth courier as a real-looking moth (section 10) |
| `b8ee7d9` | The farm extended south, the lantern walk, maze guests in view (section 11) |

## 1. Pumpkin demand (answers handover 11, P1)

Production was far ahead of demand: tiny baskets, a favourite the guest couldn't afford ended the visit, and a full barn stopped the harvest and the streak. This is the demand side; your cooking roadmap (handover 09) is still the right sink and is not replaced by it.

- **Fallback buying** — `rules/stock.js quoteBasket`: favourites first, then cheaper varieties to fill the basket. A dear favourite no longer ends the visit.
- **Basket size** — `rules/selling.js`: `APPETITE = [3, 4, 5, 6, 7, 8, 10]` by the new Visitors upgrade `appetite` ("Bigger baskets", six tiers, £400 to £50k). `EXTRA_PURSE = 3` coins per extra basket slot is added to the purse, so bigger baskets are affordable. Regulars get +2 slots and half again their purse. `basketFor()` builds each shopper.
- **Crowd** — `CROWD = [16, 20, 24, 28, 32, 38, 44, 50]`, `crowd` costs `[300, 1200, 4000, 10000, 20000, 35000, 55000]`. Old saves keep their tier and crowd.
- **Market cart** — `rules/farm.js`: Build upgrade `cart` (three tiers, £400 / £2,500 / £9,000). When the barn is full, harvests go to the village market for 15 / 25 / 35% of the price, capped at 10 / 20 / 35 pumpkins a game minute (`CART`, `cartRoom`, `store()`). `barnBlocked(s)` is now the one test for "the harvest can't go anywhere"; the Harvest button, the notice and Skyla's tip all use it.
  - Your 21 October change made a full barn leave crops safely unharvested so harvest spam could not mint wholesale money. The cart keeps that promise: it costs money, pays a fraction, and its per-minute cap bounds it. Without the cart, behaviour is exactly yours.
- **Simulator** (an archive-based rule simulation like yours, kept outside the repo): an engaged player reaches level 12 in 92 minutes, down from 129. A casual player now reaches level 12 in about four hours, where before they stalled around level 9. Level thresholds were left alone on purpose: raising them would make existing saves appear to drop levels.
- Tests: `test/economy-baskets.test.mjs`, plus updated `big-spender`, `customer-care`, `festival-meadow`, `model` and `storage-and-visitors` tests.

## 2. Music

`assets/music/disasterology.mid`, `crazy-train.mid`, `rebel-yell.mid`, registered in `src/ui/music-tracks.js` (12 tracks). `test/midi.test.mjs` counts 12 files.

## 3. Things on tables and shelves ("riders")

- **Data**: a placed piece with `on` (its host's `instance`) and `top` (index into the host's tops) stands on that host. Its `x`, `z` are its **centre in the host's own unturned frame** (x from the host's left edge, z from its back; a wall host: z out from the wall), not room cells. Floor pieces never have `on`.
- **What can ride**: `content/placement.js SMALL_PIECES`. **What can carry**: `HOSTS` there (tops measured from the models in `content/decor-sizes.js`) and every blank shelf (`content/shelf-catalog.js` boards). `rules/surfaces.js` holds the shape maths (`surfacesOf`, `standsOn` with `BASE` 0.55 of the rider's footprint on the top and headroom under the board above, `ridersClash`, `intoHostFrame`).
- **Rules** (`rules/house.js`): `fits()` sends a candidate with `on` to `riderFits()` (its top, headroom and the other riders on that top; never the floor). `overlaps()` ignores riders. Moving, turning, mirroring (`flipDecor` mirrors rider x), sending to a room and storing a host carry its riders. `putOnTop(s, instance, host?, near?)`, `setDown`, `restorePose` (Undo across on/off a top), `hostSurfaces`, `ridersOf`, `hostYaw`. Riders count towards room capacity. `restoreHouse` restores hosts first; a rider whose host is gone goes to the floor.
- **Rendering** (`places.js`): riders are children of their host's group (`addRider`, `riderAt`), with their hit box there too. Selection guides for riders sit in the host group and draw over everything. A tap on a rider picks the rider, not the table round it (`scene.js` pick order).
- **UI** (`ui/home-sheets.js`): "On a table" / "Next top" in the piece bar, "Set down on the floor" under More. In Move mode a tap on a table puts the piece there (`tools.tapPiece`); a drag on a top slides along it (`scene.js piecePoint` uses `places.standHeight`). Nudges point across the room whatever the table's turn.
- Tests: `test/riders.test.mjs`. The smoke stands the candelabrum on a tea table on desktop and phone.

## 4. Blank shelves

Five shelves (`shelf-floating`, `shelf-bracket`, `shelf-two-tier`, `shelf-whatnot`, `shelf-etagere`) are in the catalogue, category `shelves` (the chip now reads "Shelves", with the bookshelves). Each has six finishes; a placed shelf keeps `finish` (validated on restore), and More > Finish cycles it for free. **`finish` is not your `tint`**: finish picks the model's wood; tint recolours on top, and both work together. Please keep `shelf-` ids and `shelf` state keys free for these (your cooking plan's shop shelves are a different thing; call them displays or racks).

## 5. Freer placement (builds on your handover 26)

Your 0.1 grid, SAT collision, drag, two-finger turn and Undo are kept. The remaining problem was that pieces still collided as whole cells (the dining table blocked 3 x 2 but is about 2.1 x 1.1), so nothing reached walls or corners.

- `pieceBody(id)`: the measured size from `content/decor-sizes.js`, never more than the cells, plus where the art sits in them. `floorRectangle` uses it, turned with the piece, for pieces, stairs, doorways and the room's edges.
- Saved `x`, `z` still mean the corner of the turned cells' enclosing box, so all old layouts stay valid. A corner can now be a little below 0.
- `placementRange(s, p)` gives the corner range that keeps the piece inside the room; drags, taps and turns clamp to it (not to the cells). The selection outline and ring show the real size.
- **When you add or change a decor model, re-run `node tools/measure-decor.mjs`** so `DECOR_SIZES` knows it; collision and table tops both read it. Pieces with no measurement fill their cells.

## 6. Cauldron

`decorProp` already gave the cauldron a `tick`, but nothing called it, so the brew was frozen. `places.js` stores each piece's `tick` and `tickRoom` calls it.

## 7. Ambience: mist and the far shore

- `src/ambience.js` (shaders) and `src/content/ambience.js` (timing, tested in `test/ambience.test.mjs`). `scene.js` creates it beside the backdrop and ticks it; `scene.setAmbience({ mist, lake })` and `scene.ambience.skip(seconds)` (QA only).
- **Lake and lights**: `world.js buildBackdrop` paints a marks canvas beside the picture (LAMP 255, GLINT 160, STAR 80 in red). The backdrop's material samples the lake's rows shifted by whole texels and dims lamps, glints and stars over time. Anything you paint over a light with `px()` stops it twinkling, by design.
- **Mist**: two faint sheets at y 0.35 and 1.0, alpha = bank cover x noise x clearings. The bank crosses the farm every 210 s (`MIST`, `mistBank`, `mistCover`). It thins to a third over the patch and the big pumpkin and fades out round the Hollow House, the shop and Sandy's booth: `mistClearings()` builds the areas from `patchShape`, `SHOP`, `BIG_PUMPKIN`, `HOLLOW_PROPERTY` and `MEADOW`, and `scene.js` feeds them to the shader whenever the land changes (`mistLeft()` does the same sum for the tests). If you add a building to the farm, add it there.
- Settings: "Drifting mist" and "Lake and twinkling lights" (prefs `mist`, `lakeLights`), both off by default under prefers-reduced-motion.

## 8. The new-game introduction

- `rules/intro.js` (`shouldShowIntro`, `hasPlayed`, `restoreIntroSeen`), `content/intro.js` (the title and Shane and Natalie's seven lines), `ui/intro.js` and `ui/intro.css` (in `build.mjs`'s CSS list), hooked in `main.js` and `index.html` (`#intro`).
- It plays once for a patch that hasn't been played: the saved `introSeen` flag, and any save with progress counts as seen. Settings has "Watch again". The farm is paused while it plays and handed back after; Skip, Escape, tap, Enter and Space work; reduced motion shows the words at once.
- `window.PumpkinVoxel.intro` is exposed. **Any QA script that loads a fresh save must call `PumpkinVoxel.intro.skip()` first**, or the overlay holds every click (`smoke.mjs` checks it and skips it).

## 9. Boost stays put

The action bar (`#actions`) is now a three-column grid across the screen: Plant in the left column (right-aligned), Boost alone in the middle, Harvest in the right. Plant and Harvest come and go without moving Boost; measured identical in six bar states at three screen sizes. Boost has a layered gold ring and a slow sheen (off under reduced motion). "Barn full" stacks under Harvest's label (`.barn-full`). The CSS is one commented block in `style.css`.

## 10. Sandy's moth courier

`src/moth.js` `createMoth({ home, perch })`, used by `festival-meadow-world.js` when the courier is hired. A voxel body with feathery antennae and pixel-art wings on planes hinged along the body: beats and glides, banks into turns, wanders about the booth and every 26 s settles on the free end of Sandy's counter. Its `dispose()` frees only its own buffers; the voxel box geometry is shared by the whole game.

## 11. The lantern walk and maze guests in view

- **Layout:** `content/farm-layout.js DROP = 3`. The patch (`PLOT_POSITIONS`, `PATCH`), the big pumpkin, `HOMES`, the lower bends of both lanes, `GATE_Z`, `fieldDepth`, `farmPathEnd`, the front fence and its lamps, and every prop, tree and flower in the lower yard sit three squares further south; so do the meadow's lane, front fence and lanterns (its booth stays). The back row does not move.
- **The walk:** `content/hollow-house.js HOLLOW_LINK` (Skyla's counter to the Hollow House door) and `HOLLOW_LINK_BACK`, drawn by the yard ground through `HOLLOW_PATHS`, with two lamps along it. `HOLLOW_APPROACH` and `HOLLOW_SHOP_RETURN` are gone.
- **Who goes when** (`rules/hollow-house.js planHollowVisit(s, v, "arrival" | "after")`): a new guest goes to the maze first about a third of the time (`MAZE_FIRST`), up the west lane, then walks the link to the stall and shops; about half of the rest (`MAZE_AFTER`) walk the link over once done at the stall (whether or not they bought anything), and leave by the west lane (`wentHome`). Opening the maze queues a party of `OPENING_PARTY` guests with `forMaze`. A guest who has shopped needs nothing kept back for a pumpkin to afford a ticket. Frightened guests still run home down the west lane (`fledHome`).
- **No transfers:** `transfer-in` and `transfer-out` no longer happen. `restoreHollowVisitors` maps an old save's transfer phases onto the walks and moves a guest parked by an old gate to today's.
- **Please keep** guests in view: no new off-map hops between the two halves of the farm.

## Files Claude touched since `cc9dd6c`

`voxel/AGENTS.md`, `voxel/README.md`, `voxel/build.mjs`, `voxel/smoke.mjs`, `voxel/src/ambience.js`, `voxel/src/content/ambience.js`, `voxel/src/content/farm-layout.js`, `voxel/src/content/festival-meadow.js`, `voxel/src/content/hollow-house.js`, `voxel/src/content/intro.js`, `voxel/src/content/shelf-catalog.js`, `voxel/src/farm-expansion-world.js`, `voxel/src/festival-meadow-world.js`, `voxel/src/index.html`, `voxel/src/main.js`, `voxel/src/model.js`, `voxel/src/moth.js`, `voxel/src/places.js`, `voxel/src/rules/farm.js`, `voxel/src/rules/guest-needs.js`, `voxel/src/rules/hollow-house.js`, `voxel/src/rules/house.js`, `voxel/src/rules/intro.js`, `voxel/src/rules/selling.js`, `voxel/src/rules/stock.js`, `voxel/src/rules/surfaces.js`, `voxel/src/scene.js`, `voxel/src/style.css`, `voxel/src/ui/farm-sheets.js`, `voxel/src/ui/home-sheets.js`, `voxel/src/ui/intro.css`, `voxel/src/ui/intro.js`, `voxel/src/ui/music-tracks.js`, `voxel/src/ui/settings-sheet.js`, `voxel/src/world.js`, the new music files, and tests.

If one of your branches touches the same files, merge rather than overwrite; ask in your handover if a choice is unclear.

## Please keep

- Rider frames and the `fits()` split (section 3); measured collision and `placementRange` (section 5). Don't clamp moves to the cells again.
- `barnBlocked()` as the single "harvest has nowhere to go" test; the cart's per-minute cap.
- The Boost slot (section 9): don't re-centre or re-flow the action bar around Plant and Harvest.
- `DROP` and the lantern walk (section 11): new lower-yard things add `DROP`; guests stay in view.
- Prefs keys `mist`, `lakeLights`; the save's `introSeen` flag.
- British English, short plain copy, and the smoke test passing on desktop and phone (`npm run smoke`, about 25 minutes on software WebGL).

## Suggested next for Codex

1. **Your handover 09/11 sequence still stands**: the cocoa reconciliation, then one cooking slice (ingredient, cart, cook, shelf, hungry guest). Cooked food gives surplus pumpkins a use; the demand fix only makes sales keep pace.
2. **Economy phases after that** (from Claude's roadmap to the user): freshness (pumpkins sell better fresh, which rewards picking to demand), a daily "wanted today" variety that pulls a premium, small repeatable orders from neighbours and festival days that spike demand, then the level 13–20 band you proposed. Tune with your archive sim (`tools/simulate-maze-demand.mjs`). It does not model the new walk; re-check maze footfall with it, as the plan rolls changed.
3. **Hollow House tickets come out of the same purse as pumpkins.** That is fair, but check that a busy maze does not quietly halve pumpkin sales; show it in the ledger if it does.
4. **More things to stand on tables**: when you model new small curios or tables, add them to `SMALL_PIECES` / `HOSTS` and re-run `tools/measure-decor.mjs`.

## Known rough edges

- On a phone the piece bar covers the bottom of the room; the camera does not yet frame the selected piece above it.
- The catalogue's sticky tabs overlap the first card's text when scrolled.
- Software-WebGL QA is slow; it is not a phone performance benchmark.

## Verification

- `npm test`: 220 rule tests pass.
- `npm run smoke` (desktop 1280 x 800 and phone 390 x 844, software WebGL): all checks pass, including the new introduction, the candelabrum on a tea table and the real barn capacity.
- Browser checks with screenshots: the introduction at three sizes; Boost's rectangle in six bar states at three sizes; the mist on and off; the moth followed in flight; furniture in corners; riders on tables and shelves; the extended farm on desktop and phone; the opening party up the west lane and maze guests on the lantern walk.
