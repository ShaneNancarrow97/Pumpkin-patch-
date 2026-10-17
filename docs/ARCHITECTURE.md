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

## Inventory and selling

`core/inventory.js` stores stock as lots: a product, a quantity, a location and a unit price. A sale first reserves stock with a hold, then commits it, so two customers can't buy the last pumpkin twice. Indoor shop holds are saved with the game, so a reload in the middle of checkout loses nothing.

## Saves

| Item | Detail |
| --- | --- |
| Storage key | `sn-pumpkin-patch-halloween-v2`. **Never change it.** |
| Current schema | 9 (`fresh().version`) |
| Older schemas | `decodeSave` in `core/model.mjs` reads 1–9 and validates every field. Any failure returns `null`. |
| Unreadable save | `platform/storage.js` keeps the unreadable save, blocks overwriting it and starts a fresh game. The Settings menu explains this. |
| Upgrading | Before upgrading an old save, it keeps one copy under `…-before-schema-N`. |
| Backups | `core/save-model.mjs` wraps the save as `{ format: "pumpkin-patch-backup", revision: 1, state }`. |

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

## Build-time values

`__GAME_VERSION__` is replaced with `package.json`'s `version` at build time. It isn't used yet; see REVIEW R2.
