# 37 — Off-map Hollow Hayride: Claude takeover

For **Claude, the lead developer**. **Current lead base and release results are in [handover38](38-hayride-lead-integration.md).** Branch: **`contractor/hollow-hayride`**, exact lead base **`d98db5989091975391a20ce3e4d56aa58fbc3ccb`** (your handover 35). Read [36](36-hollow-hayride-operational-expansion.md) for admission rules, level gates, prices, save version 11 and tests. The user requested this contractor branch be pushed so you can take over. No change is pushed to `voxel-reference`.

## Final player experience

Only the **boarding station, queue and departure/return portals** belong to the farm map. The tractor departs north into a dark portal, disappears for the whole woodland circuit and returns forward from the south. Paid seated guest models use the same farm pose and visibility. Their identities, purses, receipts and capacity reservations remain alive in the lightweight simulation while off-map. The forecourt uses detailed cobbles, low planted borders and smaller curtained gateways; pedestrian connectors now have continuous ground beneath them.

**Owner ride-along** opens a separate three.js scene using the existing renderer/canvas. It is a free first-person seated trip through the five woodland scenes. It does not move or rewind the paying farm convoy. Exit immediately restores farm camera/input/music. Existing Hollow House and maze are preserved.

The POV scene is intentionally very dark: shallow blue-black fog, dim warm tractor light, local encounter lighting, 120 tall detailed trees, rough bark, overhead foliage, ferns, moss and fallen logs. Four detailed original generated actors are reused from the existing maze art: scarecrow, wet-haired haunted girl, wraith and ghoul. They emerge near roadside scenes, approach without crossing the wagon lane and react more strongly to purchased scare upgrades. This preserves the game's voxel/sprite style rather than introducing unrelated photoreal assets.

Three **widely spaced single lightning flashes** occur at 13.2, 40.4 and 69.1 seconds, with delayed offline synthesised thunder. The ride has its own quiet engine, wheel-rattle and timber-creak ambience, while the maze retains its original footsteps. No new audio file or remote request. Lightning can be disabled independently; gentle mode disables flashes and lunges and keeps the camera steady. Pausing clears the flash; Exit resets it.

## Files to inspect first

- `content/hayride-layout.js`: compact farm bounds, separate ride bounds, distinct pure farm/owner convoy poses, coupled seat transforms and off-map visibility. Pedestrian paths and platform coordinates remain stable.
- `hayride-world.js`: farm station root and dedicated `rideScene`, independent farm/owner vehicles, fixed light pools and scene-local ownership. The full woodland is never a child of the farm scene.
- `hayride-forest.js`: deterministic 32,015-box forest, one instanced mesh, low lane clearance 2.35m, overhead clearance 5.35m and scenic windows.
- `hayride-scares.js`: generated-art instances, timed glimpses/lunges, upgrade response, camera-facing art, independent disposal. `scene.js` injects its factory so pure Node world tests do not import image files.
- `hayride-view.js`, `content/hayride-weather.js`: owner clock/camera, guided glances, fog, slow lightning envelope and once-only delayed thunder.
- `ui/hayride-ride-ui.js`, `main.js`: briefing, pause, gentle/lightning preferences, sound and fullscreen.

## Review without replacing your unpublished work

```sh
git fetch origin contractor/hollow-hayride
git worktree add ../pumpkin-hayride-review -b review/hollow-hayride origin/contractor/hollow-hayride
cd ../pumpkin-hayride-review
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-hayride.html
HAYRIDE_QA_FOCUS=handover CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/pumpkin-hayride.html /tmp/hayride-handover
```

The full standalone HTML has the normal starting save, not the QA funds. Downloads are published on an artifacts-only branch; never merge that branch into source. The legacy tracked `voxel/node_modules` machine symlink is unchanged in source; install/relink local dependencies for review.

## Verification and recommended next work

All **60 Node test files pass**. This includes off-map scene isolation, independent vehicles, same paid riders during hidden travel, visible seat/hitch continuity on departure and arrival, save/return continuity, payments, closure, malformed saves, bounded geometry, forest clearance, scare disposal and lightning controls. The single-file HTML builds at about **28.2 MB**.

Historical browser checks confirmed the queue, exactly-once boarding payments, price controls, background travel, save/reload, upgrades and owner controls before the off-map split. That run was interrupted by a host restart and is explicitly marked historical. It is **not** full browser approval for this final presentation. Read [the exact verification record](../contractor-patches/haunted-hayride/verification/README.md) for current smoke status.

Prioritise these takeover checks:

1. Play the final HTML on real Z Fold hardware: station departure/return, all five POV scenes, visibility in a dark room, audio levels and frame rate.
2. Run the full browser finance/save/owner flow on this final candidate. Revisit each tier's lights and lunges without changing the payment clock.
3. Reconcile the provisional station gate/terrain with any unpublished lead woodland/site work. `world.js`, the Hollow House exterior and foyer/maze modules are unchanged.
4. Profile dense foliage on mobile and reduce distant tree detail if necessary. Normal farm view does not draw it; the owner scene currently constructs on attraction purchase.
5. Continue economy tuning from real sessions. `tools/simulate-hayride.mjs` is a deterministic finite-stock demand comparison, not a payback forecast.

The first focused off-map smoke completed 20 assertions through station/scene isolation, owner controls, lightning, gentle mode, Exit and unchanged saves, with no runtime errors or external asset requests. Its managed fullscreen tail timed out, so it is not labelled an all-pass run. A subsequent refinement adds an explicit disabled-fullscreen guard, improves the gateways/ground and raises the wraith above its native scene actors. The final `release/` report records the broader replay when complete.

The source is ready for your review and continuation. No claim is made that physical-device performance or final five-scene lighting is signed off.
