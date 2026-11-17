# Stable stick cursor and illustrated home categories

The stick cursor was magnetically settling towards its cached hovered button after a purchase replaced the menu. Detached DOM elements report an empty rectangle at the origin, so that old button pulled the pointer towards the top-left before the next hover refresh; it then latched onto another control. Clicks also extended the old settling window without new stick intent.

The cursor now retains its exact screen point after selection. Magnetic settling starts only when real steering stops, lasts briefly and requires the same connected control to remain under the pointer. Clicking, scrolling, D-pad nudging, hiding and resizing clear that settling state. Hover refresh uses the current DOM. Invalid axes are neutralised, and viewport changes clamp the existing point rather than resetting it. Mouse takeover and reopening retain that point too. Click forwarding, world taps, Back, menu priority and TV sizing remain unchanged.

Home → Furnish now has twenty generated painted-voxel category icons: all eighteen function kinds, the room mode and the owned-inventory mode. Five room tabs and four owned filters reuse the corresponding art. Rooms/Furnish/Expand also have icons. Short visible captions remain at least 12px; category buttons are 60×62px and keep their full accessible names. Existing model-rendered item thumbnails, selected finishes, item IDs, prices and transactions remain unchanged.

The category rail scrolls horizontally. `menu-memory.js` now stores both axes for existing `data-keep-scroll` lists, and the category rail has a stable name per browsing mode. Choosing a category near the right-hand end no longer redraws the rail back at its start. This is transient menu state, not a saved-game migration.

## Integration and dependency matrix

| Surface | Dependency | Requirement |
| --- | --- | --- |
| `ui/pad-cursor.js` | Menu replacement, connected element bounds, raw pad axes | Never settle from a cached detached element or from a click without new steering. |
| `ui/menu-memory.js` | Shared menu redraw/return lifecycle | Preserve both scroll axes for named lists; retain existing focus/disclosure restoration. |
| `ui/home-sheets.js` | Pure icon helper and existing catalogue kinds/modes | Keep button identities, text/ARIA names and existing purchase handlers. |
| `ui/home-category-icons.js` | Browser entry point | Import and call `installHomeCategoryArt()` once before menus open. It installs one shared atlas stylesheet and is idempotent. |
| `ui/home-category-icon-markup.js` | Pure chapter/menu rendering and aliases | Safe to import in Node; unknown IDs return empty markup for existing SVG fallbacks. |
| `ui/build-catalogue.css` | Game theme tokens and TV parent zoom | Icons inherit one parent zoom. Do not apply another overlay zoom to the icon span. |

The root contractor owns `main.js`; bootstrap integration is:

```js
import { installHomeCategoryArt } from './ui/home-category-icons.js';
installHomeCategoryArt();
```

## Art and reproduction

The generated source and complete prompt/provenance are in `assets/home-category-concepts/`. The viewed style references were the original garden icon atlas and the recent furniture bundle contact sheet. Runtime art is a shared lossless 640×512 WebP (342,446 bytes), twenty 128px cells with transparent gutters. Individual PNGs, a manifest and a 32px contact preview are in `assets/home-category-icons/`.

Repack with `python3 tools/bake-home-category-icons.py` from `voxel/`. Pillow only crops, cleans near-transparent speckle, fits aspect ratio and packs the generated artwork. It does not draw the furniture.

## Verification

`node tools/pad-cursor-dom-qa.mjs` runs the production cursor and catalogue in actual headless Chromium DOM, without the game renderer. Its **16 checks pass**, with no page errors. It tests detached/reflowed targets after clicks, stale hover replacement, genuine steering settlement, scroll, D-pad nudges, resizing, mouse handover, invalid input, category filtering and horizontal scroll preservation. The actual catalogue markup is used, while furniture item thumbnails are explicitly stubbed; this is not a full-game visual or hardware test. The screenshot clearly marks the new category icons; blank item thumbnails are the declared test double.

`node --test test/home-wall-controls.test.mjs test/pad-menu.test.mjs` also passes all **10 checks**. The source art and 32px previews were visually reviewed. No commits or full-game build were made by this subtask.
