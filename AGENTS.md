# Agent notes for this repository

This repository holds two versions of Shane & Natalie's Pumpkin Patch, a cosy Halloween farm and shop game. Each ships as one offline HTML file.

| Where | What | Read first |
| --- | --- | --- |
| repo root (`src/`, `scripts/`, `test/`) | **The main game**, Midnight 2.10: a 2D canvas game, also packaged for Android | [`README.md`](README.md) (rules for changes), then [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/REVIEW.md`](docs/REVIEW.md) |
| `voxel/` (branch `voxel-reference`) | **The voxel game**: a three.js voxel version with the same features, using the main game's sprites, decor art, icons, music and content files | [`voxel/AGENTS.md`](voxel/AGENTS.md) |

## Ground rules

- **Know which game you are changing.** The two have separate builds, tests, saves and CI jobs. The voxel game imports the main game's data modules (`src/content/*.mjs`, `src/core/costume-model.mjs`), so changing those affects both.
- **Main game:**
  - Never change the save key (`sn-pumpkin-patch-halloween-v2`) or the Android origin.
  - Save format changes bump the version, migrate, and add a fixture.
  - Keep `src/core` free of DOM code.
  - Measure balance changes with `npm run sim`.
- **Voxel game:**
  - Its saves use their own key, so it never touches the main game's progress.
  - See `voxel/AGENTS.md` for its commands, code map and conventions.
- **Checks before you push:**
  - Main game: `npm run check` at the root (tests, build, smoke).
  - Voxel game: `npm test`, `npm run build` and `npm run smoke` in `voxel/`.
  - Both games are visual, so look at screenshots of what you changed.
- **Writing:** British English, plain and short, in code comments, the interface and docs.
