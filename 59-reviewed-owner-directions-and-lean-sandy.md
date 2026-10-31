# 59 — Reviewed owner directions and lean Sandy

Contractor branch: `contractor/directional-character-atlases`.
Review base: `b387c85da592ed310dad5838ea7668c45fc0899a` on `voxel-reference`.

This is a separate art/runtime patch for Claude to inspect. It does not merge or
replace the lead checkout. If the lead has moved, review the shared scene,
places, direct-control and pose integration against that newer work. Do not
reset the lead's private changes. The root 2D game is untouched.

## What changes in play

Shane and Natalie's everyday looks get full neutral turnarounds at 24 nominal
painted bearings. Their accepted walking strips alternate the leading foot and
arm instead of padding a sheet with the same leading leg. A six-pose planting
gesture and six-pose right-profile watering gesture are included for each owner.
Watering keeps the existing separate illustrated can, now attached by its handle
to a hand landmark in each accepted frame. Both direct play and autonomous
pottering use the new pages when available.

The standing body remains 2.3 world units high. Static views share a standing
height; each animated strip uses one aspect-preserving scale, so crouches remain
lower and walking retains its small natural bob. Frame cells are 256×400 with
the same (128,390) foot anchor. Individual walk/crouch phases are not independently
stretched to standing height. Owner faces are not mirrored to invent directions.

Sandy is redrawn with a long, lean tan body, narrow waist and short legs. Her
home canvas width is 1.45 instead of 2.05, and her cocoa-service canvas width is
1.8 instead of 2.6. The house atlas preserves Skyla and Maisie's decoded pixels
exactly. Cocoa idle, blink, paw-service and the separate bell share an anchor.

## This is an explicit production batch, not the whole animation brief

`docs/plans/directional-cast/PRODUCTION.md` enumerates all 20 existing wardrobe
looks and the complete 24-bearing, 13-action target. The generated
`coverage.json` in the contractor verification folder is the authoritative
snapshot of accepted clips, reduced cycles, static poses and remaining gaps.

The neutral turnarounds are one pose per bearing, not four-frame breathing
cycles. Some walking strips contain four genuine contact/passing phases and are
marked `mode: 'reduced'`; they are not counted as complete eight-phase cycles.
The rear-diagonal candidates that kept the same leg forward are excluded.
Nearest-bearing fallback is labelled internally and never counted as authored
coverage. Angles on painted sources are nominal artist assignments, not measured
15-degree camera projections from a 3D rig.

| Look | Neutral poses | Full8 walk bearings | Reduced4 walk bearings | Working gestures |
| --- | --- | --- | --- | --- |
| Shane base | All24 bearings | 0°,90°,180° | 45°,270°,315° | Plant0°/Water90°,6 poses each |
| Natalie base | All24 bearings | 0°,180° | 45°,90°,270°,315° | Plant0°/Water90°,6 poses each |

That is **140 accepted owner frames in64 clips on16 WebP pages**, totaling
2,145,142 encoded bytes. Those file bytes are distinct from decoded GPU memory;
the largest individual page is9,830,400 RGBA bytes before mipmaps.

Other costumes, wheelchair push cycles, the other action bearings and the full
pet turnaround/gait set remain production work. Their existing playable art
stays available. Sandy's two-pose house walk is not a complete alternating gait.
See each art folder's README for accepted/rejected source lists and measurements.

## Runtime and lifecycle

- `src/content/directional-atlas.js` validates reviewed pages and compiles
  immutable per-action angle lookups once. Selection does not scan/revalidate
  the atlas per frame. Duplicated frames/sequences cannot establish coverage.
- `assets/directional/manifest.json` indexes only reviewed runtime WebPs.
  `src/directional-pages.js` contains explicit imports for the offline build.
- `src/player-directional-atlas.js` decodes pages on demand, retains at most four
  resident textures, and protects pages used by visible owner models. A movement
  page switches atomically after decoding; the previous valid body stays visible
  while it loads. Working-action gaps use the legacy action.
- Camera-relative heading is calculated before selecting a bearing. An owner
  with a new neutral pose keeps facing its world heading while standing; the
  unchanged legacy bank can still use handover55's settle/front compensation.
- Autonomous movement uses distance-based gait phase and the same accepted bank.
  Hidden farm/garden owners release their page leases. Room clear disposes owner
  materials and leases; changing a model/place or leaving direct play releases
  the previous controlled presentation.
- `reviewedAction` distinguishes the old petting crouch's borrowed planting pose
  from real planting art, so petting never selects a planting animation by mistake.
- Recolours are cached separately. All alpha/depth layers change atlas together.
  `scene.directionalArtStatus` reports loaded pages, leases, bytes and errors.

Wardrobe IDs, purchases, save format/version14, economy, progression, routes,
furniture, carving and controller bindings are unchanged.

## Inspect and reproduce

```sh
python3 voxel/tools/bake_shane_directional.py
python3 voxel/tools/bake_natalie_directional.py
python3 voxel/tools/bake_directional_actions.py
python3 voxel/tools/bake_sandy_lean.py
# Visually review the sources and fixed-scale previews before indexing:
python3 voxel/tools/index_directional_assets.py --reviewed
node voxel/tools/directional-coverage.mjs --out /tmp/directional-coverage.json
node voxel/tools/build-directional-review.mjs --out /tmp/directional-review.html
node voxel/build.mjs --out /tmp/pumpkin-patch-directional.html
```

Preparation uses Pillow/NumPy/SciPy; the game and native tests do not. The bakers
crop, remove empty background alpha, normalize and pack authored art. They do
not paint new limbs, interpolate new views or manufacture gait phases. The
accepted source lists exclude rejected candidates even when those files are
present. Source PNGs/GIFs remain on the source branch; only WebPs are bundled.

The separate offline Canvas2D review HTML exposes angle selection, real frame
counts, stepping, onion skin, a foot baseline and an honest full production grid.
Strict authored selection is the default; nearest fallback must be enabled.
It is an art review tool, not the game and not evidence of geometric accuracy.

## Verification and pickup

Read `docs/contractor-patches/directional-cast/README.md` and its verification
folder for exact build hashes and results. The offline game ZIP and art review
HTML are on the separate artifact branch; do not merge that download branch into
source. The small binary patch includes runtime files, tests, handover and the
small referenced approved seeds; larger source generations remain on this source
branch and are needed before rerunning the bakers.

Native tests validate contracts, actual WebP dimensions/bounds/file hashes,
catalogue ownership and page budgets. Browser checks exercise the exact offline
HTML, real movement bearings, all20 legacy looks, house/can rendering and
responsive layouts. Screenshots and source contact sheets supply visual review;
pixel hashes alone do not prove correct limb anatomy. Software WebGL and viewport
emulation do not verify physical Fold7 performance or Bluetooth hardware.
