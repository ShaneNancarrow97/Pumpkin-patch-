# Late-game content plan

Status: proposal, from the lead (handover 52). Nothing here is built yet except the grand favours and new scrapbook memories listed under "Already in".

## Where the game stands

- **Twenty levels**, the last at £1.6M earned, each with home goals. An engaged player reaches level 20 in about seven to eight hours.
- **Businesses:** the patch and Skyla's stall, the shop floor, Sandy's cocoa, Maisie's kitchen, the Hollow House maze and foyer, the Hollow Hayride, neighbours' orders, visitor events (harvest rush, the midnight court) and Hettie.
- **The eight-hour simulation:**
  - The tier gates now spread purchases to about 5h49.
  - After that, money piles up with nothing to spend it on: income is about £2.1M by eight hours.
  - The food truck is limited by supply, at about £14k.
  - Without Hettie, income is about 19% lower.
- **The gap:** past level 20 there is no new goal, no new place, and nothing that asks for six figures.

## Aims

1. Always have a next thing to save for, priced against late-game income (£100k–£1.5M).
2. Give the systems the player already runs a reason to be pushed further, before adding new ones.
3. Keep the cosy, plum-night, couple-at-home tone. Scares stay playful.
4. Cost little in performance on a mid-range phone, and don't touch the farm's single camera framing.

## Already in (handover 52)

- **Thirteen grand favours** in the Journal. They take a season's work in each business, and pay £900 to £30,000:
  - 2,500 pumpkins harvested;
  - 15 neighbours' orders;
  - 300 cups of cocoa;
  - 200 pieces of litter;
  - 60 maze guests;
  - 8 recipes learned;
  - 250 food portions;
  - 150 hayride riders;
  - the midnight court welcomed 5 times;
  - 60 haunting points;
  - 2,000 visitors;
  - £500k earned;
  - £2M earned.
- **Eleven new scrapbook memories**, one for each milestone:
  - the Hollow House restored;
  - Sandy's stand built;
  - the food truck bought;
  - the hayride opened;
  - Hettie hired;
  - the court welcomed;
  - 20 books shelved;
  - every costume collected;
  - patch levels 10 and 20;
  - £1M earned.

## Proposed, in order

### 1. Afterlife levels 21–30 (small, mostly data)

- **Thresholds:** extend `LEVELS` with ten more, from £2.2M to £9M. Each adds roughly 35% on the last, matching the curve at levels 15–20.
- **Home goals:** these are where the new places below unlock. Each level asks for one home goal that uses a late system, for example: "host a dinner for the court", "ride the hayride with every haunt on", "a room worth 40 haunting points".
- **Rewards:** the remaining premium furniture, the costume variants still unassigned, and unique decor (a gramophone, the Baron's portrait, a raven clock).
- **Gates:** extend `unlocks.js` gates past 20 only for the new content. Don't re-gate existing tiers.

### 2. Commissions (medium, uses existing orders)

- **What they are:** bulk contracts from named townsfolk, posted on a board at the gate. For example, "40 Moonlight pumpkins and 20 portions of cauldron soup within 6 minutes of game time".
- **Paying for them:** the reward is 2–3× stall value plus a trust bonus. Missing one costs trust, never coins.
- **Building them:** `rules/orders.js` already does trust, pay and size. Commissions are orders with several lines, a deadline and a food line, so they use the kitchen's spare capacity.
- **Why first:** it is the cheapest way to give late money and food production a purpose.

### 3. The Boathouse on the lake (large, the next place)

- **The place:** a lantern-lit boathouse at the arch onto the lake.
  - It hires out rowing boats for a gentle haunted-lake loop: drowned bells, a ghost ferryman and will-o'-the-wisps.
  - It is the calm counterpart to the hayride, and costs about £350k.
- **Shared pieces:** the separate-scene pattern from the hayride (`hayride-world.js` and its view), the bonus-guest rules (`bonus`, `VISITOR_TOTAL_CAP`) and the haunt-upgrade table shape.
- **Tiers:** three, with patch-level gates at 22, 25 and 28. Two lake routes.
- **Why the lake:** the painted far shore is already the scene's backdrop. The boathouse needs only the near shore, so it never fights the farm framing.

### 4. Blood Moon nights (medium, events)

- **What it is:** about once every 20 minutes of play, the sky turns red for 3 minutes:
  - visitors double;
  - every attraction's scare is raised;
  - a Blood Moon pumpkin variety can be picked, worth 4× and only during the event.
- **Building it:** it extends `visitor-events.js` (channels, ledger, saved pending state).
- **Visuals:** reuse the moonlight tint and mist uniforms.
- **Accessibility:** it must respect gentle mode and reduced motion.

### 5. House wings (medium, home)

- **The wings:** an attic observatory (telescope, star charts, a slow rotating orrery) and a cellar crypt (wine racks, a sarcophagus bed for the vampire costumes).
- **Price and gates:** about £400k each, at levels 23 and 27.
- **Building them:** they use the existing room pipeline (`interiors.js`, `places.js`, decor sizes, the build catalogue's `ROOM_KINDS`).

### 6. Managers (small to medium, automation)

- **What they are:** one manager per business, at about £150k each:
  - Skyla's deputy restocks;
  - Sandy's apprentice sets cocoa prices to demand;
  - Maisie's sous-chef orders ingredients;
  - Axel's usher manages the queue.
- **The rule:** each manager does what the player otherwise taps, at slightly worse value than playing by hand. They never spend more than a set float.
- **Why:** at ten businesses, hands-on micromanagement is the late game's main friction.

### 7. Giant pumpkin contest (small, collection)

- **What it is:** a single show pumpkin grown over a real-time hour in its own bed, judged at the village fair for a trophy and a decor reward.
- **Variety:** it gives Shane and Natalie's hands-on play (water, tend and pick) a long-form purpose.

## Numbers to watch with `S/sim-life.mjs`

- **Spending:** time to the last purchase. Aim for more than 9 hours with levels 21–30.
- **Coins:** banked at 8 hours. Aim for less than 20% of lifetime earnings unspent.
- **Balance:** the share of income from each business. No single source should be over 40% after level 15.
- **The hayride:** must stay income-positive against a no-hayride run (it is now: +1.3%).

## Risks

- **Too many timers:** commissions and Blood Moons both add clocks. Show at most one countdown on the HUD.
- **Saves:** every new system needs `fresh`/`restore` functions and a saved-state test, as the hayride and kitchen have.
- **Performance:** the boathouse is a separate scene, like the hayride, so the farm frame cost does not change. Wings add to the house's draw calls, so measure with `tools/perf.mjs`.
