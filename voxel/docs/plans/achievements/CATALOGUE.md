# Achievement catalogue — The Hollow Ledger

**Plan only.** 64 entries / 1,000 nonspendable Haunt Score. Exact criteria and evidence contracts below are authoritative over prototype examples. Sample receipts are illustrative, never imported production history.

## Early game — Finding your feet

16 entries · 80 points.

### E01 · A Seed of Something Spooky · 5 points

Successfully plant one pumpkin plot yourself.

Category: Farm · Evidence: mixed · Challenge: common.

A completed manual plant transaction increments the new counter. Existing progression.homeActivities.plant >= 1 is valid subset proof for this first-action goal; zero does not prove no past button planting.

Example detail: “You planted one empty plot yourself as Natalie. The seed placement completed successfully.”

### E02 · A Little Liquid Courage · 5 points

Water one growing pumpkin yourself.

Category: Farm · Evidence: mixed · Challenge: common.

A completed manual water transaction increments the new counter. Existing progression.homeActivities.water >= 1 proves this first-action goal; failed cooldown attempts do not count.

Example detail: “You completed one manual watering action as Natalie on a growing crop.”

### E03 · The First Little Fright · 5 points

Obtain your first pumpkin through a harvest or a gift from the big pumpkin.

Category: Farm · Evidence: existing · Challenge: common.

harvested >= 1, including manual/helper harvests and accepted idle big-pumpkin gifts. Do not label this a manual crop pick.

Example detail: “You obtained your first pumpkin. Your saved pumpkin total reached 1.”

### E04 · Open for Ghostness · 5 points

Complete the first paying pumpkin customer transaction.

Category: Guests & shop · Evidence: existing · Challenge: common.

`sold >= 1`; arrivals and quotes do not count.

Example detail: “One pumpkin customer paid successfully. Served pumpkin customers:1.”

### E05 · A Hundred Little Reasons · 5 points

Obtain 100 pumpkins through harvests or big-pumpkin gifts.

Category: Farm · Evidence: existing · Challenge: common.

harvested >= 100 with its existing inclusive meaning; no per-variety or manual claim.

Example detail: “Your saved pumpkin total reached 100 through harvests and big-pumpkin gifts.”

### E06 · Pick of the Coven · 5 points

Reach a manual harvest streak of six.

Category: Farm · Evidence: existing · Challenge: common.

`streak.best >= 6`.

Example detail: “Your best manual picking streak reached×6.”

### E07 · Pale and Interesting · 5 points

Unlock Moonlight seeds on one plot.

Category: Farm · Evidence: existing · Challenge: common.

any `plotLevels >= 1`.

Example detail: “Plot 1 unlocked Moonlight seeds. Its seed level reached 1.”

### E08 · Room for a Few More · 5 points

Buy the first pumpkin barn capacity upgrade.

Category: Farm · Evidence: existing · Challenge: common.

`upgrades.storage >= 1`.

Example detail: “Your pumpkin barn storage upgrade reached tier 1.”

### E09 · Many Hands, Light Haunting · 5 points

Recruit either Shane or Natalie as a helping hand.

Category: Helpers & boost · Evidence: existing · Challenge: common.

either authoritative helper record is hired; old shared purchase migration qualifies.

Example detail: “Shane joined as your first helping hand. Natalie was still available to recruit.”

### E10 · A Brighter Spark · 5 points

Buy the first Pumpkin power tier.

Category: Helpers & boost · Evidence: existing · Challenge: common.

`farmWork.boost.power >= 1`.

Example detail: “You purchased Pumpkin power tier 1. Boost growth became×1.25.”

### E11 · Keep Your Ghoul · 5 points

Buy the first Cooler candle tier.

Category: Helpers & boost · Evidence: existing · Challenge: common.

`farmWork.boost.cooling >= 1`.

Example detail: “You purchased Cooler candle tier 1. Heat per use became 9%; cooling became 10%per second.”

### E12 · Come in from the Cold · 5 points

Enter the private house interior.

Category: Home & books · Evidence: existing · Challenge: common.

saved home `visit` activity; not merely opening its menu.

Example detail: “You entered the private house interior once. A menu preview was not counted.”

### E13 · Four Things and a Feeling · 5 points

Have four valid furniture/decor pieces placed inside the house at once.

Category: Home & books · Evidence: existing · Challenge: common.

valid `house.placed` count ≥ 4; inventory alone does not count.

Example detail: “Your house had four valid pieces placed at once: two seats, a table and a lamp.”

### E14 · Papering over the Paranormal · 5 points

Apply owned wallpaper to an open room.

Category: Home & books · Evidence: existing · Challenge: common.

valid nonempty `house.wallpapers`.

Example detail: “You applied a valid owned wallpaper to the open parlour.”

### E15 · A Shelf of Small Nightmares · 5 points

Shelve three books.

Category: Home & books · Evidence: existing · Challenge: common.

`shelvedBooks(s) >= 3`.

Example detail: “Three books were correctly shelved when this badge was earned.”

### E16 · A Couple of Characters · 5 points

Equip a non-default costume on both owners at once.

Category: Wardrobe · Evidence: existing · Challenge: common.

current valid equipment on each character; the free purple-wheelchair outfit is eligible rather than an accessibility exclusion.

Example detail: “Both owners had a non-default costume equipped at once. Natalie’s wheelchair outfit was eligible.”

## Mid game — A proper little haunt

20 entries · 300 points.

### M01 · Lantern Keeper · 15 points

Reach patch level five.

Category: Milestones · Evidence: existing · Challenge: uncommon.

`patchLevel(s).level >= 5`, honouring claimed legacy levels.

Example detail: “Your patch reached level 5, with its required home milestone complete.”

### M02 · Better with Both of Us · 15 points

Recruit both helping hands.

Category: Helpers & boost · Evidence: existing · Challenge: uncommon.

both per-owner `hired` flags.

Example detail: “Both Shane and Natalie were recruited as helping hands.”

### M03 · Practice Makes Pumpkin · 15 points

Give each owner at least one planting tier and one watering tier.

Category: Helpers & boost · Evidence: existing · Challenge: uncommon.

four qualifying skill fields ≥ 1.

Example detail: “Shane and Natalie each had planting tier 1 and watering tier 1.”

### M04 · Two for the Basket · 15 points

Train either owner's picking capacity to two.

Category: Helpers & boost · Evidence: existing · Challenge: uncommon.

a capacity tier ≥ 1.

Example detail: “Shane’s picking basket reached tier 1, allowing two ripe plots per turn.”

### M05 · Keys to the Midnight Manor · 15 points

Own the house's Midnight manor stage.

Category: Home & books · Evidence: existing · Challenge: uncommon.

`house.level >= 2`.

Example detail: “Your private house reached Midnight manor, house stage 2.”

### M06 · Light the Way · 15 points

Finish and keep or sell a carved lantern.

Category: Carving · Evidence: existing · Challenge: uncommon.

`carving.made >= 1`; lighting a preview or cancelling does not count.

Example detail: “You finished and kept your first lit carved lantern. Completed lanterns:1.”

### M07 · A Place for the Beasties · 15 points

Validly place Skyla’s crescent basket, one Harvest hound bed and Midnight supper bowls inside open rooms.

Category: Home & books · Evidence: existing · Challenge: uncommon.

Require one placed moon-cat-bed, one harvest-dog-bed and one midnight-pet-bowls in open rooms, using valid placement rules. The current game permits only one placement per item ID; do not require duplicate dog beds.

Example detail: “Skyla’s crescent basket, one Harvest hound bed and Midnight supper bowls were validly placed in open rooms.”

### M08 · Grown at Home · 15 points

Harvest a private-garden crop once.

Category: Home & books · Evidence: new · Challenge: uncommon.

successful `pickGardenBed` receipt count; placing a planter is insufficient.

Example detail: “You successfully picked a crop from a private-garden bed.”

### M09 · Meals on Little Wheels · 15 points

Purchase Maisie's food truck.

Category: Kitchen · Evidence: existing · Challenge: uncommon.

`kitchen.purchased`.

Example detail: “Maisie’s food truck purchase completed successfully.”

### M10 · Special Delivery · 15 points

Receive one paid ingredient delivery into your pantry.

Category: Kitchen · Evidence: mixed · Challenge: uncommon.

A valid saved kitchen.delivered order ID is sufficient existing proof for the first-delivery threshold; an ingredient-delivery committed event updates new counters. Never treat order placement/cancellation as delivery.

Example detail: “Paid ingredient order 7 arrived and its contents entered your pantry.”

### M11 · Supper by Candlelight · 15 points

Complete one dish in the home kitchen.

Category: Kitchen · Evidence: existing · Challenge: uncommon.

saved home `cook` activity ≥ 1; not truck production.

Example detail: “A dish finished cooking in your home kitchen. Completed home dishes:1.”

### M12 · A Well-Thumbed Spellbook · 15 points

Learn six recipes from the fixed v 1 list.

Category: Kitchen · Evidence: existing · Challenge: uncommon.

eligible learned recipe set size ≥ 6.

Example detail: “You learned six distinct recipes from the fixed launch recipe list.”

### M13 · The Cauldron Is Never Cold · 15 points

Complete 25 cooking batches.

Category: Kitchen · Evidence: existing · Challenge: uncommon.

`kitchen.ledger.batchesCooked >= 25`; portions are not batches.

Example detail: “Your combined home, truck and chef production reached 25 completed cooking batches.”

### M14 · Something for Supper · 15 points

Sell 50 food portions to paying customers.

Category: Kitchen · Evidence: existing · Challenge: uncommon.

`kitchen.ledger.foodSold >= 50`.

Example detail: “Paying customers bought 50 food portions. Supply purchases did not count.”

### M15 · Warm Hands, Warmer Hearts · 15 points

Sell 50 cups through Sandy's stand.

Category: Cocoa · Evidence: existing · Challenge: uncommon.

`festival.cocoa.sold >= 50`; use the stand's actual sold-cup meaning, not supply purchases.

Example detail: “Sandy’s stand completed 50 cup sales.”

### M16 · Beyond the Basic Mug · 15 points

Successfully sell three different deluxe cocoa/snack product IDs.

Category: Cocoa · Evidence: new · Challenge: uncommon.

a settled-sale product bitset; stock/purchases/current menu availability do not prove sales.

Example detail: “Customers paid for three distinct deluxe cocoa/snack product IDs.”

### M17 · A Little Something Extra · 15 points

Receive £100 total in customer tips.

Category: Guests & shop · Evidence: existing · Challenge: uncommon.

`totalTips(s) >= 100`; tips stay separate from product takings.

Example detail: “Your separate tips ledger reached£100:£65 at the stall and£35 inside Skyla’s shop.”

### M18 · The Neighbours Know Your Name · 15 points

Complete five neighbour orders.

Category: Guests & shop · Evidence: existing · Challenge: uncommon.

`orders.filled >= 5`; offers and expired requests do not count.

Example detail: “You filled five neighbour orders before their deadlines.”

### M19 · The Hollow Wakes · 15 points

Finish restoring The Hollow House.

Category: Attractions · Evidence: existing · Challenge: uncommon.

purchased and `hollowHouse.status === 'ready'`.

Example detail: “You purchased and fully restored The Hollow House. Its state became Ready.”

### M20 · There and Back Again · 15 points

Complete one paying visitor's hayride.

Category: Attractions · Evidence: existing · Challenge: uncommon.

`hayride.completed >= 1` and `ticketsSold >= 1`; an owner POV tour or an empty departure is not a paid visit.

Example detail: “A paid hayride ticket was charged and its visitor completed the circuit.”

## Late game — Legends of the Hollow

16 entries · 400 points.

### L01 · Our Forever Haunted Home · 25 points

Reach patch level 20.

Category: Milestones · Evidence: existing · Challenge: rare.

current/claimed level, preserving legacy recognition.

Example detail: “Your patch reached level 20. Earned legacy claims and the home goals were honoured.”

### L02 · Field of Screams · 25 points

Own all 24 v 1 pumpkin plots.

Category: Farm · Evidence: existing · Challenge: rare.

`openPlots(s) >= 24`; not the number currently planted.

Example detail: “All 24 base pumpkin plots were unlocked.”

### L03 · Five Shades of Fright · 25 points

Successfully harvest all five v 1 pumpkin varieties at least once.

Category: Farm · Evidence: new · Challenge: rare.

committed-harvest variety bitset; stock can have other origins, so do not infer the full history from it.

Example detail: “Successful harvest receipts covered Orange, Moonlight, Witchfire, Starlight and Midnight Moon.”

### L04 · Three's a Harvest · 25 points

Train both owners to picking capacity three.

Category: Helpers & boost · Evidence: existing · Challenge: rare.

both capacity tier fields equal 2.

Example detail: “Both owners had picking tier 2: three distinct ripe plots per turn each.”

### L05 · The Fast and the Frightful · 25 points

Fully train both owners' planting and watering speeds.

Category: Helpers & boost · Evidence: existing · Challenge: rare.

all four v 1 skill fields at tier 3.

Example detail: “Both owners reached tier 3 in planting and watering speed.”

### L06 · Controlled Burn · 25 points

Own all three power and all three cooling tiers.

Category: Helpers & boost · Evidence: existing · Challenge: rare.

both boost upgrade fields at 3.

Example detail: “Pumpkin power and Cooler candle both reached tier 3.”

### L07 · Life in Every Room · 25 points

Have at least three valid pieces placed in each of the four open rooms.

Category: Home & books · Evidence: existing · Challenge: rare.

per-room placement counts. Different rooms, not twelve objects in the parlour.

Example detail: “At least three valid pieces were placed in each of the parlour, bedroom, kitchen and attic.”

### L08 · Bound in Midnight · 25 points

Shelve all ten distinct books from the fixed launch collection at once.

Category: Home & books · Evidence: existing · Challenge: rare.

The union of valid shelved book IDs must contain launch-sets.books (b01 through b10). There are ten unique available books and duplicate placement is disallowed. The older 20-book Memory must not be used as this criterion or an automatic alias.

Example detail: “All ten distinct launch books were on your shelves together: b01 through b10.”

### L09 · The Costume Crypt · 25 points

Own twelve costumes from the frozen eligible v 1 collection, including at least one for each owner.

Category: Wardrobe · Evidence: existing · Challenge: rare.

unique owned IDs; exclude the baseline original outfits from the twelve, but free earned costumes are eligible.

Example detail: “You owned twelve eligible non-baseline launch costumes, including looks for both owners.”

### L10 · A Taste of Everything · 25 points

Complete ten different v 1 recipes, including three `homeOnly` dishes.

Category: Kitchen · Evidence: new · Challenge: rare.

completed-recipe set plus station-aware proof. Current v 1 has **18** recipes; do not confuse researched with cooked.

Example detail: “You completed ten different launch recipes, including three home-only dishes cooked at home.”

### L11 · Feeding the Fright · 25 points

Sell 1,000 portions of food.

Category: Kitchen · Evidence: existing · Challenge: rare.

`kitchen.ledger.foodSold >= 1000`.

Example detail: “Paying customers bought 1,000 food portions in total.”

### L12 · A Thousand Tiny Marshmallows · 25 points

Sell 500 cups through Sandy's stand.

Category: Cocoa · Evidence: existing · Challenge: rare.

`festival.cocoa.sold >= 500`; title is flavour, not a marshmallow ingredient counter.

Example detail: “Sandy’s stand completed 500 cup sales. This is a cup total, not a counted ingredient.”

### L13 · The House They Talk About · 25 points

Complete 250 paying maze visits and reach a scare rating of at least 75.

Category: Attractions · Evidence: existing · Challenge: rare.

`hollowHouse.completed >= 250` plus the current pure scare-rating selector. Not 250 owner walkthroughs.

Example detail: “250 paying maze visits were complete and the active scare rating was 75 or higher.”

### L14 · Last Tractor out of the Woods · 25 points

Complete 500 paying hayride visits, own the second tractor and both v 1 route-length upgrades.

Category: Attractions · Evidence: existing · Challenge: rare.

completed ≥ 500, fleet = 1, routeLevel = 2.

Example detail: “500 paying hayride visits were complete. You owned two tractors and both route-length upgrades.”

### L15 · Behind the Velvet Rope · 25 points

Actually admit forty Midnight Court guests.

Category: Guests & shop · Evidence: existing · Challenge: rare.

`visitorEvents.ledger.vipGuests >= 40`; `vipGroups` is a scheduled-event count, not proof that everyone arrived.

Example detail: “Forty Midnight Court guests actually entered the farm through the saved arrival process.”

### L16 · A Constellation of Candles · 25 points

Keep five finished lanterns, one from each v 1 pumpkin variety, at the same time.

Category: Carving · Evidence: existing · Challenge: rare.

current kept-lantern variety set contains all five. Keep cap is eight, so the display collection is feasible.

Example detail: “Your kept collection held five finished lanterns, one in each launch pumpkin variety.”

## Secrets — Small, strange discoveries

12 entries · 220 points.

### S01 · The Goodest Coven · 15 points

Successfully pet Skyla, Sandy and Maisie.

Category: Home & books · Evidence: new · Challenge: rare.

three accepted reachable owner/pet interaction IDs, durable set. Seeing a wag/sleep is not proof.

Clue: Three very different noses. One very good home.

Example detail: “You completed a reachable pet interaction with Skyla, Sandy and Maisie.”

### S02 · The Book Was Better · 15 points

View every page of three different library stories, including each ending.

Category: Home & books · Evidence: new · Challenge: rare.

New page-visited bitsets plus a completed-reader receipt for each story; instant text and accessible reading count, with no minimum dwell. house.reading last-page index alone is not proof.

Clue: A spine is more than a decorating score.

Example detail: “Every page and ending was viewed in three distinct books. Text speed did not affect eligibility.”

### S03 · Cool Head, Warm Patch · 15 points

Make 25 successive accepted boosts without heat reaching 80%; resting between uses is allowed.

Category: Helpers & boost · Evidence: new · Challenge: rare.

a streak counter reset only by an accepted boost reaching the threshold; rejected inputs/pause add nothing. Persist it so reload neither clears failure nor invents progress.

Clue: The brightest candle knows when to breathe.

Example detail: “You made 25 accepted boosts in a row; peak heat stayed below 80%. Resting between uses was allowed.”

### S04 · On the Slant · 15 points

Place a usable chair at least 10 degrees away from its nearest quarter-turn, then sit in that same chair.

Category: Home & books · Evidence: mixed · Challenge: rare.

Normalise the saved angle; distance from nearest multiple of 90 degrees must be 10–45 degrees, then require a committed reachable sit for that exact instance. No pixel-perfect target.

Clue: Perfectly straight is not always perfectly cosy.

Example detail: “You placed an armchair 23 degrees away from its nearest quarter-turn and sat in that exact chair.”

### S05 · I Was Only Looking · 15 points

Finish the owner’s maze walkthrough and hayride ride-along once each. Reduced-scare and assisted chapter-skip completion count.

Category: Attractions · Evidence: new · Challenge: rare.

New durable owner-tour completion receipts, distinct from paid guests. Normal/reduced-scare/assisted completion are equivalent; an ordinary early exit is not completion. Ship an explicit assisted finish path before enabling this entry.

Clue: Some tickets are paid in courage.

Example detail: “Both owner-tour completion receipts were recorded. Assisted and reduced-scare options were eligible.”

### S06 · Date Night to Dismember · 15 points

Equip Natalie as Freddy and Shane as Jason simultaneously.

Category: Wardrobe · Evidence: existing · Challenge: rare.

existing `natalie-freddy` / `shane-jason` equipment IDs. No new faces or art needed for the criterion.

Clue: The couple that scares together…

Example detail: “Natalie wore Freddy while Shane wore Jason. Both valid outfits were equipped together.”

### S07 · Something for Everyone · 15 points

Settle pumpkin, food, cocoa, maze-ticket and hayride-ticket revenue within one rolling ten-minute

Category: Guests & shop · Evidence: mixed · Challenge: rare.

five last-successful-sale timestamps. No exact visitor, price, date or random quality roll is required.

Clue: A mug, a meal, a pumpkin… and two ways to scream.

Example detail: “All five business channels settled revenue within one 600-second active-game window.”

### S08 · From Rind to Riches · 15 points

Scoop seeds from a carving pumpkin, then finish Toasted pumpkin seeds, then sell a portion of that recipe, in that order.

Category: Kitchen · Evidence: new · Challenge: rare.

New saved three-stage activity sequence. Intervening actions and reload are allowed. This proves activity order, not physical ingredient lineage; do not claim the sold portion contains the same individual seeds.

Clue: Nothing leaves a carving bench entirely useless.

Example detail: “You scooped carving seeds, completed Toasted pumpkin seeds and then sold a portion, in that order.”

### S09 · Management Is a Clean Job · 15 points

Hire both Hettie and Hattie and personally clean at least one piece of litter at any time.

Category: Guests & shop · Evidence: mixed · Challenge: rare.

two staff tiers plus manual-clean counter; the manual clean may happen before hiring, avoiding a race against the staff.

Clue: A manager need not be afraid of the broom.

Example detail: “You had hired both Hettie and Hattie and had completed a manual litter clean.”

### S10 · Even the Walls Have Company · 15 points

Have a valid wall-mounted decoration on a left wall, right wall and back wall in the home at once.

Category: Home & books · Evidence: existing · Challenge: rare.

placement layer = wall and three wall faces; absent `p.wall` means back. Avoid counting stair/door geometry.

Clue: A haunting has more than one side.

Example detail: “Valid home wall decorations occupied a left wall, a right wall and a back wall at once.”

### S11 · Two Souls, One Home · 35 points

Shane

Category: Helpers & boost · Evidence: mixed · Challenge: legendary.

bounded owner-action bitset from accepted actions. No timers, repeated-input grind or simultaneous controllers; alternate characters at your own pace.

Clue: It was always meant to be played together.

Example detail: “Both owners completed all six controlled activities: plant, water, pick, wardrobe, reading and petting.”

### S12 · The Last Lantern · 35 points

Unlock all other 63 achievements in this frozen v 1 catalogue.

Category: Milestones · Evidence: existing · Challenge: legendary.

achievement receipt IDs, not score arithmetic. Future expansion achievements do not enlarge the requirement.

Clue: Every small story leaves a little light.

Example detail: “All other 63 fixed base-volume achievement IDs had permanent unlock receipts.”
