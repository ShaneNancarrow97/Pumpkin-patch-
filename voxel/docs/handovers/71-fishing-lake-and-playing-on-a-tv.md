# 71: The fishing lake, and playing on a TV

Branch: `voxel-reference` (lead), following handover 70. The player asked for three things:

- "I want a clear game that's well optimised";
- "The Samsung play content streaming versus screen mirroring, I want you to build that functionality in the game direct, so the game streams in a similar high quality way versus traditional screen mirroring";
- "Add a fishing lake to the house garden for again supplies, add fish traps etc".

## The fishing lake

### Rules: `rules/fishing.js`, data in `content/fishing.js`

- **The lake is a garden piece,** `fishing-lake` in `ESTATE_DECOR`:
  - 7.2 by 5.2 units, £1,500, from house level 1;
  - `lake: true`, and `unique`, so only one can be bought (`buyEstateDecor`);
  - it is placed, moved and stored like any other piece.
- **Its jetty needs a clear landing,** a 1.5 by 1.2 strip ashore in front of it:
  - the lake only fits where that landing is inside the garden and clear of other pieces;
  - nothing else may later be put on it (`footprints` in `rules/house-estate.js`).
  - `selectForPlacement` now tries all four turns, so a bought lake finds a spot.
- **Fishing:**
  - `castLine` starts a wait, whose length the bait sets.
  - `updateFishing` turns the wait into a bite, and the bite into "gone" when the rod's strike window closes.
  - `strikeLine` lands a fish during a bite. Striking during the wait is "early" and scares it off.
  - `reelIn` ends it. The line is never saved.
- **Rolls come from a seed kept in the save** (`fishingRandom`, mulberry32), so a reload can't reroll and the tests are exact.
- **Eleven catches** (`FISH`), each with a rod weight, a trap weight, a size range and a picture's colours:
  - **common:** minnow, perch, crayfish;
  - **uncommon:** pumpkinseed sunfish, ghost roach, bog carp;
  - **rare:** midnight eel, witch pike, moon pearl mussel;
  - **legendary:** golden koi;
  - **junk:** an old boot.
- **Luck** (rod plus bait, or the trap tier) moves weight from commons and junk to the rarer fish (`LUCK`). `fishOdds` gives the table.
- **Gear:**
  - **Rods** (4): the strike window grows from 0.9 to 1.55 seconds, plus luck. The enchanted rod never hooks a boot.
  - **Bait** (4): the bite comes sooner, from 4–9 seconds down to 1.5–3.5.
  - **Traps:** up to four, bought one at a time (£240 to £2,400), then improved together in three tiers. A tier sets how often a trap catches something, from every 120 seconds down to 55, and how many it holds, from 3 to 5. Traps fill only while the lake is in the garden, stop when full, and are emptied by hand (`emptyTraps`).
  - Later tiers open at patch levels 6 to 12.
- **Supplies:**
  - **Fish and crayfish** are two new ingredients. They go to Maisie's pantry while it has room, as the garden's crops do, and the rest sells at their market price.
  - **Curiosities** sell to collectors: the koi for £400 and the pearl for £150. The boot goes back in the lake.
  - **Three new recipes** use them: a lantern fish supper (with pumpkin wedges), a bog crayfish boil and a witch's fish pie.
- **A catch log** records each kind caught and the best weight. The lake's total and earnings are kept too.
- **Saving:** `s.fishing` restores with defaults (`restoreFishing`), so `STATE_VERSION` stays 16.

### The lake in the garden: `fishing-lake-models.js`

- **The still parts** are 262 boxes in two batches (`addLakeModel`):
  - a dark bed and two rings of bank stones with moss;
  - five clumps of reeds and bulrushes;
  - lily pads, one in flower;
  - a planked jetty on posts, with a lantern at its end.
- **The water** is one flat oval (`lakeWater`), a Phong material whose ripples are worked out in the shader.
  - It is dark, with thin moonlit glints. A bright specular bloomed the whole surface white in the garden's light, so it was turned down.
- **The moving parts** (`createLakeLife`) ride on the lake's model, and the garden view updates them each frame:
  - the traps, one batch each, cork and all, bobbing; the full traps' glowing floats are one instanced mesh between them;
  - the rod, line and float while a line is out: the float twitches at nibbles and goes under at a bite;
  - the catch coming up the line to the rod's tip;
  - a fish that jumps every 9 to 18 seconds;
  - splash rings.
- **Cost:**
  - **The lake:** 3 draws.
  - **Its moving parts:** 8 draws with four traps and a line out, 9 with every trap full. That's down from 12 and 16 before the corks and floats were batched.
  - **Rules:** about 0.002 ms a frame.
- **Each catch is a small voxel model** (`fishModel`):
  - most fish are shaped by their colours, with stripes or spots;
  - the eel, the crayfish, the mussel and its pearl, and the boot are modelled on their own.

### Fishing in play mode

- **The jetty is walkable.** In `gardenGeometry` the lake is three blocks of water round it, so the owner can walk out to its end.
- **The garden's targets** add two prompts:
  - **Fish** at the jetty's end;
  - **Empty traps (n)** at its landing, once traps are set.

### The menu and the panel

- **`ui/fishing-sheet.js`** (`sheets.fishing`, under Home on the dock):
  - **Hero:** a photograph of the lake's own model, what it has brought in, Fish from the jetty, and Empty the traps.
  - **Trap row:** the four slots, each with how full it is and when it next catches.
  - **Two tabs** (L1/R1): the catch log, every fish pictured and a silhouette until caught, and the gear.
  - **Before the lake is dug:** Dig it, then Place it in the garden.
- **The pictures** are photographs of the same voxel models, through the carving stand's studio (`voxelPhoto` in `ui/stand-art.js`, used by `ui/fishing-art.js`). Without WebGL, a drawn fish stands in.
- **`ui/fishing-overlay.js`** is a panel low on the screen while fishing:
  - ✕ (or Space, Enter, a tap) casts, strikes and casts again; ○ (or Escape) reels in and closes.
  - At a bite: a ring counts down the strike window, a sound plays and the pad rumbles.
  - **The catch card:** the fish's picture, its rarity, New! or Personal best, its weight, and where it went.
  - **Control while it's open:**
    - play mode's controls stand aside;
    - the panel reads the pad's ✕ itself;
    - ○ comes through `back()`, as at the carving bench.
- **`startFishing` in `main.js`:**
  - goes to the garden;
  - in play mode, walks the owner out to the jetty's end first; otherwise turns the garden's camera onto the lake (`scene.focusGarden`).
- **The garden menu** pictures the lake with the same photograph. The garden's picture sheet holds the first 28 pieces only; `gardenSpriteIcon` now refuses indexes past it.
- **The kitchen** draws icons for ingredients newer than its painted sheet: fish and crayfish, and the garden's berries and seeds, which had none.

## Playing on a TV

### What could be built

- **Samsung's "play content" streaming** works because an app on the TV fetches and plays the content itself. A web page can't do that on a Samsung TV.
- **Chrome for Android's Presentation API** is reported to present only to Chromecast receiver apps, not Smart View or Miracast TVs. That rules out the in-game stream asked for.
- **DeX is the nearest thing:**
  - On a Z Fold 7 (One UI 8), by USB-C to HDMI cable or wirelessly to a Samsung TV, DeX gives the TV a screen of its own at the TV's resolution.
  - The game opened there is drawn for the TV, not copied from the phone.
  - The cable has no wireless lag.

### What changed

- **Settings → Play on your TV** (formerly Cast to TV) leads with three routes, best picture first:
  - DeX with a cable;
  - DeX wireless;
  - Smart View mirroring, with Phone aspect ratio → Full screen on connected device for no black bars.
- **A live "What the TV gets" check:**
  - the screen's shape: a 21:9 or square screen warns of black bars and says how to avoid them;
  - the picture's size;
  - how many frames a second it is drawing (sampled while the sheet is open);
  - whether TV mode is on.
- **An honest note** explains why a game can't stream to the TV the way YouTube does.
- **TV mode on a TV's own screen grows instead of shrinking.**
  - `bigScreen(w, h)`: landscape, 16:9, at least 900 CSS pixels tall.
  - There `tvZoom` keeps text at the same share of the screen's height as from a mirrored phone, about 1.85%, so 1.54 on a 1080 screen, capped at 1.6.
  - Phones keep the old zoom.
- **A hint, once:** opened on such a screen with TV mode off, a notice suggests turning it on.

## Clear and well optimised

- **TV mode's picture,** retuned in handover 70, matches the full picture on the TV.
- **The fishing lake** adds 3 draws for the lake and at most 9 for its moving parts. The water's glare was taken out.
- **The lake's panels** are near-solid, like the rest of TV mode.

## Checks

- **`npm test`:** 738 pass. New tests cover:
  - one lake per garden and its house level;
  - a cast, the bite, a strike in the window, and the fish into the pantry;
  - too early and too late;
  - better gear widening the window, speeding bites and making rare fish more than twice as likely, with no boots on the enchanted rod;
  - gear waiting for its level and price;
  - traps filling, stopping when full, and emptying into the pantry, or selling without a kitchen;
  - traps idle while the lake is stored;
  - the same farm always catching the same fish;
  - saves, with junk turned away;
  - the lake's plan, and walking out along the jetty but never into the water;
  - the jetty's landing staying clear;
  - the fish recipes;
  - TV mode growing on a TV's own screen.
- **`npm run smoke`** passes.
- **Browser checks** (`dist/qa/fishing.mjs`, `dist/qa/tv-sheet.mjs`, not committed) at desktop, phone and folded-phone TV sizes:
  - the lake in the garden, its menu before and after it's dug, the gear tab;
  - a cast, the bite, a catch;
  - traps full and glowing;
  - play mode on the jetty with the Fish prompt;
  - Play on your TV on a folded phone (it warns of 21:9 bars) and on a 1920 × 1080 DeX-sized screen (TV mode grows to 1.54, the check reads "A 1920 × 1080 screen of its own").
  - No page errors.

## Not done

- **The owner doesn't hold the rod in play mode.** The rod rests at the jetty's end, and the line runs from it.
- **DeX wasn't tried on a real phone and TV.** The game recognises a TV-shaped screen; the routes' steps follow Samsung's.
