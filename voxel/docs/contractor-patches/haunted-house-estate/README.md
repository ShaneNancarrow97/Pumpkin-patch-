# Contractor delivery: Haunted Homestead + The Hollow House

**For Claude, the lead developer.** Review branch [`contractor/haunted-house-estate`](https://github.com/ShaneNancarrow97/Pumpkin-patch-/tree/contractor/haunted-house-estate). This is an additive contractor delivery, not a merge into `voxel-reference`. Review patch base: Claude’s published `dd9781957e4f452f1469a442d03eee142a21136c`. Game source head: `fa6056a`.

## Completed parts

| Part | What is delivered | Integration notes |
| --- | --- | --- |
| Gameplay review | Isolated baseline simulations, bottlenecks, progression and migration findings | [Handover 11](../../handovers/11-gameplay-loop-review.md) |
| Private homestead | Separate plot, native detailed four-stage house, full 360° camera, three grounds expansions, 16 garden props, 20 exterior finishes | [Handover 12](../../handovers/12-private-house-estate.md) |
| Hollow House | Derelict property, paid restoration/opening, five-tier foyer, Mortimer, shared-purse ticketing, persistent visits, 16 decor items and 21 finishes | [Handover 13](../../handovers/13-hollow-house-foyer.md) |
| Minimalist UI | Full-viewport canvas, compact HUD, five navigation actions, contextual building cards, on-demand editors, restrained bubbles, Undo/colour/Done | [Handover 14](../../handovers/14-minimal-ui-and-verification.md) |
| Shocktober atmosphere | Cold gothic window light, reduced warm fill, flickering hearth, soft low haze, eyes on the black stair landing and in higher-tier dormers, grave markers and thorny ivy | Real voxel/world effects; no obstructing screen overlay |
| Corrected geography | Private home behind the central hedge arch; maze at the old cottage; expanded western lane and timed bottom-gate transfers | [Handover 15](../../handovers/15-west-gates-visitors-and-storage.md) |
| Visitors and storage | Five new four-frame visitors, five paid barn tiers, full-barn harvest pause and 16→32 outdoor crowd upgrades | [Handover 15](../../handovers/15-west-gates-visitors-and-storage.md) |
| Generated icons | Thirty custom painted Halloween icons for navigation, menus and core actions, normalised for small screens | [Handover 16](../../handovers/16-premium-menu-icons.md) |

## Pull for review

Do not reset Claude's working checkout. Start a separate review worktree from the contractor branch:

```sh
git fetch origin contractor/haunted-house-estate
git worktree add ../pumpkin-contractor-review -b review/haunted-house origin/contractor/haunted-house-estate
cd ../pumpkin-contractor-review/voxel
npm ci
npm test
node build.mjs --out ../../Pumpkin-Patch-Shocktober-Premium.html
```

Claude's published `dd97819` is merged into this contractor preview, including the fine shop art/fixtures, shelves, portrait centring and revised balance. A separate ZIP contains a **binary unified patch against dd97819**, not a replay of older pre-merge feature commits. Apply only in a clean review checkout with `git apply --check contractor-haunted-estate.patch` followed by `git apply contractor-haunted-estate.patch`. Keep Claude's unpublished work in its own checkout. No lead branch is overwritten.

No published Scare Maze implementation existed at the inspected base. If Claude already has an unpublished Hollow House/Scare Maze system, use its transaction IDs and visitor APIs; do not run two ticket ledgers. The same farm visitor, purse, occupancy list and charged receipt are the source of truth here.

## Downloaded game

Direct downloads are also available on the isolated [`contractor/shocktober-download-2026-10-21`](https://github.com/ShaneNancarrow97/Pumpkin-patch-/tree/contractor/shocktober-download-2026-10-21) artifact branch. Download `Pumpkin-Patch-HTML.zip`, extract it, and open `Pumpkin-Patch.html`. It has the same hash as the premium-named workspace build below. This download branch contains no source merge and should not be merged into the game branch.


Artifact: **`Pumpkin-Patch-Shocktober-Premium.html`**. All source and assets are bundled; no development server or runtime CDN is needed. The HTML includes the earlier Sandy/meadow/costume/music work. It is a browser game with fullscreen support and safe-area layouts, not an APK.

SHA-256:

```text
22df952009e152667d9a5c9aa6d30ef3ec3593b115e1adee8921a6a2ab0c2f55
```

The normal game starts with the expanded-west farm and existing save. Home and the **central hedge arch** enter the private garden; tap the house to enter its rooms. The **old left-hand house site** is the maze. Reach level 6 and purchase the derelict Hollow House (£1,750), restore it (£2,500 / 90 game seconds), then explicitly Open. The attraction is not free or pre-unlocked in the user HTML. Browser QA stages money/levels only inside its test session.

Schema 9 adds optional estate, attraction and unfinished-visit data. Schema 7 saves gain a free starter garden and locked attraction while retaining their house, decor, outfits, coins and progress. No offline income is added. The root 2D game is untouched.

## Reproduce checks

```sh
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-review.html
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-house-estate.mjs --html /tmp/pumpkin-review.html --shots /tmp/estate-qa
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hollow-house.mjs --html /tmp/pumpkin-review.html --shots /tmp/hollow-qa
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-premium-ui.mjs --html /tmp/pumpkin-review.html --shots /tmp/premium-qa
SMOKE_LITE=1 CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/smoke-offline-html.mjs --html /tmp/pumpkin-review.html --shots /tmp/core-smoke
```

Run browser checks sequentially on software WebGL. The verification folder records actual runs and their build coverage. Device sizes are emulated, not physical-device certification. Screenshots include the normal lighting/bloom Fold view as well as faster no-bloom functional checks.

The economic baseline was measured on an isolated archive of `ede512b`, not on this expanded game. To reproduce it without switching branches:

```sh
mkdir -p /tmp/pumpkin-baseline
git archive ede512b | tar -x -C /tmp/pumpkin-baseline
node voxel/docs/contractor-patches/haunted-house-estate/verification/review-baseline.mjs /tmp/pumpkin-baseline /tmp/gameplay-baseline.json
```

See [handover 15](../../handovers/15-west-gates-visitors-and-storage.md) for the final routing correction, five new animated visitors and explicit stock/crowd upgrade paths.

## Next contractor work to consider

1. Reconcile the legacy free-cocoa → paid-stand migration incentive with Claude's latest economy, preserving purchased value.
2. Deliver one complete ingredient delivery → kitchen recipe → shelf → customer loop before extending to 20 levels.
3. Add bounded repeatable catering/festival orders to consume excess pumpkins.
4. Refine queue/maze presentation against Claude's attraction work, keeping one-charge visit accounting.
5. Add more room/garden content and rendered catalogue thumbnails; current new thumbnails are simple icons, while the placed items are native voxels.

The estate is an orbitable building plot, not first-person movement. The Scare Maze is a timed background visit, not a walk-through maze editor. The ticket desk is fixed to a protected service lane with selectable finishes. Cooking and 20 live levels remain roadmap items. See handovers for exact prices, limits, APIs and known integration risks.

## Follow-up: house freeze report and mobile render cost

See [handover 17](../../handovers/17-house-freeze-and-render-cost.md) for the closed-house visitor exit fix, reduced high-DPI postprocessing/shadow cost, device diagnostics, and the limit of local freeze reproduction. Existing saves are retained.

## Unpurchased house menu crash and cocoa thumbnails

[Handover 18](../../handovers/18-unpurchased-house-menu-and-cocoa-art.md) supersedes the earlier unreproduced-freeze note for this specific report: the unowned house context referenced an out-of-scope helper and stopped the frame loop. The fix shares that helper at module scope. Cocoa thumbnail sizing and atlas cropping are restored. The regression starts with a fresh, unpurchased house.
