# Village WebGPU audit and genuine backend capability probe

Read-only product audit, 2026-11-13. Checkout: `/tmp/village-fidelity/voxel`, observed HEAD `3e17f9e66816277213842763b173dfec50a30555`, Three **0.169.0**. No product files, dependencies, game loop or renderer were changed/run by this audit. Root owns subsequent implementation and real-scene QA.

## Outcome

A genuine WebGPU test environment **is available**: installed Chromium 154 with Dawn/SwiftShader Vulkan flags returned a WebGPU adapter/device and executed WGSL compute with correct GPU-buffer readback. Unflagged Chromium exposed `navigator.gpu` but returned no adapter. A capability property alone is therefore insufficient.

A real **village-only WebGPU renderer is feasible**, with the farm/rides retaining their current WebGL renderer. This requires explicit TSL/node material ports and a separate canvas; changing one constructor would lose substantial effects and can silently lose lights. A whole-game switch is a wider project because its custom shaders, thumbnails/captures, offscreen passes and lifecycle are shared well beyond the village.

This probe establishes software WebGPU API/shader/queue functionality, **not physical GPU availability or performance**, and does not yet establish a genuine Three WebGPU village frame. The next implementation must compile and render the actual village under the successful flags.

## Exact probe and evidence

Reproduction script: `/tmp/village-webgpu-probe.mjs`. Complete structured results, all adapter/device features and limits, console/error arrays: `/tmp/village-webgpu-probe.json`.

Command:

```sh
cd /tmp/village-fidelity/voxel
node /tmp/village-webgpu-probe.mjs
```

The command needs permission for a loopback listener. Its first ordinary-sandbox attempt returned `listen EPERM 127.0.0.1`; rerunning with the tool's additional network permission succeeded. No external network, package installation or credentials were used. Probe serves one blank page on an ephemeral `127.0.0.1` HTTP port, makes adapter/device requests, dispatches four one-invocation workgroups into a 16-byte storage buffer, copies to a 16-byte readback buffer, reads `[3,10,17,24]`, then destroys buffers/device and closes each browser. No canvas, Three renderer, game or RAF loop is created.

Browser executable/version:

```text
/usr/bin/chromium
Chromium154.0.8037.57, Debian13
```

All launches: `headless:true`, common arguments `--no-sandbox --disable-dev-shm-usage`.

| Launch | Additional arguments/environment | Result |
|---|---|---|
| default-headless | none | Secure context, `navigator.gpu=true`, preferred canvas format `bgra8unorm`; high-performance and forced-fallback `requestAdapter` both returned null |
| dawn-swiftshader | `--enable-unsafe-webgpu --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --enable-features=Vulkan --use-vulkan=swiftshader --disable-vulkan-surface` | Both adapter requests succeeded; WGSL compiled without messages; compute/readback passed; no console/page/uncaptured-device errors |
| dawn-vulkan-swiftshader-icd | `--enable-unsafe-webgpu --use-angle=vulkan --ignore-gpu-blocklist --enable-features=Vulkan --disable-vulkan-surface`; `VK_ICD_FILENAMES=/usr/lib/chromium/vk_swiftshader_icd.json` | Same successful adapter/device and compute result, no errors |

Successful adapter info: `vendor:"google"`, `architecture:"swiftshader"`, `isFallbackAdapter:true`, subgroup min/max4, empty device/description. These are **software adapters using WebGPU/Dawn**, not Three's WebGL fallback. Default `requestDevice()` reported device feature `core-features-and-limits`; optional adapter features were not automatically requested by this tiny probe.

Adapter features reported in both successful configurations:

```text
bgra8unorm-storage
chromium-experimental-sampling-resource-table
chromium-experimental-timestamp-query-inside-passes
clip-distances
core-features-and-limits
depth-clip-control
depth32float-stencil8
float32-blendable
float32-filterable
indirect-first-instance
rg11b10ufloat-renderable
subgroup-size-control
subgroups
texture-component-swizzle
texture-compression-astc
texture-compression-astc-sliced-3d
texture-compression-bc
texture-compression-bc-sliced-3d
texture-compression-etc2
texture-compression-unaligned
timestamp-query
```

Selected adapter limits (complete exact limits in JSON): 2D textures8192, array layers256, bind groups4, sampled textures16/stage, samplers16/stage, uniform buffer binding65536bytes, storage buffer binding1073741824bytes, vertex attributes16, vertex buffers8, interstage variables28, colour attachments8, compute invocations/workgroup256, workgroup storage32768bytes, buffer offset alignment256bytes. Product should request only limits/features actually needed and must not depend on Chromium experimental features.

## Installed Three169 options and hard boundaries

- `node_modules/three/package.json:8–19`: `three` loads standalone `build/three.module.js`; `three/webgpu` and `three/tsl` load standalone `build/three.webgpu.js`. TSL, WebGPURenderer, node materials and node postprocessing are installed; no upgrade/install is required for an initial port.
- `src/renderers/webgpu/WebGPURenderer.js:25–43` (inside Three): automatic fallback is a **node-based WebGL backend**, not the existing legacy renderer. `isWebGPURenderer` does not prove WebGPU; diagnostics must inspect `renderer.backend.isWebGPUBackend` after initialization and retain the existing legacy path for failures.
- Three `NodeBuilder.js:1303–1311`, `StandardNodeLibrary.js:68–80`: standard/basic/Lambert/Phong/sprite material classes map to node counterparts. `ShaderMaterial` is not supported; generic NodeMaterial substitution plus a console error is not parity and must fail the readiness gate.
- GLSL `onBeforeCompile` hooks are not executed by the common renderer. Every village hook must have an explicit TSL/node equivalent. Prefer TSL graph functions so WGSL is genuinely generated; raw `wgslFn` is possible but its WebGL-node fallback is not interchangeable.
- Three `NodeMaterial.js:343–361`: this revision does not implement `alphaHash`. Opaque material alpha is restored to1 after alpha test. Native/hero-tree/Acre/grass fades need explicit stochastic discard with deliberate shadow behavior.
- Three `NodeMaterial.js:286–295`: instancing is applied before a custom `positionNode`. A naive unit-blade `positionNode` can erase instance placement; custom grass/air ports must preserve exact unit-geometry → local deformation → instance → world transform semantics.
- Three `Renderer.js:1481–1497`: shadow overrides use `shadowNode`; current `customDepthMaterial/customDistanceMaterial` do not port. Sprite cutout shadow alpha must be explicit; view-only crown fades must remain absent from physical shadows.
- Three `Renderer.js:1319`: `LineLoop` unsupported; decoration selection outline (`src/village-view.js:437`) needs a closed `Line` or `LineSegments` in GPU presentation.
- Three `Renderer.js:598–605`: GPU render mutates camera coordinate system/projection. Keep a copied GPU camera, leaving the legacy play/map camera untouched.
- The classic/WebGPU bundles contain **different constructors and ColorManagement singletons**. Node lights map by constructor (`NodeLibrary.js:66–80`, `LightsNode.js:115–119`), so a naive import of the WebGPU renderer can silently drop all existing classic PointLight/DirectionalLight/HemisphereLight instances. Resolve via deduped source imports/build aliases or explicitly registered legacy light constructors; a GPU-owned presentation scene/lights also avoids this trap. Do not globally alias `three` to `three/webgpu`, which lacks legacy renderer/shader exports.

## Village material port inventory

| Current source | Mechanism to preserve | Required GPU counterpart and parity test |
|---|---|---|
| `src/voxel-finish.js:90` | GLSL chunk hooks for world/local fine mortar, tone/patch/grain, face relief, near-lamp falloff | Shared TSL finish functions on lit/basic node materials. Keep emissive-glass branch, derivative filtering, world/local units and exact no-glow semantics. Current faux occlusion belongs in colour for parity; moving it to `aoNode` changes the lighting model. `finNear` rewrites point-light attenuation: port explicit distance floor in a custom PointLightNode/lightsNode, not an unrelated material scalar. |
| `src/village-dusk-sky.js:153`, world dome | ShaderMaterial + borrowed sRGB panorama, two longitude repeats, seam repair, held clock, .68 linear cap | Existing dome geometry with node fragment graph; same shared uniform objects/texture, same2 bounded texture samples, no second decode. Respect `artLongitudeRepeats:2`, same centre/latitude, layer disposal and failure fallback. |
| `src/village-water-material.js:36` | Chained standard-material hooks, world-space ripple normals/colour and one paused clock | Standard node water roughness/normal/colour graph, same world projection and shared time, no render target/reflection pass. Test native+Square+Acre materials and pause/resume. |
| `src/grass-detail.js:22` | Existing ground-map alpha as detail coverage, sRGB tile + world UV | Node texture sampling with explicit alpha mask, same wrap/scale/sRGB handling; terrain positions/index buffers unchanged. |
| `src/village-grass.js:34` | Lambert hook, unit-blade bending, tip attributes, instance placement and proximity/far fade | Lambert node or equivalent light graph + explicit stochastic discard; preserve transform order and TV count behavior; no per-frame instance buffer rewrites. |
| `src/village-neighbourhood-visibility.js:36`, world hero tree, Acre fades | Per-instance blocker IDs and bounded opacity uniforms with view-only alphaHash | Explicit stable stochastic discard keyed by world/local position; native blocker selection stays CPU/pure helper. Preserve independent tree/pavilion IDs, room/survey behavior and exact nested atlas restoration. Keep full physical shadows. |
| `src/crisp-sprites.js:10`, actor rim hooks | Texture LOD bias/crisp sheet sampling and soft owner moon rim | Sprite/basic node graph with the same atlas rect/direction, alphaTest and rim; no double colour conversion. Support asynchronous directional asset arrival and cast-style changes, not just initial traversal. |
| `src/village-sprite-actors.js:42` | Alpha-tested sheet customDepthMaterial | ShadowNode cutout using current directional sheet; no rectangular card shadows. Live actors replace material/geometry at lines85–87. |
| `src/village-glow.js:17/27` | Instanced camera-facing halos + ground pools, no actual lights | Basic node fragments/position graph, same blend/depth flags and lamp anchors. Keep no-glow switch, TV/glowScale semantics and bounded batches. |
| `src/village-light-air.js:20/36` |6 tree/arch ribbons +32 lantern insects, fixed2 batches/76tri, held clock | Node quad materials with same per-instance seeds/airTree fade, current CPU supplier and count bounds; rooms/caves/atlas hidden. |
| `src/village-contact-shadows.js:94–96` | One instanced soft analytic contact pool with per-instance opacity | Node radial-opacity fragment with same polygonOffset/depth/fog, measured ground source and32 cap; preserve native/Acre/stair/room surface query and no actor bob changes. |
| `src/village-life.js:73/157` | Custom `gl_PointSize/gl_PointCoord` smoke + PointsMaterial fireflies | Node-compatible instanced camera-facing quads/InstancedPointsNodeMaterial; do not assume programmable hardware point size exists in WebGPU. Keep positions/life logic bounded. |
| `src/picture-grade.js`, `src/scene.js:432–454` | HDR scene → bloom → ACES/sRGB output → conditional FXAA → display-space grade | TSL PostProcessing graph preserving exact ordering, exposure and final grade uniforms, no double output transform. No-glow route and per-place/TV effects must still work. |
| `src/village-map-snapshot.js:71–92` | Half-float target, legacy GLSL OutputPass, synchronous pixels | Initially deliberately retain current legacy renderer/canonical scene path. GPU-only map would need async API/readback migration and caller changes; do not smuggle asynchronous behavior into this sync API. |

## AO, PBR atlases and instancing

The project already has real neighbour-based corner AO in `src/voxel-mesh.js:26–103`, used by its dense-grid/greedy mesher. Most village architecture instead uses arbitrary-size instanced AABB boxes (`src/voxels.js:1–55`), and its finish currently adds stylistic foot/corner shading rather than neighbour AO. Calling that existing finish “voxel ambient occlusion” would overstate it.

A correct instanced AO extension needs an authored occupancy/contact context before ChunkedVoxels/detail-shadow splitting, compact per-instance corner data, stable instance remapping and the same decode in legacy GLSL and TSL. The parallel AO audit owns the precise packing/sampling plan. Keep the shared global BOX immutable; attach owned clone attributes or another explicitly owned data source. Baking should run at build/rebuild boundaries, not each frame, and preserve all positions/collisions/resource sites. Instancing already exists extensively and should be retained rather than replaced by individual meshes.

PBR is directly available via MeshStandardNodeMaterial and texture/normal/roughness/AO nodes; installed `MaterialNode.js:143/184/338` supports roughnessMap, normalMap, aoMap. A real atlas still requires an asset plus material/tile-ID and scale/gutter contract. Preserve instance colour as tint, use colour-space correct albedo (sRGB) and linear normal/ORM data, tile gutters/mips, world/local face projection and bounded sampler count. Do not label a procedural colour hash a PBR texture atlas.

Installed `GTAONode` is a separate screen-space AO option, not neighbour-based voxel AO. It defaults16 samples, owns a noise texture+AO render target and requires depth/normal inputs (`src/nodes/display/GTAONode.js:41–60`); its update sizes to the full drawing buffer at lines80–98. Adding it changes pass/memory budgets and requires explicit TV/reduced profile and transparent-cast handling. It should supplement, not substitute for, the planned baked voxel AO.

## Backend and postprocess implementation plan

1. Keep one simulation and existing RAF. Root's renderer adapter routes only the existing village draw branch (`src/scene.js:839–843`); farm/rides/thumbnails stay on the original renderer/composer.
2. Use a separate WebGPU canvas over the existing WebGL canvas with `pointer-events:none`; original canvas remains the input/control surface. A canvas already initialized for WebGL cannot also provide a WebGPU context (`WebGPUBackend.js:104`). Match its CSS rect, DPR/quality/TV sizing and z-order beneath HTML/CSS UI.
3. Async prepare `WebGPURenderer` and material ports; show GPU output only after actual backend initialization, no unsupported materials, compilation and one complete successful frame. Default auto may choose GPU when this succeeds, without making every supported device fall back. Adapter failure/unsupported material/device loss must immediately expose the retained legacy rendering path, not an incomplete generic-node scene.
4. Prefer a GPU presentation scene owning node materials/lights/copied camera/targets, sharing immutable geometry/textures and current uniform references where safe. Synchronize exact visibility/transforms/dynamic attributes after village tick; use explicit builder/rebuild descriptors and resource ownership, not full scene rebuilds per frame. Cover part rebuilds, actors swapping material/geometry, asynchrony, decoration suppression, rooms/caves, native fade and shadow flags. Resolve constructor identity before first lit smoke frame.
5. Preserve current legacy canonical scene for synchronous atlas capture. Its `withMapSurface` try/finally must restore fade, palette, room/cave and visibility exactly even during GPU play. Do not advance GPU clocks or mutate original camera during capture.
6. Port shader families explicitly before declaring full material readiness. A registry must identify unported custom materials/hooks and fail back to complete legacy GL rather than render a generic material silently. Share CPU clocks, opacity arrays and motion suppliers; no duplicated gameplay/rules ticks.
7. Replace WebGL EffectComposer for GPU with TSL `pass → bloom → ACES/sRGB output → optional FXAA → display-space grade`. The installed PostProcessing wrapper auto-applies renderOutput unless disabled; control this carefully so grade stays after output conversion. `BloomNode` has a bright target plus5 horizontal+5 vertical mip targets (`BloomNode.js:51–78`), so it is not free. Preserve current glowScale/TV blur sizing rather than adopting default drawing-buffer sizing blindly. Existing GPU/GL render calls must not both draw the world each normal frame.
8. Truthful diagnostics: requested mode, active backend (`legacy-webgl`/`webgpu`), actual backend flag, adapter software/hardware info when permitted, initialized/materialReady/unsupported roles, frame submissions, fallback reason, device-lost/error state, postprocess targets/size and AO/atlas budgets. Do not report WebGPU based solely on navigator or renderer class name.

## Acceptance before default-auto promotion

- Real WebGPURenderer initializes and draws the **actual village**, backend flag true, expected lights visible, no generic material fallback/error and actual GPU queue submissions; compare normal frames under successful SwiftShader flags and retained GL.
- Surface route, Square/Acre, halls/caves, rebuilds and directional sprite loading preserve all art roles; owner/resident shadows remain cutout, native view fades independent with full physical shadows.
- Sky art readiness/seams, water pause/resume, grass placement/fade, fine stone, air/contact/lamps, no-glow, saved-clock grade and TV quality retain behavior; no double colour encoding.
- Sync canonical atlas captures remain exact/restored through failure/nesting during GPU play, with source save/camera unchanged.
- Resize/DPR/TV/input picking use original camera/input surface correctly; GPU camera coordinate-system mutations do not leak to legacy return.
- Forced no-adapter, failed shader/material, lost device and renderer disposal return to working legacy GL; farm/rides continue after village exit, with no second simulation loop.
- Then measure first-use/warmed CPU, GPU resource/pass budgets and image quality separately from software capability. No physical-device/FPS claim follows from this probe.
