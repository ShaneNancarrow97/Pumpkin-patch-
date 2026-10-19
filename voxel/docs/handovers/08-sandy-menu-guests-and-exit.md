# Claude handover: Sandy, cocoa menu, guest needs and the village exit

Branch: `contractor/festival-meadow`, following the meadow/customer-care work described in [07](07-festival-meadow-and-customer-care.md). This is an additive contractor delivery; preserve your unpublished shop/fixtures, portrait and placement changes when porting its small hooks.

## Final unlock rule

**Level 5 unlocks the option to purchase the cocoa shop. It does not build or purchase it.** The first stand still costs £650 and needs the bought meadow. Meadow land itself can be bought from level 4. Level 6 unlocks the tier-2 upgrade; level 8 unlocks tier 3. Every build/upgrade requires its own payment. Existing stands in saves are retained, not revoked.

## Sandy and the real menu art

The user supplied four photos of Sandy and corrected the first short-bodied cartoon draft: Sandy should have a larger, longer adult sausage-dog body and detailed fur like Skyla. The shipped art uses a new detailed, long-bodied Sandy, with her dark muzzle, uneven ears, sandy coat and plum/copper neckerchief.

`assets/sandy/` contains the base, closed-eye blink and serving-paw PNG sources; a six-icon menu atlas; and lossless WebP versions used by the offline runtime. The serving image is an edit of the same base, not a newly designed dog. The same body and foot baseline are used for idle, blink and service. Her bell remains visible between frames. The character stands on the front of the counter; the cut-out leans slightly towards the camera to keep the face below the awning instead of hiding it behind the roof. All tiers retain the same Sandy.

`src/sandy.js` owns these textures, the cashier renderer and menu/portrait icons, independent of `sprite-actors.js`. `scene.js` injects `createSandy` into the world adapter, so pure art tests do not need DOM image loading. The existing cast, wardrobe and visitors were not replaced.

`src/cocoa-props.js` provides **actual native voxel models** for plain cocoa, a chocolate-flake cup, ghost-marshmallow cocoa, a sauce-topped special and a ghost s’more. They use batched positive boxes, with mug handles, ghost faces, cream, flake ridges, sauce drips, cracker dimples, chocolate and marshmallow layers. The stand displays stocked products; visitors carry the actual drink/snack they bought. Shared prop materials are retained across stand rebuilds; per-instance buffers are released when visitors leave.

## Prices, paid stock and customer choice

| Product | Stand tier | Default sell price | Adjustable range | Ingredient/supply cost per unit |
| --- | ---: | ---: | ---: | ---: |
| Plain haunted cocoa | 1 | £4 | £3–£4 / £5 / £6 by stand tier | £2 |
| Chocolate-flake cocoa | 2 | £6 | £4–£10 | £3 |
| Ghost marshmallow cocoa | 2 | £7 | £5–£12 | £3 |
| Midnight sauce sundae | 3 | £9 | £6–£14 | £4 |
| Midnight s’mores | 3 | £5 | £3–£10 | £2 |

Specials are stocked separately, in paid packs up to 10. Capacity is 20 per special at tier 2, 30 at tier 3. Locked products cannot be stocked or repriced. All prices are integer pounds, bounded and saved. The courier still replenishes plain cocoa only, at its normal cost; it does not silently buy premium stock.

`rules/cocoa-menu.js` quotes the planned pumpkin basket, then considers only the guest’s genuinely spare money. Drink options depend on thirst, stock, willingness to pay, variety preference and relative value. S’mores depend on hunger and remaining cash after the drink. Low needs or excessive prices can mean no purchase. Lower prices produce measurably more demand in the test population. Festival pocket money is explicit and finite: £4 / £7 / £9 at stand tiers 1 / 2 / 3, when the stocked stand is open. It is not a hidden unlimited budget.

Payment rechecks stock, posted prices, unique product lines and the guest’s purse; a visitor cannot pay the same treat receipt twice. Consumed stock, guest cash, coins and ledgers change together. Drinks satisfy thirst, snacks satisfy hunger, and both can improve happiness. `festival.cocoa.gross` and `.supplies` now aggregate **all stand products**. `cocoa.extras[id]` records each special’s stock, units sold, gross and supplies; `cocoa.prices[id]` records its posted price. `cocoa.sold` counts cups (all drink varieties), while snacks have their own count. `stall.cocoa` is the historical cocoa/treat aggregate, not a second credit. Tips remain pumpkin-only and separate.

## Live guest inspector

Tapping an outdoor visitor **or an indoor shop customer** opens `ui/guest-card.js`, a compact live card with thirst, hunger, happiness, actual money left, spent money and current destination/activity. The inspector closes when the guest leaves and hides behind menus/level celebrations. It is not a pause menu or a fake static profile.

`rules/guest-needs.js` generates stable per-guest needs/value sensitivity, advances needs slowly, applies meal/pumpkin satisfaction and supplies the human-readable destination. Outdoor and indoor pumpkin purchases now deduct the goods amount and tip from the visitor’s purse after care settlement, so money shown after checkout is accurate. The product revenue ledgers stay unchanged.

Integration hooks: a shared moving hit box per customer in `scene.js` / `places.js`; `main.js` routes `visitor`/`customer` picks and ticks the card. Preserve your furniture pick logic when adding the indoor hit boxes. These boxes are removed when the customer leaves.

## An actual exit, not disappearance in the new yard

The old departure route ended at x42.5, now inside the purchased land. The owned-meadow route in `content/festival-meadow.js` continues past a new side-fence gate at **(53.6, 6.6)** to **(57, 6.6)**, beyond the 54-unit farm. The same route drives the cobble mask and walking positions. Fence pickets skip the gate opening; posts, lanterns, a “Village →” sign and an external cobbled spur make the exit legible. Existing arrival remains the front gate. Departure lifetime increases from 4 to 9 seconds on expanded land, preserving a sensible walk speed across the longer route.

## Readable overworld signs

`world.signBoard` uses a larger 1024×320 texture, high-contrast outlined lettering, automatic text fitting and a clean timber panel. Shop/Patch lettering is shorter and physically wider. All lettering remains on the actual 3D boards; there are **no floating HTML map labels**. The real shop, patch and cocoa boards are pickable, and the cocoa title sits on the roof instead of covering Sandy’s face.


## Tests, save compatibility and next work

Schema remains **7 for this whole not-yet-released contractor delivery**, with safe defaults for premium menu stock/prices. Existing v5 saves remain supported; old meadow-only v6/v7 previews gain missing premium fields. Unpaid visitors/needs remain transient as before. Source PNGs retain alpha; use the supplied lossless WebP files, not an RGB conversion that would bake the hidden matte into the sprite.

`test/cocoa-menu-and-guests.test.mjs` checks level/tier gates, cost/stock transactions, price bounds, price-sensitive demand, thirst/hunger decisions, exactly-once settlement, cash after pumpkin purchases, restore sanitisation and the gate/departure route. Earlier care, NPC reward and meadow tests remain in place. `tools/qa-sandy-cocoa.mjs` checks the actual paid level-5 purchase, Sandy loading, map-sign access, premium stock/prices, real guest picking, phone/Fold/landscape controls, fullscreen, native food props and save/reload, with screenshots including bloom/shadows.

The requested cooking system and 20-level extension are a **roadmap, not live gameplay in this delivery**: see [09](09-cooking-and-twenty-level-roadmap.md). Keep the live 12-level reward data intact until that migration is implemented and tested.
