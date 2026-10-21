# Contractor fix: unpurchased haunted house crash and missing cocoa art

The previous house check staged restoration before the map tap. It missed the user's failing state: tapping an **unpurchased** property.

`createHollowContext()` called `gateText()` from outside its lexical scope. That helper lived inside `hollowSheets()`. Opening the unowned card threw a ReferenceError; the selected card then threw again during the render hook, preventing the next animation frame from being scheduled. The helper is now at module scope, shared by both views. No changes to unlock, restoration or save rules.

Sandy's `cocoaArt()` returned empty spans with background images, but `.cocoa-art` had no CSS rule. Images therefore had no dimensions. Restore the 56px block with the correct 3 × 2 atlas scale and no-repeat. Plain cocoa now also shows its existing product art in its own row; specials use their existing images. No new artwork or price changes.

Regression: `node voxel/tools/qa-house-menu-cocoa.mjs /path/to/game.html /tmp/menu-cocoa-qa`. Tests a real touch tap on the fresh unowned property, continued simulation, locked Manage, eligible unowned card/purchase, loaded cocoa images with actual dimensions and a phone layout. It deliberately does not pre-purchase the house. Software Chromium needs frame-based waits; a fixed 500ms timer was insufficient on this machine.

Preserve Claude's lead checkout and existing saves. Pull/cherry-pick this fix on the contractor branch or review the packaged patch.

Validation: all 29 Node test files pass. Browser regression covers the actual fresh-house touch ray pick and both level gate states, frame-loop continuation, and all five cocoa product atlas cells. Final browser results are recorded alongside the contractor verification reports.
