# Mothlight uses the existing public exit

The player reaches Mothlight by continuing along the existing northeast road past Maisie’s food truck. The separate side arch and its yard spur have been removed. A small, grounded, angled **Mothlight** waymark stands beside the road; no structure spans or blocks it. The former `(37.8,15.1)` portal has no travel trigger.

## Shared plan and progression

`villageGateway(state)` returns the current route, approach, trigger, narrow walking corridor and road-continuation bounds. The original-farm endpoint is exactly `ROUTE_OUT.at(-1)`, **(42.5,6.6)**. Once either the kitchen plot or cocoa meadow is purchased, the endpoint is the end of `MEADOW_EXIT`, **(57,6.6)**. The latter also matches Maisie’s existing `TRUCK_EXIT_ROUTE` endpoint. Existing visitor route arrays, timers and purchase behaviour are unchanged.

The approach lies 1.25m before the endpoint on the actual last segment: approximately **(41.358,7.108)** on the original diagonal, or **(55.75,6.6)** on the extended road. `atVillageGateway(position,state)` checks only the final crossing strip. Food-truck hatch and queue positions are outside the expanded trigger, so ordering or gathering nearby never causes travel. `VILLAGE_GATEWAY` remains a default-farm alias for older diagnostics; runtime callers must use the state-aware function.

`farmPlayerGeometry` keeps the existing yard/owned-land bounds. A 1.9m-wide exception follows only the public exit corridor beyond them; it does not unlock the surrounding meadow. That corridor also bypasses the virtual east ownership boundary, while real shop, truck and kiosk bodies still collide. `safeSpot` checks a valid requested road point before clamping, allowing teleport, state restoration and clicked walking to reach the actual exit.

## Terrain and rendering

The existing farm ground and Maisie’s apron recognise the same public-road centreline. Its cobbles use the original `COL.stone` palette, 0.42m grid, seed 1 and grout. Only a narrow continuation beyond existing owned ground is added: original farm **x40→43.3**, kitchen-only **x53.7→57.8**, cocoa meadow **x54→57.8**. It is not a second surface over existing owned terrain, and it never builds a whole unpurchased meadow. The apron’s road strip uses those same light cobbles rather than the apron’s darker yard fill.

`buildVillageGateway(signBoard,state)` reuses one board/hit target and exposes `sync()` for ownership changes. The board faces west/south towards arriving players and sits on a short post beside the road. Scene framing includes the real exit, and calls `sync()` after farm world updates. No point lights are added; there is no giant portal or unrelated side path.

The two authored farm-edge crowns and two meadow crowns beside this route sit behind or beside its sightline, leaving the endpoint and low waymark readable. The wilds reserve a narrow projected view of the final 3.5m of road and its board: foreground hill columns lower and tree crowns are excluded only where they would obscure that window. The floor remains rendered. Only the exact ground continuation joins `wildsFootprint`; the additional visibility window does not remove terrain. Projected tree checks include each scaled crown’s whole bounds, protecting existing service plots as well as the exit.

## Dependencies and checks

| Surface | Must stay aligned |
| --- | --- |
| `content/village-gateway.js` | Existing guest endpoints, owner approach, crossing strip and road-only corridor |
| `main.js` | Pass state to automatic crossing and read the current clicked approach |
| `player-control.js` | State-aware target, narrow boundary exception and unclamped valid safe spot |
| `scene.js` / `farm-village-gate.js` | State-aware marker sync and exit framing |
| `world.js` / `cooking-world.js` | Same existing road palette, coverage and purchased-ground edges |
| `wilds.js` / `festival-meadow-world.js` | Clear projected exit sightline; only actual built terrain belongs to ground footprint |

Four focused tests cover actual route identity, 80 land/service combinations, exact terrain texture colours, marker reuse and real controller teleport/clicked walks from the farm to both endpoints. Existing player-navigation, farm-growth, cooking and meadow tests form the broader regression set. Browser QA tests actual walking, pointer selection, food service and return travel against the final HTML. No saved fields or format changes are required.

The wilds regression additionally inspects the actual generated hill and tree meshes on the base, kitchen-only and meadow layouts, checks that their projected bounds leave the exit visible, and verifies retained forest floor south of the continuation. The authored tree poses keep their counts and the service-tree source identity used to remove Maisie’s two original trees.
