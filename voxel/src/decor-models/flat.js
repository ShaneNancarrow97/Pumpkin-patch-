// Flat pieces: f15 constellation rug and f16 pumpkin rug (built lying down), d04
// gothic chandelier (hangs from the ceiling), d09 gilded looking glass, d10
// midnight cat portrait and d11 moonlit landscape (on the back wall).

const lum = (c) => (c >> 16) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
const speck = (x, y, z) => { let h = (Math.floor(x) * 374761393 + Math.floor(y) * 668265263 + Math.floor(z) * 1440662683) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// The art's own pixels (null where clear). The kit doesn't hand them out, but
// extrude's `where` sees every opaque one, so a pass that fills nothing collects
// them. It runs the whole depth, so a piece seen from above (view 90) gets its plan.
const pixelsOf = (k) => {
  const seen = new Map();
  k.extrude(0, k.D, 0, { where: (c, x, y) => { seen.set(y * 4096 + x, c); return false; } });
  return (x, y) => seen.get(Math.floor(y) * 4096 + Math.floor(x)) ?? null;
};
// A rod along a path of [x, y, z] points, radius r, joined round.
const path = (k, pts, r, paint, opts = {}) => { for (let i = 1; i < pts.length; i++) k.cyl(pts[i - 1], pts[i], r, paint, { caps: true, ...opts }); };

// A moulded frame as a relief on the wall: every column of the art filled out
// from the wall to a height. The picture is sunk to `sunk` px; the moulding
// round it rises to profile(t), t running from 0 at the sight edge to 1 at its
// outer edge (and on past 1 over the carving beyond), and the carving stands
// proud where the art catches the light and sinks where it is shadowed, so the
// gilding has real hollows. carve: how far, in px, or a function of (x, y, t),
// so straight runs of moulding stay clean and the ornaments go deep. The picture
// and the frame are separate parts, so neither borrows the other's colour down its sides.
function framed(k, { t, profile, sunk = 2, carve = 1.3, soften = 1, picture = "art", pictureOpts = {} }) {
  const px = pixelsOf(k), W = k.art.w, H = k.art.h, at = (x, y) => Math.floor(y) * W + Math.floor(x);
  // The frame's brightness, softened over its neighbours so the carving has form rather than grain.
  const raw = new Float32Array(W * H), soft = new Float32Array(W * H);
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = px(x, y);
    if (c === null || t(x + 0.5, y + 0.5) <= 0) continue;
    raw[y * W + x] = lum(c); sum += lum(c); sum2 += lum(c) ** 2; n++;
  }
  const mean = sum / n, spread = Math.sqrt(Math.max(1, sum2 / n - mean * mean));
  for (let pass = 0; pass < soften; pass++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (px(x, y) === null) continue;
      let s = 2 * (raw[y * W + x] || mean), w = 2;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (px(x + dx, y + dy) !== null && t(x + dx + 0.5, y + dy + 0.5) > 0) { s += raw[(y + dy) * W + x + dx]; w++; }
      soft[y * W + x] = s / w;
    }
    raw.set(soft);
  }
  for (let i = 0; i < W * H; i++) soft[i] = Math.max(-1, Math.min(1, (raw[i] - mean) / (1.6 * spread)));
  const depth = typeof carve === "function" ? carve : () => carve;
  const height = (x, y) => { const tt = t(x, y); return profile(tt) + depth(x, y, tt) * soft[at(x, y)]; };
  const pic = k.shape(0, 0, 0, W, H, sunk, (x, y) => px(x, y) !== null && t(x, y) <= 0, picture, pictureOpts);
  k.shape(0, 0, 0, W, H, k.D, (x, y, z) => px(x, y) !== null && t(x, y) > 0 && z <= Math.max(1, height(x, y)), "art");
  return pic;
}
// t for a rectangular frame: the picture [x0, y0, x1, y1] inside the moulding's outer
// edge [x0, y0, x1, y1], mitred at the corners as a frame is.
const rectT = (pic, out) => (x, y) => {
  const d = [pic[0] - x, pic[1] - y, x - pic[2], y - pic[3]], w = [pic[0] - out[0], pic[1] - out[1], out[2] - pic[2], out[3] - pic[3]];
  let best = -1e9;
  for (let i = 0; i < 4; i++) best = Math.max(best, d[i] / w[i]);
  return best;
};
// How much a point is in one of the frame's carved ornaments (0 to 1): within r px of any spot.
const ornaments = (spots, r) => (x, y) => Math.min(1, 1.5 * Math.max(0, ...spots.map(([sx, sy]) => 1 - Math.hypot(x - sx, y - sy) / r)));

// The art's silhouette as a signed distance in px (positive inside), read
// smoothly between pixel centres so edges come out rounder than the pixels.
function silhouette(k, px) {
  const W = k.art.w, H = k.art.h, d = [new Float32Array(W * H), new Float32Array(W * H)];
  // Two chamfer passes each way: distance to the nearest clear pixel inside, and to the nearest opaque one outside.
  d.forEach((dist, side) => {
    for (let i = 0; i < W * H; i++) dist[i] = (px(i % W, Math.floor(i / W)) !== null) === !side ? 1e9 : 0;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? (side ? 1e9 : 0) : dist[y * W + x]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) dist[y * W + x] = Math.min(dist[y * W + x], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) dist[y * W + x] = Math.min(dist[y * W + x], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
  });
  const sd = (x, y) => { x = Math.max(0, Math.min(W - 1, x)); y = Math.max(0, Math.min(H - 1, y)); const i = y * W + x; return d[0][i] > 0 ? d[0][i] - 0.5 : 0.5 - Math.min(d[1][i], 40); };
  return (x, y) => {
    const u = x - 0.5, v = y - 0.5, x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
    return (sd(x0, y0) * (1 - fx) + sd(x0 + 1, y0) * fx) * (1 - fy) + (sd(x0, y0 + 1) * (1 - fx) + sd(x0 + 1, y0 + 1) * fx) * fy;
  };
}
// A rug as a heightfield on the floor: every cell of the plan filled up to
// height(x, z) px and coloured by colour(x, z), its cut sides a little darker than the pile.
const pile = (k, height, colour, opts) => k.shape(0, 0, 0, k.W, k.H, k.D, (x, y, z) => y < height(x, z), (x, y, z) => (y + 0.5 / k.res < height(x, z) ? k.scale(colour(x, z), 0.82) : colour(x, z)), opts);

export default {
  // An oval rug of plum wool, its pattern carved: the compass star, the moons
  // and the vines are tufted a little higher than the field, inside a rolled
  // border, with gold tassels knotted on all round. The art is laid on the
  // floor with its top row at the back.
  f15: {
    depth: 46, height: 3, res: 2,
    build(k) {
      const D = 46, cx = 31, cz = 22.6, a = 28.5, b = 19.8, field = (x, z) => k.at(x, D - z);
      const r = (x, z) => Math.hypot((x - cx) / a, (z - cz) / b), fieldLum = lum(k.avg(10, 10, 50, 38)), gold = k.avg(0, 20, 3, 28);
      pile(k, (x, z) => {
        const e = r(x, z);
        if (e > 1) return 0;
        if (e > 0.91) return e > 0.98 ? 1.1 : 1.6;                        // the rolled border
        return lum(field(x, z)) > fieldLum * 1.45 ? 1.5 : 1;                // the pattern stands proud of the field
      }, (x, z) => (r(x, z) > 0.91 ? k.mix(field(x, z), gold, 0.45) : field(x, z)));    // the border bound in the tassels' gold
      // Tassels all round, evenly spaced: a knot on the border and a short skein lying out across the floor.
      const at = [];
      for (let i = 0, run = 0, last = null; i < 1440; i++) {
        const t = (i / 1440) * 2 * Math.PI, p = [cx + a * Math.cos(t), cz + b * Math.sin(t)];
        if (last) run += Math.hypot(p[0] - last[0], p[1] - last[1]);
        last = p; if (run >= 1.9 || i === 0) { at.push(t); run = 0; }
      }
      at.forEach((t, i) => {
        const nx = Math.cos(t) / a, nz = Math.sin(t) / b, n = Math.hypot(nx, nz), ox = nx / n, oz = nz / n, x = cx + a * Math.cos(t), z = cz + b * Math.sin(t), len = 1.9 + speck(i, 1, 2) * 0.7;
        k.cyl([x - ox * 0.4, 0.25, z - oz * 0.4], [x + ox * len, 0.25, z + oz * len], 0.55, k.vary(k.scale(gold, 0.9 + speck(i, 3, 7) * 0.25), 0.05));
        k.ball(x + ox * 0.3, 0.6, z + oz * 0.3, 0.7, 0.6, 0.7, k.scale(gold, 0.8));
      });
    },
  },
  // The pumpkin rug: a tufted pumpkin, each lobe puffed up between sunken
  // grooves, its leaves a flatter felt on top and the stem a plump roll, all
  // bound with a dark olive edge. Laid with the stem at the back, and drawn out
  // a little deeper than the art so it still reads as a pumpkin from the room's low
  // camera. Seen from straight above (view 90), so the silhouette pass reads the plan.
  f16: {
    depth: 60, height: 4, res: 2, view: 90, front: 54,
    build(k) {
      const D = 60, s = k.art.h / D, px = pixelsOf(k), edge = silhouette(k, px), ay = (z) => (D - z) * s, colour = (x, z) => k.at(x, ay(z));
      const grooves = [-0.5, 5.8, 16.8, 40.8, 52.8, 63.5];
      const lobe = (x) => { for (let i = 1; i < grooves.length; i++) if (x <= grooves[i]) { const c = (grooves[i - 1] + grooves[i]) / 2, h = (grooves[i] - grooves[i - 1]) / 2; return Math.sqrt(Math.max(0, 1 - ((x - c) / h) ** 2)); } return 0; };
      const leafy = (c) => ((c >> 8) & 255) > (c >> 16) * 0.6;
      const stem = (x, y) => Math.hypot(x - 32.6 - (y - 40) * 0.12, 0) < 2.6 && y > 40.5;
      pile(k, (x, z) => {
        const y = ay(z), d = edge(x, y);
        if (d < 0) return 0;
        if (d < 1.1) return 1.1;                                             // the bound edge
        if (stem(x, y)) return 3;
        const c = colour(x, z);
        if (y > 31 && leafy(c)) return 1.6 + (lum(c) > 80 ? 0.5 : 0);
        return 1.1 + 1.1 * lobe(x) * Math.min(1, (d - 1) / 3.5);
      }, colour);
    },
  },
  // The gothic chandelier: wrought iron hung on a chain from the ceiling, a
  // crown of scrolls over a caged baluster stem, and six S-curved arms through
  // an iron hoop, each holding a drip pan and a half-burnt candle whose flame
  // glows. Amber drops hang under the pans, the hoop and the crown. Built at three
  // voxels to two pixels, as so much of it is thin rod; it hangs out from the wall
  // so its back arms clear it, and the art's five candles are the front of the ring.
  d04: {
    depth: 56, res: 1.5,
    build(k) {
      const X = 27.5, Z = 28, R = 23.4, iron = k.vary(0x2c2019, 0.14), forged = k.layers({ top: k.vary(0x4c3826, 0.1), other: iron, depth: 0.6 });
      // Wax lit from within: warm and dull at the pan, brightening up to a glowing rim round the wick.
      const wax = (top) => (x, y, z) => k.scale(k.mix(0xb87a44, 0xf0b862, Math.min(1, Math.max(0, (y - 22) / (top - 22)))), 0.95 + speck(x * 2, y * 2, z * 2) * 0.1);
      const amber = (x, y, z) => k.mix(0x8a3a10, 0xe8862a, 0.45 + speck(x * 2, y * 2, z * 2) * 0.45);
      const flame = (base) => (x, y) => (y < base + 1.3 ? 0xffb347 : y < base + 3.3 ? 0xfff2c4 : 0xffa236);
      const out = (a, r, y) => [X + Math.sin(a) * r, y, Z + Math.cos(a) * r];
      // A crystal drop on a wire: a long bipyramid of amber.
      const drop = (x, z, y0, y1, w = 1.1) => {
        k.cyl([x, y1, z], [x, y1 + 1.4, z], 0.3, iron);
        k.lathe(x, z, y0, y1, [[0, 0.15], [0.4, w], [0.75, w * 0.6], [1, 0.3]], amber, { glow: true });
      };
      // The chain, link by link, each turned a quarter to the last.
      for (let y = 50, i = 0; y < 63; y += 1.9, i++) {
        const flat = i % 2 === 0;
        k.shape(X - 1.3, y - 0.2, Z - 1.3, X + 1.3, y + 2.4, Z + 1.3, (x, yy, z) => {
          const u = flat ? x - X : z - Z, w = flat ? z - Z : x - X, e = Math.hypot(u / 1, (yy - y - 1.1) / 1.25);
          return Math.abs(w) < 0.35 && e < 1.05 && e > 0.45;
        }, iron);
      }
      // The crown: an urn finial and four scrolls curling down, an amber drop under each.
      k.lathe(X, Z, 43.5, 51, [[0, 1.4], [0.2, 2.8], [0.45, 3.1], [0.65, 1.6], [0.85, 2.2], [1, 1]], forged);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2, p = (r, y) => out(a, r, y);
        path(k, [p(2, 45), p(5.5, 46), p(8.5, 45), p(9.6, 43), p(8.8, 41.6), p(7.6, 42.2)], 0.55, forged);
        drop(...[p(9.4, 0)[0], p(9.4, 0)[2]], 34.5, 40.8, 1);
      }
      // The stem: a collar under the crown, a cage of six bowed ribs round a rod, and the hub the arms spring from.
      k.lathe(X, Z, 36, 43.5, [[0, 1.2], [0.35, 0.9], [0.6, 2.3], [0.8, 2.6], [1, 1.6]], forged);
      k.cyl([X, 20, Z], [X, 37, Z], 0.75, iron);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3, rib = [];
        for (let y = 21; y <= 36.01; y += 1.5) rib.push(out(a + 0.25 * Math.sin(((y - 21) / 15) * Math.PI), 1.2 + 4.6 * Math.sin(((y - 21) / 15) * Math.PI) ** 0.8, y));
        path(k, rib, 0.5, forged);
      }
      k.lathe(X, Z, 34.5, 36.5, 2.8, forged);
      k.lathe(X, Z, 13, 21.5, [[0, 2.2], [0.2, 4.4], [0.45, 4.8], [0.7, 3], [1, 1.6]], forged);
      // Under the hub, a turned pendant and the big drop.
      k.lathe(X, Z, 8.5, 13, [[0, 0.6], [0.45, 2.3], [0.8, 1.6], [1, 2.4]], forged);
      drop(X, Z, 0.3, 8.6, 2.2);
      // The hoop the arms pass through.
      k.shape(X - 18.5, 12, Z - 18.5, X + 18.5, 14.2, Z + 18.5, (x, y, z) => (Math.hypot(x - X, z - Z) - 17.4) ** 2 + (y - 13.1) ** 2 <= 1, forged);
      // Six arms, each an S from the hub dipping through the hoop and up to its pan,
      // with a curl beneath; a candle in each pan, burnt to its own height.
      const burnt = [9, 11.5, 10, 12, 10.5, 9.5];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3, p = (r, y) => out(a, r, y), [cx, , cz] = p(R, 0), top = 22.5 + burnt[i];
        path(k, [p(3.8, 16.5), p(8, 14), p(12.5, 12.6), p(17.4, 13.1), p(20.8, 15.2), p(R, 18.4)], 1.1, forged);
        path(k, [p(8.5, 13.6), p(9.2, 11), p(11.2, 9.8), p(12.8, 10.8), p(12.3, 12.2), p(11.1, 11.7)], 0.5, forged);
        k.lathe(cx, cz, 17.4, 19.6, [[0, 0.7], [0.5, 1.4], [1, 1]], forged);
        k.lathe(cx, cz, 19.6, 21.6, [[0, 1.2], [0.5, 2.9], [1, 4]], forged);
        k.lathe(cx, cz, 21.4, 22.6, 3, forged);
        k.lathe(cx, cz, 22.5, top - 3.5, 2.4, wax(top));
        k.lathe(cx, cz, top - 3.5, top, 2.4, wax(top), { glow: true });
        // Wax run down the side, and the soft glow of the wax round the wick.
        for (let j = 0; j < 3; j++) {
          const t = a + j * 2.1 + speck(i, j, 5), len = 1.5 + speck(j, i, 9) * 4;
          k.cyl([cx + Math.sin(t) * 2.4, top - 0.4, cz + Math.cos(t) * 2.4], [cx + Math.sin(t) * 2.45, top - len, cz + Math.cos(t) * 2.45], 0.6, k.scale(wax(top)(cx, top - len / 2, cz), 1.05), { caps: true });
        }
        k.carve(cx - 1.4, top - 0.5, cz - 1.4, cx + 1.4, top + 0.5, cz + 1.4);
        k.cyl([cx, top - 0.6, cz], [cx, top + 0.6, cz], 0.3, 0x2a1a10);
        k.ball(cx, top + 2.3, cz, 1.1, 2.1, 1.1, flame(top), { glow: true });
        drop(cx, cz, 9 + (i % 2) * 1.5 - (i === 1 || i === 4 ? 2.5 : 0), 15.5, 0.9);
      }
      // More drops from the hoop between the side arms and the front and back ones.
      for (const a of [Math.PI / 3, (2 * Math.PI) / 3, (4 * Math.PI) / 3, (5 * Math.PI) / 3]) { const [x, , z] = out(a, 17.4, 0); drop(x, z, 3.5, 10.6, 1); }
    },
  },
  // The cat portrait: a deep gilt frame, its moulding a fillet at the sight
  // edge, a hollow and a fat carved bead, with acanthus bursting from the
  // corners and the crests; the canvas sunk inside it.
  d10: {
    depth: 8,
    build(k) {
      framed(k, {
        t: rectT([8, 9, 44, 55], [2, 3, 50, 61]), sunk: 2,
        carve: ((o) => (x, y, t) => (t > 1 ? 1.7 : 0.35 + 1.4 * o(x, y)))(ornaments([[4, 5], [48, 5], [4, 59], [48, 59], [26, 61], [26, 3], [2, 32], [50, 32]], 8)),
        profile: (t) => (t < 0.16 ? 4 : t < 0.4 ? 3 : t <= 1 ? 4.2 + 1.6 * Math.sin(Math.PI * Math.min(1, (t - 0.4) / 0.6)) : 3.6),
      });
    },
  },
  // The moonlit landscape: a dark carved wood frame with gilt ornaments at the
  // corners and the middle of each side.
  d11: {
    depth: 8,
    build(k) {
      framed(k, {
        t: rectT([8, 10, 53, 53], [2, 3, 59, 59]), sunk: 2,
        carve: ((o) => (x, y, t) => (t > 1 ? 1.7 : 0.35 + 1.4 * o(x, y)))(ornaments([[4, 5], [57, 5], [4, 57], [57, 57], [31, 59], [31, 3], [3, 31], [58, 31]], 8)),
        profile: (t) => (t < 0.18 ? 3.6 : t < 0.45 ? 4.6 : t <= 1 ? 5 - 1.5 * ((t - 0.45) / 0.55) : 3.6),
      });
    },
  },
  // The looking glass: an oval of glass sunk in a gilded frame of scrolls and
  // flowers under a crescent. The glass is flat and a little silvered, with a
  // bevel catching the light round its edge and a soft sheen across it from the
  // top left; the candles it reflects still glow.
  d09: {
    depth: 8,
    build(k) {
      const cx = 24.75, cy = 30.75, a = 15.6, b = 22.2, r = (x, y) => Math.hypot((x - cx) / a, (y - cy) / b);
      const glass = (x, y) => {
        const e = r(x, y), across = (x - cx) * 0.75 - (y - cy) * 0.66, sheen = 0.2 * Math.exp(-(((across + 5) / 3.2) ** 2)) + 0.1 * Math.exp(-(((across - 2) / 1.2) ** 2));
        const g = k.mix(k.mix(k.at(x, y), 0x8a90b0, 0.08), 0xf4eeff, sheen * (y > cy - 12 ? 1 : 0.5));
        return e > 0.94 ? k.mix(g, 0xf6e6c8, 0.22) : g;
      };
      framed(k, {
        t: (x, y) => (r(x, y) - 1) / 0.5, sunk: 2, soften: 2, carve: (x, y, t) => (t < 0.3 ? 0.4 : 2),
        profile: (t) => (t < 0.14 ? 4.4 : t < 0.32 ? 3.2 : 3.8),
        picture: glass,
      });
      // The reflected candle flames glow in the glass.
      k.shape(0, 0, 1, k.W, k.H, 2, (x, y) => r(x, y) < 0.9 && lum(k.at(x, y)) > 165 && (k.at(x, y) >> 16) > 220, (x, y) => k.at(x, y), { glow: true });
    },
  },
};
