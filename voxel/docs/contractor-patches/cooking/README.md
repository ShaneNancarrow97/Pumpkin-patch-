# Cooking contractor delivery

Read [handover 44](../../handovers/44-cooking-and-deliveries.md) for the feature map, save/economy safeguards, patch choices and takeover instructions.

Source branch: `contractor/cooking-foundation`. Runtime: `ba99b87a5a6d7a94e8ba584d32fca42970828c30`. Based on completed exterior `5083446e1ffcc94f370feff0e533150899c771f3`; lead `3f92ca8` and its current12 levels are preserved. Claude's private20-level changes must be reconciled during integration.

The artifact-only branch `contractor/cooking-download-2026-10-26` contains the full HTML ZIP, standalone HTML, incremental cooking patch, optional combined exterior+cooking patch, handover and checksummed delivery manifest. Do not merge that downloads branch. Choose one patch appropriate to the lead's base.

[Verification](verification/README.md) distinguishes the full gameplay pass, final focused checks and the preliminary failed candidate. Existing saves migrate additively; no QA funds or unlocks are included in the shipped game.
