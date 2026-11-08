# Directional character sheets — dependency matrix

This patch changes character presentation. Saved state, save version, economy, visitor capacity, quest rules, furniture placement and controller bindings are unchanged. Walking uses the existing collision and movement systems. No renderer, mesh per direction, light or runtime dependency is added.

Read [COVERAGE.md](COVERAGE.md) and the generated `assets/directional/manifest.json` for the actual delivered art. A base character's new sheet does not cover their costumes. This pack supplies eight painted views at 45° intervals and eight movement phases, not 15° views or new interaction/idle paintings.

| Change surface | Depends on / callers | Consequence when changing it | Verification |
|---|---|---|---|
| Source PNGs, `tools/bake-directional-sprites.py` | Approved source manifest, measured roots and row order | Re-bake WebP, generated metadata, provenance and previews together. Never mirror a row to invent coverage. | `directional-sprite-assets.test.mjs`; inspect all rows at game size |
| `content/directional-sprite-meta.js` | Shared frame dimensions, anchors, body height, direction names, frame indices | Both owner and village adapters consume this contract. `locomotion: "float"` suppresses leg diagnostics for Cinder. | Asset and directional-math tests |
| `directional-sprite-math.js` | `player-sprite-directions.js`, village sprite math, owner motion | Camera angle zero is towards the viewer; positive π/2 is screen-right. Phase is independent of direction. Unsupported views/actions return an explicit fallback. | `directional-sprite-math.test.mjs` |
| `player-sprite-directions.js` | Existing front/side/back/action sheets, wardrobe recolours, `playerViewScale`, material/depth maps | New supported looks load lazily. Costumes retain their own legacy art. Actions bypass new walking art; stop/release restores original texture, frame and scale. Frame geometry is shared. | `player-authored-directions.test.mjs`; existing direction/side-walk/view tests |
| `player-control.js`, `village-game.js` | Actual collision-resolved travel, current camera, existing input system | Owners use one full eight-phase cycle per 1.8 world units. Wall collisions do not advance feet; turning the camera does not restart the cycle. Bindings and movement speed remain unchanged. | `player-direction-motion.test.mjs`; browser walking/camera checks |
| `owner-walk-motion.js`, `scene.js` | Autonomous farm routes and the active camera | Farm helpers use actual travel, not just target intent. Only owners with the sprite adapter receive directional calls. Release runs once when they stop. | `owner-walk-motion.test.mjs`; farm chore walk check |
| `places.js` | Autonomous house walkers, direct-control ownership, resting poses | House walkers pass travel to the same adapter. Controlled/resting owners are excluded. On room clear, actor-owned materials are disposed separately from cached atlas geometry. | `room-owner-atlas-lifetime.test.mjs`; repeated enter/leave and sitting checks |
| `village-sprite-actors.js`, `village-sprite-math.js` | Original neighbour performances and optional new direction sheets | One cached atlas per used character. The same mesh swaps geometry/material/depth maps. Idle, talk and wave use existing art when new coverage is absent; a load failure retains original art. | `village-directional-runtime.test.mjs`; existing village asset tests |
| `village-folk.js` | Existing resident routines, camera and actual position delta | World heading and travelled distance survive turns/stops and cast-style switches. Resident paths and save data remain unchanged. | `village-resident-life.test.mjs`; diagnostics expose atlas/direction/phase |

## Lifetime and rendering rules

- Keep cached atlas geometry and textures alive when an individual actor or room is removed. Dispose the actor's private materials through its existing disposer. Voxel owners still own and release their geometry.
- Preserve the existing billboard lean/pitch compensation. New owner art is scaled to the original front sprite's measured stature; legacy turnarounds retain their existing view corrections.
- `animateSprite` followed immediately by the directional adapter is synchronous. The adapter restores the matching geometry/map before rendering; do not split those calls across a frame or asynchronous boundary.
- Do not pass autonomous travel into visitor, pet, seated or interaction animation paths.
- Lazy decode limits initial texture residency; it does not remove inline asset bytes from the offline HTML. Used atlases remain cached. Review decoded texture memory, not only compressed WebP size, before expanding every costume.

## Integration checks

Run the affected tests above, then the full suite and build. Browser review must cover both owners, diagonals and back views, camera rotation, stopping/restarting, wardrobe changes, watering, home sitting/reading, repeated room changes, village movement and a missing-sheet fallback. Confirm actors remain the same perceived size beside furniture and neighbours. Automated silhouette tests establish changed artwork and bounds; they cannot certify anatomical footfalls or identity consistency.

The contractor patch does not change PS5 mappings, twin-stick controls, Fold/TV layout, save migration or economic balance. Physical Fold/Bluetooth behaviour still requires device testing.
