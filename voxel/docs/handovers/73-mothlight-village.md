# 73: Mothlight Village, built in voxels (in progress)

Branch: `voxel-reference` (lead), following handover 72. Mothlight is the village the farm is invited to at level 3: a Halloween village of eight neighbours, inspired by cosy life-sim villages but with original characters, art and story. This handover records where it stands, how to see it, and the roadmap of what's left, so another session or Codex can pick it up.

The village is **not in the game yet**. Its rules and content are done and tested. The world is built and can be explored in its own page (below). Getting there from the farm, play mode, Elowen's arrival and the village's menus come next.

## What the player asked for this round

- A village, opening at level 3, where an NPC arrives and gives a grand tour. It should have neighbours with dialogue, quests, friendship, shops, rewards and decorating, a Map tab and a path tool.
- Dark sky and pumpkin spooky vibes. More detail: impressive buildings, and more texture on the main tree.
- A stick-controlled cursor: click a thumbstick to bring it up, ✕ to select, ○ to go back, and well drawn (task #182, not started).
- Play-mode sprites in proportion to the world, and a village that feels alive and huge: birds that fly and land, squirrels, no sparse areas, no flat buildings, nothing that looks unfinished.
- A bigger world with verticality (stairs and slopes between areas), after the early concept art.
- Homes you can walk into, and neighbours who follow you on their quests (task #183, not started; Codex will draw NPC sprites).
- Grass with a slight 3D effect that doesn't lag. Fairy-light wires that look like smooth cables.
- No stray voxels. Subtle distance fog. Districts further apart. Nothing standing on the paths.
- An old gothic bat- and vampire-themed tavern with an NPC host, highly detailed: the Velvet Bat and Vesper.
- A visual fidelity reference: the concept painting of the whole village at dusk. Colourful purple, magenta and gold trees; a cobbled round plaza; knot gardens with fountains; half-timbered cottages with lit windows; ivy on stone walls; arched culverts with waterfalls; the lighthouse spire, gothic manor, striped tents, Ferris wheel and market stalls; a twilight sky.

## Where it stands

| Step | State |
| --- | --- |
| V1 Pace: a longer road to level 3 | Done (`335bc5a`): about twice as long, keeping every level already reached |
| V2 Rules and content | Done (`a8f17fd`) and tested: friendship to 10, chats in three tones, gifts, favours, quests, gathering nodes, Rowan's stall, decorating on the Green |
| V3 / V3b The world in voxels | Mostly done (`82ced1b` and later pushes). The terraced valley has:<ul><li>five districts apart from each other, with woods between them;</li><li>the Moth Tree, the knot gardens, the homes and the venues;</li><li>the Velvet Bat;</li><li>Lantern Night lighting under a twilight sky;</li><li>the Moor's fair (a Ferris wheel and a market row);</li><li>the Quarry's ivy and culverts;</li><li>life and grass.</li></ul>Follow-ups are in the roadmap |
| Explorer page | Done (this push): `node build.mjs --village`, see below |
| V4 Residents' animation | Partial. Elowen and Rowan have jointed rigs that idle, talk and wave; the other six (and Vesper) stand posed |
| V5 In the game: getting there, play mode, picking, the tour | Not started. The view has a camera, a following play camera and a tour director whose keyframes are now out of date |
| V6 Elowen's arrival at level 3 | Not started. The rule (`inviteToVillage`) exists |
| V7 Village UI | Not started. Conversations, journal with a Map tab, path tool, decorating (Remove, Cancel, Undo), Rowan's stall |
| V8 Docs, verification, delivery | This handover is the first part |

## How to see it

- `node build.mjs --village` writes `dist/mothlight-village.html`, one offline file of about 18 MB. Open it in Chrome on a phone or desktop.
- **Looking round:**
  - Drag to turn, pinch or scroll to zoom, and use two fingers or the right mouse button to pan.
  - The chips jump to the Green, the Moth Tree, the Velvet Bat, the Copse, the Quarry, the Moor, the Marsh and the whole valley.
- **Walking:**
  - **Walk** puts Shane (or Natalie, on the next chip) on the avenue at true size: 2.3 units tall, as in play mode.
  - On a touch screen, the left of the screen is a stick and the right turns the camera.
  - On a keyboard: WASD or the arrows walk, Shift jogs, Q and E turn, and Space toggles walking.
  - On a pad: the left stick walks, the right stick looks, L1 and R1 zoom, and ✕ jogs.
  - There are no collisions yet; you can walk through things.
- **People:**
  - **Everyone** shows the residents of districts that aren't open yet. In the game they wait out of sight until their district opens.
  - Tapping a neighbour shows their name, role and a greeting, and they wave.
- **QA scripts** (in `dist/qa`, not committed):
  - `explorer-check.mjs [outDir] --places=green,bat,walk,valley` shoots the explorer and reports page errors.
  - `village-shots.mjs` and `village-preview-entry.js` are the older bare preview, with `shot`, `look`, `stand`, `stats` and `frameStats`.
  - Launch Chromium with `executablePath: "/opt/pw-browsers/chromium"` and software WebGL. It manages about one frame a second, so wait.

## How the village is laid out

- **Two grids.**
  - Everything in `content/` and `rules/` is in **world units**: rules, quests, decor, resident spots and `FIXTURES`. The owners are 2.3 tall there.
  - The static village is drawn on a **design grid** and the view scales it up by `PLAN_SCALE` (1.5) in one `root` group. In `village-world.js`, `dv(n)` reads world units back onto the grid.
  - Things that stand in the world itself sit outside `root`: residents (`FOLK_SCALE` 1.15), decor, letter pages and the sky.
- **Districts are drawn in their own place, then moved** (`DISTRICT_SHIFT` in `content/village.js`):
  - copse `[-30, 14]` (north-west, on a wooded shelf);
  - quarry `[0, 20]` (north, an island in a moat);
  - moor `[44, 4]` (east, raised, with the manor on its crag);
  - marsh `[0, 34]` (beyond the Quarry, low and wet).
  - `content/village.js` shifts plots, nodes and bridges with `sh` and `shBox`. `buildBeyond` gives each district a `district(d)` writer set (`R`, `fr`, `road`, `dx`, `dz`), so its models are written in local coordinates.
  - Roads (`ROADS`) and gates (`GATES`) are written in absolute grid coordinates. Inside `buildBeyond`, stand absolute things with `at(v, x, z)`; `fr` there belongs to a district.
- **Terrain** (`village-terrain.js`, pure):
  - `TERRACES` are flat shelves at set heights. `RAMPS` are stone stairs between them. `WATERS` are the moat ring and the Marsh.
  - `REALM` is the valley. Hills rise beyond it, and `ROLLS` are low rises in the woods between districts.
  - `terrainHeight(x, z)` gives the height anywhere on the grid, and play mode and tests can ask it. `isWater`, `islandAt`, `terraceAt` and `rampAt` answer the rest.
- **The Green** sits at height 0 round its round square (`SQUARE`, r 8.8), with the Moth Tree at its heart (58, 24.6 on the grid).
  - The avenue runs south to the moth gate and the carriage. The knot gardens with their fountains line it.
  - Elowen's and Rowan's homes are west and east of the square.
  - Your reserved plot R1 is in the south-west, the corn rows and the pumpkin patch are to the south, and the moth-yard and pond are in the south-east.
  - The **Velvet Bat** is east, at (102, 24.4) facing the Moor road.

## Code map (village)

| Path | What it holds |
| --- | --- |
| `src/content/village.js` | Layout in world units: `PLAN_SCALE`, `DISTRICT_SHIFT`, districts and their levels (Green 3, Copse 6, Quarry 9, Moor 12, Marsh 15), plots, nodes, roads, gates, `FIXTURES`, `SCENERY` (keeps decor off fixed things), residents, bond tables |
| `src/content/village-folk.js` | The eight residents as people: tone, loves, likes, dislikes, greetings, gift lines, chats by band, rewards per friendship level. `HOSTS`: Vesper, who keeps the Velvet Bat (greets and talks, no friendship track) |
| `src/content/village-quests.js`, `village-decor.js` | Quests and their steps; the village's decor catalogue; `STORY_OBJECTS` (the letter pages) |
| `src/rules/village.js` | Pure rules: invitation, meeting, chats, gifts, favours, quests, nodes, store, stall rotation, decor placement (`fits` against `SCENERY` and the plots), `districtOpen` |
| `src/village-terrain.js` | The terraced ground (above) |
| `src/village-models.js` | Every model as a function of a writer (`f.block(x, y, z, w, h, d, colour, glow)`): lamps, trees (canopy, autumn, pine, twisted, spooky), walls, cottages (tiled roofs, `shabby` until restored), townhouses, the Moth Tree, venues (studio, tavern, big tent, caravan, manor, stilt hut), the **Velvet Bat** (`velvetBat`), Halloween props and the festoon with cable points |
| `src/village-world.js` | Builds the village from the layout: ground texture and heightfield, paving, water, terrace works (walls, stairs, the bridge), the Green, the districts, the horizon and sky, mist. `grassAt` (where grass grows), `LAMPS` (lamp heads for the light pool), `LAYOUT_DESIGN` (what life animates) |
| `src/village-view.js` | The scene: fog by mode (`REACH`), moonlight with shadows every other frame, a pool of 8 warm lights moved to the nearest lamps, the camera (orbit, `cameraActions`, a following `play` camera that climbs terraces when given `y`), the tour director, tap picking (`hooks.onPick`), patch culling |
| `src/village-folk.js` | Residents in voxels (`DESIGNS`, `makeResident`), where each stands (`residentSpot`, `talkSpot`, `HOSTS`), moods (talk, wave) |
| `src/village-life.js`, `village-bats.js`, `village-grass.js` | Life: fountains, waterfalls, moths, leaves, chimney smoke (one draw of points), crows that fly between perches, an owl, squirrels, the spire's beam, the wheel, fireflies; instanced bats; instanced grass tufts with wind and flowers |
| `src/village-explorer.js`, `village-explorer.html` | The explorer page (above) |
| `test/village.test.mjs` | Rules and layout tests, in world units |

## Rendering and performance

- **Batching and culling:**
  - The static village is built in `ChunkedVoxels` (`voxels.js`): squares of ground, each its own meshes, so frustum culling and the haze cull work.
  - Patches beyond `REACH.far` (400 looking, 250 in play) aren't drawn, and the haze (`FogExp2`) hides the edge.
- **Lights:**
  - Never add or remove lights at runtime: the pool of 8 point lights moves to the lamps nearest the focus, as on the farm.
  - Glowing voxels are built with `glow: GLOW` (1.6) so the bloom catches them. Keep lamp glass small or it blows out to white squares.
- **Flocks and smoke:** bats, crows and grass are instanced; smoke is one `Points` draw.
- **Last measured** (before the districts moved apart): about 211 draw calls and 1.59M triangles from the Green. The farm's budget is about 200 calls and 1.18M triangles. Re-measure after the woods go in (`frameStats` in the preview).

## Gotchas

- **`LAMPS` order matters.**
  - `buildGreen` draws `LAMPS.slice(0, 4)` (the square), `slice(4, 8)` (the avenue) and `slice(10, 16)` (the cross road).
  - The life layer puts moths round the first 10.
  - Append new lamps at the end.
- **Keep grass and trees off new things.** Anything new on the Green needs:
  - a rect in `NO_GRASS`;
  - a clause in `buildGreen`'s `keepClear`, so trees and the flower scatter keep off;
  - a `SCENERY` entry (world units, via `box`), so decor can't be placed on it.
- **Chimney smoke comes from marks, not a list.** A model notes its chimney's top with `f.mark?.("smoke", x, top, z)`. `chimneyStack` does this, as do the inn, the manor, the caravan and the Velvet Bat.
  - `frame`, `realm`, `onGround`, the districts' writers and both voxel classes pass marks through.
  - The built group carries them (`userData.marks`), and the view hands them to the life layer.
  - Give any new chimney a mark, and use the same mechanism for anything else the life layer should find.
  - The two homes that change (Rowan's workshop and Elowen's conservatory) keep their smoke in `village-life.js`.
- **District things in the life layer are written in the district's own place plus `DISTRICT_SHIFT`.** This covers the beam, the wheel, the fireflies' Copse zone, the bat flocks and the Moor's grass clearings. Keep doing it that way, so moving a district moves them.
- **Falls point any way.** Each entry in `FALLS` has `nx`, `nz` (which way the water leaves) and `w` (its width). Two are the cliffs'; two are the culverts in the Quarry's south face.
- **The woods (`buildWoods`) grow on open ground only.** They keep off terraces, ramps, water, the Green, roads (by 2.8) and gates. Something new on open ground needs its own rule in `clear`, or trees will grow through it.
- **Festoons in a district take absolute coordinates through `base`**, never the district's `R`: that writer moves them again (the Moor's bulbs once hung in the woods). Their cables take absolute coordinates too.
- **Hosts are not residents.** Vesper is in `HOSTS` (content and view), not `RESIDENTS` or `FOLK`, so the friendship rules and tests are untouched. The view lists hosts after the residents.
- **The explorer is not the game.** It builds its own state (level 3, invited) and never saves.

## Roadmap and open tasks

In order. Each item says what done looks like.

1. **Finish the separated districts** (V3c).
   - **Done in this round:**
     - the woods, road lamps and a signpost;
     - chimney smoke from marks;
     - the life layer, bats and grass moved with their districts;
     - the tour re-planned.
   - **Nothing on the paths.** Check every road and stair for props, trees and lamps standing on them. Add a test over `ROADS` against the built boxes if it can be made cheap.
   - **Re-measure the cost with the woods in.** There are about 550 trees in 23k boxes. Use `frameStats` from the Green and from the valley, and cull woods patches harder in play mode if it's over the farm's budget.
2. **Fidelity pass against the reference** (task #185).
   - **Done in this round:**
     - violet, magenta and teal crowns, on the Green and in the woods;
     - a twilight band with rose clouds;
     - ivy on the walls and cliffs, and flowers along the walls' tops;
     - arched culverts with falls into the moat;
     - the Velvet Bat's crimson glass shown and its front lit;
     - the Ferris wheel rebuilt;
     - a striped market row.
   - **Still to do:**
     - lit windows and flower boxes on every cottage;
     - the Moor's open ground west of its road (a carousel, hay bales, bunting);
     - the Marsh's banks;
     - the cottages' gardens in the Copse.
   - Done when side-by-side shots of the Green and the valley read as the same place as the painting.
3. **The Velvet Bat and Vesper.**
   - Vesper's chat in the village UI (V7), using `HOST_BY_ID.vesper.greet`.
   - Its interior when homes open (#183): a bar, booths, candles, a hearth, bats in the rafters and the crypt cellar.
4. **V4: residents' animation.** Jointed rigs for the six posed residents and Vesper: idle, talk, wave, walk. These stand in until Codex's sprites arrive. If the sprites come first, use them through `spriteActor`-style billboards at 2.3 units.
5. **V5: the village in the game.**
   - Travel by Elowen's carriage from the farm and back (`ARRIVAL`).
   - Play mode in the village:
     - walking on `groundAt`;
     - collisions with buildings, water and walls (a footprint list, as `farmPlayerGeometry` does on the farm);
     - the following camera (`view.play`, which now climbs terraces);
     - tap to walk, picking neighbours and nodes.
   - The tour director, and pad controls as on the farm.
6. **V6: Elowen's arrival at level 3.** She comes to the farm with the invitation, the carriage is waiting, and the tour plays (`finishTour`).
7. **V7: the village UI.**
   - Conversations with tone choices.
   - Gifts, friendship and rewards.
   - A journal with quests and a Map tab, plus a path tool.
   - Rowan's stall.
   - Decorating with Remove, Cancel and Undo.
   - Controller support throughout (`ui/pad-menu.js`).
8. **#182: the stick cursor.**
   - Clicking L3 or R3 shows a pointer.
   - The stick moves it with acceleration, ✕ selects and ○ goes back.
   - It works over menus and the world, and is TV-mode zoom aware.
   - It is well drawn: a soft glow ring with a moth-wing tip.
9. **#183: homes you can walk into, and neighbours who follow you on their quests.**
   - Interiors as `places.js` places, with doors as `playWays`.
   - A follower trails the owner at a step's distance during their quest.
10. **V8: verify, document and deliver.**
    - npm test and the smoke test.
    - Phone and TV shots of the village.
    - README and AGENTS.md updates.
    - The PR body.
    - The game's HTML with the village reachable.
11. **Older open tasks:** #126 the hayride's overworld site and upgrades, #127 farm skins with a makeover, #128 overworld density and spookiness, and #156 the partner roaming and picking litter, borders and signs.

## Verification for this push

- **`npm test`:** 755 pass.
- **The explorer**, shot in headless Chromium:
  - The Green, the Velvet Bat, walking on the avenue and the whole valley all render.
  - No page errors.
  - This also caught a `fr is not defined` in the districts' gates, now fixed (`at(v, …)`).
- **`npm run build` and the smoke test:** run before pushing, unchanged game.
