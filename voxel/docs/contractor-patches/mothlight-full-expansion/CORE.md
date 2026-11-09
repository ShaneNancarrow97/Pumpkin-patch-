# Expansion rules, progression and saved state

The core supplies 23 restoration/main-story chapters, plus the cast module’s41 supplemental personal chapters:64 chapters,201 positioned activities and36 renewable cave seams. Main activities belong to the real area where they are performed. Legacy village quests retain their original IDs and rewards.

## Contracts

`content/village-expansion.js` exports `EXPANSION_AREAS`, `EXPANSION_ACTIVITIES`, `EXPANSION_CHAPTERS`, their by-ID maps, `EXPANSION_VEINS`, `EXPANSION_GEMS` and `EXPANSION_LEVEL_GATES`. Surface coordinates and cave-local coordinates are world units, projected from the design grid with PLAN_SCALE1.5 exactly once. `normaliseExpansionActivity` gives authored cast puzzles the same runtime interface as main activities.

`model.js` re-exports the core, companion, economy and outfit APIs. The mutation boundary is `actVillageExpansion(state,activityId,action) -> {ok,reason,events,complete?}`. Hints and partial puzzle choices return `ok:true` without `complete`; a completed transaction returns `complete:true`. UI callers pass `{area,x,z}` (or `context`/`position` containing them), so stale or distant input cannot transact. Required earlier chapter steps, pause, live costs, farm production and area gates are rechecked in the rule.

- `expansionAreaInfo(s,id)` provides `.open`, `.reason`, `.spawn`, `.bounds` and `.layer`.
- `enterVillageExpansionArea(s,id)` validates entry and persists the active area; the view handles its own scene switch.
- `expansionActivityInfo(s,id)` provides `.available`, `.canAct`, `.done`, `.visible`, progress, description, options and cost rows. Only current steps and completed restoration/reveal landmarks have visible activity markers. The journal can still describe locked chapters.
- `expansionJournal(s)` and `villageExpansionStatus(s)` return read-only chapter/reward/area information. `actVillageExpansion(s,'track',{chapter})` saves a followed chapter.
- `hasExpansionReward(s,flag)` reads existing completed chapter/effect flags.
- `expansionLevelRequirement(s,level)` reads flags and honoured claimed levels only. It never calls patchLevel and is safe inside homeRequirements.
- `sellExpansionGem` consumes actual unreserved gems, pays once through coins/earned and requires Rowan’s stall.

Navigation and home-goal code import the dependency-light `rules/village-expansion-access.js`, not the full rules module. That separation prevents the navigation→rules→legacy-village→node-sites initialisation cycle. Standalone navigation followed by model import is verified.

## Four different puzzle validators

Sequence puzzles record ordered marks. Flavour puzzles toggle an unordered ingredient set and require Submit. Stage puzzles assign unique cues to named slots and require Submit. Light puzzles rotate three straight/corner components and trace the actual connected ports from the source to the exit; they do not accept a memorised button order. Incorrect answers cost no materials. Hint, Reset and accessible Solve are supported across all kinds, with identical chapter rewards.

Actions are `{choice:string|index}`, `{rotate:componentId}`, `{slot,choice}`, `{submit:true}`, `{hint:true}`, `{reset:true}` and `{solve:true}`. Query fields include `.puzzleKind`, `.selected`, `.rotations`, `.assignments`, `.components`, `.slots`, `.source` and `.exit` as appropriate.

## Real rewards and production

Chapter rewards settle once, using existing grantVillage/addFriendship authority and real catalogue entries. Village decorations are classified into village inventory; home furnishings go into home copies. Tansy grants two actual estate herb-planters. Cinder and Granny grant the economy module’s real recipes. Effects expose the paid cold-store blueprint, preservation research, commissions, scenery and reservations without duplicating their purchases.

Story bonus coins remain excluded from farm-level earnings through the existing progression bonus ledger. Gem sales are actual trade and do count. New farming/cooking tasks take a baseline when that instruction becomes current; previously cooked batches and harvests do not count as fresh preparation. No free food or pumpkin is invented by the objective.

Lantern Night additionally requires a real supper delivery: twelve unreserved, unspoiled pumpkins and four unreserved cooked portions. The rule checks both supplies before spending either, preserves guest baskets/orders and records the completed delivery once. Expired produce is settled before acceptance. Unused promised effect flags have been removed; rewards retain implemented furnishing, recipe, preservation, reservation and attraction benefits.

Successful surface gathering and cave mining call recordCompanionGather with a stable node/cycle key. Its bounded fifth-gather bonus is reflected in the actual material inventory, event quantity and gathered total. Full piles and repeated interactions cannot award another companion bonus.

## Mining, persistence and gates

Each cave depth has12 renewable seams, returning after480 active village seconds. The rare draw is deterministic from the saved seed, node ID and cycle; a rare gem is guaranteed by the tenth eligible seam. Full material/gem capacity leaves the seam and pity intact. Story veins put their guaranteed sample into protected questItems, separate from sellable gems. Pause freezes regrowth. Raw sale prices are£40/£70/£110 by depth.

Save version19 adds `village.expansion`: area, effects, completed activities/chapters, puzzle states, gems, veins/pity, protected quest items, receipt keys, fresh-production baselines, cosmetic choices, tracked chapter, seed, gem income, economy, companions and outfit presets. Restore validates known content IDs, limits counters and preserves meaningful partial puzzle state. Existing version18 farms migrate additively. A fresh save round-trips without manufacturing extra state.

The model restores expansion/economy before aged stock is settled, retaining purchased cold-store lifetime on load. Economy ticks receive attenuated farm time; cave and village activity clocks receive full village time. Existing save/export authority is unchanged.

Area progression is Green invitation; Copse6 + Two Doorbells; Quarry9 + Copse restored; Moor12 + restaurant opening; Marsh15 + four seals; Acre8 + Copse restored; caves6/9/15 with their story prerequisites. Level requirements9/12/15/18 read Copse/restaurant/four-seals/Marsh completion. Previously claimed levels remain honoured. The level8 Green ward is not required to open Copse6.

The four-seal gate derives from the actual Green, Copse, Quarry and Moor seal flags. A stray stored aggregate flag cannot open the Marsh; restoration repairs it, and completing Green after the other three seals opens the Marsh immediately.

## Dependency matrix and verification

| Change | Affected consumers / protection |
| --- | --- |
| World-unit area/activity data | Renderer, collision, map, waypoint and runtime input must share the same records; do not scale twice. |
| Access helper | Keep it free of legacy reward/economy imports and module-time state reads; level requirement cannot call patchLevel. |
| Chapter transaction | UI/view may display or animate, but never independently grant or charge. Preserve receipts on migration. |
| Cast integration | Canonical flattened IDs keep giver, rank, previous chapter and actual reward catalogues aligned. |
| Farm baselines | Use successful cooking/harvest counters, not inventory quantities or opening the menu. |
| Mining lifecycle | Keep vein/cycle/seed/pity together; reloading cannot reroll an unmined seam. |
| Companion bonus | Commit once after successful base gathering; preserve stable job keys and capacity checks. |
| Economy restore/order | Load cold-storage state before expiry; update jobs and reservations using farm dt. |

`test/village-expansion.test.mjs` exercises migrations, catalogue integrity, all main story dependencies, once-only settlement, current-step visibility, live costs, four puzzle mechanisms, guaranteed quest samples, rare pity, full storage, deterministic reloads, pause, fresh cooking, both actual companion gather hooks, the four-seal aggregate and real festival deliveries. Delivery regressions cover insufficient stock/food, guest reservations, expiry, no partial spend, exact consumption and replay after reload. The combined core/cast/companion/economy/legacy command executed56 named tests with no failures. Proof: `/tmp/expansion-core-broad.log` (root delivery may retain it in verification).

The main reachability fixture declares a level20 farm with imported claimed levels, accessible materials, known friendship, twelve fresh pumpkins and a purchased kitchen holding four cooked portions, then executes the actual rule actions. Farm production counters are explicit successful-production fixtures. Focused festival tests declare their arranged-programme checkpoint separately. This proves transaction/dependency behavior, not campaign duration, world collision reachability, browser presentation or physical hardware; those require the separate world/runtime and final delivery checks.
