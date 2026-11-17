# A clearer farm service corner

The top-right food-truck patio now separates ordering, dining and passing through. Skyla’s shop, Maisie’s truck and hatch, deliveries, ownership bounds and the existing village exit all keep their established positions.

## Before and after

| Area | Previous arrangement | New arrangement |
| --- | --- | --- |
| Public road | Takeaway guests queued directly along z6.6, sharing the village/guest exit | All eight waiting places sit on the purchased apron at z5.3, north of the public road |
| Queue approach | First waiting place directly south of the hatch | First place starts 1.45m east of the hatch, with the same 0.65m spacing; the hatch remains (42.75,5.15) |
| Dining | Two 1.8m tables centred at x48.9/51.5, leaving a 0.8m gap | Two 1.6m tables centred at x49.2/52.2, leaving a 1.4m aisle |
| Patio lighting | Tall support pole and overhead string across the seating silhouette | Two low table lanterns, using the existing light-pool positions; no added lights |
| Planting | Planters beside the service frontage at z5.0 | Low planters on the back perimeter at z1.15, leaving the serving apron open |
| Truck supplies | Two produce crates, one protruding toward customers | One crate tucked on the receiving side; the detailed truck, barrel and chalk menu remain |
| Diners leaving | Reversed most of their arrival, nearly reaching Skyla before a diagonal exit | Seat → its aisle → public road → the existing eastern exit at (57,6.6) |

With no visible delivery cart or actor models, the purchased cooking build uses **349 voxel boxes instead of 396**, with the same two light-pool positions and no added point lights.

The patio still has four seats and the same reservation IDs (`a-left`, `a-right`, `b-left`, `b-right`). Its furniture, benches and guest positions now derive from `DINING_TABLES`; routes use each table’s authored aisle. The benches remain aligned with the sitting sprites. The raised dressing stays north of z5.5, clear of the public road.

## Dependencies

| Source | Responsibility |
| --- | --- |
| `content/cooking-dining.js` | Shared table geometry, stable seat IDs, arrival and direct eastern departure routes |
| `content/cooking-visits.js` | Dedicated queue strip and the actual visible queue/hatch poses |
| `content/cooking-layout.js` | Existing site bounds and perimeter planter locations |
| `cooking-world.js` | Meshes, low lanterns, planters and guest models reading those shared plans |
| `content/farm-walks.js` | Already derives dining walks from the shared routes; no adapter change needed |
| `world.js` | Loose Skyla dressing beside the public road; preserves the shop body and original route coordinates |

No prices, service/eating timers, upgrade levels, inventory, currency, capacity or save fields change. Walking distances reflect the corrected layout, so departing diners no longer linger on an unrelated trip back towards the shop. Payment still belongs to the existing once-only visitor pipeline. The original and expanded village endpoints remain unchanged.

## Skyla’s public-road clearance

The later request about objects still on the path was traced to Skyla’s actual east-front dressing, rather than the food-truck patio. The cask and chalkboard stood directly on the bend from (35,10.6) to (38,8.6), while the produce crate and spare bale crowded its edge.

| Object | Previous location | Cleared arrangement |
| --- | --- | --- |
| East produce crate | (37.2,8.0) | (37.1,5.6), against the shop’s east wall |
| Cask | (37.3,9.2) | (37.1,4.1), beside that wall and west of the delivery corridor |
| Spare east bale | (37.1,10.4) | Removed; the building’s detailed stock/display art remains |
| Chalkboard | (36.2,10.26) | (26.4,7.4), beside the west frontage, clear of the counter and lantern walk |
| Banner mast | Separate floor pole at (38,7.2) | Banner bracket uses the existing awning post at (36.325,8.25) |

The shop body, counter, wall lanterns, jars, display pumpkins and branded banner remain. No route or collision boundary moves. Moving the loose stock off the road also leaves the food-delivery cart’s existing swept bounds clear. An actual whole-farm voxel scan checks the full incoming route and eastbound exit, rather than checking only the relocated centres.

The road check excludes the ground and structures wholly above walking headroom, then verifies a **1.8m-wide clear strip** against every raised box along `ROUTE_IN` and `ROUTE_OUT`. Fixed building posts and displays remain just outside that usable strip. This covers both the counter approach and the previously obstructed Skyla-to-Maisie bend.

## Verification

The new `test/farm-corner-layout.test.mjs` checks actual generated furniture boxes, bench support for all four seated guest poses, a usable gap between islands, low furniture height, full sampled dining routes against the truck and swept delivery corridor, direct eastern departures, all eight real queue/serving poses, planting outside the service frontage, and the full real farm road beside Skyla while retaining her detailed shop/counter.

All **44 focused checks passed** across:

```sh
node --test test/farm-corner-layout.test.mjs test/cooking-world.test.mjs \
  test/truck-visits.test.mjs test/hospitality-integration.test.mjs \
  test/player-navigation.test.mjs test/farm-village-gateway.test.mjs \
  test/wilds.test.mjs test/farm-growth.test.mjs
```

The parent delivery performs final normal-renderer corner screenshots alongside the village UI verification. These Node checks do not certify visual appearance or device performance on their own.
