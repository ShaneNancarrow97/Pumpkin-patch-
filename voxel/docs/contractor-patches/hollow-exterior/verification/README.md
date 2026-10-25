# Hollow House exterior — release verification

Final downloadable HTML SHA-256: **`4e84fd080a749e129020da081afdc064cdc29328678c208210e72a4111cccbf5`**. Exact lead base: **`3f92ca8df92e07b09445ce092101e9309c00288c`**. The full game keeps the normal starting economy and embeds every runtime asset, font and music file.

## Passing checks

- **64 Node test files pass** on the final source: [node-tests.txt](node-tests.txt). Geometry tests cover all seven stages, bounds, sealed near walls/roof, deterministic output and exposed dormer glass. Controller tests cover cached refresh, disposal, fixed pooled lamp positions, save parity and live reduced motion.
- **46/46 functional browser checks pass** on `151fc00…`: [report](final/checks.json), [review](final/review.md). Real gated purchase, paused/completed restoration, all four paid upgrades, facade/context picking, direct door entry without a ticket, unchanged animation saves/ledgers, live media changes, three responsive layouts and save/reload.
- **10/10 focused final checks pass on the exact download hash**: [report](polish/checks.json), [review](polish/review.md). The final delta only raises dormer panes above the roof. Wider desktop/Fold captures show the whole silhouette; phone menus, real door entry and save parity pass. No rules or prices differ between the two builds.
- Both custom browser reports record **zero page/console errors, zero external runtime requests and one WebGL canvas**.
- **Standard desktop/phone smoke passes in GitHub CI**, together with npm test and build, on committed runtime `0fdeffa`: [CI evidence](standard-smoke-ci.json), [job](https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/40203486005/job/121199404722). The unchanged standard suite contains48 checks. The slower duplicate local run was deliberately stopped after that success; [its partial scope](standard-smoke-local-scope.md) is labelled honestly.
- An isolated binary-patch rebuild from the exact lead base matches the HTML byte for byte: [proof](patch-rebuild.json).

## Environment and limits

Custom QA uses one Chromium/SwiftShader browser, performance rendering/DPR1 with bloom/shadows/mist/lake lights off. Viewports:1280×800,390×844,844×390 and874×787. These prove layout and interaction, not physical Fold frame rate. The shipped game retains the lead's Sharp default.

Managed browser policy blocks direct file navigation and native fullscreen. QA serves the unchanged single-file HTML over loopback; successful OS fullscreen is not claimed. The game's existing fullscreen button remains available.

Historical `core/` is a first-build failed QA assumption that expected a media event after one frame. The final harness waits for both the actual media query and controller flag; live reduced motion then passes. That earlier report stays failed and is not substituted for the current evidence.

## Reproduce

```sh
npm --prefix voxel test
node voxel/build.mjs --out /tmp/exterior.html
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hollow-exterior.mjs /tmp/exterior.html /tmp/exterior-core
HOLLOW_EXTERIOR_QA_FOCUS=visual CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hollow-exterior.mjs /tmp/exterior.html /tmp/exterior-visual
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/smoke-exterior-release.mjs /tmp/exterior.html
```
