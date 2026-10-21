# 24 — Axel, purchasable haunts and visitor terror

Contractor branch: `contractor/haunted-house-estate`. Lead developer: Claude. Review alongside handovers 25–26; no changes to the root 2D game.

## Delivered

Axel is the purple undead axolotl host, with a generated four-frame walking sheet, short desk patrol and occasional dialogue. Five purchasable native voxel installations appear in the actual foyer, with generated catalogue art:

| Haunt | Foyer tier | Price | Scare |
| --- | --- | --- | --- |
| Cobweb canopy | 1 | £180 | 12 |
| Whispering portraits | 2 | £500 | 15 |
| Spectral parade | 3 | £1,200 | 20 |
| Thunder chamber | 4 | £2,500 | 23 |
| Phantom finale | 5 | £5,200 | 25 |

Purchases enable their installation immediately. Owned installations can be switched off/on freely. Animated webs/spiders, portraits, ghosts, coils and a phantom arch stay clear of protected visitor routes. Geometry is cached by foyer tier; animation changes transforms, without per-frame rebuilds, extra point lights or flashing effects. Reduced motion keeps effects static.

`mazeScareRating` caps at 100. A prepared, open attraction gains up to 50% additional visitor demand. The existing frequency floors/crowd limits still apply. Nervous visitors can flee through the physical western gate at 1.7× walking speed and are removed without a pumpkin purchase. Some brave guests requeue once, using a new visit ID and a second real ticket from their existing wallet. At most two charged runs per farm visit. No prefab preserves the previous single-run behaviour.

The final visual review also separated the foyer’s raised wall panels and brass trim from the masonry. They previously shared coplanar faces, producing flickering gold stripes at sharp viewing angles.

## Integration

- Pure content/rules: `src/content/hollow-house.js`, `src/rules/hollow-house.js`.
- Native view: `src/maze-effects.js`, `src/foyer-view.js`, visible farm sign in `src/hollow-house-farm.js`.
- Sprite adapter: `src/special-sprites.js`, `src/special-sprite-meta.js`, `src/sprite-actors.js`; atlas `assets/maze-cast.png` is 4 columns×2rows (Axel first, Baron second), alpha-measured foot anchors/common row scale. `assets/maze-prefab-icons.png` is 3 × 2; first five cells follow catalogue order, last is Axel.
- `foyerStatus` exposes `host`, host frame, active haunts, scare rating and guest terror. Old `mortimer` pick/status/speech aliases remain for compatibility; player-facing host is Axel.
- New persistent fields: `hollowHouse.haunts.{owned,active}`, `runHome`, `repeatVisits`; unfinished visits retain terror, bravery, run/repeat count, purse and ticket receipt.
- `fledHome` is terminal: selling must remove the guest, not send them to Skyla. Main gate admission reserves space for guests inside the foyer/cocoa excursion so their return cannot exceed outdoor capacity.
- Ticket state, occupancy and income remain in one simulation, regardless of active scene. Do not run a second interior economy.

The property remains derelict and locked until level 6 purchase (£1,750), restoration (£2,500/90seconds) and explicit opening. Scare effects do not bypass preparation.

## Validation

`test/maze-haunts.test.mjs` exercises purchase/toggle/scare limits, real repeat-ticket accounting, fleeing, save restoration, VIP purses and expanded gates. Existing `hollow-house.test.mjs` and native `maze-effects.test.mjs` cover restoration/closing/occupancy and finite, cached effects. Browser evidence and final combined run are in the contractor verification directory.

This is a timed maze attraction with a customisable reception, not a walk-through maze-building editor.
