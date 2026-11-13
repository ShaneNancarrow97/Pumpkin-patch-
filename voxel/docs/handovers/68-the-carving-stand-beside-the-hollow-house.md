# 68: The Carving Stand, rebuilt beside the Hollow House

Branch: `voxel-reference` (lead), following handover 67. The player asked: "Make the pumpkin stand better up near hollow house, voxel looks great and designs, UI".

## Where it stands

`STAND_SITE` (`carving-stand-world.js`) is centred at x -2.7, z 6.3, 7.2 by 4.4 units. That puts it on the open ground between the Hollow House's west wall (its exterior starts at x 2.6), the back fence (z 2.9) and the lantern path (z 10.5) that maze guests walk to and from the house.

`test/carving-stand-world.test.mjs` checks:

- at least a unit's gap to the tier-5 exterior;
- that the stand stays inside the fences;
- that every guest path (`HOLLOW_LINK`, `HOLLOW_RETURN`, `HOLLOW_FRONT_APPROACH`) passes at least a metre away.

The stand still blocks the owner's walk in `farmPlayerGeometry`.

## What it looks like

All of this is in `carving-stand-models.js`, with no DOM except `chalkboard()`.

- **A timber pavilion:**
  - a planked deck;
  - a lantern wall of three shelves;
  - an orange-and-plum striped awning, scalloped, with a bulb under every scallop;
  - a gable carrying the sign and a great lit lantern;
  - lamp posts at the front corners, with a festoon and bunting strung between them.
- **The lantern wall** shows every design: lit once it's on your menu, an uncut pumpkin until then. The bottom shelf holds stock and whatever extras are stocked: candles, glow-paint pots, a wrought stand.
- **At the bench**, each guest carving sits on a stool: the visitor's seated sprite, from `seatedVisitor`, the same one the food truck's diners use. Their lantern stands on the table beside them and moves through the four stages of `CARVING_STAGES`:
  - whole;
  - lid off beside it, with flesh showing and pulp and seeds;
  - face cut and dark;
  - lit, with the order's extras: glow paint, a witch's hat, the wrought stand.
- **The front:** a crate and a pile of uncut pumpkins, a pulp bucket, a showpiece on a hay bale (your newest design, lit), and a chalkboard listing tonight's designs and extras with their prices. The chalkboard is a canvas texture, rewritten only when the menu or the sign changes.
- **Lanterns:**
  - `addLantern(v, x, y, z, { design, stage, scale, glow })` builds a ribbed pumpkin. Each design's face is a 13 × 9 mask in `LANTERN_FACES`, cut two deep. The candle glows at the back of each cut, and the cut's own walls glow orange (or darken, when unlit), so faces read even small and without bloom.
  - Columns of one colour merge into one box, so a lantern is 170 to 350 boxes. The whole pavilion is about 2,600.
- **Lighting:** two lamp positions join the farm's light pool while the stand is built (`lamps`, with `active`). The bench lanterns' glow flickers a little.
- **Rebuilds:** the pavilion rebuilds only when its benches, designs or extras change. A guest's lantern is a clone of a cached template (`template()`), swapped only when its stage changes.

## The menu

The menu is `ui/carving-stand-sheet.js`, and every picture in it is a photograph of the same voxel models (`ui/stand-art.js`):

- `standArt` keeps one small `WebGLRenderer` of its own, made the first time a picture is wanted.
- It renders at 1.6 times the size, crops to the drawn pixels and fits the result to the picture's size, so every model fills its frame alike.
- Each picture is kept as a short blob URL, so the sheet's HTML, which is redrawn and compared every tick, stays small.
- Without WebGL every picture is `""`, and the drawn SVG lanterns (`jackArt`) stand in.

The menu is laid out as follows:

- **Hero:** a render of your stand as it is (its benches, menu and extras) on a night sky, with open or closed, lanterns carved, takings, the average fee and the favourite design. It has Visit the stand (`scene.focusCarvingStand()`) and Open or Close.
- **At the benches:** each guest's portrait, their lantern rendered at its current stage, the design, a progress bar, the stage's name and the fee. Free benches are shown, and an "Another bench" tile goes to the upgrades.
- **Tabs** (L1/R1 on a pad):
  - **Designs:** a chalkboard with each design's lantern, its price after the fair sign, its share of guests (`designShares`), how many have been carved (`tally`), and Add or a level lock.
  - **Extras:** a wooden shelf with each extra's render, price, how often guests add it, and Stock.
  - **Upgrades:** cards with a render of each upgrade, now → next, tier pips and the price.
- **Before it's built:** the hero shows a preview stand with Build, "What your guests could carve" with every design, and three steps saying how it works.

## Rules

`rules/carving-stand.js` changed in four ways:

- Carvers get a `kind`, so the farm can draw them, and the stand keeps a `tally` per design. The tally is saved; carvers still aren't.
- `CARVING_STAGES`, `carverProgress` and `carvingStage` say how far a guest has got. The world and the menu share them.
- `designShares` is how guests split between the designs on the menu, and `averageCarvingFee` is what each guest pays on average.
- No save version change: `tally` restores to `{}`.

## Checks

- `npm test`: 719 pass. New tests cover the tally, the kinds and the shares surviving a save, the stage order, every design's mask and the lantern stages (only a lit lantern glows, boxes finite and on their base), the pavilion's places per bench and its footprint, and the site clear of the house, the paths and the fences.
- `npm run smoke` passes.
- Screenshots (`dist/qa/stand2.mjs`, `dist/qa/stand-ui.mjs`, not committed):
  - the stand on the whole farm, close up, and in play mode's follow camera;
  - the menu built and for sale at desktop, phone and TV sizes, on every tab.

## Not done

Carvers appear at the bench rather than walking up to it, and leave the same way.
