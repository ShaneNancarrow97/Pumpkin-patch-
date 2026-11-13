# Living Mothlight release receipt — 8 November 2026

## Commits for Claude

| Commit | Complete part |
| --- | --- |
| `a80cbf9` | Saved Green upgrades, quest requirements, targeted handovers, food/recipe fixes, conserving placement/Undo rules |
| `44ec6d6` | Painted resident routines and portraits, Moth Tree/plaza/restoration details, bounded moth/firefly atmosphere |
| `c07bcef` | Full-game journal/almanac/stall/satchel panels, decorating, Fold twin sticks, controller menus and TV scaling |
| `a9a8415` | Connected south-gate arch: removes floating black segments visible from the decorating camera |

Runtime source commit: `a9a84150aadf84eafcb71c5c56bc354a0bce3586`.

Runtime source tree: `18203904edd79829f499ebacde0c73f6a8431386`.

Previous contractor base: `e2cd697a993ae46d372420d7f966c1b99b5519ab`.

Claude's checked `voxel-reference`: `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`. It remained unchanged at the final pre-delivery fetch. The source branch is `contractor/mothlight-living-village`; the following documentation commit only records QA and handover tools.

## Playable full game

Artifacts are immutable at GitHub commit `ffbca45ef0fb1beae97ab56d78db5f0762860a4c`:

- [Full HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/ffbca45ef0fb1beae97ab56d78db5f0762860a4c/Pumpkin-Patch-Living-Mothlight.html)
- [HTML ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/ffbca45ef0fb1beae97ab56d78db5f0762860a4c/Pumpkin-Patch-Living-Mothlight.zip)
- [Claude patch kit](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/ffbca45ef0fb1beae97ab56d78db5f0762860a4c/Pumpkin-Patch-Living-Mothlight-Claude-Patch.zip)

The HTML is 48,455,659 bytes (about 46.2 MiB), SHA-256 `6cfd4e648a2f79ff499895f1957190a59fc3566415d98c9c4c214b94012fa9c8`. ZIP is about 33.2 MiB. Exact artifact metadata is in [verification/build.json](verification/build.json).

The patch ZIP includes **two alternatives**, not two sequential installs: four patches from the prior contractor base, or eleven patches from the checked Claude lead. Both were applied in a disposable checkout and produced the runtime tree above. Building the incremental replay reproduced the delivered HTML byte-for-byte. See [patch-apply.json](verification/patch-apply.json).

## Evidence

- `npm test`: **139 test files passed**, including existing save/cooking/house/farm coverage and the new progression, controls, resident, collision, geometry and panel tests. [Log](verification/node-suite.txt).
- Final gate/camera/label refinements: targeted village geometry, window and controller tests passed. [Log](verification/final-refinements.txt).
- [Full village journey](verification/game/village-living-report.json): **60 checks**, 10 captures, no browser errors or external asset requests. It exercises authored quest acceptance, both restorations, exact material/coin costs, upgrades, decorating, Undo across purchases, almanac duties, moving residents, two touch pointers, standard PS5 input, Fold/TV layouts and reload.
- [Final-build raycast/visual follow-up](verification/game/village-raycast-report.json): **8 checks**, 3 captures, no errors or external requests. Actual projected scene picking selects a placed stool; Cancel releases it; earned friendship costumes preserve previous ownership/equipped outfits; the final Moth Tree framing and connected arch are captured.
- [Control-specific browser report](verification/controls/report.json): six responsive profiles, concurrent thumbs, menu repeat/scroll/native controls, disconnect/blur, TV scaling and 44px touch targets. These checks use a focused UI fixture; the village journey covers integration.
- Standard desktop/phone farm regression: **54 checks passed**, no page errors. [Smoke log](verification/smoke.txt) and [captures](verification/smoke/).
- All three published downloads returned HTTP 200 and their complete streamed SHA-256 matched the build/patch metadata. [Download receipt](verification/downloads.json).

One QA assumption was corrected explicitly: restoring the village legitimately grants the Scarecrow/Bat Queen friendship costumes, so the whole wardrobe should not remain byte-identical. The journey report retains that original assertion under `harnessCorrections` and links the focused positive evidence: every old costume and both equipped outfits remain, while the authored new rewards are added. This was a test expectation error, not a removed gameplay failure.

The long journey ran immediately before the final cosmetic changes (tree framing, catalogue label, joined gate arch); its tested hash is recorded separately. The final-build raycast checks and farm smoke use the exact delivered HTML. No physical Bluetooth pairing, Z Fold hardware benchmark, casting or Safari local-file claim is made.

## Rendering cost and boundaries

Compared with the starting village, static polish plus the gate repair adds **478 voxel boxes**: Green **35,519**, restored homes **5,694**. Static mesh batches remain **37 / 2**. Atmosphere adds **2 draws, 70 instances / 840 triangles**; TV halves this to 35 / 420. No new scene lights, texture requests or per-frame mesh allocation.

The remaining districts, new resident quest lines, followers, interior activities and additional quest recordings are future work described in [ROADMAP.md](ROADMAP.md). The release makes Hollow Green's first loop playable; it does not silently unlock unfinished districts.
