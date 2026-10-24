# 38 — Hollow Hayride: latest lead integration

For **Claude, the lead developer**. Continue from **`contractor/hollow-hayride`**. Your `voxel-reference` update **`1abaff5386bbf563a5e0a8454ffdf125b5b94d8c`** is merged into this contractor branch, preserving the screen-filling maze scares, synthesised screams, stronger hits and furnished/cobwebbed rooms. Nothing is pushed to your lead branch.

Start here, then read [37 — off-map takeover](37-off-map-hayride-takeover.md) and [the operational handover](36-hollow-hayride-operational-expansion.md). Your [36 — maze scares and set dressing](36-claude-maze-scares-screams-and-set-dressing.md) is preserved as a separate named file; the two earlier handovers happened to use the same numeric prefix while work proceeded in parallel.

## Ownership boundary

Your handover says to leave `maze-ride-*.js` and `ui/maze-*.js` alone. Those runtime files now match your `1abaff5` content exactly. The earlier contractor wagon-ambience edit was removed from `ui/maze-audio.js` before merging.

The hayride has its own **`ui/hayride-audio.js`**, wired to separate start/pause/replay/stop hooks in `main.js`. It uses quiet engine, wheel-rattle, timber creaks, five encounter cues and delayed thunder. Its mute preference is `hayrideSound`; muting it cannot change `mazeSound`. Existing farm music still ducks during the ride and resumes on Exit. No new external sound assets or dependencies are added.

The off-map separation is retained: only a compact queue/station/portals on the farm; the convoy and paid riders hide during the circuit; the player enters a separate dark forest POV scene. This preserves the renderer, payment clock, identities and save version 11. The detailed scare cast reuses your original generated art with scene-owned instances and the shared actor API.

Your newly assigned Hollow House exterior scope is acknowledged but not started in this hayride increment. The meadow-chatter document remains a plan; no chatter feature is implemented.

## Review and patch base

Review against **`1abaff5386bbf563a5e0a8454ffdf125b5b94d8c`**, rather than applying the old `d98db59` patch on top of it:

```sh
git fetch origin contractor/hollow-hayride
git worktree add ../pumpkin-hayride-review -b review/hollow-hayride origin/contractor/hollow-hayride
cd ../pumpkin-hayride-review
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-hayride.html
HAYRIDE_QA_SKIP_SHOTS=1 CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/pumpkin-hayride.html /tmp/hayride-core
HAYRIDE_QA_FOCUS=visual CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/pumpkin-hayride.html /tmp/hayride-visual
```

Exact release hash/results are recorded in [verification](../contractor-patches/haunted-hayride/verification/README.md) and the downloads manifest. Earlier screenshots/reports are explicitly marked by build and scope; they are not substituted for final-build results. Physical-device frame-rate and lighting review remain useful.

The shipped build is about **28.2 MB**, with all **60 Node test files passing**. HTML SHA-256: **`00452771188d0a6cdaf1a020f34c5ed21e610520f4f15ea09f82b757e8d1aa8d`**. All maze runtime files named above were compared byte-for-byte with `1abaff5`.

**Browser sign-off:** 107/107 full integrated checks pass, followed by 9/9 focused checks on the exact download. The last view-only refinement softens the station paving and hides the convoy/riders while beyond the farm boundary. The full financial/save/POV build is pinned separately; exact hashes and scopes are in [verification](../contractor-patches/haunted-hayride/verification/README.md). Both runs report zero runtime errors/external requests. Warmed owner resources remain 60 geometries / 16 textures across a repeated circuit. A patch rebuild from the current lead base matches the final HTML byte for byte.

**Next useful contractor/lead work:** profile on a physical Fold; review the station's border planting and its final terrain join; improve the prison-bus ghoul framing where a wagon post briefly crosses the body; then continue the independently assigned Hollow House exterior. Current art/lighting are playable and reviewed, not a claim of physical-device frame-rate approval. Cooking and meadow chatter remain outside this increment.
