# Village WebGPU and material pipeline

This contractor branch extends the verified village fidelity checkpoint. The village selects a genuine Three 0.169 WebGPU renderer when the browser exposes a usable adapter and the complete first frame succeeds. The existing WebGL renderer remains the compatibility fallback and continues to render the farm, house, rides and canonical village map capture. The interface remains HTML/CSS.

Save version is **20**. Neither quest engine, story IDs, resources, gates, economy, progression nor player saves are changed. Claude's lead checkout stays separate. This branch includes the full fidelity checkpoint; read its [handover](../village-fidelity/README.md) for entrance art, journal, dialogue and responsive UI verification.

## Presentation and ownership

The original canvas remains the pointer/input surface. An aria-hidden, pointer-transparent GPU canvas overlays it only after successful initialization, material conversion, shader compilation, validation and a current native game frame. Both renderers use the existing simulation and paced RAF; there is no second animation loop. Returning to the farm hides the overlay immediately. Unsupported APIs/adapters, unknown shader effects, initialization errors and device loss retain or restore the original renderer.

The GPU presentation owns its camera, scene objects, lights, node materials, geometry wrappers, texture wrappers, render targets and device. It borrows original vertex/instance arrays and decoded images. Geometry and texture wrapper identities keep GPU disposal listeners off the persistent legacy resources. Presentation disposal never calls dispose on the original scene's geometry or textures. Terminal cleanup destroys the exclusively owned GPU device and releases partially initialized resources too.

The separate camera avoids Three's WebGPU coordinate-system mutation leaking into legacy picking, projection or map capture. GPU lights use GPU constructors, avoiding the separate classic/WebGPU bundle identities in this pinned revision. The original eight point lights, hemisphere and two directional lights retain their actual positions, colours, strengths and shadow settings. Finished voxels retain the existing minimum lamp distance; other surfaces retain normal falloff.

Material conversion is explicit. Sky/cloud art, fine voxel finish and glowing panes, wind/proximity grass, ground detail, ripple water, crisp sprites and rims, cutout shadows, native canopy fades, contact shadows, lamp halos/pools, light shafts, insects and smoke all require node equivalents. An unknown GLSL material or hook fails back with a diagnostic reason. It is never silently replaced with a generic material. Directional sprite frames reuse compatible material variants; changing geometry identity alone must not rebuild the shader. Texture images and source versions continue to synchronize after lazy loading.

The pinned renderer's automatic bookkeeping RAF is stopped; the existing game draw advances its node frame once, preserving FRAME guards across nested post passes. Cumulative render IDs remain monotonic. GPU frame statistics aggregate the complete scene/shadow/post draw instead of reporting only the final fullscreen triangle.

Only one complete GPU frame may be in flight. While its submission fence is pending, source simulation/input and the HTML UI continue, but no stale camera frames or uniform writes are queued. The next existing game draw takes the latest pose. Warm re-entry keeps a hidden busy canvas hidden until it can submit a fresh frame. This bounds queue latency rather than adding another animation loop.

Fog keeps its own stable identity while values update, preventing Three from rebuilding scene shaders every frame. A revision-gated WGSL helper canonicalizes only validated generated buffer type/uniform identifier pairs before stage caching. Numeric group/binding slots, member names, array counts and calculations are unchanged; unexpected syntax, collisions or other revisions retain the original source. Eight focused tests include 24 equivalent real generated vertex stages reducing to one while a different instance count stays distinct. This addresses duplicate compilation, not a claimed device-FPS improvement.

Legacy point sprites become bounded instanced quads on GPU because this Three revision has no usable WGSL gl_PointSize path. This changes their triangle accounting; it is not a free performance improvement. Instanced world geometry remains instanced.

## Neighbour AO and shared PBR

Static voxel AO uses actual neighbouring axis-aligned boxes and 24 face-corner values. A multilevel spatial hash avoids an all-pairs bake. Two packed float attributes use **8 bytes per eligible instance**, decoded in the vertex shader and interpolated per face. They attenuate indirect lighting, preserving warm direct lamps and emissive glass. A shared global index covers a chunked build, so chunk borders do not create shading seams.

Village installation happens after spread/placement and world-matrix updates. Initial selected scopes are the Green, terrain works, beyond buildings and town, followed by rebuilt neighbourhoods, stalls, benches, homes and finished halls. Far woodland/horizon and animated, hidden, non-axis-aligned or dissolving scenery stay unbaked. Moonclock hands are explicitly movable even when their saved pose happens to be axis-aligned. Unbaked geometry sharing an AO material has a neutral legacy attribute default. The bake is not repeated every frame or routine gather.

Four restrained stone, wood, slate and metal micro-surfaces share three 256×256 RGBA8 atlases: neutral albedo, height-derived normals and packed AO/roughness/metalness. Full decoded mip chains total **1,048,572 bytes**. Authored greens, pumpkins and other saturated paint retain their appearance. Face projection uses unwrapped derivatives for correct mip selection across repeats, tile gutters and a distance fade before mixed final mips matter. The same physical channels and classifier are used by WebGL hooks and GPU node materials. One scene-level lease serves rebuilt parts; no material or draw is created per voxel.

## Post-processing

The GPU pipeline replaces the WebGL composer with an HDR scene pass, bounded bloom, a single ACES/sRGB conversion, optional density-dependent FXAA and the existing display-space village grade. UI pixels remain outside it. TV keeps its existing glow scale and disables FXAA. Turning glow off uses direct rendering instead of continuing to execute hidden bloom passes. The pinned node bloom allocates its own target chain; this is a replacement pipeline with a real memory cost, not an extra free effect.

## Dependency matrix

| Change | Consumers | Required contract |
|---|---|---|
| Capability selection and overlay | scene, explorer, source canvas, screen sizing | One native RAF; no simulation duplicate; current first frame before reveal; original input and HTML controls remain reachable |
| GPU mirror | camera, lights, instance arrays, directional actors | Separate camera/core constructors; copied transforms and flags; borrowed data with owned listener targets; rebuild/retire objects without source disposal |
| Node materials | finish, water, grass, sprites, native visibility, custom effects | Explicit known ports; actual uniform references and animation clocks; no generic shader loss; stable layout-aware variants |
| Texture wrappers | lazy sprites, sky art, ground, PBR | Preserve pending-image behavior; sync decoded dimensions, flags, UV transforms and versions; own Source identity; never dispose source images/textures |
| AO bake | Voxels/ChunkedVoxels, final layout, materials | Bake after transforms; 8B/instance; one index across chunks; indirect-only; exclude moving/fading batches; neutral unbaked defaults |
| PBR lease | static and rebuilt finished groups | Three shared atlases; bounded size/mips; coherent normals/ORM; conservative classification; derivative-safe repeat; no per-voxel draws |
| Post pipeline | source grade/bloom, quality, TV | One colour transform; preserve settings and pixel density; own/dispose targets; restore output state on exceptions |
| Map capture | canonical legacy snapshot and UI map | Original materials/camera/renderer remain intact; exact source state and visual clock restoration |
| Fallback and retirement | initialization, device loss, source shadows | Conceal overlay; retire only GPU resources/device; refresh legacy shadows; no retry storm or save mutation |
| Delivery | source/build hashes, normal-render QA, standalone HTML | Declare backend and scope honestly; never claim physical phone/TV FPS from software GPU or injected controller tests |

## Verification and integration

Focused component tests and native WGSL compilation precede complete game rendering. The actual offline HTML harness records its bytes/hash, fixture, genuine backend, native frames, material roles, AO attributes, shared PBR budget, all eight lights, HTML interaction, legacy atlas restoration, return to farm, warm re-entry and optional portrait resize. Software WebGPU establishes execution, not hardware performance. Exact final verification and download receipts are recorded after root's end-to-end pass.

The WebGL fallback remains necessary for unsupported browsers and file/content origins where WebGPU is unavailable. This phase upgrades the village renderer; farm, house and rides retain their tested WebGL presentation. No current APK is rebuilt by this renderer pass.

## Verified delivery

The shipped runtime is `b1915b64c111b4085a91997e7a35208bb3565813`. The full offline HTML is **61,710,319 bytes**, SHA-256 **`56dc1a9a99b354c46ac9b8beef379a769669171e34c10cecf9d53a55cf88f849`**. A separate source rebuild is byte-identical, with no build warnings.

All **1,483 tests** pass. The exact HTML passes **20 genuine WebGPU browser checks**, **11 explicit WebGL browser checks** and **54 compatibility smoke checks**. GPU/GL use the same declared Natalie/dusk/level20 fixture. Native RAF, actual scene/shadow/post rendering, all eight pooled lights, real AO attributes and PBR consumption, clickable HTML journal, portrait resize, map restoration, farm return and warm re-entry are covered. The compatibility smoke holds draws and remains separately scoped. Browser reports have no page, console/shader, failed-request or external-request errors. Earlier short-timeout/restricted-sandbox attempts are not counted as completed passes.

The live fixture contains 81,699 AO instances across 111 existing batches, with 653,592 attribute bytes and no added draws. The one shared PBR set has three 256² maps, four surfaces and 1,048,572 full-mip bytes. The GPU presentation reports a single maximum frame in flight; full-frame counters include scene, shadow, bloom, FXAA and final grade. Root inspected the actual GPU world/journal captures. Shader-stage normalization is observed in the real backend, not merely in a source-only test.

Software Dawn/SwiftShader and software WebGL establish execution, not physical Fold/phone/LG TV FPS or Bluetooth certification. Cold and warm flow wall times in the raw reports include compilation, staging, synchronization and browser scheduling; they are not steady rendering benchmarks. The earlier final responsive dialogue/controller previews remain labelled as the exact `6c71a20f` fidelity checkpoint. No APK is rebuilt.

Claude: review the incremental comparison from `bebcb19` on `contractor/village-webgpu`, stacked on the atmosphere contractor work. The lead `voxel-reference` was checked again at `8da66cb93893047d56bad874583f509ba0209d7a` and its checkout was not edited. `PumpkinVoxel.scene.villageRendererStatus` identifies the actual GPU backend, complete frame counters, material roles and stage cache. `scene.debug.renderer` intentionally remains the original WebGL renderer for existing map/debug tooling; force `?villageRenderer=webgl` when using older GL-only performance harnesses. Private lifecycle/cache hooks are guarded and pinned to Three169; revalidate them before an engine upgrade.
