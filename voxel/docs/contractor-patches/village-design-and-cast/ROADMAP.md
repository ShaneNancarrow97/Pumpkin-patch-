# Mothlight roadmap after the first saved Green visit

> Update, 8 November 2026: the repeatable Green interface, decorating, explicit tracking, almanac, gathering upgrades and local resident routes described below as next steps now ship in [Living Mothlight](../mothlight-living-village/ROADMAP.md). This document records the earlier first-visit slice.

This roadmap distinguishes Claude's world at `604fe23`, this contractor's implemented first slice and later expansion. The remote lead was checked on 8 November 2026 and remains at that base. Exact release tests and screenshots belong in the release receipt; this is not a claim that every planned system ships.

## Already built: keep and polish

- Five districts, separated with woodland and terraces; the Green's Moth Tree, gardens, water, roads, lamps and carriage.
- The Velvet Bat, with Vesper and a furnished hall; Elowen's library and Rowan's workshop, with their owners.
- The Moor's Ferris wheel, market row and carousel. The carousel is no longer an unstarted scenery item.
- Explorer orbit/walk cameras, door entry/exit and tour stops updated for the separated districts.
- The full game's stick-controlled cursor, task 182. It is no longer an unstarted input task. This patch routes the active village through scene picking and provides its own contextual pad actions; a village-specific cursor legend is still a possible refinement.
- Persistent village rule state, the Elowen/Rowan introduction and friendship content, material nodes, Rowan's stall, Green decoration and the almanac.

## Implemented: the first village visit is saved

The lead's level-4 requirement depended on completing the village invitation, while its village was reachable only in the explorer. The new full-game bridge connects the saved Hollow Green introduction, gathering and Rowan's stall without changing their existing rules or rewards.

The implemented flow is:

1. At patch level 3, a compact Elowen letter button offers travel; More also lists Mothlight. Old farms beyond that level can enter too. This is a UI invitation, not a newly animated Elowen arrival on the farm.
2. Travel enters the village using the existing saved state; the Farm button or carriage returns safely.
3. The tour can be watched or deliberately skipped. Either path reaches Rowan's first conversation, then Elowen's response.
4. Dialogue advances through authored lines and meaningful tone choices; it does not turn a single greeting tap into an entire completed quest.
5. Completing the introduction grants its existing once-only rewards, unlocks gathering and clears the level-4 requirement.
6. Save/load preserves the exact point in the introduction. Returning to the farm does not reset it.

The scope remains the Green and the three built interiors. Later districts stay gated until their rules/content are ready. The large valley remains visible as a promise of what comes next.

## Implemented: compact village and explorer interfaces

The saved game uses one edge objective, contextual interaction, a small purse and Map / Neighbours / Journal / Satchel dock. Purple surfaces, warm amber actions and cream text match the farm. The explorer's separate Map / Neighbours / Walk / More dock hides its preview switches under More; those switches never mutate a farm save.

The current slice provides:

- **Quests:** the current objective and active quest steps/progress; authored conversations, starts and handovers. Completed-story browsing, explicit quest tracking and route guidance remain to add.
- **Map:** six Green camera destinations: carriage, Moth Tree, library, workshop, tavern and stall. The wider district map/legend and opening requirements belong to the next chapters.
- **Neighbours:** Elowen and Rowan's live friendship, chats, gifts and favours; Vesper as a tavern host without a fabricated bond track. The future residents appear only in the separate explorer's preview mode.
- **Satchel:** all material counts and current capacity, plus the active-play respawn explanation. Individual cooldown indicators remain a refinement.

Keyboard, touch and pad actions, controller focus/Back, safe areas and one TV zoom root are implemented. Menus block world picks and camera look. Improve retained panel scroll/focus during transactions and add a short village-specific pad legend in a later refinement; do not turn this back into a permanent help panel.

## Character art and life

Nine matching painted identities are implemented for all eight residents and Vesper, preserving the voxel designs' silhouettes and props. Each transparent WebP strip contains idle, four authored left/right walk phases and a wave. Strips use one shared foot anchor and a 2.3-unit body-height contract. Their source, alpha-cleaning rules, packing and checksums are recorded in the art manifest and provenance.

The same identity appears outdoors, indoors and in conversation, with a voxel fallback while images load. No private light is added to any sprite. Walking frames are supplied and the adapter supports them; this patch does not make standing residents roam autonomously. Cinder's gait is a tail glide. A tighter face crop for small dialogue portraits can be considered after visual review; do not alter world framing to enlarge a menu portrait.

After the first quest UI is working, add short purposeful NPC routes and quest-following behaviour. Followers should trail reachable player positions, avoid water/buildings and stop/resume across conversations and door transitions. Do not let them teleport through districts whose gates are locked.

## Next priority: finish the repeatable Green loop

The first three steps below are connected to the saved game. Finish the missing interfaces around the existing rules before inventing more currency:

1. **Connected:** gather fallen logs, stone, fibre and herbs; capacity and node depletion use the existing rules. Add per-node cooldown/readiness hints.
2. **Connected:** repair Rowan's bench and reopen his stall through its material/coin handovers; purchases use the saved purse and correct farm/village inventory destination.
3. **Connected:** gifts, chats and produce favours use the existing finite inventory and once-only rewards. Letter pages appear across village and farm and can unlock the almanac through Elowen's quest.
4. **To build next:** village Decorate mode, so village-only rewards and stall pieces can be placed, moved, rotated, stored and undone. Wire Remove/Cancel/Undo to the existing placement rules and pad-arrange, preserve routes, and share the obstacle footprint with navigation.
5. **To expose:** the almanac's duties and rewards, completed quest receipts and explicit quest tracking. These rules already run on the farm's clock, but the new panel does not yet show the almanac page.
6. **To verify as a complete longer chapter:** workshop/library restoration chains, their model changes and unchanged door access, then purposeful neighbour routes/followers. Farm rewards should improve decorating, recipes, costumes and play rather than replace farm income.

## Open the next districts as complete chapters

The level labels in layout data are a plan, not the current `districtOpen()` implementation.

| District | Planned level | Complete before opening |
| --- | --- | --- |
| Moonroot Copse | 6 | Mabel/Tansy friendship state, authored quests and rewards, bramble opening, cottage gardens/interiors, hardwood and moth-silk routes |
| Lantern Quarry | 9 | Bridge story and collision-safe crossing, Opal/Cinder chapters, masonry/restaurant utility, iron/clay loop |
| Carnival Moor | 12 | Corvus/Baron chapters, live fair/venue progression, meaningful visitor or farm reward links, moonstone/emberbloom uses |
| Mirror Marsh | 15 | Its story gates, observatory purpose, safe banks/paths, star-amber recipes/upgrades and late-game goals |

Save restoration must add new friendship records without wiping existing neighbours. Do not turn `playable` on until the accompanying content and migration exist. Keep all later district rewards and purchases behind their real story/level requirements.

## Environment refinement after playable flow

The cottage window/planter/eave pass is implemented within the existing footprints; boarded homes keep their story state. Visual review also caught the restored conservatory's original near-white emissive dome: its glass now catches lilac scene light and only seven small panes glow warm. Next prioritise the Copse gardens, Marsh banks, route readability, signs and collision-free thresholds. Keep the current twilight colour balance and expose the village's attractive buildings. Measure draw calls and triangles against the lead's recorded views before adding large new scenery.

The Velvet Bat can later gain evening customers and its crypt cellar. Other resident homes should open with their district chapters. Neither is a substitute for finishing the first saved introduction loop.

## Release gate

Run rule tests, build both the game and explorer, smoke the existing farm, complete the real level-3→4 journey, and capture representative village/interior/menu shots at desktop, folded phone, unfolded Fold and landscape/TV dimensions. Check no hidden targets answer input, no second simulation clock is created, no external assets are needed and old save-file fixtures load. Physical-device frame rate and Bluetooth behaviour require device testing; viewport emulation alone is not certification.
