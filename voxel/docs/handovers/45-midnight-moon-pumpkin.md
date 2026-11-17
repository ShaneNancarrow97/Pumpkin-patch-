# 45 — Midnight Moon pumpkin contractor increment

Source branch: `contractor/midnight-moon`.
Base: `121f4cdbb85770de38c3860c2e51647f8bd2c921` (completed cooking handover 44).
Runtime commit: `ab0fe12e0d0554f1903affdb91bfd3f43452dc27`.

## Complete in this increment

- Fifth voxel-only crop, **Midnight Moon**, stable index 4 and ID `midnight-moon`: deep navy rind with golden crescent and star voxels painted onto its curved surface. Shared templates serve the field, shop display and menu thumbnails. Gold uses the existing unlit batch, with no extra lights or per-frame geometry.
- Buy seeds **one plot at a time**, after Starlight: £7,800, 48-second base growth, £110 base sale price. The original four varieties retain their indices, names, prices and times. This is about 18% better base income per second than Starlight before shared upgrades.
- Fifth stock/freshness bin, per-plot choice, shop display selector, stock popover, held baskets, wanted demand, neighbour orders, premium quality/tips and Baron's preference all support the new variety. Four shop furniture display slots remain four; these are not variety counts.
- Four-bin legacy saves are padded with an empty fifth bin. Five-bin saves preserve the new stock, freshness, selected seed and growing crop. Hayride/maze return visitors retain valid fifth-variety preferences and baskets. No reset, free stock, forced replacement of existing crops or root 2D catalogue change.

## Claude integration

Use the binary incremental patch in the download package **only on handover 44's base**. Inspect/cherry-pick runtime `ab0fe12` if that ancestry is already present. Preserve your private changes; do not reset `voxel-reference` or apply this over a dirty checkout without reviewing conflicts.

```sh
git apply --check midnight-moon-from-121f4cd.patch
git apply midnight-moon-from-121f4cd.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-midnight.html
```

The source of truth for variety counts is now `voxel/src/content/pumpkin-varieties.js`. Avoid introducing new literal four-bin assumptions. Some tests deliberately still seed four-bin legacy fixtures; their expected restored result includes a fifth zero.

## Other contracted work remains separate

The larger kitchen workshop, Maisie, visitor/VIP and seated art, Natalie wheelchair, first-cook presentation, Sandy deluxe automation and hayride fleet/route changes remain **unfinished integration work** in the separate `contractor/kitchen-workshop` workspace. They are not claimed as complete or bundled into this playable increment. This patch deliberately contains only the completed fifth-crop work and its dependencies on the already delivered game. Do not merge unfinished work blindly or assume the new VIP sprites are in this HTML.

## Verification and download

See `docs/contractor-patches/midnight-moon/verification/` for exact evidence. 68 Node test files pass, including the new paid-tier/growing/save/checkout/native-mesh scenarios. Browser checks exercise the actual seed-purchase button, save/reload, fifth-crop rendering, and unfolded Fold viewport. The downloadable HTML contains normal game defaults; funds and test stock exist only in the QA browser.

Physical Z Fold 7 performance, Android file handling and OS fullscreen have not been verified on hardware. The existing fullscreen button remains; automated browser checks serve the unchanged offline HTML over loopback because managed browser policy blocks direct file navigation.

The updated game reads older saves; older executables do not understand the fifth bin. Preserve an export when switching versions. This increment keeps the additive schema 12 and its save key.
