# Skyla display table selection

The shop now has one clear display editor: choose a table, then choose its pumpkins. Two or four illustrated table cards show the current stock, table number and physical position. Those names match `SHOP_SPOTS.tables`: back left, back right, front left and front right. Only the chosen table expands its variety choices, instead of repeating a dense strip of chips for every table.

Every pumpkin choice uses the game's existing rendered thumbnail, available stock and base selling price. “On this table” and its checkmark identify the current choice; a disabled “On Table2” identifies a variety already used elsewhere. Sold-out varieties remain selectable for planning, as the existing rule permits. The Empty tile clears a table. Reassigning stock is explicitly free; base sale prices are not presented as purchase costs. The existing extra-table upgrade and its actual purchase cost remain in Improve the shop.

The only persistent changes are still made by the existing `data-display` → `M.assignDisplay` handler. Its IDs, save format, duplicate-variety rules and purchase handlers are unchanged. The editing table index is local presentation state and clamps safely when fewer tables are available after a load. L1/R1 can select the table tabs through the existing `data-pad-tabs` adapter; touch uses single taps. No new modal, confirmation or hold gesture was added.

## Files and dependencies

| File | Change / integration boundary |
| --- | --- |
| `src/ui/shop-display-tables.js` | Pure read-only view and rendered table cards/options; receives existing `ui.thumb` art |
| `src/ui/farm-sheets.js` | Imports the helper; stores one transient selected table; replaces only `shop(s)`'s table rows; binds table-tab selection |
| `src/ui/service-premium.css` | Scoped `.skyla-display-*` rules; this stylesheet is already in the build, so no new build hook is needed |
| `test/shop-display-tables.test.mjs` | Three rule/presentation consistency checks |

The Cocoa hospitality move owns `festival-meadow-sheet.js` and the Visitors selected-ID list in `farm-sheets.js`. The tip upgrade work owns `customer-care-sheet.js` and its rules. This display editor does not change either part.

## Verification

`node --test test/shop-display-tables.test.mjs` passes three named checks: rendering is read-only; all enabled choices agree with the actual assignment rule and preserve coins/stock; selected extra-table identity, sold-out planning and hidden duplicate slots remain truthful. The log is `/workspace/skyla-display-tests.txt` in this work session. JS syntax and whitespace checks pass. The parent browser pass covers actual thumbnails, touch targets, responsive layout, controller tab navigation and the retained single-tap assignment handler.

Browser QA selectors: `.skyla-display-section`, `[data-display-table="0"]` through `3`, `#skyla-display-options`, `[data-display="slot:variety"]` and `[data-display="slot:null"]`. Table tabs expose `aria-selected` and `aria-pressed`; pumpkin choices expose `aria-pressed`. Preview prices are the existing variety base prices, while stock counts use `M.available` and exclude reserved pumpkins.
