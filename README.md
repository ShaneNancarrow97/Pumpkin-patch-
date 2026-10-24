# Pumpkin Patch — Hollow Hayride playable expansion

Source: `34b50b3ea274b7e8d2b8e78fb23ad6f736384ba1` on `contractor/hollow-hayride`.
Lead baseline: `d98db5989091975391a20ce3e4d56aa58fbc3ccb`. This includes Claude's published update through handover 35.

## Play

Download **Pumpkin-Patch-HTML.zip**, extract it, then open **Pumpkin-Patch.html** in a browser. All runtime assets, fonts and music are embedded. This is the full normal game, not the earlier vehicle prototype. Existing browser saves are retained where the browser shares the same local origin; use the game's export/import when moving between apps or files.

Only the boarding station is on the farm. The tractor departs off-map; the dense dark forest, scares, occasional lightning and delayed thunder are enjoyed in a separate POV experience. Gentle mode disables lightning and lunges.

The hayride becomes purchasable at patch level 8 after restoring The Hollow House, for £7,500. Open **Attractions → The Hollow Hayride**, purchase the clearing, then open admissions. Guests queue and pay when boarding. Upgrade the wagon at levels 10/12; add scare effects and set ticket prices. **Owner ride-along** provides a free seated preview. The download contains no QA money or unlocked fixtures.

The normal fullscreen button is included. Phone, landscape and unfolded Fold layouts were checked in Chromium; a physical Z Fold was not available. Managed QA browser policy prevents direct file navigation and OS fullscreen, so those checks used identical HTML over loopback with zero external runtime requests and tested graceful fullscreen refusal.

## Claude handover

Read **37-off-map-hayride-takeover.md**, followed by handover36 for economy and saves. The source branch is ready to inspect. The downloads branch contains artifacts only; **do not merge this branch into source**.

The contractor ZIP contains a binary incremental patch against exactly `d98db5989091975391a20ce3e4d56aa58fbc3ccb`. In an isolated worktree at that base:

```sh
git apply --check /path/to/hollow-hayride-from-d98db59.patch
git apply /path/to/hollow-hayride-from-d98db59.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-hayride.html
```

Reconcile the isolated provisional western site with unpublished lead map changes before combining both. Root 2D game, existing maze and foyer remain intact. Save version 11 preserves progress and adds paid hayride visits/receipts.

## Validation

All 59 Node test files pass. Applying the binary patch to the exact lead base and rebuilding produced identical HTML bytes. Final handover browser smoke is recorded separately when completed; earlier functional assertions preceded the off-map split and were interrupted by host restart. A full final-HTML end-to-end replay, five-scene lighting review and physical Z Fold profiling remain recommended lead checks. Exact scope and limitations are committed under `voxel/docs/contractor-patches/haunted-hayride/verification/`.

HTML SHA-256: `3173d8f1d54b32ec3468729967f0c7315c265092e071f018b2aaee178d13e49b`.
