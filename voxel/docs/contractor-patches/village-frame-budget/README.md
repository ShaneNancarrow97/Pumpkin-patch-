# Village frame budget and exclusive rewards

This pass starts from `5046b4bab3f30fad978f8fc33100230b6fd0f65d` on `contractor/village-detail-polish` (PR #8). Work stays on `contractor/village-frame-budget`. Claude's remote `voxel-reference` was checked at `8da66cb93893047d56bad874583f509ba0209d7a`; the separate lead checkout and its uncommitted work were not changed.

## Less work during play

**Nearby resource interactions.** The controller reads each node's current position before asking whether the node is ready. Only resources inside the full seven-metre glow radius need the more expensive district, quest and decoration checks. Gathering reach is included in that bound. Current positions and eligibility are still read every tick, so cooldowns, respawns, relocated nodes and moved decorations remain immediate. Full-map discovery remains unchanged. A stable one-pass selector preserves tracked-activity priority and equal-distance ordering without copying and sorting all interaction targets.

**GPU material lifetime.** When the mirror's complete source-tree scan proves a mesh has detached, its presentation material, callbacks, derived instance arrays and particle descriptor are retired. Hidden but attached homes and scenery retain their resources. Shared source materials, textures and geometry are borrowed and never disposed here. The texture-wrapper cache remains shared and owned by the complete pipeline. Re-adding a removed source creates valid presentation resources. Geometry layout inspection is now shared within each synchronous mirror update, with fresh inspection on the next update and exception cleanup.

**Shadow cadence.** WebGPU now schedules ordinary moon-shadow updates against accepted render frames. A backlog of simulation ticks no longer turns the intended alternate-frame refresh into every rendered frame. First use, pending renderer-owned depth refreshes, room/cave changes, warm re-entry, viewport changes, re-enabled shadows, projection/map/bias edits and movement beyond 0.35 world units force a refresh. Tours keep continuous shadows. These counters are policy decisions, not measured GPU pass durations. WebGL keeps its existing schedule.

The scene's resolution, grass fade distances, lights, PBR/ambient occlusion and nearby detail remain unchanged. Save version stays **20** and existing ownership is preserved. The game clock and controls continue to run; the entire view tick is deliberately not skipped because it also advances cameras, residents and companions.

## Village rewards for both owners

Outfits now has a compact **Village** collection for Shane and Natalie. Each owner's page groups the Moonlit mummy reward route and three exclusive base-outfit colours, with a collection count, provenance and discovery clues. Undiscovered colour names remain hidden. The mummy pair can also arrive through late-game level rewards and other village stories; it is deliberately labelled a village reward route, not unique to The Lantern Keepers. The Moonfern, Mulberry supper and Ghostlight colour pairs are the genuinely exclusive keepsakes earned through the existing farm/village activities.

**Wear look** equips an already earned colour and that owner's original outfit together, for free. Receiving a reward never changes what either person wears. Wrong-owner, unearned, paused and malformed requests are rejected; ordinary paid outfits keep their existing behaviour. Mummy outfits are reward-only, so a completed-but-unowned record cannot expose a dead purchase button or charge for a quest reward. Legacy-owned costumes and all existing level rewards remain valid.

This surfaces the existing authored mummy artwork and directional/action-compatible base colour looks; it does not add new costume artwork or texture uploads. The shared journal now points to Outfits → Village. The collection uses the existing purple interface and touch/controller buttons.

## Measured fixtures

| Work | Before | After |
| --- | --- | --- |
| 110 resource nodes, 22 positions × 6 passes | 14,520 readiness checks | 180, same nearest glow targets |
| Same route with 120 placed decorations | 1,615,680 decoration-bound checks | 21,600 |
| 240 meshes sharing one geometry | 241 geometry-attribute enumerations per sync | 2 |
| 240 mesh replacements, one mesh still attached | 240 retained GPU materials | 1 |
| Source-opacity reads after those replacements | 720 per sync | 3 |
| 60 accepted static GPU frames, 3–7 source ticks each | 60 shadow requests selected | 30 normal refreshes selected |

The Node benchmarks in `verification/` and their tools reproduce work counts. CPU fixture timings are not physical phone/TV frame rates. First-use depth allocation and moving cameras can correctly force additional shadow refreshes.

The native WebGPU run also confirms actual render-pass savings: the baseline’s 14 sampled frames all used 16 passes; the new run recorded 15 frames with 15 passes and 19 with 16. In its six accepted stationary frames, three shadow refreshes were deferred. Movement, room changes and first-use allocation account for additional refreshes, so this is not a universal half-cost or FPS claim. A real mirror attachment/removal check returned active material count from 1,885 → 1,909 → 1,885 without disposing shared scene assets.

## Dependency matrix

| Change | Depends on | Keep when extending |
| --- | --- | --- |
| Resource broad phase | Current node positions; `PROXIMITY_REACH`; gathering reach | Read positions before distance rejection and readiness only nearby; never cache eligibility across respawns or decoration edits |
| Interaction selection | Resident reach epsilon; strict resource/door reach; tracked activities | Preserve target order for ties and tracked activity → any activity → nearest target priority |
| Material retirement | Complete mirror attachment scan | Hidden is not detached; remove all per-mesh variants and callbacks, without disposing borrowed sources |
| Effect ownership | Per-mesh shader and point descriptor construction | Partial conversion must unwind bindings; descriptor geometry has one presentation owner |
| Layout batching | Synchronous mirror conversion | Clear the batch in `finally`; keep instance/colour flags per mesh; inspect again next sync |
| Shadow pacing | Accepted GPU frames and r169 pending depth updates | Capture renderer-owned requests before merging routine source dirtiness; preserve matching map/matrix state |
| Shadow travel | Stable surface/hall/cave context, camera displacement, resize/hide | New exceptional changes can increment `scene.userData.villageShadowRevision`; tours use continuous refresh |
| Diagnostics | Native QA and benchmark evidence | `targetScan` and `shadowBudget` count work; material created/retired totals are cumulative |
| Village collection | Existing wardrobe ownership, exclusive look awards and legacy reward sources | Do not label ordinary friendship costumes exclusive or remove the level-granted mummy pair |
| Wear look | Owned base costume and earned colour for the same owner | Explicit, free, pause-safe action; never auto-equip on an award or mutate the other owner |

## Verification and delivery

The runtime is `b63b369971f8a4a4eb7a6c0d8922e41794051215`. Two independent builds produce the same 61,815,329-byte HTML: SHA-256 `ac84f3f317131a77c4efc1c1994d621626d683f5db6aeaa4538b357330caf4a0`.

- All **1,574** automated tests pass, with no failures or skips.
- Native WebGPU: **44 checks** pass, including actual colour-buffer changes, alternate authored Natalie steps, material retirement, shadow deferral, workshop transitions and farm return.
- Native WebGL mobile landscape: **21 checks** pass, including walking, hidden-work suspension, transitions and farm return.
- Wardrobe UI: **32 checks** pass across desktop, phone, landscape and TV. The real Lantern Keepers handover/harvest/completion rules grant both outfits. Staged eligibility then goes through the native model award path for all six colours. Real buttons verify explicit free equipping and responsive targets.
- Compatibility smoke: **54 checks** pass on desktop and phone; this existing draw-held suite covers logic/UI, not rendering speed.
- ZIP CRC verification passes, and its contained HTML has the same SHA-256. See `release.json`, the compressed complete reports and the selected captures in `verification/`.

The actual GPU entrance, walking, workshop and return captures were visually reviewed. Separate UI-only captures were reviewed at phone, desktop and TV sizes. The compressed browser reports retain exact fixture and harness hashes. Native WebGPU acceptance uses actual GPU canvas pixels because this software Chromium runner has a separately reproduced stale page-compositor limitation. UI draw-held screenshots are labelled separately and are not rendering or performance evidence. No APK is rebuilt in this pass.

## Downloads

[HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/ad2e841c406a7f64d2cd17529ae5b18d5988e851/Pumpkin-Patch-Smooth-Village.html) · [ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/ad2e841c406a7f64d2cd17529ae5b18d5988e851/Pumpkin-Patch-Smooth-Village.zip)

Published from isolated artifact commit `ad2e841c406a7f64d2cd17529ae5b18d5988e851`. Both public downloads returned HTTP 200 with the exact tested bytes and SHA-256. The ZIP contains the same HTML and opening/save-transfer instructions.
