# Living Mothlight: design and integration dependencies

This continuation makes Hollow Green's existing restoration chapter playable through its decorating, almanac and workshop interfaces. It adds purposeful neighbour routines and a visual pass around the Moth Tree while retaining the farm's one saved state, clock and renderer.

Contractor branch: `contractor/mothlight-living-village`. Incremental base: `e2cd697` (`Verify phone and desktop farm flows and the contractor patch download`), which already includes the saved Green visit and offline narration work. The last lead revision recorded by the predecessor handover is `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`. That is historical integration context, not a claim of a fresh remote check.

Read the preceding [saved-village handover](../village-design-and-cast/README.md), [original roadmap](../village-design-and-cast/ROADMAP.md) and [narration handover](../mothlight-voices/README.md) before applying shared adapters. Applying this increment directly to Claude's explorer-only village would omit required travel, save and dialogue integration. Final build hashes, downloads and browser evidence belong in the release README; this document records design and merge contracts.

## The completed Green loop

The authored quests remain in `content/village-quests.js`. This continuation exposes their missing actions rather than introducing a parallel quest engine.

1. Reach patch level 3, accept Elowen's invitation, watch or deliberately skip the tour, and complete Rowan's and Elowen's conversations. The once-only introduction unlocks gathering and satisfies the existing level-4 home goal.
2. Gather logs, stone, fibre and herbs on the Green. The Satchel shows each material's capacity, ready spots and next respawn; Find turns the camera towards a suitable gathering spot.
3. Complete Loose Boards and Open for Business to repair the bench and reopen Rowan's rotating stall. Buy village decorations or farmhouse pieces with their original inventory destinations and prices.
4. Recover Elowen's three letter pages, including the page beside the farm patch. Her reward opens the almanac. The panel displays its four current duties, automatic payments and next page prize.
5. Complete A Door of His Own and A Room for Quiet Wings. Their material and coin deliveries raise the existing workshop and conservatory variants. Place a light, seat and books by Elowen's door to finish the reading nook. The original letter and friendship rewards provide useful pieces; Rowan always stocks a stool.
6. Complete Two Doorbells with ten pumpkins, a newly cooked batch and the supper conversation. Cooking uses the existing level-5 food truck/home kitchen system. The Journal explains the prerequisite when the quest is offered before cooking opens.
7. Continue chats, finite gifts, produce favours, almanac pages, decorating and Rowan's practical upgrades. The existing Ink by Pumpkinlight and A Door Made of Pumpkin quests still lead back to farm sales and carving.

The Journal now supports an explicit followed quest, current material/item requirements, practical next actions, completed stories and friendship keepsakes. Following a quest changes the HUD preference; it never advances the quest. Map destinations remain camera views, not teleportation or automatic travel routes.

Decorate provides stored/placed collections, categories, placement previews, movement, 15-degree turns, Store, Cancel and Undo. Pointer/touch, keyboard and controller actions call the same rules. Pending previews never spend inventory or enter a save. Undo restores an earlier layout while conserving the inventory that exists now, including later purchases and quest rewards; it does not rewind coins, quest progress, almanac counters or reward claims.

## What remains outside this chapter

| Area | Current state and remaining work |
| --- | --- |
| Moonroot Copse | World and cast art exist. Complete Mabel/Tansy's quests, relationships, interiors, bramble opening and material routes before opening it. |
| Lantern Quarry | World and cast art exist. Complete Opal/Cinder's chapter, access rules and iron/clay progression before opening it. |
| Carnival Moor | Fairground scenery exists. Its venues, resident chapter and operating economy still need a complete playable implementation. |
| Mirror Marsh | World and cast art exist. Its quests, access and observatory progression remain future work. |
| Quest followers | Elowen and Rowan now follow short local routines. They do not follow the player on an escort quest. Such followers still need explicit quest ownership, reachable trails and door/district handoffs. |
| Path building | Existing authored roads stay protected. A player path-painting tool and route guidance are not part of this increment. |
| Other residents | Their artwork and profiles remain available to the explorer. Only Elowen and Rowan have playable Green friendship state; Vesper remains the tavern host. |
| Recorded speech | The previous delivery contains 164 of 332 catalogued recordings. Missing lines retain readable text and existing playback fallback. This increment makes no synthesis/API calls and does not claim new recordings. |

`districtOpen()` still opens only the Green. The supper's `copse-hint` remains a story hint. Scenery, map labels, artwork and a completed Green finale do not bypass later gates.

## Architecture and dependency matrix

| Area / integration owner | Files and interfaces | Dependencies and merge boundary |
| --- | --- | --- |
| Green rules and progression | `rules/village.js`, `content/village-upgrades.js`, `rules/village-upgrades.js` | Own all currency, inventory, cooldowns, requirements and once-only claims. `model.js` already re-exports village rules, so no separate saved upgrade system is introduced. Keep these APIs authoritative when adapting UI. |
| Cooking reward preservation | `rules/cooking.js`: `restoreKitchen`, `buyFoodTruck` | Preserve valid gifted recipes before the truck is purchased and union them with the starter recipe when it is bought. This is a narrow shared cooking fix; preserve Claude's current equipment, sales and ingredient rules. |
| Saved village controller / shared runtime | `village-game.js`, `main.js`, `scene.js` | Main owns the farm update loop and event delivery; scene owns rendering and the active view; the village controller owns interaction and calls rules. Shared lead files require hunk-level integration against ongoing Claude work. |
| Chapter panels | `ui/village-chapters.js`, `ui/village-chapters.css` | Pure markup for Journal, Map, Satchel, Almanac, upgrades and stall. Buttons carry action IDs; the controller performs transactions. Panel redraw preserves scroll, expanded details and actionable focus. |
| Touch, controller and keyboard boundary | `ui/village-controls.js`, `ui/village-controls.css`, controller hooks in `village-game.js` | Two touch pointers own movement/look separately. Pad edge detection, stick suppression after transitions and disconnect handling prevent held input crossing into a new mode. One owner processes a pad action each frame. |
| Decorating UI and gestures | `ui/village-decorate.js`, `ui/village-decorate.css`, view `preview()` and gesture hooks | Selection/preview/undo history are transient. Commit goes through `placeVillageDecor`, `moveVillageDecor` or `storeVillageDecor`; Undo uses `restoreVillageDecor`. The view only displays a ghost or temporary transform. |
| Placement and walking geometry | `rules/village-decor-geometry.js`, `rules/village-navigation.js`, `rules/village.js` | Shared measured bounds and oriented containment connect rule placement, player collision and residents. Static exclusions cover buildings, walls, furniture and water; placement also protects authored roads, home plots and gathering nodes. Update these together if a model footprint changes. |
| Resident life | `rules/village-resident-life.js`, `village-folk.js`, `village-sprite-math.js`, `village-sprite-actors.js` | Deterministic transient routes use current saved restoration flags and shared obstacles. Pick meshes and talk prompts follow live positions. Existing painted sheets supply walking frames; no replacement owner/visitor atlas is needed. |
| Village view / lead overlap | `village-view.js`, `village-folk.js` | Synchronise homes, nodes, pages and decor from the saved state. Pause the speaking resident during conversation and all local routines during decorating, interiors and tours. Preserve visibility-aware picks, narration timing, shared portrait/sprite assets and the fixed light pool. |
| Visual atmosphere / lead world overlap | `village-models.js`, `village-world.js`, `village-atmosphere.js` | Moth reliefs, lamp banners, plaza details and restored-home craft details extend existing batches. Moths/particles add two instanced draws and no lights or image assets. Keep model bounds, material/emission limits and pooled lighting intact. |
| Offline build and CSS order | `build.mjs` | Inline the new village styles and imports in the existing offline build. Retain the previous narration import map and all runtime assets. Do not replace the lead's unrelated build adapters. |
| Regression evidence | `test/village-progression.test.mjs`, `test/village-chapters.test.mjs`, `test/village-controls.test.mjs`, `test/village-resident-life.test.mjs`, `test/village-atmosphere.test.mjs` and updated village tests | Cover rule correctness, rendered action contracts, input state, routes, footprints and budgets. Browser scripts check the integrated DOM/canvas flows; final screenshot/build receipts remain separate. |

The contractor split follows these boundaries: progression owns content/rules and the small recipe-preservation fix; decorating owns its UI and navigation additions; controls owns input/TV styling; village art/life owns routines and visual batches; the integrating contractor owns `main.js`, `scene.js`, `village-game.js`, `village-view.js`, build and final delivery. Claude remains the lead owner of shared runtime integration. The branch preserves the predecessor's work and should be reviewed in an isolated integration worktree rather than replacing an unpublished lead checkout.

## Public rule interfaces

| API | Contract |
| --- | --- |
| `villageUpgradeStock(s)` / `villageUpgradeInfo(s,id)` | Read-only quotes: identity, description, coin/material requirements, restoration/prior-upgrade gates, ownership, affordability and `canBuy`. |
| `buyVillageUpgrade(s,id)` | Rechecks the quote, then charges coins/materials atomically and records one ownership effect. Returns false without charging when already owned, locked, paused or unaffordable. |
| `villageMaterialCapacity(s)` | Capacity per material: 40 initially, 60 with pockets, 80 with the frame. Also accepts the village record during restoration. |
| `villageGatheringYield(s,material)` / `villageGatheringWait(s,material)` | Shared gathering quantities/waits for rules and UI. Full capacity leaves the node available; a partial pickup stops at capacity. |
| `questRequirementRows(s,id)` / `questStepHint(s,id)` | Individual requirements and practical next actions for the current step. They do not mutate or complete a quest. |
| `handOver(s,who,questId?)` / `doHandOver(s,who,questId?)` | Optional quest ID selects the intended active chapter, so an older unfinished request cannot divert a Journal delivery. |
| `almanacPage(s)` / `almanacPrize(s)` | Read the current duties and next prize. Existing `updateVillage()` settles rewards automatically; there is no separate claim transaction. |
| `villageDecorBounds(...)` / `villageDecorContains(...)` | Shared rectangle geometry for placement, actor clearance and collision. Saved coordinates remain realm coordinates. |
| `restoreVillageDecor(s,snapshot)` | Validate a previous layout atomically, then recompute stored quantities from current total ownership. Preserve newer rewards/purchases and all non-layout progress. |

## Balance and once-only rewards

All new purchases use existing coins and Green materials. No new currency, sell-price multiplier or direct farm-production multiplier is added. Rowan's existing friendship rewards remain the connection to barn upgrades, farmhouse furnishings, costumes and other farm benefits.

| Upgrade | Gate | Cost | Benefit |
| --- | --- | --- | --- |
| Extra satchel pockets | Finish Open for Business | £120 + 4 fibre | 60 of each material |
| A sturdy satchel frame | Finish A Door of His Own; own pockets | £280 + 6 logs + 6 fibre | 80 of each material |
| A careful gathering kit | Finish Open for Business | £200 + 4 logs + 4 fibre | Green nodes return 15% sooner |
| Timber and stone straps | Finish A Door of His Own; own the kit | £350 + 8 logs + 6 stone + 4 fibre | 3 logs/stone per pile instead of 2 |

The kit changes future Green depletion timers from 180 to 153 seconds and stone from 240 to 204 seconds. The straps leave fibre/herb yields unchanged. Future district gathering rates remain unchanged. Existing timed favour limits and finite farm inventory still bound village sales; buying an upgrade neither earns coins nor adds retail progression.

Quest/friendship coin gifts and almanac rewards continue to enter `progression.bonusEarned`, keeping them out of retail earnings used for farm level progress. Favour payments retain their existing sale treatment. Quest and friendship claims remain keyed and once-only. Almanac duty completion and page rollover remain saved, preventing a reload from paying the same duty again.

Food gifts and favours now use `availableFood()`, so meals promised to customers cannot be taken by a neighbour. Food favours require a purchased cooker, known recipe and its farm level; an old incompatible food favour is repaired when read. Spending an ingredient does not reroll a non-food favour. Elowen's recipe gift survives both a save before buying the truck and the subsequent truck purchase.

## Saves, geometry and input contracts

- `STATE_VERSION` remains 16. Upgrades use existing `village.effects` strings: `upgrade:satchel-pockets`, `upgrade:satchel-frame`, `upgrade:gathering-kit`, `upgrade:gathering-straps`. Effects restore before material counts are capped, preserving the larger satchel's legitimate contents.
- Existing saves without these effects retain their old capacities/rates. Built homes, quests, node timers, decor, friendships, almanac pages and reward claims remain in their original fields. No extra village state is kept in the explorer or UI.
- Followed quest selection lives in `prefs.villageTrackedQuest`; a missing/completed preference falls back to an active story. Transient resident paths, input, previews and undo history are not saved.
- Restored decor is validated against the shared exclusions. A newly invalid old placement returns to storage. New placements and moves validate their final rounded transform, avoiding a valid preview becoming an overlapping saved piece after snapping.
- Realm coordinates use `(x,z)`; Three uses `(x,-z)`. Static village models use the design grid under a root scaled once by `PLAN_SCALE`; residents, pages and placed decorations already use world units. Halls use `hallPoint()` and their own distant frame.
- The frame loop updates farm rules once. Village event handling displays notices, saves and synchronises visuals; it does not grant rewards a second time. UI opening and historical receipt rendering do not settle rewards.
- The village controller owns pad interaction while active. Menus, dialogue, tours and decorating each have an explicit input mode. Pointer cancellation, blur, resize, disconnect and mode changes release held movement.
- The HUD uses one TV zoom per surface. Thumbstick centres remain in viewport pixels. No new light is added per NPC or particle; the village retains its eight pooled point lights.
- Local routines use bounded movement and collision-aware paths. A restoration changes a destination without teleporting the resident. Blocked routes wait/replan. Reduced motion freezes the new routine/atmosphere motion; no claim is made that every older village effect has been rewritten for reduced motion.

## Verification needed at integration

The rule regression covers the complete gather → stall → both homes → reading nook → cooked supper chain, upgraded satchel round trips, bounded node rates, exact-once purchases/payments, food reservations and conserving Undo. Existing save-file fixtures, cooking tests and navigation tests must keep passing.

For the final build, run `npm test` and build the single HTML after all shared edits. Use the browser evidence to check touch walk/look together; Fold cover/open and landscape layouts; TV/controller focus, Back and disconnect; buying and placing a reward; Cancel/Store/Undo; both restored doorways; pages on village and farm; cooking/selling/carving progress after returning home; reload at an unfinished quest; and return to the farm without held input. Actual Fold/DeX/TV hardware performance remains a separate acceptance check from viewport and gamepad emulation.
