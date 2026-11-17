# Blackroot models, spores and view hooks

The resource adapter now recognises `cursed-spores` as a detailed, native voxel fungus cluster. Each cluster has four circular domed caps with visibly different diameters and heights, curved segmented stalks, radial gills, thin forked roots, red ooze drops and a few luminous flecks. The revised model uses **727 positive boxes** against an explicit 900-box cap. It writes into the existing resource solid/glow batches rather than adding a mesh or light for every mushroom.

The largest cap is sampled across a twelve-step diameter with a curved crown profile; its sides fall towards a circular rim instead of using square slabs. The smaller caps use their own eight- and ten-step diameters. Roots are tapered connected polylines with side forks and curling tips, only a few centimetres wide and under 2.5cm high in world space. Loose dirt crumbs replace the old square soil tile. All details remain inside the existing 1.35m pick footprint and saved socket positions.

[Orthographic geometry proof](verification/blackroot-model-detail/orthographic-proof.png) is drawn directly from the actual writer's seed-51 box output, also retained as `runtime-boxes-seed51.json`. It demonstrates the mesh shape with simple face shading; it is explicitly not a browser screenshot or a claim about game lighting.

The eight playable Green sockets use their canonical fixed positions. Ordinary logs, rocks and plants keep their existing relocation pools. The new `kind: "blight"` node exception in `content/village-node-sites.js` stops an outbreak drifting into a path or plot. Node picking remains `type: "village-node"`; only fungus gets a larger 1.35m × 1.08m × 1.35m box matching its measured model bounds.

The spore layer is one independent instanced mesh with a strict **24-particle budget**: up to 12 ambient spores around the three nearest live patches and two six-spore clearing puffs. Red/purple particles use an unlit material, share one cube geometry and add no lights. Positions, transforms, nearest-site slots and burst records are reused; there are no per-frame DOM reads or object allocations in its tick. Distant particles, interiors and reduced-motion mode hide this layer. Pausing freezes its animation.

`view.gatherTool({ actor, material: "cursed-spores", target, progress, active: true })` uses the existing gathering call to pull a short stream of spores towards the owner's hand. It does not put an axe or pickaxe in that hand. A ready → spent transition emits a clearing puff only when the saved `gatherCycles` value increases; a redraw or locked gate cannot repeatedly create a puff. The spent cluster and its hit box disappear completely. Readiness, yield, overflow and respawn remain in the pure village rules.

## Dependencies

| Surface | Dependency | Preserve when expanding |
| --- | --- | --- |
| `cursedFungus(writer)` in `village-blight.js` | Existing node writer and shared `Voxels` builder | Positive finite boxes; measured bounds must fit the hit box |
| `buildNodes` metadata | Canonical `NODES`, `villageNodePosition`, `nodeReady` | `resourceSites` remains compatible; `blightSites` adds a filtered diagnostic list |
| Spore `sync` | Ready state, canonical position and saved cycle | Compare the old position before advancing it; no render-owned save fields |
| Spore `tick` and disposal | One geometry, one material, one `InstancedMesh` | Keep the 24 cap and dispose the instance buffers as well as geometry/material exactly once |
| View picking | Same node IDs and existing node interaction handler | Normal resource boxes stay unchanged; hide fungus hit boxes while spent |
| Future districts | Existing district locks | Current node builds/picking are Green-only, just as before. Future locked sockets stay invisible; opening those districts also requires extending the normal node rendering/picking adapters |

`view.blightStats` exposes the particle cap, live/ambient/puff counts, one-shot puff total, rooting state and zero added lights for QA. It does not save anything.

## Conversation camera integration

The view now wraps `createVillageDialogueCamera` through `view.dialogueCamera`. Its `begin(player, neighbour)` accepts existing **realm** `{x,z,y?}` points and converts them into Three world coordinates. A supplied actor foot height is preserved; interior hosts use the hall floor instead of sampling distant exterior terrain. The helper owns the shared camera while entering, focused or returning. Normal follow/framing/orbit updates yield to it, resize asks it to reframe, and a hall switch, tour or village exit ends immediately. See [DIALOGUE-CAMERA.md](DIALOGUE-CAMERA.md) for the helper's projection/return tests.

## Verification

`node --test test/village-blight-world.test.mjs test/village-node-sites.test.mjs test/village-dialogue-camera.test.mjs` passes **19 named checks**. They cover positive model boxes and actual hit-volume bounds; rounded crown profiles, missing square corners, varied cap diameters and thin root geometry; removal without stumps; the two-batch native build; fixed walkable sockets; the 24-particle cap; simultaneous and once-only puffs; hand-pulling; pause/reduced-motion/interior suppression; reuse and GPU disposal; existing resource navigation; and camera projection/return behaviour. Syntax and diff whitespace checks pass. No build or browser run was performed by this part; parent integration owns normal-render screenshots and the final game checks.
