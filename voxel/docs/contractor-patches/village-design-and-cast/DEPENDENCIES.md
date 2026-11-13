# Village change dependency matrix

Base: Claude `604fe23`. Remote `voxel-reference` was checked again on 8 November 2026 and still points to `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`. Keep village simulation in `rules/village.js`; views and UI call those rules using the full game's one saved state. Original root-game content remains unchanged. A new import or switch case alone does not make the village a completed destination.

## Implemented adapter ownership

| Files | Purpose and merge boundary |
| --- | --- |
| `src/village-game.js`, `src/ui/village-game.css` | Saved Green controller, conversations, panels, direct purchases, thumbstick/keyboard/pad input and return lifecycle. Calls the existing model; does not introduce a second saved village state. |
| `src/main.js`, `src/scene.js`, `src/ui/more-sheet.js`, `build.mjs` | Shared lead integration points: travel, home goal, one update/render loop, scene selection, the farm's letter-page pickup, and CSS inlining. Review these hunks against any later lead changes rather than replacing whole files. |
| `src/rules/village-navigation.js` | Pure collision/navigation adapter for the Green and the three halls. Hard-coded measured building/wall bodies must change with their models. Later districts stay blocked. |
| `src/village-sprite-actors.js`, `src/village-sprite-math.js`, `src/content/village-sprite-meta.js`, `src/village-folk.js`, `src/village-view.js` | Shared painted cast, frame/anchor contract, visibility-aware picking and hall-host replacement. Owner costumes and farm visitor atlases are unchanged. |
| `src/ui/village-shell.js`, `src/ui/village-conversation.js`, `src/ui/village-ui.css`, `src/village-explorer.*` | Preview navigation and the reusable dialogue card. Preview switches still use temporary state; they are not full-game progression controls. |
| `src/village-models.js` | Cottage window, planter and eave details within the existing footprint. Retains boarded/shabby story variants and the fixed light pool. Restored conservatory glass is deliberately non-emissive; seven small warm panes replace the previous whole-dome bloom. |
| `assets/village/`, `assets/village-cast-concepts/`, `tools/bake-village-sprites.py` | Nine runtime WebP strips, metadata/manifest and reproducible art source. Large source PNGs are not imported into the game. Use this separate baker; do not hand-edit the packed assets. |
| `test/village-{cast,game,navigation,sprite-assets,window-detail}.test.mjs`, `tools/village-{design,game}-qa.mjs` | Rule/controller, pixel and browser evidence. Asset tests require Pillow; the voxel CI job now installs it with Python 3.12. |

The matrix below covers both the implemented slice and later work. Village decoration/path editing, follower routes, later friendship chapters and an almanac duty panel are still integration work; their existing model functions are not a shipped interface.

| Change area | Direct owners / interfaces | What else it affects | Review and verification |
| --- | --- | --- | --- |
| Farm invitation and travel | `main.js`, `scene.js`, `rules/village.js`: `villageDue`, `inviteToVillage`, `arriveInVillage` | Level-4 requirement, farm updates during visits, old saves, return position, menus/audio | Reach real level 3, accept once, enter and return, save/reload; no reward from reopening |
| Show the village in the full game | `createVillageView`, scene `active()`, `activeScene()`, resize, enter/leave and tick | Renderer/pacer, shadows, postprocess, input, TV mode | One renderer and one simulation update clock; lazy build; farm input does not also fire |
| Walking and collisions | Realm coordinates `(x,z)` versus Three `(x,-z)`, `PLAN_SCALE`, `groundAt`, hall plans | Water, walls, buildings, slopes, district locks and arrivals | Walk all access roads/stairs; cannot cut through water/buildings or bypass locked gates; both-way hall transitions |
| Main-game return door/carriage | `ARRIVAL`, scene transition hooks, `playWays` or an explicit destination adapter | Controller back, menu close versus leaving, farm arrival safety | Return lands clear of travel trigger; one Back press has one effect |
| NPC sprite replacement | `village-folk.js`, `makeResident`, `createVillageFolk`, hall-host construction in `village-view.js` | Picking, portraits, idle/talk/wave/walk, scale, memory and warming | Same actor outside and inside; visible alternating walk; anchor/height stable; invisible proxies not picked |
| Character relationships | `FOLK_BY_ID`, `nextChat`, `answerChat`, `giveGift`, `friendshipWith` | Farm inventories, timed limits, once-only rewards, quest advancement | Tone choices work; duplicate answer cannot farm XP; no fabricated friendship for Vesper or the six future residents |
| Introductory quest | `finishTour`, `talkStep`, `finishTalk`, `trackedQuest` | Level 4, initial gathering unlock, first decor/reward receipts | Actual ordered steps: tour → Rowan → Elowen; skip tour still deliberately completes it; reopening conversations does not replay rewards |
| Gathering and pages | `nodeReady`, `gatherNode`, `storyObjectsHere`, `findObject` | Cooldowns, capacity, quest story objects on farm and village, view `sync()` | Node depletes and respawns on active clock; full storage leaves it intact; objects found once; correct place only |
| Journal and map | `questStatus`, `questStepText`, `stepProgress`, district data, `doorOf` | Quest tracking, routes, responsive sheets, pad focus/cursor, TV zoom | Short current step, clear lock reason, visible map legend; no action over gameplay until opened |
| Rowan's rotating stall | `stallStock`, `buyFromStall`, `stallOpen` | Farm/home quantities, discounts, timed rotation, coin charges | Closed until quest unlock; one tap charges once; quantity/rotation persist; correct destination for home versus village items |
| Village decorating | `villageDecorFits`, `place/move/storeVillageDecor`, view `preview`, `SCENERY` | Roads, nodes, fixtures, quest-tag locations, controller placement and undo | Cannot block roads/doors; move/cancel/undo preserve quantities; no pending ghost saved; add village to pad-arrange ownership |
| New fixed props / gardens | `village-world.js`, `NO_GRASS`, `keepClear`, `SCENERY` | Woodland scatter, grass, collision, decor placement, lighting marks | One footprint drives all exclusions; no grass/trees through new model or road; no added runtime lights |
| New district quests | `districtOpen`, story flags, shifted plots/nodes, `FOLK.playable` | Restore validation, friendship state, routes and material economy | Add complete content/state migration before opening gate; map labels match real rules |
| UI overlays | Village UI, `ui/pad-menu.js`, TV zoom roots, `hooks.blocked` | OrbitControls, stick cursor, touch sticks, focus/Back and menu refresh | 44 px touch targets/12 px text; scrolling retained; camera and travel stop while a menu owns input |

## Coordinate and lifecycle contracts

- Content and rules use realm/world units. Static geometry uses the smaller design grid and is multiplied by `PLAN_SCALE` once in the root group. Do not scale resident, decor or story-page coordinates twice.
- Three coordinates negate realm z. `villageView.groundAt(x,z)` accepts realm coordinates and returns world y. An interior uses the distant `INSIDE` frame and `hallPoint`; that is not a realm district position.
- `village-view.js` already owns a scene and camera, but does not own the full game's renderer. Integrate it through the same render adapter pattern as estate/foyer rather than creating a second canvas loop that updates the farm twice.
- The village uses eight pooled point lights. Move them; do not add/remove lights on visits or conversations. Keep decorative candle/eye glows unlit rather than adding a light to every sprite.
- Large glass surfaces must stay in the lit batch. The former restored conservatory used 118 near-white emissive wall/dome boxes, creating a roof-sized white halo under bloom; a focused model test now keeps the glass unlit by emission and bounds the seven small luminous panes.
- Filter pick meshes by ancestor visibility. Hidden old halls, hidden future residents and hidden world geometry must not answer taps or the controller cursor.
- The explorer's location heading derives its room override from `view.inside` each frame. Keep that view-state link when adding halls, so normal door entry and direct QA entry cannot leave a stale district/room name.
- The main game's save pipeline already serialises village state. The explorer's independent demonstration state and Restored/Everyone toggles must never become a shortcut that mutates the farm's story state.

## Existing work to preserve

The current lead contains handovers 64–73, including the contractor's prior furniture/cooking and farm-work updates. Its later changes include 5-minute pumpkin spoilage, further farm tiers, TV/DeX framing, controller placement, a fishing lake and save-file compatibility. Use the latest lead values; do not transplant old contractor timings or replace these files wholesale.

The original `AGENTS.md` asks agents to work on `voxel-reference`; the user's explicit contractor arrangement takes priority for this task. Work stays on `contractor/village-design-and-cast`, with a clean incremental patch for Claude to inspect. No unpublished lead checkout should be overwritten.
