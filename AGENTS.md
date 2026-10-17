# Notes for coding agents

Shane & Natalie's Pumpkin Patch is a cosy Halloween farm game that ships as **one offline HTML file**. Read `README.md` for the layout, `docs/ARCHITECTURE.md` for how it works and `docs/PLAN.md` for what comes next.

## Commands

```sh
npm ci              # install (Node 20+)
npm test            # unit tests: rules, saves, routes, outfits. Must pass.
npm run build       # dist/pumpkin-patch.html
npm run smoke       # plays the built file in headless Chromium (needs a Chromium: npx playwright install chromium, or set CHROMIUM_PATH)
npm run check       # all three: what CI runs
npm run sim -- --minutes 240 --player planner   # economy simulator
npm run audit:ui -- --strict   # interface rules at five screen sizes (needs Chromium, like smoke)
npm run dev         # http://localhost:8000 with live rebuilds
```

## Rules

- **Saves.** Never change the save key `sn-pumpkin-patch-halloween-v2`. A save-format change bumps `version` in `fresh()` (`src/core/model.mjs`), and the next one goes to **20**, not 10: 10–19 belong to lost builds. It also teaches `decodeSave` and `repairSave` the old format, and adds a real save from the previous build to `test/fixtures/`.
- **Ids are permanent.** Outfit, decor, book, room-style and upgrade ids are stored in saves. Add new ones; never rename or remove existing ones.
- **`src/core/` has no DOM.** No `document`, `window` or `localStorage` there; the tests and simulator run it in Node. Content data goes in `src/content/`, drawing in `src/scene/` and `src/app/`, menus in `src/ui/`.
- **Offline.** No network requests, CDNs or external fonts. Assets go in `assets/`, and the build inlines them. Code requests art by path through `asset("assets/…")`.
- **Balance.** If a change can affect earnings, run `npm run sim` before and after, and put both outputs in the PR description.
- **Tone.** UK English, warm and a little dry. Cosy, never punishing: no fail states and no penalties for being away.
- **Generated-looking names.** The source was recovered from a bundle, so names like `level2` or `app2` are leftovers. Rename them only in files you are already changing.

## Common tasks

- **New outfit:** follow `docs/ADDING-OUTFITS.md`. `test/outfits.test.mjs` checks the sheets and metadata.
- **Visitor paths:** edit the points in `src/content/visitor-routes.mjs`. Timings follow from the route lengths.
- **UI work:** follow `docs/UI-OVERHAUL.md`.
  - New styles go in `src/styles/shell.css` (or a new file listed after `legacy.css` in `scripts/build.mjs`), scoped under `body.shell` and using the `--pp-*` tokens. Don't add rules to `legacy.css`.
  - `npm run audit:ui -- --strict` must pass.
  - Look at phone portrait (390×844), phone landscape (844×390) and desktop (1280×800).

## Before you open a PR

`npm run check` passes. The PR says what changed for the player, and includes simulator output if balance moved and screenshots if anything visible changed.
