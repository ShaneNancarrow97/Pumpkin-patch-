# Mothlight lantern-road entrance

The original arch sat beside Skyla’s awning, a lamp and a tree crown. Twelve oversized raised stepping slabs also used a different purple stone recipe from the farm. The new permanent entrance stands at **(37.8,15.1)** on the clear east side of the original yard, with approach **(37.8,16.7)**. Its mounted board sits on one dressed timber lintel, with stone feet, small outward iron lanterns, brass joinery, a moth crest and short clipped hedge wings. It uses 53 voxel boxes and no added lights. There are no freestanding direction signs or raised stepping slabs.

## One plan, one ground

`content/village-gateway.js` exports the same `VILLAGE_GATEWAY` and `atVillageGateway(position)` API as before. Scene picking, the direct-control target, automatic crossing and the arch model read that one plan. No new state-dependent sync or root adapter is needed. The lane and clear forecourt are exposed for future build reservations. `villageGatewayPathDistance(x,z)` and `onVillageGatewayPath(x,z)` share the same frozen centreline.

The continuous spur joins the established visitor lane at `(31.6,15.6)`, bends through `(34.4,17.2)` to `(37.8,17.2)`, then crosses the arch. `world.js` adds its footprint to `yardGround`’s existing path branch: **the same `COL.stone` palette, 0.42m cobble grid, seed 1 and grout**. It is part of the existing terrain, never an overlaid connector. Every purchased-field or meadow terrain rebuild automatically keeps it. The generic ground/grass-mask code is unchanged.

The former pumpkin beside the bend moves to `(35.2,19)`, and the old shop-side lamp moves to `(35.3,14.2)`. Two boundary crowns move rightward to `(43.4,13)` and `(42.8,22)`, clearing the arch rather than disguising an obstruction in navigation data. Existing meadow trimming still replaces those edge trees when bought. The two tracked food-delivery service trees keep their original positions and IDs.

## Expansion and verification

The junction stays fixed as the farm expands south to 18/24 plots and east into the cocoa meadow; it is outside every pumpkin bed and well south of Maisie’s receiving lane. The widest cocoa kiosk remains east of its reserved forecourt. A player-radius sweep reaches the trigger from the approach across all five plot tiers, both truck states, both meadow states and representative cocoa tiers 0/1/3/5.

Focused tests audit actual whole-farm voxel batches: no box taller than 20cm intersects the inner forecourt. Arch geometry has finite positive instances, a clear walking opening, a board mounted at its lintel and a picking target aligned with the crossing zone. The terrain test samples the real ground texture on both original and maximum purchased land and verifies the path uses the exact original cobble colours with zero grass coverage. No saved fields, economy or visitor routes change.

Tests: `farm-village-gateway.test.mjs`, `player-navigation.test.mjs`, `farm-growth.test.mjs`, plus service/world checks in the final root run. Browser screenshots of the actual farm camera remain part of parent verification.
