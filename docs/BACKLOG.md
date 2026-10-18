# Backlog: first tasks

The full phased plan is in [PLAN.md](PLAN.md). These tasks are sized for a single pull request each and listed in a sensible order. They come from [REVIEW.md](REVIEW.md) and the workstreams (A–L) in [IMPROVEMENT-PLAN.md](IMPROVEMENT-PLAN.md). Each could become a GitHub issue.

## 0. Before anything else

- [ ] **Look for the 2.16 build or the original `src/` folder** (REVIEW §1). If found, recover it with `tools/recover-source.mjs` and replace this tree.
- [ ] **Find the Android signing keystore** ([ANDROID.md](ANDROID.md)).
- [ ] **Decide who the game is for** (plan §11): just the two of you, or a wider audience. That decides how much the music and font licences matter.

## 1. Save safety: 3.0 "Lantern" (plan workstream A)

- [x] Show the game version in Settings and write it into backups (R2).
- [x] Tolerant restore: repair a damaged section, list what was repaired, and show repairs in the import preview (R1).
- [x] Keep three rolling autosave snapshots in a second localStorage key.
- [x] Settings shows when the last backup was made, with a gentle reminder after 7 days.
- [x] Move the `Object.hasOwn` and `replaceChildren` polyfills into the game itself (R5).
- [ ] A copy-and-paste transfer code for moving saves without files.

## 2. Balance: plan workstream B, measured with `npm run sim`

- [ ] Add a simulator check to CI that fails if `everythingBought` for `planner` moves by more than 15% without the baseline being updated on purpose.
- [ ] Point new players at the shop: make "Open Skyla's shop" the goal once £600 is in reach (REVIEW §3, point 4).
- [ ] Experiment: a second till as a shop upgrade. Measure income per £ spent against the capacity upgrades.
- [ ] Experiment: barn capacity, with surplus turned into something useful (compost that speeds growth, or gifts to regulars).
- [ ] Give tapping its own reward, such as quality stars that sell for +20% (plan workstream H). Today eager play earns 1% more than planner (REVIEW §3, point 2).

## 3. Goals: plan workstream C

- [ ] Replace the four levels (which end at £1,000) with a ladder of about 25 that spans the whole economy.
- [ ] Add a "Next three goals" panel.

## 4. Size and polish

- [ ] Re-encode the largest WebP files and measure the saving (R4).
- [ ] Embed Fraunces, or choose the fallback serif on purpose (R3).
- [ ] Split `app/game.js` into loop, renderer and HUD modules (R6).
- [ ] Rename the `level2` and `count3` style names left over from bundling, one module at a time.

## Already done in this repository

- [x] Source tree recovered from the 2.10 build, with the original module layout
- [x] Build to one offline HTML file, an Android build, and a dev server with live rebuild
- [x] Unit tests for the rules, clock, persistence and backups, with real schema 7 and schema 9 save fixtures
- [x] Headless economy simulator
- [x] Browser smoke test and GitHub Actions CI that uploads the built game
