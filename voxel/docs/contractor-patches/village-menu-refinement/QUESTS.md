# Quest, satchel and workshop presentation

`ui/village-chapters.js` remains pure presentation. No rules, saves, prices, rewards, quest progress or stock generation changed.

## What the player sees

- The followed story leads the journal with its next action, completed-step meter and distinctive reward. Other active stories start as compact closed rows, with giver, title and current task; expand one to inspect requirements or follow it. Rewards and completed-story receipts remain available without overwhelming the initial view.
- The satchel puts its four usable material quantities before optional crosslinks. Each item explains Ready, Returning, Full or Tools needed beside Find. A resource needed for an active quest is marked. Returning timers retain active-play semantics; there is no fake stock or remote gathering.
- Rowan's workshop puts unlocked improvements first. Costs are short icon/count receipts and the missing amounts are named plainly. Future story requirements and already-owned effects are separate closed folds. Only the first usable upgrade action is the controller default, and paused play explains why the purchase cannot run.
- The stall shows the current spending balance and explains price shortfalls. Pieces still go to their existing village or farmhouse inventory. Buying remains a single tap and repeatable copies remain available where the rules allow them.

## Keep these dependencies aligned

| Surface | Contract |
| --- | --- |
| `data-vg-track`, `data-vg-gather`, `data-vg-upgrade`, `data-vg-buy` | Existing village-game handlers and model quotes remain authoritative. No new events are required. |
| `data-vg-details-key` | Root panel memory preserves open state and summary focus by logical identity, not list position. Quest availability/purchases can reorder content. |
| `.vg-ch-story-fold` / `.vg-ch-workshop-fold` | Native details/summary retains touch, keyboard and controller behaviour. Controls hidden by closed details must be skipped by the input layer. |
| `village-chapters.css` | Card-only polish; it does not move the world HUD or enlarge the outer panel. Minimum text is12px and interactive targets are44px or larger. |

Logical keys: `story:<questId>`, `reward:<questId>`, `finished-stories`, `friendship-keepsakes`, `friendship:<folkId>`, `explore-help`, `other-materials`, `workshop-later`, `workshop-owned`.

## Validation

22 chapter/map checks pass, including existing no-mutation, exact delivery counts, saved inventory copies, upgrade transactions and costume rewards. Four added cases exercise compact-story identity, truthful material state, precise upgrade shortages/owned filtering/paused purchases, and stall affordability. Browser viewport, focus, scrolling and controller checks are owned by the parent QA pass; this fragment does not claim a device test.
