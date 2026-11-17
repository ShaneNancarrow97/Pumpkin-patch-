# 64 — Codex's house items integrated, easy moving, premium household art, and Maisie's kitchen dressed

Branch: `voxel-reference` (lead), following handover 63. The player asked:

- "Codex has pushed lots of new stuff, I want you to look at the new voxel house items, fix some of the movement quirks, easy drag around to different walls etc. Increase premium look to the voxel art. Make Maisie's cooking UI look even better including the physical shop. Read roadmap and handovers."

## Codex's work, brought in (`e2228f1`)

`contractor/home-customisation` (`46729d4`) was fast-forwarded onto `voxel-reference`. It holds:

- The personal farm skills (`2b50fa3`, `5095147`, `87714df`, see `docs/contractor-patches/boost-helping-hands/`).
- Thirty-six native household pieces (`household-props.js`).
- Wall placement on the back, left and right walls (`wall-drag.js`, `rules/wall-placement.js`).
- Room expansion, home media, and the simplified cooking and stock flow.

Two things needed fixing on the way in:

- **Hold to buy is gone.** Codex's commit took out hold to buy and its Settings switch: a price buys with one tap. The smoke test's `buy()` now taps once (two taps had bought two tiers), and AGENTS and the README say so. **It's easy to bring back if the player wants it.**
- **The garden icon atlas** was a 4 MB PNG inside the HTML. It's now `assets/home/garden-icons.webp`, 168px cells for icons shown at 84px (0.6 MB). The PNG is kept as `garden-icons-concepts-source.png`, which the build doesn't bundle.

Codex's other branches are plans or labs, not live code:

- `plan/achievement-ledger` and `art/mothlight-village-concepts` are design documents.
- `contractor/mothlight-game-ui` is an optional purple-parchment skin.
- The festival and late-game labs are isolated.

## Moving things (`2e84968`)

A browser run (`dist/qa/house-drag-qa.mjs`) dragged pieces round the parlour with a real mouse and a phone-sized screen. It found these quirks:

- **A drag that ended anywhere blocked was thrown away.** That covered a window, a doorway, a column, the stairs, the floor and the space above a wall. The piece went red and jumped back to where it started.
- **Arrows stopped dead** at the first thing in the way, and at a wall's end.
- **The parlour's right wall is all staircase**, so "drag to the right wall" could never work there.
- **To move a piece you had to select it, then drag it.** Pressing another piece while arranging only selected it.
- **On a phone, dragging along the room halved it.** The room camera framed a fixed stretch round the room's middle, so it backed away (26 to 51 units) as you panned.
- **A drag couldn't reach a part of the room off screen**, as nothing scrolled.
- **The red outline was hidden** behind door frames and stairs.
- **The pad showed the code name**, "household wall television · 0°", where it should name the piece.

What changed:

- **Nearest clear spot** (`nearestSpot(s, p, target)`, `rules/house.js`):
  - A drag, or a tap in Move mode, lands at the clear spot nearest the finger, within `NEAR_REACH` (1.6 units).
  - The target is clamped to the room or wall first, so a piece dragged past an edge pins there.
  - It searches a coarse ring (0.2) and then refines it (0.1).
  - With nothing clear in reach, the piece waits at the last clear spot it passed, and a red outline shows the finger. Letting go puts it where it waits.
  - A cancelled gesture still puts it back.
- **Arrows hop, and wall pieces turn corners** (`stepDecor`):
  - One press is a 0.1 step that hops past whatever is in the way: up to four units on the floor, or the whole wall.
  - Left and right are as the camera sees them: on the left wall right runs towards the back, and on the right wall towards the front.
  - Past a back corner a wall piece carries on onto the next wall. The open front goes nowhere.
- **The turn buttons, and L1/R1, move a wall piece to the next wall** (`hangOnWall`). It comes in at the corner it shares with its old wall, at the same height, as near that corner as it fits. The piece bar's Left, Back and Right buttons use it too.
- **Press any piece and drag** (`scene.js` `grab`, `main.js` `grabPiece`): while a piece is selected, pressing another and moving picks that one up. A tap still just picks it, or puts a small piece on it.
- **Edge pan**: on a phone, a piece held at the canvas's left or right edge slides the room along, as far as a normal drag along the room goes. The piece keeps up.
- **The phone room keeps its size** (`frameRoom`): the framed stretch slides with the camera, so panning to the end of a room no longer halves it.
- **The red outline shows through** door frames and stairs (`depthTest` off, with a soft fill).
- **The pad names the piece** and its wall or turn: "Haunted wall television · left wall".
- **Speed:** `fits()` now tests bounding boxes before the exact overlap. A drag asks it up to about 200 times a move, and a floor check fell from about 40 to a few microseconds.

**Tests:**

- `test/house-easy-drag.test.mjs` (new): sliding to a neighbour, pinning at edges, null with nothing in reach, the floor hop's limit, a doorway hopped, corners in both directions, hanging on another wall, and the box pre-test agreeing with the full check.
- `test/home-wall-controls.test.mjs`: Codex's "an invalid drag restores the pose" test now expects pinning, waiting at the last clear spot by a door and cancelling back, and a new test covers corners and the turn buttons.

## The household pieces, premium (`2e84968`)

- **Finish** (`finishGrid`, `household-props.js`), on all 36 pieces after modelling:
  - top edges catch the light (×1.1, metal ×1.2);
  - bottom edges sit a little darker;
  - enamel, wood and cloth take a soft mottle in blocks of four voxels, so faces still merge.
- **Metal** (brass, gold, copper, silver) gets fine brushed streaks and goes to its own satin material, `VOXEL_METAL` (roughness 0.4, metalness 0.28). `meshGrid`'s new `only` mask splits one grid between two materials: hidden faces and corner shading still see every voxel.
- **Twice the detail for small things**: a piece no bigger than 0.65 units is built at 80 voxels to the unit (`FINE`). Mugs, figurines, the kettle and the phone are now about 24 voxels across, not 12.
- **Remodelled:**
  - **The cat**: a sitting moon cat on a walnut plinth, with ears lined in plum, glowing amber eyes with slit pupils, a collar and bell, and a tail curled round its paws.
  - **The jack-o'-lantern**: carved right through, with a glowing hollow behind the eyes, nose and grin, darker grooves, a stem with a curl, and a leaf.
  - **The kettle**: a swan-neck spout, an arched handle with a walnut grip, and brass bands.
  - **The knife block**: a moulded walnut block with fanned knives on brass bolsters.
  - **The laundry bottle**: turned plum glass with a moth label.
  - **The bookend**: a copper crescent with a sleepy eye and a hanging star.
- **The bath's cream lining** no longer pokes through its tapering copper sides.
- **The catalogue icons** (`assets/household-thumbs.webp`) are re-rendered from the new models (`tools/render-household-thumbs.mjs`; set `CHROMIUM_PATH`).

## Maisie's kitchen and the food truck

**The sheet** (`ui/cooking-sheet.js`, `ui/cooking-simple.css`):

- **Header**: a lit menu-board header, with Maisie's portrait in a brass ring and the Truck (or Shop) button in the same row. The status dot pulses while something cooks.
- **What's cooking**: on every tab but Cook (which has its own card), a strip shows each running job. It gives the dish, where it's cooking, the batch, the time left for the whole run and a bar that fills. The bar moves in 2% steps, so the sheet redraws sparingly.
- **The selected tab** glows, the chosen dish sits in a warm spotlight, and an ingredient chip you're short of turns amber.
- **A Cook button that can't be pressed** stays legible, dashed rather than faded. Its reason shows, and during a tea break there's a "Carry on" button.
- **Recipe tiles** sit on a plate of light and lift on hover. Their badges are coloured by readiness.
- **The upgrades** (Progress) are cards, each with a picture, tier pips and the price.

**The truck** (`cooking-world.js`):

- festoon bulbs sagging along the awning;
- a warm strip light inside the hatch;
- a chalk menu board under the counter;
- produce crates and a cider barrel at the left end;
- a jam-jar lantern on each table;
- a string of lights from the cab out over the tables to a post past the last one.

The string of lights adds a second lamp position (`tableLamp`), so the light pool lights the tables. It's a position, not a light of its own. `cooking-world.test.mjs` expects two lamps.

## Checking

- **688 unit tests pass.** New or changed:
  - `house-easy-drag.test.mjs` (new);
  - `home-wall-controls.test.mjs`;
  - `cooking-world.test.mjs` (two lamps).
- **The smoke test passes 54/54.**
- **Browser checks** (in `voxel/dist/qa/`, ignored):
  - `house-drag-qa.mjs`: wall and floor drags, with `PHONE=1` for a phone with edge panning;
  - `phone-pan-qa.mjs`: the room's distance as a phone pans;
  - `house-art-qa.mjs`: the pieces in a lit parlour;
  - `household-gallery.mjs` and `household-closeup.mjs`: model sheets;
  - `cooking-ui-qa.mjs`: the sheet's tabs and the truck, with `KNOWN=1` for recipes and a job.

## Not done yet

As in 61 to 63:

- **The farm round:**
  - skins with a makeover transformation;
  - density, farm character and spookiness;
  - the hayride station's look on the farm.
- **The tractor engine on the farm.**

New:

- Wall pieces can still sit up in a styled room's cornice: the rules allow the full wall height.
- The toilet and pedal bin could take the same remodel as the small pieces.
