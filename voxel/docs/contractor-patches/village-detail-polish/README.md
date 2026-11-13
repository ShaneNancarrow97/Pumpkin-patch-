# Village detail polish: do less invisible work

This pass is stacked on `contractor/farm-village-bonds` at `7181cc4` (PR #7). Claude’s remote `voxel-reference` remains at `8da66cb`; its checkout was not changed. The previous release’s distance fades, walking atlas fixes, violet sky and shared keepsakes are included. Save version stays **20**.

## What changes

**Nearby lamps:** the eight-light pool selects the same nearest lights using a bounded, stable selection instead of copying and sorting every lantern. Surface selection remains horizontal; rooms and caves still use three-dimensional distance. Exact stationary target positions reuse the result, while every movement is considered immediately. Surface world positions are cached when neighbourhoods rebuild. Existing power, colour, reach, flicker and short-list reuse are preserved. An empty list keeps eight zero-power lights visible to the renderer, avoiding a shader-light-count change and an undefined lamp position.

**Grass selection:** the shader still receives current breeze time, player clearance and camera coordinates every frame. The CPU revisits patches only when the camera’s horizontal position changes. A hidden surface skips that work; its first visible frame forces a fresh selection. The previous 28–52 / 52–78 metre detail fades, 65–105 metre whole-grass fade, conservative bounds and hysteresis are unchanged. This does not lower resolution or remove distant buildings or resources.

**Outdoor life:** while a home or cave hides the village surface, its water beads, leaves, moths, smoke, animals and carnival do not pose or invalidate their buffers. The current room’s shared candlelight continues. Returning outside resumes the same buffers. Visible animation writes into reusable transforms and point arrays rather than allocating a Vector3/Matrix4 for individual particles. Complete visible poses match the previous implementation at five timed checkpoints. These are decorative view objects, not the resident/quest simulation.

**WebGPU texture bridge:** materials share a synchronous texture-update batch, so a shared atlas is inspected once per material sync. Diagnostic objects also retain their identity. Live idle/walk/action atlas changes, late image decoding, UV transforms, sampler changes and colour-space changes remain observable. Initial wrapper construction and conversion outside this batch can still inspect a texture separately. Exceptions unwind the batch and renderer disposal still owns only presentation wrappers.

## Measured work

These are CPU/allocation or buffer-work fixtures, not phone/TV frame-rate measurements:

| Fixture | Before | After |
| --- | --- | --- |
| 72 shipped lamp positions, 600 moving views | 421,410 distance calculations | 43,200; identical eight lamps every frame |
| Same lamps, 600 stationary views | 412,800 distance calculations | 72; 599 cache hits |
| Grass at one stationary horizontal camera position | A selection on every tick | One selection across 120 further frames |
| Shared atlas across 240 materials | 1,924 source-image reads per material sync | 1 after existing-wrapper setup |
| Outdoor life, 120 visible ticks | 79,080 explicit Vector3 + 1,920 Matrix4 allocations in this module | 0 of those explicit allocations |
| Outdoor life, 120 hidden ticks | 83,280 instance writes + 1,920 buffer invalidations | 0 |

The raw fixture reports are in `verification/`. Other JavaScript allocations, full-frame GPU cost and physical device frame rates are not measured by these figures.

## Dependency matrix

| Change | Depends on | Integration rule |
| --- | --- | --- |
| Nearest lamp selection | Fixed pool, surface XZ metric, hall/cave 3D metric | Keep equal-distance source order, correct world coordinates and existing power/reach |
| Lamp cache | Static point arrays and exact target | Replace arrays on layout rebuild; call `invalidate()` after an in-place point edit |
| Grass CPU cache | Shared GLSL/TSL uniforms and conservative LOD policy | Always update time/player/camera uniforms; force reselection after hidden ancestors |
| Hidden outdoor life | Surface root visibility, room/cave transitions, shared light pool | Only skip decorative outdoor work; update visible room lights before the early return |
| Scratch animation transforms | Authored world/spread coordinates and animal state | Reuse private scratch values without retaining aliases in individual creatures |
| Texture update batch | Material/property/effect bindings, lazy decode, source wrappers | Scope to synchronous material sync; preserve independent live atlas identities and exception cleanup |
| Diagnostics | Native QA and handovers | Selection budgets are the last visible selection; use the `visible` flag for hidden surfaces |

## Verification and delivery

The full suite passes **1,549 / 1,549 tests**, including save compatibility, generated shader checks and the new cache/hidden-work regressions. The runtime commit is `03f638e99b559dd7fcaa7363b388bd12bf4dc633`; two independent builds produced identical HTML bytes. `tools/village-light-selection-benchmark.mjs` reproduces the lamp comparison. Targeted tests cover stable ties, source replacement, camera movement, hidden/resume paths, complete animation poses, live texture changes and wrapper ownership.

The native WebGPU run passes **35 checks** on the final HTML. It uses actual game RAF/rendering, keyboard movement, public Rowan workshop entry/exit and return to the farm. It verifies eight authored walking frames with both leading legs, an idle transition without material recompilation, live violet sky pixels, unchanged stationary selection counters, stopped hidden outdoor buffers and resumed surface work. There are no page, console or loading errors. Slow software captures mean the walking segment is movement coverage, not a distance/time or latency benchmark. See `verification/webgpu-summary.json`, the compressed complete report and the four `*-webgpu-canvas.png` captures.

The native WebGL fallback passes **19 checks** at **844 × 390** with touch enabled. Its visible page captures show the entrance, walking, Rowan's workshop and the return outside. It repeats stationary, hidden/resume, authored gait, fixed lighting and farm-return checks without holding renderer draws. See `verification/webgl-summary.json`, its compressed complete report and `*-webgl-mobile.png`.

The unmodified compatibility smoke passes **54 desktop/phone checks** on the same HTML. Renderer draws are held for this separate logic/UI run; it covers planting, harvesting, storage limits, shop/wardrobe/journal menus, home travel, furniture placement, visitors and one-tap purchases. These checks do not substitute for the native rendering runs above. The ZIP passes CRC validation and contains the exact tested HTML. Full artifact hashes and verification scope are in [`verification/release.json`](verification/release.json).

Native world captures must use the game’s own RAF and renderer. The known software-Chromium WebGPU page compositor limitation remains: actual GPU canvas readback is recorded separately from page screenshots. UI-only or draw-held compatibility checks must not be presented as native-rendering or performance evidence. No APK is rebuilt in this pass.

## Verified downloads

Public downloads at artifact commit `4f3d8e2027d7db57dbdebbf8a55348fe1571684f` were fetched again and match the tested local bytes. The source review commit is `2ac520a510eee2deb4ceb1a253c69bfd16248f02`; later handover-only commits do not change the runtime or build.

- [HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/4f3d8e2027d7db57dbdebbf8a55348fe1571684f/Pumpkin-Patch-Village-Detail-Polish.html) — 61,806,768 bytes, HTTP 200.
- [ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/4f3d8e2027d7db57dbdebbf8a55348fe1571684f/Pumpkin-Patch-Village-Detail-Polish.zip) — 43,988,669 bytes, HTTP 200.
- [Release receipt](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/4f3d8e2027d7db57dbdebbf8a55348fe1571684f/release-receipt.json) — 4,495 bytes, HTTP 200.

Exact hashes and the public download proof are in [`verification/public-downloads.json`](verification/public-downloads.json).
