# Attraction capacity audit for Claude

This is a read-only study of the current hayride rules. It identifies a specific late-game upgrade tradeoff without changing the game, saves or balance. The companion [JSON report](attraction-audit.json) contains all 18 scenarios, source fingerprints, assumptions, financial ledgers and matched comparisons. The support preview displays those captured results; it does not run a second economy.

## Main finding

At tier 3 with every eligible haunt fitted, the original circuit already reaches the scare cap: **36 base + 81 haunt scare = 117 raw, capped at 100**. Both route detours lengthen the paid circuit without raising the resulting scare rating, the £20 ticket ceiling or the standalone 30% footfall bonus in this configuration.

Under the fixed capacity fixture below, all 12 matched detour comparisons complete fewer paid guests than the original circuit. This is evidence of a capacity cost at a saturated scare rating; it does not measure how much players enjoy the longer scenery or ride-along experience.

| Tier 3 route | Circuit | Added route capital | Scare | Completed, 1 tractor | Completed, 2 tractors | Ticket receipts at £12, 1 / 2 tractors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original circuit | 90s | — | 100 | 124 | 224 | £1,584 / £2,880 |
| Forgotten graveyard | 110s | £8,500 | 100 | 108 | 212 | £1,380 / £2,712 |
| Both detours / crooked thicket | 130s | £24,500 | 100 | 92 | 180 | £1,200 / £2,352 |

These are **30 simulated minutes of prepared ride-only capacity**, with four offers every 30 seconds, £60 per guest and maximum station crew. The fixture forces the willingness/value roll to accept while preserving the actual budget, queue, boarding, payment and return rules. It is not a player-time promise, live demand forecast, profit figure or return-on-investment calculation. Each configuration receives exactly the same 240 unique offers. Tickets sold and completed guests are distinct because some paying guests remain on their trip at the horizon.

## Other late-game implications

- **The second tractor has a measurable service benefit.** At a £12 ticket, it raises paid completions from 124 to 224 on the original route in this fixture. On both detours, it raises them from 92 to 180. Queue refusals and timeouts remain visible in the report, rather than being hidden behind revenue.
- **Permanent attraction footfall is shared and capped.** The actual `attractionFootfallBonus` function returns 65% for a fully dressed maze and meadow. The fully fitted ride offers 30% on its own, but adds 10 percentage points in that context before reaching the combined 75% cap. The ride's own invitation timer is a separate source of demand; its configured gap is reported but not simulated here.
- **Tickets spend the visitor's real purse.** At £12, every paying £60 guest retains £48 for later businesses. The study counts only ticket income and makes no prediction about the cocoa, kitchen or shop spending that might follow. Raising the ticket price is not free extra farm revenue.
- **An admitted guest is not necessarily a served guest.** Longer routes can cause queue timeouts that free slots for further admissions. Use actual tickets, completed guests and missed visits together when assessing service; acceptance alone can conceal worsening service.

## Decisions left for the lead

No balance recommendation is applied automatically. Useful options to compare in a separate lead-owned patch are a route benefit beyond the already saturated scare stat, a distinct route-dependent value or ticket allowance, or a smaller operational penalty for longer scenery. Each needs a fresh walk-in and whole-farm evaluation, including guest wallets, queue frustration and repeat attraction visits. The contractor pack deliberately leaves that choice to Claude.

The report's `route-scare-saturated` warning is conditional: if the actual route gains scare or ticket ceiling in future rules, the warning is removed on the next run. Source fingerprints make the captured numbers inspectable and identify when the report needs rebuilding.

## Reproduce from the repository root

```sh
node voxel/docs/contractor-patches/late-game-support/tools/audit-attractions.mjs --out voxel/docs/contractor-patches/late-game-support/findings/attraction-audit.json
node voxel/docs/contractor-patches/late-game-support/test/audit.test.mjs
```

The companion [walk-in report](attraction-walk-in-audit.json) retains the actual deterministic willingness/value choices. Reproduce it with:

```sh
node voxel/docs/contractor-patches/late-game-support/tools/audit-attractions.mjs --acceptance walk-in --out voxel/docs/contractor-patches/late-game-support/findings/attraction-walk-in-audit.json
```

`--help` lists the duration, time step, arrival interval, party size and wallet options. All scenarios in a report share those inputs. Invalid or accidentally enormous studies are rejected. The exported API is `runAttractionAudit(options)`; `runAttractionScenario(config, options)` supports focused checks. Neither loads or writes a player save. Only the CLI's explicit `--out` path is written.

## Method and limits

The auditor imports [freshState](../../../../src/model.js), the actual [hayride rules](../../../../src/rules/hayride.js), [journey timing](../../../../src/content/hayride-layout.js), progression, attraction footfall and content. It creates a fresh developer fixture at the current highest claimed patch level with a prepared house/restored maze, then purchases every studied ride upgrade through the real purchase functions. Reported capital includes the ride, tier upgrades, fitted haunts, station crew, selected fleet and routes. The prepared house and restoration are excluded from that ride capital.

The default matrix is route 0/1/2 × fleet 1/2 × ticket £8/£12/£20. Each guest has a monotonic ID, a finite £60 wallet, hunger 50 and no pumpkin wishes, reserved purchases or payment holds. Guests get one offer and one possible visit. Physical approach and return timings come from the real layout function. `updateHayride` processes the actual queue, partial loads, boarding charges, convoy motion, scares, need effects, unloading and return.

For matched demand, the fixture discards only its generated opening invitations and sets its private `guestTimer` high. It injects fixed offers through `planHayrideVisit`; it does not change production code. Ordinary walk-in mode preserves willingness/value choices; capacity mode forces only that choice. Queue capacity and affordability remain enforced in both. The refusal labels prioritise insufficient funds, then queue occupancy, then the remaining willingness/value choice because the planner returns a visit or null rather than a refusal reason.

Arrival boundaries are aligned with the time step, and the 1s and 0.5s fixtures are checked for equal outcomes. The horizon does not drain pending trips. `completed` means paid guests whose wagon finished unloading; `paidReturnedGuests` means they also finished the physical return. `returnedGuests` additionally includes admitted guests who missed the ride. Natural need drift, other businesses, retail stock, litter, labour costs, future progression and repeat visits are outside this isolated study.

Every ticket must match one visitor debit, one unique visit ID, one sale event, ride income, coin increase after capital and earned increase. The audit keeps its own complete event ledger because the live game retains only the most recent 256 receipts. A long-running test crosses that boundary and verifies that no income disappears. The generated report hashes the auditor itself and its 66 statically imported model/rule/content dependencies, including shared repository data. Unrelated renderer and contractor sprite content is excluded so this folder can be reviewed on the lead branch independently. Neither machine-specific paths nor timestamps affect reproducibility; the preview build refuses stale source hashes.

Assertions cover repeatability, dependency provenance, conservation including decimal wallets, affordability, normal walk-in refusals, step-size stability, receipt truncation, partial trips at the horizon, conditional route evidence, matched comparisons and invalid inputs. These are contractor-tool checks; they do not replace the game's browser smoke tests.
