# Achievement dependency matrix

| Proposed piece | Existing touch points | Impact to protect | Required proof |
| --- | --- | --- | --- |
| Definition catalogue | Fixed launch sets, recipe/costume/shape metadata | No moving completion target or circular final badge | 64 unique IDs, 1,000 points, all 63 S12 prerequisites explicit, expansion set separate |
| Durable action stats | `farm.js`, `farm-work.js`, `hands-on.js`, `commitPlayerWork` | Manual/helper/owner distinction, stock and cooldown rules | Only committed accepted actions count; batches count distinct crops correctly |
| Business stats | Selling, customer care, cocoa, cooking, maze/hayride payment | Finite purses, stock consumption, tips separate, no duplicated sale | Source-qualified settled receipt IDs, kitchen station/automatic provenance |
| Home/reading/pets | Placement rules, reader, owner interactions | Actual placement/access, no animation-only award | Valid furniture/wall faces, page sets, committed interaction completion |
| Unlock and award engine | `model.js`, pure rules update, save restoration | Once-only recognition/reward, honest retroactive history | Stable receipts, definition revision, duplicate-event and reload tests |
| Existing Memories/Favours | `rules/progress.js`, `handle(memory)` | Preserve scrapbook/paid claims, suppress duplicate celebrations | Explicit safe aliases; higher/lower thresholds checked; no blanket import of all 17 Memories |
| Notification coordinator | Level celebration, notices, NPC rewards, ride/carving/decor boundaries | Visible controls and finite reward lifetime | Safe lane, priorities, no hidden NPC reward expiry, bounded coalescing |
| Library/detail input | More/hub/Journal, `pad-menu.js`, world-menu boundary | No focus steal, background game conventions, saved filters | Exact toast→exact details, close/back, keyboard/pad/touch parity |
| Art/sound | Existing UI icons/audio preferences, optional new atlas | HTML size, accessibility, premium consistency | Small readable badges, original sting, mute/reduced motion, no new renderer lights |
| Collection cosmetics | Decor catalogue/models/sockets | No invalid reward IDs or new income/progression loop | Real assets ready before enable; idempotent claims and duplicate ownership |

Suggested implementation order: definitions/ID sets → source events and stats → receipts/migration → early goals → toast/library/details → remaining domains/sequences → cosmetic rewards → whole-game regression. Evaluate dirty domains on committed rule events; do not poll all complex conditions on every render frame.

The plan branch has earlier farm-work ancestry. Copy only this planning folder or cherry-pick its planning commit. No runtime modules, generated sprite sheets or current lead files are changed by this package.
