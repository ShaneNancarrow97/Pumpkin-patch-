# Claude handover: contractor refinement pass

This small follow-up sits after `18ca059` on `contractor/festival-meadow`. It refines the Moonbrew Meadow, Sandy and guest-inspector additions. The gameplay/balance contract remains in [07](07-festival-meadow-and-customer-care.md) and [08](08-sandy-menu-guests-and-exit.md); cooking remains the future plan in [09](09-cooking-and-twenty-level-roadmap.md).

## Completed fixes

- During tea break, plain price buttons, special-price selectors, stand open/closed and automatic-supply switches now disable. Their rules already refused changes; the menus now accurately show that state. A rejected stale selector event also restores the real stored price rather than displaying an unsaved selection.
- The guest inspector gains `clear()`. The main UI calls it on entering a room, entering the shop, returning outdoors and pressing Escape. A visitor card cannot follow the player into another location or reappear on returning. Temporary menu hiding still allows the same card to resume where appropriate.
- The stand emits steam when **any drink** is stocked, including flake-only or sauce-only stock. Closed stands and snack-only stock do not emit steam.
- “Plain cups in stock” and “Plain cocoa price” distinguish the basic supply from premium products. The sauce drink is called **Midnight sauce cocoa**, matching its recipe and prop; its stable `midnight` ID, saved data and price range are unchanged.

## Integration

Port the small `guestCard.clear()` calls in `main.js` around your existing location/keyboard logic. The remaining changes are inside the contractor modules (`ui/guest-card.js`, `ui/festival-meadow-sheet.js`, `rules/cocoa-menu.js`, `festival-meadow-world.js`) and one scoped disabled-selector CSS rule. Keep your unpublished building, portrait, placement and visitor-balancing work.

This pass adds no save fields, dependencies, costs, unlock gates or currency rules. Schema stays 7. All art, stock and premium-product IDs remain compatible with the previous contractor commit.

## Verification

`test/guest-card.test.mjs` checks live cash/needs, transient hiding, explicit clearing, close-button behaviour and visitor departure. The native-art suite now exercises real steam visibility against each drink and the closed/snack-only cases. `tools/qa-festival-refinement.mjs` checks paused and resumed controls, a rejected stale change event, phone/Fold/landscape touch sizes, actual guest picking, Escape and building transitions, with page-error reporting.

Run from the repo root:

```sh
npm --prefix voxel test
node voxel/build.mjs --out /path/to/game.html
CHROMIUM_PATH=/path/to/chromium node voxel/tools/qa-festival-refinement.mjs --html /path/to/game.html --shots /path/to/refinement-qa
```

See the [delivery QA record](../contractor-patches/festival-meadow/QA.md) for the recorded results and the distinction between the full regression build and the final refinement checks.
