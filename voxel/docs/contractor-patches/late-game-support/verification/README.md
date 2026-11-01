# Verification scope

The six native contractor test files pass without failures or skips; see
`native-tests.txt`. They cover content/catalogue compatibility, art dimensions
and hashes, actual model matrices/bounds and resource ownership, rule-audit
conservation/repeatability, cross-part IDs and isolated preview builds.

The exact offline workshop passed **139 browser assertions**, with no page errors
or external requests. `preview/checks.json` records its HTML hash, relevant input
hashes, individual results, model/resource measurements and screenshot list.
`preview-log.txt` is the readable execution log.

Coverage includes:

- Three actual voxel models rendered from front, side and back, with distinct
  visible pixels. Root also inspected the recorded model and layout images.
- Pointer orbit, real two-pointer touch pinch, zoom, common reset framing,
  opt-in auto-turn and a stopped reduced-motion default.
- Repeated model switches with instrumented WebGL buffer ownership, not merely
  a count of renderer geometries. One model remains active at a time.
- All night briefs, their actual goal text, model/brief links and explicit
  proposal labels. No event engine or live completion claim is tested.
- All 18 capacity cases and an audit JSON download equal to the captured source.
- 390 × 844 phone, 874 × 787 unfolded-style and 844 × 390 landscape layouts:
  no page-width overflow, overlapping controls or undersized touch targets.
  Selected cards remain visible in the narrow scrollable catalogue.
- Real `WEBGL_lose_context` fallback and restoration, plus the `?no3d` painted
  fallback with still-functional evidence controls.
- No game save created. External requests are blocked and reported.

Twenty-one screenshots accompany the final run. Any screenshots from failed
intermediate runs have been excluded. `checks.json` identifies the verified
HTML, not an earlier failed version.

The production build was rebuilt separately and matches the previous delivered
game byte for byte:

```text
7909eb960ab10ed9aa6b2cc7cac35a081f8a02e5817ab918b9e62ebfd66e652a
```

The delivery's `delivery.json` and `REBUILD-VERIFICATION.json` add final committed
source, folder-only patch application, clean rebuild and ZIP hashes. Those
records live alongside the download artifacts so their source-commit reference
does not create a self-referential hash inside this folder.

These are browser viewport emulations using Chromium software WebGL. They do
not verify physical Z Fold 7 GPU, OS file handlers, Bluetooth or fullscreen
behaviour. Exact self-contained HTML bytes were served over temporary localhost
with no network assets; the preview still embeds its code and icons for offline
downloaded use. No whole-game playtest was repeated because the live game is
unchanged, and no Festival Night timing/whole-farm profit claim is validated.
