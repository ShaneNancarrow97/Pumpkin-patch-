# Contractor delivery — The Hollow Hayride

For **Claude, the lead developer**. Start with [handover 38](../../handovers/38-hayride-lead-integration.md) for the current lead integration, then [handover 37](../../handovers/37-off-map-hayride-takeover.md), then [handover 36](../../handovers/36-hollow-hayride-operational-expansion.md) for operations/economy. Source branch: `contractor/hollow-hayride`; original base: `d98db5989091975391a20ce3e4d56aa58fbc3ccb` (handover 35). The final branch also contains current lead `1abaff5386bbf563a5e0a8454ffdf125b5b94d8c`; use that newer base for the final incremental patch.

This is the playable operational expansion of the earlier [route design](../../plans/haunted-hayride/) and [vehicle prototype](prototype/README.md). It adds a purchased western boarding station, FIFO visitor queue, pay-on-boarding admissions, a coupled departing tractor/wagon, saved paid journeys, a 90-second circuit, capacity/scare upgrades and a free off-map owner ride-along. The forest route is absent from the farm; the tractor leaves through a dark portal and returns later. The real game still starts with the ordinary economy; review funds/unlocks exist only in the QA harness.

## Review safely

```sh
git fetch origin contractor/hollow-hayride
git worktree add ../pumpkin-hayride-review -b review/hollow-hayride origin/contractor/hollow-hayride
cd ../pumpkin-hayride-review
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-hayride.html
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/pumpkin-hayride.html /tmp/hayride-qa
HAYRIDE_QA_FOCUS=visual CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/pumpkin-hayride.html /tmp/hayride-visual
node voxel/tools/simulate-hayride.mjs /tmp/hayride-economy.json
```

Run browsers sequentially. `voxel/node_modules` is a legacy tracked local symlink in the lead repository; recreate dependencies locally without carrying a machine-specific link into a source commit. Read the [verification record](verification/README.md) for browser-policy restrictions and the exact release HTML hash.

The download branch contains **artifacts only**. Do not merge it into the source tree. The incremental patch applies only to the exact base above; check it in an isolated worktree before combining with unpublished lead changes. The old prototype download is historical and is not this full game.

## Integration boundaries

- Root 2D game, `world.js`, existing Hollow House exterior, foyer and maze modules stay unchanged.
- The provisional site overlaps the woodland area reserved in handover 35. Its coordinates and routes are isolated in `content/hayride-layout.js`; reconcile that module with any unpublished lead map work before merging both.
- State version 11 preserves existing progress and adds attraction/paid-visitor state. Ticket receipts, seats, wallets, queue quotes and return paths are validated on restore.
- Simulation owns money and dispatch. The native site, articulated vehicle and owner preview are view-only; the preview cannot mint earnings or consume capacity.
- Fixed light pools, cached instanced geometry and a single renderer are retained. The owner ride renders a separate dark forest scene using the same renderer. The farm convoy and its paid guests remain authoritative and disappear while away.

## Follow-on work

The off-map forest contains 120 tall trees, dense foliage and the existing detailed generated scare cast, with occasional lightning and delayed thunder. Physical Z Fold profiling, final five-scene lighting review and a full final-browser replay remain useful. Tune tier prices from real player sessions before treating the demand fixture as a profit forecast. Cooking, ingredient deliveries and a ride-layout editor are outside this increment.
