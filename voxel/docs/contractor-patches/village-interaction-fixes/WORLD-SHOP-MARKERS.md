# Village shop emblem

`createVillageShopMarkers` adds one small circular world emblem above Rowan's actual stall, and only while the existing `stallOpen(state)` rule says it is unlocked. The tavern, carriage and future shops receive no pretend shopping markers.

The centre reuses the existing painted workshop/shop icon from the installed village UI atlas. Its plum circle is translucent, with a cream/amber rim. The icon remains upright while a separate segmented rim turns slowly (0.12 radians/second), with a 7cm bob and restrained shimmer. Reduced-motion mode makes all three effects static. No floating text, light or shadow is added.

## View adapter

```js
const markers = createVillageShopMarkers({ groundAt });
scene.add(markers.group);            // world coordinates, outside the scaled village root
pickables.push(...markers.pickables);
markers.sync(state);                // after rule/save/menu changes
markers.tick(dt, camera, !inside, reducedMotion());
```

The badge already carries `userData.type = "village-stall"`, so its ray hit follows the existing stall interaction. Its centre is at the canonical `FIXTURES.stall` coordinates, `groundAt + SHOP_MARKER_HEIGHT` (6.28 world units with the existing1.5 scale), just above the model's tallest sign. It hides indoors, while locked and beyond60m. The centre diameter is1.3m; the separate rim is1.43m.

`group`, `pickables`, `sync`, `tick`, `hide`, `stats` and idempotent `dispose` are exposed. Dispose removes the two sprites and releases their two owned textures/materials exactly once; it deliberately preserves Three's shared Sprite quad geometry.

The shared atlas URL is read once from `--village-ui-atlas`, then decoded and cropped once from its generated cell metadata. No raw image import or new main/build hook is required. A simple basket remains available while the atlas loads or if decoding fails. No style/layout reads, canvas drawing, image decoding or new objects occur in the animation tick. Optional document/canvas/image/texture factories let the same code be tested without a browser.

Four focused tests pass: canonical unlocked visibility/picking; slow upright/bounded animation and distance/reduced-motion hiding; one-time atlas cropping without per-frame style work; and exact GPU ownership/late-image disposal. Syntax and diff checks pass. No browser or main-game build was run for this helper; the parent view integration owns its normal-render check.
