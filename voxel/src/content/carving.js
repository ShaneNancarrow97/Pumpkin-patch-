// Pumpkin carving at the garden's bench (carving-view.js, rules/carving.js).
// A stencil is pieces to cut out of the pumpkin's front. Each piece is a
// polygon in the face's own coordinates: u across and v up, both -1 to 1, as
// pumpkins.js's `carve(x, y)` reads them. A piece may keep islands (holes),
// like a ghost's eyes. Carvable ground runs about |u| < .72, -.66 < v < .6.

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

export const STENCILS = Object.freeze([
  { id: "classic", name: "Classic grin", difficulty: 1, pieces: [
    { id: "eye-l", outer: quad([-.52, .1], [-.14, .1], [-.33, .46]) },
    { id: "eye-r", outer: quad([.14, .1], [.52, .1], [.33, .46]) },
    { id: "nose", outer: quad([-.09, -.1], [.09, -.1], [0, .06]) },
    { id: "mouth", outer: grin(1.08, -.2, -.5, .3, [[-.26, -.12], [.12, .26]]) },
  ] },
  { id: "cat", name: "Moon cat", difficulty: 2, pieces: [
    { id: "eye-l", outer: ring(-.3, .2, .17, .085, 24, .35) },
    { id: "eye-r", outer: ring(.3, .2, .17, .085, 24, -.35) },
    { id: "nose", outer: quad([-.08, -.02], [.08, -.02], [0, -.12]) },
    { id: "mouth", outer: quad([-.3, -.22], [-.16, -.36], [0, -.24], [.16, -.36], [.3, -.22], [.16, -.29], [0, -.17], [-.16, -.29]) },
    { id: "ear-l", outer: quad([-.6, .3], [-.44, .56], [-.36, .32]) },
    { id: "ear-r", outer: quad([.6, .3], [.44, .56], [.36, .32]) },
  ] },
  { id: "bat", name: "Flitting bat", difficulty: 2, pieces: [
    { id: "bat", outer: quad([0, .2], [.06, .3], [.1, .18], [.24, .3], [.52, .34], [.66, .18], [.58, .2], [.5, .06], [.42, .12], [.34, -.02], [.24, .04], [.1, -.12], [0, -.22], [-.1, -.12], [-.24, .04], [-.34, -.02], [-.42, .12], [-.5, .06], [-.58, .2], [-.66, .18], [-.52, .34], [-.24, .3], [-.1, .18], [-.06, .3]) },
    { id: "moon", outer: ring(.36, -.42, .14, .14, 20) },
  ] },
  { id: "ghost", name: "Little ghost", difficulty: 2, pieces: [
    { id: "ghost", outer: [...ring(0, .14, .34, .34, 18, 0, 0, Math.PI), [-.34, -.32], [-.22, -.46], [-.11, -.34], [0, -.48], [.11, -.34], [.22, -.46], [.34, -.32]],
      holes: [ring(-.12, .16, .06, .09, 14), ring(.12, .16, .06, .09, 14), ring(0, -.08, .08, .06, 14)] },
  ] },
  { id: "moon-stars", name: "Moon and stars", difficulty: 2, pieces: [
    { id: "moon", outer: [...ring(-.14, .02, .4, .4, 22, 0, Math.PI * .28, Math.PI * 1.72), ...ring(.02, .06, .32, .32, 22, 0, Math.PI * 1.62, Math.PI * .38)] },
    { id: "star-a", outer: star(.42, .3, .15, .065) },
    { id: "star-b", outer: star(.46, -.24, .11, .05) },
    { id: "star-c", outer: star(.18, -.5, .08, .036) },
  ] },
  { id: "fangs", name: "Vampire fangs", difficulty: 3, pieces: [
    { id: "eye-l", outer: quad([-.56, .3], [-.16, .14], [-.2, .34]) },
    { id: "eye-r", outer: quad([.56, .3], [.16, .14], [.2, .34]) },
    { id: "nose", outer: quad([-.07, .02], [.07, .02], [0, -.1]) },
    { id: "mouth", outer: grin(1.1, -.18, -.44, .24, [[-.22, -.12], [.12, .22]], .18) },
  ] },
  { id: "skull", name: "Grinning skull", difficulty: 3, pieces: [
    { id: "eye-l", outer: ring(-.26, .18, .16, .18, 24) },
    { id: "eye-r", outer: ring(.26, .18, .16, .18, 24) },
    { id: "nose", outer: quad([0, .0], [.08, -.16], [0, -.12], [-.08, -.16]) },
    ...[-.3, -.15, 0, .15, .3].map((x, i) => ({ id: "tooth-" + i, outer: quad([x - .06, -.28], [x + .06, -.28], [x + .06, -.44], [x - .06, -.44]) })),
  ] },
  { id: "heart", name: "Sweetheart", difficulty: 1, pieces: [
    { id: "heart", outer: [...ring(-.16, .14, .18, .18, 16, 0, Math.PI * .08, Math.PI * 1.12), [0, -.38], ...ring(.16, .14, .18, .18, 16, 0, Math.PI * -.12, Math.PI * .92)], holes: [[...ring(-.07, .08, .07, .07, 10, 0, Math.PI * .1, Math.PI * 1.1), [0, -.12], ...ring(.07, .08, .07, .07, 10, 0, Math.PI * -.1, Math.PI * .9)]] },
    { id: "spark-l", outer: star(-.48, .34, .09, .04, 4) },
    { id: "spark-r", outer: star(.5, -.2, .08, .035, 4) },
  ] },
].map((s) => Object.freeze({ ...s, pieces: Object.freeze(s.pieces.map(Object.freeze)) })));
export const STENCIL_BY_ID = Object.freeze(Object.fromEntries(STENCILS.map((s) => [s.id, s])));

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
// more for a harder stencil and for each decoration. The doorstep keeps eight.
export const CARVING = Object.freeze({ lanternKeep: 8, priceTimes: 3, perDifficulty: 12, perDecoration: 6, cutShare: .9 });

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
