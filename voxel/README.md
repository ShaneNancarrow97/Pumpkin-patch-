# Pumpkin Patch: voxel reference build

A from-scratch reimagining of Shane & Natalie's Pumpkin Patch in a **slightly 3D, top-down voxel style**. It was built only from [`docs/GAME-BIBLE.md`](docs/GAME-BIBLE.md) (copied here), to test whether the bible is enough to rebuild the game in a different style. Treat it as a **reference point** for art direction, staging and menu design, not a replacement for the main game.

![The voxel farm at night](docs/screens/desktop.webp)

| Close up | Phone | Shop menu |
| --- | --- | --- |
| ![Skyla on the counter, Shane by the patch](docs/screens/close-up.webp) | ![The phone layout](docs/screens/phone.webp) | ![The shop menu](docs/screens/desktop-shop.webp) |

The art target the scene is staged against is in [`docs/screens/target.webp`](docs/screens/target.webp).

```sh
cd voxel
npm install
npm run dev     # http://localhost:8001, rebuilds on change
npm test        # game-rule tests
npm run build   # dist/pumpkin-patch-voxel.html, one offline file (about 810 KB)
npm run smoke   # plays the built file in headless Chromium and checks for errors
```

Saves use their own key, `pumpkin-patch-voxel-reference-v1`, so trying this never touches the main game's progress.

## What's in it

- **The world, laid out as in the bible.** The whole yard fits in one wide shot, framed like the art target:
  - the crooked cottage top left, with lanterns, window boxes and red creeper
  - the giant jack-o'-lantern on its candlelit wine-red stage
  - the 12-plot patch in a pale stone oval, in the middle of a cobbled yard
  - the Honest Pumpkin shop top right: a gable sign, a striped awning, shelves of glowing jars, a row of lit pumpkins, a chalkboard and a banner
  - the lilac stone path the visitors walk, out at the bottom right
  - a leafy arch in the back fence, with string lights, opening onto the lake
  - wooden picket fences with lantern posts, crates, barrels, hay bales, a bench and flowers
  - red, orange and plum autumn trees round every edge
- **The far shore** is painted pixel art on a backdrop that leans back to face the camera: the night sky, a crescent moon, mountains, the castle on its hill, and a lakeside village with its lights reflected in the water.
- **Lighting:** lilac moonlight casting soft shadows, warm lantern and window light, a bloom glow on everything that's lit, and fireflies.
- **The cast, built part by part from the bible:**
  - **Shane, Natalie and Skyla** are voxelised from the main game's own sprites, one voxel per pixel at 120 voxels tall (Skyla 54). Every detail of the art carries over: Natalie's glasses, hoops and pumpkin, and Shane's goatee, jacket and trowel. Depth is rounded towards the silhouette's edge, and a back is painted on (hair behind the faces). They use the sprites' own six walk frames and blink frames, and lean back slightly towards the camera like sprite-game characters.
  - **Recolours:** Natalie's knit and Shane's beanie are retinted for the wardrobe, keeping the art's shading.
  - **Skyla** sits on the counter, visible under the raised awning.
  - **The five neighbours:** Pip, Mabel, Count Bram, Bones and Patch.
- **The loop:**
  - Plant, grow, harvest. Tap the big pumpkin to hurry growth.
  - Visitors walk up the path to Skyla's counter and buy the best pumpkin they can afford.
  - Spend coins on upgrades, better seed varieties and recolours.
  - Claim favours from the neighbours.
- **Menus:**
  - **Look:** plum panels with brass edges, a crescent-moon heading, small bats on the frame, and gold price buttons. Pumpkin thumbnails are rendered from the real 3D models.
  - **Placement:** sheets slide up on a portrait phone, or in from the side on landscape, the Fold's inner screen and desktop.
  - **Layout rules:** the same as the main game's interface overhaul: the farm stays visible, nothing under 12px or 44px, and a dock or rail for navigation.

## Controls

| Action | How |
| --- | --- |
| Look around | Drag |
| Zoom | Pinch or scroll |
| Plant or harvest | Tap a plot |
| Boost growth | Tap the big pumpkin, or press the space bar |
| Open the shop | Tap the shop |
| Chat | Tap Shane or Natalie |

## Code

| File | What it holds |
| --- | --- |
| `src/model.js` | Game rules. No DOM and no three.js, so `test/` runs it in Node. |
| `src/voxels.js` | Box batching: every box sharing a material becomes one instanced draw call. |
| `src/world.js` | The map: terrain, cottage, shop, path, fences, arch, trees, props and the painted far shore. Layout constants live here. |
| `src/sprite-voxels.js` | Shane, Natalie and Skyla: sprite frames turned into voxel meshes, with frame animation |
| `src/sprite-meta.js`, `assets/sprites.png` | The baked sprite atlas. Regenerate with `python3 voxel/tools/bake_sprites.py` from the repo root |
| `src/characters.js` | The visiting neighbours, built by hand, with legs that swing |
| `src/scene.js` | Renderer, lights, bloom, camera, input, and the per-frame animation |
| `src/main.js` | Save and load, goals, menus, and the HUD |

## Not in it (yet)

Room interiors, full costume outfits, books, the indoor shop with customers inside, and Flex Mode.
