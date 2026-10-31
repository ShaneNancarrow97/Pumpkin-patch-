# Verified contractor snapshot

Runtime: `daf6d2b2d69f618d1d3c58c51f8d4e962bcc7778`.
Subsequent verification/handover commits do not change the bundled runtime.

| Check | Result | Evidence |
| --- | --- | --- |
| Native suite | 105 files pass, no failures/skips | `native-tests.txt` |
| Exact final offline game | 44 checks pass, no page errors or external assets | `browser/checks.json`, screenshots |
| Actual hayride menu harness | 111 checks pass, all12 icons/purchases/mobile layouts | `docs/plans/hayride-upgrade-icons/verification/` |
| Offline sprite bench | 235 checks pass across140 authored owner frames | `docs/plans/directional-cast/verification/art-bench/` |
| Standard desktop/phone regression smoke | 52 checks pass in final runtime CI | `smoke.txt`, `smoke-origin.json` |
| GitHub CI | Both check and voxel jobs pass | `ci.json` |

CI: https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/41208388922

`summary.json` pins the reviewed game hash. The main browser report identifies
the exact final standalone game. The icon harness imports the real menu,
purchase rules, index shell and styles without a 3D world; it has its own fixture
hash and142 repository-source hashes. Its checks are kept separate from the
game's44 checks. The Canvas2D art bench likewise has an independent HTML hash.

The normalized smoke log comes from the successful voxel CI job for the runtime
above. Only GitHub's timestamp/job prefixes were removed; the origin file pins
the raw and normalized hashes. CI runs the standard downloaded-file smoke test.
Managed local Chromium blocks file URLs, so local browser checks served the
unchanged offline HTML over localhost and monitored external requests.

Screenshots verify scale/appearance and source contact sheets verify limb
motion. Pixel hashes alone cannot prove correct anatomy or exact15° geometry.
The painted directions remain nominal; unapproved rear-diagonal walks and the
other costume/action views remain production gaps. Some gaits are explicitly
four-phase reduced cycles, and the neutral views are single poses.

Viewport/software-WebGL checks do not verify physical Fold7 GPU performance,
Bluetooth pairing, Safari hardware or OS fullscreen behavior. No test balance,
unlock or inventory fixture is baked into the delivered game.

The artifact delivery manifest records the final committed-source and actually
applied-patch rebuild equality, packaged asset checks and archive hashes. The
separate `hayride-icons-only-from-b387c85.patch` was also checked against an
isolated index at the declared review base, without changing the lead checkout.
