# Farm rewards and village trade

The expansion uses the existing farm inventories, cooking stations, stock age ledger and finite guest wallets. It adds no separate currency or alternate food-production system.

## Delivered capabilities

- Tansy grants two copies of the existing physical herb planter. These use the ordinary garden placement, planting, watering and harvest controls; crops already persist and deliver clean pantry herbs.
- Explicit preparation transfers one village herb bundle into one pantry herb. It checks the shared pantry capacity and subtracts the source exactly once.
- Preservation research unlocks a utility recipe: one clean herb and one butter warm for 30 farm seconds at the supplied truck/home hob and pot. It occupies that real cooker and prevents food/chef jobs starting there until finished. Wax is a utility item, never guest food.
- Each pot treats one existing harvest batch for 10% longer storage. Opal's paid cold store costs £1,200, six iron, four clay and one Ember Garnet and adds 20%. Combined extension caps at 30%; freshness sale premiums still expire on their original clock. Expired pumpkins cannot be revived through either transaction.
- Cinder's Lantern Stew and Granny's Bramble Pudding are registered, sellable recipes with real ingredients, cooker equipment, time, yield and normal pricing. They require their village discovery before research/experimentation; already-owned recipe entitlements remain usable. Existing 21 recipe order is preserved; the two additions are appended.
- Restaurant commissions consume unreserved servings and pay a fixed 20% logistics premium on base price. A resident has one shared 120-farm-second order cooldown, so switching between Cinder's dishes cannot bypass it. Revenue counts as actual trade/level earnings and is separately tracked from normal food-shop takings.
- The Baron's reservation becomes due after 300 farm seconds and substitutes a normal party with two finite-wallet courtiers. It waits for normal visitor space and for pending rush/VIP occasions to clear. It creates no extra arrival queue or uncapped footfall multiplier.
- Corvus awards the actual existing authored Watching Scarecrows hayride scene. Granny's completed invitation awards the new `grannys-last-light` scene supplied by the root integration. Both wait until the hayride is purchased, and do not toggle an already-owned scene back on against the player's choice.

## Integration boundaries

| Dependency | Contract |
| --- | --- |
| State/core rules | `village.expansion.effects` stores discoveries; `economy` uses `freshExpansionEconomy` / `restoreExpansionEconomy`. Commands return `{ok,reason,events}` through the core `economy:` dispatcher. |
| Farm clock | `updateExpansionEconomy(s,dt,events)` receives the already-attenuated **farm** delta. Village exploration continues at full active time. |
| Stock | `pumpkinStockLife` reads paid cold storage and the exact variety/birth-time treatment key. Held baskets retain the existing age reservations. No change to quality, freshness or normal storage capacity. |
| Cooking | New recipes share existing supply, equipment, chef, food display and sale rules. The original early catalogue order and all existing costs are retained. |
| UI | The cooking page includes Tansy's expandable preservation section with retained disclosure state. Village gifts are filtered by the nearby resident; Cinder cannot remotely present all unrelated upgrade cards. |
| Arrivals | A due reservation uses the existing ordinary party-space test, then existing courtier offers and purchase rules. Existing110 total / 70 farm-world limits still apply. |

## Public helper APIs

- `expansionEconomyInfo`, `expansionEconomyUpgradeInfo`, `expansionWaxInfo`, `expansionTreatableStock`, `expansionCommissionInfo` are read-only quotes.
- `actExpansionEconomy(s,id,action)` owns the actual transactions. IDs are `cold-store`, `prepare-herbs`, `preservation-wax`, `protect-stock`, and the three commission IDs in the content registry.
- `renderVillageExpansionEconomy(s,{who,station})` and `bindVillageExpansionEconomy(root,act)` share those quotes. Village views pass a resident; farm cooking passes its actual station. Village Tansy views explain where to cook and do not offer remote-start cooker buttons.
- Monotonic `herbsProcessed`, `waxCooked`, `treatments`, `treatedPumpkins`, `income`, `portions` and commission completion counters support quests without depending on whether an item is still in inventory.

## Verification

The affected baseline cooking/sales/equipment/customer-care/visitor suites passed 58 named cases. After the cooking presentation changes, 64 affected named cases passed. Final focused verification adds shared commission cooldown and actual model farm/village clock checks; its receipt records the final counts. New tests cover transfers, capacity/pause, supplies, real cooker occupancy, conditional discoveries, exact stock expiry at 330/390 seconds, no resurrection, unreserved food consumption, one-payment accounting, finite reservation parties and malformed-save bounds.

The root owns the final complete test run, browser screenshots, artifact hashes and release. These unit checks do not certify hardware performance or replace the integrated walking/UI playtest.

Final focused receipt: **18 named tests pass**, including the six existing cooking-UI tests and twelve economy tests. The integrated model clock test explicitly verifies that 100 active village seconds advance an unrewarded farm's wax job by 2.5 seconds, while the village clock advances 100 seconds. New recipes also have distinct batched voxel food props, so a guest carries the actual stew/pudding form rather than an unrelated fallback dish.
