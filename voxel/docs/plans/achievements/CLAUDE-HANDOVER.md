# Claude handover — achievement plan

**Planning only. No runtime achievement rules or save changes are implemented.** User asked for a full early/mid/late/secret achievement plan and an eye-catching, clean console-style toast that opens precise details, plus an achievement library.

Start with `PLAN.md`, then `catalogue.json` / `CATALOGUE.md`. Open `preview.html` for an interactive UI concept with explicitly simulated progress. The prototype has no connection to game saves or payouts. `EVIDENCE-AUDIT.md` identifies actual game metrics and new instrumentation needed before shipping.

Source plan branch: `plan/achievement-ledger`, based on contractor head `87714df8a6e3f158ce3e6e6279f14777e5749954`. The underlying boost/helping-hands implementation is `2b50fa37a58b8c87132b290fc2bfc0af79f852c6`; lead base was `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`.

Take only the planning commit or copy `voxel/docs/plans/achievements/`. Do not merge earlier contractor ancestry merely to take these documents. Recheck the latest lead before choosing a new save schema number or editing shared UI/input files.

## Proposed scope

- 64 achievements / 1,000 nonspendable Haunt Score: 16 Early, 20 Mid, 16 Late, 12 Secrets.
- Compact original purple/amber unlock pill with a short badge reveal, optional chime and 5.4 seconds readable dwell; click opens that exact achievement's evidence.
- On-demand library with phase/status/search filters, progress, optional secret hints and clear back navigation.
- Stable receipts, honest old-save recognition, source-qualified counters and once-only cosmetic collection rewards.
- One notification coordinator shared with existing level, notice and NPC reward UI; no surprise controller focus steal or hidden reward expiry.

## First implementation slice

Build the definition/receipt/evidence foundation and 16 Early entries first, then toast/details/library. Prove one direct unlock, one imported achievement, one multi-unlock batch, one declined/cancelled action, one toast dismissed before viewing and one reload between award and presentation. Add remaining groups only when their counter sources are correct.

Keep the 17 existing Memories and 23 Favours. Map shared accomplishment evidence and suppress duplicate toast moments. Favours keep their current rewards; achievements do not pay another coin bonus. Points never count towards level earnings or guest appeal.

## Critical source facts

The current reviewed game has 18 recipes, 20 costume IDs, 5 pumpkin varieties and 5 carving shapes. Frozen launch sets are supplied separately. Lifetime `harvested` includes helpers and idle big-pumpkin gifts. `sold` is served pumpkin customers. Combined cooking totals do not prove home/manual/recipe-specific history. Last-page reading state is not an all-pages record. Pet poses and watched animation flags do not prove completed gameplay.

New manual/owner/secret counters start at zero with “Tracked since this update”; existing provable state can be quietly recognised without fabricated dates. The village expansion is still a plan and belongs in a future separate achievement volume, outside the base 64 / 1,000 finish line.

The house currently forbids duplicate placement of an item ID and has only ten unique books. The achievement catalogue therefore asks for one cat basket, one dog bed and a bowl set, and all ten launch books. Do not copy the older twenty-book Memory or require two identical dog beds. Those existing design/rendering inconsistencies are separate lead follow-ups; this planning package does not fix runtime code.

## Evidence and validation

This package validates catalogue counts, IDs, score totals, frozen set references and prototype interactions/layout. It does not claim in-game unlocks, save migration, rewards, notification arbitration or gamepad bindings have been implemented or playtested. See `VALIDATION.md` for the concrete prototype checks.
