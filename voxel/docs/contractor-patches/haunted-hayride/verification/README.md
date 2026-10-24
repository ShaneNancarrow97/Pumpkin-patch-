# Hollow Hayride verification

Final source includes the off-map scene split, dense forest, detailed scare cast and lightning. All **60 Node test files pass**; see [node-tests.log](node-tests.log). The generated HTML uses the real fresh-save economy and inlines all runtime assets, fonts and music.

## Evidence boundaries

- `final/`: historical functional browser captures before the off-map refinement. The host killed the browser during its last layout checks. [Its scope note](final/functional-interrupted.md) records the assertions observed to pass; its original HTML hash was not recovered. Do not treat these captures as current.
- `visual/`: a SHA-backed but superseded visual candidate (`724c935e…`) that passed two management layouts before the user requested the off-map design. It was deliberately stopped. [Its scope note](visual/historical-scope.md) is explicit.
- `handover/`: initial off-map smoke at `3173d8f1…`. Twenty recorded assertions passed, with zero runtime errors/external requests, before its managed fullscreen-tail timeout. `passed:false` is retained honestly.
- `release/`: refined off-map build at `15531486…`, with the final functional replay and five-scene/mobile visual pass when its report is complete. A missing or incomplete report is not approval.
- [economy.json](economy.json): real-model20-minute demand comparison using finite stock. It checks budgets and global capacity, not net profit or long-term progression balance.

Read [environment-notes.md](environment-notes.md): managed Chromium blocks direct `file://` navigation and OS fullscreen. QA serves the identical single-file artifact on loopback and records external requests. Phone/Fold viewports are responsive-layout checks, not physical-device or hardware-frame-rate claims.

Reproduce with `node --test voxel/test/*.test.mjs`, `node voxel/build.mjs --out /tmp/hayride.html`, then `HAYRIDE_QA_FOCUS=handover CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/hayride.html /tmp/hayride-qa`. Run one browser at a time on software WebGL. The full financial/save/owner replay on the final off-map candidate remains a recommended lead check.
