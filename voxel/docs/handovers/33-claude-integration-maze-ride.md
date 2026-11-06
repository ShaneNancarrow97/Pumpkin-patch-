# 33 — Claude: first-person maze integrated, runtime art sizes, Claude takes over the Hollow House

For Codex. Replies to handovers 29–32. Base your next branch on the head of `voxel-reference` (this handover's commit or later).

## What was integrated

`contractor/first-person-hollow-house` (`4fccd9d`) was built on `ac698dc`, so it went onto `voxel-reference` as a fast-forward with one change on top (below). Thank you for checking the overlapping code in `main.js`, `scene.js` and `build.mjs` so carefully: the intro, orders, wanted variety, mist, piece camera and riders all survive, and the walkthrough hides notices and dialogue while it plays.

- **Handover 29, the first-person walkthrough:** kept as delivered.
- **Handover 31, the house furnishing concepts:** kept under `assets/house-concepts-2026-10/` as modelling references. The build doesn't bundle them.
- **Handover 32, the hayride roadmap and convoy prototype:** kept under `docs/`. Nothing in it runs in the game yet.

The download branches (`contractor/shocktober-download-2026-10-21`, `contractor/hayride-design-downloads-2026-10-23`) were not merged, as you said.

## The one change: runtime art at the size it is shown

The three new PNGs took the offline HTML from **26.5 MB to 36.5 MB**. They were each 1536×1024 RGBA, 7.7 MB in all, and grow by a third again in base64. For a single file that phones load whole, that is the biggest cost in the game.

| File | Before | Now |
| --- | --- | --- |
| `assets/maze-scare-actors` | PNG, 2.85 MB | `.webp` q90, alpha exact, 533 KB |
| `assets/maze-haunted-girl` | PNG, 2.58 MB | `.webp` q90, alpha exact, 428 KB |
| `assets/maze-ride-icons.png` | 1536×1024, 2.25 MB | 384×256 PNG, 118 KB (icons show at 26 px) |

- The alpha channel is bit-for-bit the same, so `maze-ride-actor-meta.js` finds identical bounds, feet and torso centres.
- Colour error on visible pixels averages 2.6–3.4 out of 255. Side-by-side crops of the girl and the clown at 1:1 show no visible difference.
- The icon positions are percentages, so the smaller sheet needs no code change.
- `maze-ride-actors.js` imports the `.webp` files, and `test/maze-ride-view.test.mjs` bundles `.webp` as a data URL too.
- **The HTML is now 28 MB.**

**Please keep runtime art this way.** Ship it as WebP, or PNG for small flat UI sheets, at roughly twice the largest size it is ever drawn. Keep full-size concepts outside the bundle, under `assets/*-concepts-*` or `docs/`. This is also in AGENTS.md's gotchas.

## Verification on the integrated head

- `npm test`: 265 pass.
- `npm run smoke`: all 48 checks pass (desktop and phone).
- `tools/qa-maze-ride.mjs`: all 71 checks pass on the WebP build (desktop, 390×844, 844×390, 874×787).

## The user's decision: Claude takes over production

After this integration the user asked Claude to **take over production**, starting with the Hollow House:
- the scare maze's interior;
- the foyer;
- the first-person experience mode.

Please don't branch from `maze-ride-*`, `content/maze-ride.js`, `rules/maze-ride.js`, `ui/maze-ride*`, `foyer-view.js` or `hollow-house-world.js` until Claude's next handover describes the new versions. The hayride section below is a proposal for whenever the user returns to it.

## The hayride: how I suggest we split it

Your handover 32 is a strong plan: one route driving everything, a once-only payment at boarding, and a free owner ride-along. The ride-along requirement is noted.

The part that touches my side of the map is the site.
- The farm has grown south by `DROP` and east with the meadow.
- The Hollow House sits on the west plot.
- The lantern walk runs above the patch.

I'll allocate the woodland clearing as shared layout data: station, queue, unload apron, the loop's swept envelope, the pedestrian approach from the visible paths, camera and pan limits, and ground and fences. That gives you measured coordinates instead of the illustration's. After that, your operational vertical slice (handover 32, step 2) can go on top as a contractor branch, if the user agrees to that split. Until the site is in, please don't start on world coordinates.

## The furnishing art (handover 31)

Agreed: these are modelling references, not atlases. When the user picks this up, the twelve furnishings become native voxel models, measured with `tools/measure-decor.mjs`, with the desk as a possible host once its top is measured. The six wallpapers become tested repeat panels.
