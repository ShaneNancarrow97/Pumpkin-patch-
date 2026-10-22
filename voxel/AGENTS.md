# Pumpkin Patch Voxel: context for coding agents

**Latest handovers: [`docs/handovers/27-claude-demand-tables-ambience-intro-maze-walk.md`](docs/handovers/27-claude-demand-tables-ambience-intro-maze-walk.md)** (what changed since your `cc9dd6c`, what to keep, what's next) **and [`28-claude-fresh-and-wanted-pumpkins.md`](docs/handovers/28-claude-fresh-and-wanted-pumpkins.md)** (the economy step after it). The numbered handovers in `docs/handovers/` are the running record between Claude and Codex.

Read this before changing anything in `voxel/`. It covers what the game is, how the code fits together, how to check your work, and the conventions the code follows. The player-facing overview is [`README.md`](README.md); the design source is [`docs/GAME-BIBLE.md`](docs/GAME-BIBLE.md).

## What this is

- **A voxel version of Shane & Natalie's Pumpkin Patch.** It is a cosy Halloween farm and shop game. Shane and Natalie grow pumpkins, neighbours buy them at the stall and inside Skyla's shop, and the takings go on upgrades, a four-room house, decor, books and costumes.
- **The main game lives at the repository root** (`src/`, a 2D canvas game). This build lives in `voxel/` on the `voxel-reference` branch, draft PR #2. It is a reference for art direction, staging and menu design, not a replacement. Nothing here should change the main game.
- **It ships as one offline HTML file,** `dist/pumpkin-patch-voxel.html`, about 5.6 MB, with every asset inlined. It runs from `file://` on a phone or a desktop.
- **The world is three.js 0.169** (pinned), drawn as voxels: boxes batched into instanced meshes. The cast are the main game's own sprites standing in the 3D world. Menus are HTML over the canvas.
- **It shares the main game's content.** The rules import the main game's data modules directly: `../../src/content/*.mjs` (catalogue, rooms, library, shop and stall profiles, art metadata) and `../../src/core/costume-model.mjs`. Those modules have no imports of their own. Don't change them for this build's sake; adapt here instead.

## Commands

Run these from `voxel/` unless noted. You need Node 20 or newer.

| Command | What it does |
| --- | --- |
| `npm install` | Installs three.js, esbuild and Playwright |
| `npm run dev` | Serves http://localhost:8001 and rebuilds on change |
| `npm test` | Runs the rule tests (`test/model.test.mjs`, node:test). Fast; run them after any rules change |
| `npm run build` | Writes `dist/pumpkin-patch-voxel.html` |
| `node build.mjs --out <file>` | Builds to another path. Use this when several agents or terminals build at once, since `dist/` is shared |
| `npm run smoke` | Plays the built file in headless Chromium at desktop and phone sizes and fails on any page error. Set `CHROMIUM_PATH` to a Chromium binary, or run `npx playwright install chromium` once. `--shots <dir>` saves screenshots |
| `python3 voxel/tools/bake_sprites.py` | Run from the **repo root**. Regenerates every baked asset from the main game's art. Needs Pillow and numpy and takes about 2.5 minutes. The output is deterministic |

CI (`.github/workflows/ci.yml`, job `voxel`) runs `npm ci`, `npm test`, `npm run build`, installs Chromium and runs `npm run smoke`, then uploads the HTML file as an artifact.

## Code map

| Path | What it holds |
| --- | --- |
| `src/model.js` | Builds the state (`freshState`), loads saves (`restoreState`, with migrations from version 1), strips what isn't saved (`saveData`), and runs one step of the rules (`update(s, dt)` returns events). Re-exports everything in `rules/` |
| `src/rules/farm.js` | Plots, the four varieties, upgrades, tapping, harvest streaks, helping hands |
| `src/rules/stock.js` | Stock counts, basket holds, and baskets (`chooseBasket` via `quoteBasket`: favourites first, then anything cheaper; a dear favourite doesn't end the visit), and which pumpkins are fresh (`s.fresh` batches) |
| `src/rules/market.js` | Fresh pumpkins and the wanted variety: `FRESH`, `WANTED`, `updateWanted`, `wishFor` (a keen guest's purse for one), `dearPrice` |
| `src/rules/selling.js` | The stall (passers-by, profiles, receipts) and the indoor shop (customers, display tables, queue, till, upgrades) |
| `src/rules/house.js` | House levels, rooms, decor placement (floor pieces collide by their measured size, `pieceBody`, within `placementRange`), moving, turning, flipping and storing, pieces standing on others (`putOnTop`, `setDown`, `restorePose`), books and shelves, wallpaper, room styles, the haunting score |
| `src/rules/surfaces.js`, `src/content/placement.js`, `src/content/shelf-catalog.js` | What can stand on what: small pieces, the measured tops of tables and the blank shelves' boards (with their finishes) |
| `src/rules/wardrobe.js`, `src/rules/progress.js` | Costumes and recolours; favours, memories and the patch level |
| `src/voxels.js` | `Voxels`: collects boxes and builds them as instanced meshes, lit or glowing. Also `seeded()` (deterministic random numbers) and `vary()` |
| `src/world.js` | The farm map and its constants (`MAP`, `PLOTS`, `BIG_PUMPKIN`, `SHOP`, `HOMES`, routes, `PITCH`), the cottage in four stages, the shop, fences, trees and props, and the painted far shore |
| `src/pumpkins.js` | The plot pumpkins (one template per variety), sprouts, the giant jack-o'-lantern, and the small yard pumpkins |
| `src/interiors.js` | The rooms and the shop floor as high-density voxel dioramas, the ten room styles, the eight wallpapers, and `INTERIOR` (the room camera's angle) |
| `src/decor.js` | Catalogue pieces as props: loads `assets/decor.png` and builds each piece; books on shelves |
| `src/places.js` | Inside places, built far from the farm at `ORIGIN` (room x 200, shop x 260). Places decor and lights it from a fixed pool of point lights, walks customers from the door to the till, and draws decorating outlines |
| `src/sprite-actors.js` | The cast drawn with the original sprites (full-size sheets), the costumes, the visitors, and portraits for the menus |
| `src/sprite-voxels.js` | The optional voxel characters, voxelised from the small sprite atlas. Also the frame animation and recolours both styles share |
| `src/characters.js` | The hand-built voxel visitors used in voxel-character mode |
| `src/scene.js` | Renderer, lights, bloom, both cameras (orthographic for the farm, perspective for rooms), input and picking, the per-frame loop, floating text |
| `src/rules/intro.js`, `src/content/intro.js`, `src/ui/intro.js`, `src/ui/intro.css` | The new-game introduction: whether it shows (`shouldShowIntro`, the saved `introSeen`), Shane and Natalie's lines, and the overlay |
| `src/moth.js` | Sandy's moth courier (used by `festival-meadow-world.js`) |
| `src/ambience.js`, `src/content/ambience.js` | The mist bank's timing and shader, and the backdrop shader that ripples the lake and twinkles its lights (from the marks canvas `buildBackdrop` paints) |
| `src/main.js` | Save and load, dialogue, the HUD and dock, keyboard, and which menu is open. Exposes `window.PumpkinVoxel` for tests |
| `src/ui/` | The menus. Each sheet is `{ eyebrow, title, body(), bind(body) }`; `main.js` re-renders a sheet only when its HTML changes. `kit.js` holds shared bits |
| `src/index.html`, `src/style.css` | The page shell and all styling. `build.mjs` inlines the CSS, the generated `src/icons.css` and the bundle |
| `tools/bake_sprites.py` | Bakes the sprite sheets, costumes, decor atlas and icons from the main game's art in `../assets/` |
| `test/model.test.mjs`, `smoke.mjs` | Rule tests; the browser smoke test |

Generated files: `src/sprite-meta.js`, `src/sprite-meta-hd.js`, `src/decor-meta.js`, `src/icons.css` and everything in `assets/` except `moonlit-waltz.mp3`. Never edit them by hand; change `tools/bake_sprites.py` and re-run it.

## How the game runs

- **State and rules:**
  - `main.js` owns one state object.
  - Every frame, `scene.js` calls `hooks.onTick(dt)` and `main.js` runs `M.update(state, dt)`. It skips this while `state.paused` (the tea break) is on.
  - `update` returns events: `sale`, `missed`, `harvest`, `plant`, `ripe`, `arrival`, `memory`. `main.js` turns them into notices, speech and sounds; the scene reads the state to animate.
- **Rules are pure.** No DOM and no three.js; time comes in only as `dt`. Keep it that way so `npm test` can run them in Node. When a rule changes, add or update a test.
- **Saves:**
  - The key is `pumpkin-patch-voxel-reference-v1`, separate from the main game's, plus `-prefs` for settings.
  - `STATE_VERSION` is 2. `restoreState` must accept anything, including junk, older versions and missing fields, and return a valid state.
  - If you change the shape of saved state, bump the version, migrate in `restoreState`, and test the round trip.
  - Customers and baskets are never saved (`closeForTheNight`).
- **Picking:**
  - `scene.js` raycasts the active camera against invisible hit boxes whose `userData` says what they are (`{ type: "plot", index }`, `{ type: "piece", instance }`, and so on).
  - `main.js` `onPick` routes plots, the big pumpkin, the shop, the cottage, a person, a decor piece, or a floor or wall cell while decorating.
- **Places:**
  - `scene.enter("room", id)` or `scene.enter("shop")` builds the place at its `ORIGIN` and switches to the perspective room camera; `leavePlace()` returns to the farm.
  - Room geometry is rebuilt when the style, wallpaper or pieces change (`scene.refreshRoom()`).

## Space, scale and cameras

- **Farm:**
  - Orthographic camera looking down at `PITCH` (in `world.js`). The yard is `MAP` 40 x 29 units, and one wide shot shows it all on desktop.
  - On a portrait phone the camera frames the patch and the big pumpkin, and you drag to pan.
  - The far shore is a painted backdrop that leans back by `PITCH` to face the camera.
- **Rooms:**
  - Perspective camera (`INTERIOR` in `interiors.js`: pitch, fov, lean), framed by `frameRoom` in `scene.js`.
  - A room is `GRID` 10 x 6 cells. One cell is one unit, measured from the back-left corner. The back wall stands at z = 0, the side walls at x = 0 and x = 10, and the front is open.
  - Wall pieces hang on the central panel (`HOOKS` x 3 to 7).
  - Rooms are built at a much finer voxel size (`V`) than the farm.
- **Sprites:**
  - The cast are textured planes, a fixed number of world units tall per sheet row (`unit()` in `sprite-actors.js`).
  - They lean back towards the camera by `LEAN` and stretch by `1 / cos(pitch - lean)`, so the art keeps its drawn proportions on screen.
  - They cast shadows the shape of the art through a custom depth material.
  - If you change a camera angle, recompute the lean and stretch.
- **Lights:**
  - Indoors, `places.js` keeps a fixed pool of point lights and moves them about. Never add or remove lights at runtime: three.js recompiles every shader when the light count changes.
  - Glowing things use an unlit material (`MeshBasicMaterial`, `toneMapped: false`), so the bloom pass picks them up.

## Checking your work

1. `npm test`.
2. `npm run build`, or `node build.mjs --out <file>`.
3. `CHROMIUM_PATH=<chromium> npm run smoke`.
4. **Look at it.** Most changes here are visual, so take screenshots and judge them.
   - Use Playwright with Chromium. Headless runs need software WebGL: launch with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
   - Software WebGL manages only a few frames a second, so wait a second or more after a change before you screenshot.
   - Check desktop (1280 x 800) and phone (390 x 844), and landscape phone (844 x 390) for layout changes.
   - `window.PumpkinVoxel` gives you `state()`, `scene`, `enterRoom(id)`, `enterShop()`, `leavePlace()`, `advance(seconds)` (runs the rules forward, since real time crawls in software WebGL), `openSheet(id)`, `closeSheet()`, `notice(text)` and `tools`.
   - To stage a scene, edit `state()` directly before entering a place: coins, `house.level = 3` for all four rooms, `house.placed`, `house.roomStyles`, `house.wallpapers`, `stock`, `shop.unlocked`.
5. Watch for page errors (`page.on("pageerror")`). The smoke test fails on any.

## Conventions

- **Code:**
  - Plain modern JavaScript ES modules; no TypeScript, no frameworks, no new runtime dependencies.
  - Keep it compact and match the file you are in.
  - Comments are short, in British English, and say why rather than what. A comment above each function or block says what it is for.
- **Words:** British English in the UI and docs (colour, favourite, neighbour), plain and short. The dialogue and item names come from the main game; keep them.
- **Art:**
  - Everything should look like it belongs in the voxel world: the plum night, lilac moonlight, and warm candle and lantern light.
  - Use the main game's art wherever it exists (sprites, decor, icons) rather than inventing replacements. Match its colours and proportions.
- **Interface:**
  - The farm stays visible behind menus. No text under 12 px, and no touch target under 44 px.
  - Sheets slide up on a portrait phone and in from the side elsewhere.
  - Interface colours are tokens at the top of `style.css`.
- **Performance:**
  - The target is a mid-range phone.
  - Batch voxels: `Voxels` per material, or meshes that emit only exposed faces. Don't create a mesh per voxel.
  - Hollow out solids, merge flat runs, and cache what rebuilds often.
- **Determinism:** world generation uses `seeded()`, so the world looks the same on every load. Use it rather than `Math.random()` for anything built.
- **Git:**
  - Work on `voxel-reference`. Commit messages are imperative and explain why.
  - Don't commit `dist/` or `node_modules/` (both ignored).
  - Regenerate baked assets with the bake script rather than hand-editing them.

## Gotchas

- **Fresh and wanted extras come from change, never the basket.** `quoteBasket` fills the basket at base prices first, then pays the fresh or wanted extra from what is left; a keen guest's `wish` purse buys only the wanted pumpkin and stays unspent without one. Keep it that way, or extras start costing sales. Receipt lines now carry `fresh` and can split one variety in two (different prices): sum by variety when showing them.
- **`bake_sprites.py` is one long script with shared names.** A variable reused further down once overwrote the voxel character atlas. After a bake, check that `git diff --stat` touches only what you meant to change.
- **Skyla's sheet has four frames:** idle 0, 1 and 2, and 3 for the paying reaction. `animateSkyla` picks them.
- **The rooms are lit by the farm's lights too.** They are built far from the farm, but the farm's moonlight and ambient light still reach them, so balance indoor lighting with that in mind.
- **Flipped decor uses a negative x scale.**
- **Book sockets:** shelves expose where their books go, and `shelfBooks` stands them there.
- **Pieces on tables (riders):** a placed piece with `on` (its host's instance) and `top` stands on that host; its `x`, `z` are its centre in the host's own unturned frame, not room cells. `fits` checks riders against their top, never the floor. Moving, turning, mirroring, sending or storing a host takes its riders with it. In `places.js` riders are children of their host's group. Shelf ids start `shelf-`; keep `shelf` free for these.
- **The lower yard sits `DROP` south** (`content/farm-layout.js`): the patch, big pumpkin, homes, the lanes' lower bends, the gates, the front fence and the props in front. Add `DROP` to any new lower-yard position (or derive it from `PATCH`, `PLOT_POSITIONS`, `GATE_Z`, `fieldDepth`); the back row (buildings, arch, back fence) does not move. The lantern walk (`HOLLOW_LINK`) runs in the gap.
- **Maze guests never leave the map:** maze-first guests come up the west lane and walk the lantern walk back to the stall; shoppers walk it over and go home by `HOLLOW_RETURN`. There are no transfer phases; old saves in them are mapped in `restoreHollowVisitors`.
- **Walks to and from Skyla's counter use the guest's own place** (`counterPlace(spot)` in `content/farm-layout.js`, where `scene.js` draws them standing), never `COUNTER_FRONT`, its middle: the lantern walk via `hollowLinkFrom(place)` (routeVersion 4; version 3 saves keep the middle), and cocoa guests coming back from the meadow. A new walk that starts or ends at the counter should too, or the guest jumps sideways.
- **Placement positions:** a floor piece's saved `x`, `z` is still the corner of its turned cells' enclosing box, but collision and the room's edges use its measured body (`content/decor-sizes.js`, from `tools/measure-decor.mjs`), so `x` or `z` can be a little below 0. Clamp UI moves with `placementRange`, not the cells. Re-run the measuring tool when a model changes.
- **Shelf finishes and tints are different:** `finish` (blank shelves only) picks the model's wood; `tint` (Codex's Colour) recolours on top.
- **Portrait phones:** the room camera fits the back wall's middle, and you drag along the wall.
- **The selected piece and the piece bar:** `keepInView` (scene.js, called from the bar's `render`) eases the room camera so the selected piece clears the bar and the canvas's edges, after any finger lifts. To lift the front row above a phone's bar, or slide the far side clear of a bar down the side, the camera may go past its usual limits (`view.reach`); once the bar closes it stays put and the limits tighten as the player drags back. A piece already in view never moves the camera.
- **Main-game imports:** the rules import from `../../src/content`, so the voxel build only works inside this repository layout.
