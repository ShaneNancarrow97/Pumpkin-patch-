# Mothlight Village — proposed building footprint

**Concept greybox specification, not implemented gameplay.** The JSON, generated SVG and tables define this proposed greybox. They take precedence over positions, labels and dimensions inferred from generated art; Claude should still validate the proposal before implementing it. North is +z; east is +x. Realm bounds: x=0–120, z=0–96 world units. Origins and dimensions are proposed for Claude to validate against owner scale and camera before implementation. Doors remain level and reachable by Natalie’s wheelchair.

## Spatial arrangement

Hollow Green fills the southern band z0–36, except the Moor’s eastern inset x84–120/z12–36. Moonroot Copse occupies the west x0–40/z36–96. Lantern Quarry occupies the centre x40–84/z36–74. Carnival Moor occupies x84–120/z12–74. Mirror Marsh occupies x40–120/z74–96. These are planning envelopes, not rectangular collision barriers; author hedges, riverbanks and terrain around the actual path graph.

The eight resident plots below reserve the full eventual building/garden envelope, not only first-tier walls. Keep a 1-unit minimum nonbuilding gap beside 6-unit roads; main-square and doorway aprons widen that where necessary. Interiors load separately. Tree crowns may overhang the visual boundary but trunks, roofs, fences and colliders may not invade the paths.

## Plot rectangles

| ID | Occupant | x min–max | z min–max | Size | Door (x,z) | Faces | Gate |
|---|---|---|---|---|---|---|---|
| 01 | Elowen | 28–48 | 10–30 | 20×20 | (48, 20) | E | Hollow Green / 6 |
| 02 | Rowan | 66–82 | 8–28 | 16×20 | (66, 20) | W | Hollow Green / 6 |
| 03 | Mabel | 6–24 | 40–56 | 18×16 | (24, 48) | E | Moonroot Copse / 9 |
| 04 | Tansy | 6–24 | 60–78 | 18×18 | (24, 68) | E | Moonroot Copse / 9 |
| 05 | Opal | 40–52 | 44–64 | 12×20 | (52, 54) | E | Lantern Quarry / 12 |
| 06 | Cinder | 66–82 | 42–62 | 16×20 | (66, 50) | W | Lantern Quarry / 12 |
| 07 | Corvus | 90–104 | 32–52 | 14×20 | (104, 42) | E | Carnival Moor / 15 |
| 08 | Baron | 90–104 | 56–72 | 14×16 | (104, 64) | E | Carnival Moor / 15 |
| 09 | Observatory | 76–94 | 82–94 | 18×12 | (85, 82) | S | Mirror Marsh / 18 |
| R1 | Future home | 4–22 | 8–26 | 18×18 | (22, 17) | E | Hollow Green / 6 |
| R2 | Future home | 4–22 | 80–92 | 18×12 | (22, 86) | E | Moonroot Copse / 9 |

R1/R2 are empty future-home reservations, not additional launch residents. 09 is a story/festival observatory, not a ninth resident. Keep Corvus’s living wagon inside 07; Cinder’s upstairs flat inside 06. Baron’s manor is distinct from the farm’s Hollow House attraction.

## Main circulation

All following roads have 6-unit unobstructed width, with gentle/level grades. Coordinates are centre-lines; reserve a 3-unit half width. Widen Hollow Green’s plaza to x50–64/z18–30.

| Route | Centre-line (x,z) |
|---|---|
| Arrival | (58, 0) → (58, 4) → (58, 24) |
| Green to Copse | (58, 24) → (58, 34) → (30, 34) → (30, 78) |
| Quarry | (58, 34) → (58, 70) |
| Moor | (58, 34) → (86, 34) → (86, 24) → (108, 24) → (108, 70) |
| Late Marsh loop | (58, 70) → (58, 78) → (108, 78) → (108, 70) |

**Arrival:** carriage turnaround near (58,4), return trigger at (58,0), initial player spawn (58,10), facing north. Trigger/arrival volumes must not overlap. This carriage gate is a new farm-side connection; never replace the central homestead arch, attraction doors or NPC exits. Noticeboard sits at (62,28) on the plaza shoulder, not on its through-route.

**Door spurs:** 4-unit-wide level approaches connect 01:(48,20)→(58,20); 02:(66,20)→(58,20); 03:(24,48)→(30,48); 04:(24,68)→(30,68); 05:(52,54)→(58,54); 06:(66,50)→(58,50); 07:(104,42)→(108,42); 08:(104,64)→(108,64); 09:(85,82)→(85,78). End each spur at the door threshold; don’t paint a road through the plot. Reserve an apron in each plot and require a ≥2-unit clear portal (subject to sprite/collider validation). R1 future spur:(22,17)→(25,17)→(25,34)→(30,34), width3. R2:(22,86)→(30,86)→(30,78), width3. Activate these only when plots are used.

## Gates, bridge and streaming

- Level6: arrival, plaza, 01/02, the southern gathering belt. Close branch road portals with authored scenery rather than invisible walls. Green remains a complete usable first slice.
- Level9 + first chapter: gate on the Copse road at (30,38); 03/04 become reachable.
- Level12 + repaired bridge: one 6-unit bridge crosses a narrow ravine at x55–61/z36–40; gate at (58,38). Ravine is limited to quarry approach x40–84; do not place it across the Copse road. Opal/Cinder become reachable without access to the Moor.
- Level15 + restaurant opening: gate on the Moor branch at (84,34). The dogleg at x86/z24 keeps the main road out of Cinder’s and Corvus’s plots.
- Level18 + four district stories: Marsh gates at (58,74) and (108,74). Both must share unlock state, so the loop cannot bypass a locked district. Observatory porch faces south onto the Marsh crossroad.
- Earlier groups can return by their approach; no mandatory access to a later district is required for egress. Render/stream active district plus boundary silhouettes; simulation identity and purse persist through travel.

## Fixed gathering sockets

Each coordinate below is a small nonblocking node centre with proposed radius≤0.65 units. These 42 sockets are outside all plot rectangles and every path reserve, including optional future spurs. Model state changes inside each socket; no random spawn into paths or future home plots. Use roadmap rates/yields/caps.

| Resource | Proposed (x,z) sockets |
|---|---|
| logs | (6, 30); (10, 30); (14, 30); (18, 30); (22, 30); (6, 34); (10, 34); (14, 34) |
| stone | (6, 2); (10, 2); (14, 2); (18, 2); (22, 2); (6, 6) |
| fibre | (10, 6); (14, 6); (18, 6); (22, 6); (18, 34); (22, 34) |
| herbs | (36, 4); (40, 4); (44, 4); (48, 4) |
| hardwood | (4, 38); (8, 38); (12, 38); (16, 38) |
| moth silk | (4, 58); (8, 58) |
| iron | (42, 40); (46, 40); (50, 40) |
| clay | (70, 68); (74, 68); (78, 68) |
| moonstone | (114, 34); (114, 38) |
| emberbloom | (114, 50); (114, 54); (114, 58) |
| star amber | (112, 90) |

## Sanity check

Numerical rectangle/centre-line check: 11 disjoint plot envelopes, 42 resource sockets; no plot/plot overlap, no main-road/plot overlap, and no radius0.65 socket overlap with either plots or main-road reserves. This checks the proposed axis-aligned envelopes only. It does not replace navmesh/collider checks, door turning circles, upgrade rotations, camera occlusion, full-roof clearance, slope validation or runtime mobile performance.


## Measured companion files

- [plots.json](plots.json): complete coordinate source, including paths, door widths, district gates and all 42 node sockets.
- [measured-footprint.svg](measured-footprint.svg): a scalable orthographic drawing generated directly from those coordinates.
- [generate-footprint.py](generate-footprint.py): standard-library-only generator and geometry/connectivity checks. Run `python3 generate-footprint.py` from any directory; it reads the adjacent JSON, validates it and regenerates the adjacent SVG.

Plot 05 is **Opal’s stoneworking studio**, following the stone-building concept in board 05. Any glass-roof/conservatory suggestion in the generated map is illustrative drift; Elowen owns the conservatory on plot 01. Plot 06 is Cinder’s restaurant and upstairs flat.

The generator checks every main road’s one-unit separation from all plot envelopes, every door spur against other plots, all 42 node circles against every path and plot (including both reservations), doors on their declared boundary, and network reachability with gates closed/opened at levels 6/9/12/15/18. It also checks that both Marsh gates use identical unlock state. Reservations’ future spurs intentionally reach their own threshold; they are not active roads drawn through an unused build plot.

These checks are drafting checks, not navmesh or gameplay tests. Art is not a collider, and numerical path connectivity does not establish furniture clearance, wheelchair turning circles, terrain grades, roof visibility, district streaming performance or final camera coverage. Public sales, quest receipts and travel remain connected to the existing simulation; this pack introduces no alternate economy or save namespace.
