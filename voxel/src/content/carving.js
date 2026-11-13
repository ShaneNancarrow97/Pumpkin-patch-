// Pumpkin carving at the garden's bench (carving-view.js, rules/carving.js).
// A stencil is pieces to cut out of the pumpkin's front, or to etch: peeling
// the skin so the flesh glows softly. Each piece is a polygon in the face's own
// coordinates: u across and v up, both -1 to 1, as carving-pumpkin.js reads
// them. A piece may keep islands (holes), like a ghost's eyes or the gaps in a
// web. Carvable ground runs about |u| < .72, -.66 < v < .6. Stencils fall into
// groups for the stencil book; the harder ones open as lanterns are made.

const ring = (cx, cy, rx, ry, n = 28, rot = 0, from = 0, to = Math.PI * 2) => Array.from({ length: n }, (_, i) => {
  const a = from + (to - from) * i / (to - from >= Math.PI * 2 ? n : n - 1), c = Math.cos(rot), s = Math.sin(rot), x = Math.cos(a) * rx, y = Math.sin(a) * ry;
  return [cx + x * c - y * s, cy + x * s + y * c];
});
const star = (cx, cy, r1, r2, n = 5, rot = Math.PI / 2) => Array.from({ length: n * 2 }, (_, i) => { const a = rot + i * Math.PI / n, r = i % 2 ? r2 : r1; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
// A grin: a curved mouth whose top edge drops teeth (or rises into fangs).
function grin(width, top, low, curve, teeth = [], tooth = .1) {
  const n = 22, upper = [], lower = [];
  for (let i = 0; i <= n; i++) {
    const x = -width / 2 + width * i / n, k = (2 * x / width) ** 2;
    lower.push([x, low + curve * k]);
    let y = top + curve * .55 * k;
    if (teeth.some(([a, b]) => x >= a && x <= b)) y -= tooth;
    upper.push([x, y]);
  }
  return [...lower, ...upper.reverse()];
}
const quad = (...p) => p;
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// A doorway: straight sides under a round top.
const arch = (cx, bottom, w, h) => [[cx - w / 2, bottom], [cx + w / 2, bottom], ...ring(cx, bottom + h - w / 2, w / 2, w / 2, 10, 0, 0, Math.PI)];
const BAT = [[0, .2], [.06, .3], [.1, .18], [.24, .3], [.52, .34], [.66, .18], [.58, .2], [.5, .06], [.42, .12], [.34, -.02], [.24, .04], [.1, -.12], [0, -.22], [-.1, -.12], [-.24, .04], [-.34, -.02], [-.42, .12], [-.5, .06], [-.58, .2], [-.66, .18], [-.52, .34], [-.24, .3], [-.1, .18], [-.06, .3]];
const shift = (poly, k, dx, dy) => poly.map(([x, y]) => [x * k + dx, y * k + dy]);
// A web etched on the rind: the strands are peeled, the gaps between them stay.
function web(cx, cy, r, spokes = 8, rings = 3) {
  const holes = [], at = (a, d) => [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
  for (let i = 0; i < spokes; i++) for (let j = 0; j < rings; j++) {
    const a0 = i / spokes * Math.PI * 2 + .1, a1 = (i + 1) / spokes * Math.PI * 2 - .1, r0 = j ? r * j / rings + .035 : .07, r1 = r * (j + 1) / rings - .035;
    holes.push([at(a0, r0), at(a1, r0), at(a1, r1), at(a0, r1)]);
  }
  return { outer: ring(cx, cy, r, r, 40), holes };
}

export const STENCILS = Object.freeze([
  { id: "classic", name: "Classic grin", group: "faces", difficulty: 1, pieces: [
    { id: "eye-l", outer: quad([-.52, .1], [-.14, .1], [-.33, .46]) },
    { id: "eye-r", outer: quad([.14, .1], [.52, .1], [.33, .46]) },
    { id: "nose", outer: quad([-.09, -.1], [.09, -.1], [0, .06]) },
    { id: "mouth", outer: grin(1.08, -.2, -.5, .3, [[-.26, -.12], [.12, .26]]) },
  ] },
  { id: "cat", name: "Moon cat", group: "creatures", difficulty: 2, pieces: [
    { id: "eye-l", outer: ring(-.3, .2, .17, .085, 24, .35) },
    { id: "eye-r", outer: ring(.3, .2, .17, .085, 24, -.35) },
    { id: "nose", outer: quad([-.08, -.02], [.08, -.02], [0, -.12]) },
    { id: "mouth", outer: quad([-.3, -.22], [-.16, -.36], [0, -.24], [.16, -.36], [.3, -.22], [.16, -.29], [0, -.17], [-.16, -.29]) },
    { id: "ear-l", outer: quad([-.6, .3], [-.44, .56], [-.36, .32]) },
    { id: "ear-r", outer: quad([.6, .3], [.44, .56], [.36, .32]) },
  ] },
  { id: "bat", name: "Flitting bat", group: "creatures", difficulty: 2, pieces: [
    { id: "bat", outer: BAT },
    { id: "moon", outer: ring(.36, -.42, .14, .14, 20) },
  ] },
  { id: "ghost", name: "Little ghost", group: "creatures", difficulty: 2, pieces: [
    { id: "ghost", outer: [...ring(0, .14, .34, .34, 18, 0, 0, Math.PI), [-.34, -.32], [-.22, -.46], [-.11, -.34], [0, -.48], [.11, -.34], [.22, -.46], [.34, -.32]],
      holes: [ring(-.12, .16, .06, .09, 14), ring(.12, .16, .06, .09, 14), ring(0, -.08, .08, .06, 14)] },
  ] },
  { id: "moon-stars", name: "Moon and stars", group: "pictures", difficulty: 2, pieces: [
    { id: "moon", outer: [...ring(-.14, .02, .4, .4, 22, 0, Math.PI * .28, Math.PI * 1.72), ...ring(.02, .06, .32, .32, 22, 0, Math.PI * 1.62, Math.PI * .38)] },
    { id: "star-a", outer: star(.42, .3, .15, .065) },
    { id: "star-b", outer: star(.46, -.24, .11, .05) },
    { id: "star-c", outer: star(.18, -.5, .08, .036) },
  ] },
  { id: "fangs", name: "Vampire fangs", group: "faces", difficulty: 3, pieces: [
    { id: "eye-l", outer: quad([-.56, .3], [-.16, .14], [-.2, .34]) },
    { id: "eye-r", outer: quad([.56, .3], [.16, .14], [.2, .34]) },
    { id: "nose", outer: quad([-.07, .02], [.07, .02], [0, -.1]) },
    { id: "mouth", outer: grin(1.1, -.18, -.44, .24, [[-.22, -.12], [.12, .22]], .18) },
  ] },
  { id: "skull", name: "Grinning skull", group: "faces", difficulty: 3, pieces: [
    { id: "eye-l", outer: ring(-.26, .18, .16, .18, 24) },
    { id: "eye-r", outer: ring(.26, .18, .16, .18, 24) },
    { id: "nose", outer: quad([0, .0], [.08, -.16], [0, -.12], [-.08, -.16]) },
    ...[-.3, -.15, 0, .15, .3].map((x, i) => ({ id: "tooth-" + i, outer: quad([x - .06, -.28], [x + .06, -.28], [x + .06, -.44], [x - .06, -.44]) })),
  ] },
  { id: "heart", name: "Sweetheart", group: "pictures", difficulty: 1, pieces: [
    { id: "heart", outer: [...ring(-.16, .14, .18, .18, 16, 0, Math.PI * .08, Math.PI * 1.12), [0, -.38], ...ring(.16, .14, .18, .18, 16, 0, Math.PI * -.12, Math.PI * .92)], holes: [[...ring(-.07, .08, .07, .07, 10, 0, Math.PI * .1, Math.PI * 1.1), [0, -.12], ...ring(.07, .08, .07, .07, 10, 0, Math.PI * -.1, Math.PI * .9)]] },
    { id: "spark-l", outer: star(-.48, .34, .09, .04, 4) },
    { id: "spark-r", outer: star(.5, -.2, .08, .035, 4) },
  ] },
  // The master stencils: etched skin glows softly beside the cut-outs.
  { id: "harvest-moon", name: "Harvest moon", group: "pictures", difficulty: 3, unlock: 1, pieces: [
    { id: "moon", kind: "etch", outer: ring(.2, .1, .4, .4, 40), holes: [shift(BAT, .42, .18, .14)] },
    { id: "star-a", outer: star(-.5, .36, .11, .05) },
    { id: "star-b", outer: star(-.42, -.14, .09, .04) },
    { id: "star-c", outer: star(-.56, -.44, .07, .032) },
  ] },
  { id: "owl", name: "Wise owl", group: "creatures", difficulty: 3, unlock: 2, pieces: [
    { id: "eye-l", outer: ring(-.22, .2, .15, .15, 30), holes: [ring(-.19, .18, .06, .06, 14)] },
    { id: "eye-r", outer: ring(.22, .2, .15, .15, 30), holes: [ring(.19, .18, .06, .06, 14)] },
    { id: "beak", outer: quad([-.06, .02], [.06, .02], [0, -.13]) },
    { id: "tuft-l", outer: quad([-.48, .38], [-.4, .58], [-.28, .4]) },
    { id: "tuft-r", outer: quad([.48, .38], [.28, .4], [.4, .58]) },
    { id: "chest", kind: "etch", outer: ring(0, -.38, .3, .2, 36), holes: [[-.15, -.27], [0, -.27], [.15, -.27], [-.22, -.38], [-.075, -.38], [.075, -.38], [.22, -.38], [-.15, -.49], [0, -.49], [.15, -.49]].map(([x, y]) => ring(x, y, .035, .026, 10)) },
  ] },
  { id: "toothy", name: "Toothy jack", group: "faces", difficulty: 3, unlock: 3, pieces: [
    { id: "eye-l", outer: quad([-.5, .08], [-.14, .08], [-.3, .38]) },
    { id: "eye-r", outer: quad([.14, .08], [.5, .08], [.3, .38]) },
    { id: "brow-l", kind: "etch", outer: quad([-.56, .44], [-.54, .38], [-.16, .44], [-.18, .5]) },
    { id: "brow-r", kind: "etch", outer: quad([.56, .44], [.18, .5], [.16, .44], [.54, .38]) },
    { id: "nose", outer: quad([-.08, -.1], [.08, -.1], [0, .03]) },
    { id: "mouth", outer: grin(1, -.18, -.52, .3, [[-.36, -.26], [-.16, -.06], [.06, .16], [.26, .36]], .1) },
    { id: "cheek-l", kind: "etch", outer: ring(-.6, -.1, .06, .055, 16) },
    { id: "cheek-r", kind: "etch", outer: ring(.6, -.1, .06, .055, 16) },
  ] },
  { id: "manor", name: "Haunted manor", group: "pictures", difficulty: 3, unlock: 4, pieces: [
    { id: "roof", kind: "etch", outer: quad([-.44, 0], [.44, 0], [0, .34]), holes: [ring(0, .13, .075, .075, 16)] },
    { id: "attic", outer: ring(0, .13, .045, .045, 14) },
    { id: "moon", kind: "etch", outer: ring(-.52, .4, .12, .12, 24) },
    { id: "win-1", outer: rect(-.32, -.2, -.16, -.06) },
    { id: "win-2", outer: rect(.16, -.2, .32, -.06) },
    { id: "win-3", outer: rect(-.32, -.46, -.16, -.32) },
    { id: "win-4", outer: rect(.16, -.46, .32, -.32) },
    { id: "door", outer: arch(0, -.58, .16, .3) },
  ] },
  { id: "web", name: "Spider's web", group: "creatures", difficulty: 3, unlock: 6, pieces: [
    { id: "web", kind: "etch", ...web(-.14, .1, .48) },
    { id: "spider", outer: star(.48, -.38, .14, .055, 8) },
  ] },
  // Freehand: whatever closed shapes the knife draws are cut out (rules/carving.js).
  { id: "free", name: "Your own design", group: "own", difficulty: 2, freehand: true, pieces: [] },
].map((s) => Object.freeze({ ...s, pieces: Object.freeze(s.pieces.map(Object.freeze)) })));
export const STENCIL_BY_ID = Object.freeze(Object.fromEntries(STENCILS.map((s) => [s.id, s])));
export const STENCIL_GROUPS = Object.freeze([["faces", "Faces"], ["creatures", "Creatures"], ["pictures", "Pictures"], ["own", "Your own"]]);
export const pieceKind = (piece) => piece.kind === "etch" ? "etch" : "cut";

// Decorations: one of each single group, and any of the extras.
export const CARVING_DECOR = Object.freeze({
  candle: [{ id: "warm", name: "Candlelight", colour: [0xffd86c, 0xffa23c] }, { id: "witch", name: "Witch green", colour: [0xc6ff8a, 0x4fc96a] }, { id: "frost", name: "Ghost blue", colour: [0xcfe9ff, 0x5c9ae6] }, { id: "spell", name: "Spell purple", colour: [0xe6b8ff, 0x9a52e0] }],
  paint: [{ id: "natural", name: "Natural" }, { id: "ghost", name: "Ghost white", colour: 0xe8e1d2 }, { id: "midnight", name: "Midnight", colour: 0x2b2533 }, { id: "slime", name: "Slime green", colour: 0x86c35a }],
  hat: [{ id: "none", name: "No hat" }, { id: "witch", name: "Witch's hat" }, { id: "top", name: "Top hat" }, { id: "bow", name: "Velvet bow" }, { id: "crown", name: "Gold crown" }],
  stand: [{ id: "plain", name: "On the bench" }, { id: "hay", name: "Hay bale" }, { id: "plinth", name: "Stone plinth" }],
  extras: [{ id: "leaves", name: "Autumn leaves" }, { id: "spider", name: "Pet spider" }, { id: "bolts", name: "Neck bolts" }, { id: "candles", name: "Tea lights" }, { id: "glitter", name: "Glitter" }],
});
export const CARVING_DEFAULTS = Object.freeze({ candle: "warm", paint: "natural", hat: "none", stand: "plain", extras: Object.freeze([]) });
// What a carved lantern fetches at the village fair: three times its pumpkin,
// more for a harder stencil, each etched piece, each freehand shape and each
// decoration. The doorstep keeps eight. Scooping a pumpkin saves its seeds for
// the pantry (`seeds` by variety), once nearly all its pulp is out.
export const CARVING = Object.freeze({ lanternKeep: 8, priceTimes: 3, perDifficulty: 12, perDecoration: 6, perEtch: 4, perFree: 3, cutShare: .9, etchShare: .85, scoopDone: .85, freeMax: 12, freePoints: 48, nameMax: 24, seeds: Object.freeze([4, 4, 5, 5, 6]) });

// Point in a piece: inside its outline and outside its islands (even-odd).
function inside(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
export const inPiece = (piece, u, v) => inside(piece.outer, u, v) && !(piece.holes ?? []).some((h) => inside(h, u, v));
// The outline a knife follows round a piece, evenly spaced.
export function pieceOutline(piece, spacing = .035) {
  const out = [], pts = piece.outer;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / spacing));
    for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
  }
  return out;
}

// Freehand shapes: their area, a path thinned to a few corners, and whether a
// shape is fit to cut (closed, on the face, not too small, not too fiddly).
export function polygonArea(poly) {
  let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a / 2);
}
export function simplifyPath(points, tolerance = .012) {
  if (points.length < 3) return points.slice();
  const far = (a, b, p) => { const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1e-9; return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len; };
  const keep = (from, to) => {
    let best = -1, at = -1;
    for (let i = from + 1; i < to; i++) { const d = far(points[from], points[to], points[i]); if (d > best) { best = d; at = i; } }
    return best > tolerance ? [...keep(from, at).slice(0, -1), ...keep(at, to)] : [points[from], points[to]];
  };
  return keep(0, points.length - 1);
}
export function freePieceOk(poly) {
  return Array.isArray(poly) && poly.length >= 3 && poly.length <= CARVING.freePoints
    && poly.every((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= .74 && p[1] >= -.68 && p[1] <= .64)
    && polygonArea(poly) >= .006;
}
