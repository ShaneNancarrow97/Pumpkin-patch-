# Village map, journal and conversations

The Map is now a measured north-up plan of all five village districts. It draws their actual polygons, road centre-lines, building footprints, water and forage clearings from `content/village.js`. The live owner marker uses realm coordinates. Opening a map page only reads state.

Each district has a real 44px button. A locked district opens its criteria at the top of the same panel, where they are immediately readable on a phone, unfolded Fold or TV. Back to map restores the overview. Selecting Hollow Green puts its useful landmark routes first. The existing `data-vg-focus` destinations still drive the real navigation controller; nothing teleports the owner or opens a locked district.

## Honest unlock details

`districtOpen(state,id)` remains authoritative. The level comes from `DISTRICTS` and current `patchLevel`. Moonroot Copse shows the real Two Doorbells quest requirement. Later story definitions that do not yet exist are identified as later stories. Every district outside the Green also states that its playable chapter is not in this build. Reaching the level and completing Two Doorbells therefore never falsely advertises an open gate.

The map's lock badges and Farm, Tree, Library, Workshop and Tavern shortcuts use the new shared village icon atlas. Other district markers use the existing illustrated materials. All destination labels remain text; the artwork is decorative. Ready gathering counts use the same `nodeReady` rules as the world, rather than fake or authored totals.

## Journal

The followed story appears first, with a concise next step, step count and one useful primary action. A delivery missing materials makes Find the primary action, while the unavailable handover remains visibly disabled. Giving or paying names the intended neighbour. The most distinctive reward is visible without opening a fold: for example, both Moonlit mummy outfits and the coin reward. The full reward receipt remains available under All rewards.

The followed story's useful action is the controller default. Secondary Almanac and Map links use the custom icons and appear after the active stories. Satchel and Workshop remain in the main village navigation. No quest content, requirements, rewards, saved selection or transaction rules change.

## Conversation

The conversation panel uses a clear cream sans-serif dialogue line over a near-solid plum surface, a framed speaker portrait, readable role and quest title, generous reply cards and a warm amber Continue action. Tone labels have restrained colours. Audio controls and page count stay in a quiet footer. Touch controls remain at least 44px; landscape and TV rules retain a bounded scrollable body.

The same public selectors, voice calls, reply callback, one-answer guard, page advancement and close behaviour remain. `aria-describedby` connects the panel to its current atomic spoken-text region. The first visible reply is the controller default during a choice; Continue becomes the default after the reply. No typewriter, auto-advance or additional timers were introduced.

## Integration matrix

| Surface | Dependencies and contract |
| --- | --- |
| `ui/village-map.js` | Pure presentation reading measured content, real level/quest/gate rules and shared icon helpers. |
| `ui/village-chapters.js` | `renderVillageChapter` accepts optional `id` and `position` for the map; other pages retain their API. |
| `village-game.js` | Pass `{kind,id,state:s,position:pos,...}` to the chapter renderer. Bind `[data-vg-map-district]` to `showPanel("map", button.dataset.vgMapDistrict)`. `overview` is a presentation mode, not a district or save field. |
| `ui/village-chapters.css` | Map, journal and icon presentation, loaded by the existing build. |
| `ui/village-conversation.css` | Add after the chapter stylesheet in the HTML builder. Its rules are scoped to `#village-dialogue`. |
| `ui/village-conversation.js` | Preserves the narration and choice protocol; adds accessible text association, choice tone and visible-action defaults. |
| Shared village art | Install `installVillageUIArt()` once before showing the menus. Pure markup imports no image or browser API. |

No save schema change is needed. Realm geometry changes automatically appear in the plan; do not duplicate polygon or tree positions in the map code. Future districts need real rules and playable content before removing their later-chapter status.

## Verification

`node --test test/village-map.test.mjs test/village-chapters.test.mjs test/narration-surfaces.test.mjs` passes **23 cases**: eight map, ten chapter and five narration tests. The tests cover honest future locks, measured north-up geometry, live marker validation, selectable details, route IDs, resource readiness, pure rendering, followed-quest priority, useful missing-material actions, visible valuable rewards, speaker changes, missing narration, replay, one-answer safety and controller choice defaults.

The previous controller regression assumed Cross on the Map always activated the old first textual destination and closed the panel. A real spatial region selection now keeps the Map open to show its details; the root integration test should select a landmark route separately to verify the close-and-guide path. Parent owns the full browser and layout review; the tests above are not physical-device certification.
