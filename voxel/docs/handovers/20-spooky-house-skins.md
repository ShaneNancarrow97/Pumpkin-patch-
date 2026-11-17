# Contractor: eight spooky house skins

Two purchasable complete looks unlock at each house upgrade:

| House | Skins | Prices |
| --- | --- | --- |
| Little cottage | Harvest haunt; Moonlit cottage | £320; £380 |
| Crooked cottage | Witchwood retreat; Candy coven | £1,100; £1,250 |
| Midnight manor | Vampire manor; Storm laboratory | £2,800; £3,200 |
| Haunted haven | Pumpkin palace; Midnight crypt | £6,500; £7,200 |

Home & Garden → Exterior → House skins. Each bundle applies walls, roof, trim and door; garden fencing is preserved. Owned skins can be applied again freely and continue working as the house grows. Mix finishes retains the existing individual finishes.

These are native voxel looks, with visible pumpkin, ghost, witch, candy, bat, lightning and skull details, themed windows and full material palettes. Models retain two instanced batches, the existing reserve and sealed wall/roof structure; no new lights or animated mesh rebuilding.

Ownership uses the existing `ownedFinishes` list and four new finish IDs per skin. No new save fields or reset. Pure rules validate the house gate, purse, paused state and ownership; the full price is charged atomically once. Bundle parts cannot be acquired individually through the ordinary finish purchase function. Existing saved finishes remain valid.

Files: content/house-estate.js; rules/house-estate.js; house-estate-world.js; house-estate-view.js diagnostics; ui/estate-sheet.js; ui/house-skins.css; purchase-surfaces.js; build CSS list. Tests cover transactions, old/roundtrip saves, every native skin, geometry bounds, finite transforms and sealed house rays. Browser QA covers all eight actual Buy & apply actions, exact debits, live rendered skin IDs, free re-equipping and persistence.

Keep this work on the contractor branch for Claude to review. No lead-branch merge or economy income changes.
