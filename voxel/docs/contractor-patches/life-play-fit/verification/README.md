# Control-fit verification scopes

`browser/checks.json`: 18 successful full refinement checks on the first correction build (before only the final unfold-zoom guard). Room projected size, indoor tilt/zoom, right-hand button placement, compact notices, hold/release, illustrated can, costume preservation and cancellation are covered. Its hash intentionally differs from the exact downloadable release.

`release/checks.json`: exact final HTML and its SHA-256; unfolding preserves direct-play zoom, final right-thumb release/painted can/notice checks and final house screenshots.

`ui/checks.json`: isolated actual UI module/CSS, five responsive layouts and independent two-touch release; no WebGL or economy is simulated there.

`node-tests.txt`: 89 native test files. `ci.json`: final runtime's complete root and voxel CI jobs, including tests, builds and smoke runs.

QA money/unlocks exist in browser storage only. The HTML is unmodified and retains normal starting values and saves. Physical Fold/Bluetooth/device-local HTML testing remains separate.
