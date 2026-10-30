# Pumpkin Patch Voxel: context for coding agents

**Latest handovers: [`docs/handovers/61-caretakers-and-the-hollow-man-overhaul.md`](docs/handovers/61-caretakers-and-the-hollow-man-overhaul.md)** (caretakers as a visitor upgrade, opened by the first litter, up to two, walking the guests' own paths to litter dropped anywhere on the farm; and the Hollow Man's breakdown made twice as long: a music box, his face flickering as he skulks, eyelids and a pounding heart, the roof, the stretch into your face, a face that splits open on a maw of teeth, and a frantic chase), after [`60`](docs/handovers/60-hollow-man-tractor-engine-and-jump-scares.md) (the Hollow Man's breakdown in real dark, revealed by his own jack-o'-lantern face; a tractor engine synthesised from a real recording; and the sprite jump scares moved clear of the voxel animatronics), after [`59`](docs/handovers/59-controller-menus-and-hold-to-buy.md) (every menu on a PS5 pad with a gold ring, tabs on L1/R1 and a hub on Options; centred menus over a dimmed farm; and a short hold to buy), after [`58`](docs/handovers/58-premium-carving-controller-and-shapes.md) (the carving bench at high density: lid, seeds, etching, freehand, the candle reveal, a dressed set and sounds; full controller play; and pumpkin shapes at the bench and in the patch), after [`57`](docs/handovers/57-carving-garden-crops-and-pace.md) (pumpkin carving at a garden bench, garden crops and decor, prompts and tap-to-walk in play mode, and a slower level pace that keeps old saves' levels), after [`56`](docs/handovers/56-garden-play-and-walk-through-doorways.md) (play mode reaches the garden, and the owner walks through doorways, gates and stairs with a blur, no button), after [`55`](docs/handovers/55-play-mode-sizes-and-fences.md) (in play mode Shane and Natalie read as one size whichever way they face, settle to face the camera, and stay inside the fences), after [`54`](docs/handovers/54-hayride-tunnel-riders-and-new-scenes.md) (the ride-along starts through a hill tunnel, with passengers, pacing, failing lamps, moonlight and the rebuilt graveyard and thicket), after [`53`](docs/handovers/53-hayride-ride-along-overhaul.md) (the ride's motion, air and four rebuilt scenes), [`52`](docs/handovers/52-service-menus-spiders-and-late-game.md) (service menus, spiders, tunnels and late-game goals) and [`51`](docs/handovers/51-merge-bonus-guests-and-premium-ui.md) (bonus guests and the premium UI), after [`42`](docs/handovers/42-claude-wilds-round-the-farm.md) (hills, a treeline and fog round the farm; roads run on into them), after [`41`](docs/handovers/41-claude-hayride-ride-along.md) (a longer, lit ride-along with screams and woodland sounds; guests' circuit unchanged), after [`40`](docs/handovers/40-claude-performance.md) (where the lag came from: lamps share a light pool, one shadowed light, a lighter ground, pictures and shaders warmed ahead), after [`39`](docs/handovers/39-claude-hayride-merged-levels-and-dock.md) (the hayride merged, unlocks moved later, the Upgrades menu and Wardrobe tab), after [`37`](docs/handovers/37-claude-meadow-chats.md) (guests who stop for a cocoa and a chat in the meadow, and the comforts that make it popular) and [`36`](docs/handovers/36-claude-maze-scares-screams-and-set-dressing.md) (scares that leap at the screen, screams, the dressed maze; the farm exterior moves to Codex), after [`35`](docs/handovers/35-claude-controls-phantom-music-and-split.md) (decorating controls, the animated phantom, zoom and music; what Codex can pick up), after [`34`](docs/handovers/34-claude-hollow-house-rebuild.md) (the maze, walkthrough, foyer and haunts rebuilt), after [`33`](docs/handovers/33-claude-integration-maze-ride.md) (Codex's first-person maze integrated; runtime art sizes), [`27`](docs/handovers/27-claude-demand-tables-ambience-intro-maze-walk.md), [`28`](docs/handovers/28-claude-fresh-wanted-and-orders.md) and Codex's [`29`–`32`](docs/handovers/29-first-person-maze.md). The numbered handovers in `docs/handovers/` are the running record between Claude and Codex.

**New contractor exterior:** [`docs/handovers/43-hollow-house-exterior.md`](docs/handovers/43-hollow-house-exterior.md) isolates the farm attraction’s staged models, animations, icons and direct door entry from the unchanged foyer/maze rules.

**New contractor cooking:** [`docs/handovers/44-cooking-and-deliveries.md`](docs/handovers/44-cooking-and-deliveries.md) adds a level-5 paid food truck, timed ingredient deliveries, shared pantry, eight recipes, home cooking, finite-wallet indoor food sales and a later supplied chef. It is stacked on handover 43; use its incremental/combined patch instructions and preserve Claude's unpublished progression work.

**New contractor crop:** [`docs/handovers/45-midnight-moon-pumpkin.md`](docs/handovers/45-midnight-moon-pumpkin.md) adds the fifth navy-and-gold variety and legacy four-bin save migration. Larger kitchen/VIP integration is explicitly unfinished and separate.

**Contractor workshop:** [`docs/handovers/46-kitchen-hospitality-workshop.md`](docs/handovers/46-kitchen-hospitality-workshop.md) completes physical kitchen equipment/mixing/batches, Maisie and dining, Renaissance VIPs/rushes, Sandy deluxe automation, Natalie’s wheelchair and longer two-tractor hayrides. It includes handover 45; use the correct patch base and preserve unpublished lead work.

**Contractor menu refinement:** [`docs/handovers/47-business-menu-refinement.md`](docs/handovers/47-business-menu-refinement.md) groups business management, adds guided cooking shortcuts and keeps live menus stable. It layers on completed handover 46 with no rule/save changes.

**Contractor home and hands-on play:** [`docs/handovers/48-home-and-hands-on-play.md`](docs/handovers/48-home-and-hands-on-play.md) adds optional Shane/Natalie control on the farm and in home rooms, twenty home-driven levels, v14 migration, usable furniture, home pets and cleanliness. The private estate retains its orbit/edit controls with an Enter home bridge; read the handover and [roadmap delta](docs/plans/home-play/ROADMAP.md) for art/control limits and final verification status.

**Contractor life-play:** [`docs/handovers/49-life-sim-control.md`](docs/handovers/49-life-sim-control.md) follows 48 with timed tool gestures, two-stick camera controls, home interactions and corrected owner walks. Read its integration and verification scope before changing these systems.

**Contractor control refinement:** [`docs/handovers/50-control-fit-and-sprite-can.md`](docs/handovers/50-control-fit-and-sprite-can.md) corrects the close indoor camera, oversized notification, right-thumb button placement and hold feedback. It switches watering to an illustrated can and makes release finish one use; this supersedes 49’s release-to-cancel behaviour.

Read this before changing anything in `voxel/`. It covers what the game is, how the code fits together, how to check your work, and the conventions the code follows. The player-facing overview is [`README.md`](README.md); the design source is [`docs/GAME-BIBLE.md`](docs/GAME-BIBLE.md).

**Codex's hayride (merged in 39):** [`docs/handovers/38-hayride-lead-integration.md`](docs/handovers/38-hayride-lead-integration.md) preserves Claude’s `1abaff5` maze update and isolates hayride audio from lead-owned runtime files.

**Latest contractor takeover:** [`docs/handovers/37-off-map-hayride-takeover.md`](docs/handovers/37-off-map-hayride-takeover.md) records the final off-map route, dark forest, scare cast, lightning, exact review scope and remaining checks.

**Contractor hayride increment:** [`docs/handovers/36-hollow-hayride-operational-expansion.md`](docs/handovers/36-hollow-hayride-operational-expansion.md) adds the operational woodland attraction on `contractor/hollow-hayride`, based on handover 35's `d98db59`. It records the provisional site's overlap with Claude's reserved layout, version-11 saves, queue/boarding/dispatch rules, upgrades and the free owner ride-along. Read it before changing those new modules.

## What this is

- **A voxel version of Shane & Natalie's Pumpkin Patch.** It is a cosy Halloween farm and shop game. Shane and Natalie grow pumpkins, neighbours buy them at the stall and inside Skyla's shop, and the takings go on upgrades, a four-room house, decor, books and costumes.
- **The main game lives at the repository root** (`src/`, a 2D canvas game). This build lives in `voxel/` on the `voxel-reference` branch, draft PR #2. It is a reference for art direction, staging and menu design, not a replacement. Nothing here should change the main game.
- **It ships as one offline HTML file,** `dist/pumpkin-patch-voxel.html`, with every asset inlined; see the latest delivery manifest for its current byte size. It runs from `file://` on a phone or a desktop.
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
| `node tools/perf.mjs [file.html]` | Plays a busy late-game farm and reports what it draws (lights, shadow passes, draw calls, triangles), its frame times, and every shader compile or large picture upload mid-play with where it came from. Same `CHROMIUM_PATH` as the smoke test. Build with `--readable` for function names |
| `python3 voxel/tools/bake_sprites.py` | Run from the **repo root**. Regenerates every baked asset from the main game's art. Needs Pillow and numpy and takes about 2.5 minutes. The output is deterministic |

CI (`.github/workflows/ci.yml`, job `voxel`) runs `npm ci`, `npm test`, `npm run build`, installs Chromium and runs `npm run smoke`, then uploads the HTML file as an artifact.

## Code map

| Path | What it holds |
| --- | --- |
| `src/model.js` | Builds the state (`freshState`), loads saves (`restoreState`, with migrations from version 1), strips what isn't saved (`saveData`), and runs one step of the rules (`update(s, dt)` returns events). Re-exports everything in `rules/` |
| `src/rules/farm.js` | Plots, the four varieties, upgrades, tapping, harvest streaks, helping hands |
| `src/rules/stock.js` | Stock counts, basket holds, and baskets (`chooseBasket` via `quoteBasket`: favourites first, then anything cheaper; a dear favourite doesn't end the visit), and which pumpkins are fresh (`s.fresh` batches) |
| `src/rules/market.js` | Fresh pumpkins and the wanted variety: `FRESH`, `WANTED`, `updateWanted`, `wishFor` (a keen guest's purse for one), `dearPrice` |
| `src/rules/orders.js` | Neighbours' orders: `ORDERS`, `ORDER_TRUST`, `updateOrders`, `fillOrder` (oldest pumpkins first), trust per regular |
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
| `src/content/maze-ride.js`, `src/rules/maze-ride.js`, `src/maze-ride-*.js`, `src/ui/maze-ride-ui.js`, `src/ui/maze-audio.js`, `src/ui/maze-ride.css` | The first-person Hollow House walkthrough (Codex's handover 29, rebuilt by Claude in 34). The route is built from rooms, and a distance-based timeline walks it (`buildMazeRideRoute`, `buildMazeRideTimeline`, `mazeProgressAt`). The rules hold the cues; the world builds the dressed chambers and their moving parts; the view handles the ride camera, pool lights, jolt and actors. The UI covers the briefing, pause and finish card plus the veil, chapter cards and idle bar, and there is its own synthesised sound. The owner's tour never touches tickets, visitors or the save |
| `src/rules/hollow-house.js`, `src/content/hollow-house.js`, `src/hollow-house-world.js`, `src/foyer-view.js`, `src/maze-effects.js`, `src/ui/hollow-sheet.js` | The Hollow House: restoration, foyer tiers and `foyerLayout` (with its `reserved` routes), tickets and maze guests, decor and finishes. The exterior and the foyer's fixed hall (runner, medallion, chandelier, maze door and sign); the foyer view with its lights, mist, host and guests; the five haunt installations |
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
  - `STATE_VERSION` is 14 (additive cooking, home-life and progression state; legacy saves migrate). `restoreState` must accept anything, including junk, older versions and missing fields, and return a valid state.
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

- **The farm has no point lights of its own.** Its lamps are positions (`lamps` in `scene.js`), lit by the rooms' pool of seven lights (`places.lightPool`), which go to the lamps nearest the view. Add a lamp position, not a `PointLight`. Changing how many lights or shadowed lights are visible recompiles every drawn material, so keep a light visible at zero brightness, or warm its variant as `warmShaders` does for the indoor key light (handover 40).
- **Hayride timings near a set are in units of lane.** Use `hayrideSpan(units)`, not a bare share of the loop, so they hold if the route changes length. The owner's ride-along lasts `HAYRIDE_PROPERTY.rideAlongSeconds`; paying guests' circuits last `circuitSeconds`, and a longer guest circuit costs the farm retail (handover 41).
- **Warm large pictures that appear later.** A texture uploads the first time it's drawn, stalling that frame by tens of milliseconds for a 1536×1024 picture. Pass it to `warm(texture)` in `scene.js` so it's sent ahead.
- **The wilds round the farm (`wilds.js`) must never hide it.** Anything h tall covers the ground `h * REACH_BACK` north of it on screen, so hills and trees near the farm stay low. Give any new ground the farm grows into a rect in `wildsFootprint`, and any new path off the map a road in `wildsRoads`, or trees grow on it.
- **The farm ground is built for one view.** `buildGround(..., { farmView: true })` drops the east, west and north faces, which the farm camera never sees. Don't use it for ground a turning camera shows.
- **Runtime art is WebP at the size it is shown.** The maze's scare actors and haunted girl ship as `.webp` (lossy colour, exact alpha, so `maze-ride-actor-meta.js` measures the same bounds), and its icon sheet is 384×256, since icons show at 26px. Three full-size PNGs had added 10 MB to the HTML. Add new runtime art the same way; keep full-size PNG concepts under `assets/*-concepts-*` or `docs/`, which the build doesn't bundle.
- **The walkthrough is timed by distance.** Read progress with `mazeProgressAt(config, elapsed)` and cue times with `mazeTimeAtDistance`, never `elapsed / duration`: the walk slows for scares and holds at the doors.
- **Chatters are excluded from arrival capacity.** A guest chatting in the meadow (`v.social`, `rules/meadow-chat.js`) has finished their visit: `visitorReservations` and `onThePath` skip them, and the stall loop hands them straight to `tickChat`. A chat starts only at `leaveAt`, after the maze-after roll, so add any new end-of-visit choice before that point. The meadow's news (`s.social`, `rules/meadow-talk.js`) is never saved; `recordNews` runs at the end of every `update`.
- **Dress the maze where the eye lands.** The walk looks forward, so a room's far side is rarely seen: put props on the near wall, overhead, on the end walls and in the corridors. Place them with `F.free`, which keeps them clear of the rail, and keep tier 5 under the world test's 40,000 boxes (about 33k now).
- **Foyer fixtures stay out of the player's way.** The runner and medallion lie inside `foyerLayout().reserved`. Haunts mount between y 2.4 and 4.85 and keep clear of the maze sign, the stair landing, the windows, the painting and the chandelier (`maze-effects.test.mjs` checks the bounds). A lighting finish recolours only `FLAME` glows.
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
- **Bonus guests are outside the farm's numbers.** Guests the hayride or Hollow House invite carry `bonus`; `visitorReservations` and `visitorWorldCount` (the 70 cap) skip them and anyone away on a ride, and `visitorTotalCount` against `VISITOR_TOTAL_CAP` (110) bounds everyone. A new attraction that brings guests should mark them `bonus` the same way, or it steals the farm's arrivals (handover 51).
- **Foreground portals stay low.** The hayride's return arch is in front of the camera: keep it under 4 units (the departure arch under 5.6), as `hayride-station.test.mjs` checks, or it becomes a canopy over the farm.
- **The smoke test does not build.** It loads `dist/pumpkin-patch-voxel.html` as it is; run `npm run build` first or it tests stale code.
- **The finish layer loads last.** `src/ui/polish.css` and `build-catalogue.css` come after every other sheet in `build.mjs`; restyle buttons and cards there rather than in an earlier layer it would override.
- **Helping hands rest in play mode.** `s.handsOn` (never saved) is set each frame from `scene.player.enabled`; `updateFarm` skips the helpers while it is true.
- **The owners' turnarounds are drawn smaller on purpose.** The side, back and action art has bigger heads than the front sprites, so `PLAYER_VIEW_SCALE` (`src/player-view-scale.js`) shrinks each view until it reads as the same person. `tools/measure_player_views.py` writes it: re-run it after re-baking an owner sheet or adding an outfit. `playerViewScale(id, view)` (`player-view-size.js`) sizes every view against the front sprite at its own size. Never mirror the front sprites: they're portraits of real people (handover 55).
- **Play mode turns a still owner to the camera.** The side and back walks have no idle, so after `SETTLE_SECONDS` standing still `player-control.js` shows the front sprite's idle. Pushing into a fence and being paused don't count as standing still.
- **Play mode's doorways are data: `playWays(state, place)` (`play-ways.js`).** Each way is a strip inside a doorway, a direction and an arrival. A new door, gate, stair or bought place needs a way there, both directions. Every arrival must land outside the strips of the place it reaches, which `play-ways.test.mjs` checks for every way. `main.js`'s `passThrough` runs the blur and the place change, and always ends with `player.arrive()`.
- **A reached level is kept.** `patchLevel` never goes below the highest claimed level, and saves without `pace: 2` have their claims checked against `LEGACY_LEVEL_AT`. In tests, reach a level with `LEVELS[n - 1].at`, never a hard-coded amount; the thresholds may move again.
- **A garden bed's crop lives on its placed piece** (`p.crop`, `rules/garden-crops.js`); `restoreEstate` keeps it through `restoreGardenCrop`. A new crop bed is a decor entry with a `crop` and a stage-aware model in `gardenExtra` (`house-estate-world.js`), whose four stages must all fit its footprint.
- **The carving session is state** (`s.carving.current`: shape, lid, scooped, stencil, cut, etched, free, lit, decor, name); `carving-view.js` only draws it and reads the tools. The pumpkin (`carving-pumpkin.js`) is rebuilt only when the view's key changes (variety, shape, stencil, cuts, etchings, freehand shapes, lid, lit, decor); the stencil's dots, grooves, peeled skin and ink are tiles laid on the rind, not rebuilds. Each variety's shape is worked out once per density and shape and kept. A new stencil's pieces must sit on the carvable face (|u| ≤ .72, -.66 < v < .62) and clear of each other, as `carving.test.mjs` checks; a new pumpkin shape must carry that whole area and the lid's ring, as `carving-pumpkin.test.mjs` checks. The bench owns the keyboard and the pad while it is open, except B, which the play controls send through `back()` (deferred, as closing renders and a render ticks the pad again); its Escape is stopped where it is handled, so one press never also leaves the garden.
- **Lit at the bench is two things:** the rules mark the session lit as "Light the candle" is pressed, but the view draws it lit only once the reveal's match is in (`shownLit`). `actions.light` therefore starts the reveal before anything renders. The finish card's photo is taken in `scene.js` after a frame is drawn (`carvingView.afterRender`), once the view has settled.
- **Prices are held, not tapped.** A `.purchase-button` with a £ in it buys only after a 0.45 s hold (`ui/hold-to-buy.js`, which blocks the plain click), by mouse, touch, keys or a pad. In browser scripts, hold the button until `.purchase-button.holding` clears (the smoke test's `buy()`); a Playwright `click()` only shows "Hold to buy". The sheet doesn't redraw while a hold runs.
- **Menus on a pad go through `ui/pad-menu.js`.** It finds the top menu by selector (`MODALS`, the hub, `PANELS`); a new menu needs its selector there, and `data-pad-default` on the choice the ring should start on. Sheets that work on the world in view (furnishing, shelves, the garden, the foyer) are `WORLD_MENUS` in `main.js` and stay at the side; the rest are centred over `#menu-scrim`.
- **The ride's breakdown is one clock.** `run.stallT` (seconds since the tractor stopped) drives the lamps and the dark (`stallLamps`), where the Hollow Man is (`hollowManPlace`) and the engine (`engineAt`), all in `hayride-stall.js`. Anything new that lights itself in the ride scene must dim with `dark` too, or it shows in the black: lamp glass is caught by `land.glows` and `rideGlows` only if it's a voxel `glow` block.
- **The tractor's sound is two halves.** `engineAt(pace, stallT)` says what the engine does (firings a second, level, misses); `ui/tractor-engine.js` only synthesises it from the recording's measured harmonics. Change the story in the first and the sound in the second; `status.engine` and `status.pace` carry it between them every frame.
- **The ride's sound has 22 voices** (`MAX_VOICES` in `ui/hayride-audio.js`); a cue past it is cut short. Play a run of many hits (footsteps, cracks, a gallop) through `pulses({ times, pans, ... })`, which is one voice, not a `voice()` each.
- **The Hollow Man's face is five petals.** A face voxel hangs on the `counter` joint of the petal `wedge(x, y)` gives, placed relative to that petal's hinge (`x - p.x, y - p.y`), or it won't open with the face. His stretching joints (`torso`, `neckSkin`, each arm's `upper` and `fore`) scale along their length: hang anything that mustn't stretch on the joint at their end (`chest`, `head`, `elbow`, `wrist`).
- **To shoot an exact moment of the ride in a browser**, hold its clock (`PumpkinVoxel.hayride.hold(true)`) and step it with `PumpkinVoxel.hayride.advance()`. Software WebGL draws about a frame a second, so otherwise the ride runs on between shots (`.ride-lunge-qa.mjs`). Don't freeze the page's own clock (`page.clock.install()`): screenshots then wait for a frame forever.
- **Sprite scares stand across the lane.** The maze's sprite cast on the hayride waits at `hayrideJumpSpot` (across from its set, 3.5 units on) and springs after the set's animatronics have played. Don't put a sprite back inside a voxel set; give new sets and props room round the jump spots (the forest and lanterns already do).
- **`walkTo({ x, z, near, reach, then })`** runs `then` on arrival; a walk held up against a big target within its `reach` arrives too. Give big targets a `reach` so they can be reached from any side.
- **`scene.player` is a spread of the player control.** A spread copies a getter's value once, so `enabled` and `passing` are redefined as live getters on it. Add any new getter there too, or it freezes (`enabled` once froze at `false`, and helping hands never rested).
- **The garden is its own scene.** Play mode's figure there comes from `garden-play.js`, which turns it to the garden's perspective camera each frame. `gardenGeometry` is its walk limits; give new garden decor a footprint in `ESTATE_DECOR` and it is walked round.
- **Where the owner can walk on the farm is `farmPlayerGeometry(state)`** (`player-control.js`): inside the fences, plus the truck's paving and the meadow once bought, round the cocoa kiosk. A new building, fence or bought area needs its block there, as `player-navigation.test.mjs` checks.
- **Spiders are rigs, drawn as one brood.** `hayride-spiders.js` poses plain Object3D joints, then `createBrood().sync()` copies their world matrices into two InstancedMeshes (bodies and eyes). Add a spider to the brood rather than building meshes per leg, and call `sync()` after posing.
- **Ride actors are drawn in world space.** A scene's brood (`hayride-sets.js`, via `createBrood`) must be added to the ride root, not the scene's own group, or its boxes are transformed twice. Actors with `animate(ctx)` get `{ time, near, ramp, wave, on, camera, forward, set }` every frame of the ride.
- **The ride camera's jolts line up with the roots.** `RUT_GAP` (`hayride-view.js`) spaces both the roots `buildRideLand` lays across the lane and the camera's jolts. `rootJolt(d, length)` jolts once per axle (`AXLES`), and `hayrideRoots(length)` says how many roots there are. The camera, the passengers, the bump sounds and the roots all use them, so change them together.
- **The ride starts through a hill.** `HAYRIDE_RIDE_HILL` (`content/hayride-layout.js`) is where `buildRideHill` raises it. The ground, the forest, the lane's lanterns and the leaves all keep out of that rect. Its bore uses `RIDE_ARCH`, which clears the tractor's 3.22-high canopy; the farm's lower `ARCH` would not. `hayrideUnderHill(x, z)` holds the director's gaze ahead inside it. Anything hung in the bore must stay out of the wagon's way, as `hayride-ride-feel.test.mjs` checks.
- **Close-set lamps in the ride get halos, not lights.** The lantern pool lights the first four lanterns in range, in route order. Several lamps close together starve it and make the lane's lights pop. Use `lampHalos` (`hayride-world.js`) for decorative lamps.
- **Each scene's centre belongs to its painted cast member.** `hayride-scares.js` stands a painted figure at each set's origin and lunges it towards the lane. Keep a scene's own actors off the set's x ≈ 0, and keep everything out of the wagon's space (`hayride-sets.test.mjs`).
- **The hayride's tunnels hide the convoy.** Its bores (`hayride-station.js`) are deep enough that the wagon is inside the hill before `hayrideFarmConvoyPose` hides it. If the departure or arrival distances change, keep the bores at least that deep. The hills' rects (`HAYRIDE_HILLS`) keep wild trees out.
- **Two `.stock-meter`s once collided.** The service menus' bar is `.supply-meter`; style.css's `.stock-meter` is the cart's. Check for an existing class name before adding one.
- **Favour portraits come from `favourFace(f)`.** It handles every guest kind, plus the couple's own favours. Money favours carry `money: true`, so their counts show as pounds.
- **Main-game imports:** the rules import from `../../src/content`, so the voxel build only works inside this repository layout.
