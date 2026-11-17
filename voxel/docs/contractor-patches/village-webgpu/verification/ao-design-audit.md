# Voxel AO implementation / handover

Implementation worktree: `/tmp/village-renderer/voxel` on `contractor/village-webgpu`.
The original fidelity source is unchanged by this component.

## Real neighbour AO

`src/rendering/voxel-ambient-occlusion.js` is browser/Three-independent. It indexes arbitrary AABB box bounds in a multiresolution numeric spatial hash. A box belongs to one power-of-two scale and at most eight cells; long architecture is not rasterised into a fine voxel volume. Point samples visit occupied scales and exact bounds only. Numeric hash collisions cannot change results because candidates still pass all six bounds.

Each of six physical faces has four corners. Three occupancy samples distinguish a side contact, the other side and their diagonal. Both side contacts produce full concavity; same-height neighbouring upper faces remain bright. The sample radius follows fine box dimensions and caps at 0.18 source/world units. This is static face-corner contact AO, not screen-space AO, ray tracing or full-scene global illumination. Conventional corner interpolation gives broad gradients on very large authored boxes; the modest 24% indirect-light strength bounds that effect.

Packing is exact: 24 two-bit occlusion levels in two Float32 words (12 base-four values per word, at most 16,777,215). One vec2 instanced attribute `voxelAO`, **8 bytes/instance**, no added geometry or draw. No per-frame bake, saved fields or gameplay mutation. Bounds and the hash are transient build-time data; only packed instance attributes and numeric statistics remain.

Face order `+X,-X,+Y,-Y,+Z,-Z`. Tangents: X faces `(z,y)`, Y `(x,z)`, Z `(x,y)`. Corner order `(-u,-v),(+u,-v),(-u,+v),(+u,+v)`. Decode vertex index `face*4+(u>0?1:0)+(v>0?2:0)`; fetch the corresponding base-four digit, divide by three. Factor is `1-strength*interpolatedOcclusion`. The WebGPU node port must use the same factor via `aoNode`. The existing WebGL hook attenuates `reflectedLight.indirectDiffuse/indirectSpecular` after the standard aoMap step; direct lanterns, paint and emissive glass retain their light.

## Integration / dependency matrix

| Area | Contract |
| --- | --- |
| `Voxels.build` | `ambientOcclusion` is opt-in; default false preserves farm startup. True/object enables per-build AO. Glow batches never occlude or receive it. |
| `ChunkedVoxels.build` and older `chunkedVoxels(...).build` | One occupancy index covers all source solids before chunk/detail-shadow subdivision. Original instance order and draw batches are retained. |
| Late village spread | `installVoxelAmbientOcclusion(scope)` in `voxel-ao-material.js` runs **after** final `spreadVillage`/placement and **after** `finishVoxels`, before render/node conversion. Baking in the original local Voxels builder would preserve neighbours that move apart and is incorrect. |
| Static scene scopes | Root wires selected near architecture, not distant woods/horizon. Each scope includes every chunk for seamless local neighbourhoods. Independently rebuilt groups get their own completed-scope bake. This does not dynamically rebake old world surfaces when a movable prop is carried beside them. |
| Axis changes | Installer measures actual final matrices, supports signed axis permutations/90-degree parent turns, remaps packed world faces to the correct local cube faces. Arbitrary rotations are deliberately skipped instead of using false enclosing-AABB occupancy. |
| Fades/lifecycle | Transparent, alpha-hashed, hidden and explicitly `voxelAOMovable`/`voxelAO:false` ancestor batches stay unbaked. Native per-instance canopy/roof IDs are excluded so dissolved objects leave no static AO shadow. General foliage in otherwise static batches receives only the restrained indirect factor. |
| Shared geometry | Installer clones cube geometry before adding per-instance attributes; never mutates or disposes global BOX. Existing ordinary meshes retain the shared cube. Generic owned-mesh disposal handles AO clones. |
| Finish hooks | Minimal import/reapply in `voxel-finish.js` preserves an explicit `Voxels.build({ambientOcclusion:true})` when the village finish replaces its hook. `refresh:true` is only for that known replacement, not arbitrary wrapping order. Later native visibility continues to compose after both. |
| TSL | Descriptor `material.userData.voxelAO` carries attribute/strength/mode/byte budget; CPU arrays match WebGL. Renderer agent owns the node conversion. A successful shader-text unit test alone does not establish actual GPU shader compilation or visual parity. |

## Focused verification

`node test/voxel-ambient-occlusion.test.mjs`: **13/13 pass**.
`node test/village-finish.test.mjs`: **6/6 pass**.

Fixtures cover an isolated box; coplanar bright upper faces; all four top corner contacts; side-only/diagonal-only/full concavity; exact maximum packed words; all 24 actual BoxGeometry vertices; 90-degree remapping; million-unit wall bounded indexing; dense representative candidate-work counts; chunk/detail-shadow equivalence; no shared-geometry contamination; no emissive occluders; final moved-away matrix placement; hidden/fading/arbitrary rotation exclusions; hook composition and indirect-only attenuation; AO surviving finish exactly once.

Final source profile in `/tmp/voxel-ao-profile.json`, Node24 CPU only, no renderer:

| Scope | Eligible instances | Packed bytes | Existing lit meshes | Total build sample |
| --- | ---: | ---: | ---: | ---: |
| Green | 29,998 | 239,984 | 26 | 985 ms |
| Terrain works | 14,543 | 116,344 | 45 | 473 ms |
| Beyond | 25,616 | 204,928 | 26 | 1,394 ms |

Bounds arrays are 1,439,904 / 698,064 / 1,229,568 transient bytes respectively; hash overhead is not represented by those byte figures. An earlier unoptimised woods test took 3.28 s for 57,002 instances/456,016 packed bytes, so distant woods/horizon should not join the initial near-architecture bake. These are single Node CPU samples with concurrent session work, not hardware performance claims.

The root still owns actual normal WebGL/WebGPU compilation, screenshot judgement, final timing/size budgets, exact HTML tests and packaging. No browser was run in this lane.
