# 74: Mothlight's story, interiors and a premium look

Branch: `voxel-reference` (lead), following handover 73 and Codex's expansion (`docs/contractor-patches/mothlight-full-expansion/`). This round took Codex's 54 commits in, then worked through the owner's brief for the village: it should look premium, its story and UI should be clear, and its interiors and buildings should be handsome.

## What the player asked for

- "Check codex handover, they've added a lot. Make sure the village is visually incredible, story and UI is utterly perfect, NPCs act properly, quest and missions are well designed and fleshed out and clear for the end user to understand. Interiors in the village, buildings are much more beautiful and dynamic looking."
- "Rebuild Shane and Natalie's base sprites pixel by pixel to fix the awkward movements and size differences between the different frames", hand crafted, matching their visible features, with better poses, walking and actions. **Paused** at the owner's request (see the end).
- "Needs to look even more premium & Dreamlight Valley like", then "focus on the village for now, it needs to look much more premium". Original characters and art only: nothing of Dreamlight Valley's is copied.

## The premium look (this is the newest work)

Photographs of the village showed three things holding it back: walls and roofs were big flat single-colour slabs beside richly painted characters; windows and lamps burned out to white; and away from lamps the owner turned black.

- **A finish for every voxel: `voxel-finish.js`.** Every face of a village model is shaded as if laid from small blocks, an eighth of the design grid across (twelve to an owner's height). Each block has its own tone, a hairline to its neighbours, one in three stands proud or sunk with lit and shaded lips, and broad patches of weathering run across them. Walls darken towards the foot of their own box.
  - It is all in the fragment shader, in the mesh's own space: no extra boxes, it follows turning models, and it fades where a block would be under a couple of pixels. Faces too small for two blocks are left plain.
  - Glowing faces become leaded panes, hot in the middle and amber at the frame, so a window keeps its colour.
  - `finishVoxels(root)` dresses every `Voxels` batch under a root once. The village calls it after its first build, for each part built later, and for each hall. Call it for anything new you build with `Voxels` in the village.
- **Lamps that warm a wall instead of bleaching it.** The finish also rewrites three.js's light falloff for finished faces: within `near` world units a lamp is taken as if it stood that far off. Out of doors `near` is 4 (`LAMP` in `village-view.js`); halls and caves set it to 0 (`HALL_LAMP`), because their lamps hang clear of the walls. Change lamp strength through `lampAs(spec, scale)`, never on the lights directly.
- **Glow and grade per place.** `scene.js` now takes a place's own glow settings and a final grade from its scene's `userData` (`bloom`, `grade`) through `dress()`, and restores the farm's for everything else. The village's glow is tighter (strength .36, threshold .9). Its grade (`picture-grade.js`) adds a little colour and contrast, leans shadows to indigo and lights to peach, and draws the corners down.
- **Lamp glow: `village-glow.js`.** A halo round every lamp's head and a warm pool on the ground under the far ones (the eight nearest already cast real light). Two instanced additive draws, no lights.
- **A moon rim on the owner: `addMoonRim` in `sprite-rim.js`.** The owner's sprite takes a cool rim along the edge facing the sky and shows half as much again of its own colour, so a dark-haired figure seen from behind no longer melts into the night. It sits beside Codex's warm inner rim (`addSpriteRim`), which the neighbours keep.
- **Grass, pumpkins and flowers.** Grass tufts are five slim bent blades (the same triangle count as the three wide ones they replace). Pumpkins have a foot, a shoulder and a bent stem; blooms have four petals round a gold eye. Two box budgets in `village-atmosphere.test.mjs` rose by under 3% for them.
- **The HUD's finish: `ui/village-premium.css`.** Loads last of the village's styles. One family of plum glass with a gilt hairline; the place's name on a plaque; the open dock choice lit from beneath. Colours, borders and type only: it sets no sizes.

Tests: `test/village-finish.test.mjs`.

## Landmarks rebuilt

The owner asked for "an overall build upgrade to the superstructures, design and fidelity". First batch, in `village-models.js`, all on their old footprints:

- **The Baron's manor**: pilasters between seven bays, pointed windows (`lancet`, reusable), a columned porch under a balustraded balcony, a rose window, a dentilled cornice with gargoyles, a slate mansard with dormers and iron cresting, a brass observatory dome, and chamfered towers with battlements and lucarned spires.
- **The circus tents** (`bigTent`): a kickboard, panelled walls, a scalloped valance, a swooping roof with seam bulbs, a gilt crown, and a curtained doorway under a marquee board.
- **Corvus's caravan**: a bow top, framed and gilded panels, shuttered windows with flower boxes, spoked wheels, a stable door and folding steps.
- **The marsh huts**: braced stilts, a railed deck, board walls, deep thatch, a ladder and a line of fish.

- **Corvus's big top, inside** (`corvusTent`, `CORVUS_HALL` in `village-home-interiors.js`): the owner asked for the tent to be bigger inside than out, an epic circus amphitheatre. It is 30 by 28: a sawdust ring, a horseshoe of seven tiers with a crowd, four king poles with lamps and strung bulbs, a high wire with a walker, trapezes, a curtained stage door under a board of bulbs, and a ticket booth and popcorn cart by the door. A hall may now carry `view` (`lift`, `fov`) to raise and widen the camera's gaze, `reach` for its lamps and `ambient` for its fill light; the big top uses all three.

Not yet redesigned: the lighthouse, the observatory tower, the Ferris wheel and carousel, the townhouses, the district gates, and the Acre (Granny's house, corn, watchers).

## Earlier in this round (already pushed)

- **The play camera** (`village-camera.js`): a low arm that looks up at roofs and sky, stops at building walls (`villageCameraReach`), and a great tree that only dissolves when its trunk or crown is truly in the way.
- **The story** (`content/village-expansion-story.js`): all 23 main chapters have a blurb, an opening scene, a discovery for each step and a closing scene. Cast steps were renamed to say what you do.
- **The journal and pages** (`ui/village-expansion-pages.js`): main story first, a step checklist, real reward names, exact reasons a chapter is locked. Puzzles shuffle their choices and show their clue.
- **Guidance**: following a chapter points the way, quest steps win the prompt, each step has its own verb, and a gold beacon stands over the followed step. Quest steps have themed objects (`questProp`).
- **Interiors**: `village-home-interiors.js` holds real rooms for Mabel, Tansy, Opal and Cinder. `village-hall-life.js` sets fires, candles, steam, motes, sparkles and pendulums moving in every hall from marks its builder leaves.

## Spreading the village out (started, not applied)

The owner finds the entrance and Elowen's and Rowan's houses cramped, wants the whole world spread further with free space round the Moth Tree, and plans a central town square before the Quarry. `rules/village-spread.js` is the tool for it: `spread(x, z)` cuts the design grid along lines where nothing stands and moves the land apart (houses 20 further from the tree each side, gardens and well 6, the avenue 8 south, everything north of the square 30 north, the Copse's and Moor's sides 20 out); `gather` is its inverse for anything sampled by position. It is tested but **nothing calls it yet**.

A first attempt applied it to `content/village.js` alone: 25 tests failed, as the other files still held old positions, so it was set aside to keep the game working. Measured size of the job: about 310 grid-to-world conversions across 19 files (`village-world.js` 52, `village-expansion-world.js` 41, `village-expansion-spatial.js` 40, `village-view.js` 31, `rules/village-navigation.js` 29, `village-game.js` 19, and thirteen smaller ones). Two findings from that attempt: the avenue cut (z 16) splits both house plots, so `drop` is 0 for now; and `village-world.js` reads layout values that would already be spread, so it must gather them back and keep writing on the old grid, with its writers (`onGround`, `at`) spreading on the way out. Warping only what is drawn cannot work: the new ground has to exist for walking too.

Applying it means passing every design-grid position through it, and they are written in many places: `content/village.js` (`at`, `box`, fixtures, scenery, bounds), the writers in `village-world.js` and `village-expansion-world.js`, `LAMPS`, the hall doors in `village-view.js`, `village-terrain.js` (shelves, ramps, waters; `terrainHeight` through `gather`), ground, paving and grass (through `gather`), blight, node and resource layouts, expansion activity positions, the tour and the wanderers. 24 modules and 20 tests depend on the layout. It must land in one piece, or what is drawn and what the rules believe part company. Things that straddle a cut (the R1 spur, the doorstep lanterns at x 48.6 and 65.1 to 65.4) need moving by hand.

## Still to do

- **Interiors for the Baron and Granny** (they fall back to Codex's shared room). Designs: a velvet manor with a marble fireplace, portrait, piano and an empty gilt frame; a crooked cottage with an inglenook, cauldron, dresser and bed alcove.
- **Buildings**: Granny's house, the Acre's corn and scarecrows, the cave mouth, the district gates and the restored scenery are still crude. The Velvet Bat's striped windows want a proper design.
- **Camera**: its arm passes through props that aren't buildings (the Moor's booths) and can sit inside rock near the cave mouth.
- **NPC behaviour** has not been audited. "Talk" at exactly its reach only sets a waypoint.
- **UI defects**: a blank Enter keycap in dialogue and the return prompt; the farm toast over the tracker; People lists "Hollow Green" for Copse residents; the Map tab is a list; a clipped panel title.
- **Performance on a phone has not been measured** for the finish, the grade pass or the glow. The finish costs about twenty hashes a fragment and four texture reads per figure for the rim; both can be cut if `tools/perf.mjs` or a real phone says so.
- **The owners' sprites** (paused): `tools/owner-sprites/` holds a sculptor that draws a figure from signed-distance shapes on a skeleton, from eight sides at one fixed scale (`sculpt.py`, `rig.py`, `parts.py`), and Shane's model (`shane.py`) at the standing art's proportions. His face and jacket need work; Natalie, the walk, jog and action cycles, baking and the game's side are not started. Nothing in the game uses it yet.
