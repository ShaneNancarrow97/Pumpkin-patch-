# Claude handover: corrected farm geography, new visitors and stock limits

These are the user's follow-up corrections to the estate/foyer delivery. The final contractor branch merges Claude's published `dd97819`; the HTML retains that fine shop/fixture art, shelves, portrait fixes, arrival/streak balance and idle tea break.

## Two distinct destinations

- **Middle hedge arch** (20,3): Shane and Natalie's private homestead. The existing arch now has a native sign and hedge-lined approach. Home navigation leads here too. The complete 360° garden/exterior is unchanged.
- **Old cottage location** (6.5,6.4): The Hollow House / Scare Maze. Its derelict property is visible from a fresh game. Purchase unlocks at patch level 6, independently of Moonbrew Meadow. It still requires purchase, restoration and explicit opening.
- The farm extends west to **x−8**, with the same terrain generator/palette and a moved left fence/tree line. The maze lane runs along x−3, from its entrance forecourt to a bottom-edge gate at z30. Old cottage steps/clutter no longer obstruct this forecourt. The big tappable pumpkin stays in its original place.

`content/hollow-house.js` owns the routes. An arriving new visitor can enter through the west gate. A visitor coming from cocoa reaches the right bottom gate, spends 2.5 game seconds in `transfer-in` (hidden), then walks through the west gate. After a maze visit, `to-border` follows the west lane to the bottom edge; `transfer-out` hides the same guest for 2.5 seconds; `to-shop` resumes at (33,30), along the normal shop path. No journey cuts across the planting bed or the big pumpkin. Offscreen transfer pauses during tea break and survives save/load without a second ticket charge or new purse.

`world.js` has small, explicit changes to terrain bounds, fence openings, the left tree line and central hedge path. The attraction is no longer built on the meadow. Farm pan bounds include the western strip. Keep these layout hooks when reconciling future world art.

## Five more neighbours, matching the current art

The lossless generated sheet `voxel/assets/hd-horror-visitors.png` uses the existing `hd-visitors.webp` as its visual reference. It contains twenty frames: mummy, zombie, werewolf, undead pirate and vintage horror clown, each with a four-frame walk cycle. No gore. These join the existing five visitors, rather than replacing them.

Stable IDs 0–4 remain ghost/witch/vampire/skeleton/scarecrow; 5–9 are mummy/zombie/werewolf/dead-pirate/clown. `content/visitors.js` is the shared voxel roster. Shop and outdoor guest selection use all ten; the economic profiles are unchanged by species. Names/portraits in the live visitor card use the same roster. Old favour identities retain their first-five indices.

`visitor-sprite-meta.js` measures alpha bounds in each cell, anchors each frame at its feet and uses a consistent 1.62-unit visible height. Row cuts follow actual transparent gutters, so hats and hair aren't clipped by an assumed perfectly uniform grid. The new sprite art is used in both actor-display settings; this delivery does not claim five additional hand-built voxel bodies. The original voxel visitor option for the original five remains intact.

The generated sheet was requested as four columns / five rows, consistent three-quarter painterly storybook neighbours, muted autumn palette and opposite arm/leg steps. The asset is the generation output, not painted programmatically. The raw reference sheet is already in the repo.

## A hard stock cap, with a dedicated upgrade path

At the user's explicit request to slow harvest spam, full storage **leaves ripe crops on the patch**. It does not turn repeated harvesting into automatic wholesale income. A crop needs room for its whole yield. Helpers wait too; the tap pumpkin cannot mint bonus stock or money when full. Already saved excess stock is retained and may be sold normally. Earlier wholesale earnings remain in the save; old money is not clawed back.

Capacity keeps Claude's base formula: `60 + 40 × plot upgrades + 20 × yield upgrades`, plus dedicated barn expansion bonuses:

| Barn tier | Added spaces over base | Purchase cost |
| ---: | ---: | ---: |
| 0 | 0 | Free |
| 1 | 40 | £180 |
| 2 | 120 | £600 |
| 3 | 280 | £1,800 |
| 4 | 600 | £5,200 |
| 5 | 1,240 | £14,000 |

Build → Farm contains **A bigger pumpkin barn**, showing current occupancy and next added spaces. The harvest control says **Barn full** when a crop cannot fit; tapping explains that ripe crops are safe and storage can be upgraded. Skyla's detailed advice also points to storage/sales. Selling stock or buying capacity immediately permits picking again. `upgrades.storage` is additive with a safe zero default for old saves.

## Larger crowds, as progression

The base outdoor limit increases from Claude's 12 to **16**. **Room for more neighbours**, in Build → Visitors, adds four paid tiers: 20/24/28/32 outdoor guests for £300/£1,200/£4,000/£10,000, after Bring a friend. It increases simultaneous outdoor capacity, independently of party size and arrival-frequency tiers. Whole parties still wait at the gate if they won't fit. Guests inside the foyer/maze or in hidden edge transit do not consume outdoor path places. Shop and foyer capacities retain their own upgrade systems. The compact HUD counts actual live guests across these systems.

## Verification and integration

New pure tests cover paid/save-safe storage expansion, ripe crops/helpers/tap bonuses at full capacity, preserved excess legacy stock, 16→32 crowd tiers, ten visitor IDs and the saved timed west-to-shop transfer. The existing crowd gate test now asserts the current capacity rather than hardcoding 12. Browser smoke also checks the full-barn → buy capacity → harvest recovery and verifies that all five new sprite actors have four walk frames that actually advance.

The final delivery README/verification folder records which exact builds ran. The old gameplay review remains pinned to ede512b and must not be cited as a measurement of this newer economy. Future cooking/orders can consume the stock pile without adding another unlimited income multiplier.
