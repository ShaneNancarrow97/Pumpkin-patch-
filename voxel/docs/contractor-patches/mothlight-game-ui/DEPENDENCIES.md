# Visual change dependency matrix

| Changed surface | Depends on | Consequence and check |
| --- | --- | --- |
| Build wrapper | Standard `voxel/build.mjs`, one style block/body | Compile the real game; assert its complete runtime script remains byte-identical |
| Book frame | `.sheet-frame`, `.sheet-head`, `.sheet-body`, `.centred` | Keep sizes/scroll/close handlers; check normal sheets and world editing sheets |
| Purchases | `.button.gold`, `.purchase-button`, `.holding::after` | Preserve native hold timing, legible dark price text and focus ring |
| Service menus | Kitchen/cocoa heroes, cards, price steppers and service variables | Override dark literals so text remains readable on parchment; keep existing callbacks |
| Manage hub | `.upgrade-menu`, actual dock section routing | Keep real section buttons, scroll and keyboard/pad affordances |
| HUD/dock | Existing fixed positions and safe-area variables | Change material only; close menus and confirm world remains unobstructed |
| Handwriting | Caveat font, SIL license, original decorative SVGs | Inline assets/license; use script only for decorative marginalia, never figures/actions |
| Saved game | Unchanged compiled runtime | No save field/key/schema edits; opening/closing menus must not spend money |
| Mobile/foldable | Existing orientation breakpoints, 44px native controls | Phone/desktop/unfolded screenshots, overflow and distinct-control checks |
| Future lead changes | New menu selectors or explicit colours | Repeat visual checks when new panels are added; CSS does not cover unknown future surfaces automatically |

Only this isolated folder changes. The wrapper neither imports an alternate
simulation nor installs new Festival mechanics. Static script equality is a
strong boundary for rules/save behavior, while browser checks cover the CSS
interaction/layout risks. Physical GPU/controller/file-provider behavior remains
outside software emulation.
