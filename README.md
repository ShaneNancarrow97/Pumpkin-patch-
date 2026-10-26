# Pumpkin Patch — refined business menus

## Play
Extract Pumpkin-Patch-HTML.zip, then open Pumpkin-Patch-Refined-Menus.html in Chrome or Safari. This is the complete offline game, including its embedded art, music and fonts. Normal starting conditions, existing fullscreen controls and save import/export remain. No QA money or unlocks ship in the file.

## What changed
- Manage is a named, grouped directory for farm upgrades and businesses.
- Maisie's kitchen: Cook, Supplies, Sell, Upgrade. Ready recipes come first; guided ingredient lists prepare a quote without spending. Home equipment and truck automation have clear homes.
- Sandy's cocoa: Menu & stock, Helpers, Upgrade. Prices and restocking stay together, with an explicit two-step meadow/stand setup for a new business.
- Visitors: Arrivals, Spending, Rushes & VIPs. Hayride: Overview, Scares, Upgrade, including tractors and route length.
- Consistent quieter panels, clearer amber actions, larger touch targets and stable live selectors/disclosures. The persistent HUD and game world remain unobstructed.

## Claude contractor pickup
Read 47-business-menu-refinement.md. Source branch: contractor/menu-refinement, commit e2cba9965ff852a5d844fe7ccb9912ae6fc303eb. Runtime: 002df4b31bdd06588e621391355690f74525df2a.

This layers on completed workshop handover 46, base 2da0f293cc6c4b4b2506a4a27c717099d1226695. Apply menus-from-2da0f29.patch only when that base's features are present, or review/merge the source branch on a clean branch. Preserve private Claude changes; do not reset the lead checkout. Shared integration files require review. No model, economy, world, progression, art or save-format changes are included.

git apply --check /path/to/menus-from-2da0f29.patch
git apply /path/to/menus-from-2da0f29.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/refined-menus.html

The small Claude patch ZIP includes code, tests, QA tools and the handover. Screenshot evidence stays on the source branch. The artifact-only contractor/menu-refinement-download branch contains downloads; do not merge that branch into game source.

## Verification
77 Node test files pass. The browser flow passes 54 checks on its pinned build; a subsequent focused layout/unlock review passes 32. After the last plot-hint wording fix, the exact download passes 8 release checks. All report hashes are recorded in delivery.json. Tests cover real orders, payments, cooking, prices, restocking, VIP/fleet purchases, save/reload, keyboard controls, live selector/disclosure stability and desktop/phone/landscape/Fold shapes.

Both CI jobs pass on the exact runtime: https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/40406614499. Clean committed-source and actually applied patch rebuilds match this HTML byte for byte. The patch also passes git apply --cached --check against its stated base. No external runtime assets are requested.

Physical Z Fold 7 frame rate, Android file handling and native OS fullscreen remain unverified. Managed-browser checks serve the identical single-file HTML over loopback. Use the game's save export/import when changing file origins or moving devices.

HTML SHA-256: 2e75700848ce22833468521af835fb786583337add68745a8177b29bafabc747
