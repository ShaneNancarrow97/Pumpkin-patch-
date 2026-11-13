# 40 — Claude: where the lag came from, and what fixed it

For Codex. Follows 39. Base your next branch on the head of `voxel-reference`.

The owner said the game had started to lag, and asked for optimisation without removing anything. Nothing is removed and the farm looks the same: screenshots of the whole farm, the yard, the front fence, the meadow, a room and the shop floor match the old build.

## What was measured

`tools/perf.mjs` (new) plays a busy late-game farm in headless Chromium and reports what it draws, its frame times, and every stall mid-play with where it came from.

**Steady frame time came from drawing, not the rules.** The rules take about 0.13 ms a step. Each frame, the farm drew:
- **25 point lights.** Every lit pixel pays for each one. Sixteen were the lamps, and seven were the rooms' light pool, sitting at zero brightness.
- **Two shadowed lights in every shader.** The rooms' key light (a spotlight with a shadow) stayed on the farm at zero brightness. Its shadow map was never redrawn there, but every lit pixel still worked out its cone and sampled its shadow.
- **The moon's shadow, redrawn every frame:** the whole scene drawn a second time.
- **The ground: 709,000 triangles.** It had faces on every side of every raised cell. The farm camera looks north and down and never turns, so the east, west and north faces are never seen.

**Spikes came from pictures reaching the graphics card the first time they were drawn.** In play on the old build:

| Stall | Cost in software WebGL |
| --- | --- |
| Sandy's blink or serving picture (1536×1024), on her first blink or serve | 47–62 ms |
| The Baron and Axel's atlas (1774×887), on the Baron's first visit | 43 ms |
| The horror guests' sheet (1122×1402), on the first horror guest | 31–40 ms |

Shaders compiling for something seen for the first time also stall a frame. That happened once in the meadow and twice on first entering the shop floor.

**Not a cause:** open menus. Each rebuilds its HTML only when its text changes, which is at most 0.3 times a second on a busy farm.

## What changed

- **Lamps share a pool of lights** (`scene.js` `lightLamps`, `places.js` `lightPool`).
  - The farm's lamps are now a list of positions (`lamps`), not point lights. The seven pool lights go to the lamps nearest the middle of the view, and a lamp joining or leaving fades over a third of a second.
  - Every lantern still glows.
  - `createFarmExpansion(state, world, lamps)` moves the four front-fence lamps down to a bought field's edge through this list.
  - The farm now draws 10 point lights instead of 25.
- **The key light is switched on only indoors** (`keyLight.visible` in `lightIndoors`), so the farm's shaders carry one shadowed light instead of two.
- **The moon's shadow is redrawn every other frame** (`moon.shadow.autoUpdate = false`; `tick` sets `needsUpdate`). The moon doesn't move, so only the moving shadows update at 30 a second.
- **The farm's ground skips faces nobody sees:** `buildGround(bounds, cell, { farmView: true })` in `yardGround` and the meadow's exit path. The farm ground is now 548,000 triangles, down from 709,000. Leave `farmView` off for any ground a turning camera sees.
- **Warm-up** (`scene.js`, "A picture goes to the graphics card…"):
  - Once loaded, Sandy's three pictures, the visitor, horror-guest, Skyla, Natalie and Shane sheets and the Baron and Axel's atlas are sent to the graphics card one a frame (`warm`, `warmNext`).
  - When the characters are in, `warmShaders` compiles every shader in the farm scene in the background, and then their indoor variants with the key light on (`places.withKeyLight`).
  - The compile has to target where the farm is drawn: the glow pass's buffer, or the screen with glow off. A compile for the screen made 25 shaders that never matched anything.

## Results

The same busy late-game farm (`node tools/perf.mjs`) on the old build and this one:

| | Before | After |
| --- | --- | --- |
| Point lights on the farm | 25 | 10 |
| Shadowed lights in the farm's shaders | 2 | 1 |
| Moon shadow redrawn | every frame | every other frame |
| Draw calls a frame | 240 | 197 |
| Triangles a frame | 1.92 M | 1.18 M |
| Frame time, software WebGL at 1280×800 | 4.19–4.36 s | 2.50–2.89 s |
| Large picture uploads in play | 3, at 31–47 ms each | none |
| Shaders compiled in play | 1 in the meadow; 2 on first entering the shop | 1 in the meadow*; 3 on first entering the shop |

\* The test buys the meadow after the warm-up has run. On a farm that already has it, Sandy's shaders are compiled ahead.

First entry to a room or the shop can compile one shader more than before: the indoor light's shadow variants. In exchange, every farm frame stops paying for that light.

Software WebGL is far slower than a phone's GPU, so compare these times with each other, not with a real device. The savings are in per-pixel lighting and triangles, which is what holds a phone back.

## Rules to keep

- **Don't add point lights to the farm.** Add a position to the lamps list (`world.lights` from `lanternPost`, or push to `lamps` in `scene.js`) and the pool lights it when it's near the view. Rooms and the shop use the same pool through `places.js`.
- **Don't make a light visible or shadowed only now and then without warming its shader variant.** Changing the number of lights or shadowed lights recompiles every material that is drawn. Keep a light visible at zero brightness, or compile the variant ahead as `warmShaders` does for the key light.
- **Large pictures shown later should go through `warm(texture)`**, or their first appearance stalls a frame. That covers a new character sheet, a stand's alternate frames and a sign drawn only on an upgrade. Costume sheets are left to upload when worn, so they don't fill the graphics card's memory.
- **The farm's ground is seen from one side.** If a ground with `farmView` is ever shown from another angle, its back and side faces will be missing.

## Verification

- `npm test`: 338 pass. The farm-growth test now moves lamp positions, and checks that the expansion adds no lights.
- `npm run smoke` with `CHROMIUM_PATH`: all 48 checks pass. Its storage step now opens Farm upgrades from the Upgrades menu; it still clicked the old shop tab, which was why CI failed after 39.
- Screenshots of the whole farm, the yard, the front fence, the meadow, the parlour, the shop floor and the return to the farm match the old build.
- `node tools/perf.mjs`: the numbers above, besides the frame times, which come from two clean runs each.
