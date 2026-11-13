# Village motion, distance detail and homecoming

This branch is stacked on `contractor/village-ui-couture` at `2482170`. Claude’s `voxel-reference` checkout is separate; it was not edited. This pass first addresses the reported village lag, Natalie’s frozen walk and bright sky, then completes the shared farm/village cosmetic keepsakes. Save version remains **20**.

## Rendering and movement

Explicit WebGPU sprite samplers previously retained the atlas they were built with. Changing `material.map` alone did not update those TSL texture nodes. Colour, emissive, rim and shadow samples now follow the live atlas without rebuilding their material. The source movement, authored leg frames, distances and actions remain authoritative in both renderers.

The GPU mirror now retains a bounded history of authored walking-plane geometry while its actor exists. It no longer disposes and recreates the same frame buffers every step. Removed actors retire their cached frames. Shared geometry metadata is copied once per submitted frame, and source transforms are composed once. This costs a bounded amount of retained geometry metadata in exchange for avoiding repeated uploads. It is not a new simulation or render loop.

The village HUD heartbeat is limited to 10Hz, with explicit actions still refreshing it immediately. Movement, camera, gamepad input, gathering and nearby interaction selection continue every frame. This CPU saving applies to WebGL as well as WebGPU.

Distance detail retains the terrain texture and the long 65–105 metre grass fade. Extra blades fade over 28–52 and 52–78 metres. Only once an entire patch’s removed blades are invisible does its draw range reduce from five to three to one blade (30/18/6 vertices per tuft). Two-metre hysteresis prevents boundary flicker; conservative patch bounds include scale and clump overshoot. Tiny moth/dust silhouettes fade over a 35–65 metre band beyond their bounds, then stop drawing and uploading matrices. Buildings, paths, resource nodes, quest targets and collision are unchanged. `scene.villageView.grassDetailStats` exposes the current submitted vertex budget.

Dome highlights use a hue-preserving shoulder before the existing colour pipeline. Dark cloud values stay unchanged. The moon’s additive halo is smaller and weaker; buildings, lamps, gameplay lighting and global exposure retain their previous settings.

Actual GPU-buffer inspection also caught two pre-existing port differences. Four sky palette uniforms were `THREE.Color` values bound as `vec3`, so the vector uploader read missing `x/y/z` fields and uploaded NaN. They now use the colour uploader, with a regression checking real generated-WGSL uniform-buffer bytes and live palette changes. The GPU sprite converter also applied moon rims from metadata even when the composed GL shader never emitted that effect: crisp-sprite shader expansion had removed the later hook's anchor. GPU conversion now follows the actual emitted shader body, preserving the existing GL appearance and valid non-crisp rims.

## Adding more scenery without abrupt pop-in

Use `src/village-distance-detail.js` as the shared distance policy. Fade fine detail in both renderer shaders over a broad band, then use conservative whole-object bounds before reducing geometry or stopping private effect updates. Keep hysteresis at the switching boundary and retain the terrain, important silhouettes and interactive targets. Do not tie gameplay timers, quest visibility or resource availability to visual detail. Validate both approaching and retreating through the band, including large/scaled patches, and measure submitted vertices as well as draw calls. A hidden mesh alone does not save its CPU animation work.

## A shared reward loop

Three optional keepsakes reward using a village discovery on the farm. Each awards a matching colour for Natalie’s original knit and Shane’s original beanie:

| Discovery | Village contribution | Farm contribution |
| --- | --- | --- |
| Tansy’s moonfern | Restore herb beds | Prepare six herbs and wax three stock batches |
| Cinder’s midnight table | Open restaurant and complete three lantern-stew commissions | Cook three dishes at home |
| Corvus’s ghostlight | Restore the silent midway | Own Turning Scarecrows and complete 25 guest hayrides |

These are palette skins for existing base sprites, with all existing directional/action artwork retained. They are not new full costumes. They cannot be purchased, produce no extra money and never auto-equip. Awards are once-only, paired and pause-safe. Existing eligible saves receive them naturally during an update. The original costume collection achievement is unchanged.

Farm Outfits and the village journal share a collapsed discoveries section. Current quests remain above it. Clues and concrete farm/village steps appear before a keepsake is earned; its colour names and swatches are revealed afterwards. Equipping a look in the village refreshes the actor without resetting position, camera, gait or controls.

## Dependency matrix

| Change | Dependents | Required invariant |
| --- | --- | --- |
| Live TSL atlas references | Base owners, costumes, NPCs, rims, shadows | Same current source image and UVs; no per-step shader compilation |
| Walking geometry retention | GPU mirror, actor disposal, shared plane layers | Bounded history; release removed owners; never dispose source geometry |
| HUD pacing | Quest tracker, gamepad, pause, nearby actions | Explicit changes immediate; simulation/input/animation outside cadence gate |
| Distance detail | GLSL/TSL grass, chunk bounds, moth/dust buffers | Same fade in both backends; remove geometry only after fade; leave gameplay targets intact |
| Sky shoulder and moon halo | GLSL, TSL, legacy map, bloom/direct draw | Shared coefficients; hue retained; no global exposure reduction |
| Sky palette uploads | `THREE.Color`, TSL uniform groups, live atmosphere palettes | Use colour semantics for RGB values; verify finite upload bytes; keep direction vectors as vec3 |
| Sprite moon-rim composition | Crisp shader patches, composed GL body, GPU effect selection | Metadata alone does not prove a GL hook emitted an effect; match the actual composed shader |
| Homecoming rules | Expansion effects, pantry/wax totals, kitchen, commissions, hayride | Existing canonical counters only; no income-grinding shortcut or double payout |
| Reward ownership | `village.claims`, `looks.owned`, save restoration | Existing v20 fields; known IDs only; no auto-equip or new costume goal |
| Look refresh | Farm actors, rooms, active village, controller camera | Refresh changed owner only; preserve movement and input; unsubscribe on disposal |
| Discoveries UI | Wardrobe, journal, controller focus, TV zoom | Shared read-only data; locked secrets not in purchasable colours; objectives first |

## Verification

The full rules/source suite passes **1,532 / 1,532 tests**. This includes legacy save fixtures, secret ownership and paired awards, live atlas references, generated GLSL/WGSL, conservative distance bounds, transition continuity, bounded geometry retention and input outside the HUD cadence gate.

The initial candidate HTML (`1dc528d3…`) passes **22 native WebGL checks**, including changing visible world pixels, forward/side/front movement, alternating leading legs, idle/restart, the tilted sky view and farm return/warm re-entry. The subsequent sky-upload and rim-composition corrections change only the WebGPU adapter and its tests; WebGL source is unchanged.

The final HTML passes **15 responsive UI checks** at 1280×800, 390×844 and 844×390: objective-first folded discoveries, hidden unearned shades, paired grants, free single-tap Wear actions, 12px minimum text and 44px targets. UI captures are labelled `ui-only` and the report includes the exact artifact hash.

The final HTML (`4476b908…`, runtime `dd92061`) passes **36 native WebGPU checks** using actual canvas readback: a visibly violet dusk sky, changing world pixels, alternating walking legs, idle/restart, stable live materials, bounded submission, farm return and warm village re-entry, without page/shader/loading errors. The software page-compositor limitation below is recorded separately. An independent rebuild produces the identical SHA-256.

The exact final HTML also passes **54 desktop/phone compatibility smoke checks** with renderer/composer draws held, while native RAF, simulation and UI continue. This covers existing farming, buying, furniture, shop visitors, costumes and storage gates; it is logic/UI acceptance, not a graphics benchmark. The ZIP passes CRC validation and its contained HTML has the same verified hash. See the [release receipt](verification/release.json) for exact hashes and check scopes.

The synthetic mirror fixture retains 129 geometry wrappers rather than creating 1,089 over its repeated gait sequence. Its median sync time improved, but noisy tail timings did not consistently improve; this is allocation evidence, not a physical-device FPS claim. In the full village fixture, the grass budget was 422,988 vertices versus 757,800 at full detail, while preserving the existing distant ground and fade.

Release hashes and final browser evidence are recorded alongside this handover. Native tests use genuine keyboard movement and the game's own animation/render loop. UI-only captures explicitly hold world drawing after native startup and must not be treated as performance or world-rendering evidence. Browser WebGPU uses software Dawn/SwiftShader; a successful render does not certify Samsung Fold or television performance. No APK is rebuilt by this pass.

### Review captures

- [Final WebGPU dusk canvas](verification/webgpu-dusk-world-webgpu-canvas.png) and [walking canvas](verification/natalie-walking-away-webgpu-canvas.png) are actual rendered GPU pixels, without HTML overlays.
- [Final native WebGPU report](verification/webgpu-native-readback.json) includes the per-frame movement samples and separate page/readback acceptance.
- [Native WebGL report](verification/webgl-native.json) records strict visible-page acceptance on the initial candidate.
- [Final responsive UI report](verification/homecoming-ui.json) covers the shared journal and wardrobe; its screenshots are explicitly UI-only.
- [Rules suite](verification/tests.json) and [reproducible build](verification/reproducible-build.json) identify the final runtime and artifact.

### Software-browser capture limitation

This Chromium runner does not composite its software WebGPU canvas into page screenshots reliably. The first full-scene checks advanced native GPU frames and source gait, but the visible page crop remained the old WebGL picture. A small independent control reproduced the issue with bare WebGPU clearing red then blue, without Three.js, a mirror, post-processing, hidden startup or game code. The actual GPU canvas buffer changes correctly. Keeping the canvas visible during startup did not resolve it; no speculative runtime workaround was shipped.

`tools/village-motion-recovery-qa.mjs` now rejects unchanged world pixels in its default mode. Its explicit `--gpu-readback` diagnostic mode instead requires changed, opaque pixels from the actual WebGPU canvas, saves those PNGs, and records page-composite failure separately. This is native GPU rendering evidence, not proof of this runner's page compositing. The WebGL fallback is checked using strict visible-page screenshots. `tools/village-presentation-qa.mjs` retains the minimal compositor control for reproduction.
