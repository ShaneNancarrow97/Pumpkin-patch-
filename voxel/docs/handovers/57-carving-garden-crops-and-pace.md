# 57 — Pumpkin carving, garden crops and decor, smoother play mode and a slower pace

Branch: `voxel-reference` (lead), following handover 56. The player asked for:

- more garden decorating, and planting berries and things;
- more seamless play-mode controls, with premium UI and mechanics;
- longer between levels;
- a pumpkin carving simulation: a bench that opens an up-close carving you can orbit, stencil, cut out and decorate.

## Pumpkin carving (`content/carving.js`, `rules/carving.js`, `carving-view.js`, `ui/carving-ui.js`, `ui/carving.css`; all new)

- **The bench:** "Pumpkin carving bench", a garden piece (£180). Tap it in the garden, or walk up to it in play mode and press the action button.
- **The flow:** five steps (Pumpkin, Stencil, Carve, Decorate, Finish). The panel sits beside the close-up on wide screens and as a sheet at the bottom on phones. The view is framed round it (`setInset`).
  1. **Pumpkin:** one from the barn, of any variety in stock (`startCarving`).
  2. **Stencil:** eight stencils with one to three stars of difficulty. Their preview art is drawn from the stencils' own polygons (`stencilArt`). The stencil can be swapped until the first cut.
  3. **Carve:** the stencil lies on the rind as dotted outlines.
     - **Cutting:** drag the knife along a line, and the cut part turns dark. When nine tenths of a piece's outline is cut, the piece pops out. The pumpkin is rebuilt with the hole lit from inside, and the rind the piece took tumbles off onto the newspaper with sparks.
     - **Turning:** drags off the pumpkin turn the view, as does the Turn tool.
     - **Trace for me:** holding "Hold to trace", E, Space or A runs the knife round the nearest uncut outline.
     - **Keys and pad:** arrows or the left stick nudge the knife; IJKL or the right stick turn the view; `[` and `]` zoom; Esc or B leaves.
  4. **Decorate:** candle colour (candlelight, witch green, ghost blue, spell purple), paint (natural, ghost white, midnight, slime), a hat (witch's hat, top hat, velvet bow, gold crown), a stand (hay bale, stone plinth) and any of the extras (autumn leaves, a pet spider, neck bolts, tea lights, glitter).
  5. **Finish:** keep the lantern on the doorstep (eight at most; the oldest makes way), or sell it at the village fair.
- **Value (`lanternValue`):** three times the pumpkin's price, plus £12 a star and £6 a decoration. An orange classic sells for about £50; a dressed Starlight skull for well over £250.
- **Leaving early:** before the first cut, the pumpkin goes back to the barn. After it, the half-carved pumpkin waits on the bench (`s.carving.current` is saved).
- **The pumpkin (`pumpkins.js`):**
  - `carvingPumpkin(variety, { cut, glow, paint, chunk })` builds the variety's own lobed shape at carving density (R 22, about 4,000 boxes).
  - `lobed` now shares its shape test (`lobeShape`) and takes `glow` for coloured candlelight and `chunk` to build only the rind a piece takes.
  - `carvingSurface` finds the front of the rind, for laying the stencil and the knife on it. The pointer hits an invisible height field of that surface.
- **The doorstep:** kept lanterns stand either side of the house steps (`lanternSpots` in `play-ways.js`), beyond the porch's own pumpkins. Owners walk round them.

## Garden crops (`rules/garden-crops.js`, new)

- **Four new beds**, all garden pieces:

  | Bed | Price | Grows | Time |
  | --- | --- | --- | --- |
  | Bramble berry patch | £160 | 3 berries | 2 min |
  | Witch's herb planter | £120 | 3 herbs | 80 s |
  | Kitchen vegetable bed | £220 | 3 vegetables | 2.5 min |
  | Crab apple tree | £480 | 4 apples | 4 min |

- **Tending:**
  - Plant a bed, then water it once to cut 40% off what is left (`GARDEN_WATERING`). Pick it when it is ripe.
  - A bed is drawn at its stage: empty soil, sprouts, growing, then ripe.
  - Picking puts the crop in the kitchen's pantry while it has room. The rest sells at the market for its delivery price.
  - In play mode the owner plants, waters and picks with the same gestures as at the patch. Out of play mode, a tap on a bed does the same.
  - Beds keep their crop on their placed piece, so storing a bed clears it and moving it keeps it.
- **Berries** are a new pantry ingredient (also deliverable). They go into two new recipes: Bramble crumble (level 6) and Bramble and apple pie (level 9), each with its own food prop.

## More garden decor (`house-estate-world.js`)

- **New pieces:** hay bales and gourds, family gravestones, an owl perch, a bubbling cauldron, a moonlit picnic table, a lantern garland and a lily pond. Each is fully modelled and has a catalogue drawing.
- **Catalogue cards:** a bed's card says what it grows and how fast; the bench's says it opens carving.
- **Taps in the garden:** a bed or the bench tapped outside play mode is tended or opened rather than picked up. Move them from Garden › In garden.

## Smoother play mode

- **Floating prompt:** a prompt floats over whatever the action button would act on, with the button's glyph ("E · Pick 3 berries"). It is drawn from `scene.player.targetAt()`.
- **Tap to walk and act:** tapping a plot, a piece of furniture, or a garden bed or bench walks the owner over and does it there. It used to say "Move closer". `walkTo` takes `near`, `reach` and `then`. A walk held up against the thing itself, within reach, counts as arriving.
- **Reach:** big garden pieces carry their own `reach`, so they can be reached from any side, corners included.
- **Arrange** is hidden in the garden; it is for furniture.

## A slower pace (`rules/levels.js`)

- **Thresholds:** each level asks for two to three times the earnings it did; level 20 is at £3.4M (was £1.6M).
- **The life simulation (`sim-life`, full scenario):**

  | Level | Was | Now |
  | --- | --- | --- |
  | 5 | 11 min | 18 min |
  | 10 | 50 min | 1h21 |
  | 12 | 1h20 | 2h10 |
  | 20 | 6h23 | 11h37 |

- **No save is demoted:**
  - A reached level is kept: `patchLevel` never goes below the highest level claimed.
  - Saves from before the change (no `pace: 2`) have their claims checked against `LEGACY_LEVEL_AT`. They record `floorLevel` and `floorFrom`, so that level's bar fills on from the earnings it had, not from zero.
  - Version-13 saves always use the old thresholds.
- **Tests:** the tests that set earnings to reach a level now use `LEVELS[n - 1].at`, not the old amounts.

## Checks

- **`npm test`:** 576 pass.
  - **New files:** `carving.test.mjs` (the bench and barn, stencils fixed after the first cut, values, keep and sell, saves, the doorstep's eight, every stencil on the carvable face and clear of its other pieces) and `garden-crops.test.mjs` (growing, watering once, pantry or market, pausing, saves, storing a bed).
  - **Added:**
    - `levels-and-visitors.test.mjs`: older saves keep their level, and the bar fills from where they were.
    - `play-ways.test.mjs`: eight lanterns leave the door and doorstep clear.
    - `player-feel.test.mjs`: a walk to something solid ends beside it and acts.
- **In the build:**
  - A full carving: pumpkin, stencil, every piece cut, a witch's hat, spider, leaves, green candle and hay bale, kept, and back in the garden with the lantern on the doorstep.
  - In play mode: a berry patch picked to the pantry with its prompt showing, then the bench tapped from across the garden, walked to, and carving opened.
- **Keys at the bench:** holding E traces without the play controls acting on it. Esc and the pad's B both shut the bench and stay in the garden, in play mode.
- **Smoke:** all 52 checks pass.

## For Codex next

- **Carving sounds:** the knife has only tones; a scrape while cutting and a pop as a piece comes out would help.
- **Stencils:** more of them, and maybe freehand cutting once the stencils are done.
- **Lanterns elsewhere:** kept lanterns could also stand on the farm, by the stall.
