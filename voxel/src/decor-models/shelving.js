// Blank shelves (content/shelf-catalog.js): plain boards on scrolled brackets
// and turned posts, coloured by the finish the player picks, since no sprite art
// exists for them. One recipe pixel is 1/SHELF_PX of a room unit, and every
// board's top is read from its catalogue surface, so pieces stand exactly on the
// wood. Wall shelves hang with their back at z = 0, facing +z, brackets down to
// y = 0; floor shelves stand on y = 0 with x across and z from the back.
import { mix, scale } from "./kit.js";

export const SHELF_PX = 40;
const BRASS = { base: 0xb68a42, hi: 0xe2bb66, lo: 0x6f4f25 }, IRON = { base: 0x3b3643, hi: 0x6a6472, lo: 0x221e28 };
// Warm and dark woods take brass; pale bone and bright pumpkin look best with black iron.
const METAL = { bone: IRON, pumpkin: IRON };
const PAINTED = new Set(["bone", "plum", "sage", "pumpkin"]);
const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// The finish as paints: grain streaking along x, y or z in runs (painted wood keeps
// only a whisper of it), the end grain, a lit edge and the metal.
function palette(f) {
  const c = f.color, painted = PAINTED.has(f.id), amount = painted ? 0.04 : 0.1;
  const grain = (a) => (x, y, z) => {
    const p = [Math.floor(x), Math.floor(y), Math.floor(z)], b = p[(a + 1) % 3], d = p[(a + 2) % 3];
    const run = Math.floor((p[a] + 9 * hash(b, d, 1)) / (painted ? 12 : 6)), figure = !painted && hash(b >> 1, d >> 1, 7) < 0.09 ? 0.84 : 1;
    return scale(c, (1 + (hash(run, b, d) - 0.5) * 2 * amount) * figure);
  };
  const P = { c, painted, metal: METAL[f.id] ?? BRASS, x: grain(0), y: grain(1), z: grain(2), end: scale(c, painted ? 0.94 : 0.8), edge: mix(c, 0xffe6c4, painted ? 0.1 : 0.18) };
  // A board: grain along it, end grain on its two ends.
  P.board = (x, y, z, b) => (x - b.x0 < 1 || b.x1 - x < 1 ? P.end : P.x(x, y, z));
  return P;
}

// A rod along a curve of [z, y] points at x, joined round.
function rods(k, x, pts, r, paint) { for (let i = 1; i < pts.length; i++) k.cyl([x, pts[i - 1][1], pts[i - 1][0]], [x, pts[i][1], pts[i][0]], r, paint, { caps: true }); }
// A flat spiral at x round (cz, cy), winding inwards from radius r.
function curl(k, x, cz, cy, r, turns, from, paint, t = 0.75) {
  const pts = [];
  for (let i = 0; i <= 16; i++) { const s = i / 16, a = from + s * turns * 2 * Math.PI, rr = r * (1 - 0.7 * s); pts.push([cz + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  rods(k, x, pts, t, paint);
}
// A cast scroll bracket at x under a wall shelf: an arm up the wall on a plate, an
// arm under the board reaching out to `reach`, a brace sweeping between their
// ends and a curl in the space they enclose.
function bracket(k, M, x, y0, y1, reach) {
  const h = y1 - y0, t = 1.4;
  k.box(x - 2.4, y0 + 1, 0, x + 2.4, y1 - 0.5, 1, M.lo, { round: 1, axis: "z" });
  for (const y of [y0 + 3, y1 - 3]) k.ball(x, y, 1.2, 0.9, 0.9, 0.7, M.hi);
  k.box(x - t, y0 + 1, 0.6, x + t, y1, 2.8, M.base, { round: 0.6, axis: "y" });
  k.box(x - t, y1 - 2.2, 0.6, x + t, y1, reach, M.base, { round: 0.6, axis: "z" });
  const a = [2.2, y0 + 2.5], c = [reach * 0.75, y0 + h * 0.35], b = [reach - 3, y1 - 1.6], pts = [];
  for (let i = 0; i <= 12; i++) { const s = i / 12, u = 1 - s; pts.push([u * u * a[0] + 2 * u * s * c[0] + s * s * b[0], u * u * a[1] + 2 * u * s * c[1] + s * s * b[1]]); }
  rods(k, x, pts, t, M.base);
  curl(k, x, 2.6 + reach * 0.25, y1 - h * 0.38, Math.min(h, reach) * 0.2, 1.1, Math.PI * 0.75, M.base, 0.9);
  k.ball(x, y0 + 1.2, 1.6, 1.4, 1.4, 1.2, M.hi);                     // a round foot on the wall arm
  k.ball(x, y1 - 2.8, reach - 1.4, 1.1, 1.5, 1.1, M.hi);             // a drop under the arm's tip
}
// A turned post at (x, z) up to y1: a bun foot, a ring under each board, a bulb mid-tier.
function post(k, P, x, z, y1, tiers, r = 1.7) {
  const prof = (t) => {
    const y = t * y1;
    if (y < 4) return r + 0.9 * Math.sin((Math.PI * y) / 4.6);
    for (const top of tiers) if (Math.abs(y - (top - 4.5)) < 1.2) return r + 0.8;
    for (let i = 1; i < tiers.length; i++) { const mid = (tiers[i - 1] + tiers[i] - 4) / 2, d = Math.abs(y - mid); if (d < 7) return r + 0.7 * Math.cos((Math.PI * d) / 14); }
    return r;
  };
  k.lathe(x, z, 0, y1, prof, P.y, { max: r + 1 });
}
// A finial: a ball and a little point on top of a post.
function finial(k, P, x, z, y) {
  const M = P.metal;
  k.lathe(x, z, y, y + 2, 1.4, P.y);
  k.ball(x, y + 4, z, 2.2, 2.2, 2.2, P.painted ? P.edge : M.base);
  k.lathe(x, z, y + 5.5, y + 8, [[0, 1], [1, 0.3]], M.hi);
}
// A rail with a scalloped lower edge, from x0 to x1, its top at y, at depth z0..z1.
function apron(k, P, x0, x1, y0, y1, z0, z1, scallops) {
  const step = (x1 - x0) / scallops;
  k.shape(x0, y0, z0, x1, y1, z1, (x, y) => { const u = ((x - x0) % step) / step - 0.5; return y - y0 > (y1 - y0) * 0.55 * (1 - 4 * u * u); }, P.x);
}
// A low gallery along one edge of a tier: spindles and a rail, from a to b ([x, z]).
function gallery(k, P, a, b, y, n, h = 5) {
  const M = P.painted ? P.edge : P.metal.base;
  for (let i = 0; i <= n; i++) { const s = i / n, x = a[0] + (b[0] - a[0]) * s, z = a[1] + (b[1] - a[1]) * s; k.cyl([x, y, z], [x, y + h, z], 0.6, M); }
  k.cyl([a[0], y + h, a[1]], [b[0], y + h, b[1]], 0.85, P.painted ? P.edge : P.metal.hi, { caps: true });
}

// The boards' rectangles in recipe pixels, read from the catalogue's surfaces.
const boards = (item) => item.surfaces.map((s) => ({ x0: s.x * SHELF_PX, x1: (s.x + s.w) * SHELF_PX, z0: s.z * SHELF_PX, z1: (s.z + s.d) * SHELF_PX, y: s.y * SHELF_PX }));

const BUILD = {
  // One thick plank, rounded all round, with a bead scratched along its front.
  "shelf-floating": (k, P, [s]) => {
    k.box(s.x0, 0, s.z0, s.x1, s.y, s.z1, P.board, { round: 1.5 });
    k.carve(s.x0 + 1, 2, s.z1 - 1, s.x1 - 1, 3, s.z1);
    k.box(s.x0 + 1, s.y - 1, s.z1 - 2, s.x1 - 1, s.y, s.z1 - 1, P.edge);
  },
  // A long board with a moulded front, on a cleat and three scroll brackets.
  "shelf-bracket": (k, P, [s]) => {
    k.box(s.x0, s.y - 4, 0, s.x1, s.y, s.z1, P.board, { round: 1.5, axis: "x" });
    k.box(s.x0 + 1, s.y - 5.5, s.z1 - 3, s.x1 - 1, s.y - 4, s.z1 - 1, P.x, { round: 0.6, axis: "x" });
    k.box(s.x0 + 3, s.y - 9, 0, s.x1 - 3, s.y - 4, 2.5, P.x, { round: 1, axis: "x" });
    for (const x of [14, 60, 106]) bracket(k, P.metal, x, 0, s.y - 4, s.z1 - 4);
  },
  // Two boards housed into shaped ends: a curled foot, a waist and a rounded top
  // with a knob; a scalloped rail under the top board and brackets under the lower.
  "shelf-two-tier": (k, P, [lo, hi]) => {
    for (const s of [lo, hi]) k.box(s.x0 - 2, s.y - 4, 0, s.x1 + 2, s.y, s.z1, P.board, { round: 1.5, axis: "x" });
    apron(k, P, hi.x0, hi.x1, hi.y - 11, hi.y - 4, 0, 2.5, 5);
    const top = hi.y + 10, depth = (y) => y < lo.y - 4 ? 30 - 17 * (1 - (y - 3) / (lo.y - 7)) ** 2
      : y <= hi.y ? 30 - 8 * Math.sin((Math.PI * Math.max(0, Math.min(1, (y - lo.y) / (hi.y - 4 - lo.y))))) : 30 * Math.sqrt(Math.max(0, 1 - ((y - hi.y) / (top - hi.y)) ** 2));
    k.sym((X) => {
      const [a, b] = [X(lo.x0 - 4), X(lo.x0)].sort((m, n) => m - n);
      k.shape(a, 3, 0, b, top, 30, (x, y, z) => z < depth(y), P.y);
      k.box(a + 0.5, lo.y - 4, 27, b - 0.5, lo.y - 2, 30, P.edge, { round: 0.8 });
      finial(k, P, (a + b) / 2, 5, top - 1.5);
    });
    for (const x of [22, 58]) bracket(k, P.metal, x, 0, lo.y - 4, lo.z1 - 6);
  },
  // Three square tiers on turned posts, with a gallery along the back and the left
  // (turn it to suit the corner) and scalloped aprons under the upper two.
  "shelf-whatnot": (k, P, tiers) => {
    const tops = tiers.map((s) => s.y), H = tops.at(-1) + 2, at = [3, 37];
    for (const s of tiers) k.box(s.x0, s.y - 3, s.z0, s.x1, s.y, s.z1, P.x, { round: 1 });
    for (const s of tiers.slice(1)) {
      apron(k, P, s.x0 + 3, s.x1 - 3, s.y - 8, s.y - 3, s.z1 - 2, s.z1 - 0.5, 3);
      apron(k, P, s.x0 + 3, s.x1 - 3, s.y - 8, s.y - 3, s.z0 + 0.5, s.z0 + 2, 3);
    }
    for (const x of at) for (const z of at) { post(k, P, x, z, H, tops); finial(k, P, x, z, H); }
    for (const s of tiers) { gallery(k, P, [6, 3], [34, 3], s.y, 6); gallery(k, P, [3, 6], [3, 34], s.y, 6); }
  },
  // A wide open stand: three tiers on turned posts, scalloped aprons, side rails,
  // and a crest at the top with a crescent moon cut through it.
  "shelf-etagere": (k, P, tiers) => {
    const tops = tiers.map((s) => s.y), H = tops.at(-1) + 2, xs = [3, 77], zs = [3, 37], cx = 40, cy = H + 6;
    for (const s of tiers) k.box(s.x0, s.y - 3, s.z0, s.x1, s.y, s.z1, P.board, { round: 1, axis: "x" });
    for (const s of tiers.slice(1)) apron(k, P, s.x0 + 4, s.x1 - 4, s.y - 9, s.y - 3, s.z1 - 2, s.z1 - 0.5, 6);
    for (const x of xs) for (const z of zs) { post(k, P, x, z, H, tops, 2); finial(k, P, x, z, H); }
    for (const s of tiers) for (const x of xs) k.cyl([x, s.y + 5, 6], [x, s.y + 5, 34], 1, P.z, { caps: true });
    for (const s of tiers.slice(0, 2)) gallery(k, P, [7, 3], [73, 3], s.y, 12, 4);
    // The crest: an arch along the back of the top tier, the moon pierced through it.
    k.shape(6, H - 2, 1.5, 74, H + 14, 4.5, (x, y) => y < H + 2 + 11 * Math.sin((Math.PI * (x - 6)) / 68) ** 0.6, P.x);
    k.carve(cx - 5, cy - 5, 0, cx + 5, cy + 5, 6, (x, y) => (x - cx) ** 2 + (y - cy) ** 2 < 21);
    k.shape(cx - 5, cy - 5, 2, cx + 5, cy + 5, 4, (x, y) => (x - cx) ** 2 + (y - cy) ** 2 < 21 && (x - cx - 2.2) ** 2 + (y - cy - 1) ** 2 > 13, P.painted ? P.edge : P.metal.hi);
  },
};
// Each shelf's size in recipe pixels; the height leaves room for finials.
const SIZE = { "shelf-floating": [40, 6, 30], "shelf-bracket": [120, 22, 30], "shelf-two-tier": [80, 80, 30], "shelf-whatnot": [40, 100, 40], "shelf-etagere": [80, 112, 40] };

// The recipe for one shelf in one finish (a catalogue entry and one of its finishes).
export function shelfRecipe(item, finish) {
  const [width, height, depth] = SIZE[item.id], P = palette(finish), tiers = boards(item);
  return { width, height, depth, res: 1, build: (k) => BUILD[item.id](k, P, tiers) };
}
export const SHELF_IDS = Object.keys(BUILD);
