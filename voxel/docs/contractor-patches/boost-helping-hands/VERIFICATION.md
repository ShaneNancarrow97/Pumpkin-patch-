# Verification — boost and helping hands

Implementation: `2b50fa37a58b8c87132b290fc2bfc0af79f852c6`, based on lead `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`. Rule and browser checks ran on 2 November 2026; delivery prepared on 3 November.

## Rules and build

- Complete `npm test` run passes: 105 test-file entries, zero failures. Raw result: `rule-suite.log`.
- Nineteen focused cases cover the new work: thirteen in `farm-work.test.mjs` and six in `farm-buttons.test.mjs`.
- Coverage includes separate paid ownership, level gates, old shared-auto migration, saved heat/cadence, pause and recovery, one/two/three picking, partial/full barn safety, shared saved water cooldown, owner-specific control timing, invalid frame intervals, crop identity and reservation safety.
- Independent review found a real helper-timer transfer issue. Fixed before the final build: a job retains its crop object and reserves its target, invalid work restarts, and larger picking batches protect the other owner's crop. The focused tests cover these cases.
- Production HTML builds successfully with the new CSS last. Exact file hashes and sizes are in `build-receipt.json`.
- `changes.patch` passes `git apply --check` in a detached clean worktree at the recorded lead base. No other working tree was modified.

## Actual game browser checks

The exact final HTML with SHA-256 `bd6a053533a1a5c2c01489085f012140746e6340c7e70d4da40f8062bdf1ba64` passes **22 focused browser checks** through the shipped game runtime. Report: `verification/farm-work-browser-report.json`.

Checks exercise real DOM input for Plant, Pick and hold-to-buy purchases, not only the pure APIs. Hiring Shane leaves Natalie unhired. Planting/watering training changes Shane only. Both basket tiers buy correctly; the manual button respects capacities 1, 2 and 3. Power/cooling purchases change their actual rule values. The overheated button disables and reads **Cooling**; pause freezes heat, active time restores availability, and old shared ownership migrates to version 15.

Layouts inspected at 1280 × 800 desktop, 884 × 1104 unfolded Fold-sized viewport, 390 × 844 phone and 844 × 390 landscape phone. Helper menus have no horizontal overflow and both boost cards remain reachable by scrolling. No page or console errors were recorded. Screenshots show the existing compact action cluster, separate portraits/training, amber purchases and the thermal lockout state. These are browser viewport checks, not physical-device or native Safari tests.

An earlier build also passed the first ten desktop checks of the repository's broad smoke (intro, sprites, planting/boost/picking, menus and closing). That slow software-WebGL run was stopped before the unrelated furniture/shop-floor/phone sections. `standard-smoke-partial.log` is partial evidence only; **the complete broad smoke is not claimed as passed**. Final-build confidence comes from the full rule suite and the separate focused 22-check browser run above.

The QA runner serves the single HTML over localhost because this managed browser blocks direct file navigation. The built file itself remains self-contained for normal downloaded HTML use. Screenshots use software WebGL with glow/shadows disabled for practical automation; this run does not establish on-device frame rates or maximum-effect GPU performance.

## Delivery checks

The playable ZIP's CRC is verified and its contained HTML matches the recorded SHA-256. The Claude kit includes the incremental patch, design, dependency matrix, receipts, logs, screenshots and QA runner. Public GitHub downloads are checked after pushing. The implementation branch and artifact branch are separate from Claude's lead branch.
