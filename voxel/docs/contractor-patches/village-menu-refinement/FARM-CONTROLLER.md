# Farm bars on a controller

L2 / LT now opens the farm's top HUD, crop actions and bottom navigation for D-pad selection. It works while managing the farm and while controlling Shane or Natalie. The gold ring is the existing menu ring, with the level badge as its first stop; later visits remember the last usable bar button. Up/down crosses the bars according to their on-screen positions, and left/right moves between nearby controls. Cross / A selects. Circle / B or another L2 / LT press returns control to the world. Options retains its wider menu hub.

The compact L2 **Farm menus** hint appears only after the player actually uses a connected pad, and disappears for touch, another input owner or a menu. While the bars are active, a small legend explains Navigate, Select, Back and Close. In play mode the crop actions and dock become visible, and the ordinary play/camera legends are hidden to avoid overlapping instructions.

## Input boundaries

- The shortcut is farm-only, with no open menu/modal, cursor, camera inspection, action wheel, furniture placement or active crop work.
- Entry and exit clear held movement, looking and interaction through `createPlayPadBoundary.release()`. Held controls must return to neutral before the world accepts them again.
- A menu opened during the current frame blocks movement immediately. A simultaneous Cross press cannot also harvest, buy in the newly opened panel, or activate while the player closes the bars.
- Farm L2 no longer performs the old single-step zoom; R3 still opens the dedicated farm zoom/pan mode. Interior L2 zoom, menu L2 scrolling and village controls retain their bindings.

## Integration and dependency matrix

| File/system | Contract | Check after changing |
| --- | --- | --- |
| `src/ui/pad-menu.js` | Existing focus geometry and `data-pad-focus`; optional `onFarmBarsChange` callback and `farmBarsEligible` tick argument | HUD/dock buttons remain real, visible buttons; new modal surfaces are registered with the existing menu adapter |
| `src/ui/play-controls.js` | One input owner per frame; uses the existing pad boundary on both L2 transitions | Held Cross, D-pad, both sticks, camera mode, active work, cursor and furniture modes |
| `#hud`, `#actions`, `#dock` | The L2 shortcut's only focus roots | Top-to-bottom D-pad movement at phone, unfolded and TV sizes |
| `#open-levels` | Preferred first focus target; memory falls back if its previous target disappears | Level badge stays usable with its new artwork |
| `src/ui/farm-hud-navigation.css` | Include after existing controls/menu/TV styles | Purple surfaces, existing amber focus ring, compact wrapping legend, safe-area clearance |
| Saves and economy | No data, migration, timing, reward or purchase-rule changes | Existing saved farms load normally |

## Verification

`node --test test/farm-hud-navigation.test.mjs test/pad-menu.test.mjs test/play-input-boundary.test.mjs` passes. The new test file runs the real menu adapter with a small layout-aware DOM and the real pad boundary, covering four flows: L2 entry/held trigger; top/action/bottom traversal, one activation and remembered focus; eligibility, pad-only hint, menu scrolling and Options; and held-button/stick neutralisation at entry/exit. Both changed JavaScript modules pass `node --check`.

This contractor part did not build, open a browser, commit or push independently. The lead's integrated build and browser verification cover final responsive placement and actual DualSense/TV behaviour.
