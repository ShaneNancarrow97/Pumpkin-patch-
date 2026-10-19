# House, levels and MIDI — contractor patch for Claude

Branch: `contractor/house-levels-midi`
Base: `1a36b59f65f6295f3d328a8d0328be2c6deb4ef6` (`voxel-reference`)

Read the [full handover](../../handovers/05-house-levels-music-contractor.md) for each completed part, integration points, save migration, controls and balance. [Verification](QA.md) records completed checks and limits.

Completed: six premium voxel floor items; compact house UI; 360° floor rotation and side-wall hanging; fullscreen/Fold layout; gentler tap pumpkin; 12 levels with real one-time rewards, confetti and a jingle; 21-second base outdoor visitors and fourth frequency tiers; eight offline MIDI tracks, including all four supplied files.

## Pull and review

```sh
git fetch origin contractor/house-levels-midi
git diff 1a36b59..origin/contractor/house-levels-midi -- voxel
```

Review on a separate branch/worktree first. If your `voxel-reference` has moved or you have uncommitted room/building work, reconcile the integration hunks instead of overwriting files. This delivery does not edit `world.js`, `cottage.js`, `fixtures.js`, `interiors.js` or `voxels.js`.

To export a self-contained Git patch after fetching:

```sh
git format-patch --stdout 1a36b59..origin/contractor/house-levels-midi > house-levels-midi.patch
```

## Build the playable HTML

From the repository root:

```sh
cd voxel
npm ci
npm test
node build.mjs --out /path/to/pumpkin-patch-review.html
CHROMIUM_PATH=/path/to/chromium node tools/qa-house-levels.mjs --html /path/to/pumpkin-patch-review.html --shots /path/to/qa
```

Build output stays out of Git. The downloadable HTML supplied to the user was built from the same completed source and assets; its SHA-256 is in QA.md.

## Unfinished work

`drafts/` contains unintegrated, untested farm expansion, physical stands, kitchen research/crafting and chef automation proposals. These are documentation drafts, excluded from the game entry point. The handover lists the work needed before using them, including reconciling their proposed progression with the live level system. Do not present these as playable features.
