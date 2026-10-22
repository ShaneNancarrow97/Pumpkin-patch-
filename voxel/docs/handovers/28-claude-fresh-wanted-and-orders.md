# 28 — Claude handover: fresh and wanted pumpkins, and neighbours' orders

For Codex. Builds on handover 27 (read that first). Base your next branch on the head of `voxel-reference`.

## What it does

The next step of the economy roadmap: rewards for picking at the pace you sell, and for stocking what the village wants.

- **Fresh pumpkins** (`rules/stock.js`, `rules/market.js FRESH`). A harvest or a tapped-loose pumpkin is fresh for 90 seconds, kept as batches in `s.fresh[variety]` (`[picked at, count]`, oldest first, never more than in stock; `settleFresh` runs every update). Shoppers take fresh pumpkins first and pay up to 20% more for each.
- **The wanted variety** (`rules/market.js WANTED`, `updateWanted`). Once a second variety can grow, every five minutes one variety the open plots can grow is wanted, never the same twice running (`s.wanted`; a `wanted` event each time). It fetches up to 25% more. About 15% of new guests (`wishFor`, in `selling.js basketFor`) bring a purse and a basket space for one wanted pumpkin on top of their usual basket. The Baron never does.
- **Extras never cost a sale.** `quoteBasket` fills the basket at base prices exactly as before. Only then do fresh and wanted extras come out of the change left over: the full extra while it lasts, then whatever is left on one more. A keen guest's wish purse buys only the wanted pumpkin, and stays unspent when there is none, so the wish rewards stocking it without changing anything else they buy.
- **Receipt lines** carry `fresh`, and one variety can now be split over two or three lines at different prices. `ui/farm-sheets.js basketText` shows them per variety.

## Neighbours' orders

`rules/orders.js`, from patch level 5 (`ORDERS.from`):
- **Timing:** every four minutes one of the ten regulars (`VISITOR_ROSTER` names: Pip, Mabel, Bram…) asks for a batch of one variety the plots can grow. Only one order is open at a time, and each has five minutes (`ORDERS`).
- **Pay:** 1.25× the stall price at first, up to 1.5×. Size is set by the variety, the crowd tier and trust.
- **Trust:** `s.orders.trust[kind]` counts the orders of theirs you've filled; `ORDER_TRUST` names the steps, from New neighbour to Dearest neighbour. Letting an order lapse takes two off that neighbour's count.
- **Sending:** `fillOrder` sends the barn's oldest pumpkins first. Fresh ones only go when there aren't enough others: `settleFresh` trims the oldest fresh to fit. Pumpkins held in a shopper's basket can't go. Orders count towards `earned` and `sold`.
- **Screens:** the stock panel has a "Neighbours’ orders" section with Send (or "Need N"). The stock button gets a dot while an order waits, gold when it can be sent. There's a notice on arrival and on lapse, Shane explains the first, and Skyla's tip points at a sendable order.
- **Saves:** `restoreOrders` validates everything, caps a saved order's pay at twice the stall price, and drops lapsed orders.
- **Balance:** about +5% income on top of fresh and wanted pumpkins. Level 12 comes at 1h17 by hand, against 1h23 with fresh and wanted alone and 1h28 before either. `tools/economy-sim.mjs` now sends orders as soon as it can.

## Why this shape

A first version put the wanted variety first in guests' favourites. In the simulator that *lost* about 2% of income: when Orange was wanted, Starlight shoppers filled their baskets with Oranges. A straight price rise would have cost sales instead, because the stall's purses are tight (a "little lantern" has £18 for a basket of three). Paying extras only from change avoids both.

## Balance (tools/economy-sim.mjs, 4 hours, against the rules before this)

| | Picks by hand | Helping hands only |
| --- | --- | --- |
| Income | £537k → £604k (+12%) | £502k → £594k (+18%) |
| Level 12 | 1h28 → 1h23 | 1h39 → 1h25 |
| Fresh alone / wanted alone | +6% / +11% | +8% / +11% |

The simulated player stocks every variety and picks constantly, so real players will see less. Levels 1 to 4 come about a minute sooner. To tune it, change `FRESH`, `WANTED.bonus` or `WANTED.keen` in `rules/market.js`.

## Screens

- A notice each time something new is wanted. The first time, Natalie explains.
- The stock panel (the crate in the HUD) shows "Wanted now: … · up to 25% more · m:ss left" and "N fresh" against each variety, with a line on what fresh means.
- The seeds tab stars the wanted variety on every plot's chips.
- Skyla's tip suggests planting the wanted variety when there is none left, and otherwise suggests picking little and often.

## Saves

`fresh` and `wanted` are saved with the state and validated on load (`restoreFresh`, `restoreWanted`): junk, future times and long-expired batches are dropped, and fresh is held to stock. Older saves start with nothing fresh and nothing wanted. `STATE_VERSION` is unchanged.

## Please keep

- Extras out of change only. Don't price fresh or wanted pumpkins into the basket fill, or guests buy fewer.
- One wanted variety at a time, only from what the player can grow.

## Ideas for next (yours or ours)

- A sign on Skyla's stall showing the wanted variety in the world, not just in the panel.
- Neighbours' small repeat orders, and festival days (roadmap items after this).
- Your cooking slice: cooked food could prefer fresh pumpkins.
- A noticeboard by the stall showing the open order in the world.
- Festival days that spike arrivals for a minute or two (the last roadmap item before your level 13–20 band).

## Verification

- `npm test`: 239 pass, including `test/market.test.mjs` (fresh timing and holds, extras only from change, never a pumpkin fewer, the wish purse, wanted rotation, the Baron, saves) and `test/orders.test.mjs` (when they start, one at a time, oldest pumpkins first, holds, trust up and down, saves).
- Browser (orders): the arrival notice and Shane's line, the badge, "Need 5" then Send, £180 paid and the order cleared, at phone and desktop with no page errors.
- Browser: notice and Natalie’s line, the stock panel and the seeds stars at phone and desktop, with no page errors. `npm run smoke`: all 48 checks pass.
