# Mothlight menu item sprites — Claude handover

This contractor patch adds 36 illustrated menu sprites: 11 materials, 18 native village decorations, 4 workshop upgrades and 3 small keepsakes/utility pictures (satchel, almanac and letter). It fills the village's text-only item rows and generic decoration symbols with specific pictures, retaining the existing purple interface, names, counts and actions.

The source branch is `contractor/menu-item-sprites`, starting at `fa3ce1616919d3e75b0488421d42c7df50f0df31` (the directional-character delivery). The checked Claude lead is `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`, already in that ancestry. Do not apply the incremental patch blindly to an independently edited lead branch; review the dependency matrix below. No active Claude checkout was edited.

## Where the art appears

- Satchel: the four currently gatherable Green materials, plus stored later-district keepsakes when present under the existing rules.
- Rowan's workshop: the four existing upgrades and their material requirements.
- Rowan's stall and Decorate: all 18 native village decorations have specific icons. Existing garden and farmhouse thumbnails remain in use.
- Journal/almanac: supported material and village-decor rewards, requirement rows, gathering-tool unlocks, satchel/almanac headers and the unopened letter.

The seven later-district material icons are ready for future chapters; adding their art does not open those districts. Coins, costumes, recipes and unsupported items retain their existing labels/art. This is not a replacement for every icon across the game.

## Assets and build

The paintings are generated using the shipped garden icons as a style reference: warm amber, plum shadows, clear three-quarter shapes. They are illustrated interpretations of existing items, not screenshots of their voxel models. Full sources, prompts, measured crop rectangles and provenance are in `assets/menu-item-concepts/`.

```sh
python3 tools/bake-menu-item-icons.py
npm test
node build.mjs --out /absolute/path/Pumpkin-Patch-Menu-Sprites.html
CHROMIUM_PATH=/usr/bin/chromium node tools/menu-item-qa.mjs /absolute/path/Pumpkin-Patch-Menu-Sprites.html
```

The baker only measures, crops and scales existing paint. It rejects missing transparency and paint crossing crop boundaries, preserves aspect ratios, adds clear gutters, and outputs a shared 6×6 WebP atlas with 128px cells. Source concept PNGs are not bundled into the game. Individual transparent PNGs, a contact sheet and a standalone size-adjustable HTML reviewer are also generated for reuse.

One 561,952-byte atlas adds 2.25MiB of decoded RGBA pixels before browser image/compositing overhead. The browser installs its URL once in one stylesheet. Each card contains only stable ID/position markup; there is no image cropping, canvas readback or repeated data URL in a live menu redraw. The existing game bundle remains offline.

## Dependency matrix

| Surface | Depends on | Keep together / consequence |
| --- | --- | --- |
| Source manifest and paintings | Measured crop rectangles; item IDs | Re-bake atlas, individual PNGs, metadata, manifest and previews together. Do not reorder cells manually. |
| `content/village-item-icon-meta.js` | Baker output | IDs and 6×6 atlas coordinates are shared by every menu. |
| `ui/village-item-markup.js` | Pure generated metadata | Must stay Node-importable. Unknown IDs return no art; names/counts remain the fallback. |
| `ui/village-item-art.js` | Bundled WebP, browser document | Install once; no URL per card. Missing head in headless rule/controller tests is tolerated. |
| `ui/village-chapters.js/css` | Existing chapter data, typed requirements/rewards | Icons supplement labels. Preserve `data-vg-*`, disabled states, amounts and transaction rules. |
| `ui/village-decorate.js/css` | Native vs estate decor, original art resolver | Keep garden icons; use the shared new resolver for native pieces. Placement/undo rules are untouched. |
| `village-game.js` | Browser installer and default item-art callback | Narrow UI wiring only. Do not move asset imports into the pure chapter renderer. |

No save fields, prices, progression, gathering timers, recipes, movement, world geometry or controller bindings change. Tests and browser receipts live under `verification/`; they distinguish fixture setup from actual menu interactions. Viewport tests do not certify physical Fold/TV/Bluetooth hardware.

## Next art work, separate from this patch

The main navigation already has its own 30-icon set. The cooking audit found remaining simple ingredient fallbacks for berries, seeds, fish and crayfish, and an existing Midnight Moon ingredient mapping that reuses Starlight. Those are a separate targeted cooking-art batch; this patch does not edit that system.
