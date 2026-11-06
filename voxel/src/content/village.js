// Mothlight Village (Codex's plan: docs/plans/mothlight-village/ROADMAP.md and
// concept-art/FOOTPRINT.md; built in handover 73). The realm's measured layout,
// its districts, materials and the square's fixtures, as data. rules/village.js
// runs it, village-world.js builds it. Realm coordinates: x east, z north, in
// world units from the south-west corner; the realm is its own place, apart
// from the farm's map. The village's people are in content/village-folk.js,
// its quests in content/village-quests.js and its decor in content/village-decor.js.
// Elowen brings the invitation at level 3 (it was 6 in the plan), and each
// later district opens three levels on.
export const VILLAGE_LEVEL = 3;
// The village is drawn on a design grid and built at PLAN_SCALE world units to
// each grid unit, so the owners (2.3 units tall) find its doors, benches and lamps
// their own size and the realm feels big. Everything exported here is in world units.
export const PLAN_SCALE = 1.5;
const S = (v) => Math.round(v * PLAN_SCALE * 1000) / 1000, at = ([x, z]) => [S(x), S(z)];
const box = (b) => ({ ...b, x0: S(b.x0), z0: S(b.z0), x1: S(b.x1), z1: S(b.z1) });
// Each district sits away from the Green across its own stretch of woods (design grid):
// the Copse to the north-west, the Quarry's island north, the Moor east, the Marsh beyond the Quarry.
export const DISTRICT_SHIFT = Object.freeze({ green: [0, 0], copse: [-30, 14], quarry: [0, 20], moor: [44, 4], marsh: [0, 34] });
const sh = (d, [x, z]) => [x + DISTRICT_SHIFT[d][0], z + DISTRICT_SHIFT[d][1]];
const shBox = (d, b) => ({ ...b, x0: b.x0 + DISTRICT_SHIFT[d][0], x1: b.x1 + DISTRICT_SHIFT[d][0], z0: b.z0 + DISTRICT_SHIFT[d][1], z1: b.z1 + DISTRICT_SHIFT[d][1] });
export const VILLAGE_BOUNDS = Object.freeze({ x0: S(-34), z0: 0, x1: S(168), z1: S(134) });
// Each district opens at a patch level and, after the Green, a story beat (STORY_FLAGS).
export const DISTRICTS = Object.freeze([
  { id: "green", name: "Hollow Green", level: 3, story: null, polygon: [[0, 0], [120, 0], [120, 36], [0, 36]] },
  { id: "copse", name: "Moonroot Copse", level: 6, story: "two-doorbells", polygon: [[0, 36], [40, 36], [40, 96], [0, 96]] },
  { id: "quarry", name: "Lantern Quarry", level: 9, story: "footbridge", polygon: [[40, 36], [84, 36], [84, 74], [40, 74]] },
  { id: "moor", name: "Carnival Moor", level: 12, story: "restaurant-opening", polygon: [[84, 12], [120, 12], [120, 74], [84, 74]] },
  { id: "marsh", name: "Mirror Marsh", level: 15, story: "four-stories", polygon: [[40, 74], [120, 74], [120, 96], [40, 96]] },
].map((d) => Object.freeze({ ...d, polygon: d.id === "green" ? d.polygon.map(at) : d.polygon.map((p) => at(sh(d.id, p))) })));
export const DISTRICT_BY_ID = Object.freeze(Object.fromEntries(DISTRICTS.map((d) => [d.id, d])));
// What the village is built from (roadmap §5): yield per node, and seconds of active play before a node grows back.
export const MATERIALS = Object.freeze([
  { id: "logs", name: "Softwood logs", district: "green", yield: 2, respawn: 180 },
  { id: "stone", name: "Stone", district: "green", yield: 2, respawn: 240 },
  { id: "fibre", name: "Fibre", district: "green", yield: 1, respawn: 180 },
  { id: "herbs", name: "Herbs", district: "green", yield: 1, respawn: 180 },
  { id: "hardwood", name: "Hardwood", district: "copse", yield: 2, respawn: 480 },
  { id: "moth-silk", name: "Moth silk", district: "copse", yield: 1, respawn: 300 },
  { id: "iron", name: "Iron", district: "quarry", yield: 1, respawn: 360 },
  { id: "clay", name: "Clay", district: "quarry", yield: 2, respawn: 300 },
  { id: "moonstone", name: "Moonstone", district: "moor", yield: 1, respawn: 600 },
  { id: "emberbloom", name: "Emberbloom", district: "moor", yield: 1, respawn: 420 },
  { id: "star-amber", name: "Star amber", district: "marsh", yield: 1, respawn: 900 },
].map(Object.freeze));
export const MATERIAL_BY_ID = Object.freeze(Object.fromEntries(MATERIALS.map((m) => [m.id, m])));
// The 42 authored gathering sockets: each grows one pile at a time, never on a road, a plot or a doorway.
export const NODES = Object.freeze([
  { id: "logs-01", material: "logs", x: 6, z: 30, district: "green" },
  { id: "logs-02", material: "logs", x: 10, z: 30, district: "green" },
  { id: "logs-03", material: "logs", x: 14, z: 30, district: "green" },
  { id: "logs-04", material: "logs", x: 18, z: 30, district: "green" },
  { id: "logs-05", material: "logs", x: 22, z: 30, district: "green" },
  { id: "logs-06", material: "logs", x: 6, z: 34, district: "green" },
  { id: "logs-07", material: "logs", x: 10, z: 34, district: "green" },
  { id: "logs-08", material: "logs", x: 14, z: 34, district: "green" },
  { id: "stone-01", material: "stone", x: 6, z: 2, district: "green" },
  { id: "stone-02", material: "stone", x: 10, z: 2, district: "green" },
  { id: "stone-03", material: "stone", x: 14, z: 2, district: "green" },
  { id: "stone-04", material: "stone", x: 18, z: 2, district: "green" },
  { id: "stone-05", material: "stone", x: 22, z: 2, district: "green" },
  { id: "stone-06", material: "stone", x: 6, z: 6, district: "green" },
  { id: "fibre-01", material: "fibre", x: 10, z: 6, district: "green" },
  { id: "fibre-02", material: "fibre", x: 14, z: 6, district: "green" },
  { id: "fibre-03", material: "fibre", x: 18, z: 6, district: "green" },
  { id: "fibre-04", material: "fibre", x: 22, z: 6, district: "green" },
  { id: "fibre-05", material: "fibre", x: 18, z: 34, district: "green" },
  { id: "fibre-06", material: "fibre", x: 22, z: 34, district: "green" },
  { id: "herbs-01", material: "herbs", x: 36, z: 4, district: "green" },
  { id: "herbs-02", material: "herbs", x: 40, z: 4, district: "green" },
  { id: "herbs-03", material: "herbs", x: 44, z: 4, district: "green" },
  { id: "herbs-04", material: "herbs", x: 48, z: 4, district: "green" },
  { id: "hardwood-01", material: "hardwood", x: 4, z: 38, district: "copse" },
  { id: "hardwood-02", material: "hardwood", x: 8, z: 38, district: "copse" },
  { id: "hardwood-03", material: "hardwood", x: 12, z: 38, district: "copse" },
  { id: "hardwood-04", material: "hardwood", x: 16, z: 38, district: "copse" },
  { id: "moth_silk-01", material: "moth-silk", x: 4, z: 58, district: "copse" },
  { id: "moth_silk-02", material: "moth-silk", x: 8, z: 58, district: "copse" },
  { id: "iron-01", material: "iron", x: 46, z: 46, district: "quarry" },
  { id: "iron-02", material: "iron", x: 49.5, z: 46, district: "quarry" },
  { id: "iron-03", material: "iron", x: 53, z: 46, district: "quarry" },
  { id: "clay-01", material: "clay", x: 70, z: 68, district: "quarry" },
  { id: "clay-02", material: "clay", x: 74, z: 68, district: "quarry" },
  { id: "clay-03", material: "clay", x: 78, z: 68, district: "quarry" },
  { id: "moonstone-01", material: "moonstone", x: 114, z: 34, district: "moor" },
  { id: "moonstone-02", material: "moonstone", x: 114, z: 38, district: "moor" },
  { id: "emberbloom-01", material: "emberbloom", x: 114, z: 50, district: "moor" },
  { id: "emberbloom-02", material: "emberbloom", x: 114, z: 54, district: "moor" },
  { id: "emberbloom-03", material: "emberbloom", x: 114, z: 58, district: "moor" },
  { id: "star_amber-01", material: "star-amber", x: 112, z: 90, district: "marsh" },
].map((n) => { const [x, z] = sh(n.district, [n.x, n.z]); return Object.freeze({ ...n, x: S(x), z: S(z) }); }));
export const NODE_BY_ID = Object.freeze(Object.fromEntries(NODES.map((n) => [n.id, n])));
// Building plots: the full eventual home-and-garden reserve, with a level doorway on its spur road.
export const PLOTS = Object.freeze([
  { id: "01", kind: "resident", resident: "elowen", building: "Conservatory library", x0: 28, z0: 10, x1: 48, z1: 30, door: [48, 20], facing: "east", district: "green" },
  { id: "02", kind: "resident", resident: "rowan", building: "Workshop cottage", x0: 66, z0: 8, x1: 82, z1: 28, door: [66, 20], facing: "west", district: "green" },
  { id: "03", kind: "resident", resident: "mabel", building: "Haberdashery cottage", x0: 6, z0: 40, x1: 24, z1: 56, door: [24, 48], facing: "east", district: "copse" },
  { id: "04", kind: "resident", resident: "tansy", building: "Herb cottage and garden", x0: 6, z0: 60, x1: 24, z1: 78, door: [24, 68], facing: "east", district: "copse" },
  { id: "05", kind: "resident", resident: "opal", building: "Stoneworking studio", x0: 40, z0: 44, x1: 52, z1: 64, door: [52, 54], facing: "east", district: "quarry" },
  { id: "06", kind: "resident", resident: "cinder", building: "Restaurant and upstairs flat", x0: 66, z0: 42, x1: 82, z1: 62, door: [66, 50], facing: "west", district: "quarry" },
  { id: "07", kind: "resident", resident: "corvus", building: "Tent home and living wagon", x0: 90, z0: 32, x1: 104, z1: 52, door: [104, 42], facing: "east", district: "moor" },
  { id: "08", kind: "resident", resident: "baron", building: "Velvet manor", x0: 90, z0: 56, x1: 104, z1: 72, door: [104, 64], facing: "east", district: "moor" },
  { id: "09", kind: "landmark", resident: null, building: "Story and festival ruin", x0: 76, z0: 82, x1: 94, z1: 94, door: [85, 82], facing: "south", district: "marsh" },
  { id: "R1", kind: "reservation", resident: null, building: "Empty reservation", x0: 4, z0: 8, x1: 22, z1: 26, door: [22, 17], facing: "east", district: "green" },
  { id: "R2", kind: "reservation", resident: null, building: "Empty reservation", x0: 4, z0: 80, x1: 22, z1: 92, door: [22, 86], facing: "east", district: "copse" },
].map((p) => Object.freeze({ ...box(shBox(p.district, p)), door: at(sh(p.district, p.door)) })));
export const PLOT_BY_ID = Object.freeze(Object.fromEntries(PLOTS.map((p) => [p.id, p])));
// Roads by their centre-lines: main roads six units wide, door spurs four, future spurs three (used once their plot is).
export const ROADS = Object.freeze([
  { id: "arrival", kind: "main", width: 6, points: [[58, 0], [58, 4], [58, 24]], plot: null },
  { id: "copse", kind: "main", width: 6, points: [[58, 24], [58, 34], [0, 34], [0, 92]], plot: null },
  { id: "quarry", kind: "main", width: 6, points: [[58, 34], [58, 90]], plot: null },
  { id: "moor", kind: "main", width: 6, points: [[58, 34], [130, 34], [130, 28], [152, 28], [152, 74]], plot: null },
  { id: "marsh", kind: "main", width: 6, points: [[58, 90], [58, 112], [152, 112], [152, 74]], plot: null },
  { id: "door-01", kind: "door-spur", width: 4, points: [[48, 20], [58, 20]], plot: "01" },
  { id: "door-02", kind: "door-spur", width: 4, points: [[66, 20], [58, 20]], plot: "02" },
  { id: "door-03", kind: "door-spur", width: 4, points: [[-6, 62], [0, 62]], plot: "03" },
  { id: "door-04", kind: "door-spur", width: 4, points: [[-6, 82], [0, 82]], plot: "04" },
  { id: "door-05", kind: "door-spur", width: 4, points: [[52, 74], [58, 74]], plot: "05" },
  { id: "door-06", kind: "door-spur", width: 4, points: [[66, 70], [58, 70]], plot: "06" },
  { id: "door-07", kind: "door-spur", width: 4, points: [[148, 46], [152, 46]], plot: "07" },
  { id: "door-08", kind: "door-spur", width: 4, points: [[148, 68], [152, 68]], plot: "08" },
  { id: "door-09", kind: "door-spur", width: 4, points: [[85, 116], [85, 112]], plot: "09" },
  { id: "door-R1", kind: "future-spur", width: 3, points: [[22, 17], [25, 17], [25, 34], [30, 34]], plot: "R1" },
  { id: "door-R2", kind: "future-spur", width: 3, points: [[-8, 100], [0, 100], [0, 92]], plot: "R2" },
].map((r) => Object.freeze({ ...r, width: S(r.width), points: r.points.map(at) })));
export const PLAZA = Object.freeze(box({ x0: 50, z0: 18, x1: 64, z1: 30 }));
// Gates on the roads between districts; both Marsh gates share one unlock, so the loop can't bypass it.
export const GATES = Object.freeze([
  { id: "copse-gate", x: 0, z: 52, district: "copse" },
  { id: "quarry-bridge", x: 58, z: 58, district: "quarry" },
  { id: "moor-gate", x: 124, z: 34, district: "moor" },
  { id: "marsh-west", x: 58, z: 106, district: "marsh" },
  { id: "marsh-east", x: 152, z: 106, district: "marsh" },
].map((g) => Object.freeze({ ...g, x: S(g.x), z: S(g.z) })));
export const BRIDGE = Object.freeze({ ...box(shBox("quarry", { x0: 55, z0: 37, x1: 61, z1: 43 })), ravine: Object.freeze(box(shBox("quarry", { x0: 39, z0: 37, x1: 87, z1: 43 }))) });
// The carriage stop: where the carriage turns, the step back to the farm, where you arrive (facing north) and the noticeboard.
export const ARRIVAL = Object.freeze({ carriage: at([58, -4.4]), back: at([58, -1.4]), spawn: at([58, 3]), noticeboard: at([63, 28.8]) });

// The eight residents (roadmap §4): each has a home plot, ten bond ranks and five
// chapters, opening at CHAPTER_RANKS. Original characters; the Baron is the farm's
// own big spender, settled here as a resident.
export const RESIDENTS = Object.freeze([
  { id: "elowen", name: "Elowen Mothwick", role: "Moth witch, archivist and bookbinder", plot: "01", district: "green", chapters: ["A Letter That Will Not Stay Still", "A Room for Quiet Wings", "The Constellation Between Pages", "The Page She Kept", "An Invitation Accepted"] },
  { id: "rowan", name: "Rowan Rattlewood", role: "Scarecrow carpenter", plot: "02", district: "green", chapters: ["Loose Boards", "A Door of His Own", "The Bridge With Too Many Pieces", "Made to Last", "The Housewarming He Forgot"] },
  { id: "mabel", name: "Mabel Moonstitch", role: "Haunted doll tailor", plot: "03", district: "copse", chapters: ["A Loose Thread", "Somewhere to Hang a Coat", "Pattern of a Promise", "Dressed for the Midway", "Every Stitch a Story"] },
  { id: "tansy", name: "Tansy Thistledown", role: "Hedge gardener", plot: "04", district: "copse", chapters: ["The Useful Weeds", "A Path Through the Brambles", "What the Moths Remember", "A Basket for Everyone", "The Garden Party"] },
  { id: "opal", name: "Opal Graves", role: "Vampire stonemason", plot: "05", district: "quarry", chapters: ["The Stone That Rang", "Light Through Old Windows", "Weight of a Name", "Beautifully Unfinished", "A Window for the Moon"] },
  { id: "cinder", name: "Chef Cinder", role: "Ghost restaurateur", plot: "06", district: "quarry", chapters: ["A Table for Nobody", "Open at Last", "The Missing Course", "Too Many Pans", "Supper After Midnight"] },
  { id: "corvus", name: "Ringmaster Corvus", role: "Raven showman", plot: "07", district: "moor", chapters: ["A Silent Midway", "A Tent Worth Coming Home To", "The Mirror’s Favourite Lie", "A Full House", "The Last Bow"] },
  { id: "baron", name: "Baron Brassbolt", role: "Wealthy monster and collector", plot: "08", district: "moor", chapters: ["An Expensive Mistake", "Rooms Worth Living In", "The Catalogue of Impossible Things", "A Guest, Not a Customer", "Something Money Cannot Buy"] },
].map(Object.freeze));
export const RESIDENT_BY_ID = Object.freeze(Object.fromEntries(RESIDENTS.map((r) => [r.id, r])));
// Bond: the XP at which ranks 1 to 10 are reached (rank 1 on meeting), and the
// ranks at which chapters 1 to 5 open. A chapter's own reward carries the bond
// to the next chapter's rank, so the story never waits on gifts or chats.
export const BOND_XP = Object.freeze([0, 40, 100, 180, 280, 400, 540, 700, 880, 1080]);
export const CHAPTER_RANKS = Object.freeze([1, 3, 5, 7, 10]);
// A chat with a resident: a little bond, once per resident every few minutes of play.
export const CHAT_BOND = Object.freeze({ xp: 10, wait: 300 });
// Each material's store holds this many to begin with; Rowan's store blueprint will add to it.
export const STORE_BASE = 40;

// The square's fixtures and landmarks on the Green (rules keep decor off them; the world builds them).
// The Moth Tree stands at the heart of the round square where the roads meet; the
// well, the bench by it, Rowan's stall and the noticeboard stand round it.
export const FIXTURES = Object.freeze({
  tree: Object.freeze({ x: S(58), z: S(24.6), r: 4.4 }),
  well: Object.freeze({ x: S(51.4), z: S(27.8), r: 2.5 }),
  bench: Object.freeze({ x: S(51.2), z: S(23.6), w: 1.7, d: 3.9, facing: "east" }),
  stall: Object.freeze({ x: S(64.2), z: S(24.6), w: 4.2, d: 5.1, facing: "west" }),
  noticeboard: Object.freeze({ x: S(63), z: S(29.8), w: 3.3, d: 1.2, facing: "south" }),
  carriage: Object.freeze({ x: S(58), z: S(-4.4), w: 14, d: 4.8, facing: "east" }),
  oak: Object.freeze({ x: S(25.4), z: S(9.6), r: 2.4 }),
  pond: Object.freeze({ x: S(102), z: S(6), w: S(13), d: S(8) }),
});
// Planted and built scenery round the square: the avenue's knot gardens behind
// their railings, the square's lamps, planters and the avenue's benches, the
// pumpkin patch, the corn and the old moth-yard. Decor can't go on it and play
// mode walks round it (boxes, or circles with r).
export const SCENERY = Object.freeze([
  { id: "garden-west", x0: 48.6, z0: 8, x1: 54.4, z1: 15.6 },
  { id: "garden-east", x0: 61.6, z0: 8, x1: 66.4, z1: 15.6 },
  { id: "lamp-sw", x: 54.5, z: 21.1, r: .45 }, { id: "lamp-se", x: 61.5, z: 21.1, r: .45 },
  { id: "lamp-nw", x: 54.5, z: 28.1, r: .45 }, { id: "lamp-ne", x: 61.5, z: 28.1, r: .45 },
  { id: "planter-nw", x: 49.2, z: 30.3, r: .7 }, { id: "planter-ne", x: 65.8, z: 30.3, r: .7 },
  { id: "bench-avenue-w", x0: 55.1, z0: 10.2, x1: 56.1, z1: 12.8 }, { id: "bench-avenue-e", x0: 59.9, z0: 10.2, x1: 60.9, z1: 12.8 },
  { id: "bed-west", x0: 48.8, z0: 16.1, x1: 54.2, z1: 16.9 }, { id: "bed-east", x0: 61.8, z0: 16.1, x1: 66.2, z1: 16.9 },
  { id: "pumpkin-patch", x0: 67.6, z0: 2.4, x1: 81.4, z1: 8.4 }, { id: "corn-rows", x0: 29.6, z0: 5.6, x1: 46.6, z1: 9.4 }, { id: "moth-yard", x0: 85.5, z0: 1.5, x1: 94.5, z1: 10.5 },
  { id: "velvet-bat", x0: 91.4, z0: 11.6, x1: 111.8, z1: 30 },
].map((x) => Object.freeze(x.r ? { ...x, x: S(x.x), z: S(x.z), r: S(x.r) } : box(x))));
// The rules' own measures: where on the Green decor may go, the Moor's walled corner, and how near a door counts as "near".
export const GREEN_AREA = Object.freeze(box({ x0: 1, z0: 1, x1: 119, z1: 35 }));
export const MOOR_CORNER = Object.freeze({ x0: 1e4, x1: 1e4 + 1, z0: 1e4, z1: 1e4 + 1 });
export const NEAR_DOOR = S(9);
// The plot kept for you: an empty reservation on the Green, yours to fill.
export const YOUR_PLOT = "R1";
