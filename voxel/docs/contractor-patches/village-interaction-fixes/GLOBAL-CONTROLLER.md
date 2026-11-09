# Global controller ownership fix

The stick cursor could remain active after Options opened the gold focus ring. `play-controls.js` then sent the menu a `CURSOR_PASS` filtered frame that excluded Cross, Circle and the D-pad. The pointer received the confirmation instead, often over empty world space, while the visible focus ring could not select its button. An active cursor also prevented the L2 farm shortcut from taking ownership.

The real play-controls/menu/cursor/boundary integration test reproduced those failures before this fix.

## Result

- An open focus menu or hub owns the full controller. The world cursor closes before Options/L2 opens that surface and cannot reclaim input through a thumbstick click while it is open.
- Options and L2 can take ownership from a world cursor. Cross selects the focused hub/HUD action, then works in the resulting wardrobe, home, upgrades, levels or other shared menu surface.
- A cursor click that opens a panel is consumed by the cursor alone. It cannot also select the new panel's first purchase.
- Menu entry, exit and hub handovers clear held movement, camera input and interactions through the existing `createPlayPadBoundary.release()` mechanism. New buttons work after release; a held opener never becomes a world action or an accidental purchase.
- A fresh Cross after touch selects immediately. Steering can still reveal the ring without activating anything. The existing 450 ms protection on newly appeared milestone modals remains.
- Initial hub focus now comes from its usable choices; a disabled or hidden active dock tab cannot trap the focus ring.

No click simulation or per-button purchase workaround was added. The existing native activation, selection geometry, tabs, scrolling and purchase handlers remain responsible for each action.

## Play and camera hints

The Play chip reads **Play mode**. Its PS5 assignment is shown as the supplied Create silhouette: one solid angled rounded pill and three short rays above, with no visible CREATE text or internal marks. Its spoken label and tooltip explain “Create · small button left of the touchpad”. The standard controller binding stays button 8; other standard pads show **VIEW**. Options remains the general menu shortcut and is not mislabelled as Play. An unbound keyboard hint is no longer shown on this chip.

The chip has a more translucent purple surface, contrasting icon/text and a minimum 44 px target. At widths up to 999 px it sits beneath the HUD; larger layouts keep it alongside. This spacing follows a real Fold screenshot that exposed overlap with Settings. The idle farm R3 camera card is hidden. R3 zoom/pan still works, and its essential Done controls appear while camera inspection is active.

## Dependency matrix

| Area | Contract after this change | Verify when extending |
| --- | --- | --- |
| `ui/play-controls.js` | One owner per frame; open focus surfaces receive unfiltered input | Cursor → Options/L2 → menu selection, panel opened by cursor, held entry/exit controls |
| `ui/pad-menu.js` | Existing focus ring activates usable choices with a fresh confirmation | Native buttons, new menu/modal roots, disabled defaults, tabs and scrolling |
| `ui/pad-cursor.js` | Cursor interaction belongs to the world outside play mode; menus retire it | World taps, no cursor/ring double activation, no detached target jump |
| `ui/play-input-boundary.js` | Existing release-to-neutral semantics are reused unchanged | Held Cross, independent move/look neutral, disconnect/reconnect |
| `ui/play-controls.css` | New styling is scoped to the Play chip and its assignment pill | Fold/phone/TV readability and overlap, 44 px minimum, transparency |
| `ui/dualsense-icons.js` | The existing Create glyph now matches the supplied solid pill and three rays; mapping is unchanged | No internal arrow, three rays, decorative accessible title, crisp scalable strokes |
| Village, rules, saves | No source or rule changes in this part | Keep the village's independent input adapter separate |

## Verification

The managed-workspace command below executes the actual tests without spawning sandbox-blocked child processes:

```sh
node --test --test-isolation=none test/global-controller-routing.test.mjs test/farm-hud-navigation.test.mjs test/pad-menu.test.mjs test/play-input-boundary.test.mjs
```

All **24 tests pass**. Ten new scenarios run the real `createPlayControls`, focus menu, world cursor and pad boundary together with a small layout-aware DOM. They cover the reproduced cursor failures, actual menu selection, one-time activation, held controls, disabled hub defaults, touch handback, camera functionality and accurate Create artwork/View labels. Four existing farm HUD, five menu and five boundary checks also pass.

Four additional DualSense artwork checks pass, including the supplied Create silhouette.

Browser screenshots and the final integrated HTML/ZIP/APK checks are recorded by the lead's release verification. These automated checks do not certify a physical controller or TV.
