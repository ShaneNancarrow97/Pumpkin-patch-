# Shane: reviewed base direction art

This batch expands **Shane's base look only**. The full costume/action commission is
not complete. It contains 24 static nominal bearings and six walking bearings,
not 24 animated directions and not an animation set for each costume.

## Authored coverage

| Action | Bearings | Frames per bearing | Status |
| --- | --- | --- | --- |
| Neutral standing | 0, 15, …, 345 | 1 | Static pose, not breathing animation |
| Walk | 0, 90, 180 | 8 | Alternating contact/down/passing/up halves |
| Walk | 45, 270, 315 | 4 | Genuine contact/pass halves; `mode: reduced` |
| Walk | 135, 225 | 0 | Rejected; runtime may explicitly select nearest view |
| Working actions / costumes | All | 0 | Retain existing legacy art; production backlog |

Bearings are **artist-assigned nominal painted viewpoints**, not measured camera
angles from a rig. `0` faces the camera, `90` faces screen-right, `180` faces away,
and `270` faces screen-left. Adjacent painted attitudes can be close; do not call
these a geometrically exact 15-degree 3D turntable.

## Review and scale

- `approved-front-seed.png` is the existing in-game identity seed. Source edits
  preserve the black beanie, dark jacket over hoodie, cargo trousers, white-soled
  skate shoes, moustache and small goatee. The user's current photos informed the
  identity review; their conversation attachments are not stored here.
- Four whole six-pose quarter sheets produce the 24 neutral views. The old
  `quarters-preview.png` contact sheet arranges each quarter in a **3×2** block;
  use **`idle-sequential-review.jpg`** for the unambiguous chronological **6×4**
  runtime order. Its labels show actual slot assignments.
- Every cell is **256×400**, with foot anchor **(128, 390)**, standing silhouette
  **320 px**, and physical height **2.3 world units**. Idle silhouettes measure
  320–321 px after filtering. Each neutral view receives an aspect-preserving
  standing-scale adjustment; no view is horizontally mirrored.
- Every walk uses **one shared scale for its entire source strip**. Natural
  contact/pass bob is preserved. Visible height ranges and decoded-frame hashes
  are recorded in `metrics.json` and the runtime metadata. No phase is stretched
  independently and no walking phase is manufactured by rotating a flat image.
- `upperSilhouetteWidth` measures the width of the top 20% of the alpha mask.
  This is a useful drift flag, **not a head-height measurement**: front/profile
  widths vary naturally with perspective. Identity/proportion still needs visual
  review, especially when adding future costume pages.
- `walking-review.jpg` shows all accepted frames at one display scale;
  `walk-*-review.gif` previews the cycles. Four-frame sources are intentionally
  not doubled and reported as eight-frame animation.

## Gait decisions

Front and back whole eight-frame sources show opposite left/right shoes and arm
swing in their two halves. The accepted right-profile redraw similarly swaps the
foreground cargo-pocket leg and sleeve between contact frames 1 and 5. The left
four-phase source was assembled as a **pose guide** from whole-strip candidates,
then redrawn as one complete strip to unify face/costume rendering; its opposite
contacts and supporting feet remain distinct. The accepted front diagonals retain
that visible near/far swap. The left-facing reduced strips start on anatomical
right contact in the raw source; the baker rotates their phase order by two
frames to start on canonical left contact. This never mirrors the person.

Early `*-candidate.png` walking sheets repeated the same leading leg or changed
stride length without swapping limbs; those are under `rejected/` and are never
read by the baker. `rejected/idle-24*.png` also failed direction-order review and
are superseded by the quarter sources. Later nonaccepted attempts remain in the
workspace image-generation originals; they are not runtime inputs. Missing back
diagonal gaits are real gaps and must not be renamed as authored coverage.

## Rebuild

From the repository root, with Pillow, numpy and scipy installed:

```bash
python3 voxel/tools/bake_shane_directional.py
```

The explicit `ACCEPTED` source table controls inclusion; merely dropping a PNG
into this folder cannot enable it. Production WebP pages and metadata are under
`voxel/assets/directional/shane/`. Their seven pages total about 0.99 MB on disk;
the largest decoded page is 1536×1600 (9.375 MiB RGBA). Source PNGs/review images
are working art and must not be bundled into the playable HTML.

Root integration must still verify the authored views in the game, texture-page
residency, existing outfit fallback, home scale and palette handling. The offline
review bench labels exact, nearest, reduced and missing coverage explicitly.
