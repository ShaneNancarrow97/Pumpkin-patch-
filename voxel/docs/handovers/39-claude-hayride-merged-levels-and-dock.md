# 39 — Claude: the hayride merged, later unlocks, and a new dock

For Codex. Follows Claude's 37 (meadow chats and comforts) and Codex's 38 (hayride lead integration). Base your next branch on the head of `voxel-reference`.

**About the numbering.** Codex and Claude each wrote handovers 36 and 37 at the same time; the files have different names. From here, use the next free number after 39.

## The hayride is on the lead branch

`contractor/hollow-hayride` (12c6fe4) is merged into `voxel-reference`, with all of Codex's modules, tests, tools and verification records. Where both sides changed the same lines, the merge keeps both:
- **Footfall:** `attractionFootfallBonus` now adds the meadow's comforts to the maze and the hayride, still capped at 75% together. The Visitors tab lists each part.
- **The stall loop:** a chatter is handed to `tickChat` before anything else. A chat is planned only after the hayride-after and maze-after rolls, and never for a guest whose hayride or maze visit is unfinished or who went home that way. `planChat` checks the same.
- **Saves:** `saveData` keeps `hayrideVisitors` and still drops `s.social`.
- **Scene:** a chatter is an excursion like a hayride or maze guest, and nobody is drawn while the owner is on the ride.

## Unlocks moved three levels later (owner's request)

Patch levels stop at 12, so the top tiers share level 12:

| | Before | Now |
| --- | --- | --- |
| Hollow House purchase | 6 | 9 |
| Foyer tiers 1–5 | 6, 7, 8, 10, 12 | 9, 10, 11, 12, 12 |
| Hayride purchase | 8 | 11 |
| Hayride tiers 1–3 | 8, 10, 12 | 11, 12, 12 |

The hayride's sign and the Attractions card read the level from `HAYRIDE_PROPERTY`, so they follow any later change. The three tests with hard-coded levels are updated.

## The dock (owner's request)

- **Build is now Upgrades** (`ui/upgrade-menu.js`, `ui/upgrade-menu.css`).
  - Tapping it raises a menu of the upgrades sheet's sections: Farm, Seeds, Shop, Cocoa, Stock and Visitors. Choosing one opens the sheet there.
  - The menu has `role="menu"`, takes arrow keys, and closes on Escape or a tap elsewhere.
  - In scripts, click `[data-tab="shop"]` and then `[data-upgrade-section="…"]`.
- **Wardrobe has its own dock tab** (`data-tab="wardrobe"`), and More no longer lists it. `smoke.mjs` and `tools/qa-premium-ui.mjs` follow both changes.

## The takeaway cup

Guests carry Sandy's drinks in a takeaway cup (`takeawayCup(kind)` in `cocoa-props.js`): white paper narrowing to the base, a sleeve in the drink's colour with Sandy's orange badge, and a black lid with a sip spout. The model is built at half size. The stock cups on her counter are the same cup.

## Verification

- **`npm test`:** 338 pass after the merge (60+ files).
- **Codex's `tools/qa-hayride.mjs`:** run on the merged build. Results are in the PR.
