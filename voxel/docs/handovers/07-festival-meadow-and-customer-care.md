# Claude handover: Moonbrew Meadow, customer care and NPC rewards

**Branch:** `contractor/festival-meadow`. **Integration base:** `5b07855`, which merges Claude's published `8176e32` with the earlier contractor pack ending at `247cbf5`. This delivery is intentionally separate from `voxel-reference`; it has not been merged there.

Claude remains the lead developer. Keep unpublished shop/fixtures, portrait fixes, placement, fog and visitor-rush tuning when merging. We did not have those changes. The root 2D game and its data are untouched. No new dependencies, point lights, alternative progression system or new save key are introduced.

**Final follow-up:** [Sandy, priced menu, guest needs and exit](08-sandy-menu-guests-and-exit.md) supersedes the first-pass stand descriptions below. Cocoa purchase unlocks at level 5, with a separate £650 payment; the 20-level cooking plan is in [09](09-cooking-and-twenty-level-roadmap.md).

## Part 1: a playable farm extension and physical cocoa business

Shop → Moonbrew Meadow opens management. At patch level 4, £1,200 buys the east extension: farm width increases from 40 to 54 world units, with one prepared stand pitch. Its on-map sign is clickable; after purchase, the physical stand opens its management sheet. Pan/pinch and Fit view include the purchased land.

| Stand | Build/upgrade cost | Patch level | Stock capacity | Maximum cup price |
| --- | ---: | ---: | ---: | ---: |
| Moonbrew cocoa cart | £650 | 5 | 30 | £4 |
| Lantern cocoa kiosk | £1,800 | 6 | 60 | £5 |
| Midnight cocoa pavilion | £4,800 | 8 | 100 | £6 |

Building includes 10 starter cups. Replacement premixed cocoa costs £2 per cup, bought in packs of up to 10, limited by remaining capacity. Selling price is selectable from £3 to the current maximum. Closing the stand sends waiting guests onwards without charging. Larger tiers change the actual model and shorten service time. A tier-2 £1,200 moth courier animates around the stand and optionally buys normal-price restocks at five cups or fewer, keeping £100 in reserve. It never generates free stock.

Each outdoor visitor arriving while the stocked stand is open brings an **explicit £4 / £7 / £9 festival allowance by stand tier**, shown with their budget. A non-mutating basket quote reserves their intended pumpkin spending. They buy cocoa only if the whole planned basket plus the drink is affordable; guests with no affordable pumpkin can still buy just a drink. Higher cocoa prices compete with spending money, so fewer visitors may buy. Bag space does not create money.

A bounded, four-person FIFO queue walks along the actual cobbles, stops at the counter, pays exactly once, then takes a separate outgoing branch back to the pumpkin counter. Walking animation uses running world time while their normal stall clock is suspended. Their remaining budget governs the pumpkin basket. Party sizes and visitor frequency are still the existing rules; this feature does not overwrite Claude's later balancing.

Once a physical stand exists, the legacy `visitorUpgrades.cocoa` perk improves patience and service instead of also paying unconditional free-cup revenue. Before the stand exists, old saves retain the old perk. Cocoa sales have their own `festival.cocoa.gross`, `supplies`, `sold` and `invested` fields; `stall.cocoa` remains an all-time aggregate (including legacy cocoa), not a second payment.

### Cohesive map art revision

The initial second tile had a hard terrain seam and different fencing. In response to the user's review, the extension now replaces the base terrain with **one continuous original `yardGround` mesh**, extended to width 54. The original yard cobble palettes, scale, hash seeds, height, grass edges, soil and existing paths remain in use; the new path is supplied as an additional mask. There is no raised connector overlay. Pickets, lantern post caps and autumn crowns reuse the original world helpers. Front fence alignment continues at z=24.6, with planting outside it. Original edge trees/props are removed by positive-instance compaction; no zero-scale boxes or extra material/light counts.

Minimal `world.js` hooks are newly exported `yardGround({width, extraPath})`, `fenceRun`, `tree` and `lanternPost`; `buildWorld()` now returns its ground mesh as `ground`. Defaults preserve the unexpanded farm. **Do not replace your world.js:** port these small hooks into your current shop/building version. The adapter requires `world.ground` to replace/dispose its owned terrain once when opening land.

### Files and integration

- New constants/routes: `src/content/festival-meadow.js`.
- New pure rules: `src/rules/festival-meadow.js`.
- Native art/map adapter: `src/festival-meadow-world.js`.
- Management UI: `src/ui/festival-meadow-sheet.js`.
- `model.js`: fresh/restore festival state, update courier before selling, exports.
- `rules/stock.js`: extracts the existing basket loop into non-mutating `quoteBasket`; `chooseBasket` still reserves the same stock. Existing basket preference/fallback behaviour is preserved.
- `rules/selling.js`: allowance/planned route at arrival, detour tick before normal stall age, suppress legacy duplicate cocoa payment.
- `scene.js`: adapter tick/pickables, expanded pan/framing, excursion positions, cached carried cup and stand sales position. No changes to the costume engine.
- `main.js`: map picks open the correct sheet; Patch uses `scene.fitView()` to leave a close stand view.

## Part 2: carrier bags, quality and separate tips

Shop → Carrier bags · Tips & stats opens a compact Upgrades / Stats & tips sheet. Three carrier-bag tiers cost **£180 / £650 / £2,200** and add one pumpkin space each for both outdoor and indoor customers. They require the shop to be open. Visitor budgets remain finite; existing loyalty money is preserved. Guests carrying multiple pumpkins show an actual voxel paper bag at the stall and when leaving the indoor shop.

Three thank-you jar tiers cost **£250 / £1,000 / £3,800** and enable/improve tips. Each pumpkin receives a random quality grade **when its sale is committed**, not at harvest. This is deliberately a sale-grading model, without pretending that inventory stores per-pumpkin quality. Orange grades 1–5, Moonlight/Witchfire 2–5, Starlight 3–5. Receipts show the basket average and quality name. The saved sale serial and customer/route seed prevent frame-by-frame rerolls.

At the stall, service time is the wait after arriving at the pumpkin counter, excluding the cocoa trip. Indoors it includes queue plus checkout, excluding walking and browsing. Fast service targets are 4s outdoors and 8s indoors, so faster till upgrades help. Slower service reduces both tip chance and value. Generosity tiers set a maximum fast-service chance of 25% / 38% / 50%, further scaled by quality. Nominal tip rates are 4% / 6.5% / 9%, scaled by quality and speed. Each tip is capped at **£25 and the guest's actual spare money**; exact-budget guests cannot tip. The best-case percentage is 11.25% before those caps.

Tips are credited automatically on completed payment, once, alongside sale grading. They do not accrue on reservations, missed sales or cocoa. They add to `coins` and `earned` but **never** to `stall.income`, `shop.income`, `itemsSold`, or cocoa gross. The existing main balance still includes all income.

Separate saved ledgers:

- `customerCare.tips.stall` and `.shop`; `totalTips(state)` adds these.
- `customerCare.tipped.stall` and `.shop` count tipped customers.
- `qualityTotal` / `graded` give average pumpkin quality.
- Last 12 care receipts store goods `amount`, `tip`, `quality`, `service`, `quantity`, `visitor`, `route` separately.
- Existing stall and indoor-shop stats now show tips as distinct entries and label goods income “pumpkin takings”. The care Stats tab shows both routes, total tips, average quality and separate receipt lines.
- Sale events add `tip` and `quality`. Their `amount` is the actual whole coin credit for visual feedback; do not infer product revenue from it. Visitor `.amount` / indoor `.spent` remain product-only.

New modules: `src/rules/customer-care.js`, `src/customer-bag.js`, `src/ui/customer-care-sheet.js`. Minimal hooks in `selling.js`, `model.js`, `scene.js`, `places.js`, `farm-sheets.js`, `main.js` and scoped CSS. `places.js` changes only attach/release the visitor's bag; retain your placement implementation.

## Part 3: NPC favour collection in the game

`src/ui/npc-rewards.js` presents one existing completed favour at a time, with the NPC portrait/name, favour title and **Collect £…** button. The card fades after 12 visible seconds. Dismissal or expiry does not delete or auto-pay the reward: it stays claimable in Journal → Favours and the existing goal indicator remains available. It is shown only once per session unless the page is reloaded, avoiding repeated reminders.

Collection calls the existing `claimFavour`, saves immediately, and cannot double-pay. Collecting via the Journal also removes the card. Menus, level popups, pause, a hidden page, hover or keyboard focus suspend the countdown. The card overlays the world instead of moving the canvas or HUD. No quest definitions or rewards changed. **Tips remain automatic; manual collection applies to NPC favours.**

## Save contract

Schema **7** adds `festival` and `customerCare`. Schema 6 was the in-development meadow-only shape. v1–v5 saves gain safe fresh defaults; v6 meadow saves keep their land/stand and gain fresh care fields. Upgrades, stock, income, tips, grading serial and receipts survive reload. Malformed counts, capacity, prices, levels and route records are bounded. Existing progression and claimed-favour migrations stay intact.

Visitors, indoor customers, pending basket holds and unpaid cocoa excursions are still transient and cleared on save/load. Completed cocoa sales and tips remain recorded. This avoids stale holds, double charging and attempts to resume half a walking path after a scene reload. Tea break stops the rules and reward countdown.

## Verification / build

See [QA record](../contractor-patches/festival-meadow/QA.md) and the commands in the patch README. `tools/qa-festival-meadow.mjs` exercises actual purchases, map picking, queues, stock/price controls, upgrades, courier and save/reload. `tools/qa-customer-care.mjs` exercises in-game Collect, timed expiry/Journal recovery, real care purchases, tips reconciliation, layouts and persistence, then captures the revised expansion art. Both run the self-contained HTML over localhost to avoid managed-browser restrictions on `file://`.

## Next contractor work, not claimed as implemented

A kitchen ingredient pantry and research/recipe catalogue should become the next separate pure subsystem: spend ingredients → timed cooking jobs → finished goods inventory → assigned indoor-shop shelf slots → budget-aware customer purchases. Add the spooky-chef hire only after the manual crafting loop and stock transactions pass tests. More festival pitches should use the same coordinate/route interface with explicit stock, costs and customer budgets, rather than minting passive coins. Reconcile Claude's unpublished visitor-rush and economy changes before balancing the combined late game.
