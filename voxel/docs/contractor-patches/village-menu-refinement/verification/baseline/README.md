# Baseline village menu review

Exact previous standalone SHA-256: `9314af490ecceb32d030b6ac57772927a15013790f910146ff27ccaf0d54ce17`. The prior HTML was served unchanged; current source edits were not built into this review. Chromium was closed after completion. No page/shader errors or external requests were recorded.

A declared level-20, finished-tour save has two active quests. The review opens real menus, clicks Journal → Map and presses Escape; it does not earn progression or spend items.

Observed usability issues:

- **Portrait Farm button is blank.** The phone rule hides every span inside header buttons, including the illustrated Farm icon.
- **Content pages focus Close.** Journal, Satchel, Workshop and People all initially put keyboard focus on `vg-panel-close`, rather than the next useful action.
- **Nested navigation loses its origin.** Journal → Map → Escape closes to the world instead of restoring the journal and its prior scroll/focus.
- **Quest hierarchy repeats large cards.** The two active cards measure approximately 361px and 338px, both expanded. A player must scroll a long panel to inspect the second story.
- **Portrait Satchel spends its first screen on introduction.** The title, long introduction and two crosslinks occupy about 330px before the first resource. The inventory actions should take priority.

[Desktop journal](01-baseline-journal.png) · [Phone satchel](02-baseline-phone-satchel.png) · [Exact observations](village-menu-report.json).

The purple/cream/amber material language is coherent. Refinement should improve action order and navigation while preserving that direction and the world-first layout. Functional phases hold only renderer/composer draw calls; normal-render glow/shadow frames were restored for both photos. The viewports/software renderer do not certify physical Fold/TV/Bluetooth performance.
