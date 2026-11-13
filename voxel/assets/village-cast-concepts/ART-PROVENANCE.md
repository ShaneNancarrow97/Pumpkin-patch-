# Mothlight Village cast art

These original character paintings were generated with OpenAI's image generation
tool for the Mothlight Village work on 6 November 2026. The existing painted game
cast and the approved nine-character concept were the visual references. The art
retains the warm plum, autumn gold and candlelight palette, large expressive heads
and detailed painted clothes of those references.

The original generation outputs are preserved here without recompression:

| File | Rows, top to bottom | Original generation output |
| --- | --- | --- |
| `approved-cast.png` | Approved nine-character design reference | `exec-e195d883-c557-480c-8beb-dec25c39a00e.png` |
| `green-raw.png` | Elowen, Rowan, Vesper | `exec-5d2ff10b-31d0-4dd5-8d62-628420521ad8.png` |
| `copse-raw.png` | Mabel, Tansy, Opal | `exec-4dafbc14-c256-47ff-ac7f-195e055158c3.png` |
| `night-raw.png` | Cinder, Corvus, Baron | `village-night-raw.png` |

Each atlas has six authored poses: idle, left foot forward, first passing pose,
right foot forward, second passing pose, and wave. Cinder's walking poses sway the
ghost's tail rather than adding feet. The body and face in each pose are painted
art; the baker does not draw replacement body parts or manufacture a walk by
moving an idle image.

`../village/manifest.json` records the SHA-256 and dimensions of every source and
runtime sheet, the exact source grid and crop rectangles, alpha bounds, body
bounds, horizontal body axes, common character scale, output offsets and foot
anchors. It also records the Pillow and WebP settings.

Rebuild from the repository's `voxel` directory with:

```sh
python3 tools/bake-village-sprites.py
node --test test/village-sprite-assets.test.mjs
```

The baker requires Pillow. A first import from the original generation directory
can be made with `--import-generated /workspace/generated_images`. Later bakes
read these preserved sources and need no generation service.

Normalisation uses the authored six-column, three-row grid. Vesper's crop alone
extends seven pixels above the last row boundary to keep the hair fringe that
crossed that boundary. The previous row's feet end clear of this extension; the
manifest records both rectangles. Near-invisible export noise with alpha below
32 is removed. A tiny, isolated fragment touching a cell's bottom edge is removed
only when it is under 64 pixels and at least eight pixels below the main figure.
This removes leaked hair fragments below Rowan while retaining detached steam
details, candle flames, fingers, hats and props.

Every character uses one scale for all six poses and one 128,300 foot anchor in a
256×320 cell. A fractional source sampling rectangle keeps the exact common
scale even when output canvas dimensions round to whole pixels. Placement rounds
to the nearest pixel. The largest visible body is approximately 256 pixels high; measured
body rows make the runtime figure 2.3 world units tall. Horizontal source anchors
follow each pose's body axis so a raised hand does not slide the whole character.

Only the nine compact WebP sheets in `../village` are imported by the game. They
use quality 90 with exact, lossless alpha. The full-size PNGs and
`cast-contact-sheet.jpg` are review material and are not bundled into the game.
