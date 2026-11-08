# Mothlight Green contractor release — 8 November 2026

The full game now reaches the saved village introduction, gathering and Rowan's stall. This fixes the level-four requirement that previously had no playable travel route. Nine painted NPC identities and compact village interfaces build on Claude's existing valley and three interiors.

## Source and integration

- Branch: `contractor/village-design-and-cast`.
- Base: `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`, still the remote `voxel-reference` head when checked on 8 November.
- `dffa38f`: nine cast sheets, reproducible baker, source/provenance, metadata, pixel checks and the CI Pillow dependency.
- `e9e60a9`: saved Green journey, scene/input adapters, compact menus, cast rendering, navigation, window details, bounded conservatory glow and farm-overlay isolation.
- The following documentation commit contains the final reports, screenshots and QA tools; it changes no runtime output.

Read [DEPENDENCIES.md](DEPENDENCIES.md) before merging. The shared hunks are in `main.js`, `scene.js`, `build.mjs`, More and village view/folk. Use a clean integration worktree, preserve unpublished lead work and inspect any later changes in those files. Original root-game content, farm economic rules and save format are unchanged. Do not reapply the old home contractor branch: that work is already in the lead.

## Downloads

Artifact branch: `contractor/mothlight-green-html`, immutable build commit `3d701467d68c6383da47815d3ebe40c70eac1a68`.

- [Full game ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/3d701467d68c6383da47815d3ebe40c70eac1a68/Pumpkin-Patch-Mothlight.zip): extract and open its HTML.
- [Full game HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/3d701467d68c6383da47815d3ebe40c70eac1a68/Pumpkin-Patch-Mothlight.html).
- [Separate unsaved explorer](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/3d701467d68c6383da47815d3ebe40c70eac1a68/Mothlight-Village-Explorer.html).

| File | Bytes | SHA256 |
| --- | ---: | --- |
| Full game HTML | 41,306,095 | `1dc758ae753244335539f4a57a19d2cbe31932a0f5874914591e064b4f82102f` |
| Full game ZIP | 29,595,397 | `8aace02dc360c363ec23b1c97f571d5957d68bceaa4a7f0f9c0a15cc814bde9c` |
| Explorer HTML | 20,029,825 | `3972f586706fd56998fbbb527a491834e07b69f13802cdb51271804de022e710` |

Both full-game downloads returned HTTP 200 and matched the local hashes when streamed back from GitHub; see [downloads.json](verification/downloads.json). ZIP integrity passes. Every game asset is inlined. The ZIP contains one playable HTML and its short README; the explorer is separate so preview switches cannot be confused with farm progression. A browser that treats a new file location separately can transfer an existing farm through the game's Save file / Load file controls; no reset is required.

## Verified behaviour

| Check | Result / evidence |
| --- | --- |
| Final unit suite | 130/130 test files pass; [log](verification/unit-tests.log) |
| Focused bridge/navigation/window checks | 3/3 test files pass after the final refinements; [log](verification/refinement-tests.log) |
| Full saved game | 55/55 browser checks, 15 screenshots, no page/console errors or external asset requests; [report](verification/game/village-game-report.json), [visual review](verification/game/REVIEW.md) |
| Final explorer | 60/60 browser checks, 21 screenshots, no page/console errors or external asset requests; [report](verification/final/village-design-report.json), [visual review](verification/final/REVIEW.md) |
| Original explorer baseline | 11 checks, 10 screenshots; [baseline review](verification/baseline/REVIEW.md) |
| Existing farm smoke | 54/54 checks pass (27 desktop, 27 phone), exit 0; [log](verification/farm-smoke.log). Uses the same full-game HTML, software WebGL and `SMOKE_LITE=1` for broad farm UI checks; village screenshot runs retain normal glow. |

The saved-game fixture is declared before boot: level three, £500 and a prior home visit. Afterwards the real UI starts conversations and quests, hands over materials/coins and buys the quoted stool; world-pick handlers gather resources and stage the existing halls. The introduction pays £150 once, the bench pays £60 with its normal friendship gifts, the stall costs £200 and the stool £60. The remaining £450 and quest/purchase claims survive farm return, reload and re-entry. House, garden, wardrobe, stock and helping hands remain unchanged. The introduction satisfies the actual level-four requirement.

The pixel checks decode the shipped WebP files, verify source/runtime hashes and transparent bounds, and compare lower-body silhouettes between contacts. The nine strips total 1,224,842 bytes. Each has six authored poses, a common `(128,300)` foot anchor and one scale across its strip; world height is 2.3 units. Cinder glides on a ghost tail. Full-size source PNGs are excluded from runtime imports. See [art provenance](../../../assets/village-cast-concepts/ART-PROVENANCE.md).

## Reproduce

```sh
cd voxel
npm test
node build.mjs --out /tmp/Pumpkin-Patch-Mothlight.html
node build.mjs --village --out /tmp/Mothlight-Village-Explorer.html
node tools/village-game-qa.mjs /tmp/Pumpkin-Patch-Mothlight.html
node tools/village-design-qa.mjs /tmp/Mothlight-Village-Explorer.html /tmp/mothlight-visual-qa --final
```

The browser tools serve their HTML over loopback and use `/usr/bin/chromium` unless `CHROMIUM_PATH` is set. The existing `npm run smoke` takes `GAME_URL` for a served build; alternatively build its default `dist/pumpkin-patch-voxel.html` first. The baker requires Pillow; CI now installs it. Re-baking the checked-in raw sheets was independently byte-identical across all twelve generated outputs.

## Boundaries and next work

Only the Green has complete playable friendship content. The six later residents have art/profiles but their districts stay closed in saved gameplay. Nine walking strips do not constitute autonomous schedules, rear/360° views or quest-following routes. Vesper remains a host without an invented friendship track.

The next contractor slice should expose village decorating and the almanac, so earned village decor has an immediate use and daily duties form a repeatable loop. Then verify longer restoration chains and purposeful neighbour routes before opening the Copse. Follow [ROADMAP.md](ROADMAP.md); model functions alone are not a finished player interface.

The browser runs emulate 1280×800, 390×844, 844×390 and 900×840. Controller adapters also have synthetic input tests. These establish behaviour/layout, not physical Fold frame rate, TV hardware or Bluetooth certification. The fixed eight-light village pool is unchanged; no extra renderer or simulation update loop was introduced.
