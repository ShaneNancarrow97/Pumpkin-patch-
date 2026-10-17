# Code and balance review: Midnight 2.10

Reviewed 17 October 2026, after rebuilding the source from the shipped game ([SOURCE-RECOVERY.md](SOURCE-RECOVERY.md)). This review adds to [IMPROVEMENT-PLAN.md](IMPROVEMENT-PLAN.md) rather than repeating it. That plan's balance figures were estimates from reading the code. The figures below are **measured** by running the real game rules in the simulator (`npm run sim`).

## 1. Which version is this?

Three different versions turned up in the files provided:

| Source | Version | Save schema |
| --- | --- | --- |
| `Pumpkin_Patch_Midnight_6.html` | about **2.8** (rooms present; walking art and the outdoor stall model missing) | 7 |
| `Pumpkin_Patch_Midnight.apk` → `assets/index.html` | **2.10** | 9 |
| `ROADMAP.md` | describes **2.16** as current | 13 |

This repository is built from the newest code available, **2.10**. The 2.11–2.16 work in the roadmap is missing: the preserving bench and chutney, shop looks and fixtures, the upgrade-paths screen, visitor routes and group sizes, the two UI refinement passes and item resizing. **If a 2.16 HTML file or the original `src/` folder exists anywhere, find it before building new features.** Re-implementing six releases would cost far more than looking for them. The 2.8 HTML still earned its keep: a real schema 7 save from it is now a test fixture.

Saves are the risk. A phone that ran 2.16 holds a schema 13 save. This 2.10 code rejects schemas newer than 9 and starts a fresh patch, although it keeps the original save rather than overwriting it. So **don't install a build from this repository over a 2.16 install** until the schema is past 13 or the newer source has been recovered.

## 2. What's working well

The improvement plan's §3 holds up in the code: the rules in `src/core` are pure and fully separated from the UI, saves are versioned and validated, and every import and save is checked before it replaces anything. That separation is why the simulator and tests in this repository took an afternoon rather than a rewrite. Keep it.

## 3. Measured economy

The simulator plays with four scripted players over the real `update()` loop at the game's 0.1 s step (seed 1):

- **idle** tends every 10 s and buys nothing.
- **steady** tends every 2 s and buys the cheapest upgrade it can afford.
- **planner** tends every 2 s and buys shop and demand upgrades first.
- **eager** plays like planner but also taps the big pumpkin twice a second.

### First hour

| Player | Earned | £/min | Harvested | Unsold at 60 min | Stall sales | Shop items sold |
| --- | --- | --- | --- | --- | --- | --- |
| idle | £2,608 | 43 | 714 | 515 | 149 | 0 |
| steady | £3,450 | 58 | 3,390 | 3,188 | 151 | 0 |
| planner | £6,430 | 107 | 900 | 370 | 149 | 331 |
| eager | £6,517 | 109 | 3,600 | 3,064 | 150 | 336 |

### Fifteen hours

| Player | Shop opened | Helping hands | £10k earned | Every farm, plot and shop upgrade bought | Unsold at 15 h |
| --- | --- | --- | --- | --- | --- |
| steady | 78 min | 69 min | 104 min | **4 h 17 m** | 404,014 |
| planner | 13 min | 17 min | 87 min | **4 h 39 m** | 335,299 |
| eager | 12 min | 17 min | 86 min | **4 h 36 m** | 1,369,200 |

What these show:

1. **Demand is the only thing that matters.** Outdoor sales are fixed by arrival rate: about 150 an hour whatever the player does, and almost nobody leaves empty-handed. Steady harvested almost four times as many pumpkins as planner in the first hour and earned about half as much, because it bought growth while planner opened the shop. This confirms findings F1 and F2 in the improvement plan.
2. **Tapping is worth nothing.** Eager taps 7,200 times an hour, harvests four times as much as planner and earns 1% more. The plan's workstream H (give tending its own reward, such as quality stars) is the right fix.
3. **The game ends sooner than the plan estimated.** Every upgrade on the farm, the plots and the shop is bought by about 4½ hours. Late income is roughly £700/min, so the remaining house, decor and wardrobe spending (about £27k) takes under another hour. A first playthrough is **5 to 6 hours of active play**, not "under ten". The plan's 25–30 hour target needs about five times today's content, or slower late income, or both.
4. **Buying the cheapest thing first is a trap.** Steady opens the shop more than an hour after planner because the cheap upgrades (watering can, yield) take the coins first. A new player will do the same. Point them at the shop: make it the first favour, or show "Open Skyla's shop" as the next goal once £600 is in reach.
5. **Stock grows without limit.** By 15 hours there are hundreds of thousands to over a million pumpkins nobody will buy. The 2.11 chutney work in the roadmap is aimed at this, but it is not in this code.

To reproduce: `npm run sim -- --minutes 900 --player planner --json`.

## 4. Code findings

| # | Priority | Finding | Where |
| --- | --- | --- | --- |
| R1 | High | *Fixed in 3.0.* **A single bad field throws away a whole save.** `decodeSave` returns `null` if any check fails, and the game then starts fresh. The original is kept and the game refuses to overwrite it (which is good), but the player sees an empty patch. Repair the damaged field to its default and report it, as workstream A of the plan proposes. The tests in `test/save.test.mjs` pin today's behaviour, so the change will show up clearly. | `src/core/model.mjs` `decodeSave` |
| R2 | High | *Fixed in 3.0.* **No game version is shown anywhere**, so a bug report or a backup can't say which build it came from. The build now defines `__GAME_VERSION__` from `package.json`. Show it in Settings and write it into backups. | `src/ui/save-ui.js`, `src/core/save-model.mjs` |
| R3 | Medium | **The headline font is never loaded.** The CSS asks for `'Fraunces'`, but only DM Sans is embedded, so every heading falls back to Georgia, or to the phone's default serif on Android. Either embed Fraunces (check its licence: it is OFL) or choose the fallback deliberately. | `src/styles/game.css` `--serif` |
| R4 | Medium | **The single file is 26 MB**, and about a third of that is base64 overhead. The ten largest images are 0.4–0.57 MB each. Re-encoding the sprite sheets and room art at quality 80 would probably cut 30–40% with no visible change. | `assets/house/` |
| R5 | Medium | *Fixed in 3.0.* **Browser compatibility differs between the APK and the HTML file.** The Android shell polyfills `Object.hasOwn` and `replaceChildren` for old WebViews, but the HTML file has no polyfills, so it fails on iOS before 15.4. Move those two polyfills into the game itself. | `android/android-shell.js` |
| R6 | Medium | **`game.js` (1,300 lines) holds the loop, canvas rendering, HUD, save wiring and the journal.** Split out rendering and the HUD before adding seasons or regulars (plan workstream L). | `src/app/game.js` |
| R7 | Low | **The stylesheet is a stack of per-release overrides.** It has about 20 sections headed "Midnight 2.2", "2.7" and so on that restyle earlier rules. Consolidate one surface at a time against screenshots, as the polish review advises. | `src/styles/game.css` |
| R8 | Low | **`decorAtlases` names three sheets that don't exist** (`furniture.webp`, `decor.webp`, `books.webp`). Only their rectangles are used; the art comes from the separate `item-*.webp` frames. Rename them to make clear they are metadata, so nobody goes looking for the missing files. | `src/content/catalog.mjs` |
| R9 | Low | **No time passes while the app is closed.** The clock drops anything beyond 0.8 s per frame, which is the right protection against exploits. But a welcome-back reward (plan workstream G) needs a separate, capped calculation that runs on load, not a longer catch-up loop. | `src/core/clock.js` |

## 5. Suggested order

1. **Look for the 2.16 build or source.** If it turns up, run `tools/recover-source.mjs` on it ([SOURCE-RECOVERY.md](SOURCE-RECOVERY.md)) and replace `src/` and `assets/`. The tests and simulator carry over.
2. **Make saves safe** (R1, R2 and plan workstream A). Add a fixture for every schema you can find.
3. **Rebalance demand first** (plan workstreams B and D), checking every change with `npm run sim`. Suggested first experiment: a second till, plus shelf caps that turn surplus into something useful.
4. **Stretch the goal ladder** (plan workstream C) to the 5–6 hours the game already has. Then add content towards the longer target.

[BACKLOG.md](BACKLOG.md) breaks these into tasks.
