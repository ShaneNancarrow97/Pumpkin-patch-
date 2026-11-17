# 52 — Service menus, hayride tunnels, spiders and late-game goals

Branch: `voxel-reference` (lead). This follows handover 51, from the player's latest list. Start new contractor work from `voxel-reference`.

## Small fixes

- **Helping hands rest while you play.**
  - `s.handsOn` is set each frame from `scene.player.enabled` and is never saved.
  - `updateFarm` skips the helpers while it is set. A notice says so the first time.
  - The upgrade's text mentions it. Test: `test/helpers-rest.test.mjs`.
- **Guests in proportion.** Hettie, the midnight court and seated diners were drawn a person to the frame, so they stood about 2.3 units tall against the guests' 1.6.
  - Sheets can now carry `person` (the height a person stands); `sprite-actors.js` uses it.
  - The court is 1.72 tall (for their headwear), seated diners are 1.6, and Hettie is 1.6 in `cleanliness-view.js`.
- **Quieter chat bubbles.**
  - Meadow chats show only the newest line, at 12 px, clamped to two lines.
  - They show only when zoomed in to 2.4 or more, and never while the Overheard card is open.
  - The stall's remarks use the same smaller bubble.

## Service menus

`ui/cooking-sheet.js` and `ui/festival-meadow-sheet.js` are relaid out; the new styles are in `ui/service-premium.css`, which loads before `polish.css`.

- **Header:** the owner strip (`.service-hero`) replaces the sheet's own title.
- **Kitchen:**
  - The tabs carry icons (`serviceTabs`).
  - The cooker and batch size are pill toggles. They use the new attributes `[data-cooking-station-pick]` and `[data-cooking-batch]`; the groups keep `[data-cooking-station]` and `[data-cooking-batches]`.
  - What's cooking now is a card with a live bar.
  - Recipes are tiles with a readiness badge (`shortReason`). The chosen recipe opens a panel beneath its row: have and need for each input, equipment, yield, time, price and one Cook button.
- **Sell:**
  - Skyla's food wall is two slots you fill by tapping `[data-cooking-display-pick][data-recipe]`.
  - Prices are steppers: `[data-cooking-price-set][data-value]` inside `[data-cooking-price]`.
- **Sandy:**
  - Each drink is a card with a stock bar (`.supply-meter`), a price stepper and a restock button.
  - Plain cocoa reuses `[data-cocoa-price]`; specials use `[data-special-price-set]`.
  - Open and closed is a switch.
- **QA tools:** `tools/qa-cooking.mjs`, `qa-service-menus.mjs` and `qa-kitchen-workshop.mjs` follow the new controls. They were not rerun end to end.
- **A bug in handover 51's `polish.css`:** it had repainted every amber `purchase-button` as glass, leaving dark text on a dark ground. Buttons with `.purchase-button` or `.is-destructive` are now excluded.

## Hayride depot

`hayride-station.js` has two changes.

- **Ground:** the tiles had hairline gaps showing the dark base as grid lines. They now meet edge to edge, with:
  - varied heights (low wet ruts, a proud crown and verges);
  - puddles, tread marks, pebbles and tufts.
- **Tunnels replace the tree arches:**
  - A wooded hill behind the station, with stone-arched bores, a skull keystone, lanterns, dead trees and gravestones on top.
  - A low grassy bank with a parapet across the foreground.
  - Each bore (`bore()`) is a dark lined passage, deep enough that the convoy is inside the hill before the farm hides it.
  - `HAYRIDE_HILLS` keeps wild trees out.
- **Tests:** the portal limits in `hayride-station.test.mjs` still hold: under 4 for the return and under 5.6 for the departure.

## Spider cave and spiders

`hayride-spiders.js` (new) builds the cave and the spiders.

- **The cave:** `buildSpiderCave` builds it along the curve of the lane in the ride land, replacing the stone box in `makeScenicSet`.
  - The vault has stalactites, orb and sheet webs, torn curtains at both mouths, glowing egg sacs, cocoons, bones and eyes.
  - Silk is one `LineSegments`.
  - The forest's clear radius for the stop is now 7.4.
- **The spiders:** `createSpider` is a jointed rig: body, breathing abdomen, eight eyes, fangs, palps, and eight legs of three hinges.
  - `poseSpider` handles gait, rear, flail and fangs.
  - `createBrood` draws them all in two InstancedMeshes; `mount` sets a spider on a surface.
- **What they do:**
  - A giant rears on the vault.
  - The dropper falls on its thread (gated by the `spider-drop` haunt).
  - Others crawl the walls, the floor and every third lantern post.
  - The thicket's web spider is jointed too (gated by `route-thicket`).
  - Gentle mode stills them all.
- **Tests:** `test/hayride-spiders.test.mjs` checks the rig, the brood and that nothing static in the cave stands within 1.5 of the lane below 2.9.

## Goals

- **Thirteen grand favours**, paying £900 to £30,000, and **eleven new memories**, in `rules/progress.js`.
- **Favour portraits** use `favourFace(f)`, which handles every guest kind; they used to show only the first five.
- **Money favours** carry `money: true`, so other counts over 100 no longer show as pounds.
- **Chimes:** several new memories met at once chime only once.
- **Plan:** `docs/plans/late-game/README.md` proposes, in order:
  1. levels 21–30;
  2. commissions;
  3. a boathouse on the lake;
  4. Blood Moon nights;
  5. house wings;
  6. managers;
  7. a giant pumpkin contest.

  It includes target numbers for the simulation.

## Checks

- `npm test`: 538 pass.
- Smoke: 52 pass after a fresh build.
- Screenshots were checked for:
  - the menus at phone and desktop sizes;
  - the depot from above, during a departure and at the foreground bank;
  - the spider cave at two points on the ride;
  - the journal, with all 23 portraits loading.

## For Codex next

- **Plan:** pick up the late-game plan from step 1. Add `fresh`/`restore` functions and a save test for anything new.
- **The other ride sets** (scarecrows, the bride, the pursuit, the bus, the graveyard) have not had the spider cave's pass. They would gain most from:
  - set dressing at eye level;
  - a jointed actor each, using the rig-and-brood approach.
- **QA tools:** rerun the three updated tools against a build to confirm them.
