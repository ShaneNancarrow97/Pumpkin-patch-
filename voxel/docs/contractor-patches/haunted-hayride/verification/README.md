# Hollow Hayride — release verification

The downloadable HTML SHA-256 is **`00452771188d0a6cdaf1a020f34c5ed21e610520f4f15ea09f82b757e8d1aa8d`**. Lead baseline: **`1abaff5386bbf563a5e0a8454ffdf125b5b94d8c`**. The normal fresh-save economy is included; QA funds/unlocks exist only in the harness.

## Current release evidence

- **60 Node test files pass**; see [node-tests.log](node-tests.log). The final view changes also passed focused layout, off-map and station geometry tests.
- **107/107 integrated browser checks pass** on `c429348a…`: [report](integrated/checks.json), [visual review](integrated/review.md). This covers the level gate/purchase, prices, unpaid FIFO queue, exactly-once boarding, separate ledgers, same purses, off-map concealment, save/reload/background completion, both capacity tiers, scare/appeal upgrades, owner look/pause/visibility/replay/Exit, three responsive management layouts and all five POV scene captures.
- **9/9 final focused checks pass** on the **exact download hash**: [report](station-final/checks.json), [visual review](station-final/review.md). The final delta is limited to softer station paving and clipping the visible farm convoy outside its bounds. Actual return/departure/loading visibility, Fold controls, one canvas and final screenshots are checked. Economy, save, owner route/audio and POV art are unchanged from the full run.
- Both current browser reports have **zero page/console errors and zero external runtime asset requests**. Fully warmed repeated owner rides plateau at **60 geometries / 16 textures**, with farm save/paid ledgers unchanged.
- The binary patch applied to the exact current lead base and rebuilt **identical HTML bytes**: [rebuild proof](patch-rebuild.json).
- [economy.json](economy.json) is a demand comparison over 20 game minutes with finite stock using actual rules. It checks budgets/capacity; it is not a net-profit or payback forecast.

## Browser environment and limits

Read [environment-notes.md](environment-notes.md). One Chromium/SwiftShader browser runs at a time, performance profile/DPR1, bloom/shadows/mist/lake lights off. Responsive checks use 390×844, 844×390 and 874×787 viewports. These are **layout checks**, not physical Z Fold or hardware-frame-rate measurements.

Managed Chromium blocks direct `file://` navigation and OS fullscreen. QA serves the unchanged single-file artifact on loopback. Fullscreen control availability and continued usability are checked; successful native fullscreen is not claimed. The normal fullscreen button remains in the shipped game.

## Historical evidence

`final/` is an interrupted pre-off-map functional run, with an unrecovered build hash. `visual/` is a deliberately stopped old candidate. `handover/` has20 passing initial off-map assertions before a managed-fullscreen tail timeout. `release/` contains a pre-integration first-upload resource assertion (51→52 geometries); the final harness warms both actor poses and confirms the subsequent plateau. Those reports remain labelled with their real scopes and are not substituted for the current107+9 checks.

## Reproduce

```sh
npm --prefix voxel test
node voxel/build.mjs --out /tmp/hayride.html
HAYRIDE_QA_SKIP_SHOTS=1 CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/hayride.html /tmp/hayride-core
HAYRIDE_QA_FOCUS=visual CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/hayride.html /tmp/hayride-visual
HAYRIDE_QA_FOCUS=station CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/hayride.html /tmp/hayride-station
```
