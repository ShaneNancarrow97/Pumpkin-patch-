# 72: Build mode on a controller, and the TV guide for an LG

Branch: `voxel-reference` (lead), following handover 71. The player asked:

- "It's a lg tv";
- "Again build and furniture mode need to be easy to use with controller, analog sticks etc".

## What was wrong on a pad

- **No way to choose a piece already in a room.** Off play mode, a pad could move a piece only once something else had picked it up.
- **The catalogue started on its tab row.** One press down landed on the search box, and ✕ there did nothing.
- **A bought piece was stuck.** Buying put the piece in hand, but the menu stayed open and neither the menu nor the placement controls took the pad.
- **Picking a tile threw the grid back to the top.** The catalogue rebuilt itself on every pick, which reset its scroll. This hit mouse hover too, and the ring mid-scroll.

## Build mode on a pad

### Choosing a piece: the arrange outline

`ui/pad-arrange.js`; the choosing is pure, in `pad-arrange.js`.

- **Where:** a room, the garden or the foyer, off play mode, with nothing in hand and no menu open.
- **Left stick or D-pad:** the first push shows a gold outline on the piece nearest the middle of the screen. Each push after that hops it to the piece that way: within about 70° of the push, nearer and straighter first (`pieceInDirection`).
- **L1 / R1:** step through the pieces in reading order, left to right in rows (`cycleSpot`).
- **✕:** picks the piece up. The placement controls move it from there.
- **△:** opens the place's shop: Furnish in a room, the garden's catalogue, the foyer's decor.
- **○:** puts the outline away.
- **Right stick:** slides the room's camera along (`scene.panRoom`), or turns the garden's and the foyer's.
- **A legend under the HUD** names each button (`.arrange-legend`). "Done" shows only while the outline is on.
- **The scene's part:**
  - `scene.pieceSpots()` says where each piece stands on screen: in a room its box's centre, in the garden and the foyer its spot.
  - `scene.hoverPiece(id)` draws the outline: `places.select` in a room, the garden view's `hover`, and the foyer view's `preview`.

### Moving it

`ui/pad-placement.js`, from handover 67. The controls are as before: the stick glides, the D-pad steps, L1 and R1 turn, ✕ or ○ finish, □ undoes. New this round:

- the right stick looks about while a piece is in hand;
- once it's put down, the outline goes back on it (the `placed` callback). A new garden or foyer piece gets it too, as the newest placed instance.

### The catalogue on a pad

`ui/home-sheets.js`, `ui/pad-menu.js`.

- **Where the ring starts:** on the piece last looked at (`data-pad-default` on the picked tile).
  - It shows at once when △ opened the catalogue: pad use outside the menus readies the ring for the next menu.
- **Each tile is one stop.**
  - The ring goes round the whole tile, picture, name and price.
  - The D-pad moves tile to tile and row to row, measured by the tile's box (`data-pad-box`).
  - The tile's own price button and the search box are skipped (`data-pad-skip`).
- **The strip** beside the grid shows whichever tile the ring is on.
- **✕ does what the tile's button says:** Buy, Place, Hang, Shelve, Read or Buy another.
  - The legend names it (`data-pad-label`).
  - On a tile it can't act on, it says why: the price, a full room, no shelf space.
- **A piece bought or placed from a pad goes straight into hand.** The menu steps aside so the stick moves it (`hand()`).
  - The garden's and the foyer's price buttons do the same.
  - On touch, they still put the piece in storage.
- **△ again returns to the same place in the grid.** The grid keeps its scroll through redraws and between visits (`data-keep-scroll`, `ui/menu-memory.js`).
- **Picking a tile no longer rebuilds the catalogue** (`ui.settle()`). This fixes the grid jumping to the top under the mouse as well.

### Fixes along the way

- **The arrange legend showed over menus:** its selector matched `data-arranging=""`.
- **The menu's button prompts stayed on screen** under a piece in hand after its menu closed (`menus.rest()`).
- **Pad menus:**
  - a menu can answer ✕ itself through the `padchoose` event;
  - `choiceKey` ignores the pad's own marks (`data-pad-*`), so a choice is found again after they change.

## The TV guide for an LG

Settings → Play on your TV, from a Galaxy phone, best picture first:

- **DeX with a cable:**
  - works with any TV with HDMI, an LG included;
  - if the TV only copies the phone, the Samsung DeX notification switches it to DeX;
  - for the least lag, turn on the LG's **Game Optimiser** (Settings, All settings, General) for that input, or **Instant Game Response** on 2020 sets.
- **DeX, wireless:**
  - Samsung lists its own TVs from 2018 and smart TVs that take Miracast;
  - most LG TVs take Miracast through **Screen Share**, but not every model is certified, so the cable is the fallback.
- **Smart View mirroring:** arrives through the LG's Screen Share. Set **Full screen on connected device** for no black bars.
- **The "why" note covers Google Cast.** LG has built it in from 2024, and added it to some 2022–23 sets with webOS 24. It hands over a video for the TV's own app to play, never a game drawn on the phone, so it isn't one of the routes.

## Checks

- **`npm test`:** 740 pass.
  - New this round: choosing a piece by a push, the nearest and reading order (`test/pad-arrange.test.mjs`), and `choiceKey` ignoring the pad's own marks.
  - The catalogue's binding test's stand-in button now has `addEventListener`.
- **`npm run smoke`** passes, 54 checks.
- **Browser checks** (`dist/qa`, not committed), on a pretend DualSense in TV mode on a folded phone:
  - **Room** (`build-pad.mjs`):
    - outline, hop, R1, pick up, move, turn, put down with the outline back;
    - △ opens the catalogue with the ring on at once;
    - across and down the grid as it scrolls, ✕ buys into hand, put down;
    - △ again lands in the same place in the grid, ○ closes.
  - **Garden and foyer:** the same, with their price buttons buying into hand.
  - **Grid scroll** (`grid-scroll.mjs`): it keeps its place when a tile is picked. It used to jump to 0.
  - **Grid on the pad** (`grid-pad-debug.mjs`): down steps row by row with no rebuilds.
  - **The TV guide** (`tv-sheet-lg.mjs`): on a folded phone and a 1920 × 1080 screen.
  - No page errors.

## Not done

- **Arranging is off play mode only.** In play mode, furniture is still reached through the tool wheel's Arrange, as before.
- **The touch placement card** still shows beside the pad's legend in the garden and the foyer.
- **No LG TV was to hand.** The LG steps follow LG's and Samsung's support pages.
