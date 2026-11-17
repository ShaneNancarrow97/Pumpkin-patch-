# Village world readability

The Moth Tree keeps its complete authored art, but its upper trunk and crown dissolve when the owner is nearby, the camera enters its crown or the crown lies between camera and owner. The planted stone rim, low roots and flowers remain visible. Its collision remains fixed. This gives a reliable landmark on arrival and a clear view while walking around it. Only three isolated tree meshes/materials change; ordinary buildings, ground and trees keep their original materials. No blended sorting, new lights or per-frame geometry is used.

`tickVillageVisibility(green, player, camera, dt)` takes the built Green group, the owner's **Three world position**, camera and elapsed seconds. Call outdoors from `village-view.tick`; pass no player for a tour/survey. `resetVillageVisibility(green)` restores the full tree immediately for a fresh presentation. The crown's transient opacity/target are exposed in `green.userData.treeVisibility`.

`grass.tick(time, camera, player)` now accepts the same Three world position. Shared GPU uniforms clear blades within 1.2m of the owner, easing back by 2.8m, and clear the foreground immediately around the camera. Blade height falls before an alpha-hash dissolve, with no transparent sorting or per-blade CPU changes. Flowers share the same fade. A missing player restores the normal grass field. The existing breeze and bounded patch culling remain.

## More room around the tree

World fixtures, their hits, map destinations, decoration exclusions and collision read `FIXTURES`. Rowan's stall moves from design `(64.2,24.6)` to `(64.2,28.6)` on the north-east edge. The well moves from `(51.4,27.8)` to `(52.1,17.8)`; the noticeboard moves from `(63,29.8)` to `(63,18.5)`. The western flowerbed is shortened to leave the new well clear. Both former occupied areas beside the tree become walkable. The tree, homes and doorways stay fixed.

Rowan's restored route derives its post/awning stops from the stall fixture. Animated well/noticeboard crow perches derive their coordinates from the same fixtures. A continuous sweep was added to resident fixed-body path tests: an old coarse sample could skim the bench corner, then leave Elowen stuck during her restoration walk when short strides caught it. The new opened route reaches its home without teleports.

Existing decor over a relocated fixture may return to storage on restore through the existing validation; ownership is retained. Node IDs, cooldowns, saved cycles, yields and all resource candidate pools are unchanged. Comparing every pool with the parent build produced zero differences.

## Resource and ground art

Logs grow to about 67.5cm long, with layered end grain, raised bark plates, a split and a twig knot. Rocks grow to about 49cm across and 37cm high, with stepped faces, pale mineral seams and moss. Herbs have distinct leafy sprigs, pale midribs and tiny buds rather than plain green pillars, reaching about 96cm high. Gathered props still disappear completely. These remain in the same bounded node batches and use no image textures or lights.

The shared grass repeat increases from 1.6m to 2.2m for clearer short-blade detail. The new generated v2 tile is supplied separately by the menu-art contractor at the existing `assets/terrain/grass-tile.webp` path; farm/village colour masks continue to preserve roads, soil and water.

## Verification

Five focused world/readability/navigation suites pass, including deterministic finite geometry, zero added lights, unchanged resource sites, fixed-body sweeps, complete neighbour routes and isolated tree/grass uniforms. Four further save/resource/progression suites pass. Static Green: **36,848 voxel boxes, 49 meshes, zero lights**, below its existing 37,000/50 budget. Browser shader compilation and near-tree/near-grass screenshots belong to the root's final game verification.
