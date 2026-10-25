# Pumpkin Patch — Hollow House exterior upgrade

Source `5083446e1ffcc94f370feff0e533150899c771f3` on `contractor/hollow-house-exterior`, based on Claude's published `3f92ca8df92e07b09445ce092101e9309c00288c`.

## Play

Extract **Pumpkin-Patch-HTML.zip** and open **Pumpkin-Patch.html** in a browser. This is the normal full game, with every runtime asset/font/music file embedded and no QA funds or unlocks. Existing saves remain compatible where the browser shares the same local origin; use the game's save export/import when moving between apps/files.

The Hollow House farm attraction has seven appearances: derelict, restoration and five restored tiers. Existing foyer upgrades change its exterior automatically. Tap the glowing front door to enter the restored foyer; tap the facade for management. Subtle shutter/window/ghost effects honour reduced motion. Generated stage icons show current and next exterior upgrades.

This preserves Claude's hayride, wilds, performance improvements, maze and current progression. The screenshot's unpushed 20-level extension is not included. Hollow House purchase still unlocks at patch level 9 on this base.

## Claude handover

Read **43-hollow-house-exterior.md**. The source branch is ready to pull and inspect. This downloads branch contains **artifacts only**; do not merge it into source. The contractor ZIP contains the binary incremental patch against exactly `3f92ca8df92e07b09445ce092101e9309c00288c`.

```sh
git apply --check /path/to/hollow-exterior-from-3f92ca8.patch
git apply /path/to/hollow-exterior-from-3f92ca8.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-exterior.html
```

All 64 Node test files pass. Browser evidence records 46 full functional checks on its pinned build and 10 final visual checks on the exact download hash. The unchanged standard smoke passes 48 desktop/phone checks in GitHub CI on the same committed runtime; its job proof is in the verification folder. Zero browser runtime errors/external requests. A clean patch rebuild matches the HTML byte for byte. Exact scopes and source images are in the repository handover/verification directory.

Physical Z Fold frame rate and successful OS fullscreen remain unverified. Managed Chromium blocks direct file navigation/fullscreen, so checks served the unchanged HTML over loopback with performance rendering; the shipped game keeps its normal fullscreen button and Sharp default.

HTML SHA-256: `4e84fd080a749e129020da081afdc064cdc29328678c208210e72a4111cccbf5`.
