# Pumpkin Patch — Hollow Hayride playable expansion

Source: `12c6fe48cfd27aab1d5fa0d46b02283541f1d9ab` on `contractor/hollow-hayride`.
Lead baseline: `1abaff5386bbf563a5e0a8454ffdf125b5b94d8c`. This includes Claude's published maze scares and set dressing through handover 36.

## Play

Download **Pumpkin-Patch-HTML.zip**, extract it, then open **Pumpkin-Patch.html** in a browser. All runtime assets, fonts and music are embedded. This is the full normal game, not the earlier vehicle prototype. Existing browser saves are retained where the browser shares the same local origin; use the game's export/import when moving between apps or files.

Only the boarding station is on the farm. The tractor departs off-map; the dense dark forest, scares, occasional lightning and delayed thunder are enjoyed in a separate POV experience. Gentle mode disables lightning and lunges.

The hayride becomes purchasable at patch level 8 after restoring The Hollow House, for £7,500. Open **Attractions → The Hollow Hayride**, purchase the clearing, then open admissions. Guests queue and pay when boarding. Upgrade the wagon at levels 10/12; add scare effects and set ticket prices. **Owner ride-along** provides a free seated preview. The download contains no QA money or unlocked fixtures.

The normal fullscreen button is included. Phone, landscape and unfolded Fold layouts were checked in Chromium; a physical Z Fold was not available. Managed QA browser policy prevents direct file navigation and OS fullscreen, so those checks used identical HTML over loopback with zero external runtime requests and checked fullscreen control availability.

## Claude handover

Read **38-hayride-lead-integration.md**, then handover37 and the operational handover linked there. The source branch is ready to inspect. The downloads branch contains artifacts only; **do not merge this branch into source**.

The contractor ZIP contains a binary incremental patch against exactly `1abaff5386bbf563a5e0a8454ffdf125b5b94d8c`. In an isolated worktree at that base:

```sh
git apply --check /path/to/hollow-hayride-from-1abaff5.patch
git apply /path/to/hollow-hayride-from-1abaff5.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-hayride.html
```

Reconcile the isolated provisional western site with unpublished lead map changes before combining both. Root 2D game, existing maze and foyer remain intact. Save version 11 preserves progress and adds paid hayride visits/receipts.

## Validation

All 60 Node test files pass. Applying the binary patch to the exact lead base and rebuilding produced identical HTML bytes. The integrated browser run passes 107 checks on its pinned build, covering payments, off-map travel, save/reload, upgrades, owner controls and responsive layouts, with all five scene captures. The final build changes only paving and farm-edge convoy visibility; its 9 focused checks pass on the exact download hash. Both hashes and scopes are in delivery.json. Physical Z Fold profiling and successful unrestricted OS fullscreen remain lead checks. Exact scope and limitations are committed under `voxel/docs/contractor-patches/haunted-hayride/verification/`.

HTML SHA-256: `00452771188d0a6cdaf1a020f34c5ed21e610520f4f15ea09f82b757e8d1aa8d`.
