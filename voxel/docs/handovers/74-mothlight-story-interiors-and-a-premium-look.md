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

## Spreading the village out

The owner found the entrance and Elowen's and Rowan's houses cramped, wanted the whole world spread further with free space round the Moth Tree, and plans a central town square before the Quarry. `rules/village-spread.js` cuts the design grid into eight pieces along lines where nothing stands and moves each one whole; nothing changes size, and the gaps between pieces are new ground:

| Piece | What it holds | Moves |
| --- | --- | --- |
| C | the Moth Tree, its ring of lamps, the avenue, the gate and the maples inside it | stays |
| SW, SE | the square's furniture: knot gardens, well, noticeboard, bench, stall, planters | out 8 |
| W, E | Elowen's and Rowan's plots and everything beyond (the Velvet Bat, the Moor) | out 24 |
| NW, N, NE | everything north of the cross road (Copse, Acre, Quarry, Marsh, the Moor's far side) | north 40 |

So Elowen's door is now 34 from the tree and Rowan's 32, the avenue runs between open lawns, and a band 40 deep the width of the village lies between the cross road and the Quarry (`TOWN_SQUARE`, lawn for now; the Quarry road runs north through its middle and the Copse road along its west side).

How it is applied:

- **Content stores positions where they now stand.** `content/village.js`, `content/village-expansion.js` and its cast pass every design-grid position through `spread` (a point), `spreadRect` (a rectangle, stretched across a gap only if it is long: a wall, a road) or `spreadStep` (a quest step or a resident's stop on the Green, which goes with what it was set beside: Elowen's door, Rowan's door or the tree). Cave rooms keep their own grid.
- **The builders still draw on the old grid.** `village-world.js` gathers layout values back (`gp`) and draws as before. The Green writes through `SpreadingVoxels` straight into one batch on the spread ground (32-unit chunks, 39 meshes); the others are moved after building by `spreadVillage` (instance matrices, plain meshes, marks) in `village-view.js`, and the stall, bench and homes as their parts are made. The ground, paving, outer walls, hedgerow, scattered trees and flowers, woods, horizon, mist and gathering spots are drawn on the spread ground itself (`onSpread`, `atSpread`) and flagged `userData.spread = "native"`; the expansion's gates, restorations and cave mouth are drawn at spread points and the Acre moved whole.
- **Anything asked of the ground by position gathers the point back first**: `groundHeight`, `groundIsWater`, grass, terraces, and in the walking rules the Green's bounds and the Acre's maze (`gatherWorld`). New ground reads as the nearest edge of a piece, carried straight across.
- **The lines were found by scanning every box the builders write** for boxes whose corners fall in different pieces, and long boxes that would stretch. Where no line could pass: islands (the bench, the planters and the stall go with the furniture; the gate maples stay with the gate), height rules (the tree's crown and Rowan's eaves stay with what they belong to), and a few hand moves (the avenue's corn sheaves bound to their lamp posts, the doorstep lanterns, the arrival meadow's trees drawn whole).

Anything new on the Green must be drawn on the old grid clear of the piece lines (re-run the scan) or drawn on the spread ground directly. Tests write their probes on the old grid and move them with `spreadStep`, `spreadWith` or `spreadWorld`.

## Still to do

- **Interiors for the Baron and Granny** (they fall back to Codex's shared room). Designs: a velvet manor with a marble fireplace, portrait, piano and an empty gilt frame; a crooked cottage with an inglenook, cauldron, dresser and bed alcove.
- **Buildings**: Granny's house, the Acre's corn and scarecrows, the cave mouth, the district gates and the restored scenery are still crude. The Velvet Bat's striped windows want a proper design.
- **Camera**: its arm passes through props that aren't buildings (the Moor's booths) and can sit inside rock near the cave mouth.
- **NPC behaviour** has not been audited. "Talk" at exactly its reach only sets a waypoint.
- **UI defects**: a blank Enter keycap in dialogue and the return prompt; the farm toast over the tracker; People lists "Hollow Green" for Copse residents; the Map tab is a list; a clipped panel title.
- **Performance on a phone has not been measured** for the finish, the grade pass or the glow. The finish costs about twenty hashes a fragment and four texture reads per figure for the rim; both can be cut if `tools/perf.mjs` or a real phone says so.
- **The owners' sprites** (paused): `tools/owner-sprites/` holds a sculptor that draws a figure from signed-distance shapes on a skeleton, from eight sides at one fixed scale (`sculpt.py`, `rig.py`, `parts.py`), and Shane's model (`shane.py`) at the standing art's proportions. His face and jacket need work; Natalie, the walk, jog and action cycles, baking and the game's side are not started. Nothing in the game uses it yet.
