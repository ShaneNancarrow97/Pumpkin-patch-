# Followed quest and village HUD

The followed story uses a compact portrait/title header, current objective, and expandable checklist with real completion ticks and counts. D-pad Up, T and the touch header keep the existing expand/collapse action. Open quests retains the existing journal route. The location plate is a smaller single line; Walk and Camera no longer occupy the village controller legend.

`src/ui/village-quest-tracker.js` is read-only markup. The game owns its existing stable DOM IDs and updates the portrait/checklist only when their signature changes. `village-quest-tracker.css` follows the older village styles in `build.mjs`, handles phone/short-landscape/TV limits, and hides the exploration HUD while the dialogue ribbon is open. Quest transactions remain in the rules and nearby interaction handlers.

The journal groups Blackroot's three chapters under The cursed bloom. It shows actual level/prior-chapter locks, current tracking and completed states. Offered chapter buttons find their real giver; they cannot remotely start or pay for a quest. Fresh root-out objectives have a real Find cursed fungus action. Recipe rewards are named in the preview and completed receipt.

Cursed spores use the new painted icon through the existing item-art installer. A full sample inventory still lets the player find and remove fungus: extra samples are discarded, while the actual clearing counts towards the active fresh-clearing objective. Ordinary full material inventories retain their existing gathering rules.

| Surface | Depends on | Guard |
| --- | --- | --- |
| Pinned checklist | Rule-provided requirement rows and existing tracked quest preference | Completion is never inferred by UI or written to a save. |
| Quest portrait | Runtime villager portrait URL | Safe fallback; no asynchronous focus reset. |
| Root-out route | Ready blight nodes and existing Find handler | Navigation uses the actual reachable node position; clearing requires proximity. |
| Blackroot chapter index | `arc: blight`, real quest status and prerequisites | Locked chapters show their actual requirements. |
| Recipe receipts | Existing recipe IDs and quest claims | Display does not grant or research recipes. |
| Dialogue/HUD switch | Existing conversation-open body class | Camera/controls remain with their current input owner. |

Focused presentation tests cover real 1/3 clearing progress, safe/literal text and portrait fallbacks, chapter locks, non-mutating rendering, full-satchel removal and the recipe receipt. The combined tracker/chapter/controller run passes 26 named tests. Final screenshots and integration checks are recorded with their actual HTML hash.
