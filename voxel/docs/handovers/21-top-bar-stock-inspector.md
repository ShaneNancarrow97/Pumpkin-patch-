# Contractor: top-bar pumpkin and cocoa counts

A compact stock button is now next to coins in the HUD. Its number counts physical pumpkins in the barn. Tap it to expand a small live panel: Orange, Moonlight, Witchfire and Starlight counts, barn capacity, a visible divider, then plain cocoa, flake cocoa, ghost marshmallow cocoa, midnight sauce cocoa and s’mores counts.

Pumpkins reserved in customer baskets remain in physical stock until paid; the panel states how many are reserved. Drinks/snacks use Sandy’s real stock fields and remain separate from barn capacity. Locked/unbuilt stands show zeros and a short build hint rather than inventing stock.

The panel floats below the HUD without moving the game canvas. Escape, its close button or an outside tap dismiss it. It closes for other menus/editing/celebrations and keeps the simulation running. Exact counts are in the panel; large top-bar totals use compact formatting. Mobile targets remain 44px; the panel scrolls on short screens.

Files: index.html HUD button, ui/stock-popover.js, main.js wiring and style.css. No new save fields, inventory rules or pricing changes. Targeted browser QA seeds distinct stock values, verifies every displayed count and live changes, then checks Fold, phone, narrow phone and landscape layout.
