# 59 — Controller menus, centred menus and hold to buy

Branch: `voxel-reference` (lead), following handover 58. The player asked:

- "Improve control usage for play and menu navigation, make menus more centred and press and hold short thing for purchasing upgrades, easy comfy UI."
- "PS5 controller usage, I mean."

## Every menu on a pad (`ui/pad-menu.js`, new)

The carving bench's pad navigation (handover 58), made general. It replaces play mode's old `menuInput`, which stepped through a menu's buttons in a line.

| | DualSense | Keyboard |
| --- | --- | --- |
| Move the ring | D-pad, or the left stick (repeats while held) | Arrows (and Tab, as before) |
| Choose | ✕ (□ too) | Enter or Space |
| Buy | Hold ✕ | Hold Enter or Space |
| Back, or close | ○ | Esc |
| The menu's tabs, or a book's pages | L1 / R1 | |
| Scroll | Right stick; L2 / R2 a page at a time | |
| A slider or a list (music volume, render detail) | D-pad left / right | Arrows |
| The hub | Options, or the touchpad | |

- **The ring:** a gold ring marks the choice ✕ would take (`data-pad-focus`, as at the carving bench). It moves to the nearest choice in the direction pressed, preferring one in line with the move (`nearestInDirection`), so it runs along a row of tabs, down a list of prices and across a grid as you'd expect.
- **Where it starts:**
  - a choice marked `data-pad-default` (the intro's Next, the level card's Continue);
  - else the open tab;
  - else the first choice.
  - Never the way out: Close, Skip and Later are never where the ring starts.
- **Through redraws:** sheets redraw their HTML as the farm changes. The ring finds its choice again by id, its data or its words (`choiceKey`). If that choice has gone (just bought, say), it goes to whatever is now nearest where it was (`nearestTo`), not back to the top.
- **Scrolling:** the list scrolls just enough to show the ring, clear of a sticky row of tabs. After a scroll with the right stick, the next move starts from what's in view.
- **Hands back:** a tap, a click, a key or the mouse wheel hides the ring and the prompts. The first pad press after that only shows the ring again (○ and Options still act at once).
- **Menus it knows:**
  - in front of everything: the next-chapter card, the level card and the intro;
  - then the hub, while it's open;
  - then the stock panel, the Manage menu and the sheet.
  - Anything else holding the screen (the carving bench, a ride) keeps its own controls; ○ still goes through `back()`.
- **○ closes the stock panel** now too (`back()` in `main.js`; the panel has an `open` getter).

### The prompts

While a pad works a menu, a bar of prompts takes the dock's place at the bottom of the screen: "✕ Select ○ Close L1 R1 Tabs R Scroll ≡ Menu". On a price, "Select" becomes "Hold ✕ Buy", and on a slider it adds "Change".

- **The pad's own buttons:** the prompts are drawn in the pad's buttons, DualSense or Xbox.
- **Where they show:** not in the intro or the level card, which are a button or two each.
- **The dock again:** it comes back as soon as the pad hands back.

### The hub

Options (or the DualSense's touchpad) brings the ring down to the dock, the farm's buttons (Plant, Boost, Harvest), the HUD (stock, level, fullscreen, settings), a place's bar and the next-chapter chip. A pad can now reach every part of the game.

- **In play mode:** the dock is hidden, and the hub shows it again while it's open (`pad-hub` on the body).
- **Choosing:**
  - A dock tab opens its part of the game, and the ring goes with it.
  - Boost and the HUD's buttons keep the hub open.
  - ○ or Options closes it, back to where the ring was.
- **Showing the way:** the dock wears an Options glyph while a pad is connected, and play mode's HUD shows "≡ Menu".
- **A change:** Options in play mode used to open Manage directly. Manage is now one step right of Farm in the hub.
- **When it can't open:** at the carving bench, on a ride, or during the home journey (`hubAllowed` in `main.js`).

## Centred menus

- **In the middle:** sheets now open in the middle of the screen, over a dimmed farm:
  - on wider screens, a 580 px panel between the HUD and the dock;
  - in landscape on a phone, 560 px from the top to the dock;
  - in portrait on a phone, the full-width sheet above the dock, as before.
- **At the side:** menus that change the world in view stay where they were, beside it: furnishing a room, the shelves, the garden and the foyer (`WORLD_MENUS` in `main.js`). Only centred sheets get the `centred` class and the dimmed farm.
- **The dimmed farm (`#menu-scrim`):**
  - It sits under the dock, so the dock still switches menus.
  - Tapping it closes the menu.
  - It fades in with a keyframe animation, not a transition (see Notes).
- **Comfier:** centred sheets on wider screens have roomier padding, taller tabs and slightly larger card text.
- **Manage:** the Manage menu now rises from the dock in the middle of the screen, 380 px wide with taller rows, over the same dimmed farm.

## Hold to buy (`ui/hold-to-buy.js`, new)

- **What needs a hold:** a marked price button (`.purchase-button` with a £ in it) spends nothing until it has been held for 0.45 s.
  - A fill sweeps across it as it's held, the button pops, and a pad or phone gives a buzz.
  - A marked button without a price (the kitchen's Cook) is still a tap.
- **Every input:** the mouse, touch, Enter or Space, and ✕ (or □) on a pad.
- **A quick tap:** it says "Hold to buy" over the button ("Hold ✕ to buy" on a pad) with a little shake, and spends nothing.
- **Nothing spent by accident:**
  - A scroll that starts on the button, or a finger or the ring moving off it, cancels the hold silently.
  - A long press doesn't open a phone's menu or select text.
- **No redraws mid-hold:** the sheet doesn't redraw while a hold is running (`draw()` waits), so the button can't be swapped out under a finger. If it is anyway, the hold buys through its twin.
- **Settings:** "Hold to buy" On/Off (`prefs.holdToBuy`, on unless turned off).

## Fixes

- **Xbox pads read as DualSense:** an Xbox pad ("Xbox Wireless Controller") was shown DualSense glyphs, because "wireless controller" matched. `padFamily` (in `ui/glyphs.js`) now reads Sony's vendor id and leaves Xbox pads alone.
- **Glyphs:** the button glyphs moved from `ui/play-controls.js` to `ui/glyphs.js`, which play mode, the carving bench and the menus all share.

## Checks

- **`npm test`:** 589 pass. The new `pad-menu.test.mjs` covers:
  - the ring's moves (rows, lists, grids, the edges);
  - finding a choice again after a redraw;
  - which buttons wait for a hold;
  - the glyphs;
  - DualSense and Xbox ids.
- **In the browser,** with a pretend DualSense and no page errors (headless Chromium, software WebGL):
  - Options to the hub, right to Manage, ✕;
  - down and up the Manage menu, ✕ to Farm upgrades;
  - R1 and L1 through the tabs, down to a price;
  - holding ✕ to buy it, then ○ to close;
  - a quick click that only says "Hold to buy", then a held click that buys;
  - Enter tapped (nothing) and held (bought);
  - the ring starting on a choice rather than Close when a menu opened by touch;
  - the dimmed farm closing a menu;
  - the hub in play mode, with play carrying on afterwards;
  - the carving bench still answering the pad: shapes, pumpkins, the lid and scoop held on ✕, the stencil book's tabs and the carving tools. ○ still leaves it with play mode on.
  - The Manage menu and the sheet measure exactly centred, at 1280 × 800 and on a landscape phone (844 × 390), where the ring and the prompts were checked too.
- **Smoke:** all 54 checks pass. The four purchases hold to buy (a `buy()` helper), and a new check at each size that a quick tap on a price spends nothing.

## Notes for Codex

- **New things to buy:** mark them with `.purchase-button` (`ui/purchase-surfaces.js` does this for the known ones) and put the price in the button. Without a £ the hold doesn't apply.
- **New menus:**
  - Add their selector to `MODALS` or `PANELS` in `ui/pad-menu.js`.
  - Mark the starting choice with `data-pad-default`.
  - A row of tabs in `.segmented` turns on L1/R1, as does a `.pager` with `[data-page]` buttons.
  - A sheet that works on the world in view belongs in `WORLD_MENUS`.
- **QA with a pretend pad:**
  - Software WebGL runs at about one frame a second at 1280×800, so a one-frame tap on the pretend pad is really a long press. Test quick taps by mouse or keys.
  - Hold presses until a state changes, never for a fixed time.
- **CSS transitions:** in that slow headless browser, a transition on the dimmed farm sat at its start for seconds. Keyframe animations behave, so use those for things that appear.
