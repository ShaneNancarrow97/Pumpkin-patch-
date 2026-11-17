# Village resource layout and living Blackroot

Hollow Green now supports exploring around the neighbours and across the northern lawns. Ordinary resources are no longer concentrated solely in the four arrival clearings, and Blackroot visibly regrows after being rooted out.

## Space and distribution

The Green's northern navigation edge moves from design `z=36` to `z=50` (world `54` to `75`). This removes the invisible stop immediately beyond Rowan and Elowen. The first closed gate is still at design `z=52`; the Copse, Quarry, Moor and Marsh remain locked. Existing house bodies, fences, terrace furniture, water and the map's other boundaries stay solid.

There are **56 ordinary Green resource sockets**, up from 32. The original 32 IDs, materials and authored first positions are unchanged. Twenty-four additional sockets supply logs, stone, fibre and herbs across:

- Elowen's side garden: four mixed resource piles.
- Rowan's side garden: four mixed resource piles.
- Western and eastern northern lawns: twelve mixed resource piles.
- Western village lawn and the tavern verge: four mixed resource piles.

Every new socket has multiple deterministic regrowth sites within its local area. The authored flowerbeds, vegetable rows and garden tree trunks are excluded from candidate generation. Roads and real collision geometry remain excluded. Candidate pools remain disjoint, so different resource types cannot stack when their independent saved cycles advance.

The four existing `FORAGE_AREAS` remain intact. New `RESOURCE_AREAS` describe the mixed residential/lawn pools rather than assigning whole corners to a single material. Material yields, cooldowns, satchel limits and upgrades are unchanged; Blackroot does not consume an ordinary resource's socket.

## Thirty-two fungal patches

The Green now has **32 fixed Blackroot sockets**, up from eight, distributed through the residential gardens, forecourt, side lawns and north lawns. The first eight IDs and positions remain unchanged. Each patch has a deterministic scale between 0.72 and 1.05. The four authored future-district patches remain hidden behind the existing locks.

The level-3/5/8 story, rewards and fresh-clear requirements are unchanged: the three chapters need 3, then 3, then 2 fresh clears. There are ample mature patches on arrival. Regrowth never grants a sample, coin, clear count or quest progress by itself.

## Pure growth API

`nodeGrowthInfo(state, id)` is exported through `model.js` by the existing village rules export. It is read-only and returns:

```js
{ id, stage, ratio, remaining, total, mature, visible,
  suppressed, available, cycle, scale }
```

An unknown ID returns `null`. `ratio` is `clamp(1 - remaining / total)`, derived from the existing saved node cooldown and effective material respawn time. No second clock or growth state is saved.

| Growth | Ratio | Default Blackroot elapsed time |
| --- | --- | --- |
| Bare | below 0.10 | 0–60 seconds |
| Spores | 0.10–0.35 | 60–210 seconds |
| Shoots | 0.35–0.65 | 210–390 seconds |
| Young | 0.65 to before maturity | 390–600 seconds |
| Mature | cooldown has reached zero | 600 seconds onward |

`visible` means that the district is open and no placed decoration covers the current site. `available` additionally requires maturity, matching `nodeReady`. Immature growth remains visible but cannot be picked or rooted out. Ordinary gathered piles report only bare/mature, leaving no intermediate stump or debris. Pause, existing gathering upgrades and the saved cooldown continue to use the normal village clock.

Root-out still succeeds with a full sample store, giving no extra sample and consuming exactly one clear/cooldown cycle. Ordinary full stores retain their existing behaviour and leave their piles in place.

## Saved games

Save version remains **18**. New node IDs initialise through the existing `nodes` and `gatherCycles` maps; every fresh socket starts mature. Existing samples, quests, claims, node timers and cycle counts round-trip unchanged.

Older placed furniture keeps its exact position during save restore and decorating Undo, including where an expanded resource's authored or potential site overlaps it. Every covered resource is suppressed until that piece moves; no sample, clear or cycle is consumed. New placements still reserve the resource sites. This also protects old layouts if an expanded candidate pool selects a different future location for an ordinary resource.

## Dependency matrix

| Source | Depends on | Preserve when integrating |
| --- | --- | --- |
| `content/village.js` Green polygon | Navigation derives its limits from this polygon | Northern lawn stops before locked gates; do not widen future district access |
| `content/village-resource-layout.js`, `village-node-sites.js` | Canonical nodes, real walk collisions, roads and garden exclusions | Stable old first sites; disjoint local regrowth pools; no road/door/crop overlap |
| `content/village-blight.js` | Fixed IDs, existing story definitions | First eight sockets and all level/reward requirements |
| `rules/village.js` | Saved cooldown/cycle maps and placed furniture | Mature-only transactions, full-store exception only for blight, no new save fields |
| Resource rendering and village scenery | `nodeGrowthInfo`, expanded Green boundary and canonical node sites | Visible immature stages, hidden covered sites, lightweight cached geometry; north lawns clear of the old dense woods strip |
| Guidance and picking | `nodeReady` | Find/root-out targets only mature available patches, never decorative young growth |

## Verification

```sh
node --test --test-isolation=none test/village-resource-growth.test.mjs test/village-blight.test.mjs test/village-navigation.test.mjs test/village-node-sites.test.mjs test/village-resource-cycles.test.mjs test/village-map.test.mjs test/village.test.mjs
```

The focused run passes **58 named checks**. Coverage includes real movement from both neighbours' doors to the northern lawns, all authored/regrowth sites reachable from arrival, unchanged closed gates and physical obstacles, mixed resource distribution, every growth stage, maturity-only transactions, version-18 reload/pause and legacy furniture suppression. A source comparison confirms all 32 old ordinary authored sockets are unchanged. Exact HTML, screenshots and final performance checks belong to the integration pass.
