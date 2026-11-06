# 42 — Claude: hills, a treeline and fog round the farm

For Codex. Follows 41. Base your next branch on the head of `voxel-reference`.

The owner said the hayride station looked tacked on, with no natural treeline, and asked for hills round the borders that fade into dense fog so the void never shows. This is that.

## What it looks like

At the widest zoom, the farm now sits in an autumn wood:
- round autumn trees in the first rows;
- dark pines, autumn crowns and the odd dead tree over terraced hills;
- the guests' roads (the visitors' lane and the west lane south, the village road east) running on into the trees;
- once the hayride is bought, its track running north and south from the station into the wood.

Everything fades into the night sky's colour, so the far edge never shows. The lake backdrop is wider (x −70 to 100) and sits behind the hills on both sides. The station's tunnel mouths are now curtains of hanging leaves, darkest in the middle, with leaves along the beam.

## Where it lives

- **`src/wilds.js`:**
  - `createWilds(scene, state)` builds the wilds, and `sync()` rebuilds them when the farm's footprint changes (about 100 ms, on a purchase).
  - `scene.js` calls `wilds.sync()` each frame next to `farmExpansion.sync()`.
  - `wildsFootprint(state)` is where the farm's own ground lies: the rough grass round the first map, the yard as it is now, and the hayride station once bought. The wilds start beyond all of these, so before the hayride is bought, trees stand where the station will go.
  - `wildsRoads(state)` is where the roads run into the wilds.
  - `wildsHeight` gives the terraced hills: flat by the farm, rising to about seven units, rolling, and sloping down to the lake. Roads run level.
- **The fade** is a small shader patch (`hazy`) on the wilds' two materials. It mixes each pixel towards the night colour by its distance from the footprint (`WILDS.fade`: from 8 to 32 units out). The mix is applied after lighting, so the far edge matches the sky exactly in the glow pass. The uniforms update without a recompile, and the two materials are reused on every rebuild.
- **Cost:** the ground and trees are built in 26-unit squares, so the renderer skips squares out of view. At the default zoom on a busy late farm they add 25 draw calls and about 78,000 triangles a frame. The frame time stayed within the run-to-run spread in `tools/perf.mjs`. The trees cast no shadows.

## Rules to keep

- **Nothing in the wilds may hide the farm.** The farm camera looks north and down at `PITCH`, so a thing h tall covers the ground `h * REACH_BACK` units north of it on screen. Hills are lowered, and trees left out, wherever they would cover the footprint. Trees are checked across the width of their crowns (`CROWN`). A test checks every hill top and every tree box.
- **Add a footprint rect** to `wildsFootprint` for any new ground the farm grows into, and a road to `wildsRoads` for any new path off the map. Otherwise trees will grow on it.

## Verification

- **`npm test`:** 342 pass, with 2 new tests in `test/wilds.test.mjs`:
  - the wilds stay outside the farm at both stages, and the station's ground replaces the trees that stood there;
  - nothing hides the farm;
  - roads run level with no trees in them;
  - the box and square budgets;
  - the fade's colour and reach.
- **The station portal test still holds:** its leaves stay below four units.
- **`npm run smoke`:** all 48 checks pass.
- **Screenshots** at the widest zoom, the station, the south-west, the east and the north, on desktop and phone, with no page errors.
