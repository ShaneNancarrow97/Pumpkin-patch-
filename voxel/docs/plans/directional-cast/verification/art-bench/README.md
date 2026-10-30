# Actual offline art bench verification

Run from the repository root after building the reviewed manifest:

```sh
node voxel/tools/qa-directional-review.mjs \
  --html /workspace/Pumpkin-Patch-Directional-Art-Review.html \
  --shots voxel/docs/plans/directional-cast/verification/art-bench
```

This is Canvas2D-only browser verification; the main game's WebGL, tool attachment, palette and texture-cache behaviour have separate checks. Managed Chromium blocks `file://` navigation, so this run serves the **unchanged standalone HTML bytes** through localhost and aborts all requests to other origins. The resulting file still embeds every atlas. The report records its SHA-256, transport, console/page errors and external requests.

The actual file covers Shane and Natalie's **base looks**. Each has 24 neutral nominal bearings and 6 accepted walking bearings. The full costume/action production matrix remains incomplete. Assertions check exact idle selection, actual decoded canvas pixels for each listed walking/gesture phase, real frame counts and distinct rendered pixels, hand-socket metadata, strict missing states, explicit nearest-view fallback and honest coverage labels. They also check 44 px control targets and page-width fit at 390 × 844, 874 × 787 and 844 × 390.

`*-24-bearings.png` contains crops from the bench's actual canvas at all 24 neutral directions. `*-side-walk-onion.png` overlays the previous walking frame. `*-water-hand-socket.png` adds a QA-only marker at the recorded attachment point; it does **not** claim to show the game's rendered watering-can prop. Desktop, phone, Fold and landscape screenshots show the real control surface. `checks.json` holds assertions and rendered-frame records; per-look coverage JSON lists full/reduced cycles and remaining production gaps.

Visual review found complete silhouettes with no clipped hair or shoes in the neutral contact sheets. Painted turn steps are visibly approximate and sometimes close together; they are **nominal 15° slots, not measured 3D rotations**. Distinct hashes and declared phase names cannot establish anatomical correctness, recognisable likeness, exact camera angles or smooth gait. Human review of the source cycles, onion skins and gameplay remains necessary. The source/animation agents' visual reviews and the runtime verification are complementary to this report.
