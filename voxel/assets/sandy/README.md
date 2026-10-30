# Sandy — cocoa cashier assets

The current cashier imports `lean-idle.webp`, `lean-blink.webp`, `lean-serve.webp`, `lean-portrait.webp` and the separate `service-bell.webp`. These are the smaller, slim dachshund redraw; see [`docs/plans/directional-cast/sandy/README.md`](../../docs/plans/directional-cast/sandy/README.md) and `tools/bake_sandy_lean.py` for the source, shared scale and limits.

The three `sandy-*.png` / `sandy-*.webp` files below are preserved original art and are no longer the current character imports. The menu-product atlas remains current. The original manifest documents those preserved assets; current asset hashes and measurements live in the lean-art audit.

Shipped character: the long-bodied adult Sandy generated from the user's reference photos, refined to match the detailed painted Skyla cut-outs. The earlier short-bodied cartoon/atlas drafts are not shipped.

- `sandy-base.png`: standing, eyes open, whole long body and tail.
- `sandy-blink.png`: edit of that same base, eyes closed.
- `sandy-serve.png`: same body/pose, near forepaw at the service bell.
- `cocoa-menu-icons.png`: six icons, **3 columns × 2 rows**: plain / flake / ghost marshmallow; midnight sauce / s’more / shop.
- Matching `.webp` files are lossless runtime encodings. The build inlines them; no remote image hosting is needed.
- `manifest.json` records dimensions, opaque bounds, icon cells, anchor and hashes. Source and runtime alpha and every pixel with nonzero alpha were compared and match exactly. RGB hidden under alpha zero is not a background to bake into the game.

`src/sandy.js` renders the independent character frames, keeping feet fixed, with a gentle idle breath/blink and serving-paw cycle. The serving bell's image region stays present between frames. The original dog was larger/longer than Skyla and sits on the counter's front edge so her face is visible below the roof; all stand upgrades retain Sandy's identity. `src/cocoa-props.js` supplies actual voxel menu items, not flat icon planes.

To reproduce the runtime packaging, with ffmpeg installed:

```sh
for id in sandy-base sandy-blink sandy-serve cocoa-menu-icons; do
  ffmpeg -loglevel error -y -i "voxel/assets/sandy/$id.png" -c:v libwebp -lossless 1 -compression_level 6 "voxel/assets/sandy/$id.webp"
done
```
