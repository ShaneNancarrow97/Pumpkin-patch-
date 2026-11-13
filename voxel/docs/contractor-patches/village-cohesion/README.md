# Living Mothlight: village cohesion handover

This follow-up builds on the village clarity contract at `ac16208`, which includes Claude's lead `8da66cb`. It stays on the isolated `contractor/village-clarity` branch and extends review PR #3. The lead checkout is untouched.

## Result

The two empty lawns around Moonclock Square now form connected neighbourhood gardens: a cider orchard, community pumpkin and herb beds, looping garden walks, a lantern commons with a covered pavilion and picnic table, broad moonflower planting and a small grove. A reading court links back to Elowen's library, a tool-and-timber workyard belongs beside Rowan's cottage, and planted meadow edges join the arrival clearings to the homes.

Town grass is shorter and calmer so the new planting and furniture can be seen. Garden lanterns borrow the existing eight-light pool. The existing two or three cosmetic passers-by now include a garden stroller; no extra customers, saved NPCs, lights, menus or businesses are introduced. The actual-world atlas automatically photographs the new scenery.

The final layout has **22 scenery clusters, 28 fruit trees and 59 measured solid footprints**. Its detailed furniture, planting, gravel and slate pavilion total **6,232 voxel boxes in three instanced meshes**, with no additional lights. New crowns are spaced clear of the walking lanes. Paved loops divide the large lawns into smaller places, while the park keeps room for exploration.

## Dependency matrix

| Change | Shared consumers | Preservation / check |
|---|---|---|
| `content/village-neighbourhoods.js` | Native model builder, collision, placement, grass, cosmetic walking | Coordinates are **already spread design-grid units**. Only rule helpers apply K=1.5; the view scales model geometry once. Never run this layer through `spreadVillage`. |
| Selected native clusters | `villageNeighbourhoodClusters(state)`, `villageNeighbourhoodObstacles(state)`, view sync | Existing owned decoration wins. An overlapping native cluster and all its solids disappear together; its light positions also leave the pool. Save restore/Undo tests retain the original placed piece. |
| New solids | `villageWalkObstacles`, `villageDecorGroundClear`, resident/wanderer movement | Only real trunks, posts, furniture and hedges block movement. Low flowers, earth and gravel are walkable. Low scenery adds no camera blockers. |
| Resource pools | `village-node-sites`, named clearings, saved gather cycles | All **676 authored/respawn positions** retain the exact pre-patch fingerprint `d1d5703ef8acb22b8f389a7e1871dc6b92c3de9c68f146f7cb3ef6a4f6259c61`, including 0.65-world-unit clearance. No seed, ID, cycle or pool algorithm changes. |
| Park access | `TOWN_SQUARE`, `villageCellFree`, stepped movement | The intended full park rectangle, including the east pavilion, is walkable as part of the Green. Radius-inset boundaries stop at the park edge. Copse, Quarry, Moor, Marsh and Acre gates still require their existing conditions. Every new path connects to arrival and is tested with actual stepped movement. |
| Grass | `village-world.grassAt` and existing GPU grass | Paths, beds and furniture bases stay clear. The static planned mask leaves tended ground under owned replacements; it does not add per-tuft save queries. Existing distance/player/camera fades remain. |
| Render rebuild | `village-view.syncNeighbourhoods`, model disposal, world atlas | Rebuild only when the selected cluster IDs change. Routine gathering does not rebuild the layer. Dispose owned instances/materials, **never the shared global cube geometry**. Surface roots hide in rooms/caves and the atlas uses the same models. |
| Cosmetic visitors | `rules/village-wanderers`, native paths, live obstacles | Same two/three cap, visit-deterministic identities and local random seed. At least one active garden lane, others on the original Green avenues. Swept checks and active-path filtering respect owned decorations. No economy or save accounting. |

Save version remains **20**. Farm income, level and quest gates, inventories, purchased houses and previously owned decor remain under the existing rules. The public gardens are scenery, not free purchases or new quest completion grants. Existing player building reserves, doors, story props and the main Green → Square → Quarry route are retained.

## Validation and delivery

Verification receipts are recorded in `verification/` after the final build. The normal-render browser harness is `tools/village-cohesion-qa.mjs`: it captures the actual atlas, checks the batch/light budget, walks across the former east-park limit using real keyboard input, checks owned-decor suppression/restoration and cosmetic garden movement, then photographs the orchards, commons, court and Fold-sized map. It uses declared staging positions and direct ticks for functional checks, not a device performance claim.

The full suite passed **1,282 tests**. After the final tree/pavilion planting, the five affected model, navigation, resource, square and wanderer files passed **26 tests** again. The final exact HTML passed **eight normal-render browser checks**, with no page errors. Its SHA-256 is `a2885c22f16f1cb65d84a2cb6460dda79c34d92297fc2c6d1382f4b50b8cd96d` (60,533,183 bytes). See [`verification/tests-and-build.json`](verification/tests-and-build.json) for scopes and log fingerprints.

The model tests enforce bounded batches, rendered/protected footprint agreement and safe disposal. Navigation checks preserve every old resource point and route, test the full new walks and pavilion approaches, and verify the park boundary and all locked districts. Browser screenshots are review artifacts in temp/ignored paths and the downloadable ZIP, not source game assets.

The published standalone HTML and ZIP include all earlier village clarity fixes. The ZIP carries the handover, exact-byte receipt and before/after world previews. The older APK is not updated by this contract. Export/import a farm through Settings when moving between browser/file origins.

## For the next contractor

Keep geometry, solids, grass masks, native light positions and suppression bounds in agreement when changing this layer. A large crown can be passable above a narrow trunk; a visible table leg cannot be omitted from its collider. Check all 676 resource points before moving or adding solids. Use the shared path descriptors for new strolls and keep the original visitor cap.

New quest stories, businesses, extra resident homes and the larger handover75 shape/story migration remain separate work. The new park is deliberately open public space around those existing landmarks and reserved plots.
