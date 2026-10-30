# Base-owner working actions

This is a reviewed painted-art batch for Shane and Natalie. It adds **12 distinct poses per owner**: six front-view planting poses and six right-profile watering poses. It does not supply other actions, other bearings, or costumes. Unsupported combinations must keep their existing art.

The source is the approved game portrait for each owner (`../shane/approved-front.png`, `../natalie/approved-front-seed.png`). Each twelve-cell sheet was edited in one image-generation request so the face, costume and body proportions remain related across the action. No action phase or direction was manufactured by mirroring or rotating a flat cut-out.

| Owner | Plant | Water | Runtime page | Encoded bytes |
| --- | --- | --- | --- | --- |
| Shane | Front, 6 poses | Right profile, 6 poses | `assets/directional/actions/shane-actions.webp` | 198,494 |
| Natalie | Front, 6 poses | Right profile, 6 poses | `assets/directional/actions/natalie-actions.webp` | 195,464 |

Angles follow the directional contract: 0° faces the camera and 90° faces screen-right. These are painted views, not measured camera projections of a 3D rig.

## Read and integrate

`assets/directional/actions/shane.json` and `natalie.json` follow the base atlas's raw format. Merge their `pages` and `actions` into the corresponding base look before building the reviewed manifest. Page identifiers are owner-specific to avoid collisions.

Every cell is 256 × 400 pixels, with a shared foot anchor at (128,390). The standing reference density is 320 rows for Shane and 300 for Natalie, each representing 2.3 world units. A squat remains shorter: there is **one aspect-preserving scale per six-pose action**, measured from its upright poses. No crouching phase is individually stretched to standing height.

Planting reads as upright → reach → crouch → touch soil → rise → upright. Watering reads as relaxed → lift hands → extend arms → pour → recover → lower hands. Both hands are empty in the art; the existing separate watering-can sprite supplies the tool.

Watering frames include `sockets.hand` in local cell pixels. These landmarks were placed on the visible gripping hand and checked against source alpha. The runtime should attach its existing illustrated can's **handle origin** to this socket. Do not attach the can's image centre there. Retain in-game verification of handle alignment and stream position before enabling the new watering clip.

## Review and reproduction

The preview JPEGs show all poses at a fixed scale, a shared ground baseline, and pink hand-socket marks. The four GIFs play each action. The marks and baseline are review aids only; they are absent from runtime WebP pages.

Run from the repository root:

```sh
python3 voxel/tools/bake_directional_actions.py
```

Dependencies are Pillow, NumPy and SciPy. The baker only identifies the twelve isolated source figures, removes the very faint empty-space alpha halo, preserves a two-pixel antialias fringe, crops, scales and packs. It does not paint, warp, interpolate, duplicate, mirror or rotate artwork. Source PNGs remain here for review and later costume edits.

`*-measurements.json` records the source bounds, shared scale, source foot anchor, visible silhouette height, sockets and RGBA fingerprint for every pose. Standing source heights differ a little between the two facing directions; each six-frame action uses its own upright reference to maintain the same game stature.

Manual source/packed-sheet review confirms the crouches are visibly lower, feet stay on the shared baseline, faces/costumes remain recognisable and the watering arms articulate through distinct positions. In-engine comparison with the final turnarounds and illustrated can remains the integrating reviewer's check; this folder does not claim that browser verification has already happened.

## Remaining production

These two actions at two bearings are a small part of the complete owner-action matrix. The other 22 planting/watering bearings, all non-base costumes, front/left/back watering, harvest, cleaning, furniture interactions and the other requested actions still need authored whole-strip art and the same review. Keep those gaps visible in the coverage manifest.
