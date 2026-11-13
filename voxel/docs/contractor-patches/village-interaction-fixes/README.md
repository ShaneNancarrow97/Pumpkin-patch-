# Village interaction fixes — Claude handover

Contractor source branch: `contractor/village-interaction-fixes`.
Review base: `7bb7639523083f444da565aa5716b82282e16421` (the delivered Blackroot source and optional Android integration). Lead `voxel-reference` was checked read-only on 9 November 2026 at `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`. Its working checkout was not touched. Inspect and merge deliberately alongside Claude's concurrent changes.

## What changes for the player

Menus now receive their own controller input when opened: a leftover pointer no longer steals Cross, Circle or the D-pad. Closing a village menu releases held inputs while accepting a genuinely fresh movement immediately. The village's horizontal right-stick look follows the expected direction; farm camera and touch dragging keep their separate existing conventions.

Leaving the village asks **Return to your farm?** Cross confirms and Circle stays. The opening press cannot also confirm. Cancelling a walking exit requires stepping away before that exit can ask again. Programmatic teardown remains immediate. Quest completion gets a short receipt showing the quest title and rewards actually granted, after the conversation releases the screen.

Loose resources occupy side gardens and outer lawns, as well as the original sites. The walkable Green extends to the first closed district gates. Blackroot has more fixed sockets and grows through visibly distinct stages using existing saved cooldowns. Only mature, accessible nodes can be harvested. Mature nearby fungus keeps its detailed domes and twisting roots, with bounded detail farther away. Real village shops receive a restrained floating icon; there are no fake shop actions or floating text labels.

Gathering has material-specific sounds: wood chops, stone clinks, plant rustles and wet Blackroot pulls. These share the existing audio context, gesture and sound settings. They are short and bounded, and cancel with the activity.

The farm removes its idle Zoom & pan legend and the floating Next chapter requirement pill. R3 camera inspection still works. The level icon shows a small amber warning triangle when the real next-level milestone blocks advancement; tapping it still opens the checklist and rewards. The Play mode chip is more translucent and uses the supplied PlayStation button silhouette, a rounded pill with three rays above. The visible CREATE word is removed; its tooltip still describes the real button left of the touchpad. Options still opens the general menu; no binding is changed. On Fold widths the chip sits below the top bar so it cannot cover Settings.

Sandy’s cocoa Upgrade list now owns Cocoa hospitality; the Visitors list no longer duplicates it. Its saved ID, prices, prerequisites and effects are unchanged. Skyla’s table selection uses illustrated table previews and one clear inline stock picker. Two optional late tip-jar tiers extend the existing path while preserving the first three tiers, the £25 cap, spare-wallet limit and separate once-only tip ledger. The followed quest shows a proper D-pad Up shortcut glyph instead of a text approximation.

## Dependency and review matrix

| Part | Source / dependencies | Consumers and protection |
| --- | --- | --- |
| Global controller ownership | `ui/play-controls`, `pad-menu`, `pad-cursor`, existing play input boundary | Farm, interiors, wardrobe, stock and upgrades. Focus menus own complete pad input; cursor ownership is retired at the boundary, held clicks cannot leak into purchases/world actions. |
| Village input and travel | `village-game`, `ui/village-controls`, return prompt helper | Menu, dialogue camera, pause, gathering, exit trigger and native Back. Preserve fresh-edge suppression and neutral snapshots together; do not replace internal `close()` with a confirmation. |
| Completion receipts | `village-quest-receipt`, existing `quest-done` events, actual reward rows | Read-only notification queue. No reward/grant logic in UI, no replay when revisiting a completed conversation. |
| Resource placement and growth | Content IDs, node site pools, navigation, `nodeGrowthInfo` | Gathering, saved cooldown/cycle maps, quest Find actions, waypoint selection, resident paths, voxel render. Preserve original IDs and authored positions; new sockets cannot invalidate saved furniture. |
| Voxel resource layer | Growth rules, resource prototypes, village view camera | Persistent instanced meshes with cached stage prototypes and bounded nearest-patch detail. No new lights or per-frame geometry creation. Picking must use mature availability, not merely visible shoots. `village-node-hit` places every hitbox on the same terrain height as the voxel pile, including elevated northern respawn sites. |
| Shop emblems | Existing unlocked Rowan stall, shared icon atlas and existing pick target | Marker never creates another shop state, purchase path or inaccessible business. Disposal releases its resources. |
| Gathering audio | Existing shared WebAudio context/noise/limiter, successful activity callbacks | Sound preference independent of music preference. Lifecycle cancellation and bounded sources; simulation must never bootstrap sound without a player gesture. |
| Farm HUD | `main`, `index`, level model, home journey helper, existing CSS | `lvl.blocked` drives the warning; home progression, checklist, rewards and milestone modal remain functional. SVG visibility uses the hidden attribute, not an unreflected JS property. |
| Service menus and tips | Existing Cocoa hospitality visitor-upgrade ID, Skyla display assignment rule, customer-care tip tiers | Move the purchase UI without changing its saved Cocoa field. Display assignment remains free and unique per variety. Tip arrays, restore bounds and card examples share the same source of truth. |
| Build integration | `build.mjs` CSS list, `main` gather callback | Include `village-feedback.css` once and pass `onGatherSound` to the existing audio instance. These small hooks matter when resolving lead-file conflicts. |

Save format remains **18**. Existing quests, inventory, houses, costumes, economy and claimed levels are preserved. No dependency or persistent growth field is added. Growth reads the established cooldown/cycle maps, so legacy saves need no conversion.

## Review parts

- [Global controller and farm prompts](GLOBAL-CONTROLLER.md)
- [Village input and travel](VILLAGE-INPUT.md)
- [Return and quest feedback](FEEDBACK.md)
- [Resource layout and growth rules](RESOURCE-LAYOUT.md)
- [Voxel growth and world feedback](WORLD-FEEDBACK.md)
- [Shop emblem implementation](WORLD-SHOP-MARKERS.md)
- [Gathering sound design](GATHER-AUDIO.md)
- [Sandy’s hospitality list](COCOA-MENU.md)
- [Skyla’s table selector](SKYLA-DISPLAY.md)
- [Skyla’s generosity tiers](SKYLA-TIPS.md)
- [Quest controller shortcut](QUEST-HINT.md)

The optional [Android addendum](NATIVE.md) and [checked downloads](DELIVERY.md) are complete. `DELIVERY.md` records exact artifact hashes, completed checks, downloadable files and patch order when publication finishes. Browser reports distinguish declared save/controller fixtures from earned gameplay and normal rendering from logic-only draw holding. Viewport/controller simulation does not certify physical Fold 7, TV, Bluetooth or device performance.
