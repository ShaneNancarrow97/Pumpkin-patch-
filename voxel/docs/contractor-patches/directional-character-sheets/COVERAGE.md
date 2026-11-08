# Directional artwork contract and coverage

The directional pack contains **eight authored viewpoints selected in 45° camera-relative bins**, with eight walking phases for each viewpoint. The painted angles are approximate, not calibrated 3D renders. It does not represent 24 viewpoints at 15°, nor new directional watering, planting, picking, sitting or idle paintings. Existing action art remains separate. A held walk frame may provide an idle fallback, but must not be described as an authored idle animation.

The delivered set covers Shane's and Natalie's base clothes plus the nine village residents: Elowen, Rowan, Vesper, Mabel, Tansy, Opal, Cinder, Corvus and the village Baron. This is 704 authored movement cells: 640 walking cells and Cinder's 64 floating cells. Existing costumes, farm visitors and household pets retain their previous sheets. The village Baron and Mabel entries do not replace similarly named farm visitor sprites.

## Source approval

`assets/directional-sprite-concepts/manifest.json` declares only inspected, approved sources. One character/costume occupies each transparent PNG, arranged in eight rows of eight walking phases. Both left and right views must be painted; the baker never rotates, mirrors, warps or fabricates a direction.

```json
{
  "version": 1,
  "characters": [{
    "id": "elowen",
    "source": "elowen.png",
    "approved": true,
    "grid": { "columns": 8, "rows": 8 },
    "directions": ["front", "frontRight", "right", "backRight", "back", "backLeft", "left", "frontLeft"],
    "height": 2.3
  }]
}
```

Each row's intended gait slots are left contact, left down, right passing, right up, right contact, right down, left passing and left up. Directions may be declared in a different row order, but all eight must be present once. These slot labels record the generation brief, not a mathematically verified anatomical rig: some painted rows start on the opposite anatomical foot. The important visual check is opposite contact poses half a cycle apart. Do not infer perfect anatomical phase synchronisation between independently generated characters from these labels.

Cinder has `locomotion: "float"`: eight authored tail, arm and steam phases per direction, with no feet or `contactLeg` labels. Her source roots share one Y baseline within each direction to retain the painted bob. `--measure <source.png> --float` suggests that baseline. Runtime direction selection and phase preservation are otherwise the same as for walking characters.

If generated gutters are uneven, supply optional `rowEdges` and `columnEdges`: nine increasing integer pixel cuts, starting at zero and ending at the source height/width. The output grid remains uniform. A one-pixel transparent gutter is sufficient; a complete foot at a crop edge is retained when the immediately adjacent source pixel is transparent. Actual artwork continuing across a crop edge is rejected.

The default source root uses the fixed horizontal centre of each source cell and the measured opaque foot baseline. When the generator has shifted a figure inside its cell, add `sourceAnchors`: 64 measured `[x,y]` roots in local source-cell coordinates, in row-major order. Do not centre each frame on its silhouette; props, skirts and outstretched hands change that centre and would make the torso sway sideways.

`python3 voxel/tools/bake-directional-sprites.py --measure <source.png>` prints suggested transparent cuts and 64 roots without editing the source or approving it. Its X estimate is the median centre of the longest opaque torso run, 28–58% down the body, avoiding many detached props. Its Y estimate is the opaque foot baseline. These are review aids, not anatomical ground truth: broad capes, armour or a pose with an arm across the torso may still need a manually measured root.

## Bake and review

Run `python3 voxel/tools/bake-directional-sprites.py` from the repository root, or run the script from any directory. `--root` targets an isolated fixture checkout; `--config` selects another source manifest inside it.

The bake publishes only after every declared source validates. It produces:

- `assets/directional/<id>.webp`: 1024×1408, 64 cells of 128×176.
- `src/content/directional-sprite-meta.js`: source row order, walk indices, measured body height and shared frame roots.
- `assets/directional/manifest.json`: actual delivered coverage, source/output hashes, shared scalar, original/packed bounds and memory footprint.
- `assets/directional/<id>-contact.jpg`: all 64 poses labelled for visual inspection.
- `assets/directional/preview.html`: direction selector, frame scrubber, slow/normal playback and the common floor line.

One uniform scalar per character fits the largest body and widest pose. It targets a maximum body height of 144 pixels, with a root at `(64,164)` and transparent gutters; filtering may add one measured opaque pixel. Smaller packed body height is recorded when wide props require it; the renderer uses that measured value to preserve world scale. All frames retain the same scalar. Near-invisible alpha below 32 is discarded. At the outer two source-cell pixels, fringes below 108 are also removed: these cannot pass the runtime's .42 alpha test and can bridge an otherwise clear gutter. Opaque pixels are retained. A detached component is removed only if it contains at most 32 pixels, touches the outer three source-cell pixels and stands at least eight pixels away from the main figure. All removals are recorded. This removes export flecks while preserving nearby details, flames and hands. No art is redrawn.

Tests inspect decoded alpha bounds, source and output hashes, frame indices, uniform scaling and rejection of missing, duplicate, unapproved or clipped art. These checks cannot prove a painted limb is anatomically correct or a row really faces the declared direction. Inspect every row at game size: opposite feet must lead in phases 1 and 5, the near/far arms must swap naturally, the spine should retain its centre, and the floor/root must remain stable. Verify front/back identity and asymmetric costume details before setting `approved: true`.

## Runtime and memory

The module exports `DIRECTIONAL_SPRITES`, with each entry containing `url`, `w`, `h`, `cell`, `rows` (measured body height), `height` (world units), `frames`, `directions` and `walk`. It has no authored `idle` field. The renderer must retain walk phase when changing direction and select the row from the actor's heading relative to the camera, independently of the plane's billboard transform.

One atlas occupies 5,767,168 bytes of decoded RGBA texture memory before mipmaps (about 5.5 MiB). Eleven simultaneously resident atlases occupy about 60.5 MiB before mipmaps. WebP download size is not GPU memory usage. Keep textures shared between actors, avoid per-frame canvas work or uploads, and warm only the relevant scene's cast. Do not increase frame cells or direction counts without checking Fold/TV rendering memory and timing.

The runtime manifest is the authoritative list of delivered characters. Names absent from it retain their previous sheets. Directional coverage for a base character does not imply coverage for their costumes, visitors, pets or interaction actions.
