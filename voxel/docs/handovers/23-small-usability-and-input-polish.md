# Contractor: small usability and input polish

Follow-up to the eight skins, stock HUD and Sharp rendering release. Preserve Claude's lead checkout and existing saves.

## Stock inspector

- Shows a storage meter, remaining spaces and a full-barn warning; the HUD stock chip gains a quiet full-state outline.
- Correctly distinguishes an unbuilt stand, a closed stand, an open stocked stand and an open stand out of drinks.
- Two optional actions go straight to barn upgrades or Sandy's cocoa management. They do not buy anything automatically.
- Counts, capacity and reservation handling are unchanged. The aria meter is clamped for old over-capacity saves while its text still states the real physical stock.

## Skin catalogue

- Owned-only filter, current look and collection count.
- Empty owned/tier results offer Show all.
- Free Classic look equips default walls/roof/trim/door, preserving fencing, coins and all purchased skins. Owned skins remain freely reusable.
- Pure helper `equipClassicEstateLook` rejects paused/malformed states. No additional save fields or cosmetic prices.

## Live menus

`ui/menu-memory.js` remembers scroll by menu and selected segmented subview within the browser session. Live rebuilds preserve identifiable input focus/caret. A range input isn't replaced while its pointer is dragging, so the volume slider remains usable while the simulation runs. Escape also closes a menu from a focused text field; closing restores focus to its visible launcher where possible. No persistent page layout or extra permanent HUD controls.

## Farm input

Farm/room mouse input ignores non-primary starts and requires a tracked primary release to act. Browser context menus, canceled/lost pointer capture, blur and hidden-page interruption cancel gestures instead of converting them to a delayed tap. Untracked releases do not clear a valid active drag. Coincident touch starts have a safe minimum pinch distance; sub-pixel separation is ignored rather than producing NaN zoom. Existing estate/foyer controls and render quality are retained.

## Verification

- All 33 Node test files pass, including Classic ownership/purse/fence preservation.
- 15 targeted UI checks pass: stock state/shortcuts, owned skins and Classic reuse, scroll restoration, continuous slider dragging, Escape from a text field, and stock-panel fit at 390×844, 320×740 and 844×390.
- 9 targeted farm-input checks pass: actual left/right/middle pumpkin clicks, canceled gestures, coincident real CDP touches, untracked releases and continued normal tapping. The test honours the existing 0.14 game-second tap cooldown.
- No runtime exceptions in either browser run. Core browser QA uses Performance rendering and staged money/stock; Sharp remains the shipping default and was not lowered.

Tools: `qa-minor-polish.mjs` and `qa-farm-input.mjs`. Reports and a stock inspector image are in the contractor verification directory. No income rebalance, house art changes, save reset or new dependency.
