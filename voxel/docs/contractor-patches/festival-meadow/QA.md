# Verification record

- All **19 Node test files** pass, including the existing house, costumes, music, progression and placement suites.
- New rules checks cover land/stand purchase gates, the **level-5 unlock followed by a separate paid purchase**, paid supplies/capacity, finite guest budgets, physical FIFO routing, once-only cocoa payment, closure/sellout, large time slices, courier reserve, save migration and malformed saves.
- Customer-care checks cover paid bag/jar tiers, larger actual baskets without free budget or overselling, rarity-aware random quality, faster-service tips, spare-cash caps, once-only settlement, separate ledger reconciliation and save round-trips.
- NPC card controller checks cover Collect double-click safety, timed fade without losing rewards, Journal collection and menu countdown suspension.
- Menu/needs checks cover tier locks, editable price bounds, price-sensitive demand, thirst/hunger choices, exactly-once snack/drink payment, pumpkin spending reflected in guest cash, and the departure path beyond the new gate.
- Native-art checks cover finite positive voxel transforms, compacted instance buffers, a single continuous expanded ground mesh, and all five physical drink/snack models. Sandy's three source frames have matching dimensions/foot anchors; lossless runtime encodings preserve alpha and every visible source pixel exactly (`assets/sandy/manifest.json`).

## Browser results

The [Sandy/cocoa report](verification/sandy-checks.json) passes all checks, with no page or console errors: actual paid level-5 purchase, Sandy textures loaded, picking the **real voxel signboard**, paid premium stock and prices, tapping a walking guest to inspect needs/money, finite-purse sales, phone/Fold/landscape controls at least 44px, wide Fold fullscreen, actual voxel snacks/cups, default bloom/shadow rendering and save/reload of stock/prices/unlocks.

The preceding [customer-care report](verification/customer-care-checks.json) passes NPC collection, timed fade with Journal recovery, care upgrade purchases, exact live tips reconciliation, all four UI sizes and save/reload with no page/console errors. Its unchanged tip/reward rules were rechecked by the final unit suite after menu/guest additions.

Screenshots for review: [Sandy and the native signs](verification/sandy-stand.png), [live guest inspector](verification/guest-inspector.png), [unfolded fullscreen farm](verification/fold-expanded-farm.png), [phone menu](verification/phone-menu.png). The visitor heading/cash and prices shown come from staged live rules, not static mockups. The guest heading was shortened to “Visitor N” after the inspector capture; its stats and layout are unchanged.

These are Chromium/SwiftShader checks at desktop 1280×800, phone 390×844, landscape 844×390 and Fold 874×787. Content screenshots use bloom/shadows off for software-rendering speed; the Sandy run also captures default bloom/shadows on. Managed Chromium blocks local-file access, so the identical self-contained HTML is served over localhost. Physical Fold/Safari hardware was not tested.

## Refinement and packaged build

The existing full-game regression [smoke log](verification/core-smoke.txt) records **32 passing desktop/phone checks**, with no page errors, on the `18ca059` gameplay build before the small refinement. It covers planting, boosting, harvest, menus, sprite/voxel mode, home furnishing, flipping, shop customers, returning to the patch and equipping a costume.

The rebuilt refinement HTML passes all **13 focused browser checks** in [the refinement report](verification/refinement-checks.json): accurate labels, disabled paused controls, rejection/restoration of stale price edits, editable resumed prices, phone/Fold/landscape 44px controls without overflow, actual guest picking, Escape, entering the house/shop, returning outdoors without a stale card, native-world signage and no page/console errors. See the [refined phone capture](verification/refined-phone-menu.png). The **19-file unit suite** passes; the subsequently extended native-art/guest-card suites also pass, including steam for every drink and closed/snack-only stands.

The final runtime changes after the full regression are listed in [handover 10](../../handovers/10-festival-refinement.md). Cooking and levels 13–20 remain roadmap work.

Download artifact: `Pumpkin-Patch-Sandy-Cocoa.html` (14,358 KiB, self-contained). SHA-256:

```text
e7c8d84ea5ea014969ac641214dadf039ae4f9131736d5256c6d7c6dbe1d0860
```
