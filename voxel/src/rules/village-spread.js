// Spreading Mothlight out. The village was drawn on a tight design grid: the Moth Tree fills its square and
// Elowen's and Rowan's doors open almost onto its roots. Rather than redraw every hand-placed thing, this is one
// stretch of that grid: cuts along lines where nothing stands, with the land either side moved apart and new
// ground let in between. Nothing changes size; only the gaps grow.
//
//   South of the square's north edge (the Green): the houses' side of each cut moves out from the tree, and a
//   second pair of cuts beside the avenue moves its gardens, the well and the bench out too. The avenue and
//   gate move south, so the square is deeper as well as wider.
//   North of it: everything moves north, leaving room for a town square before the Quarry, and the Copse's and
//   the Moor's sides move out to keep clear of the wider Green.
//
// spread(x, z) takes a point on the old grid to the new one; gather(x, z) takes new ground back to the old grid
// (ground let in at a cut reads as the cut's own edge), for anything sampled by position: terrain, paving, grass.
// Pure, on the design grid. Not yet applied to the village: see handover 74.
export const SPREAD = Object.freeze({
  north: 30.9,                       // the cut along the square's north edge
  rise: 30,                          // how far everything beyond it moves north
  avenue: 16, drop: 8,               // the cut between the avenue and the square, and how far the avenue moves south
  inner: [54.45, 61.55], innerGap: 6, // cuts beside the avenue's road: gardens, well and bench move out
  outer: [48.05, 65.95], outerGap: 14, // cuts at the two doorsteps: the houses and all beyond them move further
  far: [20, 110], farGap: 20,        // north of the square: the Copse's side and the Moor's side
});
const S = SPREAD;
const southX = (x) => x < S.outer[0] ? -(S.innerGap + S.outerGap) : x < S.inner[0] ? -S.innerGap : x <= S.inner[1] ? 0 : x <= S.outer[1] ? S.innerGap : S.innerGap + S.outerGap;
const northX = (x) => x < S.far[0] ? -S.farGap : x > S.far[1] ? S.farGap : 0;
export function spread(x, z) {
  if (z >= S.north) return [x + northX(x), z + S.rise];
  return [x + southX(x), z < S.avenue ? z - S.drop : z];
}
// The old-grid point whose ground lies at a new-grid point. A list of cuts [at, gap] in rising order.
function back(v, cuts, middle) {
  // Walk outwards from the unmoved middle, taking each gap out; ground inside a gap reads as its cut.
  let moved = 0;
  if (v >= middle) { for (const [at, gap] of cuts.filter(([a]) => a >= middle)) { if (v - moved <= at) break; if (v - moved < at + gap) return at; moved += gap; } return v - moved; }
  for (const [at, gap] of cuts.filter(([a]) => a < middle).reverse()) { if (v + moved >= at) break; if (v + moved > at - gap) return at; moved += gap; }
  return v + moved;
}
const SOUTH_CUTS = [[S.outer[0], S.outerGap], [S.inner[0], S.innerGap], [S.inner[1], S.innerGap], [S.outer[1], S.outerGap]], NORTH_CUTS = [[S.far[0], S.farGap], [S.far[1], S.farGap]];
export function gather(x, z) {
  if (z >= S.north + S.rise) return [back(x, NORTH_CUTS, 58), z - S.rise];
  if (z >= S.north) return [back(x, SOUTH_CUTS, 58), S.north - .01];   // the new town square's ground reads as the old square's north edge
  const oz = z >= S.avenue ? z : z > S.avenue - S.drop ? S.avenue : z + S.drop;
  return [back(x, SOUTH_CUTS, 58), oz];
}
// A box moved whole by its middle (a garden, a bench), and one stretched by its corners (a road's reach, a square).
export const spreadBox = (b) => { const [dx, dz] = spread((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2); const ox = dx - (b.x0 + b.x1) / 2, oz = dz - (b.z0 + b.z1) / 2; return { ...b, x0: b.x0 + ox, x1: b.x1 + ox, z0: b.z0 + oz, z1: b.z1 + oz }; };
export const stretchBox = (b) => { const [x0, z0] = spread(b.x0, b.z0), [x1, z1] = spread(b.x1, b.z1); return { ...b, x0, z0, x1, z1 }; };
