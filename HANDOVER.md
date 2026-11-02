# Claude handover · Mothlight full game

The user asked to apply the witchy ledger design to the actual game and provide
its HTML immediately. This folder supplies a complete game build with the visual
skin, independently of the earlier Festival lab.

## Completed

- Scoped parchment menus with mulberry book edges, faint moth/pressed-botanical
  marginalia and handwritten decorative notes.
- Manage hub, standard sheets, upgrades, wardrobe, house, shop/cocoa/kitchen
  surfaces, settings and milestone surfaces share the palette.
- Gameplay HUD/dock retain their compact dark surfaces. Normal world play stays
  unobstructed; menus keep their existing dimensions, scrolling and callbacks.
- Prices, stock and actionable labels keep DM Sans/Fraunces. Caveat is used only
  for decorative annotations. Font and original SVGs ship inline for offline use.
- The wrapper asserts exact equality of the compiled game script before/after
  styling. Save key, data schema, economics, visitor simulation, assets and
  controls come directly from the existing lead.

## Pickup

Branch: `contractor/mothlight-game-ui`, based on
`f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`.
The diff adds only this folder. Nothing from the older contractor branches must
be merged for this edition. Build using `tools/build-game.mjs` as documented in
README. The output `.build.json` records its hash and unchanged runtime proof.

For permanent lead adoption, add the CSS after `ui/menus.css` and inline the
three `mothlight:` asset placeholders as the wrapper does. Set
`mothlight-game` on the body. Do not register new rules or change a save version;
this is a visual layer. Keep `OFL-Caveat.txt` with source distributions and its
license copy with the embedded font.

## Checks and limits

`tools/qa-game.mjs` checks the actual WebGL game, real menu navigation and
phone/unfolded/desktop layouts. Its report/screenshots live in `verification/`.
It does not turn the Festival lab into a game feature or claim a physical Fold 7
or Bluetooth-device test. Hold-to-buy and controller focus remain native.

Use `DEPENDENCIES.md` before changing selectors, sheet positioning or service
menus. The rendered menu still relies on the lead's world-menu/pad-menu rules.
