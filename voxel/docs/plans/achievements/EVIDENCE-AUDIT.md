# Achievement plan — evidence and dependency audit

Read-only review of `/workspace/boost-helping-hands`, implementation `2b50fa37a58b8c87132b290fc2bfc0af79f852c6`, handover head `87714df8a6e3f158ce3e6e6279f14777e5749954`. This is a planning aid, not an implemented achievement system.

## What is already true

The game has **17 automatic Memories**, **23 paid/claimable Favours**, 20 farm levels, 18 recipes and 20 costume catalogue entries at this source revision. Memories already cover first harvests, visitors, seeds, a helping hand, boost taps, businesses, books, costumes, money and levels. Plan one shared accomplishment identity/presentation bridge where these overlap; do not add another coin payment or a second competing toast for the same milestone.

| System / existing source | What it can honestly prove now | What it cannot prove |
| --- | --- | --- |
| `s.harvested`, `s.taps`; `rules/farm.js` | Total pumpkins obtained through harvest and big-pumpkin idle rewards; accepted boost uses | Distinct planted beds, manual crop picks, owner split, per-variety lifetime harvests or historical heat |
| `s.sold`, `stall.*`, `shop.*`; `rules/selling.js` | Served pumpkin customers, pumpkin units and route takings | All arriving visitors, happy exits, every food/cocoa customer or gross/net profit of the whole farm |
| `farmWork.helpers`, `farmWork.boost`; `rules/farm-work.js` | Current per-owner hire and skill tiers; current heat/power/cooling, current lockout | Number of each helper's completed jobs, overheat count, streak of heat-safe uses, controlled-owner historical work |
| `house.level`, placed pieces, wallpapers, `shelvedBooks`, `spookyScore`; `rules/house.js` | Current expansion, furnished-room/category counts, shelved books, current haunting score | Historic maximum after storing items, all pages read, exact past interaction sequence |
| `house.reading[id]` | Last remembered page for that book | Every page visited, sequential reading, reading duration or completion; it can jump directly to any valid page |
| `progression.homeActivities` | Completed actions recorded by existing callers, including visits, wardrobe use and home cook events | A clean owner split; harvest value is action count rather than pumpkin units; do not assume every decorate menu action maps to a unique placed item |
| `kitchen.recipes`, upgrades and placed kitchen capabilities | Learned recipe IDs, bought chef/equipment, actual equipped home cooker/pan/oven/spices | Cooked every recipe merely because it is learned; buying equipment is not placing it in the kitchen |
| `kitchen.ledger.batchesCooked`, `foodSold`, `foodIncome` | Combined cooking batches and actual food portions sold | Home/truck/chef splits or all-recipe history; receipt log is only the last 32 sales |
| `festival.cocoa` and cocoa extras | Stand tier, paid supply/automation, aggregate cups sold/gross and available per-special counters | A fully satisfied thirsty guest, every special sold unless explicitly persisted, exact historical service chain |
| `hollowHouse` / `hayride` tickets, completed, tiers, haunts | Tickets actually charged, completed attraction visits, bought tiers/scares, current ratings, hayride fleet/route level | Owner POV tours as paid guests; exact tour completion/watch history; a particular guest's whole multi-business journey after guest removal |
| `customerCare.tips`, `tipped`, `graded` | Separate actual tips, count of tipped sales, total graded pumpkins | Every historic exact quality/service combination; care receipts retain only 12 entries |
| `visitorEvents.ledger` | VIP/rush groups/guests generated or admitted through the recorded event path | All members purchased, all left happy, or a group had enough money for every service |
| `cleanliness.cleaned`, janitor tier | Total cleaned litter and current caretaker hire count | Hand cleaning versus janitors; a continuous spotless interval; swept every location |
| `wardrobe.owned`, equipped | Current owned/equipped catalogue IDs | Bought versus free level grant; wore a full set historically; ownership of Natalie’s wheelchair is free by default, so “obtain wheelchair” is not a meaningful challenge |
| `carving.made`, sold, current/kept lantern data | Total finished/sold lanterns and properties of currently retained carvings | All historic shapes/stencils/colours after selling; only eight kept lanterns survive; `cookAnimations` similarly means presentation seen, not cooking proof |
| Pets / `scene.player.rest('pet',...)` | Current character enters a petting pose in the renderer | A completed, saved pet interaction, feeding result or pet-specific lifetime bond; needs a committed gameplay event |

Income wording matters: `s.earned` includes recognised rewards, while `levelEarnings(s)` removes progression bonus-earned treatment; neither is automatically net operating profit. Use “total earned” for its documented existing semantics, or add a deliberately defined business-revenue ledger. Never label current coin balance “lifetime earnings”.

## Minimal new evidence layer

### Placement and book limits confirmed during catalogue review

`buyDecor` rejects a second purchase of an owned ID, and `placeDecor` rejects an ID already placed. The shipped catalogue contains ten unique book IDs (`b01`–`b10`), and book placement also prevents duplicate use. Consequently the new catalogue requires one cat basket, one dog bed and one bowl set, and the library mastery goal is all ten launch books. Requiring two copies of `harvest-dog-bed` or twenty simultaneously shelved books would be impossible. The existing twenty-book Memory is an older design issue for Claude to review separately; it is not copied into the achievement criteria or used as a retroactive alias. The pet renderer's expectation of a second dog-bed instance is another separate lead follow-up, not changed by this plan.

Add namespaced durable stats from successful **transactions/completed actions**, rather than inferred DOM/sprites: manual plant/water/pick by owner; plot crops/units by variety; helper jobs by owner; accepted heat-safe boost sequence/overheat transitions; cooked batches by station/recipe and automatic flag; pet interaction sets; completed book-page sets; manual versus janitor litter; actual owner tour completion. Use launch catalogue ID sets for “all” goals so adding later recipes/costumes does not revoke an earned achievement or silently move the finish line.

Transient sequences need explicit bounded state with their rule: same-session is unfair if reload loses progress; prefer saved active-game-time windows, stage state and source-qualified IDs. A resumed attempt must retain its baseline and failure state. A rollback/reload must not replay successful transactions or reroll a rare receipt.

The existing farm/helper transaction events already include owner on automatic work; manual completion is committed in `main.js:commitPlayerWork` and must explicitly provide source/owner. Sale events differ by route (`visitor` outdoors, `customer` inside); never join them as a single global ID without route/visit identity. Cooking events contain station/recipe/quantity but should add job/batch/automatic provenance before achievement consumption. Some purchases/placements are direct rules without a shared event bus, so return/emit a committed event there or reconcile stable ownership after success.

## Migration and receipt contract

- New schema version must be reviewed by Claude; do not assert “version 16” while other unpublished lead work may already use it.
- Retro-award **only provable** totals/current ownership/current configurations or existing matching memory IDs. Mark details “Recognised from existing progress” with import time, not an invented historical timestamp.
- New source-specific counters start at zero with a visible “Tracked since this update” note. Do not turn all historical harvested pumpkins into manual work or all old cooked batches into home cooking.
- Persist an achievement receipt keyed by stable achievement ID/revision, containing unlocked-at game time, evidence snapshot, reward receipt and seen/queued presentation status. Earned stays earned after selling furniture, changing clothes or future balance changes.
- Grant once in pure rules, before the toast. Reload, queue dismissal, viewing details or replaying the toast cannot grant again. Cosmetic duplicates stay cosmetic; if coins are used, add both earned and `progression.bonusEarned` consistently so achievements cannot level-farm themselves. Prefer nonspendable Haunt Score and a few milestone cosmetics, no recurring income multiplier.
- A receipt can legitimately unlock more than one milestone. Reconcile/sort once, enqueue at most one visible toast and coalesce a migration backlog into “X achievements recognised”, with an archive entry rather than a burst of 20 interruptions.

## Toast and library integration

Use an original purple/charcoal + amber achievement pill inspired by the **behaviour** of an Xbox unlock, not Xbox branding/green platform UI. One badge, “Achievement unlocked”, short name, +score. Around five seconds; pointer hover/focus pauses its timer. Click/confirm opens that specific detail sheet with what was done, current/target or final evidence, reward and date. An opaque close target must not also open the card.

Priority order: urgent controls/transactions and cinematic input boundary → level celebration → achievement → ordinary notice. Defer achievement toasts during ride scares, intro, carving input, furniture drag/rotation, modal purchase hold, paused game and hidden document. Do not interrupt a held tool or steal controller focus. Normal world simulation remains live behind an optional detail/library sheet; its input boundary follows existing menu conventions. The achievement queue is separate from rewards already granted.

More/Journal → Achievements should expose All / Early / Mid / Late / Secrets, unlocked/locked filters and search. “Rare” is a designer difficulty tag without online telemetry; **never invent “0.3% of players unlocked”**. Locked secrets show a deliberate clue and a reveal toggle, not random fake lore. Completed details remain revisitable after a toast fades. Readable cream typography, 44px targets, fold safe areas, reduced motion/static variant and optional sound/haptics.

## Deterministic obscure candidates

These are achievable on purpose with a clue; all need the named proof rather than luck or hidden wall-clock dates:

1. **Cool Under Candlelight:** 20 accepted boosts in an active-time attempt without heat ever reaching 80%. Saved sequence counter + peak heat, no need to trigger overheating.
2. **We’re Going to Need a Bigger Basket:** one controlled local three-plot pick using a capacity-3 owner; actual distinct crop IDs, no helper provenance.
3. **One More Chapter:** read all pages of three different books, then complete a seated reading interaction; page sets and completed interaction event.
4. **Three Beds, No Waiting:** manually plant → water → later pick one crop as Shane, repeat as Natalie; per-crop planted/last-care owner stamps and completed manual actions, no timed precision.
5. **The Last Warm Mug:** a real cocoa sale with exactly one pre-sale cup remaining, never buying/throwing stock away as its requirement; committed supply snapshot and successful payment.
6. **Waste Not, Haunt Not:** carve a pumpkin, keep some extracted seeds in the pantry, then complete a recipe consuming those seeds; tracked seed origin allocation so ordinary bought seeds do not falsely prove the chain.
7. **Same Scare, New Curtains:** retain a specified launch haunting score after replacing a foyer wallpaper, with a valid reachable ticket desk and open attraction; use rules/configuration proof, not camera screenshot.
8. **Four Rooms, One Story:** currently shelve a book and place a light in each of all four rooms; existing current-state proof, no reading history required. Must name the concrete category requirements in revealed details.

Avoid mandatory “watch the whole scare with no skip”, performance/FPS-dependent feats, random tip/rare-NPC rolls with no alternative, real midnight login, no-disability/control-mode restrictions, all-costumes dynamic targets, no-spend fresh-save missables or achievements requiring intentionally poor guest treatment. Designer “obscure” can be delightful discovery rather than punitive secrecy.

## Dependency and delivery risks

| Piece | Key risk / proof before implementation |
| --- | --- |
| Catalogue / scoring | Validate stable IDs, 64 entries, exact 1,000 score if chosen, bounded conditions, no circular meta-achievement dependencies |
| Existing Memories/Favours | Preserve IDs/claims; map shared milestone evidence and suppress duplicate celebrations/reward grants |
| Pure metrics / save | Correct provenance, clamped durable counters, old-save honest backfill, receipt idempotency and changing catalogue tests |
| Business receipts | Finite purses and stock already own money; achievements observe payment, never simulate a second sale |
| Manual/controller work | Successful completed rule transactions, not pose starts, cancelled holds, purchased skill alone or visual animation ticks |
| Toast queue / audio | Deferred priority, no stale focus, bounded presentation backlog, no repeated jingle on load; reduced motion and mute respected |
| Library/details | Click exact toast→exact evidence; pad navigation and back; mobile scroll and clear filters; secret reveal does not grant completion |
| Future content | Mothlight Village is a plan, not current gameplay. Village quests/materials/bonds must be a separate future catalogue pack, excluded from base completion/1,000 score until actually shipped |

Suggested implementation phases: catalogue/evidence definitions → pure receipt and migration tests → source-qualified event hooks → toast/details/library UI → queue/controller/accessibility checks → a single end-to-end unlock across each domain → full progression/economy regression. No asset generation or runtime change is needed for this planning task.
