# Pumpkin Patch: voxel reference build

A from-scratch reimagining of Shane & Natalie's Pumpkin Patch in a **slightly 3D, top-down voxel style**. It was built only from [`docs/GAME-BIBLE.md`](docs/GAME-BIBLE.md) (copied here), to test whether the bible is enough to rebuild the game in a different style. Treat it as a **reference point** for art direction, staging and menu design, not a replacement for the main game.

![The voxel farm at night](docs/screens/desktop.webp)

| The original sprites | Phone | Voxel characters |
| --- | --- | --- |
| ![Shane by the patch, the five visitors walking up to Skyla's counter](docs/screens/close-up.webp) | ![The phone layout](docs/screens/phone.webp) | ![Shane and Natalie as voxel figures](docs/screens/voxel-characters.webp) |

The art target the scene is staged against is in [`docs/screens/target.webp`](docs/screens/target.webp).

```sh
cd voxel
npm install
npm run dev     # http://localhost:8001, rebuilds on change
npm test        # game-rule tests
npm run build   # dist/pumpkin-patch-voxel.html, one offline file (about 1.6 MB)
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
- **The cast are the main game's own sprites,** standing in the voxel world as flat cut-outs, the way sprite-in-3D games draw their characters:
  - **Shane and Natalie** are drawn at full size, with the original idle frames (the blink) and six-frame walk cycles.
  - **Skyla** has all four of her frames: she looks round, blinks, and reacts when a visitor pays. She sits on the counter, visible under the raised awning.
  - **The five neighbours** (Pip, Mabel, Count Bram, Bones and Patch) walk up the path with their four-frame walks.
  - **Sizes** keep the original game's proportions: visitors are about two thirds of Shane and Natalie's height.
  - **Lighting:** the sprites are lit by the moon and lanterns and cast shadows the shape of the art. They lean back slightly towards the camera, stretched so the art keeps its exact proportions on screen.
  - **Recolours:** Natalie's knit and Shane's beanie are retinted for the wardrobe, keeping the art's shading.
- **Voxel characters** (Settings) builds the cast from voxels instead:
  - **Shane, Natalie and Skyla** are voxelised from the same sprites, one voxel per pixel at 120 voxels tall. Depth is rounded towards the silhouette's edge, and a back is painted on.
  - **The five neighbours** are built by hand from the bible.
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
| `src/sprite-actors.js` | Shane, Natalie, Skyla and the visitors drawn with the original sprites |
| `src/sprite-voxels.js` | The voxel characters: sprite frames turned into voxel meshes. Also the frame animation and recolours both kinds share |
| `src/characters.js` | The visiting neighbours built by hand from voxels, with legs that swing |
| `assets/hd-*.webp`, `src/sprite-meta-hd.js`, `assets/sprites.png`, `src/sprite-meta.js` | The sprite sheets, full size and small, baked from the main game's art. Regenerate both with `python3 voxel/tools/bake_sprites.py` from the repo root |
| `src/scene.js` | Renderer, lights, bloom, camera, input, and the per-frame animation |
| `src/main.js` | Save and load, goals, menus, and the HUD |

## Not in it (yet)

Room interiors, full costume outfits, books, the indoor shop with customers inside, and Flex Mode.
