# Direct-play owner sprite sources

These whole-sheet image edits use the shipped HD owner/costume frames as identity and art references. Raw generated PNGs are kept here; the runtime bundles only five compressed WebP atlases.

`tools/bake_player_directions.py` normalises the supplied grid, uses a shared scale within each strip, anchors feet at (140,330), removes disconnected fragments from adjacent grid cells, and writes `player-direction-meta.js`. It needs Pillow, NumPy and SciPy for offline preparation; the game has no new dependency. Re-run from any directory with Python3.

Coverage:

- All20 selectable owner looks have their own side and back art, including Natalie's purple wheelchair. Left-facing side views mirror the right-facing frames.
- Shane/Natalie originals each have four side walking poses, four back walking poses, plus planting, watering-can and pumpkin-lifting action poses. Front idle/walk remains the exact shipped art.
- The other18 looks have two side contact poses and two back contact poses. These are shorter cycles than the originals. Their farming actions retain their costume and use the scene's tool props/body transforms; they do not swap into a newly drawn base outfit.
- Wheelchair movement has seated rolling poses, not walking legs.

The game attaches `actor.userData.playerAnimate(options)` in `sprite-actors.js`. The controller calls this after the normal animation, supplying facing, direction, movement, time and action. Texture/geometry changes reuse compiled materials and alpha shadows. Front/disable restores the original texture; base recolours apply in the new directions too.

The atlases are approximately1.57MB combined, each at most2048px on either axis. Full PNG sources are excluded from lightweight contractor patches; obtain this folder from the source branch before re-baking. The runtime metadata test ensures a newly added costume cannot silently borrow another look's silhouette.
