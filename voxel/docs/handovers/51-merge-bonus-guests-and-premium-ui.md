# 51 — Merge, bonus guests, the hayride depot and a premium finish

Branch: `voxel-reference` (lead). Codex's `contractor/life-play` (handovers 43–50) is merged in at `2636e3b`. Start new contractor work from `voxel-reference` after this handover, not from the old contractor branch.

## Merge and the level gates

Codex's twenty levels and home goals stand. The lead's tier gates in `rules/unlocks.js` are spread across them: the late tiers of plots, storage, cart, crowd, appetite, lights, loyalty, shop capacity, checkout and house now sit between levels 9 and 19. Cocoa, hayride, foyer and meadow tiers moved with them. Levels 13, 15, 17, 19 and 20 now award the Frankenstein, mummy and slasher costumes; level 20 also had a duplicate reward, which is fixed. The roadmap in the collection sheet lists the hayride, the Midnight Kitchen and its upgrades, visitor events and Hettie.

Tests that pinned old thresholds now use data-driven `atLevel` helpers that also claim the home goals, so a future change to the table won't break them.

## Bonus guests

The player asked for ride guests to be extra guests who then shop. Before this, hayride riders came out of the farm's own arrivals and cost about a third of income in an eight-hour simulation.

- The hayride now invites its own parties (`inviteRiders`, `HAYRIDE_GUESTS`: every 45 s, at quickest 14 s with upgrades, 2–4 a party). The Hollow House's opening party is bonus too.
- Bonus guests carry `bonus`. `visitorReservations` and `visitorWorldCount` (the 70 cap) skip them and anyone away on a ride; `visitorTotalCount` and `VISITOR_TOTAL_CAP = 110` bound everyone.
- Riders who came for the ride walk on to the stall afterwards, hungrier (+25), instead of going home. Only guests who came from the stall go home after it.
- Outdoor guests with a meal purse buy a takeaway at Maisie's hatch (`buyTakeaway` in `rules/selling.js`, route `takeaway`).

Result: the hayride run now earns slightly more than the run without it (£2.164M against £2.136M over eight hours), plus about £16k in tickets. The maze adds about 1%. Saves restore `guestTimer` and `guestsInvited`.

## Smaller fixes from the simulation

- A cooking dish short of pumpkins now says which to grow, or suggests a dish without them.
- A one-off notice points to Hettie the first time litter builds up; without her, income is about 19% lower.
- Notices stay up in proportion to their length.

## The hayride's farm station

`src/hayride-station.js` (new) builds the depot: an earthen two-rut track with a grassy crown, a boardwalk under a lantern arch, kerbs, a queue pen, a ticket barn with "The Hollow Hayride" sign, scarecrows, bales, corn shocks, a pumpkin cart and signposts. `hayride-world.js` calls `buildHayrideStation`; its lamp is `HAYRIDE_STATION_LAMP`. The return arch is in the foreground, so it stays under 4 units (the departure arch under 5.6); `test/hayride-station.test.mjs` checks both.

## Play controls

`ui/play-controls.js` and its CSS are rewritten for a console feel. All of Codex's ids and data attributes are kept, so the QA tools still find them.

- **Buttons and glyphs:** SVG action icons, and badges that follow the last input: keyboard keycaps, DualSense shapes or Xbox letters. The DualSense action stays Square.
- **Hold-to-aim wheel:** hold the tools button for 200 ms, or Y, Triangle, Q or Tab, and steer with a finger, either stick or the arrow keys; release to choose. A tap still opens it for tapping.
- **Feel:** `src/action-fx.js` (new) is a pooled InstancedMesh of particles. Planting, watering and picking each burst, float a word, play a chime and vibrate (`navigator.vibrate`, or the pad's `vibrationActuator`). A streak counter shows runs of work.
- The owner portrait retries until the image has loaded, which fixes a blank portrait on phones.

## Build catalogue

Home › Furnish is now a build-and-buy panel, after the player's reference. `ui/home-sheets.js` adds `kindOf(item)`, which sorts decor into kinds, the rail modes (by kind, by room, yours), kind icons and the picked-piece strip; `ui/build-catalogue.css` (new) docks it at the foot on phones and at the bottom left on wide screens. Every existing buy, place, show, wallpaper, shelve and read action is unchanged in the tiles.

## Finish

`ui/polish.css` (new) loads last. It gives primary buttons the amber key used by the play controls, makes sheet rows and attraction rows soft tiles, and puts the dock, HUD, notices and reward toast in the same glass. On phones the Play chip moves up by the top bar, where it no longer covers Enter house.

## Checks

- `npm test`: 530 pass.
- Smoke: 52 checks pass. It loads `dist/` as it is, so build first.
- `tools/qa-dualsense.mjs` and `qa-home-play.mjs` fail "DualSense Square plants using real rules" on Codex's own build too, before this merge; the check is stale, not the controls.

## For Codex next

- Keep new attractions' guests `bonus`.
- Restyle buttons and cards in `polish.css`, not earlier layers.
- The late game still runs short of things to buy after about six hours; the food truck is supply-limited at about £14k.
