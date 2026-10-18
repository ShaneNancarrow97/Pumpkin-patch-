# Architecture

## Startup

`src/main.js` calls `createGame()` in `src/app/game.js`, which:

1. loads the save
2. creates the action dispatcher and the fixed-step clock
3. loads the art
4. wires up the HUD

`main.js` then attaches each feature UI to `app.features` and calls `app.start()`:

| `app.features` key | Module |
| --- | --- |
| `audio` | `ui/audio-ui.js` |
| `home` | `ui/house-ui.js` |
| `outfits` | `ui/costume-ui.js` |
| `menus` | `ui/menu-ui.js` |
| `backups` | `ui/save-ui.js` |
| `festivals` | `ui/festival-ui.js` |
| `library` | `ui/library-ui.js` |
| `shop` | `ui/shop-ui.js` |
| `plots` | `ui/plot-ui.js` |
| `rooms` | `ui/room-ui.js` |

The bundle exposes this as `globalThis.PumpkinPatch.app`. The Android shell and the smoke test rely on that name.

## Layers

```
content/   data only: prices, catalogues, customers, art frame rectangles
   ↑
core/      game rules on a plain state object; no DOM, no timers, no storage
   ↑
scene/     geometry and motion: farm paint order, room bounds, walking, shop layout
platform/  asset lookup (asset(path)) and localStorage persistence
   ↑
app/, ui/  DOM, canvas, menus; the only code that touches the page
```

`core/` is what the tests and `scripts/simulate.mjs` import directly in Node. **Keep it free of `document`, `window`, `localStorage` and `Date.now()` for game rules**, or the simulator can't run it. (`serialize` stamps `savedAt` with the current time; that's fine.)

## State and time

- All progress lives in one object: `fresh()` creates it in `core/model.mjs`. It holds coins, plots, inventory, upgrades, `shop`, `stall`, `house`, `wardrobe`, `festival`, `plotLevels`, `plotCrops`, achievements and settings.
- The game advances in fixed 0.1 s steps through `SimulationClock` (`core/clock.js`), at most 8 steps per frame. Time spent while the app is hidden or paused is dropped, not caught up.
- `update(state, dt)` runs one step: growth, the helper, outdoor passers-by (`core/stall.js`), the indoor shop (`core/shop.js`) and achievements. It returns events (`sale`, `ripe`, `arrival` and so on) for the UI to animate.
- Player actions go through `createActions` and `dispatchCommand` in `core/commands.js` as typed commands, such as `{ type: "plant", plot: 3 }`.

## Visitor routes

`content/visitor-routes.mjs` holds the stall visitors' paths as polylines in map units: `stallApproach` runs from below the map to the counter, and `stallDeparture` from the counter off the right edge. `scene/farm-layers.mjs` places each visitor along them at `visitorWalkSpeed`, the same pace as Shane and Natalie. The model's visit timings (`stallVisit`) are derived from the route lengths, so a sale happens exactly when the visitor reaches the counter. To change where visitors walk, edit the points and nothing else. The tests check that routes start and end off-screen and join without jumps.

## Inventory and selling

`core/inventory.js` stores stock as lots: a product, a quantity, a location and a unit price. A sale first reserves stock with a hold, then commits it, so two customers can't buy the last pumpkin twice. Indoor shop holds are saved with the game, so a reload in the middle of checkout loses nothing.

## Saves

| Item | Detail |
| --- | --- |
| Storage key | `sn-pumpkin-patch-halloween-v2`. **Never change it.** |
| Current schema | 9 (`fresh().version`) |
| Older schemas | `decodeSave` in `core/model.mjs` reads 1–9 and validates every field. Any failure returns `null`; this strict check is the gate every save must pass. |
| Damaged save | `repairSave` in `core/save-repair.mjs` resets only the sections that fail (coins, plots, stock, shop, house, outfits, stall and so on), keeping paid upgrades and purchases where it can. It then runs the strict check, and returns `{ state, repairs }`. The original is kept under `…-before-repair`, and the player sees a one-time "We patched up your save" dialog. |
| Unreadable or newer save | `platform/storage.js` keeps it, refuses to overwrite it and starts a fresh game. Settings explains which case it is. Saves newer than this build (schema 10 and up) are never repaired or guessed at. |
| Upgrading | Before upgrading an old save, it keeps one copy under `…-before-schema-N`. |
| Snapshots | Every save may also write a rolling copy to `…-snapshots`: up to three, at least ten minutes apart. Settings → Earlier copies restores one through the import preview, with Undo. |
| Backups | `core/save-model.mjs` wraps the save as `{ format: "pumpkin-patch-backup", revision: 1, gameVersion, state }`. Imports go through `repairSave` too, and the preview lists anything that will start fresh. The last download time is stored under `…-last-backup`; after seven days (once £1,000 is earned) a dot appears on the Settings gear. |

To change the save format:

1. Bump `version` in `fresh()`.
2. Accept the old version in `decodeSave` and fill defaults for new fields.
3. Update the retained-copy key in `storage.js`.
4. Add a real save from the previous build to `test/fixtures/`.

## Assets

Code asks for art by path, as in `asset("assets/house/room.webp")`, and so do the HTML and CSS. Each build resolves the paths differently:

| Build | Where assets come from |
| --- | --- |
| `npm run dev` | Real files are served from `assets/`. `PumpkinPatchAssets` is empty, so `asset()` returns the path. |
| `npm run build` | Every file under `assets/house` and `assets/ui` goes into `PumpkinPatchAssets` as base64. HTML `src`/`href` and CSS `url('assets/…')` references are inlined, giving one offline file. |

Paths that are built dynamically, such as `"assets/house/visitor-" + type + ".webp"` or the wallpaper SVGs, only work because the whole folder is in the map. Put new runtime art in `assets/house` or `assets/ui`, or add its folder to `RUNTIME_ASSET_DIRS` in `scripts/build.mjs`.

## Interface shell

Since 3.0 the page has one layout, `body.shell`, set out in `src/styles/shell.css`:

- **Map:** fills `main`.
- **HUD (`#hud`):** coins, stock, visitors and the Settings gear. It floats over the map, or sits at the top of the Home screen.
- **Actions (`#actions`):** float over the bottom of the map.
- **Navigation (`#dock`):** a bottom dock on portrait phones, a left rail elsewhere.

Rules to keep:

- **Sizes and layering come from the tokens.** New styles use the `--pp-*` tokens in `tokens.css` and are scoped under `body.shell`. Don't add new rules to `legacy.css`.
- **The camera is set by `viewMap()` in `app/game.js`.** It frames the big pumpkin and the plots using `FIELD_SPAN`.
- **`#commands` is a hidden holder** for the Settings, How to play, music and full-screen buttons that other modules still `.click()`. UI2 replaces it.
- **`npm run audit:ui` must keep passing.** It checks every layout against the rules in `docs/UI-OVERHAUL.md`.

## Build-time values

`__GAME_VERSION__` is replaced with `package.json`'s `version` at build time. Read it through `GAME_VERSION` in `platform/version.js`, which falls back to `"dev"` in Node. Settings shows it, and backups record it.

`platform/polyfills.js` is the first import in `main.js`. It adds `Object.hasOwn` and `Element.replaceChildren` for older Safari and Android WebViews.
