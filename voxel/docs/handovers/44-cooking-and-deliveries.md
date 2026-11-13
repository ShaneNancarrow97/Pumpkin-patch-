# 44 — Cooking, ingredient deliveries and shop food

For **Claude, the lead developer**. Contractor branch:
**`contractor/cooking-foundation`**. The exact incremental base is
**`5083446e1ffcc94f370feff0e533150899c771f3`**, the completed Hollow House exterior
delivery described in [handover 43](43-hollow-house-exterior.md). The last
published lead revision inspected for this increment was
**`3f92ca8df92e07b09445ce092101e9309c00288c`** on `voxel-reference`.

This increment is stacked on handover 43, rather than on a second copy of the
lead branch. Runtime commits are `4c85930` (cooking), `5011cc2` (continuous
apron) and `ba99b87` (receiver waiting). Do not apply the exterior patch twice. Download-only branches are
artifact storage and must not be merged. The root 2D game is outside this work.

## Player-facing loop

Reaching patch level 5 permits purchase of the Midnight Kitchen food truck for
£900; levelling does not buy it automatically. It sits beside Skyla's shop on a
small paved service plot. The purchase includes a working starter hob and the
Lantern wedges recipe, so the feature does not depend on owning an expensive
house kitchen.

The compact Cooking sheet has Recipes, Deliveries, Pantry and Food tabs.
Players buy raw ingredients with an explicit ingredient subtotal, £6 delivery
fee and wait estimate. A delivery takes 60 game seconds: 42 preparing, 12
travelling and 6 unloading. A native voxel cart comes from the north along a
separate receiving lane, with rotating wheels and visible parcels. The
existing Shane actor can walk over to receive it when he is available; the
scene does not spawn a duplicate Shane or interrupt an assigned crop task.

Delivered ingredients enter one shared pantry. A recipe consumes its actual
ingredients when cooking starts. Pumpkin recipes also consume unreserved
pumpkins from the existing stock/freshness system. Completing a batch adds
finished portions to food storage. Two physical side-wall cabinets in the shop
display products selected by the player. Posted prices influence whether a
hungry indoor customer buys a serving with the money left in their own wallet.

This first slice sells food through the indoor shop customer simulation. It
does not add a second free-money stream to passing visitors, replace pumpkin
sales or make the truck a separate instant-sale checkout. Ingredients do not
spoil in this slice.

## Current published progression

The current public game still has **12 patch levels**. These cooking gates use
those existing levels and preserve every existing reward and threshold.

| Level | Recipe or feature | Research | Portions | Base price per portion |
| --- | --- | ---: | ---: | ---: |
| 5 | Food truck; Lantern wedges starter | Included in £900 purchase | 2 | £11 |
| 6 | Cauldron soup | £180 | 2 | £13 |
| 7 | Wicked toffee apples | £320 | 2 | £8 |
| 8 | Midnight pumpkin preserve | £600 | 2 | £22 |
| 9 | Ghost cookies | £850 | 4 | £4 |
| 10 | Hollow House pie | £1,400 | 2 | £27 |
| 11 | Graveyard brownies | £2,000 | 4 | £7 |
| 12 | Moonlight tart | £3,200 | 2 | £27 |

Base pantry capacity is 60 ingredient units; base finished-food capacity is 30
portions. Pantry and food-storage upgrades have three tiers. Enchanted utensils
unlock at level 7 and reduce the duration of new jobs by 15% per tier. Hiring
the midnight chef unlocks at level 10 and costs £7,500. The chef repeatedly
cooks one researched recipe at the truck while real ingredients, pumpkins and
output space are available. The chef does not order ingredients, grant free
stock or run an offline backlog.

At the base posted prices, gross batch margins are roughly £6–£33 after
raw ingredient cost and baseline pumpkin opportunity cost, before the £6
order fee, research and capital. Fresh/wanted pumpkins can make that
opportunity cost higher. Higher recipe levels are variety and appeal unlocks,
not a guaranteed linear profit-per-minute ladder; reconcile that with the
recovered 20-level pacing model. Cheap posted prices can intentionally lose
money, and the menu now says so.

Cooking at home is an optional second simultaneous station. It requires the
kitchen room to be unlocked through the existing house level 2 progression and
an actual `copper-range` placed in that kitchen. Selecting that range exposes a
Cook action without removing its normal decoration controls. The house and
truck use the same pantry and finished-food store.

**Claude's unpushed 20-level progression work is not recreated here.** Recover
that work from the lead workspace, then reconcile the gates and costs in
`content/cooking.js` with the intended 20-level pacing. Preserve the stable
recipe IDs and purchased/researched state. Do not overwrite unfinished lead
rules, menu gate work or QA fixtures with this branch merely to take cooking.

## Money, inventory and save guarantees

- `STATE_VERSION` advances additively from 11 to **12**, with `s.kitchen` as the
  new subsystem. Existing saves receive an empty, unpurchased cooking state;
  no reset or migration reward is required.
- Orders are paid once. Only the front order advances on the single receiving
  road; a second paid order waits. A full pantry leaves the paid parcel at the
  unloading bay until there is space. Delivery IDs prevent duplicate credit.
- Cancelling an order is allowed only before it travels. Ingredient cost is
  refunded, but the delivery fee is retained. Cancelling cooking after it has
  started does **not** refund consumed inputs; the UI explains this before
  confirmation.
- Full finished storage holds a completed job until it can be credited. The
  renderer does not decide completion, move inventories or generate income.
- Recipe pumpkin consumption respects existing old/fresh stock reservations.
  Wanted or shopper-held pumpkins cannot be silently consumed by the cooker.
- Food quotes reserve real servings and lock that serving's posted price.
  Changing the displayed product or its price does not rewrite a guest's
  existing quote. Two customers cannot buy the same last serving.
- Pumpkin purchases, food and tips use the same finite customer purse. Food
  preserves any unspent wanted-pumpkin purse and cannot make the wallet
  negative. Food-only indoor purchases can complete without a pumpkin receipt.
- Food income, servings sold, ingredient cost, delivery fees, research,
  investment and batches cooked have separate kitchen ledger fields. Food does
  not inflate pumpkin item counts or the existing tips totals. Recent food
  receipts are bounded.
- Ordinary indoor visitors and their food holds are transient on save/reload,
  matching the existing customer policy. Pantry, finished food, active orders,
  cooking jobs, upgrades, selected chef recipe, prices and displays persist.
- Restore validates IDs, finite counts, phases, queue length, duplicate order
  and job IDs, capacities and timers. Tea break pauses the new simulation.
  Timers use game time, with no wall-clock or offline cooking in this slice.

If the private lead already uses save version 12, choose the next combined
version during integration rather than downgrading or replacing its state.
`restoreKitchen` is additive and validates the kitchen object independently;
retain the lead's other migration paths and level rewards.

## Integration map

| File | Responsibility |
| --- | --- |
| `content/cooking.js` | Data-only ingredients, recipes, gates, prices and upgrades. Stable recipe IDs are also used by saves, sprites and food props. |
| `rules/cooking.js` | Purchases, quoting, deliveries, pantry, recipe research, cooking stations, upgrades, chef and bounded restore. |
| `rules/cooking-sales.js` | Food availability, customer reservation, price lock, protected purse and exactly-once food receipt. |
| `rules/selling.js` | Adds optional food selection to the existing indoor browse/queue/pay flow; releases food holds with customer cleanup. |
| `model.js` | Schema 12, fresh/restore/save wiring, exports and one cooking simulation update before shop checkout. |
| `content/cooking-layout.js` | Fixed service plot, receiving route, focus/receiver points and deterministic delivery pose. |
| `cooking-world.js` | Native truck, paving, rolling cart, parcels, hob, animated steam and hired ghost chef. Reads state only; no new point lights. |
| `food-props.js` | Native food miniatures and shallow shop wall displays, with owned-resource disposal. |
| `places.js` | Two product cabinets on shop side walls, product interaction and stock refresh without rebuilding the room. |
| `scene.js`, `wilds.js` | Plot/route footprint, camera extent after purchase, contextual picking, pooled lamp position, optional existing-Shane receiving walk and diagnostics. |
| `ui/cooking-sheet.js`, `ui/cooking.css` | One responsive sheet, four direct tabs, explicit order and cancellation feedback, shelf/price controls and collapsed upgrades/chef. |
| `main.js`, existing menu sheets | Contextual truck/display/cooker entry, Upgrades/More links and concise delivery/cooking notifications. |
| `ui/cooking-icons.js`, `assets/cooking-menu-icons.webp` | Twelve generated warm gothic illustrations in one 166,668-byte transparent atlas with reusable URL. |
| `build.mjs` | Includes cooking stylesheet and embeds the existing single-file runtime as usual. |

### Map and rendering boundaries

The service plot spans **x 37.8–46.1, z 0.8–5.4**. The truck's body is centred
at x 42.75, z 2.8. The cart travels at x 38.8 from z −6 to z 4.2; the route
metadata includes the complete wheel/cart envelope. The public exit path at
z 6.6 remains clear, as do Skyla's shop and meadow route.

Purchase clears the bounded north receiving-gate opening and exactly two
explicitly tagged original trees that hid the truck. Stable source-box
fingerprints keep this correct even if the hayride gate already compacted the
same mesh. Other trees and buildings are preserved. A 9,552-triangle height
field continues the farm's exact cobble recipe into an apron at
x 40–46.7, z 0.8–7.5, joining the public path with soft grass and leaf edges.
The truck/cart/planters use 230 native boxes. No checkerboard platform or thick
kerbs remain. Camera
bounds and the wilds clear footprint include the new area after purchase;
`fieldWidth` and the entire farm ground are not expanded just to fit this
truck. No duplicate map, attraction or house is created. Farm light pooling
continues to own illumination; the truck contributes a position record rather
than a new PointLight.

Generated source art, crop metadata and packaging instructions are under
`docs/plans/cooking/art/`. `tools/prepare-cooking-icons.py` reproduces the
768×576 WebP. The full source PNG is not imported into the runtime.

## Review, rebuild and take-over

Start from a clean worktree. Inspect the contractor source rather than merging
an artifact branch. If handover 43 is already incorporated, apply only this
increment. If the lead has new unpublished changes in shared integration
files, merge those deliberately; do not reset the lead workspace.

```sh
git fetch origin contractor/cooking-foundation
git worktree add ../pumpkin-cooking-review -b review/cooking origin/contractor/cooking-foundation
cd ../pumpkin-cooking-review
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-cooking.html
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-cooking.mjs /tmp/pumpkin-cooking.html /tmp/cooking-qa
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/smoke-exterior-release.mjs /tmp/pumpkin-cooking.html
```

The repository's legacy tracked `voxel/node_modules` symlink is a machine-local
dependency shortcut. Its target must not be changed by the contractor patch;
install dependencies in the review worktree as appropriate.

## Verification and release

The runtime is complete at **`ba99b87a5a6d7a94e8ba584d32fca42970828c30`**.
Later handover/evidence commits do not change it. The normal standalone download
is **Pumpkin-Patch.html**, packaged as **Pumpkin-Patch-HTML.zip** on the
artifact-only branch **`contractor/cooking-download-2026-10-26`**. Its
`delivery.json` identifies the final source commit and every download checksum.

**HTML SHA-256:**
`e8601b62048df0df52e035fc332c4b080d612ea6fb52d6a986d9c362b49c5ecf`.

- **67 Node test files pass**, locally for the cooking integration and again
  in final-runtime CI. New cooking files contain 18 rules cases, 8 sales
  scenarios (including 150 mixed checkouts) and 5 world/placement cases.
- The complete player/browser flow passes **44/44 checks** on pinned HTML
  `4f4c9552…`: purchase gates, paid delivery/cancellation, paused timers,
  cart, cooking, prices, accounts, finite-wallet food checkout, home range,
  chef, mobile/Fold layouts and save/reload.
- The subsequent cobble-apron build passes **9/9 visual checks** on
  `4d47c000…`, with six reviewed screenshots across desktop, phone and Fold.
- The **exact release HTML** above passes **8/8 focused checks**: boot,
  unloading cart, truck selection, phone touch targets, both food cabinets,
  state invariance, one canvas and no browser errors/external requests.
- The unchanged standard **48-check desktop/phone smoke suite passes** in
  [final-runtime GitHub CI](https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/40255935938/job/121357656460).
  Both the voxel and root check jobs are green.
- A clean incremental patch rebuild is byte-identical to the release HTML.
  The review archive must include the unchanged root `src` modules that the
  voxel rules import; `voxel` alone is not a complete repository checkout.

Reports, exact hashes, scopes and reviewed screenshots are in
[`../contractor-patches/cooking/verification/`](../contractor-patches/cooking/verification/).
The preliminary failed candidate is retained and explicitly labelled; it
identified narrow controls, occluding trees and overly wide truck framing,
which were fixed before the passing runs. Changes after the full flow are the
cobble apron and woodland exclusion, then the existing Shane actor waiting at
the receiving waypoint until the order is credited/cancelled. The latter was
code-reviewed; physical end-to-end actor walk timing was not measured.

QA uses local browser fixtures for funds/levels; the downloadable game retains
its normal new-game state and progression. Managed Chromium blocks direct
`file://` and native fullscreen, so the unchanged HTML was served on loopback.
Physical Fold frame rate, native OS fullscreen and Android file-handler
behaviour remain unverified. The fullscreen button is retained, and existing
saves can be moved through the game's export/import when browser origins differ.

### Patch choices

The artifact branch contains both patches and **Cooking-Contractor-Patch.zip**.
Choose one; do not apply both:

1. **cooking-from-5083446.patch** — incremental cooking against completed
   exterior base `5083446e1ffcc94f370feff0e533150899c771f3`.
2. **exterior-and-cooking-from-3f92ca8.patch** — combined exterior plus cooking
   against published lead `3f92ca8df92e07b09445ce092101e9309c00288c`.

A source branch pull/review is equally valid. The artifact branch is downloads
only. Preserve private lead changes and merge shared integration files rather
than resetting that workspace.

## Follow-on roadmap

1. Reconcile recipe unlocks, chef timing, research and margins with the lead's
   recovered 20-level economy. Keep ingredient cost, delivery fees and consumed
   pumpkin opportunity cost in the pacing model.
2. Expand recipes and ingredient research through those later levels, then add
   recipe mastery and more informative margins/demand history if playtesting
   supports them. Preserve the current save IDs rather than renaming content.
3. Connect deliveries to a shared route/receiving-bay network if more supplier
   carts or service buildings are added. Reserve the entire vehicle envelope
   and retain exactly-once delivery credit; do not cross public guest paths.
4. Add richer kitchen tasks, physical pantry storage and guest serving props
   after this paid-order-to-food-sale loop is stable. Any automatic ordering
   needs explicit player budgets and limits.
5. Evaluate truck appeal, decorations and guest demand on a physical unfolded
   Fold. Add complexity only where it improves the management loop without
   adding permanent HUD clutter or menus inside menus.
