// Spreading Mothlight out. The village was drawn on a tight design grid: the Moth Tree filled its square and
// Elowen's and Rowan's doors opened almost onto its roots. Rather than redraw every hand-placed thing, the grid is
// cut into pieces along lines where nothing stands, and each piece is moved whole. Nothing changes size: the
// pieces move apart and new ground fills the gaps between them.
//
//   C       the Moth Tree, its ring of lamps, the avenue and the gate: stays put
//   SW, SE  the square's furniture either side (gardens, well, bench, noticeboard, stall): out by INNER
//   W, E    Elowen's and Rowan's plots and everything beyond them (the Velvet Bat, the Moor): out by INNER + OUTER
//   NW, N, NE  everything north of the cross road (the Copse and the Acre, the Quarry and the Marsh, the Moor's
//          far side): north by RISE, which leaves room for a town square before the Quarry
//
// All on the design grid. spread(x, z) takes a drawn point to where it now stands; gather(x, z) takes a point on
// the ground back to the drawn grid (ground let in between pieces reads as the line it opened along), for anything
// asked of the ground by position: its height, water, terraces, grass. spreadBox moves a thing's footprint: whole,
// or stretched across a gap if it is long (a wall, a road, a fence).
export const SPREAD = Object.freeze({ inner: 8, outer: 16, rise: 40, long: 3 });
const I = SPREAD.inner, O = SPREAD.inner + SPREAD.outer, R = SPREAD.rise;
export const PIECES = Object.freeze({ C: [0, 0], SW: [-I, 0], SE: [I, 0], W: [-O, 0], E: [O, 0], NW: [-O, R], N: [0, R], NE: [O, R] });

// Boundaries, as steps: [from, value] pairs, the value holding from `from` until the next step. Found by scanning
// every box the builders write for lines that cross nothing (the scan is described in handover 74).
const step = (table, fallback) => (v) => { let out = fallback; for (const [from, value] of table) { if (v >= from) out = value; else break; } return out; };
// South of the cross road, by z: Elowen's side | the square's west furniture | the tree and avenue | east furniture | Rowan's side.
// The furniture pieces reach only from the carriage stop to just short of the tree's lamps (INNER_Z); beside the
// tree, its bench, stall and planters move as islands instead.
const INNER_Z = [-21.5, 20.45];
const bW = step([[-21.5, 46.15], [-18, 48.2], [.9, 47.2], [1.15, 46.65], [2.15, 46.8], [2.4, 47.25], [2.9, 47.5], [6.5, 48.2], [16, 48.6], [17.05, 48.75], [23.3, 48.2]], 48.2);
// Rowan's side steps round his barrow and the whole of the east knot garden, then in round his flower bed and the
// bench by his door.
const bE = step([[1, 66.6], [15.5, 66.42], [15.7, 65.2], [20.4, 64], [23.8, 66], [29, 66.65], [30, 66.8], [31, 66.3], [32, 66]], 66);
// Beside the gate the line steps round the corn sheaves tied to its lamps.
// (They stop short of the south wall, so its gate, hedgerow and hay bales stay where they are.)
const inner = (z) => z >= INNER_Z[0] && z < INNER_Z[1] && !(z >= -.4 && z < 2.9), gate = (z) => z >= 2.6 && z < 4.4;
const bSW = (z) => inner(z) ? (gate(z) ? 54.5 : 54.81) : bW(z), bSE = (z) => inner(z) ? (gate(z) ? 61.5 : 61.2) : bE(z);
// Things beside the tree that move with the furniture either side (ground level only: the tree's crown overhangs them).
const ISLANDS = Object.freeze([
  { piece: "SW", x0: 50.2, z0: 21.5, x1: 52.2, z1: 25.7 },  // the bench
  { piece: "SW", x0: 48.2, z0: 29.3, x1: 50.4, z1: 31.3 },  // the north-west planter
  { piece: "SE", x0: 62.55, z0: 25.9, x1: 66.8, z1: 31.3 },  // the stall and the north-east planter
  // And the two maples inside the gate, which stay with it.
  { piece: "C", x0: 50, z0: 1.4, x1: 55.45, z1: 6.9 }, { piece: "C", x0: 60.55, z0: 1.1, x1: 66.3, z1: 6.9 },
]);
// The Moth Tree's crown and the tops of its lamps stay with the tree, however far they reach over the furniture;
// so does Rowan's roof, whose eaves overhang the corner of the east knot garden.
const TREE = { x: 58, z: 24.6, r: 7.4, above: 3 };
const EAVES = Object.freeze([{ piece: "E", x0: 65.9, z0: 15.2, x1: 67.3, z1: 24.8, above: 3 }]);
// The cross road's north side, and north of it the Copse side's and the Moor side's lines.
const bN = () => 38.5, bNW = () => 20, bNE = () => 122.5, bMoor = () => 95;

// Which piece a drawn point belongs to.
export function pieceAt(x, z) {
  if (z < bN(x)) {
    for (const i of ISLANDS) if (x >= i.x0 && x <= i.x1 && z >= i.z0 && z <= i.z1) return i.piece;
    return x < bW(z) ? "W" : x < bSW(z) ? "SW" : x <= bSE(z) ? "C" : x <= bE(z) ? "SE" : "E";
  }
  if (x < bNW(z)) return "NW";
  if (x > bNE(z)) return z < bMoor(x) ? "E" : "NE";
  return "N";
}
// Which piece a drawn box belongs to (by its middle), with its height: high boxes near the tree stay with it, and
// an island takes only what lies wholly inside it.
export function pieceOfBox(x, y, z, w, d) {
  if (y >= TREE.above && Math.hypot(x - TREE.x, z - TREE.z) < TREE.r) return "C";
  for (const e of EAVES) if (y >= e.above && x >= e.x0 && x <= e.x1 && z >= e.z0 && z <= e.z1) return e.piece;
  if (z < bN(x)) for (const i of ISLANDS) if (x - w / 2 >= i.x0 && x + w / 2 <= i.x1 && z - d / 2 >= i.z0 && z + d / 2 <= i.z1) return y < 3 ? i.piece : "C";
  const p = pieceAt(x, z);
  return ISLANDS.some((i) => i.piece === p && x >= i.x0 && x <= i.x1 && z >= i.z0 && z <= i.z1) ? "C" : p;
}
export function spread(x, z) { const [dx, dz] = PIECES[pieceAt(x, z)]; return [x + dx, z + dz]; }
// Something set down beside a thing moves with that thing: (x, z) by the piece (ax, az) is on.
export function spreadWith(x, z, ax, az) { const [dx, dz] = PIECES[pieceAt(ax, az)]; return [x + dx, z + dz]; }
// A quest step on the Green goes with what it was set beside (Elowen's door, Rowan's door or the Moth Tree),
// so a page left on Elowen's step is still on her step now that her house stands back from the tree.
const BESIDE = Object.freeze([[48, 20], [66, 20], [58, 24.6]]);
export function spreadStep(x, z) {
  if (z >= bN(x)) return spread(x, z);
  let best = null, near = 10;
  for (const [ax, az] of BESIDE) { const d = Math.hypot(x - ax, z - az); if (d < near) { near = d; best = [ax, az]; } }
  return best ? spreadWith(x, z, ...best) : spread(x, z);
}

// The way back is looked up on a grid laid over the spread ground: each cell knows the piece standing on it, or,
// for new ground, the drawn point it reads as (the nearest edge of a piece, carried across).
const CELL = .5, OLD = { x0: -112, z0: -32, x1: 180, z1: 146 }, NEW = { x0: OLD.x0 - O - 2, z0: OLD.z0 - 2, x1: OLD.x1 + O + 2, z1: OLD.z1 + R + 2 };
const NX = Math.ceil((NEW.x1 - NEW.x0) / CELL), NZ = Math.ceil((NEW.z1 - NEW.z0) / CELL), NAMES = Object.keys(PIECES);
let grid = null;
function build() {
  const piece = new Int8Array(NX * NZ).fill(-1), ox = new Float32Array(NX * NZ), oz = new Float32Array(NX * NZ);
  // Splat every drawn point (a quarter of a cell apart, so no image cell is missed).
  const s = CELL / 2;
  for (let z = OLD.z0; z < OLD.z1; z += s) for (let x = OLD.x0; x < OLD.x1; x += s) {
    const p = pieceAt(x, z), [dx, dz] = PIECES[p], i = Math.floor((x + dx - NEW.x0) / CELL), j = Math.floor((z + dz - NEW.z0) / CELL);
    if (i < 0 || j < 0 || i >= NX || j >= NZ) continue;
    const k = j * NX + i; if (piece[k] < 0) { piece[k] = NAMES.indexOf(p); ox[k] = x; oz[k] = z; }
  }
  // New ground: carry the nearest piece's edge across, a cell at a time (breadth first, so it is the nearest).
  const filled = new Uint8Array(NX * NZ); let queue = [];
  for (let k = 0; k < piece.length; k++) if (piece[k] >= 0) { filled[k] = 1; queue.push(k); }
  while (queue.length) {
    const next = [];
    for (const k of queue) { const i = k % NX, j = (k / NX) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue; const n = b * NX + a; if (filled[n]) continue; filled[n] = 1; ox[n] = ox[k]; oz[n] = oz[k]; next.push(n); } }
    queue = next;
  }
  grid = { piece, ox, oz };
}
// The drawn point a piece puts at (x, z) on the spread ground, or null on new ground. Near a line (or a rounding
// away from one) the cell may belong to the neighbour, so the cells either side are asked too.
function claim(x, z, i, j) {
  for (const k of [j * NX + i, j * NX + Math.min(NX - 1, i + 1), j * NX + Math.max(0, i - 1), Math.min(NZ - 1, j + 1) * NX + i, Math.max(0, j - 1) * NX + i]) {
    const p = grid.piece[k]; if (p < 0) continue;
    const name = NAMES[p], [dx, dz] = PIECES[name], qx = x - dx, qz = z - dz;
    if (pieceAt(qx, qz) === name) return [qx, qz];
  }
  return null;
}
export function gather(x, z) {
  if (!grid) build();
  const i = Math.floor((x - NEW.x0) / CELL), j = Math.floor((z - NEW.z0) / CELL);
  if (i < 0 || j < 0 || i >= NX || j >= NZ) { const [dx, dz] = PIECES[pieceAt(x, z)]; return [x - dx, z - dz]; }
  // On a piece: exactly where it was drawn; on new ground, the edge it was let in along.
  const k = j * NX + i; return claim(x, z, i, j) ?? [grid.ox[k], grid.oz[k]];
}
// A footprint centred (x, z), w by d: moved whole by its middle, unless it is long, when each end goes with its
// own piece and it stretches across the gap between them (the cross axis still moves with its middle).
export function spreadBox(x, z, w, d) {
  const [cx, cz] = spread(x, z);
  let nx = cx, nz = cz, nw = w, nd = d;
  if (w >= SPREAD.long) { const a = spread(x - w / 2 + .01, z)[0] - .01, b = spread(x + w / 2 - .01, z)[0] + .01; nx = (a + b) / 2; nw = b - a; }
  if (d >= SPREAD.long) { const a = spread(x, z - d / 2 + .01)[1] - .01, b = spread(x, z + d / 2 - .01)[1] + .01; nz = (a + b) / 2; nd = b - a; }
  return [nx, nz, nw, nd];
}
// The same for a rectangle given by its corners.
export function spreadRect(r) { const [x, z, w, d] = spreadBox((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, r.x1 - r.x0, r.z1 - r.z0); return { ...r, x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }; }
// And in world units (PLAN_SCALE to the grid unit), for the rules.
export const spreadWorld = (x, z, K = 1.5) => spread(x / K, z / K).map((v) => v * K);
export const gatherWorld = (x, z, K = 1.5) => gather(x / K, z / K).map((v) => v * K);
// Whether a point on the spread ground is new ground let in between pieces (no piece stands on it).
export function isGap(x, z) {
  if (!grid) build();
  const i = Math.floor((x - NEW.x0) / CELL), j = Math.floor((z - NEW.z0) / CELL);
  if (i < 0 || j < 0 || i >= NX || j >= NZ) return false;
  return !claim(x, z, i, j);
}
// The ground opened north of the cross road, between the Green and the Quarry: the town square's room.
export const TOWN_SQUARE = Object.freeze({ x0: 1 - O, x1: 119 + O, z0: 38.5, z1: 38.5 + R });
export const inTownSquare = (x, z) => x >= TOWN_SQUARE.x0 && x <= TOWN_SQUARE.x1 && z >= TOWN_SQUARE.z0 && z < TOWN_SQUARE.z1;
