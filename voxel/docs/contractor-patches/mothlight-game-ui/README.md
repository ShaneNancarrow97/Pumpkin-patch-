# Mothlight · full game visual edition

This builds the actual complete Pumpkin Patch Voxel game with witchy ledger
menus: purple parchment pages, mulberry binding, moth and botanical margins and
handwritten notes. The farm remains visible during normal play. Prices, controls,
controller prompts and financial figures keep the regular readable game fonts.

```sh
node voxel/docs/contractor-patches/mothlight-game-ui/tools/build-game.mjs --out Pumpkin-Patch-Mothlight-Full-Game.html
```

Run from the repository root with the normal voxel dependencies installed. The
result is one offline HTML with the entire game and all assets embedded. The
wrapper first runs the ordinary game build, then injects only CSS and a body
class. It verifies that the compiled runtime script is byte-identical. There are
no added player-save fields, game rules, purchases or currency changes.

Reviewed game base: `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`.
Source branch: `contractor/mothlight-game-ui`.
All source additions are confined to this contractor folder. Claude can keep
using the wrapper with a newer lead, or incorporate `theme.css` at the end of the
standard stylesheet list with its assets inlined. Preserve unpublished work.

[Handover](HANDOVER.md) · [Dependency review](DEPENDENCIES.md).
Caveat is supplied under the included SIL Open Font License; a copy is embedded
inside the output HTML as well. Moth/botanical SVGs are original decorative art.
The separate Festival receipt lab is not imported into this game edition.

Normal menus retain purple parchment and clear cream type. Edge sparkles are subtle and switch off with reduced motion. The village expansion is [planned separately](../../plans/mothlight-village/ROADMAP.md); it is not part of this HTML build.
