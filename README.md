# Shane & Natalie's Pumpkin Patch

A cosy Halloween farm, shop and home game starring Shane, Natalie and Skyla the cat. You grow pumpkins, serve ghostly visitors at the stall and in Skyla's shop, and spend the takings on upgrades, a four-room house, decor, books and costumes. It runs fully offline: the game is a single HTML file that opens in Safari or Chrome, and the same file runs inside a small Android app.

This repository started from the source of **Midnight 2.10** (save schema 9), the build inside `Pumpkin_Patch_Midnight.apk`. Development continues from **3.0 "Lantern"**; see [docs/PLAN.md](docs/PLAN.md) and [CHANGELOG.md](CHANGELOG.md). See [What's in here](#whats-in-here) for how the source was recovered and what is missing.

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer.

```sh
npm install
npm run dev        # play at http://localhost:8000, rebuilds when you save a file
npm test           # unit tests for the game rules and save format
npm run build      # makes dist/pumpkin-patch.html, the single file you share
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build:android` | Makes `dist/android/index.html` and `android-shell.js`, the two files the Android app loads |
| `npm run sim -- --minutes 120 --player planner` | Runs the economy simulator (see [docs/SIMULATOR.md](docs/SIMULATOR.md)) |
| `npm run smoke` | Opens the built file in headless Chromium, then plants, harvests, saves and checks for errors |
| `npm run check` | Runs the tests, the build and the smoke test, which is what CI runs |

To run the smoke test you need a Chromium browser: either run `npx playwright install chromium` once, or set `CHROMIUM_PATH` to a browser you already have.

## Project layout

```
src/
  main.js            entry point: creates the game, then each feature's UI
  index.html         page template (the build fills in the CSS, JS and assets)
  styles/game.css    all styling
  app/game.js        game loop, canvas rendering, HUD, save/load wiring
  core/              pure game rules, no DOM: these are what the tests and simulator use
  content/           data: prices, catalogues, customers, art frame coordinates
  scene/             geometry and motion for the farm, rooms and shop
  ui/                one module per feature: house, outfits, shop, stall, library…
  platform/          asset lookup and localStorage persistence
assets/              art, music and the font, as real files
android/             the Android WebView bridge script and app icon
scripts/             build, dev server, simulator and smoke test
test/                node:test unit tests and real save-file fixtures
docs/                review, roadmap, improvement plan and architecture notes
```

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains how the pieces fit together.

## Rules for changes

- **Never change the save key** (`sn-pumpkin-patch-halloween-v2`) or the Android origin (`https://appassets.androidplatform.net/`). Either change orphans everyone's progress.
- **Any change to the save format** bumps `version` in `fresh()` (in `src/core/model.mjs`), teaches `decodeSave` to read the previous version, and adds a fixture to `test/fixtures/`. Then `npm test` proves older saves still load.
- **Keep `src/core` free of DOM code**, so the tests and the simulator can run it in Node.
- **Measure balance changes** with `npm run sim` before and after, and put both outputs in the pull request.
- The release file must keep working offline when opened directly from a phone's Downloads folder, so it can't load anything from the network.

## Docs

- [docs/PLAN.md](docs/PLAN.md): the development plan, phase by phase. Start here.
- [docs/REVIEW.md](docs/REVIEW.md): a review of this code with measured economy numbers.
- [docs/IMPROVEMENT-PLAN.md](docs/IMPROVEMENT-PLAN.md): the review and improvement plan for v2.10, in workstreams A–L.
- [docs/ROADMAP.md](docs/ROADMAP.md): the alpha-to-beta roadmap (B0–B6).
- [docs/POLISH-REVIEW.md](docs/POLISH-REVIEW.md): the Midnight 2.2 polish review.
- [docs/BACKLOG.md](docs/BACKLOG.md): the first concrete tasks, in order.
- [docs/SOURCE-RECOVERY.md](docs/SOURCE-RECOVERY.md): how this source tree was rebuilt from the shipped game.
- [docs/ANDROID.md](docs/ANDROID.md): how the Android app is put together.

## What's in here

The original `src/` project was not available, so this tree was rebuilt from the shipped single-file game. The bundle had kept every module's file path, so the module structure is the original one, and the rebuilt game passes the same browser smoke test as the shipped file and looks the same. Some things did not survive the bundling: TypeScript types, and comments other than section notes. Some local names also carry a number suffix, such as `level2`. Details are in [docs/SOURCE-RECOVERY.md](docs/SOURCE-RECOVERY.md).

The roadmap describes releases up to **Midnight 2.16** (save schema 13). The newest code that was provided is **2.10**, so 2.11–2.16 (chutney and the preserving bench, shop looks, upgrade paths, visitor routes, the UI refinement passes and item sizing) are **not in this repository**. If a newer HTML build or the original `src/` folder turns up, it should replace this tree. See [docs/REVIEW.md](docs/REVIEW.md#1-which-version-is-this).
