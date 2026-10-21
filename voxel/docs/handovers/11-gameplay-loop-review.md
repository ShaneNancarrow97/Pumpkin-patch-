# Gameplay loop review for Claude — pinned historical baseline

Reviewed baseline: **`ede512b`**, combining Claude’s published voxel commit **`8176e32`** with the completed Moonbrew Meadow/customer-care contractor delivery. This is a source-and-simulation review dated 20 October 2026. Claude’s unpublished shop, fixtures, portrait, visitor-rush and balance changes were unavailable. Recheck the findings against those changes before applying balance patches.

The new private estate, Hollow House foyer, Mortimer and minimalist UI are being implemented on `contractor/haunted-house-estate`. They provide new things to build, run and personalise. The measurements below deliberately use an isolated archive of the earlier baseline, so additions still in development cannot alter the evidence. They do not certify the new attraction’s economy.

## Delivery update, 21 October

While this contract was being built, Claude published `f9e031a` (fine shop/cottage art and fixtures) and `dd97819` (farm/visitor balance, shelves and portraits). Both are now merged into the contractor preview. The measurements below remain the original **ede512b baseline**, not claims about the new balance. Claude's update introduces a barn cap, wholesale overflow, gentler arrival floors, revised streaks and extra visitor tiers. At the user's subsequent explicit request, this contract adds dedicated barn tiers and changes overflow to **leave ripe crops safely unharvested**, preventing harvest spam from minting wholesale money; historical wholesale earnings are retained. Outdoor capacity gains its own upgrades. Re-run the supplied baseline script against a separate archive when comparing the new rules; do not compare different builds as if only one variable changed.

## Main conclusion

The cosy grow → welcome → earn → personalise loop is strong, but **production gets far ahead of actual demand**. Later production upgrades mostly enlarge an unsold stockpile. The game needs more reasons to use that output and more meaningful goals between coin thresholds. Raising every price or simply adding eight larger earnings thresholds would lengthen waiting without fixing the underlying choices.

The highest-priority balance correction is the transition from legacy free cocoa revenue to Sandy’s paid-stock business. Players can currently spend money to replace a much more generous legacy perk with a lower-profit physical stand.

## Findings, in priority order

### P1 — Production upgrades lose their economic purpose once the farm is stocked

**Confirmed behaviour; balance issue.** Six starting Orange plots already supply more than the outdoor stall buys. At advanced levels, watering, extra plots and yield compound while shopper arrival, finite purses and a single indoor till limit sales.

One-hour isolated rule runs:

| Staged scenario | Pumpkins harvested | Pumpkins sold | Added to stock | Product takings |
| --- | ---: | ---: | ---: | ---: |
| Starting farm; manually tend every 3s | 1,026 | 264 | 762 | £3,168 |
| Same farm, first watering-can tier | 1,434 | 261 | 1,173 | £3,132 |
| Same farm, first advertising tier | 1,026 | 293 | 733 | £3,516 |
| Midgame mixed crops; helper only | 7,041 | 1,137 | 5,904 | £41,990 |
| Maximum mixed crops; helper only | 30,708 | 3,040 | 27,668 | £114,838 |

The maximum mixed farm sells roughly **9.9%** of its hourly output. The small difference between the two starting-farm sales totals is a consequence of deterministic timing and manually triggered streak windows; it is not evidence that faster growth directly reduces demand. The relevant result is that 40% more production does not yield more sales in this stocked scenario.

**Player consequence:** upgrades described as growth become weak purchases, clicking stops feeling useful, and the stock number grows without an outlet.

**Recommendation:** expose an occasional short diagnosis such as “Pumpkins stocked; more visitors or a faster till will help.” Show sell-through or stock coverage inside detailed management, not in the permanent HUD. Introduce useful stock sinks through recipes, research samples, finite catering orders and event demand. Start with one complete ingredient → dish → shelf → customer loop. Avoid making extra stock disappear or charging punitive storage fees in this cosy game.

**Evidence:** [farm growth/yield/plot multipliers](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/farm.js#L16-L36), [helper harvesting](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/farm.js#L124-L139), [arrival and basket limits](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/selling.js#L45-L63), [single indoor checkout](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/selling.js#L194-L238).

### P1 — Buying the physical cocoa stand can reduce a returning player’s income

**Confirmed migration incentive regression.** Before a physical stand exists, `buyMug()` pays £2/£4/£7 for every outdoor passer-by according to the old hospitality tier, without supplies or a deduction from that guest’s purse. Once any physical stand exists, this payment stops. Sandy’s stand correctly uses finite visitor money, demand and paid supplies, but the replacement starts at the cheapest tier.

A matched one-hour scenario with maximum visitor upgrades and equal abundant four-variety pumpkin stock produced:

| Cocoa state | Cocoa/treat gross | Supplies bought | Stand contribution after supplies |
| --- | ---: | ---: | ---: |
| Legacy hospitality tier 3; physical stand unbuilt | £7,616 | £0 | £7,616 |
| Physical tier 1 at £4; normal paid restock every 3s | £3,376 | £1,688 | £1,688 |

The comparison excludes the stand’s build cost and does not value ending stock. Pumpkin product takings stayed around £115k/hour in both runs. The regression is not caused by double-charging or by a missing ledger entry: it is a difference in the two business models.

**Recommendation:** reconcile this before recommending the purchase to returning players. Options are a transparent migration credit, an appropriate starter stand/stock grant for already-paid legacy hospitality, or a carefully tested conversion of the old perk into service upgrades. Do not silently erase paid legacy value or add unlimited free revenue to every new stand. Show a clear explanation of what converts. Test each legacy tier, including closed/sold-out stands.

**Evidence:** [legacy cup payment and suppression](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/selling.js#L100-L105), [paid basic supplies](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/festival-meadow.js#L46-L54), [finite drink demand and payment](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/cocoa-menu.js#L33-L59).

### P2 — The most expensive seed is not the best crop for every plot

**Confirmed, useful strategic choice that needs better communication.** Fixed guest budgets make an all-Starlight farm exclude many neighbours. In the maximum helper scenario, mixed crops had no outdoor budget misses; Starlight-only crops had **629 outdoor budget misses/hour**. Product takings were £114,838 mixed versus £110,810 Starlight-only. The latter still produced 21,528 pumpkins and retained 19,945, so its missed sales were not a production shortage.

The existing ability to grow a lower unlocked variety is valuable. Keep it. Make the choice visible before a player upgrades every plot: show budget bands, a small “affordable crop missing” notice in management, or suggested mixed-plot presets. Avoid describing rarity as a universally superior replacement. Skyla already provides some affordability advice; prioritise that advice before simply recommending the dearest available display.

**Evidence:** [per-plot crop choice](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/farm.js#L85-L101), [guest budgets/preferences](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/src/content/stall.js), [Skyla advice ordering](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/ui/farm-sheets.js#L41-L48).

### P2 — Twelve earnings milestones reward progress but do not yet form an endgame

**Confirmed content boundary; design recommendation.** Live levels end at 12, £110,000 eligible earnings. The current rewards are welcome gifts and cosmetics, with a couple of free farm tiers. Most farm, seed, house and shop purchases are gated primarily by money rather than a branching research or achievement path. The meadow/cocoa gates add some business identity, but the level-ups themselves do not consistently preview those unlocks.

There are ten once-only favours and six once-only memories. Once claimed, there are no repeatable orders, recurring festival objectives or mastery contracts in this baseline. House decoration, stories and outfits remain good personal goals, but completing a checklist does not create a new business decision.

**Recommendation:** retain all earned levels and granted cosmetics. Add explicit unlock IDs and a “next useful thing” preview to existing milestones. Extend to 20 only alongside the cooking, research and business systems described in [roadmap 09](09-cooking-and-twenty-level-roadmap.md). Make levels 13–20 introduce decisions, not only higher turnover targets. Add optional repeatable festival/catering goals with bounded rewards and no compulsory reset, attendance streak punishment or expiring paid goods.

The new estate and foyer can become collection and hospitality goals. Avoid making every decorative object multiply revenue; that would accelerate the same inflation and turn personal design into mandatory optimisation.

**Evidence:** [all live levels and rewards](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/levels.js#L2-L15), [finite favours and memories](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/progress.js#L5-L38), [paid house room progression](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/house.js#L54-L74).

### P2 — Gross revenue and profit need distinct meanings as businesses gain costs

**Confirmed accounting semantics, not an arithmetic bug.** Level progress is `earned - progression.bonusEarned`. Level-gift coins do not recursively earn levels, which is correct. Pumpkin sales, tips, favour rewards, streak rewards and cocoa gross all contribute to `earned`; bought supplies do not reduce it. A player selling expensive low-margin drinks can advance on turnover while making little cash profit.

**Recommendation:** preserve existing level progress and call the metric lifetime earnings/turnover consistently. Show product revenue, supplies, operating contribution, tips and one-time rewards separately in expanded statistics. For recipes/attractions, use additional research/mastery/service goals so players do not have to mistake turnover for profitability. Do not retroactively recalculate old levels from profit and remove rewards.

**Evidence:** [eligible level earnings](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/levels.js#L16-L20), [level gifts excluded](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/levels.js#L37-L54), [cocoa gross credits](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/cocoa-menu.js#L48-L59), [favour earnings](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/progress.js#L20-L25).

### P2 — Tapping and quality offer limited late-game agency

**Confirmed mechanics; design judgement.** Tapping remains an important requested verb and should stay. It currently advances every growing plot by the same fractional amount regardless of crop grow time; this weakens the longer-growth trade-off while actively tapping. When nothing grows, every eighth tap adds the highest variety unlocked anywhere on the open farm. In a stocked, demand-limited game these actions create more surplus rather than a new choice.

Quality is rolled once at sale, with higher rarity minima. This is safe against repeated-frame rerolls, but the player cannot improve a particular pumpkin through care, soil choice or recipe handling. Labels should continue to describe this as sale grading, not imply that inventory already stores individual crop quality.

**Recommendation:** give late-game active play a modest, bounded reason to matter: a timed visitor-interest opportunity, optional order fulfilment or a future care/research action that affects a defined quality batch. Keep ordinary harvest automation convenient. Do not require rapid tapping to sustain all businesses. The published baseline’s harvest visitor rush is a flat 20s bonus triggered with the once-per-minute streak reward; reconcile Claude’s newer unpublished stacking implementation before changing it again.

**Evidence:** [tap behaviour](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/farm.js#L58-L72), [streak/rush cadence](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/farm.js#L104-L121), [sale grading and spare-cash tips](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/customer-care.js#L25-L45).

### P3 — Needs and bags are useful foundations, but do not yet make a whole park economy

Hunger/thirst affect Sandy’s purchase choices; happiness changes during waits and after purchases. In the baseline, happiness does not drive a park rating, future arrivals, return probability or a named visitor relationship. Visitors are short-lived customer instances. Carrier bags increase basket space, not budgets. That is honest and avoids free money, but additional bag tiers can add little when a visitor already spends almost all available money. In the staged maximum mixed farm, all three bag and tip tiers together raised sold units from 3,040 to 3,155/hour, a modest 3.8% rather than a promised several-fold improvement.

**Recommendation:** preserve finite purses across cocoa, tickets, pumpkins, meals and tips. Introduce a bounded satisfaction/reputation layer after the shared guest journey is proven. Let it influence visitor composition or occasional group interest, with caps, rather than multiplying every price and spawn rate. Before buying a bag/till upgrade, show its practical purpose and the current bottleneck inside Manage.

**Evidence:** [needs and satisfaction](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/guest-needs.js#L4-L16), [bags keep budgets unchanged](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/selling.js#L57-L60), [care prices](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/rules/customer-care.js#L3-L5).

### P3 — Idle should be described as in-session automation until offline simulation exists

The saved model preserves farm progress but strips ordinary walking/queued customers. Loading restores saved game time; it does not advance from a real-world elapsed timestamp. Helping hands and business flow operate while the simulation runs. This is a valid conservative design, but it is not offline earnings.

**Recommendation:** set expectations clearly. If bounded offline production/earnings is added later, treat it as its own migration/transaction feature: elapsed-time cap, supply costs, finite demand, reserved jobs, a concise return summary and no accidental duplicate rewards. The new paid attraction visit persistence deserves separate tests and must not be inferred from the baseline’s customer-clearing policy.

**Evidence:** [saved customer clearing and game-time update](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ede512b/voxel/src/model.js#L88-L115).

## Recommended sequence after the current contractor build

| Priority | Work package | Player-visible acceptance |
| --- | --- | --- |
| 1 | Reconcile legacy hospitality with physical cocoa; expose bottlenecks | Buying the next business has a clear purpose; returning saves retain paid value; product/supply/tip totals reconcile. |
| 2 | Finish estate/Hollow foyer/shared visitor journey | House/garden purchases are satisfying goals; tickets, occupancy, needs and budgets agree on both sides of a doorway; decorating never blocks required routes. |
| 3 | One cooking vertical slice | Buy ingredients, receive a cart, cook one real recipe, assign a shelf and sell it to an actual hungry guest. Surplus pumpkins acquire a useful outlet. |
| 4 | Research and optional repeatable orders | The next goal asks for a recipe, satisfied group or design collection instead of only a larger coin number. Rewards do not create runaway automatic multipliers. |
| 5 | Extend levels 13–20 and chef automation | Each band unlocks a new decision; learned recipes and stock targets drive the chef; existing level rewards and house items survive migration. |
| 6 | Tune the combined economy | Compare first session, midgame, mature farm and returning-save cohorts. Run repeated scenarios with human-style spending priorities, not only a cheapest-upgrade bot. |

## Evidence and limitations

Supplemental measurements were generated from `git archive ede512b`, Node rule imports, `dt = 0.1`, and 3,600 game seconds per run. Staged scenarios assign upgrades directly, claim all level IDs to suppress free-level-up side effects, do not buy upgrades or claim favours during the run, and measure the rules rather than browser frame rate. Manual starting-farm scenarios harvest/replant every 3s and call the same streak reward as the UI; helper scenarios have no tapping or manual harvests. Mixed crops cycle the four varieties evenly. Midgame has tools 3, yield 2, auto 1, plot expansion 1, advertising 2, friend 1, lights 1, and a two-capacity shop with four displays/10s till. Maximum has all farm/visitor/shop tiers. Bag/tip tiers are zero unless labelled. Cocoa comparison starts with abundant equal stock and no production; restocking uses the real paid action. Setup costs and opportunity cost are excluded from these steady-state comparisons.

The reproduction script and full raw JSON are in the contractor workspace at `/workspace/loop-review/review-baseline.mjs` and `baseline-results.json`; retain them as review evidence when exporting this handover. These runs are deterministic diagnostic scenarios, **not measured human session times or claims that a fresh player reaches maximum upgrades in one hour**.

The baseline’s existing `node voxel/tools/economy-sim.mjs 2` was also run separately. Its cheapest-purchase bot reached £1,000 total earned around 16 minutes and £10,000 around 86 minutes with visitor upgrades, opened the shop at 64 minutes and earned £25,583 after two hours. It excludes house/decor/cocoa-stand/customer-care purchases, favours, active tapping and UI harvest streak rewards; it is a limited comparison tool, not a recommended player route. Its early choices are production-heavy, which helps explain why showing a useful next purchase matters.

No runtime balance values, saved rewards, progression thresholds or visitor prices were changed by this review. Any implementation requires its own contractor patch, migration checks where relevant, and comparison with Claude’s unpublished work.
