# Verification — directional character sheets

The exact playable HTML is `Pumpkin-Patch-Directional-Characters.html`, SHA256 `392db73e5daeee1b2c23687e4ea946bce41a7018ab93ca407a182b9944b7c8de`. Browser tools served those unchanged standalone bytes over loopback because this managed browser blocks local file URLs. No external asset requests were made by the directional run.

- Full Node suite: **146 passed, 0 failed** (`node-suite.txt`). The last Opal head-proportion artwork correction was followed by a fresh asset integrity suite (`final-asset-check.txt`); production runtime was unchanged after the full suite.
- Directional game checks: **60 passed**, no page errors (`game/directional-game-report.json`). Covers keyboard movement, the real movement adapter in eight headings, distinct frame geometries, stature, camera-relative turning without phase restart, boundary stops, watering, legacy Jason art, house transitions and village routes.
- Standard existing desktop/phone smoke: **54 passed**, no page errors (`smoke.txt`). Includes intro, planting/harvesting, menus, sprite/voxel switching, garden and rooms, furniture tools, indoor shop arrivals, wardrobe, storage and visitor walking.
- Standalone sprite reviewer: **4 passed**, no page errors or external requests (`sprite-preview.json`). All eleven embedded atlases decode; direction, pause and frame scrub work; full contact-sheet downloads are embedded; 390px portrait has no horizontal overflow.
- Source patch one was applied in a clean parent worktree and rebuilt byte-for-byte (`patch-apply.json`). The final patch kit also carries a receipt for replaying the complete two-patch series.

## What the pictures demonstrate

Nine game screenshots show actual rendered characters. Poses are explicitly labelled when staged through the sprite adapter. Village route checks accelerate the existing simulation; owner approaches use a mocked standard controller through the real collision adapter. These are not physical-controller tests. The final resident-photo retake uses a surveyed camera away from occluding tree canopy and lamps; `game/directional-resident-photo-report.json` preserves that method separately from the full 60-check report.

The automated checks establish asset coverage, distinct geometry, bounds, movement selection and regression behaviour. Visual review inspected the painted direction rows and opposite front footfalls, including repaired contact/passing poses. Coats and skirts obscure some side/rear leg ownership; generated views have small facial and clothing variations. This is not anatomical rig certification.

Viewport tests emulate Fold and phone dimensions. Physical Z Fold 7 hardware, Bluetooth PS5 pairing, TV casting, thermal performance and maximum texture-memory load were not measured. The original costume, tool, idle and pet sheets remain intentionally in use where this movement pack has no coverage.
