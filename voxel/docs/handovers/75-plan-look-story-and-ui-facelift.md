# 75 — Plan: a better look, a better story, a UI facelift, a voxel upgrade, secret places

Status: **plan for Codex**. Nothing here is built yet. Read handovers 73 and 74 first, then this. Each work
package (WP) below is sized to be one `contractor/*` branch and one PR into `voxel-reference`. Do them in the
order of the roadmap at the end unless Claude Code says otherwise; each one must leave the game shippable.

## Ground rules (unchanged, but they bite on every package here)

- **Original only.** Mothlight is *like* a cosy life-sim village, never a copy of one. No characters, names,
  art, music, UI layouts or icons lifted from an existing game. New faces get new names and their own look.
- **British English** in all player-facing text and comments (colour, harbour, neighbour, organise).
- **Budgets.** The village must still run on a phone and the LG TV: no new real-time lights (halos and the light
  pool fake them), new geometry in bounded instanced batches (see the box/mesh budget tests), textures ≤ 1024²,
  and measure frame time before/after any look change (`qa/look3.mjs` prints it).
- **The spread.** The village is drawn on the old grid and moved apart by `rules/village-spread.js`. Anything new
  near the Green either goes through `spreadVillage`/`SpreadingVoxels` or is built *native* where it stands (as
  Moonclock Square is, `userData.spread = "native"`). Run the tear scan (handover 74, "Spreading the village
  out") after any change to the Green; zero torn objects is the bar.
- **Pad, keyboard, touch, TV.** Every new screen must work with a controller (focus ring, A/B, bumpers for tabs)
  and at 1080p on a TV ten feet away. No hover-only affordances.
- **Saves.** Any new save field gets a default in `model.js` `freshState()` and a migration step; old saves must
  load. Add a test that loads a save from before your change.
- **Tests.** `npm test` and the smoke run must pass; each WP below lists the tests it should add. Screenshots go in
  `qa/shots/` (ignored) and the PR description, never in the repo.
- **Don't commit `dist/`.**

---

## A. Make it look better

What we see now (screens in handover 74 and `qa/shots/look3-*`): the whole village sits under one strong
blue-lavender grade; grass is big spiky blades that read as noise at distance; the water is flat discs; the
sprite folk float (no contact with the ground); the new town square's flanks are empty lawn; Granny's house and
the district gates are still crude next to the houses round the Green.

### A1. Grading per district and per hour — *highest value, small*
- Goal: night stays moonlit, but each place gets its own temperature so walking feels like travelling.
  Green = warm amber lamp pools on cool grass; Square = gold and plum (market); Quarry = cold slate and teal;
  Copse = deep green with moth-glow; Moor = desaturated heather and mist.
- How: a small table `content/village-grade.js` `{ district: { tint, lift, fog, lampWarmth } }`; blend between
  entries by the walker's position (smoothstep over ~6 units at district edges) in the existing post/fog setup in
  `village-view.js`. Add a dusk/night/dawn curve keyed on the in-game clock (the Moonclock already reads real time;
  use game time for grading).
- Accept: screenshots of all five districts side by side read as five places; no district's mid-grey drifts more
  than ~8% toward blue; frame time unchanged.
- Tests: grade lookup is continuous at every district edge (no jumps > a threshold along a walked line).

### A2. Grass that reads as lawn, not noise
- Goal: smaller, softer tufts, denser near the path edges and under trees, thinning on worn ground; a gentle
  wind sway; colour variation in patches (clover, dry, lush).
- How: in `village-world.js` `grassAt`, return a tuft *type* and scale from a low-frequency noise; shorten blades
  ~40% and widen the base; a vertex sway in the grass material's `onBeforeCompile` (time uniform, amplitude by
  height). Keep the instance count within the current budget by trading count for coverage.
- Accept: at play-camera distance the lawn reads as a surface with texture, not stripes or spikes.
- Tests: grass budget test still passes; no grass on roads, plaza, water (existing tests).

### A3. Water that moves
- Goal: the fountain basins, the pond and the lake look wet: ripples, a soft rim of foam, lamp and moon
  reflections as stretched streaks, and occasional rings where fish rise.
- How: one shared water material (`village-water-material.js`): scrolling two-octave normal from a 256² canvas
  texture, fresnel to the sky colour, additive streaks under each nearby halo (reuse `LAMPS_AT`). Fountain
  curtains in `village-town-square.js` get a vertical scroll.
- Accept: still within the mesh budget (shared material, no new lights); 60 fps on desktop, no worse than today
  on the phone.

### A4. Folk stand on the ground
- Goal: every sprite person and animal has a soft contact shadow, a tiny bob when walking and a squash on stop.
- How: one instanced blob-shadow quad per walker, under the sprite, alpha from height above ground; fold the bob
  into the existing walker update.
- Accept: in the Elowen and Square screenshots no one looks pasted on.

### A5. Light and air
- Goal: depth. Soft god-ray cards through the Moth Tree canopy and the Moonclock arch, low drifting mist in the
  Copse and Moor, fireflies/moths gathering round lamps (more round lit ones, fewer after midnight).
- How: camera-facing additive cards (no post pass), fixed count per district, faded by distance.

### A6. Finish the buildings
- Granny's house and garden: give it the detail level of Elowen's and Rowan's — lintels, window boxes, a lit
  window with a curtain, chimney smoke, a crooked gate, a washing line.
- District gates (Quarry, Copse, Moor): each a small landmark in its district's material (slate posts, woven
  willow arch, standing stones) rather than generic posts.
- Every house: lit windows at night with a warm interior card behind the glass; door wreaths/lanterns that change
  with the season.
- Files: `village-expansion-world.js`, `village-world.js`; check the tear scan afterwards.

### A7. Fill the Square's flanks and give it life
- The town-square band (z 38.5..78.5 on spread ground) is open lawn either side of the plaza. Add: an orchard of
  small trees and a well on the west; a pond with a jetty or a bowling green on the east; hedged paths linking
  them to the plaza. Native build, like the square.
- Ambient life: 4–6 unnamed townsfolk (new, original designs) who walk between stalls, bench and bandstand on
  simple schedules; cats on benches; pigeons that scatter when you run through them.
- Tests: obstacles don't overlap (copy the square's overlap test); the walk test still reaches the Quarry.

### A8. Camera moments
- A slow establishing pan the first time you enter each district (skippable, once per save), a framed shot for
  each restoration's reveal, and a tighter, lower camera in conversation.
- Store "seen" flags in the save (see Saves rule).

### A9. Measure the phone
- Before A1–A8 land: add `qa/perf.mjs` that walks a fixed route (Green → Square → Quarry) at a phone viewport and
  prints p50/p95 frame time and draw calls. Run it on every look PR and paste the numbers in the PR.

---

## B. Make the story and quests better

What we have: 13 legacy quests in `content/village-quests.js` (invitation, Rowan's and Elowen's chains,
Doorbells, Lantern Keepers, three Blight quests), 23 main chapters in `content/village-expansion.js` and 41 cast
chapters from `content/village-expansion-cast.js`. Activity mix: inspect 59, puzzle 63, restore 16, reveal 51,
farm 10, story-vein 2. The problems:

1. **Every chapter has the same shape**: inspect → puzzle → restore/reveal. By the third one you know the rhythm.
2. **Puzzles are mostly "put three things in order"**, and the clue states the answer word for word.
3. **Two quest systems side by side**: the legacy quests and the chapter framework both add dialogue choices,
   so a conversation can offer four near-identical options.
4. **Duplicate titles** between main and cast chapters ("The Stone That Rang", "A Silent Midway", "The Last Bow",
   "Supper After Midnight", "A Guest, Not a Customer").
5. **Gating by number** ("Opens at farm level 9") rather than by story.
6. **No spine you can feel**: the Blight, the lanterns and the districts are separate threads; the new Moonclock
   Square has no story at all yet.
7. Restorations change little you can *see*; residents rarely mention what you've done.

### B1. One quest system — *do this first, everything else builds on it*
- Port the 13 legacy quests into the chapter framework (`village-expansion*.js` shapes) as a "Prologue" arc and
  the Blight arc. Keep their ids as aliases so saves carry over (migration maps legacy progress to chapter
  progress; test with a mid-quest legacy save).
- One dialogue entry point per resident per state: the conversation offers *the* next thing that person has for
  you, plus "chat" and "goodbye". `ui/village-conversation.js` + `dialogue-choice-icons.js`.
- Accept: no conversation offers more than one quest choice per chapter; every legacy quest completes through the
  new system; old saves load at the same point.

### B2. A spine: the Stopped Hour
A proposed through-line that ties what's built together (rename freely, keep it original):
- **The founding.** Mothlight was founded by the Lamplighter (the statue on the Lantern Fountain), who struck a
  bargain with the moths: they'd keep the village's memories in their light, and the village would keep a lamp
  lit for them every night.
- **The Forgetting.** One night the lamps went out. The Moonclock stopped at 3:17, the "forgetting hour", and the
  Blight (the Blackroot) crept in where the light had been. Residents half-remember the old festivals; the
  districts drifted apart.
- **The player** arrives with the invitation, relights lanterns, restores districts, and — chapter by chapter —
  recovers memories (each restoration returns one, played as a short moonlit vignette at the place it happened).
- **Act structure.** Act I: the Green and its neighbours (prologue + Rowan/Elowen). Act II: the four districts,
  each ending with a memory and a lamp relit on the Square's ring. Act III: repair the Moonclock (a multi-part
  chapter: find the gears in the Quarry, the pendulum wood in the Copse, the bell in the Moor), set it going, and
  the first **Lantern Night** finale in Moonclock Square — every resident there, the market open, the bandstand
  playing, the moths returning.
- Make the clock show 3:17 (stopped) until Act III, then real time. `village-town-square.js` already ticks the
  hands; gate the tick on a save flag.
- Deliverable for this WP: `docs/story/spine.md` (one page) + chapter list mapping every existing chapter to an act,
  and which ones need rewriting, merging or cutting. Claude Code reviews before writing content.

### B3. Vary the shape of a chapter
Give each chapter one of these templates (and never two of the same in a row in an act):
- **Mystery** — clues found in the world (an inscription, a torn page, a resident's slip of the tongue), then
  deduce. Clues *imply* the answer, never state it.
- **Errand chain** — A needs X from B, who wants Y from C; ends with all three meeting.
- **Gathering** — collect N of a thing across a district, with a map hint after a while.
- **Escort / follow** — walk with a resident (who talks as you go) to somewhere that matters to them.
- **Festival prep** — a group task on the Square with several small jobs you can do in any order.
- **Restoration** — the visible fix, always ending with a reveal shot (A8) and a change that stays in the world.
- **Memory** — a short vignette at night after a restoration (B2).

### B4. Eight puzzle families instead of one
Today: `sequence`, `stage-slots`, `light-route` (`rules/village-expansion.js`). Add, each as a pure rules module with
tests and a UI page in `ui/village-expansion-pages.js`:
1. **Clock setting** — set the Moonclock's hands to a time hinted in the world (a sundial's shadow, a diary).
2. **Bandstand tune** — repeat or complete a short phrase on chimes; the tune is hummed by a resident earlier.
3. **Constellation** — join stars over the Moor to match a pattern carved on a stone.
4. **Light route (extended)** — mirrors and lanterns across a district, not just a panel.
5. **Weights and measures** — balance a market scale with the right goods (uses inventory).
6. **Tile slide / mosaic** — repair a broken mosaic in the plaza's moon phases.
7. **Spot the change** — a resident's room before and after; what's missing?
8. **Recipe / brew** — combine farm produce at the potion stall (ties to farming and cooking).
- Rule: each clue lives somewhere you can walk to; the puzzle page can show a "notes" side panel of clues *you have
  found*, never the answer. Hints unlock after two wrong tries.
- Tests: each family's solver/validator, plus a lint (B8) that no clue text contains the solution tokens.

### B5. Residents with arcs and voices
- For each named resident write a one-page voice sheet in `docs/story/residents/<id>.md`: what they want, what
  they fear, a verbal tic, three topics they love, how they talk at friendship 0 / 3 / 6 / 10.
- Each resident gets a 3-step friendship arc (cast chapters already exist — rewrite them to these arcs and give
  them unique titles; fix the five duplicates above).
- Small talk pools keyed on: time of day, weather, district restored, last thing you gave them, festival days.
  At least 12 lines per resident, no line repeated within a day.
- Fix while here: People screen shows Mabel and Tansy at "Hollow Green" — their home district is wrong.

### B6. The world remembers
- Every restoration changes something you can see for the rest of the game (a lit window, a repaired bridge, a
  stall reopened, a resident moved to a new spot) — add a `worldChanges` field to the chapter that the world
  builders read.
- Residents mention your recent deeds within a day (one line each, from B5's pools).

### B7. Gate by story, not by level
- Replace "Opens at farm level N" with story conditions: "after the Quarry lamp is lit", "once Rowan trusts you".
  Farming level can still unlock *recipes* and *tools*, not chapters.
- The journal shows *why* something is locked in story words ("Rowan won't talk about the Quarry yet").

### B8. Square life and repeatables
- **Market days** (two a week, game time): the Moonlit Market stalls open with rotating stock; residents visit.
- **Requests board** on the Square: 3 small daily asks from residents (deliver, gather, fix), paying friendship and
  coins; never the main way to progress.
- **Seasonal festivals** on the Square: Lantern Night (finale, then yearly), Harvest Fair (pumpkin weigh-in), Frost
  Fair (skating on the pond from A7).

### B9. Content lint
`test/village-story-lint.test.mjs`: unique chapter titles; every chapter has a template from B3; no two chapters of
the same template in a row per act; no clue contains its answer; every resident has ≥ 12 small-talk lines; British
spellings (a short list of US spellings to reject); every gate is a story condition.

---

## C. UI facelift

What we have (`ui/village-*.js/.css`, screens `qa/shots/ui-l6-*.png`, `t-elowen-*.png`): every panel is the same
right-hand drawer in plum glass with gilt serif; screens are text-heavy lists; the Map is a list of tiles, not a
map; friendship is a number in text; a blank Enter keycap still shows in dialogue; the interact prompt truncates
("Read the moth-…"); there's no on-screen tracker in normal play; the stall is a vertical list; the workshop is a
wall of text.

### C1. A design system first — *small, do it first*
- `ui/village-tokens.css`: colour tokens (night plum, parchment, moth gold, lamp amber, ink, success sage, danger
  rose), a type scale (display serif for titles only, a clean humanist sans for body at ≥ 18px on TV), spacing
  scale, radii, two shadow levels, motion timings (120/200/320 ms, one easing).
- Three panel shapes, not one: **book** (journal, chapters — two-page spread), **board** (map, people — full-screen
  with a frame), **tray** (shop, workshop, inventory — bottom sheet with tiles).
- Replace literal colours in `village-premium.css`, `village-polish.css`, `village-ui.css` with tokens.
- Accept: a contrast check (every text/background pair ≥ 4.5:1) in a test that parses the tokens.

### C2. HUD and tracker
- A persistent, quiet tracker top-right: current chapter title, the next step in one line, a small compass arrow
  to it (hidden when the step has no place). Bumper/Tab cycles tracked chapters.
- Interact prompt: never truncates — wrap to two lines or shorten the verb ("Read" + object name). Show the real
  key/button glyph for the active input (keyboard, pad, touch); remove the blank Enter keycap.
- A single toast queue for rewards, friendship, unlocks (today they overlap) — `village-quest-receipt.js`.

### C3. A drawn map
- Replace the tile list with an illustrated map: a canvas painted once from the content (roads from `ROADS`, plots,
  districts, the Square, water) in an ink-and-wash style, with pins for residents (portrait chips), the tracked
  step, restored landmarks. Pan/zoom with stick/drag; select a landmark to see its card (today's tile content).
- Fast travel between restored district gates and the Square (story-gated, B7).
- Files: `ui/village-map.js` (rewrite), `village-game.js` focus handling stays.

### C4. Dialogue with faces
- A bust portrait (larger render of the existing sprite, or a painted card) on the left, name plate, mood.
- Friendship as five moth-wing pips that fill, with a little flutter when it rises.
- Text reveals at a readable rate (skippable with A/Enter); choices as large buttons with icons from
  `dialogue-choice-icons.js`, the quest choice highlighted.
- Files: `ui/village-conversation.js` + its CSS.

### C5. Journal as a book
- Two-page spread: left page the chapter list grouped by act (B2) with a small painted vignette per chapter;
  right page the chapter: what you know, clues found (B4), steps, rewards. Tabs: Story / Friends / Requests /
  Collections. `ui/village-chapters.js` + `.css`.

### C6. People board
- A grid of portrait cards: name, where they are *now* (fix the Mabel/Tansy bug), friendship pips, what they're
  waiting on, a "track" button. Filter by district.

### C7. Shop and workshop as trays
- Stall: a tile grid of goods with rendered thumbnails (render each item's voxel model once to a small canvas and
  cache), price, owned count; buy with A, hold to buy five.
- Workshop: an upgrade *tree* with icons and arrows, costs as item chips, the next affordable upgrade glowing.

### C8. Motion and texture
- Panels open with a 200 ms rise and fade, page turns in the book, a soft paper grain and a gilt edge on frames
  (CSS gradients, no image files over 50 KB). Respect `prefers-reduced-motion`.

### C9. Pad, TV and access
- Every screen: a visible focus ring, D-pad order that follows the layout, B always backs out, bumpers switch
  tabs. TV safe area (5% inset). Text size setting (100/125/150%). Colour-blind-safe pips (shape + colour).
- Tests: a focus-order test per screen (Playwright, `qa/ui1.mjs` can be extended), and the existing controller
  tests from handover 72.

---

## D. Voxel upgrade: shapes, curves, detail and world-building

Why everything looks boxy: every model is axis-aligned boxes in one `InstancedMesh` of `BoxGeometry`
(`src/voxels.js` `Voxels.box/block`), finished by the block shader in `src/voxel-finish.js`. Roofs are worst:
`cottage()` (`src/village-models.js` ~line 431) lays `steps = 12` box courses per side, each shorter than the one
below, so every roof is a staircase with a flat underside. Trees are stacked cubes, the ground is flat sheets,
fences are straight rows.

The aim is the "storybook voxel" look: still clearly built from blocks up close, but with silhouettes that
curve: swept and sagging roofs, rounded canopies, crooked fences, rolling ground.

### D1. More shapes than the box — *the foundation, do it first*
- Add a small set of shape primitives to `Voxels`, each its own `InstancedMesh` (one draw call per shape per
  batch, same colour-per-instance and the same finish shader):
  - **wedge** (half-box cut on the diagonal) for roof pitches, buttresses and steps that ramp;
  - **quarter-round** and **half-round** (an 8-segment cylinder slice) for bellcast eaves, thatch rolls, arches,
    barrel vaults, cushions and barrels;
  - **cone/pyramid** (4- and 8-sided) for turrets, spires, haystacks and finials;
  - **bevelled box** (chamfered edges, 0.04) for beams, posts, stones and furniture, so edges catch the light.
- API: `v.shape("wedge", x, y, z, w, h, d, colour, { rot })` with a yaw in quarter turns plus an optional
  pitch, so a wedge can lie on any face. Keep `box()` unchanged; nothing existing has to move.
- `voxel-finish.js`: make sure the block pattern follows a sloped face (use the face normal to pick the two axes
  the blocks run along) so tiles run *down* the roof, not across it.
- Budgets: a new test counts draw calls per built model; shapes add at most four meshes per batch.
- Tests: each shape's bounding box equals the box it was asked for; a rotated wedge still sits inside its box.

### D2. Curved roofs
Rewrite the roof part of `cottage()` as a `roof(f, plan)` helper that takes a profile and builds smooth pitches
from wedges plus thin tile courses laid *on* the slope (each tile a thin bevelled box tilted to the pitch angle),
so the roof is one continuous surface with tiles on it, not stairs.
- **Profiles**, picked per building in content (`roofStyle`):
  - `swept`: bellcast eaves that flare out at the bottom (the slope's angle eases from 50° to 25° over the last
    third), the main storybook look for cottages;
  - `sagging`: a ridge that dips a little in the middle and pitches that bow, for old houses (Granny's, the
    Velvet Bat);
  - `thatch`: thick, rounded with half-round rolls at ridge and eaves and a scalloped edge, for the Copse;
  - `catslide`: one side swept long and low over a lean-to (the workshop, Rowan's stall);
  - `turret`: an 8-sided cone with a flared skirt and a finial, for the manor and the Moonclock's lantern;
  - `hipped`: four pitches, for the tavern and the Square's market hall if one is added.
- Details on every roof: bargeboards that follow the curve, ridge tiles with a finial or a moth, crooked
  chimneys with pots and a cowl, moss in patches on north faces, a few slipped or missing tiles on shabby homes,
  snow/leaf caps by season (thin layer of the same profile in white/orange).
- Keep the dormer, chimney marks (`v.mark("chimney"…)`) and the eave/plaster join the current code has.
- Accept: side-by-side screenshots of every house with old and new roofs; no visible steps in silhouette at the
  play camera; box/mesh budgets pass; the tear scan still reads zero (roofs near the tree use the EAVES rule).

### D3. Organic forms: trees, hedges, rocks and ground
- **Trees**: canopies built as clusters of overlapping rounded blobs (bevelled boxes and half-rounds, three sizes,
  jittered), with a darker core and lighter top. Trunks taper and bend; roots flare into the ground. The Moth Tree
  gets hanging lanterns on curving branches. Give each species a silhouette: round apple, tall poplar, weeping
  willow by water, gnarled oak in the Copse, wind-bent hawthorn on the Moor.
- **Hedges and bushes**: rounded tops, uneven, with flowers in clusters.
- **Rocks**: bevelled, stacked at angles, moss on top faces.
- **Ground**: gentle rises and dips outside the paths (the ground already has a height function, `groundHeight`;
  give it low-frequency noise away from roads, plots and the Square), banks along streams, worn hollows by doors.
  Paths become cobbles or flagstones with mossy gaps and a soft edge into the grass, not a hard strip.

### D4. Hand-made irregularity
Nothing in a storybook village is straight. A shared `wobble(r)` helper adds small seeded leans and offsets:
fences and posts lean ±3°, walls bow a little, shutters hang slightly open at different angles, roof ridges
aren't perfectly level, window frames are a touch off-square. Keep the seed per building so it's stable between
loads.

### D5. A finer detail layer
- Close-up objects (doors, windows, signs, stalls, lamps, props) get a detail pass at half the current block size:
  carved door panels, iron hinges and studs, leaded window cames, window boxes with trailing flowers, shop signs
  with painted lettering (canvas texture on a plank), hanging baskets, lamp brackets with scrolls.
- Bake a cheap ambient occlusion per instance: darken a box's colour where it touches or sits under another
  (computed once at build from neighbour overlap), so joins and undersides read without an AO pass.
- Window glow: deep reveals (the glass set back into the wall), a curtain shape and a warm interior card behind.

### D6. World-building you can see
Every district should tell you who lives there and what happened, without a word of dialogue.
- **Lived-in clutter** round homes: log piles, washing lines, boots by doors, a bicycle, pumpkins on steps, a
  sleeping cat, a half-finished project in the garden. Each resident's clutter matches their voice sheet (B5).
- **Signs and notices**: a notice board on the Square with real notices (market days, lost cat, Lantern Night),
  district signposts with carved names and distances, shop signs.
- **History in the landscape** (ties to the Stopped Hour, B2): old lamp posts that are dark and overgrown until
  their district is restored; a ruined watchtower on the Moor; the Lamplighter's first lamp in the Copse; carved
  moth stones marking the old boundaries; a dry fountain that fills again.
- **Things that connect places**: a stream running from the Moor through the village to the lake, with a stone
  bridge, a footbridge and stepping stones; a cart track to the Quarry with ruts; a hedge-lined lane to the Copse.
- **Edges and skyline**: hills, a far ridge and silhouetted trees past every edge of the playable ground (layered
  cards, darker and bluer with distance), a church-like spire or windmill on the horizon to steer by.
- **Wildlife**: ducks on the pond, rabbits on the lawns at dusk, owls in the Copse, sheep on the Moor, bats at night.

### D7. Hero landmarks
Rebuild the five things the player will remember with the new shapes, one at a time, each with screenshots and a
budget check: the Moth Tree (curving boughs, lantern canopy), the Moonclock (turreted gatehouse, curved arch,
moth weathervane), the Velvet Bat (sagging hipped roof, bay window, hanging sign), Granny's house (thatch,
crooked chimney, overgrown garden) and the manor (turrets, swept roofs, a glasshouse).

## E. Secret places and hidden costumes

Little hidden areas off the beaten path, each with a glowing present inside that unlocks a special costume for
Shane or Natalie. No quest marker points to them; the world hints at them instead. Finding one should feel like a
small treasure, not a chore.

### E1. The secret places (eight to start, original designs)
Each is a small, hand-dressed pocket (one room or clearing), entered through something you could walk past:

| # | Place | Where / how you get in | Hint in the world | Costume (suggested) |
|---|-------|------------------------|-------------------|---------------------|
| 1 | **The Old Bunker** | Moor: a rusted hatch half hidden in the heather behind the standing stones; opens after you clear the brambles | A survey map pinned in the Velvet Bat with an X on it | Shane: wartime ARP warden, tin hat and lamp |
| 2 | **Glowworm Cave** | Quarry: a crack behind the waterfall/spoil heap; squeeze through (short crouch-walk) | Moths flying into the rock at night | Natalie: cave-glow explorer, lantern hood with glowing threads |
| 3 | **The Drowned Chapel** | Lake: stepping stones that only show at low water (dawn), to a tiny ruin on an islet | A painting in Elowen's house of a chapel on the water | Natalie: moonlit choir robe |
| 4 | **Smugglers' Cellar** | Under the Velvet Bat: a loose barrel in the cellar rolls aside | Vesper "doesn't know" why the cellar is so cold | Shane: smuggler's coat and tricorn |
| 5 | **The Fairy Ring** | Copse: walk the ring of mushrooms clockwise at midnight; the ring glows and opens a glade | A rhyme on the notice board | Natalie: moth-fairy wings (the wings flutter on the sprite) |
| 6 | **Clocktower Loft** | Moonclock: a ladder that only appears after Act III repairs the clock | The clock's gears glimpsed through a slit | Shane: clockmaker's apron and loupe |
| 7 | **The Burrow** | Green: a hollow under the Moth Tree's roots, only after A/D's root flare is built | Rabbits vanishing into the roots at dusk | Both: matching rabbit onesies (one present each) |
| 8 | **The Scarecrow's Shed** | Farm edge (back on the pumpkin patch): a padlocked shed whose key is found in the bunker | The key itself, with a farm label | Shane: patchwork scarecrow |

Rename freely; keep every costume original (no film or game characters). Later sets can follow the seasons.

### E2. The present
- A floating, slowly spinning present at the heart of each place: a voxel box with a ribbon and bow in the
  costume's colours, bobbing on a sine wave, spinning ~1 turn every 4 s, glowing (glow voxels + a halo card, no
  real light), with sparkles drifting up and a faint chime that gets louder as you near it (spatial audio).
- Once found it stays as an opened, empty box with the ribbon undone, so you know you've been there.
- Interact prompt: "Open the present".

### E3. The pop-up
- On opening: the screen dims, the present bursts (a ribbon unwinds, confetti of moths and stars), and a card rises:
  the costume's name, a large render of Shane or Natalie in it turning slowly, one line of story about where it
  came from, the place's name ("Found in the Old Bunker"), and two buttons: **Wear now** and **Later**.
- "Wear now" changes the outfit straight away (with a puff of sparkles on the sprite).
- Built on the C1 tokens and C2 toast queue; works on pad (✕ wear, ○ later), touch and TV; respects reduced motion.

### E4. Rules, saves and tracking
- `content/village-secrets.js`: each secret `{ id, name, district, entry, hint, costume, requires }` where
  `requires` is a story condition (B7), never a level.
- `rules/village-secrets.js`: `secretFound(s, id)`, `openSecret(s, id)` that adds the costume to
  `s.wardrobe.owned` (reuse `wardrobe.js`; add the new costumes to `EXTRA_COSTUMES` in `costume-expansion.js`
  with `price: 0` and a `secret` field so the shop hides them until found).
- Save: `s.village.secrets = { found: [], opened: [] }` with a default and migration (Saves rule).
- A **Secrets** page in the journal (C5) and the wardrobe: a silhouette per secret costume with its hint once
  you've seen the hint ("Something hums under the Moor…"), filled in when found; "6 of 8 found".
- Map (C3): found secret places get a small present pin; unfound ones never show.

### E5. Building the places
- Each place is a small native build (like the town square) or an interior using the home-interior system
  (`village-home-interiors.js`) for the bunker, cellar and loft, with an entrance through the existing doorway
  blur transition.
- Dress them richly: the bunker with bunks, a ration shelf, a radio that crackles, a map table; the cave with
  glowing crystals, a pool and dripping water; the chapel with broken pews, a rose window and lily pads.
- Costume art: new sprite costumes in the existing costume sprite pipeline (`costume-sprite-expansion.js`,
  `costume-sprite-meta.js`, plus the walk/direction meta files), checked at the same stature in every
  direction (the play-mode sprite size tests).

### E6. Tests
- Each secret's entry is reachable on foot and blocked until its `requires` is met.
- Opening a present grants exactly one costume, once; reopening does nothing; old saves load with nothing found.
- No secret costume can be bought in the shop before it's found.
- Every secret has a hint placed somewhere in the world (content lint, B9).

## Roadmap (suggested order)

| Step | Packages | Why first |
|------|----------|-----------|
| 1 | A9 perf harness, C1 tokens, B1 one quest system | Foundations: measure, style once, one source of quests |
| 2 | C2 HUD/tracker, A1 grading, A4 contact shadows, B5 Mabel/Tansy fix | Biggest felt change per hour of work |
| 3 | B2 spine doc → Claude Code review, B9 lint | Agree the story before writing content |
| 4 | C4 dialogue, C5 journal, C6 people | The screens players see most |
| 4b | D1 shape primitives, D2 curved roofs (cottages first), D4 wobble | The single biggest visual upgrade |
| 5 | A2 grass, A3 water, A5 light, A6 buildings with D5 detail, D3 trees and ground | The look pass proper |
| 5b | D7 hero landmarks, D6 world-building (district by district, with the story acts) | Make it a place |
| 6 | B3 templates, B4 puzzle families (2 at a time), B5 arcs, B7 gates | Content rewrite, act by act |
| 7 | C3 drawn map, C7 trays, A7 square flanks + life, B8 market/requests, E1–E6 secret places (two at a time) | New places and systems |
| 8 | A8 camera moments, B6 world changes, Act III Moonclock + Lantern Night | The payoff |
| 9 | C8 motion, C9 access sweep | Polish everything at the end |

## How to hand back
For each WP: a PR into `voxel-reference` from `contractor/<wp-id>-<slug>`, with before/after screenshots (desktop
and phone viewport), `qa/perf.mjs` numbers for look changes, the tests listed, and a short note appended to this
file under "Done" with anything the next package needs to know.

## Done
(nothing yet)
