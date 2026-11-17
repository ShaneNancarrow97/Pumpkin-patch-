# 65 — TV mode, Cast to TV, full controller play, Maisie's glowing buttons, five songs and Sandy's dance floor

Branch: `voxel-reference` (lead), following handover 64. The player asked:

- "Add to game, start improving sandy upgrades such as dance floor not looking very visible on overworld. Start scoping out the dreamlight NPC village work and ground work" (with five MIDI files).
- "Design better for when smart casting TV to phone and using PS5 controller, menu's in 16:9 view are way too big and need reducing in size, x on menus easier to click using PS5 touch control, better usage of D-PAD and thumbsticks, maisies truck buttons not always glowing orange when you can do something, menu size fit more on screen for TV 16:9 view, thumbsticks scroll, dpad navigation etc. - also simpler view for TV mode, maybe have TV mode as a toggle in settings … prioritise this ASAP"
- "TV Mode HTML as soon as ready - before village", "add a native cast to TV function", "full controller navigation and visibility ease", "fold phone open - screen share don't forget", "make it even more visible squeeze more on".

## Songs and the meadow (`e5c7350`)

- **Five songs:** Where Is My Mind?, Zombie, Killer Queen, Creep and the Numb (Tim Dawes remix) riff. That makes 21 tracks in all.
  - The Numb file is one riff of about seven seconds.
  - `loopClip(clip, times)` (`ui/midi.js`) plays it nine times through on its own length, so it runs as a seamless minute (`MUSIC_REPEATS`).
- **Sandy's dance floor** (`festival-meadow-world.js`):
  - It's now a low dais of cream and plum boards edged in brass.
  - Bulbs chase round its rim, and a maypole of festoon lights stands under a turning mirror ball.
  - A big brass gramophone stands beside it.
  - Guests on it stand on the dais and dance.
- **The cocoa trolley** gets a striped canopy and a lantern, so it reads from the farm too.

## TV mode

**What it is.** A Settings switch (`prefs.tvMode`, under "TV and controller") for a phone mirrored to a TV and played with a controller. It's built in `ui/tv-mode.js` and `ui/tv-mode.css`, which is loaded last.

**One zoom for everything over the world.**

- The page sets `--tv-zoom`, and every overlay root takes `zoom: var(--tv-zoom)`: the HUD, dock, actions, sheet, Manage menu, stock popover, cards, play controls, carving and celebrations.
- `tvZoom(height, size)`:
  - It shows a screen as a 700-pixel-tall one would, at most .75 and at least .45.
  - A folded phone mirrored at 16:9 (412 tall) gets .59. An unfolded Fold (about 750 tall) gets .75, so its menus don't cover the TV.
  - "TV menu size" (Compact .86×, Standard, Large 1.18×) scales it, and it never goes past 1.
- **Zoom scales an element's own px and its vh units, but not percentages.**
  - Heights in vh inside a zoomed root are divided by `--tv-zoom` in `tv-mode.css`.
  - The Manage menu places itself in px from script, so `upgrade-menu.js` divides by the menu's own computed zoom.
  - Anything placed at a projected world point stays unzoomed: the play prompt, speech bubbles and `#fx`.

**Menus.**

- Centred sheets open wider (up to 880 px before zoom) and as tall as the screen allows.
- Rows are tighter: 38 px buttons, smaller card padding and gaps.
- Muted words are brighter (`--ink-soft`).

**Close buttons.**

- `#sheet-close` and the stock popover's × are 60 px rounds, easy to hit with the DualSense touchpad's pointer.
- With a pad connected they carry a ○ badge (B on Xbox).
- A tap on the dimmed farm still closes a centred menu.

**The ring** is a bright band inside a dark one, with a wide glow, so it shows on light buttons and dark cards alike from across the room.

**Play mode with a pad.**

- The touch sticks, face buttons and furniture pad hide.
- A slim legend at the bottom replaces them, showing the action (with its progress), the tool, walk or jog, the camera and the menu.
- While a piece is selected, a furniture legend shows: D-pad to move, L1/R1 to turn (or go to the next wall), △ for more, ○ when done.
- `body.has-pad` and `body[data-pad]` are set by the play controls each time the pad changes.

## Cast to TV

**What it does.** The Settings button opens the `cast` sheet. "Get ready to cast" (`tv.ready()`) does everything a page is allowed to:

- turns TV mode on;
- goes fullscreen and locks to landscape;
- keeps the screen awake with a wake lock, taken again on return.

It then lists what took, the mirroring steps for this device and the controller's state.

**The steps** (`castRoute`, `CAST_STEPS`):

- Android: Smart View, or Cast or Screen cast, with Samsung's "Full screen on connected device" tip for 16:9.
- iPhone and Mac: Screen Mirroring.
- Chrome on a desktop: Cast….

**What it can't do.** A web page can't start Smart View, Cast or AirPlay itself. The Presentation API needs a registered Cast receiver app, and Remote Playback would cast only the canvas, without the menus. The phone has to do the mirroring.

**The controller.** Its first connection in landscape shows a one-time notice pointing to TV mode (`prefs.tvHinted`).

## Full controller navigation (`ui/pad-menu.js`)

**Scrolling with the D-pad and left stick.** Up or down scrolls a step instead of moving the ring in two cases:

- nothing lies further that way;
- the next choice is more than half a screen past the edge, so the words between are read.

The right stick and L2/R2 still scroll as before.

**The hub (Options)** now reaches:

- the Play chip;
- a neighbour's reward card (Collect);
- guest and chat cards;
- the Hollow House and hayride context cards;
- dialogue.

**Other fixes:**

- **The tea break counted only taps, clicks and keys.** Someone playing only on a controller was paused after ten minutes and couldn't resume without touching the phone. Any pad button, or a standard pad's stick pushed past .35, now counts as being there (`padInUse`, `stillHere` in `main.js`).
- **Opening a sheet closes the Manage pop-up menu.** Before, the pop-up could stay open behind the sheet and block play.

## Maisie's kitchen: what can be done glows

- **Glowing buttons.** `cooking-sheet.js` marks every button that can act now `.can-act`: an amber fill with a slow glow (`cooking-simple.css`). That covers:
  - Cook;
  - Learn recipe;
  - Use home kitchen, Get cookware and Add missing ingredients;
  - Order;
  - Choose a dish for an empty food-wall slot with food ready;
  - an affordable upgrade or piece of cookware;
  - buying the truck.
- **The next-step notices' links** are glowing pills (`.can-act-link`).
- **Tab dots.** A tab with something to do carries a glowing dot (`data-has-action`, `tabActions`):
  - Cook: a dish ready on an idle cooker.
  - Pantry: supplies to order.
  - Sell: food to put on show.
  - Progress: an upgrade within reach.
- **Recipe tiles** marked Ready glow softly.
- **The Cook button** is the ring's first choice (`data-pad-default`).

## Checking

- **692 unit tests pass.** `test/tv-mode.test.mjs` is new and covers the zoom's bounds and sizes, and each device's cast route and steps.
- **The smoke test passes 54/54.**
- **`dist/qa/tv-qa.mjs`** (ignored) runs a pretend DualSense through the farm, hub, Manage menu, Manage sheet, kitchen tabs, Settings, Cast and play mode.
  - `TV=1` turns TV mode on, `SIZE=` picks a size, and it takes `[outdir] [tag] [width] [height]`.
  - It was run at 732×412 (16:9 folded) and 832×750 (unfolded Fold).
  - Software WebGL draws a frame every second or more here, so it holds each press for drawn frames, not milliseconds. Shorter presses were simply missed.
- **`dist/qa/tv-debug.mjs`** probes what blocks play.

## Not done yet

- **The NPC village (Mothlight):**
  - `src/content/village.js` (the layout, residents, bonds, quests and blueprints from Codex's plan) is drafted but uncommitted.
  - Next: `rules/village.js`, save version 17, tests and the lead scope document.
- **The farm round, as in 61 to 64:** skins with a makeover, density and spookiness, and the hayride station's look.
- **The tractor engine on the farm.**
- **Wall pieces in a styled room's cornice; the toilet and pedal bin remodel.**
