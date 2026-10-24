# Hollow Hayride verification

Final source includes the off-map scene split, dense forest, detailed scare cast and lightning. All **60 Node test files pass**; see [node-tests.log](node-tests.log). The generated HTML uses the real fresh-save economy and inlines all runtime assets, fonts and music.

## Evidence boundaries

- `final/`: historical functional browser captures before the off-map refinement. The host killed the browser during its last layout checks. [Its scope note](final/functional-interrupted.md) records the assertions observed to pass; its original HTML hash was not recovered. Do not treat these captures as current.
- `visual/`: a SHA-backed but superseded visual candidate (`724c935e…`) that passed two management layouts before the user requested the off-map design. It was deliberately stopped. [Its scope note](visual/historical-scope.md) is explicit.
- `handover/`: initial off-map smoke at `3173d8f1…`. Twenty recorded assertions passed, with zero runtime errors/external requests, before its managed fullscreen-tail timeout. `passed:false` is retained honestly.
- `release/`: pre-integration refined build at `15531486…`. Its first-upload geometry assertion found one additional cached frame (51 → 52 geometries; textures unchanged). The report remains failed; see its scope note. The final harness explicitly warms both scare poses and checks a subsequent complete cycle for a plateau.
- `integrated/`: current integrated candidate at `c429348a…`, including lead `1abaff5`, with a full functional replay and five-scene/mobile visual pass. Read its exact report status; a missing or incomplete report is not approval.
- [economy.json](economy.json): real-model20-minute demand comparison using finite stock. It checks budgets and global capacity, not net profit or long-term progression balance.

Read [environment-notes.md](environment-notes.md): managed Chromium blocks direct `file://` navigation and OS fullscreen. QA serves the identical single-file artifact on loopback and records external requests. Phone/Fold viewports are responsive-layout checks, not physical-device or hardware-frame-rate claims.

Reproduce with `node --test voxel/test/*.test.mjs`, `node voxel/build.mjs --out /tmp/hayride.html`, then `HAYRIDE_QA_FOCUS=handover CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/hayride.html /tmp/hayride-qa`. Run one browser at a time on software WebGL. The integrated run is the authority for final financial/save/owner replay status; physical-device frame rate and unrestricted fullscreen remain unverified.
