# 47 — Clearer, quieter business menus

Branch: `contractor/menu-refinement`.
Base: `2da0f293cc6c4b4b2506a4a27c717099d1226695` — completed workshop handover 46.
Runtime: `002df4b31bdd06588e621391355690f74525df2a`.
Download HTML SHA-256: `2e75700848ce22833468521af835fb786583337add68745a8177b29bafabc747`.

This is a UI contractor increment. It preserves the rules, economy, art, world, progression and v13 saves delivered in 46. There is no reset or save migration. Claude's lead branch and unpublished work were left alone.

## What the review found and changed

The previous Cooking page put two idle cooker cards, six horizontally scrolling destinations and repeated improvements/accounts ahead of the actual food. Sandy's prices, seven specials, comforts and helpers formed one long page. Rushes and VIP entry sat among unrelated visitor upgrades; tractor and route improvements shared the operational page. Live redraws could also collapse disclosures or replace an open native selector.

The new surfaces use restrained plum/charcoal, warm amber purchase actions, Fraunces headings, DM Sans labels and existing generated dish/character art. Text is at least 12px and controls at least 44px. The world and persistent HUD remain the focus; these are deliberate, closable management surfaces.

## Where players find things

| Entry | Sections and purpose |
| --- | --- |
| **Manage** in the dock | A grouped directory: Grow your patch, then Your businesses. Skyla, Sandy and Maisie are named explicitly. Visitors & VIPs has its own entry. Internal `data-tab="shop"` is retained. |
| **Maisie's kitchen** | **Cook · Supplies · Sell · Upgrade**. Four destinations fit on a phone without horizontal scrolling. |
| Cook | Choose the truck or home cooker and batch size. One recipe expands at a time. Ready actions come first; new discoveries and future unlocks unfold below. Mix ingredients is a visible alternative. Idle cooker cards are gone; a paid run still shows progress and safe cancellation. |
| Supplies | Order supplies or inspect the shared pantry. Recipe shortcuts prepare a missing-ingredient list; they never spend money. Incoming paid deliveries are subtracted, and a list over the 40-item order limit is explicitly partial. The quote must still be purchased with the real Order button. |
| Sell | Skyla's two food shelves, stock counts and selling prices. Dish art and price fields have their own measured columns. Accounts live here rather than repeating on every page. |
| Upgrade | Truck & chef, or Home equipment. Existing ownership, room placement, pricing and unlock checks are unchanged. Missing cookware points here; fully supplied recipes point to the pantry rather than creating an empty shopping cart. |
| **Sandy's cocoa** | **Menu & stock · Helpers · Upgrade**. Each product keeps stock, supply cost, selling price and restock button together. Future specials unfold separately. Helpers contain courier/barista/automatic supplies. Upgrade contains the next stand and meadow comforts. |
| New cocoa business | Explicit two-step setup: buy meadow land (existing level-4 gate), then build the stand (existing level-5 gate). Purchases leave the management page open; viewing the plot is a separate action. |
| **Visitors & VIPs** | **Arrivals · Spending · Rushes & VIPs**. Events show their own purchase gate, interval and pause control together. Spending links directly to existing carrier bags/tip management. The redundant farm section strip is omitted on this page. |
| **Hollow Hayride** | **Overview · Scares · Upgrade**. Overview retains admissions, boarding, ticket stepper, free ride-along and accounts. Scares opens the installations directly. Upgrade groups wagon capacity, tractors/crew and longer route/scenery. No ticket/fleet/route rule was changed. |
| **More** | Kitchen & food remains an alternative shortcut with a clear cook/order/sell description. |

The locked-plot hint now points to Manage → Farm upgrades. Business titles and view-in-world links are consistent. Small SVG direction marks avoid missing glyphs in the embedded font; all character, dish and product art is reused from the existing atlases.

## Stability and integration

`ui/service-kit.js` provides shared navigation, section headings, metrics and next-action markup. `ui/service-menus.css` is loaded after the earlier styles and uses theme variables. It refines the shared sheet frame, then styles the new business pages. Existing phone bottom sheets, landscape side sheets, safe areas and camera blocking remain.

`ui/kitchen-guide.js` is read-only. It calculates shopping lists and the next useful step with existing recipe/equipment/stock rules; the purchase functions remain authoritative. It has no DOM or Three.js dependency and is covered by meaningful guide/list tests.

`ui/menu-memory.js` keeps separate scroll/disclosure state per business page, restores disclosure height before scroll position, and defers redraw while a native select is being used. Focus and range dragging remain supported. The Manage popup keeps its arrow-key/Escape support; farm shortcuts are gated while it is open so selecting a menu item cannot also boost the pumpkin.

Legacy `openCookingSheet()` view IDs still work: `recipes`, `mix`, `deliveries`, `pantry`, `food`, `equipment`, plus `upgrades`. `openHayrideSheet()` now accepts optional `overview`, `scares` or `upgrade`; no argument opens Overview. New `openShopSheet`/`openCocoaSheet` convenience functions are used inside the shared UI context. The public test controller still exposes the original entry points.

A recipe's start/research button exists when its card is expanded. Automation targeting those actions should first click `[data-recipe-select="recipe-id"]`. Current menu QA lives in `tools/qa-service-menus*.mjs`; older handover-46 browser reports and their scripts are pinned to their original builds.

## Claude pickup

Apply `menus-from-2da0f29.patch` only after handover 46 is present, or merge/review `contractor/menu-refinement` on a clean review branch. Do not reset the lead checkout or overwrite unpublished work. Inspect shared integration edits in `main.js`, the sheet modules, `menu-memory.js`, `index.html` and `build.mjs`. Model/rules/content assets are unchanged.

```sh
git apply --check /path/to/menus-from-2da0f29.patch
git apply /path/to/menus-from-2da0f29.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/refined-menus.html
```

The artifact branch `contractor/menu-refinement-download` contains the standalone HTML, HTML ZIP and lightweight patch ZIP only; do not merge it into game source. Large screenshot evidence remains on the source branch and is omitted from the runtime patch.

## Verification

77 Node test files pass, including five guide/list scenarios. A 54-check browser flow exercises guided ordering, exact payment, first cooking, shelf pricing, cocoa pricing/restocking, VIP purchase/pause, second-tractor purchase, menu keyboard behaviour, save/reload and desktop/phone/landscape/Fold layouts. It also checks disclosure retention and native selector stability during live progress.

The later focused review passes 32 checks covering the two-step unlock screens, compact helper controls and final layouts. After a final navigation-hint wording change, the exact shipped HTML passes a separate 8-check release smoke check. Reports identify each immutable HTML hash; do not combine evidence from different builds without reading their scope. The clean committed-source rebuild matches the download byte for byte. The downloadable patch manifest records its separate apply/rebuild verification.

[CI run 40406614499](https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/40406614499) passes both the root check and voxel jobs on the exact runtime commit, including tests, build and desktop/phone smoke checks. Subsequent commits contain only this handover, QA tools and verification evidence.

See `docs/contractor-patches/menu-refinement/verification/` for the final reports, screenshots and CI record. Fixtures grant funds/unlocks only in QA browser storage; normal starting conditions are unchanged in the download. The tests serve the identical offline HTML over loopback because managed Chromium blocks direct file navigation. Physical Fold 7 frame rate, Android file handling and successful native OS fullscreen remain unverified; existing fullscreen controls are retained.
