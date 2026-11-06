# Contractor handover: house, levels and music

## Integration base and ownership

Base commit: `1a36b59f65f6295f3d328a8d0328be2c6deb4ef6` on `voxel-reference` (Claude's published attic fix and ten furniture models are included). This is a contractor review build for Claude to integrate, not a deployment or a replacement of Claude's working tree. Delivery branch: `contractor/house-levels-midi`, for Claude to review and integrate.

The accompanying `changes.patch` includes the six new premium floor models and this UI/gameplay pass. Apply the complete patch to the stated base; individual parts share adapters and are not independent cherry-picks. On newer work, merge the small integration hunks manually. In particular, reconcile `scene.js` and `places.js` with Claude's unpublished room/fixture work. This pass does **not** edit `world.js`, `cottage.js`, `fixtures.js`, `interiors.js` or `voxels.js`.

```sh
git apply --check /path/to/changes.patch
git apply /path/to/changes.patch
cd voxel
npm test
node build.mjs --out /path/to/review.html
CHROMIUM_PATH=/path/to/chromium node tools/qa-house-levels.mjs --html /path/to/review.html --shots /path/to/qa
```

Keep the current game save before integrating. State version is now **4**; old voxel saves migrate in `restoreState`. No root 2D game source or save key was changed.

## Complete part 1: six premium floor models

Native greedy-meshed voxel art, catalogue entries, actual model thumbnails and tests:

| Item | Price | Footprint |
| --- | ---: | --- |
| Moonfire copper range | £14,000 | 3 × 2 |
| Harvest preserves dresser | £10,000 | 2 × 1 |
| Copper pumpkin kitchen island | £12,000 | 3 × 2 |
| Moonlit velvet canopy bed | £22,000 | 3 × 3 |
| Crescent carved wardrobe | £16,000 | 2 × 1 |
| Midnight looking-glass vanity | £18,000 | 2 × 2 |

Files: `decor-models/premium-{kitchen,bedroom}.js`, `premium-furniture-props.js`, `content/premium-furniture-catalog.js`, `premium-furniture-thumbs.js`, generated `assets/premium-furniture-thumbs/`; hooks in `decor.js`, `rules/house.js`, `ui/kit.js`. Catalogue now has 62 items. Existing six premium wall pieces hang higher to clear these taller pieces. Models have real depth, texture-free materials, shared geometry, at most two mesh batches per item and fewer than 50k triangles each.

Regeneration: `python3` is not needed for the floor models. Use `node tools/render-furniture-thumbs.mjs`; `node tools/build-furniture-showroom.mjs --out /path/to/viewer.html` produces the standalone model viewer. The original painted sprites remain in the root game unchanged.

## Complete part 2: house UI and placement

- Entering the house shows the room immediately. The room-name chip opens Rooms; Decorate opens Furnish. Selecting, buying or placing furniture closes the catalogue and reveals the piece.
- Compact context tray: Move, a rotation dial, rotation steps, More, Done. Books, Mirror, room transfers and storage stay in More. Move reveals four fine-position buttons; the floor grid appears only while moving.
- Floor furniture and rugs rotate through the full 360°: drag the dial, use ±15° buttons, press R/Shift-R, or twist two fingers on the canvas while an item is selected. Pinch remains zoom when no floor piece is selected.
- A ring indicates the selected floor footprint. A successful tap-placement clears selection, ring, grid and toolbar. Done and Escape clear them too.
- Wall pieces remain upright and can hang on Back/Left/Right. Side-wall fitting protects stairs, doorways, kitchen jar shelves and existing parlour sconces. Existing back-wall saves retain their original coordinates.
- Rotated collision uses a conservative enclosing rectangle, keeps the centre fixed, and refuses a turn that would intersect furniture, room bounds, stairs or thresholds. It does not push neighbouring furniture automatically.
- Optional saved placement fields: `rotation` (degrees, floor/rug) and `wall` (`back` default, `left`, `right`). For wall pieces, `x` is distance along the chosen wall; `z` stays zero.
- Room camera pan no longer resets when folding/unfolding or entering/exiting fullscreen. The HUD keeps coins and level visible indoors; farm-only statistics stay outside.
- DOM buttons are at least 44px; text stays at least 12px. Secondary menus scroll rather than overflowing the view.

Integration: `rules/house.js`, `ui/home-sheets.js`, `places.js`, small `scene.js` input hooks, `main.js`, `index.html`, `style.css`. Rotation updates a piece without rebuilding the entire room every pointer event. Selection geometry is disposed when replaced.

Known placement boundary: wall objects rotate to the wall's normal, not arbitrary roll. The known kitchen shelf and parlour sconce spans are reserved; Claude should publish any new built-in fixtures through a shared placement-clearance definition when integrating newer room work. Floor-vs-wall layers intentionally remain separate.

## Complete part 3: levels and visitors

A small Level chip with circular progress sits at the top. Tap it to preview the next rewards. Journal → Levels shows the entire progression. New levels show a dismissible spooky reward card, finite star/crescent confetti and a short original minor-key jingle. Reduced-motion mode removes confetti/entrance animation. The popup traps focus and temporarily makes the background inert; awards are already saved before it is shown.

| Level | Earned target | Rewards |
| --- | ---: | --- |
| 1 Little seed | £0 | Starting patch |
| 2 Growing roots | £150 | £35 + Harvest lantern |
| 3 Local favourite | £500 | £60 + Natalie's Harvest witch |
| 4 Autumn empire | £1,000 | £100 + watering-can tier |
| 5 Lantern keeper | £2,200 | £150 + Plum constellations wallpaper |
| 6 Midnight market | £4,500 | £225 + Shane's Dancing skeleton |
| 7 Moonlit harvest | £8,500 | £325 + harvest-yield tier |
| 8 Haunted hideaway | £15,000 | £450 + Arched gothic bookshelf |
| 9 Festival of frights | £26,000 | £650 + Natalie's Tiffany costume |
| 10 Spooktacular | £42,000 | £900 + Shane's Chucky costume |
| 11 Harvest legend | £70,000 | £1,250 + Midnight looking-glass vanity |
| 12 Forever Halloween | £110,000 | £1,800 + Natalie's Freddy and Shane's Jason costumes |

These are **free grants**, not new purchase gates on existing catalogue items. Costumes go into the wardrobe and are not auto-equipped; decor goes into storage and is not auto-placed. Upgrade gifts apply one actual tier immediately. An owned decor/costume becomes £50; a maxed upgrade becomes £100. The popup states substitutions honestly.

`progression` saves claimed levels, pending celebrations, sanitised receipts and `bonusEarned`. Level bonus coins do not earn further levels. Milestones crossed in one step all award exactly once. Loading an existing v1–3 save marks historical milestones complete without a reward/popup backlog. New v4 pending popups survive reloads without paying twice.

Visitor change explicitly requested: outdoor party departures are **21 seconds at base**, down from 24. The indoor shop's 3-second base is retained. Spread the word now has four tiers; Fairy lights has a fourth tier costing £10,500. The maximum outdoor departure gap is approximately 8.26s when both frequency paths are maxed. Party size and each visitor's own budget/basket rules remain unchanged.

Files: `rules/levels.js`, `rules/progress.js`, `model.js`, `ui/level-celebration.js`, Journal UI and HUD hooks; small `rules/farm.js`/`rules/selling.js` timing and tier changes.

## Complete part 4: eight offline MIDI tracks

The user supplied four MIDI files, all included intact:

- Thriller — supplied Michael Jackson MIDI, about 324 seconds.
- Lullaby for a Dead Man — supplied Elena Siegman MIDI, about 72 seconds.
- Nightmare — supplied MIDI, about 177 seconds.
- Ghostbusters — supplied MIDI.

Four additional original loops: Lantern March, Skyla's Midnight Market, Moonlit Mischief and Pumpkin Parade. Regenerate these deterministically with `python3 tools/compose-spooky-midi.py`.

Settings → Now playing selects the song; selection and volume persist. Music and effects remain separately switchable. The level-up jingle obeys the player's sound/music preference and ducks music briefly. The original MP3 waltz remains on disk but is no longer the playback source.

`ui/midi.js` decodes Standard MIDI 0/1 with PPQ timing, tempo changes, running status, sustain, programs, velocity and channel volume. `ui/audio.js` synthesises melodic/percussion voices with Web Audio, caps polyphony at 64, uses a compressor and look-ahead scheduling, loops songs, stops on mute/hidden pages, and starts only after a gesture. This is a small retro synthesiser, **not a General MIDI soundfont**; supplied arrangements keep their notes/timing but use the game's synth timbres. Format 2 and SMPTE timing are deliberately unsupported (none of the bundled files use them).

The `.mid` esbuild loader is binary so every MIDI byte is in the self-contained HTML. No external audio/font/player requests. Credits distinguish user-supplied arrangements from original compositions.

## Complete part 5: fullscreen and tap pumpkin

A persistent fullscreen button uses the browser's fullscreen API; unsupported browsers get an Add-to-Home-Screen hint. Fold resizing preserves the camera's pan. The tap pumpkin's face tilts 14° upwards around its centre, uses a much gentler warm fill rather than an overbright frontal light, and has a soft breathing ground halo plus squash/tilt on tap. No additional point lights were introduced.

## Deliberately unfinished: festival economy expansion

The contractor folder's `drafts/` directory contains two **unintegrated, untested design/code drafts** (`content/tycoon.js`, `rules/tycoon.js`) from the earlier gameplay-loop request. They are excluded from `changes.patch` and the HTML. Do not copy them into the production build without completing the work below:

1. Reconcile this 12-level reward progression with their proposed 20-level activity XP system. There must be only one authoritative level definition. Do not ship both counters.
2. Add state migration and atomic stock/visitor-budget integration for land, garden crops, stands and crafted products.
3. Render actual land extensions, physical stands and connected visitor paths; rebuild/reframe map bounds without editing Claude's unfinished buildings wholesale.
4. Kitchen research/recipes, timed crafting, shop wall stock, shopper reservations/refunds and spooky-chef automation need UI and scene hooks.
5. Test save/reload while goods are reserved, visitor budgets spent at stands before pumpkin purchases, failed recipes, chef costs/automation, bulk timestep behaviour, and late-game balance.

This HTML does **not** claim playable land expansion, recipe crafting or chef automation. The high-value kitchen furniture is decor until that system is integrated.

## Verification

Rule suites, MIDI parsing, phone/Fold/landscape checks, screenshots and the current build hash are recorded in `docs/contractor-patches/house-level-update/QA.md` and the downloadable patch bundle's `manifest.json`. The portable targeted browser run is `tools/qa-house-levels.mjs`; the existing `smoke.mjs` has been updated for the new direct house-entry and contextual More flow. Review the actual HTML before integrating into Claude's newer branch.
