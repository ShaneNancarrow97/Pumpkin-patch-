# 48 — A lived-in home and hands-on play

Branch: `contractor/home-play`.
Base: `e2cba9965ff852a5d844fe7ccb9912ae6fc303eb` — completed menu handover 47.

This contractor update gives the house a place in progression and adds optional direct control of Shane or Natalie. It builds on the complete cooking/hospitality and menu increments, rather than a separate game demo. Claude's lead checkout and unpublished work are not modified. The root 2D game remains separate.

**Release status:** this is the integration handover. Root will fill the exact final runtime commit, HTML hash, full test/browser results, CI and patch-rebuild record after release verification. Do not infer final approval from an individual component's tests.

## What the player does

The quiet **Play** chip opens a character wheel. Choose Shane or Natalie, then move with the touch thumbstick, WASD/arrows or a connected gamepad. A ring marks the controlled owner; a nearby crop, door or usable object receives a warm target ring and a short **X** prompt. Tools are disclosed in a radial menu rather than a permanent toolbar. Existing tycoon taps, bulk planting/harvesting, purchases and helping hands remain available outside control mode.

Direct walking currently supports **the farm and the player's home rooms**. The private homestead retains its existing orbit camera and exterior editing. From there, the control-mode action offers **Enter home** as a bridge to the interior; it is not estate walking or a new third-person exterior camera. Other unsupported places offer a return to the farm. The scenery, foyer, maze and hayride retain their existing controls.

The farm controller moves in camera-relative directions, collides with the main buildings and truck, and slides round obstacles. Room movement uses the room's walls, fixed reserved cells and measured furniture bodies. Movement is blocked while management sheets, radial menus, celebrations, the introduction, ride experiences, decorating or pause are active. Slow frames use collision substeps. The selected owner's autonomous movement gives way to direct control; the other owner and visitors continue their normal routines.

### Controls and interactions

| Device | Move | Interact | Tool wheel | Furniture |
| --- | --- | --- | --- | --- |
| Touch | Bottom-left thumbstick | Context **X** button | Tools button | On-screen d-pad, ±15° buttons and furniture wheel; existing free drag/two-finger turn remain |
| Keyboard | WASD or arrow keys | X, E or Space | Q or Tab | Arrow keys nudge; R / Shift-R rotate; existing selected-piece shortcuts remain |
| Gamepad | Left stick / d-pad | A or X | Y | D-pad nudges; shoulder buttons turn; B finishes; Y opens the wheel |

The character wheel supports keyboard focus, arrows/Tab, Enter/Space/X and Escape/B. The context action chooses plant, water or pick according to the nearby crop when **Interact** is selected. Explicit Plant/Water/Pick tools keep their own verb. Near a cooker it opens the existing kitchen menu; near a costume rack/mirror it opens the wardrobe. Furniture selection opens a compact placement pad. **More controls** deliberately reveals the original selected-piece controls so wall sides, colour, mirroring, shelf finishes/books, table placement and room transfers are not lost behind the new radial interface.

Planting and picking use the existing authoritative rules and prices. Watering grants **12 percentage points of crop progress**, at most once per plot every **12 game seconds**, and can make a crop ready. It yields no coins or extra output and cannot act on locked, empty or ready plots. Its cooldown is transient, held by plot object identity in a `WeakMap`, so reloading clears the cooldown; there is no new saved watering timestamp. The action presentation adds a visible voxel watering can, twelve batched water drops, bends and anchored poses. Repeated actions must not accumulate vertical offsets.

## Twenty levels that lead back home

The original twelve earned thresholds and rewards remain, followed by eight later chapters. `patchLevel(s)` now checks the next relevant home requirement as well as earned takings. Bonus level coins are still excluded from level earnings, so rewards cannot chain themselves into more levels. Finishing an already claimed home milestone stays honoured even if its furniture is later moved or stored.

A small next-chapter chip appears when earnings are ready but the home goal is missing. A closable, once-per-session milestone prompt offers **Show me**, which goes to the relevant room, house plan, wardrobe, recipe page or equipment. Routine visits and purchases do not trigger repeated modal notifications. The **Home & hands-on play** page explains the current goal, available rooms, decor, costumes and cleanliness in one place.

| Patch level | Earned takings, excluding level bonuses | Home requirement before reaching this level |
| --- | ---: | --- |
| 1 | £0 | Starting cottage |
| 2 | £150 | None |
| 3 | £500 | Step inside the home once |
| 4 | £1,000 | None |
| 5 | £2,200 | Crooked cottage: house index 1, opening the bedroom |
| 6 | £4,500 | Use the wardrobe at home or a usable costume rack/mirror |
| 7 | £8,500 | Four placed furniture/decor pieces |
| 8 | £15,000 | Apply wallpaper in a room |
| 9 | £26,000 | None |
| 10 | £42,000 | Midnight manor: house index 2, opening the kitchen |
| 11 | £70,000 | Finish one home-kitchen cooking batch |
| 12 | £110,000 | Three books on bookshelves |
| 13 | £170,000 | Learn six recipes |
| 14 | £250,000 | Oven and baking-tray capabilities placed in the kitchen |
| 15 | £360,000 | Haunted haven: house index 3, opening the attic |
| 16 | £500,000 | Furnish three rooms |
| 17 | £680,000 | Hob, pan, oven, tray and spice capabilities placed in the kitchen |
| 18 | £900,000 | Finish ten home-kitchen cooking batches |
| 19 | £1,200,000 | Six books on bookshelves |
| 20 | £1,600,000 | Furnish all four rooms and place twelve pieces total |

House upgrade costs are unchanged: **£650, £2,600, £9,000**. Existing compatible premium kitchen pieces can supply capabilities. Buying a tool into storage or another room does not fulfil a kitchen placement goal. Home cooking activity counts completed home batches through `cooking-complete` events, not a button press or a truck batch; the displayed “dish” goal currently means completed recipe batches, not every portion produced.

### Save compatibility

`STATE_VERSION` is **14**. Existing saves retain purchases, balances, rooms, costumes, jobs and progression data. Restoring a pre-v14 save computes a sanitised `progression.homeLegacyThrough` from its already earned original level, capped at 12 and excluding recorded level bonuses. Those older levels do not regress because new house tasks were introduced. It does not grandfather newly added levels 13–20. New saves start with the home requirements enabled.

`progression.homeVersion`, `homeLegacyThrough` and bounded `homeActivities` are the additive progression fields. Claimed milestones remain honoured. The pure home-goal API is `homeGoal`, `homeRequirements` and `recordHomeActivity`; `patchLevel` adds `earnedLevel`, `requirements` and `blocked` for the HUD/menus. New code using a raw earned-level shortcut will bypass these requirements: keep unlock checks on `patchLevel`.

Direct-control mode, thumbstick state, owner positions, current radial selection, generated side/back frame choice, pet schedules and watering cooldowns are presentation/transient state. They are not saved. Normal wardrobe selections and furniture placement still are. Old executables cannot understand the new features; keep a save export before moving versions.

## Furniture with a use and a consistent blueprint

Seven new purchasable pieces use the same fine exposed-face voxel kit, walnut, muted plum and aged brass as existing rooms. They have genuine fronts, backs and sides, cached geometry, no standee textures and measured collision bodies. Floor-centred props face +z; wall backs start at z=0. The normal catalogue, storage, arbitrary rotation, collisions and save restoration apply.

| ID | Piece | Price | Footprint / purpose |
| --- | --- | ---: | --- |
| `costume-rack` | Midnight costume rail | £180 | 2×1; wardrobe interaction, hanging capes/jumper and boots |
| `moon-dressing-mirror` | Crescent dressing mirror | £240 | 1×1; wardrobe interaction, silvered glass and bat crest |
| `lantern-entry-console` | Lantern entrance console | £210 | 2×1; carved drawers, key dish and lantern |
| `hanging-herb-shelf` | Blackthorn plant shelf | £135 | Wall; ivy, fern and lavender; decorative rather than a spice capability |
| `moonweave-rug` | Moonweave hearth rug | £150 | 3×2 rug; moon, woven border and stars |
| `midnight-reading-bench` | Midnight reading bench | £195 | 2×1; tufted plum seat and carved back |
| `bedside-candle-cabinet` | Little candle cabinet | £120 | 1×1; cupboard and three batched glowing candles |

Three pet pieces join them: **Skyla's crescent basket** (`moon-cat-bed`, £90, 1×1), **Harvest hound bed** (`harvest-dog-bed`, £120, 2×1), and **Midnight supper bowls** (`midnight-pet-bowls`, £60, 1×1). Their collision bodies are measured against the models as well. The ten menu thumbnails are rendered from the actual room models into one approximately 24KB transparent WebP atlas; the shared `decorIcon` path recognises them.

Regeneration:

```sh
node voxel/tools/measure-home-furnishings.mjs
cd voxel
node tools/render-home-furnishing-thumbs.mjs /tmp/home-furnishing-preview.png
```

`content/home-furnishings.js` holds the new catalogue and `interaction: "wardrobe"`; `home-furnishings.js` builds the pieces. Pet models have their own catalogue/builder. `rules/house.js` merges both catalogues and measured sizes, while `decor.js` dispatches native model building and stats. The root content catalogue stays untouched. There are 83 voxel catalogue pieces at this point; tests of older premium collections now verify inclusion rather than hardcode the previous total of 73.

## Skyla, Sandy and Maisie at home

The home companions use a generated, compressed 24-frame sheet with consistent anchors: idle, two walk contacts, wag, sleep, stretch and feeding poses for each of the three recognisable pets. Their lightweight room schedules walk to bowls, rest in beds, stretch, eat/drink and wander round furniture with a small half-cell route grid. Skyla defaults to the parlour, Sandy to the bedroom when open, and Maisie to the kitchen when open; before that they use the parlour. Beds can move the associated pet's room.

These routines are **cosmetic**, with no hunger drain, free supplies, pet currency or sales effect. The animals' working shop/truck sprites are retained; the home appearances do not remove them from their businesses. Schedules reset when rebuilding/re-entering a room. Furniture ownership currently allows one placed instance of each catalogue ID, so the single dog-bed purchase is shared by the existing first-bed assignment; independent duplicate dog beds would need a later ownership/instance change.

## Litter, manual cleaning and Hettie

Paid visitor activity creates deterministic small cocoa cups, napkins and snack wrappers on the public paved lane: one piece per four counted stall sales, capped at 24 pieces. The first three pieces incur no penalty. More litter reduces visitor footfall by 2.5 percentage points per piece, down to 65%; cleaning reverses the penalty immediately. It does not fine the player or delete stock. Pre-update sales do not generate a saved backlog of rubbish.

Walk up and use Interact/Clean to remove a piece, or hire **Hettie the caretaker for £450 from patch level 3** through Home & hands-on play. Hettie has a consistent generated sprite/icon, alternating walk frames and sweeping frames. Her deterministic simulation visits litter positions at 2.4 units per second, then spends 1.4 seconds sweeping each piece. She is a one-time hire with no wage timer. Litter, hire status and bounded caretaker progress are saved in `cleanliness`; the rules use elapsed game time, not a render-frame timer. A clean farm has no penalty.

## Directional owner art and its current limits

The original front-facing idle/walk sheets remain authoritative. The new direct-player adapter selects generated side/back art for **all 20 current wardrobe looks**, including Natalie's purple wheelchair; left-facing uses a mirrored side view. The two base looks have four side and four back walk frames plus one drawn planting, watering and harvesting pose apiece. The other eighteen looks each have two side and two back walk contacts and keep their own original front art. Their farming actions use the selected costume with scene/body/tool animation; they do not substitute the base outfit.

This is not yet a fully bespoke front/side/back action strip for every verb in every costume. In particular, costume farming poses use the scene animation rather than individually redrawn action frames. The supplied art is normalised into fixed slots with a shared foot anchor; runtime assets are five WebP sheets, **1,568,414 bytes total**, each no larger than 1120×2040. `player-sprite-directions.js`, `player-direction-meta.js` and `tools/bake_player_directions.py` hold the adapter and preparation. High-resolution generation sources and precise coverage notes live in `docs/plans/home-play/art/`. Sprite mode consumes these textures; the optional voxel-character style retains its existing voxel animation path.

The art component is committed as `8cb8277`; normalisation cleanup and metadata coverage/range/budget tests pass. Final in-engine visual checks belong to root's exact release verification below. Do not describe the remaining all-costume, all-direction action work as complete.

## Integration for Claude

Review/merge on a clean branch after handover 47, or use the supplied incremental patch against `e2cba99`. Preserve private lead work. Do not reset your lead checkout, blindly replace a private 20-level economy, or merge the artifact-only download branch. This update deliberately adds gates to the published twelve-level design; reconcile them with any unpublished thresholds and unlock plans.

Highest-overlap files are `main.js` (control routing, room entry/activity, home prompts and UI blocking), `scene.js`/`places.js` (direct owner control and pet/cleanliness adapters), `model.js` (v14 migration/update/export), `rules/levels.js` and `rules/selling.js`. Review `sprite-actors.js` (directional preload and hooks), `build.mjs` (new CSS/art), `ui/home-sheets.js` (usable pieces and advanced placement parity), `ui/collection-sheets.js`/`level-celebration.js` (20-level/goal presentation) and `ui/more-sheet.js` too.

The source branch retains generated-art sources and screenshot evidence; a lightweight runtime patch may omit those large review folders while including the compressed runtime art, native models, code, tests and this handover. Fetch the source folders before regenerating the art. The artifact manifest will identify the exact patch base, source/runtime commits and HTML checksum.

```sh
git apply --check /path/to/home-play-from-e2cba99.patch
git apply /path/to/home-play-from-e2cba99.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/home-play.html
```

Public test controller additions include `playControls`, `interactAsPlayer` and `followHomeGoal`. `scene.player` offers `setEnabled`, `select`, `input`, `setBlocked`, `act`, `targets`, `teleport` and `state`. Teleport is diagnostic; normal play uses collision-aware walking. Tests exercising paid recipe buttons still need to expand the relevant recipe first, as documented in 47.

## Verification

Runtime: `6a6fe2bf1bb226489eebb882c2d535614b8165cd`.
HTML SHA-256: `e21570c0f1ce2741d960c5cc0aa608d62622053ba2e1fd751f3c7d68823ff97a`.

All 84 Node test files pass; nine cleanliness scenarios also verify the final starter/expanded-farm litter bounds. [CI run 40588800114](https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/40588800114) passes both jobs on the runtime above, including all tests, build and desktop/phone smoke. The smoke exercises the visible radial route to the advanced furniture controls.

The full browser flow passes 44 checks on its pinned HTML: the real home-goal prompt and visit, keyboard movement, planting/watering/harvesting, manual cleanup and paid Hettie hire, physical costume-rack access, pets, furniture nudge/turn/advanced controls, real thumbstick movement and emulated DualSense inputs. It checks desktop, phone, landscape and Fold-sized layouts, 44px control targets, absence of browser errors and embedded assets. The final viewport-dialog box adjustment then receives a separate 18-check exact-download release pass; reports retain their individual immutable hashes and scope.

The final verification folder contains the successful flow and exact-release reports, screenshots, Node log and CI record. The artifact manifest records independent clean-source and actually applied patch rebuild comparisons. Test funds/unlocks are injected only into browser storage; the downloaded HTML retains normal starting conditions. Earlier harness attempts were corrected to wait for visible child controls and asynchronous redraws; their failed intermediate reports are not release evidence.

Managed Chromium serves the unchanged offline HTML over loopback. Physical Z Fold 7 performance, Android file handling, real controller hardware and native OS fullscreen are not hardware-tested by that process. Preserve the existing fullscreen button and save export/import. State exact test scope rather than claiming hardware parity.

The companion [roadmap delta](../plans/home-play/ROADMAP.md) separates this iteration from the remaining controller/action-art work.

## Final input and clarity refinements

DualSense/standard Gamepad API input supports left-stick movement, Cross/Square interaction, Triangle tools, Circle back, Options management, radial selection with stick/d-pad, d-pad menu focus/choice changes and bumper furniture rotation. Pair Bluetooth in the device OS; the web game does not perform pairing. Skyla and both dogs at home now use the same mip-bias and anisotropic sampling as the existing shop sprites. Litter creation and restore are bounded to the purchased farm so manual cleanup cannot be stranded past the starter boundary.
