# Final shared-exit visual and pointer delta

**10/10 checks passed** on exact standalone HTML SHA-256 `9314af490ecceb32d030b6ac57772927a15013790f910146ff27ccaf0d54ce17`, with zero browser/shader errors and zero external asset requests. Chromium was closed after completion.

The final delta moves four authored canopies and preserves a narrow projected window through procedural crowns/hill columns over the existing public exit. It retains the ground, exit coordinates and travel rules. The [preceding D72 report](../shared-exit/README.md) owns the separate **24/24** base/kitchen/expanded functional checks; those results are not relabelled as tests of this final hash. Earlier 57/17/54 evidence remains attached to the older bc7d34a0 release.

This exact final build rechecks actual pointer raycasts, owner approach before entry, and visible Farm returns with at least five continuing frames, restored owner and farm music, on both base and expanded layouts. No direct village-open command is used. Functional phases hold only renderer/composer draw methods, with real RAF, physics, simulation and UI handlers continuing.

## Normal-render visual review

All three images use normal glow and shadows and were inspected:

- [Base shared road](01-base-shared-road.png): the canopy now leaves the existing cobble exit and grounded signpost visible. The board lettering is small at management zoom; the root accepted the subtle physical waymark, with the close play prompt and Village hotbar supporting discovery.
- [Expanded shared road](02-expanded-shared-road.png): the road beneath Maisie's truck continues through a clear forest opening, with ground retained and no added portal or separate spur.
- [Phone endpoint](03-phone-shared-road.png): the portrait resize settles before camera focus, so the photo correctly shows the clear road endpoint and signpost. This corrects the predecessor photo's QA staging race.

## Reproduction and limits

```sh
SHARED_EXIT_VISUAL_DELTA=1 \
SHARED_EXIT_EXPECTED_SHA=9314af490ecceb32d030b6ac57772927a15013790f910146ff27ccaf0d54ce17 \
CHROMIUM_PATH=/usr/bin/chromium node tools/village-shared-exit-qa.mjs \
/workspace/Pumpkin-Patch-Village-Play-Polish-Shared-Exit-Final.html \
docs/contractor-patches/village-play-polish/verification/shared-exit-final
```

The standalone HTML is served unchanged over loopback. Declared level-20, finished-tour saves provide base and expanded fixtures; progression was not earned in play. Phone viewport emulation and software WebGL do not certify physical Fold, Bluetooth controller or hardware performance. See [shared-exit-report.json](shared-exit-report.json) for exact source/build hashes, fixture plans and individual checks. No runtime edits were made by QA.
