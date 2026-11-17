# Living Mothlight: village refinement handover

Continuation of [village cohesion](../village-cohesion/README.md) and [village clarity](../village-clarity/README.md), based on `96b4083` on the isolated `contractor/village-clarity` branch. The lead checkout is untouched. Save version remains **20**.

## Result

The five public garden places are now named and easy to find: **Cider Orchard, Lantern Commons, Community Beds, Reading Court and Rowan’s Workyard**. They join the existing folded Map landmark list. Choosing one closes Map and sets a walking guide in the current play view. The compact location plaque names the garden while the owner walks there; interiors, caves, districts and Moonclock Square’s gate retain their own names. There are no new map pins, stacked menus, permanent HUD rows or teleports.

Routes use the authored garden path centre lines and check the current collision geometry. Owned decoration can move a target to a nearby clear approach. If a whole court was replaced, its subtitle describes the public location rather than promising furniture or a resident’s presence. Existing Green decoration limits are retained.

Native fruit-tree crowns and the pavilion roof now clear independently when they cross the camera-to-owner sightline. The **28 crowns and one roof** keep their existing geometry, physical collision and full shadows. Trunks, posts, furniture, fallen apples and ground leaves remain visible. Leaving follow mode, entering an interior/cave or starting the tour restores the layer; reduced motion applies the settled visibility immediately. Short grass also narrows with its height so the mown lawn reads as blades rather than broad fans.

World Talk prompts skip expensive approach clearance for residents whose live feet are provably too far away. People, Map, guidance, camera subjects and every transaction still use the full canonical live resolver. No stale interaction destination is cached.

## Dependency matrix

| Change | Shared consumers | Keep / verify |
|---|---|---|
| `content/village-places.js` | Map landmarks, `village-game` focus and local names | Descriptors are **already spread design-grid positions**. Apply `PLAN_SCALE` once; never run them through `spread()` or `spreadVillage()`. Beds take precedence within the orchard. |
| Public route resolution | Native paths, `villageCellFree`, saved decoration suppression, live waypoint refresh | Prefer active path clusters; check each fallback against current obstacles. Build the obstacle list once per resolution. An occupied approach returns no invented target. Selection and walking do not award or save story progress. |
| Map and controller flow | Existing `data-vg-focus` → guide pipeline, panel trail and Back handling | Five buttons stay inside the folded landmark list; the actual-world district atlas remains the default. Keep full action labels and the existing parent-menu behaviour. |
| Resident prompt bound | `residentTalkOffsetBound`, `residentTalkPoint`, nearby resolver and the game’s world-target enumeration | The bound shares the actual fallback offsets and includes live authored counter reach. Unknown metadata falls back to full resolution. Preserve inclusive outdoor **3 m**, indoor **3.3 m** and `1e-6` tolerance, visibility, gates and realm checks. Only world nearby enumeration uses the shortcut. |
| Native overhead tags/shader | `village-neighbourhoods`, `village-neighbourhood-visibility`, voxel finish, view tick | Bounds come from actual written boxes in world space. Install visibility **after** `finishVoxels`; compose shader/cache hooks. ID 0 is permanent scenery; current 29 blockers fit the explicit 64-blocker limit. Keep **6,232 boxes, three batches, 59 measured solids and eight pooled lights**. |
| Snapshot and disposal | `village-view.withMapSurface`, atlas cache, owned instance geometry | Capture complete foliage with the scoped fade-disable uniform and restore it in `finally`, including nested failures. Do not alter live fade values. Dispose owned geometry clones/materials once; never mutate or dispose the global shared voxel cube. |
| Grass proportions | `village-grass`, existing native path/bed masks and world-unit fades | Narrow short blades without changing deterministic placement, instance count, draw budget, masks, collision or save data. |

Coins, inventories, farm income, level/story gates, resource positions/cycles, quests and owned rewards remain under the existing rules. No new business, activity, resident, dependency or remote service is introduced. The larger handover 75 story/shape migration remains separate work.

## Verification and reproduction

Run from `voxel/`:

```sh
npm test
node --test test/village-places.test.mjs test/village-map.test.mjs test/village-game.test.mjs test/village-resident-proximity.test.mjs test/village-neighbourhood-visibility.test.mjs test/village-neighbourhood-models.test.mjs test/village-neighbourhood-navigation.test.mjs test/village-readability.test.mjs
node tools/village-resident-proximity-perf.mjs --out /tmp/resident-proximity.json
node build.mjs --out /tmp/Pumpkin-Patch-Village-Refined.html
node tools/village-refinement-qa.mjs /tmp/Pumpkin-Patch-Village-Refined.html /tmp/village-refinement-qa
```

The focused tests cover actual stepped reach from arrival to all five garden targets, live blocked approaches, saved courtyard reload/Undo, save immutability, controller confirm/Back, location precedence, canonical nearby interaction parity, finite sightlines, a full camera orbit, shader composition, unchanged model matrices/colours, shadow preservation, snapshot failure restoration and safe disposal. The inherited navigation checks retain all **676** resource positions and the original district gates.

The [resident clearance receipt](verification/resident-proximity-perf.json) uses the prior captured Green → Square → Quarry fixture: **2,052 route samples plus 36 ordinary/counter boundary samples**. Five interleaved trials retain identical full nearby-descriptor hashes while reducing swept-clearance calls from **17,162 to 29 per trial**. The captured route itself has no nearby residents; the additional boundary cases provide nonempty parity. This is a Node resolver microbenchmark under shared execution, excluding the controller and renderer. Its deterministic counts and hashes support the optimisation; its wall times do not measure whole-game speed or device FPS.

The browser harness draws the actual offline HTML with SwiftShader and records its exact hash. Declared staging positions and short direct view ticks test sightlines, atlas restoration, garden shortcuts/local names, input availability and confirmed farm return. These are software-rendered presentation/flow checks, not physical phone, Fold, TV or controller performance validation. The unchanged compatibility smoke holds drawing for logic checks and has a separate scope. Reproduce that check against the final recorded HTML SHA with `MOTHLIGHT_EXPECTED_SHA=<sha> node tools/mothlight-standard-smoke.mjs /tmp/Pumpkin-Patch-Village-Refined.html`.

## Known build warnings and release receipt

The build retains four **pre-existing** `import-is-undefined` warnings in `village-expansion-interiors.js`: `baronManor`, `BARON_HALL`, `grannyCottage` and `GRANNY_HALL` are not exported by `village-home-interiors.js`. Their existing shared-room fallbacks remain in use. This refinement does not implement those bespoke interiors.

The frozen runtime is `7f06105cb49a96d9519c94245e4ec2dbd7e9796b`. The full suite passes **1,305 tests** with no failures or skips; the exact HTML passes **20 normal-render checks** and **54 compatibility checks**. HTML SHA-256: `e34c817796fa9e9fe0175357dfe8827f5d91ec587da2e8c0708553a86f6401fc` (60,541,720 bytes). A second build of the frozen runtime is byte-identical. See [tests-and-build.json](verification/tests-and-build.json) and [browser.json](verification/browser.json); the published archive receipt identifies the final documentation/source head. Do not substitute the earlier clarity/cohesion artifact hashes for this build. Screenshots are review artifacts, not source game assets; the older APK remains outside this delivery.
