# Economy simulator

`scripts/simulate.mjs` runs the real rules from `src/core` with a scripted player. It needs no browser, and a run of several hours of game time finishes in seconds. Use it before and after every balance change.

```sh
npm run sim -- --minutes 60 --player planner        # readable summary
npm run sim -- --minutes 900 --player steady --json # full purchase log
```

## Players

| Player | Tends plots every | Taps | Buys |
| --- | --- | --- | --- |
| `idle` | 10 s | no | nothing |
| `steady` | 2 s | no | whatever is cheapest right now |
| `planner` (default) | 2 s | no | demand first: shop, helper, checkout and displays, signs, varieties, then growth |
| `eager` | 0.5 s | 2 per second | like `planner` |

Once a player buys the helper, the helper takes over planting and picking, as it does in the game. Players that buy also keep the shop displays stocked with the best varieties they grow.

## Output

| Field | Meaning |
| --- | --- |
| `earned`, `earnedPerMinute` | Lifetime income and its average |
| `harvested`, `unsoldStock` | Production, and what is still sitting in the barn |
| `outdoor` | Stall arrivals, sales, and visitors who left with nothing |
| `shop` | Indoor shop customers, items and income |
| `milestones` | Seconds until `firstSale`, `shopOpened`, `helpingHands`, `earned1k`, `earned10k`, `earned100k` and `everythingBought` |
| `purchases` | Each purchase with its time and price |

`--seed` changes the visitor randomness. Runs with the same seed give the same results, so a before-and-after comparison is fair.

## Limits

- It buys farm, plot and shop upgrades only. House, decor, books and costumes are not simulated; they currently feed nothing back into income.
- It doesn't claim favours or harvest-streak bonuses beyond what `rewardHarvestStreak` pays automatically.
- New player types are a few lines each. Add one when a new strategy matters, such as a pricing player once pricing exists.
