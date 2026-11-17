# Skyla, Sandy and Maisie at home

The approved existing cat/terrier/long tan dog art was supplied to one whole-sheet image edit. `pet-poses-source.png` is that raw transparent output. It contains eight poses for each pet: idle, two alternating-paw steps, two tail poses, asleep, stretching and feeding.

`tools/prepare-home-pets.py` separates the inspected contact gaps, removes detached neighbouring-row tips, and uses one constant scale across every frame. It writes the 325,450-byte `assets/home-pets.webp` runtime atlas and `home-pets-meta.js`. `pet-animation-preview.jpg` composites the transparent sprites onto plum for inspection. The full-size source and preview are not bundled into the game.

The home renderer uses all eight poses. Eating and drinking use the same lowered-head pose with a small nod. Food and water themselves are separate real voxel bowls, not painted into the sprite. There is no finite pet hunger resource or recurring pet expense. Pets and schedules are transient presentation state; placing, moving or storing their normal saved beds and bowls selects where they live and which routines are possible. Pets walk around furniture on a half-cell navigation grid, and stop with the farm's pause state.

Defaults: Skyla stays in the parlour; Sandy uses the bedroom when open; Maisie uses the kitchen when open. A cat bed rehomes Skyla. The first placed dog bed belongs to Sandy and the second to Maisie. Without a bed they can still nap on the floor. Bowls in their room enable snack/drink trips. Decorating and rebuilding a room recreates a pet's transient routine without changing any inventory or money.

The three furnishings use the cottage's existing fine voxel kit and palette, with measured collision bounds. `home-pets.test.mjs` verifies room assignments, bounded routes around furniture, unreachable destinations and finite model geometry.
