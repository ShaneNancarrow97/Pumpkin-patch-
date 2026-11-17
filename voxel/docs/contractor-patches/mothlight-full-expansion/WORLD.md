# Mothlight world and navigation handover

The existing renderer now supports the six surface districts and three separately cached underground layers. All saved Green node IDs, decoration positions and existing hall adapters remain in place. `EXPANSION_AREAS` and `expansionAreaInfo` are authoritative for opening paths; money or the old preview scenery never opens a district.

## Coordinates and integration

Content and gameplay use world units, with `PLAN_SCALE = 1.5` applied once. Rendering converts realm north-positive `z` to Three negative `z`. Cave depths use local negative realm `z`, with separate floor functions; underground following explicitly bypasses the overworld camera-height clamp.

`village-view.js` exposes:

| API | Meaning |
| --- | --- |
| `enterExpansionArea(id)` | Enter an unlocked cave, returning `{id, spawn:{x,z}}`; false if unavailable. |
| `leaveExpansionArea()` | Return `{previous, spawn}`. Surface mouth is design `(-30,106)`, world `(-45,159)`, in Copse. Runtime resolves nested returns through each area's `returnArea`/`returnPoint`. |
| `activeExpansionArea` | Cave layer ID, otherwise null. |
| `expansionTargets` | Current actionable story/mining targets, nearby resident posts and physical portal positions. Each has `type,id,area,x,z`; portals also have `targetArea`. Future and completed quests never compete for proximity. |
| `moveExpansionWalker(from,dx,dz)` | Swept surface movement or active cave movement, in realm units. |
| `expansionGroundAt(x,z)` | Actual surface or active cave floor height. |
| `setExpansionCompanion(id)` | One live follower using the existing actor loader and the pure companion sweep helper. |
| `canEnterInside(id)` | Saved home restoration plus area gate, shared with the pure `expansionHomeOpen` helper. |
| `expansionStats` | Cached layer count, active layer, pickable count, visible restoration flags and added-light count. |

Surface district changes do not replace the scene: navigation opens the authored road and district extent, resources and residents become available through the same rule gate. Controller gathering now includes later district resources through the runtime adapter.

## Physical additions

The Crooked Acre extends west to the shared realm border. Its seeded maze pathways, corn exclusions and collision corridors share `village-expansion-spatial.js`; every accessible maze branch connects to the entrance. The central cottage has detailed timber, windows, roof, porch and chimney, with three distinct scarecrow landmarks. Foreground corn chunks fade near the owner. Completing `acre-shortcut` permanently clears a direct route through a separate cached corn group.

The cave mouth branches from the Copse's northern verge. The Lantern Steps, Drowned Workings and Root Cathedral each have closed rock geometry, timber stair supports, warm/cold mineral light, reachable doorways and twelve veins. Floors descend six design metres from each landing. Cave geometry is built once when visited; re-entry reuses it. The existing eight-light pool serves the nearest lanterns on both sides of the passage, so no additional dynamic lights are created. Cooling seams refresh at one-second presentation intervals, without adding a second saved clock. Each ore outcrop uses twenty to forty-five small stepped rocks with embedded depth-specific mineral flecks; fissures and low chips break up the cave floor.

Browser review found two separate presentation problems: a camera could cross closed rock, and its initial yaw looked back towards an unlit side-chamber end wall. The dedicated cave camera now faces into the descent, the entrance chamber flares earlier, and a wall/roof/floor sweep preserves safe framing. A safe vertical lift retains a minimum six-point-eight-metre viewing distance when a wall shortens the spring arm. Interior portal arches have no opaque backing between the camera and its owner. Brighter rock palettes and a dedicated pale cave hemisphere keep mining readable. Temporary MeshBasic, no-fog, no-postprocessing and white-light photos in `verification/cave-diagnostic` distinguished lighting/orientation from NaN or bloom corruption; the diagnostic browser was closed and its temporary scene overrides discarded. Acceptance still requires the subsequent normal screenshot of the rebuilt artifact.

Seven authored homes use the existing hall mechanism: Mabel's haberdashery, Tansy's potting room, Opal's stone studio, Cinder's restaurant, Corvus's tent, the Baron's manor and Granny's cottage. Each has furniture collision, a clear host approach, doorway and marked lighting. Home flags open the doors; `restaurant-opening` also opens Cinder's and Granny's first level-eight welcome (`granny-listens`) opens her cottage. Granny has an explicit voxel fallback as well as the generated directional sprite.

Saved restoration flags reveal cached permanent changes: Copse brambles withdraw and garden wards bloom, the restaurant gains occupied supper places, the Moor gains a lit inhabited stage, the observatory lights its mineral ring, and Lantern Night adds inhabited tables and suspended lanterns on the Green. These are visibility changes, not terrain rebuilds. New tables and the stage share walking collision.

## Dependency matrix

| Change | Must check |
| --- | --- |
| Activity coordinates | Surface flood reachability, cave cell clearance, current area's bounds and touch/controller reach. |
| Cave bounds or portals | Spatial rooms, visible frames, hit targets, content return points, runtime nested return. |
| Acre paths/shortcut | Corn batch assignment, `acreCellFree`, shared approach and house footprint. |
| Area gate | Navigation, resources, residents, house doors and both legacy/new map criteria. Import navigation gates from dependency-light `village-expansion-access.js`. |
| Home furniture | Hall collision blocks, host position, clear aisle and doorway. |
| Restoration scenery | Saved flag, cached visible group, walking footprint, quest approach after the change. |
| Renderer lifecycle | Cache reuse, instanced buffer/material disposal; do not dispose the shared unit-box geometry or shared pick material. |

## Verification

`node --test --test-isolation=none test/village-expansion-world.test.mjs test/village-navigation.test.mjs test/village-blight.test.mjs test/village-map.test.mjs test/village-resource-cycles.test.mjs`

All 44 named checks passed. New tests flood the real collision field from the farm arrival to every surface quest site, all surface spawns, the cave mouth, Granny's doorstep and accessible maze branches; check all 36 seams and cave stair movement; constrain 24 camera orbit angles at four positions in each depth and the reported shallow-seam framing; test the actual entry camera sightline against instantiated cave geometry and floor frustum visibility; check finite bounded ore models; exercise cache reuse, future-target filtering, seam return, zero new lights and resource ownership; and verify seven furnished hall approaches/exits and Granny's level-eight door. Old migration fixtures now assert version 19 while still loading historical saves, and map/blight checks assert the shipped restoration gates.

Browser screenshots, whole-game checks and build packaging belong to the integration pass. The tests establish geometry/navigation and lifecycle consistency, not device frame-rate or a visual approval.
