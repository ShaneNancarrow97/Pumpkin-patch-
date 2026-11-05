# 70: The TV picture, checked and retuned

Branch: `voxel-reference` (lead), following handover 69. The player asked: "does it still look good for tv tho".

## How it was checked

`dist/qa/tv-look.mjs` (not committed) photographs four scenes in TV mode, with a DualSense connected:

- the whole farm;
- the carving stand close up;
- play mode's follow camera;
- the carving stand's menu.

It shoots them at a folded (882 × 344) and an unfolded (832 × 750) Fold's size, at 2.625 density. Each scene is shot twice, a moment apart: once with the TV picture, and once with the full picture (`setTvProfile(false)`, with the frosted glass put back).

Both shots are then scaled to what a 1080p cast shows: the phone's screen fitted inside 1920 × 1080. They are compared in crops enlarged 2×, and by their edge detail (a Laplacian's mean) at that size.

## What handover 69's TV picture got wrong

- **Folded, it was soft.** A 1080p cast shows the folded phone's wide screen about 1920 pixels across. TV mode drew 1323 at 1.5×, so the TV stretched it. Natalie's face and glasses, the guests' faces and the 3D signs' small lettering all went soft.
- **Every glow spread wider.** The glow's blur is measured in its own pixels. The half-size chain, on top of the lower density, spread every halo about 2.7 times as wide. The Hollow House door became a haze and lost its sparkle.
- **Bright things read through the panels.** Without the frosted glass, the HUD's 91% glass let the Carving Stand sign read through behind the money. The play-mode name chip, at 95%, always had a little of this.
- **Unchanged:** menus over the farm and the controller legend looked the same.

## What changed

- **TV mode draws what the cast shows** (`TV_CAST` and `tvPixelRatio` in `render-quality.js`). The density is capped so the picture fits 1920 × 1080, and never goes lower than that:
  - Folded, that's Sharp's own 2× (1764 × 688): nothing is lost.
  - Unfolded, it's 1.44× (1198 × 1080, the cast's 1080 rows). That's 1.29M pixels a frame instead of 2.50M (−48%).
- **The glow keeps its designed size** (`glowScale` in `scene.js`). The chain is worked out at the size the picture would have without TV mode.
- **Still no FXAA in TV mode.** Unfolded, the picture now lands about pixel for pixel on the TV.
- **Near-solid panels where the frosted glass is off** (TV mode and touch screens, `tv-mode.css`):
  - `--panel-glass`, the whispers and the garden's tool strips go to 99%.
  - The play-mode name and arrange chips go from 95% to 99% everywhere.

## Measured

| | Full picture | Handover 69 | Now |
| --- | --- | --- | --- |
| Folded, pixels drawn | 1764 × 688 | 1323 × 516 | 1764 × 688 |
| Unfolded, pixels drawn | 1664 × 1500 | 1248 × 1125 | 1198 × 1080 |
| Glow chain's first level, folded / unfolded | 882 / 832 | 331 / 312 | 882 / 832 |
| Edge detail at TV size, folded: farm, stand, play | 100% | 87%, 90%, 87% | 100%, 98%, 100% |
| Edge detail at TV size, unfolded: farm, stand, play | 100% | 90%, 94%, 94% | 96%, 98%, 99% |

The stand falls short of 100% even when drawn identically, because its lanterns flicker and its guests move between the two shots.

In an empty stretch of the HUD with the sign behind it, the bar's brightness varied:

- by 2 levels with the frosted glass;
- by 18 levels in handover 69's TV mode;
- by 2 levels now.

## What's left of the saving

- **Unfolded:** the picture draws half the pixels.
- **Folded:** the picture draws the same as without TV mode. It was always the cheaper screen.
- **Both:** handover 69's frame pacing, the 24-frame cap behind menus, the five-a-second menu redraws and the kept canvas size all still apply, and none of them changed the picture.

## Checks

- `npm test`: 724 pass. The new test checks that TV mode draws what a 1080p cast shows: no more, never below a pixel per CSS pixel, and no softer on a folded phone.
- `npm run smoke` passes.
- The four scenes were photographed at both sizes three times (handover 69's TV picture, then twice retuned), with no page errors.
