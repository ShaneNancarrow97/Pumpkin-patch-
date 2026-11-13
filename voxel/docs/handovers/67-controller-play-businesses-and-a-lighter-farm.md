# 67 — Controller-first play, new businesses and a lighter late-game farm

Branch: `voxel-reference` (lead), following handover 66. Two long player requests, taken in four rounds. In short: play mode built for a PS5 pad with a follow camera; furniture moved on the pad everywhere; food sold from Maisie's truck; a contracts menu, piñata pumpkins, a guests' carving stand; later-game upgrade tiers; a five-minute spoil; quieter pop-ups; and a much lighter ground.

## Round 1: playing and furnishing on a pad

- **The Play chip** sits at the top right and never moves (`play-controls.css`). Off play mode, the pad works the farm: △ plants, □ boosts, ✕ picks, Create opens the character wheel (`farmAction` in `main.js`).
- **Plant, Boost and Pick are always on screen.** When one can't be used it fades (`.action.idle`) instead of hiding. Each button shows its pad or key (`data-glyph`), and a press that can't act gives a small shake.
- **Furniture on the pad, everywhere** (`ui/pad-placement.js`). This works in the house's rooms, the garden and the Hollow House foyer:
  - the left stick glides the piece the way the camera sees it (`scene.groundAxes()`);
  - the D-pad steps it, L1/R1 turn it, ✕ or ○ finish and □ undoes.
  - House pieces go through `beginDrag`/`dragTo`/`endDrag`. Garden and foyer pieces stop where they last fit, with the target kept on a short leash (`LEASH`).
- **Hold to work** (`life-activity.js`, `rules/life-actions.js`). Holding ✕ in play mode chains jobs across the whole patch, nearest first (`HOLD_ORDER`, `selectNearestPlot`). A held press with nothing in reach walks to the nearest job.

## Round 2: economy and menus

- **Food is sold from Maisie's truck.**
  - `kitchen.sellAt` is `"truck"` by default, and the Sell tab sets it with `setFoodOutlet`.
  - Shop customers only buy food when it's `"shop"` (`sellsInShop`).
  - Takeaway guests pause at the hatch (`HATCH_PAUSE` in `scene.js`), face the truck and leave carrying their dish.
  - Tests that sell in the shop set `sellAt = "shop"`.
- **Unsold pumpkins spoil after five minutes** (`STOCK_LIFE` in `rules/stock.js`).
- **Skyla's shop goes further.**
  - Two new upgrades: Signs and baskets (`browse`, quicker choosing) and Gift wrapping (`wrap`, more spend).
  - Capacity and checkout run to more tiers, gated to levels 12 to 20 (`rules/unlocks.js`). Restore loops over `SHOP_LEVEL_KEYS`.
- **Late farm tiers:**
  - Tools run to 9 and yield to 7. `toolsFactor(level)` keeps the old curve to tier 6, then each tier is worth 0.9.
  - The new tiers open at levels 12 to 18.
  - Level gifts never hand out a tier before its unlock level.
- **Piñata pumpkins** (`rules/pinata.js`):
  - Piñata seeds come in three tiers on the Seeds page, giving a 5, 9 or 14% chance.
  - A planted plot may grow as a piñata (`plot.pinata`): striped fiesta colours (`pinataTemplate` in `pumpkins.js`) with a pink halo.
  - Picked, it bursts with 3 to 6 pantry ingredients. Whatever the pantry can't hold is paid in coins.
  - The roll is a hash of the farm's numbers, so it's deterministic.
- **The Seeds page** opens with the piñata card, then the varieties with "Grow on every plot", "Next seeds for every plot", then compact plot tiles.
- **Contracts** (`ui/contracts-sheet.js`, rules in `rules/orders.js`):
  - Neighbours' orders now have their own menu. It's reached from the stock popover's Contracts link, or Manage → Contracts.
  - Each contract card shows the neighbour's portrait, a timer bar and pay over the stall.
  - The contract board has five tiers (`CONTRACT_BOARD`): more open at once, sooner, longer to fill, a little more pay. Its gates are at levels 6, 9, 13 and 17.
  - `ORDERS.gap` is now 180 seconds.
- **The stock popover reads at a glance:**
  - a contracts link;
  - a tile per variety showing fresh or fading;
  - one fine-print line;
  - Sandy's drinks as chips, shown only once the stand is built.
- **Home cooking:**
  - The kitchen tools section shows how many tools are ready and how many recipes can be cooked at home.
  - Bought tools set themselves down where a cook would want them (`kitchenSpot` in `rules/kitchen-equipment.js`). Cookers go against the back wall beside the hearth, never in it. Pans and racks hang at worktop height or above on the wall nearest the cookers.
  - `placeDecorAt` in `rules/house.js` places a piece at a chosen spot, or falls back to the first free one.

## Round 3: the world

- **The other owner keeps busy while you play** (`partnerChores` in `scene.js`). They walk to litter no caretaker is on and tidy it, or stroll between the patch, the big pumpkin and the stall.
- **Signs stand on posts** (`postSign` in `world.js`):
  - the Pumpkin Patch sign is now at the head of the patch;
  - the hayride, kitchen and meadow markers sit lower, on posts, clear of trees.
  - Tests' stand-in signs have no geometry, and `postSign` leaves them alone.

## Round 4: controller-first play and performance

- **Quieter pop-ups.** Farm news (arrivals, deliveries, new contracts, piñatas, spoiling) now goes to `whisper()` in `main.js`: a slim line under the HUD, three at most, that slips away. `notice()` stays for replies to what the player just did. Speech, chat bubbles and patch words are smaller.
- **TV furniture catalogue:**
  - It's a tall panel across the left two thirds of the screen, with big tabs and tiles.
  - The bumpers flip between kinds: a row marked `data-pad-tabs` wins over the sheet's `.segmented`.
  - **Scrolling fix** (`pad-menu.js`): the pad now scrolls the nearest list that really scrolls (the catalogue's grid), not the sheet body. It converts screen pixels to the list's own pixels under TV zoom (`scale`), and keeps a fractional stick position so slow scrolls don't stall.
- **Controller-first play mode** (`play-controls.js`):
  - L1/R1 swap the tool in hand.
  - Create or the touchpad opens what's useful where the owner stands (`quick` in `main.js`): Furnish in a room, Garden in the garden, Stock on the farm.
  - The button legend now shows whenever a pad is connected, not only in TV mode, and replaces the touch sticks.
  - The touchpad no longer opens the hub in play mode; Options does.
- **A follow camera on the farm** (`scene.js` `followCam`, `FOLLOW`):
  - In play mode on the farm, a low perspective camera (27°) sits close behind the owner. L2/R2 move it between 7.5 and 19 units.
  - `active()` returns it while `followOn`. The management view keeps its orthographic shot.
- **A lighter farm:**
  - **The ground** (`ground.js`) keeps each cell's colour in a texture, sharp when magnified and mipmapped when small. The geometry only follows the heights: rectangles of one height merge into one top quad, and sides merge along their runs. On a busy level-14 farm the ground fell from 919k to about 275k triangles in the management view.
  - The east, west and north sides go in a hidden child (`userData.groundFar`), shown only while the follow camera is on (`showFarSides`).
  - `Voxels.build({ detailShadows: false })` leaves voxels under 0.16 units out of the shadow pass. The farm's world and the hayride station use it. It's opt-in because many tests count a build's meshes.
  - The farm's shadow map redraws every third frame.
  - `dist/qa/tri-budget.mjs` and `dist/qa/cpu-profile.mjs` (not committed) list triangles by mesh and main-thread time by function. `scene.world` exposes the farm's scene for them.
- **The guests' carving stand** (`rules/carving-stand.js`, `ui/carving-stand-sheet.js`, `carving-stand-world.js`):
  - It's built at level 8 for £4,000 and stands between the west lane and the big pumpkin (`STAND_SITE`), with a walk-round block in `farmPlayerGeometry`.
  - Guests stop at a rate set by the farm's footfall (`carversPerMinute`) and sit at a free bench. A guest who finds no free bench walks on.
  - Each carves one of your designs (six, from Classic grin to Moonlit castle) with stocked extras (candle, glow paint, witch's hat, wrought stand), and pays on finishing (`carving-sold`).
  - Upgrades: benches (1 to 6), tools (45 down to 15 seconds) and a fair sign (more guests, ×1.5 fees).
  - The menu draws every design as a glowing SVG jack-o'-lantern (`jackArt`), with Stand, Designs and Extras tabs on the bumpers.
  - Carvers at the benches aren't saved.

## Saves

`STATE_VERSION` is still 16. Everything new restores with defaults: `pinata`, `carvingStand`, `orders.board`, `shop.browseLevel` and `wrapLevel`, `kitchen.sellAt`, and the extended tiers. No new fixture was needed, and the kept save files still load.

## Checks

- `npm test`: 714 pass.
- `npm run smoke` passes.
- Screenshots: `dist/qa/r2-shots.mjs`, `signs.mjs`, `tv-cat.mjs`, `follow.mjs` and `stand.mjs`.

## Not done

- The carving guests aren't drawn at the benches. The stand shows lanterns appearing and lighting instead.
- The follow camera is farm-only. Rooms keep their own camera.
- Ground tiling for frustum culling in play mode would cut more.
- The village groundwork (task 143) is still to come.
