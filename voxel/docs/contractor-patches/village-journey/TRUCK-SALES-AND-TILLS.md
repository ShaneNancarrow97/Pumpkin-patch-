# Maisie's real checkout and Skyla's premium till tiers

This increment moves outdoor food payment out of Skyla's pumpkin transaction and into a real visit to Maisie's truck. Hungry guests use their finite existing wallet, reserve a displayed prepared dish, walk to the hatch, queue, pay after service, and carry the dish through the eastern exit. No free or background-only income is introduced.

## Files and integration

| File | Responsibility / dependency |
| --- | --- |
| `src/content/cooking-visits.js` | Shared paved route, eight-person queue, hatch coordinate, 2.8-unit walking speed, two-second service and `truckGuestPose(visitor)` |
| `src/rules/cooking-visits.js` | Quote/hold, physical journey clock, one hatch server, payment once, exit and cleanup |
| `src/rules/selling.js` | Starts the trip after pumpkin shopping and any attraction return; retains active guests until their actual exit; adds paid till tiers |
| `src/rules/cooking-sales.js` | Existing indoor sale pipeline plus explicit `pumpkinsPaid` quote option, preventing a paid basket being reserved twice; honors a closed indoor outlet |
| `src/rules/guest-needs.js` | Visitor card intentions describe walking, queueing and buying from Maisie |
| `src/rules/unlocks.js` | Three additional level-20 till gates, preserving all existing gates |
| `src/ui/farm-sheets.js` | Shop maxima come from the rules; current and next till seconds are shown |

The scene reads the shared pose as its excursion position instead of `hatchWalk`'s old render-only pause (integrated by the root worker). `truckGuestPose(v)` returns null when inactive, otherwise `{x,z,dx,dz,walking,waiting,served,phase}`. Suppress the ordinary counter fan during this trip. `served` becomes true only after the actual payment succeeds, and can attach the carried food prop. The existing `sale` event uses `route: "takeaway"`, `quantity: 0` (not a pumpkin sale), and `foodQuantity` for the actual number of food portions.

The default outlet remains truck-only. Selecting truck and Skyla's shop enables the existing indoor meal checkout as well. Food availability, hunger, prices, bag limits and protected wanted-pumpkin money still govern each purchase. Empty, overpriced or closed outlets earn nothing. Visitors prioritise their takeaway departure over an optional meadow chat; frightened guests who already fled an attraction do not teleport back to buy food.

## Till progression

Existing checkout levels 0–7 and their exact service times remain unchanged. The following are additional paid tiers, all unlocked at patch level 20:

| Owned tier after purchase | Basket service time | Price |
| --- | --- | --- |
| 8 | 1.1 seconds | £145,000 |
| 9 | 0.85 seconds | £215,000 |
| 10 | 0.65 seconds | £315,000 |

The existing checkout integer is reused and its loader already clamps to `SHOP_MAX_LEVELS`, so no save shape change is required for this increment. Paid ownership survives save/load. Transactions do not proceed while paused.

## Verification

Run `node test/truck-visits.test.mjs`, `node test/cooking-sales.test.mjs`, `node test/shop-upgrades.test.mjs`, `node test/unlocks.test.mjs`, and `node test/kitchen-bulk-sales.test.mjs` from `voxel/`.

The truck tests spawn a native visitor through `model.update`, starting with native guest ID 33 (a starving guest), rather than calling a receipt function to manufacture a sale. They verify route continuity to the physical hatch, no early payment, finite purse reconciliation, real stock deduction, one payment only, food-only purchases, queue contention, missing/closed/overpriced menus, pause, reload and failed fulfillment. Existing prepared food remains available on reload; unpaid temporary holds and unsaved visitors are discarded together. Completed meal stock and revenue survive.

A browser check should observe the same visitor move from Skyla's counter to `(42.75, 5.15)`, wait two seconds, receive food and leave through `(57, 6.6)`. Price changes after reservation do not change the held price. The whole visit continues through lightweight rules when the scene is not being viewed.
