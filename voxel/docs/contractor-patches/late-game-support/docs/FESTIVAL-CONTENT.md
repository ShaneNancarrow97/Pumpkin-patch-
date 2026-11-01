# Three proposed Festival Nights

This is content for Claude to review, backed by current catalogue references.
It is **not an installed event system**. No timers, invitations, rewards, save
fields, menu entry points or economic bonuses are added to the playable game.
The three reward IDs remain unregistered cosmetic concepts; their model/art
assets can be inspected independently before any progression design is adopted.

The aim is to give completed businesses a shared purpose. An evening asks the
player to prepare a menu, welcome guests through existing attractions and give
them a good visit. The lasting reward belongs in the player's home. This makes
rides, food, the garden and interior decoration support one another.

| Evening | Suggested unlock | Existing menu | Cosmetic reward |
| --- | ---: | --- | --- |
| Midnight Court Banquet | 13 | Haunted harvest pie; Moonlight tart | Midnight Banquet Candelabrum |
| Lanterns in the Mist | 15 | Harvest cauldron broth; Bramble crumble | Moonlit Wardian Conservatory |
| The Last Wagon | 18 | Pumpkin seed brittle; Pumpkin spice biscuits | Clockwork Hayride Theatre |

The names, letters, preparation cards and four goal alternatives for each evening
are in `data/festival-themes.json`. The JSON carries `status: "proposal"`,
`integrationStatus: "not-installed"` and suggested/unbalanced target labels.

## The experience

**Midnight Court Banquet** gives high-value food and tickets a common audience.
Guests retain the same finite purse for every purchase, so the player decides
how to divide value across their evening. The VIP upgrade already unlocks at10;
both dishes and the required kitchen can be ready before13. Twelve menu
servings, twelve attraction guests, four served VIPs and ten happy departures
are suggested alternatives; any three would complete the evening.

**Lanterns in the Mist** offers a gentler hosting focus: warm cocoa, a good
welcome and a useful kitchen garden. The suggested alternatives are sixteen
cocoas, twelve attraction guests, ten very happy departures or eight harvested
garden ingredients. Players can choose three without buying garden beds; the
harvest alternative supports people who enjoy actively tending their grounds.
The recommended vegetables, herbs and berries all feed the existing menu.

**The Last Wagon** gives the complete extended woodland route a collection goal.
It asks for returned riders, takeaway snacks, smooth boarding or happy guests.
The second tractor can help but is not an entry requirement; the queue goal is
one optional route to completion. Both route extensions are available by18.
This proposal does not by itself fix the current route upgrade's economic
payoff after scare saturation; that decision belongs with the lead's balancing.

## Accessibility and session rules to retain

- Preparation is untimed. Cooking and deliveries can be arranged at the
  player's pace before explicitly starting the operational evening.
- The suggested20-minute operation is a planning reference, **not a deadline or
  completion-time promise**. An integrated implementation should let the player
  continue or end it without penalties. All counters/clocks pause with the game.
- Nothing expires or simulates an event failure when the game is closed.
- A player can use existing automation for service goals or choose an active
  garden alternative. No goal requires a thumbstick, manual harvest speed or
  mandatory repair work.
- Use the current visitor caps and invitation mechanisms. A themed evening
  must not create a second spending wallet or flood the farm with extra NPCs.
- A permanent cosmetic unlock is granted once, after authoritative completion.
  Repeats may create a future event-history entry, not duplicate items or a
  repeatable coin/stat-bonus source. No new currency is specified here.

The counts are draft tuning values. They need whole-venue playtests, including
stock, guest wallets and queues, before the live game promises their difficulty.
The separate ride-capacity audit does not validate Festival Night completion
times or economic rewards.

## Data and integration boundary

`themes[].prerequisites` refers to current recipe, kitchen equipment, guest-event,
cocoa and attraction IDs. Recipe research still has to be purchased; an evening
unlock must not silently grant recipes or house equipment. The kitchen gate uses required capabilities; `suggestedKitchenEquipmentIds`
are starter examples, not compulsory purchases. A placed premium copper range
can satisfy the same hob/oven/pot/pan/tray needs. Equipment only works when placed
in the actual kitchen, as the current rules require.

`goals.choose` is3 with four alternatives. Each option has its own `metricId`,
positive target, explicit unit, counting window and conditions. `metricDefinitions`
documents the authoritative transaction/outcome an adapter would need. The
preview displays these contracts; it performs no transactions or event grants.

Most counters begin at explicit session start. The garden alternative has a
`preparation-or-session` window so genuine harvests after choosing the evening
can count while there is still no preparation timer. Pantry ingredients currently
do not carry their origin, so the goal counts **successful garden harvests**;
it never claims to trace whether a cooked dish used home-grown ingredients.

An event bridge should consume completed food/cocoa receipts and true paid
attraction completions, deduplicated by source and receipt/visit ID. Distinct
guest goals also deduplicate by visitor ID. Capture the convoy's route at
departure: purchasing a route while a wagon is travelling must not retroactively
change which route its passengers completed. Sample happiness at final departure,
not a temporary return from the woods. Capture actual queue waiting before
admission/boarding; changing boarding bay must not erase it.

Do not infer a successful visit from an NPC disappearing off screen, a service
animation, a quoted price or a renderer notification. Current fear/return labels
need the review in this pack's `findings/AUDIT.md` before using them as a new
event outcome.

The `contract-trophy-*` reward IDs are reserved only within this pack. Before
registering them, the lead should adopt measured model dimensions, add normal
furniture ownership/placement handling and decide the once-only cosmetic award
transaction. No event runtime, save migration, recipe price or live reward grant
is supplied by this content file.

## Validation

From the repository root:

```sh
node --test voxel/docs/contractor-patches/late-game-support/test/content.test.mjs
```

The tests verify real catalogue references, recipe/equipment compatibility,
attainable unlock gates, route requirements, optional garden alternatives,
reward ID isolation and the no-deadline/no-offline-penalty policy. They do not
claim that the proposed goal targets are balanced or that an event engine exists.
