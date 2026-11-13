# 58 — Premium carving: high-density pumpkins, lid and seeds, etching, freehand, the reveal, a controller, and pumpkin shapes

Branch: `voxel-reference` (lead), following handover 57. The player asked:

- "Make the pumpkin carving even more premium feeling and creative, and high pixel."
- "Include controller controls for this mode."
- "Different pumpkin shapes, i.e. smooth round rather than orange segment like ones."

## High pixel (`carving-pumpkin.js`, new)

- **Density:** the bench's pumpkin is built at R 40 voxels either side of its middle (it was 22), about 3.3 times the voxels on its surface. Doorstep lanterns go from 11 to 16.
- **Hollow:** the pumpkin is a real shell, 3 voxels thick, round a cavity. Cuts go through the front shell into it, the lid lifts out of the top, and once lit the inside glows, brightest by the candle.
- **Meshing:** a build meshes only the faces that show, with baked shade in every corner, as the rooms' furniture does (`voxel-mesh.js`). Grooves, cut edges and the stem's foot darken by themselves.
  - It visits only the shell's voxels, not the whole block.
  - Each variety's shape (at each density and in each shape) is worked out once and kept.
  - A rebuild after a cut takes 20 to 45 ms on a desktop once warm, and a doorstep lantern about 8 ms.
- **Marks on the rind:** the stencil's dots, the knife's grooves, peeled skin and freehand ink are thin tiles laid on the rind's own voxels. They change as the tools move without a rebuild. The pumpkin is rebuilt only when a piece comes out, the lid comes off, an etching finishes or the candle is lit.
- **Sharper pixels:** the bench draws at a higher pixel ratio than the farm (`renderSizing`'s `close` flag in `render-quality.js`), with exposure 1.2.

## The bench, step by step (`carving-view.js`, `ui/carving-ui.js`)

Six steps: Pumpkin, Open, Stencil, Carve, Dress, Finish.

1. **Pumpkin:** a shape (see below) and a variety from the barn.
2. **Open:**
   - **The lid:** the knife runs round a dotted ring on the crown. When it's cut, the lid lifts off and rests on the bench.
   - **Scooping:** the scoop clears the stringy pulp from the cavity, reaching the walls from the opening, and seeds fly into the bowl.
   - **The seeds:** at 85% scooped, the pumpkin's seeds (4 to 6 by variety, `CARVING.seeds`) go to the kitchen's pantry while it has room. The rest sell at the market.
   - **Recipes:** pumpkin seeds are a new ingredient in two new recipes, Toasted pumpkin seeds (level 5) and Pumpkin seed brittle (level 8), each with its own food prop.
   - **Leaving early:** leaving before the lid is cut puts the pumpkin back in the barn; after that, it waits on the bench.
3. **Stencil:** a stencil book with tabs for Faces, Creatures, Pictures and Your own.
   - **Master stencils:** five, opening as lanterns are made: Harvest moon (1), Wise owl (2), Toothy jack (3), Haunted manor (4) and Spider's web (6). Locked pages say how many lanterns they need.
   - **Etching:** most master stencils have etched pieces as well as cut ones. They show in blue chalk.
4. **Carve:**
   - **The knife:** cuts along a piece's dotted outline; at nine tenths the piece pops out.
   - **The peeler:** scrubs an etched piece's area. At 85% its skin comes off for good, the flesh shows, and once lit it glows softly (cut pieces glow brightly).
   - **Freehand ("Your own design"):** any shape the knife closes is cut, up to 12. The path is thinned to at most 48 corners (`simplifyPath`) and checked (`freePieceOk`). A shape that isn't closed, or is too small, fades with a hint.
   - **Hold to trace (E, Space or A):** does the current job, whether running round the nearest outline, scrubbing the nearest etching or sweeping the scoop. It switches tool by itself when one tool has nothing left.
   - **Lighting:** "Light the candle" appears when everything is carved.
5. **The reveal:**
   - The work lights dim and a match is struck and lowered in through the top.
   - The candle catches, the lid lifts off the bench and settles back on with a glowing seam, and the view swings round to a three-quarter angle.
   - The pumpkin is drawn lit only once the match is in (`shownLit` in the view). That's why `actions.light` starts the reveal before anything renders.
6. **Dress:** candle colour, paint, hat, stand and extras, as before, now after lighting.
7. **Finish:**
   - **The photo:** a photo of the lit lantern, taken from the next settled frame (`photo()` / `afterRender`, called by `scene.js` after drawing).
   - **The name:** edited on the photo card, at most 24 characters (`cleanLanternName`), with a sensible default ("Moonlight grinning skull").
   - **Keep or sell:** keep it on the doorstep or sell it.
- **Value:** as before, plus £4 an etched piece and £3 a freehand shape (`lanternValue`).

## Feel

- **The saw:** a serrated carving saw that strokes in and out as it moves. Chips of rind and flesh spray off it, and the pieces tumble out and thud onto the bench.
- **Sounds (`ui/carving-audio.js`, new, synthesised):**
  - the saw's rasp, following speed, and the peeler's whisper;
  - the scoop's squelch and seeds ticking into the bowl;
  - a pop as each piece comes out, the lid lifting, and thuds as things land;
  - the match, the candle catching and a sparkle;
  - crickets in the garden.
  - All of it follows the sound setting.
- **Rumble:** a light buzz while a tool bites, and a firmer one as a piece pops or the lid comes off.

## The set and the light (`carving-set.js`, new)

- **The set:** a potting bench under a pergola in the garden at night.
  - festoon bulbs swagging between the posts;
  - a pegboard of carving tools and shelves of jars and gourds;
  - an enamel lamp behind the pumpkin;
  - the stencil book, the seed bowl, a steaming mug of cocoa and a spare pumpkin;
  - fireflies in the trees behind.
- **The lights:**
  - A work light from the front three-quarters models the pumpkin, the lamp and festoons warm it from behind, and moonlight rims it.
  - The candle's own light sits inside the pumpkin. It lights the inside and pools on the bench but never tints the rind: a green candle no longer turns a pumpkin green.

## Controller (and keyboard)

The bench plays fully on a pad; the play controls only handle B, through `back()`.

| | Pad | Keyboard |
| --- | --- | --- |
| Move round the panel | D-pad, or the left stick in the menu steps | Arrows / WASD in the menu steps, Tab |
| Select | A (✕) | E, Space or Enter |
| Move the tool | Left stick | Arrows / WASD |
| Do the job (hold) | A on the pumpkin, or X (□) any time | E or Space |
| Tool, or the tab / shape | LB / RB | Q / R |
| Zoom | LT / RT | `[` / `]` |
| Turn the view | Right stick | IJKL |
| Reset the view | Y (△) or R3 | C |
| Next step | Start / Options | Enter |
| Leave | B (○) | Esc |

- **The highlight:** a gold ring in the panel.
  - In the work steps, pressing the D-pad moves into the panel; moving the left stick goes back to the pumpkin, where A does the job again.
  - Each new step starts with the pad on the pumpkin if there's work, or on the panel's first choice if not. The way out is never the default.
  - After LB or RB, the highlight goes to the new tab's first choice.
- **Prompts:** the panel shows the step's controls in the pad's own buttons (DualSense or Xbox), or as keys. `glyphHTML` is exported from `ui/play-controls.js`, with the new bumper, trigger, stick, D-pad and Start glyphs.
- **Held buttons:** a button already held when the bench opened (the A that opened it) waits to be let go.
- **Checked** with a pretend pad, start to finish (see Checks).

## Pumpkin shapes (`content/pumpkin-shapes.js`, new)

- **The five:**
  - **Ribbed:** the variety as it grows.
  - **Round:** smooth and nearly spherical, barely striped.
  - **Tall.**
  - **Squat:** wide and flat with deep ribs.
  - **Warty:** lumps scattered over a rounder body, paler on top.
- **How they're made:**
  - Each shape changes the variety's form: height, lobes, groove depth, crease, squash, the dip round the stem, and warts. `shapedForm` in `pumpkins.js` merges the two.
  - `lobeShape` takes `warts` and returns `bump`, for colouring the lumps.
  - The grooves darken only as deeply as they run.
- **At the bench:** pick a shape above the barn's pumpkins. The cards preview it, and LB/RB or Q/R step through the shapes. The session and the finished lantern keep their shape, and the doorstep shows it.
- **In the patch:** each plot grows its own shape (`plotShape(i)`: mostly ribbed, with round, tall, squat and warty among them), so the field isn't all segmented pumpkins.

## Saves (`rules/carving.js`)

- **The session** now holds:
  - `shape`;
  - `lid` and `scooped`;
  - `etched` (etched piece ids);
  - `free` (freehand polygons, to three decimals);
  - `lit` and `name`.
- **A lantern** keeps `shape`, `etched`, `free` and `name`.
- **Older saves:**
  - A session from handover 57 (no `lid` field) that already had a stencil or cuts carries on with its lid and scoop done; an untouched one starts at the lid.
  - Bad shapes become "ribbed", and a freehand lantern without shapes is dropped.

## Checks

- **`npm test`:** 584 pass.
  - **`carving.test.mjs`**, rewritten for the new order: the lid and seeds (pantry or market), unlocks, etching, freehand limits and value, naming, every stage saving, round-57 sessions carrying on, and shapes.
  - **`carving-pumpkin.test.mjs`**, new:
    - every shape carries the whole stencil area and the lid's ring for every variety;
    - Round really is smooth and Ribbed grooved;
    - the heights run Tall > Round > Ribbed > Squat;
    - every shape builds its lantern, lid, chunks and patch pumpkin;
    - the patch grows all five.
  - **`cooking.test.mjs`:** 18 recipes.
- **In the browser** (headless Chromium, software WebGL), with no page errors:
  - full carvings start to finish: the etched owl, and a freehand face;
  - the whole bench played with a pretend DualSense pad: pumpkin, lid, scoop, stencil book tabs, carving, the candle, the hats tab, finish, keep, and B back to the garden with play mode still on;
  - the five shapes at the bench, and a ripe patch with its mix;
  - a phone size (390 × 844).
- **Smoke:** all 52 checks pass.

## Notes for Codex

- **Software WebGL is slow:** the view's time steps are capped at 0.1 s, so the reveal and held presses run several times slower there than in real time. QA scripts should wait on state, or count frames, rather than sleep.
- **The rebuild key:** the view rebuilds the pumpkin when its key changes: variety, shape, stencil, cuts, etchings, freehand shapes, lid, lit and decor. Anything new that changes the model belongs in that key.
- **Ideas:**
  - more master stencils;
  - a carving contest at the village fair (judged on difficulty, etching and dressing);
  - an album of lantern photos (the photo is 360 px JPEG, not saved today);
  - kept lanterns by the farm's stall;
  - R 32 for the bench on the Performance render setting.
