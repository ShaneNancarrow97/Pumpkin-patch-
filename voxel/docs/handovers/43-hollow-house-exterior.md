# 43 — Hollow House exterior contractor upgrade

For **Claude, the lead developer**. Source branch: **`contractor/hollow-house-exterior`**. Exact published base: **`3f92ca8df92e07b09445ce092101e9309c00288c`** (handover 42). This implements the farm attraction exterior assigned to Codex in your handover 36. No push is made to `voxel-reference`; the root 2D game stays unchanged.

## Player-facing result

The Hollow House has seven native voxel appearances: boarded derelict, scaffolding during restoration, and five restored tiers. The cottage gains a covered portico, clock tower, twin spires and then a crowned mansion with dormers, balconies and buttresses. Existing foyer upgrades change the outside automatically; there is no second purchase.

A warm outline highlights the front door. Tap it to enter a restored foyer directly, including when admissions are closed. The facade and sign still open the compact management card. Derelict/restoring appearances cannot enter a working foyer. The smaller sign leaves the new architecture visible.

Creaking shutters, window silhouettes and an occasional pale ghost provide subtle motion. Reduced motion updates live and holds details still, with no ghost reveal. Eight generated icons illustrate restoration and current/next exterior stages on the existing menus. No extra permanent HUD or nested menu is added.

## Integration map

| File | Contract |
| --- | --- |
| `hollow-exterior.js` | Deterministic exterior builder/spec. Seven appearances use 2,065–2,636 boxes, at most two batches and no lights. Sealed walls/roof; existing 8×5 pitch/doorway; maximum height 7.77m. Dormer panes stand above the roof skin, checked by near-face rays. |
| `hollow-house-world.js` | Reexports the isolated exterior builder. The complete foyer/decor section after the old exterior is byte-identical to the base. |
| `hollow-house-farm.js` | Cached appearance/sign rebuild, separate ready-gated door target, safe disposal and two fixed lamp positions in the existing pool. Admission toggles do not rebuild the house. |
| `hollow-exterior-effects.js` | Read-only visual clocks, model sockets, forward-opening shutters and depth-tested window figures. No save or ticket mutation. |
| `scene.js` | Passes the lamp-position array; ignores inactive positions while choosing existing pooled lights. Exposes `hollowExteriorStatus` for tests. No new point lights or light-count variants. |
| `main.js` | Routes `hollow-door` to existing foyer entry. The facade keeps `hollow-house`. |
| `ui/hollow-exterior-icons.js/css`, `ui/hollow-sheet.js`, `build.mjs` | One 90.5KB WebP atlas/Blob URL, current/next stage art and a compact illustrated tier strip. |

Full generated source PNG/metadata are in `docs/plans/hollow-exterior/`, outside the runtime bundle. `tools/prepare-hollow-exterior-icons.py` reproduces packaging. Do not edit existing baked atlases to merge this work.

## Gameplay and ownership preserved

The current base still has level-9 purchase, the existing restoration cost/time, five foyer tiers, ticket prices/capacities, terror, footfall and paid guests. No rules/model/save files change and no migration is required. The private Shane/Natalie estate, maze/walkthrough, hayride and wilds remain intact. Keeping the existing pitch means no new wilds footprint or road is required.

The screenshot's unpushed 20-level progression work is **not** recreated here. Recover it from Claude's workspace and reconcile it separately. Cooking and unfinished meadow plans are outside this increment.

## Review and rebuild

```sh
git fetch origin contractor/hollow-house-exterior
git worktree add ../pumpkin-exterior-review -b review/hollow-exterior origin/contractor/hollow-house-exterior
cd ../pumpkin-exterior-review
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-exterior.html
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hollow-exterior.mjs /tmp/pumpkin-exterior.html /tmp/exterior-qa
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/smoke-exterior-release.mjs /tmp/pumpkin-exterior.html
```

The legacy tracked `voxel/node_modules` machine symlink is unchanged in source; recreate dependencies locally. Download branches contain artifacts only and must not be merged. Apply the binary patch only against the exact base above in a clean review worktree.

## Verification and delivery

**64 Node test files pass.** Custom browser QA passes 46 functional checks on its pinned build, followed by 10 final visual/door/save checks on the exact download. Both report zero runtime errors/external requests and one canvas. Standard desktop/phone smoke also passes in GitHub CI on runtime commit `0fdeffa`, alongside the build and Node tests. The local duplicate was stopped after CI succeeded; its partial log is labelled in the [verification record](../contractor-patches/hollow-exterior/verification/README.md).

Final HTML SHA-256: **`4e84fd080a749e129020da081afdc064cdc29328678c208210e72a4111cccbf5`**. A clean patch rebuild matches byte for byte. The last visual change only lifts dormer panes above the roof; no economy/save/ticket logic changes. Full images and generated icon sources are committed. Physical Fold performance and successful native fullscreen remain device checks.

Useful follow-on work: review the exterior at the lead's preferred final lighting on a physical Fold, then recover and reconcile the unpushed progression work before building cooking unlocks. This branch is complete and ready for lead review.
