# Checked game delivery

Source branch: `contractor/village-interaction-fixes`. Apply on the delivered Blackroot base `7bb7639523083f444da565aa5716b82282e16421`; this is an incremental contractor patch, not a replacement for Claude's lead checkout. The downloadable artifact branch is `contractor/village-interaction-fixes-html`. Immutable links are recorded in the publication receipt once pushed.

## Exact files

| File | Bytes | SHA256 |
| --- | ---: | --- |
| Pumpkin-Patch-Village-Interaction-Fixes.html | 59,031,827 | `c08029b91f19cb4363b39b0fbb0bbf376dd43656eb46fbaba21b33382198d8f7` |
| Pumpkin-Patch-Village-Interaction-Fixes.zip | 42,425,080 | `bfdb9e2d8e6b76121e5b7403e87cec534e53e43bd101a9a2075000cd419c29bc` |

The ZIP contains the exact HTML above and short opening/save-transfer instructions. Its CRC and the nested HTML hash were checked. The whole game, 31 MIDI songs, existing recorded voices, art and fonts remain offline. Gathering SFX are synthesized locally; no new API key, audio service or network dependency is required.

## Verification

- Full `npm test`: **1,099 named tests pass**, zero failures, cancellations or skipped cases. This functional run uses the `c040390b…` HTML source. The final `c08029b9…` build changes only one CSS declaration to reserve the existing54px Close-button clearance beside sticky service tabs; its exact patch is retained.
- Final exact HTML: **15/15 CSS/layout checks**, zero runtime errors and zero external requests. Fold864×756, phone393×852, landscape864×393 and TV1920×1080 keep Sandy’s tabs and Close separate, reachable and at least44px.
- The corrected functional browser follow-up on `c040390b…` passes **18/18**. Actual £250 Cocoa Hospitality purchase, both new Skyla tip tiers, free display assignments, real quest rewards/receipt, menu confirmation, immediate movement and Return confirmation are covered across the retained reports.
- Normal-render screenshots were reviewed. Logic checks that held renderer draws, synthetic saves, mocked Gamepad input and screenshot camera/walking fixtures are explicitly described. See [the authoritative browser summary](verification/browser-summary.json) and [browser handover](BROWSER-VERIFICATION.md).
- Earlier candidate reports retain their actual failures: the first Fold Play/HUD overlap was fixed; subsequent runner setup mistakes were corrected in narrowly repeated cases. They are not relabelled green or counted as distinct additional tests.

This verifies software behavior and viewport layouts, not physical Fold7, TV, PS5 Bluetooth or device FPS. Very close camera views at the exit gate or Rowan's hanging stall lamp can still obscure the owner; these existing camera-occlusion cases are documented for a later focused pass. The final open-path image shows a normal unobstructed walking view, reached through actual controls.

## Integration

Read [README.md](README.md) for all parts and the dependency matrix. Preserve the small `main.js` gather callback and `build.mjs` feedback CSS hook when resolving concurrent changes. Saved state stays version18; Cocoa Hospitality keeps its existing internal visitor-upgrade ID, and tipJar extends the same field to five tiers while bags remain at three.

The Claude patch ZIP contains ordered Git patches, the expected base/tree and build hash, and replay instructions. Its clean application and identical HTML rebuild are recorded in the publication receipt. HTML/ZIP/source publication is completed before optional Android packaging; Android has a separate additive handover and patch kit. Private signing files and generated media/build caches are excluded.
