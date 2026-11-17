# Village atmosphere and story presentation handover

This contractor package continues `4ac1572` on `contractor/village-atmosphere`. It combines handover 75’s district atmosphere, moving water, grounded people and unfinished homes with one usable journal and followed objective. Claude’s lead checkout is untouched. The previous village clarity, cohesion and refinement contracts remain dependencies.

Save version stays **20**. Existing inventories, coins, lifetime earnings, capped rank credit, resource cycles, quest progress, claims, district gates and owned rewards retain their authoritative rules. New room furnishings are scenery, not free inventory or additional cooking transactions. The story documents below are proposals for review, not permission to rewrite progression.

## What changes in play

**A1: district and time palettes.** The Square, Copse, Quarry, Moor, Marsh and Acre blend into the Green over six world units. Fog, ambient light, moon, exposure and grading reuse the existing view objects and eight-light pool. A gentle night/dawn/dusk palette follows a 2,700-second cycle of saved `village.clock`; there are no wall-clock reads or new saved fields. Pause holds that clock. Reduced motion holds temporal changes while walking between districts still changes the spatial palette. Rooms and caves retain their authored lighting. Atlas capture temporarily uses canonical `VILLAGE_GRADE` and the original moon colour, then restores the exact grade object, light colours, fog, exposure and fade state, including nested failures. A captured map therefore has a stable palette rather than whichever district the owner last visited.

**A3: moving water.** The pond, Quarry moat, Marsh pools, well and fountain basins share one view-owned wave clock. Two world-space ripple frequencies perturb surface normals and add a restrained grazing-angle moon sheen through the existing water material. This adds no geometry, texture, reflection target or light. Tick the clock once per outdoor frame; pause and reduced motion hold its phase, and hidden water does not advance during room/cave visits.

**A4: contact with the ground.** One instanced analytic ellipse draw grounds the owner, rendered residents, hall hosts, companion and existing cosmetic visitors: capacity 32, at most 64 triangles, no texture or additional shadow pass. It leaves artwork bob, logical feet, animation, hitboxes and collision untouched. Build-time indexes measure actual low opaque tile, rug, floorboard and stair tops; each actor queries its current spatial cell rather than raycasting or rescanning static instances every frame. The native garden index currently contains 1,817 surfaces in 501 cells. Contacts fade with height, sit just above the visible surface and avoid repeated uploads when stationary. The contact pool owns only its mesh, plane and material; neither it nor an index may dispose the shared voxel cube.

The terrain correction clips ground triangles only beneath the nine opaque stone stair footprints. It removes terrain that visibly cuts through risers, carrying original UVs and smooth normals to clipped edges. All original ground vertices remain byte-identical. The single ground mesh gains 704 boundary vertices and 118 triangles (87,210 → 87,328, **0.14%**); all 14,766 terrain-work boxes remain byte-identical. Logical terrain heights, continuous walking ramps and navigation remain unchanged. Contact sampling includes the actual terrain-work tops, with a bounded allowance for the difference between continuous walking height and visible quantised treads.

**A6: homes worth entering.** Granny’s cottage and the Baron’s velvet manor now use authored interiors through their existing home IDs. Granny has an inglenook, cauldron, kitchen, kettle, recipe book, bed alcove and curtained window; the manor has a marble fireplace, portrait, gallery cabinets, velvet seating and piano. Both retain the original spawn, host and central exit route, with low furniture represented in collision. Fire, candles, steam and motes use existing hall-life batches and pooled lamps.

Granny’s exterior gains recessed windows, curtains, herb boxes, beams, stonework, a detailed door and chimney. Both attic gables are closed beneath the existing sagging roof. The cottage uses 1,432 boxes against the former 1,481, in the existing three batches with no new lights. Its RNG consumption and the surrounding corn, paths, shortcut, steps, pumpkins, watchers and lamps retain their baseline fingerprints. Expansion home doors are moved with their houses exactly once; public consumers then apply `PLAN_SCALE` once. Visible entries, return positions and known-home guidance agree with the actual spread world. Existing home effects, Granny’s first-welcome exception and district access predicates remain in force.

**One journal and followed objective.** A read-only adapter presents all 13 legacy quests, 23 main chapters and 41 cast chapters without merging their engines. The followed task leads; other open stories, long descriptions, rewards, later chapters and completed receipts fold below it. Resident greetings expose one primary story action, with every secondary story available through the journal. Ready handovers are quoted by explicit quest ID before prioritisation, so an earlier blocked delivery cannot hide a later ready one. Current recipients remain discoverable even when somebody else gave the quest.

An explicit legacy Follow now wins an older saved chapter selection. HUD, map and walking route share that ownership. Legacy destinations resolve current resident approaches, saved resource positions, pages, the reading-nook door or farm path. Partial gathering retargets remaining supplies; re-entry and resource-ready events restore routes without replacing manual garden/resident markers. Own-property/string guards reject malformed persisted quest IDs. Opening a page or following a marker cannot accept a quest, teleport, consume supplies or award a receipt. Canonical nearby checks still run at the transaction. Main-chapter completion retains automatic next-main following when another explicit story does not own the tracker.

## Dependency matrix

| Area | Shared files / consumers | Contract to preserve |
|---|---|---|
| Palette and atlas | `content/village-grade.js`, `village-district-atmosphere.js`, `village-view.js`, snapshot helper | Already-spread world zones; saved clock; canonical capture and exact restoration; authored interiors/caves |
| Water | `village-water-material.js`, `village-world.js`, `village-town-square.js`, view | One clock, world-space normals, existing material/render path |
| Contacts and stairs | `village-contact-shadows.js`, view, native/Acre/hall builders, `village-world.js` | Measure tops when built/replaced; bounded per-actor lookup; no logical height changes or shared-geometry disposal |
| Bespoke homes | `village-granny-interior.js`, `village-manor-interior.js`, `village-home-interiors.js` | Local room coordinates; old IDs/spawn/host; visible furniture and collision agree |
| Cottage and entries | `village-granny-exterior.js`, `village-expansion-world.js`, `village-expansion-interiors.js` | Cottage-only geometry change; unchanged surrounding RNG; spread once, scale once; preserve gates |
| Journal and tracking | `village-objectives.js`, `ui/village-journal.js`, chapter/map fragments, `village-game.js` | Both engines remain authoritative; resolve only the selected descriptor during ordinary ticks; catalogue work belongs to menus |
| Transactions and route lifetime | Game/controller tests, existing quest rules, live resident resolver | Explicit handover IDs; canonical reach; once-only settlement; invalidate stale route attempts without taking manual routes |
| Story review | `docs/story/spine.md`, `chapter-index.md`, `tools/village-story-audit.mjs` | Planning inventory only; retain all current IDs, rewards and gates |

## Integration and remaining work

Keep branch ancestry rather than transplanting final adapters alone: `baae44f` water; `91b5d95` Granny interior; `1bde8b5` cottage exterior; `c69152c` manor and both home exports; `b8fddc7` unified objectives; `253bc1c` story inventory; `9229402` atmosphere/contact integration; `e15a17b` gables; `c2e5df3` route/ID repairs; `894a651` stair cut/contact follow-up; `e4f5743` parallel ready handovers; `ccbfcbb` once-spread home entries. The Moor entries remain at the authored eastern plot gates rather than moving to tent/manor wall centres; Granny's resident/steps post stays two design units south of the house anchor. Never spread an exported entry again. `f7f15d3` adds the final TV dialogue contrast correction: an opaque gold gradient wins over TV’s general translucent focus tint, including while hovered, with matching action glyph ink. It changes only the dialogue stylesheet. The frozen final runtime is `f7f15d3`; final verification follows below.

The [Stopped Hour spine](../../story/spine.md) and [77-entry index](../../story/chapter-index.md) map existing material for Claude’s review. The audit identifies five duplicate-title pairs and 37 clues containing every answer token. Those findings are not a passing B9 lint or an approved rewrite. Full B1 still requires migration parity across 46 legacy step boundaries, baselines, claims and already-built homes. Animals, new puzzle families, costumes, businesses, secret rooms and replacement story content remain future work.

## Verification and delivery

The final HTML is **60,582,366 bytes**, SHA-256 `0ebe0c57436becfccd44f87b47bf36e1ab8e01b8edfc58421cf38be4a33ac786`, from frozen runtime `f7f15d3901d0ecd5af96248f6356e252e43c076e`. A second source build is byte-identical. The build has zero warnings; the bespoke-home exports remove the previous missing-export warnings.

The full suite passes **1,370 tests**, with no failures, cancellations or skips. Component checks cover real furniture collision, all seven home entry routes/gates, attic occlusion, shader/atlas restoration, measured contact surfaces, immutable story views, malformed IDs and canonical transaction settlement. The existing compatibility smoke passes **54 checks** on the exact HTML; its drawing hold is disclosed and is separate from the normal-render checks.

Normal SwiftShader rendering passes **15 world assertions on the frozen world/render candidate** and **17 distinct UI/controller assertions across scoped runs**. The world candidate is `ccbfcbb`, HTML SHA-256 `b415649f8ae46d4dc6083a6eb48dec4ccca8241cc3698aace27cc42e3c6305cb`; its scene, simulation and renderer code are identical to the final build. The only later runtime change is the scoped TV dialogue stylesheet described above. Twelve UI assertions passed on that candidate. Seven TV/controller assertions pass on the final exact HTML, including two repeated flow checks; the combined receipt deduplicates by label and records each check’s HTML hash. The final TV run also measures opaque focused/hovered reply surfaces and label/note contrast above 4.5:1. The declared fully unlocked visual fixture covers seven district views, Granny’s exterior, both bespoke rooms, actual-world atlas restoration, water pause and saved-clock palettes. The UI runs cover the followed task, map route ownership, walking after menus, cancelled/confirmed return to the farm, portrait/landscape phone, Fold and actual TV-mode layouts. An injected standard Gamepad API drives the real village Options, D-pad and Cross flow and preserves PS5 glyphs in the final TV screenshots. This checks software input paths, not physical Bluetooth.

Two QA-only selector errors interrupted the first preflights: a nested reward summary made the story summary ambiguous, and a workshop icon shared the generic quest intent attribute. The harness now selects the direct story summary and stable quest choice IDs. The final TV run passes completely after those harness corrections. `world-browser.json` retains the interrupted preflight’s report hash and successful world assertions; `ui-browser.json` records the candidate/final assertions with their separate hashes. Both candidate and final hashes are explicit rather than marking the interrupted preflights wholly passed. There were no observed product page, console or shader errors. The public ZIP includes the inspected before/after and UI previews.

The matching rendering comparison uses the frozen world candidate, before the final dialogue-only CSS correction, and reuses the exact saved fixture, route, settings, seed and clock. This route opens no dialogue. Each traversal has 57 actual drawn frames and 36 stationary samples; first use and warmed traversal remain separate. It accelerates 18 native controller/view steps per draw, so callback CPU includes extra simulation work and must not be read as normal gameplay CPU or hardware FPS.

| Steady sample measure | Previous build | World/render candidate |
|---|---:|---:|
| First-use drawn interval p50 / p95, ms | 1,857.7 / 2,763.3 | 1,871.0 / 2,928.1 |
| Warmed drawn interval p50 / p95, ms | 1,989.9 / 2,889.6 | 1,960.9 / 2,432.6 |
| First-use callback CPU p50 / p95, ms | 94.4 / 183.5 | 101.5 / 245.3 |
| Warmed callback CPU p50 / p95, ms | 111.1 / 193.1 | 94.8 / 223.1 |
| Median draws | 173 | 174 |
| Median triangles | 935,232 | 935,372 |

The added draw is the contact pool; the visible triangle change is 118 ground triangles plus contact quads. Timing tails vary in both directions in software rendering; this is bounded workload evidence, not a speed-up or phone/LG TV performance certification. Full raw passes are kept in `verification/perf-before.json` and `perf-after.json`, with their contract hashes and limitations in `performance-comparison.json`.

Reproduce from `voxel/` with the installed dependencies and Chromium:

```sh
npm test
node build.mjs --out /tmp/Pumpkin-Patch-Mothlight-After-Dark.html
node tools/village-atmosphere-qa.mjs /tmp/Pumpkin-Patch-Mothlight-After-Dark.html /tmp/atmosphere-qa
node tools/village-clarity-perf.mjs /tmp/Pumpkin-Patch-Mothlight-After-Dark.html --fixture docs/contractor-patches/village-atmosphere/verification/perf-before.json --out /tmp/atmosphere-perf.json --source-commit f7f15d3901d0ecd5af96248f6356e252e43c076e --shots no
MOTHLIGHT_EXPECTED_SHA=0ebe0c57436becfccd44f87b47bf36e1ab8e01b8edfc58421cf38be4a33ac786 node tools/mothlight-standard-smoke.mjs /tmp/Pumpkin-Patch-Mothlight-After-Dark.html
node tools/village-story-audit.mjs --out /tmp/story-audit.json --markdown /tmp/chapter-index.md
```

Use `--ui-only` or `--tv-only` for the scoped UI follow-ups. Browser captures use ordinary rendering; the compatibility smoke has its own intentionally held-draw method. No APK is rebuilt in this release. The standalone HTML and ZIP are published under unique **Mothlight After Dark** filenames; previous downloads remain available. Export/import through Settings when moving a farm between file/browser origins. Review this branch as a new draft PR into `voxel-reference`, with the incremental comparison from `4ac1572`; it builds on draft PR #3 and must not be merged blindly over Claude’s work.
