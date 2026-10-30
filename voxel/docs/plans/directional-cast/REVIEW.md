# Directional art review bench

Build a separate, offline review file from the same atlas manifests the game uses:

```sh
node voxel/tools/build-directional-review.mjs \
  --manifest voxel/assets/directional/manifest.json \
  --out /tmp/Pumpkin-Patch-Directional-Art-Review.html
```

The JSON root is `{ "looks": { "shane-base": manifest, "natalie-base": manifest } }`. Each look follows `src/content/directional-atlas.js`. Page URLs are relative to `voxel/`, for example `assets/directional/shane/idle.webp`. The builder validates every look, rejects remote images and paths outside `voxel/`, and embeds the original image bytes. It requires no package or runtime dependency. Review-only manifests can use existing `data:` page URLs too.

The bench displays a 24-step direction slider, action and costume selectors, playback speed, frame stepping/scrubbing, previous-frame onion skin and a shared foot anchor. The 2.3-unit ruler uses one fixed scale across looks and actions. Crouching is not enlarged to fill the view. No flat frame is rotated, stretched or mirrored to claim another direction.

Strict authored selection is the default. A missing action/direction shows a gap. Enabling **Allow nearest authored view** makes the fallback explicit, with both the requested and drawn angles. A static neutral idle is labelled **single pose**, not a completed breathing animation. The coverage table separates complete animations, static poses, and missing/rejected clips. The full target matrix remains visible even when only a small production batch exists.

Use the bench to check:

- recognisable likeness, outfit details and head/body ratio from every authored angle;
- opposite leg contacts and counter-swinging arms through all eight walk frames;
- planted feet, shared anchors, no size jumps or clipped hair/shoes;
- gesture readability at game scale, including lowered bodies and seated poses;
- genuine left and right artwork where tattoos or clothing are asymmetric.

The structural validator checks fingerprints and declared phases; it cannot prove that a painted knee or arm is anatomically correct. Visual inspection in this bench and the actual game remains required. The standalone review deliberately embeds all listed pages; it is not the production selective-loading path and should not be used to infer mobile runtime memory use.

`window.DirectionalArtReview` exposes the embedded data, current selection, coverage and redraw function for root's browser checks. This tool does not alter the game, save state or economy.
