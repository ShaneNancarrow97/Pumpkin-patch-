# Cocoa hospitality belongs with Sandy

**Sandy’s cocoa → Upgrade** now contains the Cocoa hospitality card alongside her stand improvements. It shows the current tier, current/next cocoa service time and pumpkin patience. The purchase has been removed from **Visitors → Spending**, so the upgrade has one discoverable purchase home.

The original saved field `visitorUpgrades.cocoa`, upgrade ID `cocoa`, prices (£250 / £700 / £1,400), Bring a friend prerequisite, level-gate lookup and `buyVisitorUpgrade` transaction remain unchanged. Existing ownership, service/patience effects and save restoration are preserved. A locked card explains “Bring a friend required”; a completed card shows “Fully improved”. The new binding saves once and retains Shane/Natalie’s existing tier-one/tier-three flavour lines.

## Integration

- `src/ui/festival-meadow-sheet.js` owns the new card and binding. Both the dedicated Sandy sheet and embedded Cocoa tab use it.
- `src/ui/farm-sheets.js` only removes `cocoa` from the visitor Spending category list; Skyla’s display-table work is a separate hunk owned by another contractor.
- Card selector: `[data-cocoa-hospitality-card]`.
- Purchase selector: `[data-cocoa-hospitality]`.
- Existing navigation: `[data-sandy-section="upgrade"]`.
- No rule, economy, save, global navigation or stylesheet change is needed.

Thirty actual named tests pass:

```sh
node --test --test-isolation=none test/cocoa-hospitality-menu.test.mjs \
  test/cocoa-menu-and-guests.test.mjs test/sandy-deluxe.test.mjs \
  test/festival-meadow.test.mjs
```

The three new tests load the real service menu factories and real transaction rules, stubbing only artwork/shared thumbnail markup. They check one purchase location, no visitor duplicates, correct existing price/effects/save state, prerequisite/affordability/paused behaviour and completed tiers without another charge. `git diff --check` passes. No browser, build, entry-point, commit or push action was performed by this subtask; parent integration owns the final rendered menu check.
