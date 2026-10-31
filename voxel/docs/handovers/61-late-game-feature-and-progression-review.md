# 61 — Late-game feature and progression review

Design review of lead `b387c85` and the contractor art snapshot `3b92fa5`.
The remote lead was checked and remains at that revision. This document changes
no gameplay. Findings come from current rules/content; no new economy simulation
or measured return-on-investment study was run.

## Overall assessment

The game has a strong foundation for a Halloween destination tycoon alongside
a cosy life-sim. The growing farm funds attractions; attractions bring visitors;
visitors support retail and cooking; the proceeds fund a personalised home and
estate. The main late-game gap is repeatable purpose after permanent purchases
are complete. Longer income thresholds alone cannot supply that purpose.

The next design work should strengthen decisions and cross-system goals using
the existing features. Adding another attraction has most value when it adds a
distinct guest behaviour, operating choice, creative opportunity or aspiration.

## What the existing features contribute

| Feature | Current connection | Late-game benefit |
| --- | --- | --- |
| Pumpkin farm | Real stock, variety upgrades, freshness/wanted demand, storage and sales throughput | A continuing supply foundation and reason to balance production against demand |
| Hollow House | Unlock9, restoration, tickets, foyer/maze capacity, scare prefabs, fear and some repeat visits | A visible destination, a customisable experience and a tradeoff between frightening guests and keeping them shopping |
| Hollow Hayride | Unlock11 after restoring Hollow House; tier upgrades13/16, routes14/18, fleet15 | Large reinvestment goals, departure/queue/capacity decisions and an off-map experience the player can ride |
| Cooking and cocoa | Paid supplies, finite stock, kitchen equipment, time, recipes, prices and guest needs | Product planning and additional spending opportunities across a visitor's whole trip |
| House, garden and carving | Functional kitchen, home-only dishes, garden ingredients and carving seeds feeding recipes | Personal expression with useful connections back to the business |
| Automation | Chef uses supplied ingredients; cocoa resupply costs coins; janitor handles litter | Frees time for walking, designing and management as the venue grows |
| VIPs, rushes and collections | Bounded finite-wallet parties, favours, memories, costumes and books | Demand peaks and personal aspirations that can support repeatable event goals |

Attraction bonus guests and visitors away inside attractions do not consume the
normal farm-arrival allowance in the same way as ordinary shoppers. Attractions
can therefore expand the audience rather than only redirecting existing buyers.
All guests still share the global safety/performance cap.

The commercial connection is already concrete: hayride unloading adds25 hunger,
and returning guests can buy takeaway food and pumpkins from the same finite
wallet used for tickets. A better attraction creates an opportunity for the
kitchen and shop; a high ticket price can leave less money for the rest of the
visit. The management objective should be total visit value and satisfaction.

The POV experiences also have value beyond income. Bought maze effects change
the encounters, and hayride extensions change the route. Experiencing a place
the player has built is a meaningful reward for this game's audience.

## Important findings

### 1. Late hayride routes can lose their economic justification

Tier3 contributes36 scare and all five scare upgrades contribute81, exceeding
the100 scare cap before either route extension is purchased. The extensions add
20seconds each, changing the paid circuit from90 to130seconds. At that point
they add no further scare benefit, do not raise the tier's ticket limit and can
reduce throughput when full wagons are the bottleneck.

The new scenery and ride-along route are genuine creative rewards. The economic
reward needs a separate role: a premium departure/ticket, exclusive visitors,
collectible/souvenir sales, a satisfaction benefit or a festival objective.
Choose and balance one coherent benefit rather than stacking all of them.
Measure completed visitors and whole-visit net income when assessing the result.

Evidence: `content/hayride.js` tier/scare/route values;
`rules/hayride.js` config, scare cap, ticket range, convoy cycle and invitation gap.

### 2. Fear consequences need a consistent, understandable meaning

Maze-first guests frightened enough to flee can leave before shopping; some
survivors can buy one repeat visit. The hayride records frightened riders as
`runHome`, but arrival riders can still reach the stall afterward. The guest's
heading text can say they are going home while the shopping route continues.
Audit the intended behaviour and its labels before balancing fear penalties.

More scare is currently mostly an additive appeal upgrade. Bravery/preferences,
price and post-ride behaviour could create a clearer choice of experience, but
new audience segmentation is a recommendation, not an already-delivered system.

Evidence: `rules/hollow-house.js` maze completion/requeue/exit;
`rules/hayride.js` unloading/return; `rules/selling.js` returning guests;
`rules/guest-needs.js` heading labels.

### 3. The later levels need more new decisions

The game already has substantial home progression requirements: house upgrades,
wardrobe use, furnishings, wallpaper, equipment, recipes, home cooking and books.
Do not add another generic house gate as though these were absent.

Most recipe discovery occurs at levels5–12 and the chef unlocks at10. Levels13–20
raise earned thresholds and add cumulative home goals/capacity tiers, with fewer
fresh production choices. Cooking ten dishes or placing more objects can become
a checklist if there is no larger reason to use the completed home and business.

Recommend a small number of distinctive late recipes, visitor preferences and
event needs that use the existing kitchen, garden crops and pumpkin varieties.
Keep home milestones, but make completion feel purposeful and allow choice.

Evidence: `content/cooking.js`, `rules/levels.js`, `rules/home-goals.js`,
`rules/kitchen-equipment.js`, `content/house-estate.js`.

### 4. Solved businesses need repeatable situations, with limited chores

Rides have finite purchase ladders and no recurring fuel/staff/upkeep cost in
their current rules. Other hires also largely become permanent solutions. That
is useful for an idle game, but eventually there are few reasons to reconsider
a solved setup beyond collecting income and buying cosmetics.

Use changing festival audiences, themed menus, optional scare programmes and
staff/stock planning to create situations. Avoid constant repairs or mandatory
busywork that interrupts someone decorating the house or enjoying a ride.

Current permanent attraction footfall also has a shared75% cap across maze,
hayride and meadow. Individual percentages do not always stack fully. Make the
actual marginal benefit readable; increasing arrivals alone also meets queue,
stock and rendering limits.

### 5. Make the useful reinvestment choice visible

Show concise diagnostics inside Manage: guests lost to price, queues/capacity,
missing stock, exhausted budget and the intended fear outcome. Revenue and net
operating profit should be separate: level progress currently follows earned
takings minus reward bonuses, while supplies spend coins.

This should help a player decide whether they need more seats, faster loading,
more supplies or a different price. Keep the main playfield/HUD uncluttered.

## Recommended order

1. Fix route-upgrade payoff and reconcile fear/return statistics with actual
   visitor behaviour. Explain the real benefit of each expensive upgrade.
2. Add an optional repeatable **Festival Night** loop using existing attractions,
   guest groups, cooking and decorations. Example: a Midnight Court evening asks
   for a prepared menu, successful rides and satisfied guests, with several ways
   to reach the goal. Reward distinctive decor, recipes, costumes or scenery.
3. Extend selected useful recipes and audience choices through levels13–20,
   and let completed venues continue hosting nights after20 without resetting
   the player's farm or home.
4. Add compact whole-visit diagnostics so late-game investment decisions are
   understandable. Tune demand, supplies and capacity together, preserving a
   relaxed automation path and an active walking/decorating path.

Success means a late-game player has a reason to prepare, operate and improve
their own Halloween venue each session, with both commercial and personal goals.
More features should strengthen that loop rather than merely lengthen the time
until every purchase is owned.
