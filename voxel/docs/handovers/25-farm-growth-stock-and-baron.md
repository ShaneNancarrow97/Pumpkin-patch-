# 25 — Larger farm, affordable storage and Baron Brassbolt

Review contractor branch with 24 and 26. All prices/sales still use existing coin, stock and tip ledgers.

## Farm and stock

The first12 plot IDs/positions are unchanged. Two additional purchases open18 and24 plots, costing£2,200 and£5,500 after existing£300/£660 tiers. New rows extend south, with continuous soil/cobbles, a relocated front fence and two unobstructed gate lanes. The meadow can be purchased before or after expansion. Coarse two-unit grass squares beyond the boundary are refined into smaller native grass patches, avoiding the checkerboard appearance when zoomed out. A single terrain mesh replaces the old one once per map change; no overlapping ground overlay.

Shared pure layout in `content/farm-layout.js`: `MAX_PLOTS=24`, `fieldDepth(s)=26/31/36`, `farmPathEnd(s)=30/34/39`, `extendFarmRoute(route,s)`. `farm-expansion-world.js` owns native annex batches and relocates existing lights, preserving light count. Farm camera framing/panning, incoming visitors, cocoa excursions and Hollow House transfers use purchased bounds. Off-map transfers stay hidden beyond the gate.

Base barn capacity rises60→180. Storage costs are £60,£180,£500,£1,400,£4,000,£10,000. Cumulative storage bonuses are0/180/500/1,200/2,600/5,400/11,000; existing yield bonuses remain. A whole harvest must fit. Ripe crops stay safe when full; there is no overflow sale or stock deletion. Existing stock above the limit is preserved on load.

## Rare customer

Baron Brassbolt is stable visitor index 10, with red velvet suit, bolts and monocle. Normal visitor cycling remains the original 10 types. First arrival is due after 110 active seconds, later arrivals 150–180seconds; a full path holds him at the gate. Only one Baron is active. His £375–800 wallet and8–20 pumpkin basket scale within bounds. Every purchase consumes real stock at normal prices, debits his purse and records tips separately. He can also use the ordinary attraction/cocoa simulation.

`rules/big-spender.js` provides `freshBigSpender`, `restoreBigSpender`, timer and basket rules. `model.js` adds `bigSpender:{timer,seen,spent,pumpkins}`. Product spending/pumpkin totals exclude tips. Guest card shows VIP identity and live terror/intention.

The generated animation frames are normalised at the feet. The Baron's lower-body runtime rig swaps the leading leg on the second half-stride while keeping his face/coat facing the route; this avoids repeating the same near-leg step. Four frames run through the shared visitor animation adapter, including voxel-character mode for this special sprite.

## Economy safeguards

- Attraction footfall and harvest streaks share bounded frequency floors; `streakPathBoost` reports only the harvest contribution for the streak chip.
- `visitorReservations` includes guests temporarily inside the foyer/cocoa stop. Returning guests therefore have a reserved outdoor place rather than overflowing the crowd limit.
- Existing Cocoa hospitality tiers retain patience/service benefits. Before Sandy's stand exists, an optional old-style mug is paid from remaining guest cash. Once Sandy has a physical stand, the legacy mug is disabled, avoiding duplicate/free-money cocoa.

A stocked demand-ceiling simulation (not a new-player playthrough) measured approximately£85/min early,£916/min middle and£1,739/min late, or£1,834/min with a continuously held maximum streak. The reproducible configuration is in `tools/simulate-maze-demand.mjs`; its late scenario has a working, fully scary maze and reserved return capacity. Those scenarios use progressively stronger upgrades/stock and should not be treated as progression pacing promises. Production can exceed demand, so bags, visitors and shop investments remain meaningful. The rare visitor never bypasses stock or wallet checks.

## Save migration and checks

Schema 10 accepts legacy 12-plot and current 24-plot saves, pads only new slots, preserves the original growing progress/varieties, coins, house, outfits, storage tiers and all purchased content. No offline income. `test/farm-growth.test.mjs`, `test/big-spender.test.mjs`, existing storage/festival/customer-care/streak tests and the12→24 regression cover these changes. Final browser evidence is in the contractor verification directory.
