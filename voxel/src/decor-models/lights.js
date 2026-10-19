// Lights: d01 iron candelabrum, d02 crescent floor lamp, d03 harvest lantern,
// d05 emerald desk lamp, d06 bottled ghost light. Whatever gives the light
// (flames, bulbs, lit glass, the ghost) glows, so it blooms; places.js hangs a
// point light at each of them.

const speck = (x, y, z) => { let h = (Math.floor(x) * 374761393 + Math.floor(y) * 668265263 + Math.floor(z) * 1440662683) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const lum = (c) => (c >> 16) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
// Glowing voxels skip the lighting but not the tone mapping (ACES at the
// renderer's exposure, 1.45 in scene.js), which washes their middle tones pale.
// shown(c) is the colour to give a glowing voxel for it to come out on screen as c.
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4), srgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055);
const aces = ([r, g, b]) => {
  const k = 1.45 / 0.6, a = [0.59719 * r + 0.35458 * g + 0.04823 * b, 0.076 * r + 0.90834 * g + 0.01566 * b, 0.0284 * r + 0.13383 * g + 0.83777 * b].map((x) => x * k);
  const t = a.map((x) => (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.432951) + 0.238081));
  return [1.60475 * t[0] - 0.53108 * t[1] - 0.07367 * t[2], -0.10208 * t[0] + 1.10813 * t[1] - 0.00605 * t[2], -0.00327 * t[0] - 0.07276 * t[1] + 1.07602 * t[2]];
};
const shownAs = new Map();
const shown = (c) => {
  if (shownAs.has(c)) return shownAs.get(c);
  const want = [c >> 16, (c >> 8) & 255, c & 255].map((v) => v / 255);
  let v = [...want];
  for (let i = 0; i < 40; i++) { const got = aces(v.map(lin)).map(srgb); v = v.map((x, j) => Math.min(1, Math.max(0, x + (want[j] - got[j]) * 0.7))); }
  const out = (Math.round(v[0] * 255) << 16) | (Math.round(v[1] * 255) << 8) | Math.round(v[2] * 255);
  shownAs.set(c, out);
  return out;
};
// A rod along a path of [x, y, z] points, radius r, joined round.
const path = (k, pts, r, paint, opts = {}) => { for (let i = 1; i < pts.length; i++) k.cyl(pts[i - 1], pts[i], r, paint, { caps: true, ...opts }); };
// A ring of rod round [x, y, z]: radius R, the rod r thick, facing the front ("xy") or lying flat ("xz").
const ring = (k, [x, y, z], R, r, plane, paint, opts) => {
  const flat = plane === "xz", m = R + r;
  return k.shape(x - m, y - (flat ? r : m), z - (flat ? m : r), x + m, y + (flat ? r : m), z + (flat ? r : m), (a, b, c) => {
    const u = a - x, v = flat ? c - z : b - y, w = flat ? b - y : c - z;
    return (Math.hypot(u, v) - R) ** 2 + w * w <= r * r + 0.01;
  }, paint, opts);
};
// A candle flame: a teardrop of light on the wick, pale in the middle and deeper orange at its foot and tip.
const flame = (k, x, z, y0, h, w) => k.lathe(x, z, y0, y0 + h, [[0, w * 0.45], [0.25, w], [0.55, w * 0.8], [0.85, w * 0.3], [1, 0.05]], (px, py) => {
  const t = (py - y0) / h;
  return t < 0.15 ? 0xffb347 : t < 0.55 ? 0xfff2c4 : t < 0.8 ? 0xffd060 : 0xffa236;
}, { glow: true });
// The art's own pixels (null where clear). The kit doesn't hand them out, but
// extrude's `where` sees every opaque one, so a pass that fills nothing collects them.
// Turned metal coloured row by row from the art between x0 and x1, so its rings
// and steps keep their light and dark all the way round, drawn towards a metal tone.
const turnedArt = (k, x0, x1, tone, t = 0.45) => {
  const rows = new Map();
  return (x, y, z) => {
    const j = Math.floor(y);
    if (!rows.has(j)) rows.set(j, k.mix(k.avg(x0, j, x1, j + 1), tone, t));
    return k.scale(rows.get(j), 0.94 + speck(x * 2, y * 2, z * 2) * 0.12);
  };
};
const pixelsOf = (k) => {
  const seen = new Map();
  k.extrude(0, k.D, 0, { where: (c, x, y) => { seen.set(y * 4096 + x, c); return false; } });
  return (x, y) => seen.get(Math.floor(y) * 4096 + Math.floor(x)) ?? null;
};

export default {
  // A three-light candelabrum in dark wrought iron: a stepped round foot, a
  // turned baluster stem, and two S-scrolled arms in one plane, each with a
  // curl above it and a drop beneath, out to a cup and drip pan. The candles
  // are wax, run with drips, glowing round the wick; the flames glow. Built at
  // three voxels to two pixels, as so much of it is thin rod.
  d01: {
    depth: 28, res: 1.5,
    build(k) {
      const X = 23, Z = 14, iron = k.vary(0x2c2019, 0.14), forged = k.layers({ top: k.vary(0x55402c, 0.1), other: iron, depth: 0.7 });
      // Wax lit by its flame: deep amber at the cup, honey up the side, pale gold at the rim.
      const wax = (y0, top, lift = 0) => (x, y, z) => {
        const t = Math.min(1, Math.max(0, (y - y0) / (top - y0)) + lift);
        return shown(k.scale(t < 0.6 ? k.mix(0x9a5a2a, 0xd4944c, t / 0.6) : k.mix(0xd4944c, 0xf2c070, (t - 0.6) / 0.4), 0.95 + speck(x * 2, y * 2, z * 2) * 0.08));
      };
      // The foot: a moulded edge on a flat plinth, a beaded ring, and a dome up to the stem.
      k.lathe(X, Z, 0, 9.5, (t) => { const y = t * 9.5; return y < 0.8 ? 11 : y < 1.3 ? 11.6 : y < 3.2 ? 12.4 : y < 3.8 ? 10.8 : y < 5 ? 10.2 : y < 5.6 ? 9.4 : 9.4 - (y - 5.6) * 1.6; }, forged, { max: 12.4, part: 1 });
      // The stem: a collar, a vase-turned knop, a ring, the hub the arms spring from, another ring.
      k.lathe(X, Z, 9.5, 33, [[0, 3.2], [0.04, 3.4], [0.08, 2.4], [0.18, 3.3], [0.28, 2.2], [0.34, 1.6], [0.38, 2.7], [0.43, 2.7], [0.46, 1.6], [0.57, 1.7], [0.6, 2.9], [0.74, 2.9], [0.78, 1.6], [0.88, 1.8], [0.91, 2.5], [0.95, 2.5], [0.97, 1.8], [1, 2.2]], forged, { part: 1 });
      // A cup and drip pan on the stem for the tall middle candle, and one at the end of each arm.
      const cup = (x, y) => {
        k.lathe(x, Z, y - 4.5, y - 1, [[0, 1.8], [0.15, 2.6], [0.4, 3.4], [1, 4.4]], forged, { part: 1 });
        k.lathe(x, Z, y - 1.5, y, [[0, 4], [0.4, 6.2], [1, 6.4]], forged, { part: 1 });
        k.carve(x - 4, y - 0.6, Z - 4, x + 4, y + 1, Z + 4, (px, py, pz) => Math.hypot(px - x, pz - Z) < 5.4 && Math.hypot(px - x, pz - Z) > 4.3);
      };
      cup(X, 37);
      k.sym((S) => {
        cup(S(6), 32.5);
        k.ball(S(6), 26.6, Z, 2.4, 1.6, 2.4, forged, { part: 1 });
        // The arm: out from the hub, down through a low bow and up into the cup.
        path(k, [[S(21.5), 25.5, Z], [S(18), 23.8, Z], [S(14), 21.8, Z], [S(10.5), 20.6, Z], [S(7.6), 21.2, Z], [S(6), 23.2, Z], [S(6), 25.6, Z]], 1.3, forged, { part: 1 });
        // A C-scroll above it from the stem, curling down at its end, and a smaller curl off the bow.
        path(k, [[S(21.5), 29.5, Z], [S(18.5), 30.6, Z], [S(15.6), 30], [S(14), 28], [S(14.5), 25.9], [S(16.2), 25.4], [S(17.2), 26.6], [S(16.3), 27.6]].map((p) => [p[0], p[1], Z]), 0.8, forged, { part: 1 });
        path(k, [[S(11), 21.4, Z], [S(10.4), 23.8, Z], [S(11.4), 25.6, Z], [S(12.8), 25.4, Z], [S(12.8), 24.2, Z]], 0.7, forged, { part: 1 });
        // A drop hanging under the bow.
        k.lathe(S(10), Z, 17.6, 20.6, [[0, 0.2], [0.45, 1.1], [1, 0.7]], forged, { part: 1 });
      });
      // The candles, each burnt to its own height: wax run with drips, warm and
      // translucent at the rim round the wick, a black wick and a flame.
      for (const [x, y0, top] of [[X, 37, 51], [6, 32.5, 45.5], [40, 32.5, 44.5]]) {
        k.lathe(x, Z, y0 - 0.5, top, 3.9, (px, py, pz) => (py > top - 0.8 ? shown(0xf8d890) : wax(y0, top)(px, py, pz)), { glow: true });
        for (let j = 0; j < 5; j++) {
          const a = x * 0.3 + j * 1.27 + speck(x, j, 3) * 0.8, len = 2 + speck(j, x, 9) * 6.5, at = (r, y) => [x + Math.sin(a) * r, y, Z + Math.cos(a) * r];
          k.cyl(at(3.9, top - 0.5), at(4.1, top - len), [0.9, 0.7], wax(y0, top, 0.12), { caps: true, glow: true });
        }
        k.carve(x - 2.6, top - 0.7, Z - 2.6, x + 2.6, top + 1, Z + 2.6, (px, py, pz) => Math.hypot(px - x, pz - Z) < 2.6);
        k.cyl([x, top - 0.8, Z], [x, top + 0.9, Z], 0.45, 0x1c120c);
        flame(k, x, Z, top + 0.5, x === X ? 8.5 : 7, x === X ? 2.2 : 1.9);
      }
    },
  },
  // A brass floor lamp: a round stepped foot, a slim turned stem, and on it a
  // crescent moon, bevelled thick in the middle of its band and thin at the
  // edges, whose top horn holds a chain and a glass globe that glows, a brass
  // star on its glass and caps top and bottom.
  d02: {
    depth: 20, res: 1.5,
    build(k) {
      const X = 12.5, Z = 10, gold = 0xb88c44, brass = k.vary(gold, 0.08), turned = turnedArt(k, 11, 14.5, gold, 0.5);
      // The foot, the stem and its knops.
      k.lathe(X, Z, 0, 9.5, (t) => { const y = t * 9.5; return y < 1 ? 8.6 : y < 2.6 ? 9.2 : y < 3.4 ? 8 : y < 4.2 ? 7.2 : Math.max(2.2, 7.2 - (y - 4.2) * 1.15); }, turned, { max: 9.2 });
      k.lathe(X, Z, 9.5, 33.5, [[0, 2.3], [0.05, 2.3], [0.06, 1.3], [0.68, 1.3], [0.7, 1.9], [0.74, 1.9], [0.76, 1.3], [0.84, 1.6], [0.9, 2.3], [0.96, 2], [1, 1.6]], turned);
      // The crescent: the band between two circles, its depth swelling from the edges to the middle of the band.
      const out = [14, 47.5, 14.5], inn = [17.6, 48.6, 11];
      k.shape(0, 32.5, Z - 3, 22.5, 62, Z + 3, (x, y, z) => {
        const a = out[2] - Math.hypot(x - out[0], y - out[1]), b = Math.hypot(x - inn[0], y - inn[1]) - inn[2];
        if (a < 0 || b < 0 || (y > 58 && x > 21.5)) return false;
        return Math.abs(z - Z) <= 0.7 + 1.5 * Math.min(1, Math.min(a, b) / 2.6);
      }, (x, y, z) => k.mix(k.at(x, y), gold, 0.25 + 0.35 * Math.min(1, Math.abs(z - Z) / 2)), { part: 2 });
      // The lantern on its chain from the horn: a hook, links, the top cap and its finial.
      const L = [20.5, 44.5];
      k.cyl([21, 61.2, Z], [21, 59, Z], 0.6, brass);
      for (let i = 0; i < 3; i++) {
        const y = 58.6 - i * 1.9, flat = i % 2 === 0;
        k.shape(L[0] - 1.4, y - 2.4, Z - 1.4, L[0] + 1.4, y + 0.2, Z + 1.4, (x, yy, z) => {
          const u = flat ? x - L[0] : z - Z, w = flat ? z - Z : x - L[0], e = Math.hypot(u, (yy - y + 1.1) / 1.25);
          return Math.abs(w) < 0.4 && e < 1.05 && e > 0.4;
        }, brass);
      }
      k.lathe(L[0], Z, 50, 53.2, [[0, 3.6], [0.35, 3.4], [0.6, 2.2], [0.8, 1.2], [1, 1.5]], k.layers({ top: k.vary(0xe0b460, 0.06), other: brass, depth: 0.7 }));
      k.lathe(L[0], Z, 36.4, 38.6, [[0, 0.6], [0.4, 1.6], [1, 3]], brass);
      // The globe, glowing: brightest through its middle, a deeper amber round
      // its edge, and a brass star of four long points and four short on its glass.
      const star = (x, y) => {
        const u = x - L[0], v = y - L[1], r = Math.hypot(u, v);
        return r < 1.2 || (r < 4.8 * (1 - Math.min(Math.abs(u), Math.abs(v)) / 1.1) && Math.min(Math.abs(u), Math.abs(v)) < 0.9) || (r < 3.2 && Math.abs(Math.abs(u) - Math.abs(v)) < 0.55);
      };
      k.ball(L[0], L[1], Z, 6.6, 6.2, 6.6, (x, y) => {
        if (star(x, y)) return shown(0xb8701e);
        const r = Math.min(1, Math.hypot((x - L[0]) / 6.6, (y - L[1]) / 6.2));
        return shown(k.mix(k.mix(0xfae69a, 0xf4b048, Math.min(1, r * 1.3)), 0xd2702a, Math.max(0, r - 0.68) / 0.32));
      }, { glow: true });
    },
  },
  // A pumpkin of amber glass in a bronze cage, lit from within: ten lobes, a
  // rib of the cage down every groove, iron vines and leaves standing proud on
  // the glass, a pierced crown with a lid over the shoulders, a knob, a ring
  // handle and tendrils curling off it. The glass glows, brightest through the
  // middle of each lobe and deepest in the grooves.
  d03: {
    depth: 56,
    build(k) {
      const cx = 28.5, cz = 28, y0 = 2.2, y1 = 39, bronze = k.vary(0x5a3c1e, 0.12), cast = k.layers({ top: k.vary(0x9c7444, 0.1), other: bronze, depth: 0.8 });
      const prof = [[0, 10], [0.08, 17.5], [0.22, 24], [0.45, 27.4], [0.62, 27], [0.8, 23], [0.92, 17], [1, 12]];
      const lobe = (x, z) => Math.abs(Math.sin(Math.atan2(x - cx, z - cz) * 5));          // 1 mid-lobe, 0 in a groove
      const radius = (y) => { const t = (y - y0) / (y1 - y0); for (let i = 1; i < prof.length; i++) if (t <= prof[i][0]) { const [t0, a] = prof[i - 1], [t1, b] = prof[i]; return a + (b - a) * ((t - t0) / (t1 - t0)); } return prof[prof.length - 1][1]; };
      const rAt = (x, y, z) => radius(y) * (1 - 0.09 * (1 - lobe(x, z)) ** 1.6);
      const hot = 0xffe49a, bright = 0xf8a038, mid = 0xdc661a, deep = 0x8a300a;
      // The glass: by lobe and height, with the candle's hot spot behind the front lobes.
      k.shape(cx - 28, y0, cz - 28, cx + 28, y1, cz + 28, (x, y, z) => Math.hypot(x - cx, z - cz) <= rAt(x, y, z), (x, y, z) => {
        const t = (y - y0) / (y1 - y0), h = Math.sin(Math.PI * Math.min(1, Math.max(0, t * 1.1 - 0.02))), l = lobe(x, z) ** 0.7;
        let c = k.mix(deep, mid, Math.min(1, l * h * 1.4));
        c = k.mix(c, bright, Math.max(0, l * h - 0.45) * 1.3);
        const s = Math.exp(-(((x - cx + 1.5) / 8) ** 2) - (((y - 20) / 8) ** 2)) * (z > cz ? 1 : 0.5);
        return shown(k.scale(k.mix(c, hot, s * 0.8), 0.95 + speck(x, y * 1.3, z) * 0.08));
      }, { glow: true });
      // A vine up the middle of every lobe, as the art draws them: a wavering
      // stem standing a pixel proud of the glass, with leaves in turn either side.
      const vineCol = k.layers({ top: k.vary(0x7a6034, 0.1), other: k.vary(0x4a3820, 0.12), depth: 0.8 }), leaves = [];
      for (let i = 0; i < 10; i++) {
        const mid = ((i + 0.5) * Math.PI) / 5, at = (y) => mid + 0.11 * Math.sin(y * 0.42 + i * 1.7);
        for (let n = 0, y = 8.5 + (i % 3) * 1.5; y < 30; y += 6, n++) leaves.push({ lobe: i, at, y, side: (n + i) % 2 ? 1 : -1 });
      }
      k.shape(cx - 29, y0, cz - 29, cx + 29, y1, cz + 29, (x, y, z) => {
        const r = Math.hypot(x - cx, z - cz), R = rAt(x, y, z);
        if (r <= R - 0.2 || r > R + 1.3 || y < 5 || y > 34) return false;
        const a = Math.atan2(x - cx, z - cz), i = Math.floor((((a / Math.PI) * 5) % 10 + 10) % 10), mid = ((i + 0.5) * Math.PI) / 5;
        let d = a - mid; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
        const wave = 0.11 * Math.sin(y * 0.42 + i * 1.7);
        if (y < 32 && Math.abs(d - wave) * r < 0.7) return true;
        return leaves.some((l) => {
          if (l.lobe !== i) return false;
          const u = (d - (l.at(l.y) - mid)) * r - l.side * 3, v = y - l.y - 1.4, c = 0.8, s_ = 0.6 * l.side;
          const p = u * c + v * s_, q = -u * s_ + v * c;
          return (p / 3.3) ** 2 + (q / 2.1) ** 2 <= 1 && Math.abs(q) > 0.25;
        });
      }, vineCol);
      // The cage: a rib down every groove, a band at the shoulder, and a footed ring underneath.
      k.shape(cx - 29.5, y0, cz - 29.5, cx + 29.5, y1, cz + 29.5, (x, y, z) => {
        const r = Math.hypot(x - cx, z - cz), R = radius(y) * 0.91, a = Math.atan2(x - cx, z - cz), off = Math.abs(((a * 5) / Math.PI + 0.5) % 1 - 0.5) * (Math.PI / 5) * r;
        return off < 1 && r > R - 0.5 && r <= R + 1.4;
      }, k.layers({ top: k.vary(0xb08a50, 0.1), other: k.vary(0x6a4a24, 0.12), depth: 0.8 }));
      k.lathe(cx, cz, 0, 3.2, [[0, 10], [0.4, 11.2], [0.7, 11], [1, 12.5]], cast);
      // The crown: a lid over the shoulders with a rolled rim, a collar pierced
      // with arched windows onto the light, a cap, a knob and the ring.
      k.lathe(cx, cz, 35.8, 42.6, [[0, 16.6], [0.15, 17.2], [0.28, 15.6], [0.6, 12], [0.9, 8], [1, 7]], cast);
      k.carve(cx - 17, 37.2, cz - 17, cx + 17, 40, cz + 17, (x, y, z) => Math.hypot(x - cx, z - cz) > rAt(x, y, z) + 0.2 && Math.abs(((Math.atan2(x - cx, z - cz) * 8) / Math.PI) % 1) > 0.45);
      k.lathe(cx, cz, 42.4, 48, 6.2, cast);
      k.lathe(cx, cz, 42.4, 47.6, 4.8, shown(0xf8b850), { glow: true });
      k.carve(cx - 7, 43.6, cz - 7, cx + 7, 47, cz + 7, (x, y, z) => {
        const a = Math.atan2(x - cx, z - cz), u = Math.abs(((a * 4) / Math.PI) % 1 - 0.5) * 2, r = Math.hypot(x - cx, z - cz);
        return r > 5 && u < 0.62 - Math.max(0, y - 45.6) * 0.5;
      });
      k.lathe(cx, cz, 47.6, 49.6, [[0, 7.4], [0.5, 7.2], [1, 6]], cast);
      k.lathe(cx, cz, 49.4, 52, [[0, 5.2], [0.6, 3.4], [1, 1.8]], cast);
      k.ball(cx, 53, cz, 1.9, 1.6, 1.9, cast);
      ring(k, [cx + 1.5, 57.8, cz], 3.4, 1.05, "xy", cast);
      // Tendrils of wire curling off the lid, a long one to the right and a short one to the left.
      path(k, [[38, 39.5, cz + 6], [40.5, 43, cz + 7], [43.5, 45.6, cz + 7.5], [46.6, 46.2, cz + 7.5], [48.4, 44.4, cz + 7], [47.6, 42.2, cz + 7], [45.6, 42.4, cz + 7], [45.6, 44, cz + 7]], 0.65, cast);
      path(k, [[20, 40.5, cz + 10], [18.6, 43.2, cz + 10.5], [16.8, 44.4, cz + 10.5], [15.6, 43.2, cz + 10.5], [16.6, 42.2, cz + 10.5]], 0.6, cast);
    },
  },
  // A banker's lamp in brass: a stepped round foot with a cord looping off it,
  // a turned knop, a swan-neck arm up and over to a hinge, and an oblong shade
  // of emerald glass with a brass rim, lit: the glass glows green with its gold
  // flowers, its lining glows warm round the bulb, and a bead chain hangs from the switch.
  d05: {
    depth: 32, res: 1.5,
    build(k) {
      const X = 18.5, Z = 16, gold = 0xb08640, brass = k.layers({ top: k.vary(0xd8aa58, 0.06), other: k.vary(gold, 0.08), depth: 0.7 }), turned = turnedArt(k, 15, 23, gold, 0.5);
      // The foot: a flat edge, two steps and a dome up to a fluted neck and the knop.
      k.lathe(X, Z, 0, 26.5, (t) => {
        const y = t * 26.5;
        return y < 1.4 ? 14.4 : y < 3.2 ? 15 : y < 3.8 ? 14 : y < 5.4 ? 13.6 : y < 6 ? 12.6 : y < 14 ? 12.6 - (y - 6) * 1.15 : y < 15 ? 3.2 : y < 19.2 ? 2.6 : y < 20 ? 4 : y < 24 ? 4.6 : y < 25 ? 3.2 : 2.2;
      }, turned, { max: 15 });
      // The swan neck, with a collar part-way and a knuckle at its elbow.
      const arm = [[18.6, 25.5], [19.1, 29.4], [17.6, 33.2], [14.8, 35.8], [11, 37.8], [7.6, 39.6], [5.2, 42.6], [4, 46.4], [4.4, 50.4], [6.4, 53.8], [9.4, 56.4], [13, 58], [17, 58.8], [22, 58.6]];
      path(k, arm.map(([x, y]) => [x, y, Z]), 1.4, brass);
      k.cyl([10.3, 36.4, Z], [8.6, 39.2, Z], 2.1, brass);
      k.cyl([4.2, 47, Z], [4.6, 50.6, Z], 2.2, brass);
      k.ball(23.6, 58.2, Z, 2.4, 2.2, 2.4, brass);
      // The shade: half an ellipsoid of green glass, hollow, its colour carried
      // straight through from the art so the floral band runs all round.
      const S = [31, 40, Z], rx = 19.5, ry = 17.4, rz = 11.5, e = (x, y, z, d) => ((x - S[0]) / (rx - d)) ** 2 + ((y - S[1]) / (ry - d)) ** 2 + ((z - S[2]) / (rz - d)) ** 2;
      k.shape(S[0] - rx, S[1], Z - rz, S[0] + rx, S[1] + ry, Z + rz, (x, y, z) => e(x, y, z, 0) <= 1 && e(x, y, z, 1.4) > 1, (x, y) => shown(k.at(x, Math.max(41.5, y))), { glow: true });
      k.shape(S[0] - rx, S[1], Z - rz, S[0] + rx, S[1] + ry, Z + rz, (x, y, z) => e(x, y, z, 1.4) <= 1 && e(x, y, z, 2.1) > 1, 0xffe9b8, { glow: true });
      // The rim: a brass band round the shade's edge, rolled a little proud.
      k.shape(S[0] - rx - 1, 38.6, Z - rz - 1, S[0] + rx + 1, 41.2, Z + rz + 1, (x, y, z) => {
        const o = ((x - S[0]) / (rx + 0.5)) ** 2 + ((z - Z) / (rz + 0.5)) ** 2, i = ((x - S[0]) / (rx - 1.4)) ** 2 + ((z - Z) / (rz - 1.4)) ** 2;
        return o <= 1 && i > 1;
      }, brass);
      // The bulb in its socket, and the bead chain from the switch.
      k.lathe(S[0], Z, 46, 52, [[0, 2.2], [1, 1.6]], brass);
      k.ball(S[0], 43, Z, 3.2, 3.6, 3.2, 0xfff4d0, { glow: true });
      for (let y = 38.8; y > 26.5; y -= 1.3) k.ball(39.2, y, Z + 6, 0.55, 0.55, 0.55, brass);
      k.ball(39.2, 25.6, Z + 6, 1.3, 1.5, 1.3, brass);
      // The cord, out of the foot at the back and round in a loop on the floor.
      path(k, [[6, 5, Z - 3], [2.2, 6.4, Z - 1], [0.9, 4, Z - 3], [1.6, 1, Z - 8], [5, 0.9, Z - 12.5], [11, 0.9, Z - 14.5]], 0.9, k.vary(0x2a1c14, 0.1));
    },
  },
  // A bottle of night with a ghost in it. The glass is a thick bottle with
  // rounded corners and shoulders, its front left open to show what is inside
  // (solid voxels can't be seen through): the night sky on the glass all
  // round, stars and sparkles in the air, ferns on a mossy floor, and the ghost
  // floating in the middle, glowing. A cork in the neck, twine round it, and a
  // moon charm and an autumn leaf hanging off the shoulder.
  d06: {
    depth: 26,
    build(k) {
      const cx = 19.5, Z = 13, px = pixelsOf(k);
      // The bottle's half-width, half-depth and corner radius at height y: a body, shoulders, a neck.
      const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
      const dims = (y) => { const t = smooth((y - 37) / 10); return [18 - 10.4 * t, 11 - 3.4 * t, 3.5 + 4.1 * t]; };
      const inBottle = (x, y, z, d) => {
        if (y < 0.6 + d || y > 53) return false;
        const [hw, hd, rc] = dims(y), lift = y < 3.6 ? 3 - (y - 0.6) : 0, r = Math.max(0.5, rc - d), w = hw - d - lift * 0.4, dd = hd - d - lift * 0.4;
        const ax = Math.max(0, Math.abs(x - cx) - (w - r)), az = Math.max(0, Math.abs(z - Z) - (dd - r));
        return ax * ax + az * az <= r * r;
      };
      // The night through the glass: deep navy, lighter towards the top, with a glassy sheen on the outside.
      const night = (sheen) => (x, y, z) => k.mix(k.mix(0x121830, 0x26305a, Math.min(1, Math.max(0, y / 44)) * 0.7 + speck(x * 1.3, y * 1.1, z * 1.7) * 0.2), 0x5a6278, sheen);
      const front = (x, y) => Math.abs(x - cx) < 14.6 && y > 3.4 && y < 37, open = (x, y, z) => front(x, y) && z > Z + 6;
      k.shape(cx - 19, 0, Z - 12, cx + 19, 53, Z + 12, (x, y, z) => inBottle(x, y, z, 0) && (!inBottle(x, y, z, 2) || y > 47) && !open(x, y, z), (x, y, z) => night(inBottle(x, y, z, 1) && y < 47 ? 0 : 0.3)(x, y, z), { part: 1 });
      // Stars in the glass, thick on the inside and a few showing through outside.
      k.shape(cx - 19, 0, Z - 12, cx + 19, 47, Z + 12, (x, y, z) => inBottle(x, y, z, 0) && !inBottle(x, y, z, 2) && !open(x, y, z) && speck(x * 3.1, y * 2.7, z * 3.3) < (inBottle(x, y, z, 1) ? 0.05 : 0.012), (x, y, z) => [0xfff6d8, 0x9ae8ff, 0xd8b8ff, 0xffd890][Math.floor(speck(x, z, y) * 4)], { glow: true });
      // The glass's cut edge round the opening, and glints of light down the front corner and over the shoulder.
      k.shape(cx - 19, 3, Z + 6, cx + 19, 38, Z + 12, (x, y, z) => inBottle(x, y, z, 0) && !inBottle(x, y, z, 2) && !open(x, y, z) && (Math.abs(Math.abs(x - cx) - 14.6) < 1 || Math.abs(y - 37.5) < 0.9 || Math.abs(y - 3) < 0.9), 0x3e465e);
      for (const [x0, y0, x1, y1] of [[cx - 17, 7, cx - 15.6, 33], [cx - 16, 38, cx - 9, 41]]) k.shape(x0, y0, Z + 4, x1, y1, Z + 12, (x, y, z) => inBottle(x, y, z, 0) && !inBottle(x, y, z, 0.9), 0xa8b4d0);
      // Two streaks of light where the front glass would catch it, so the opening reads as glass.
      for (const [a, b] of [[[cx + 6, 36], [cx + 13.5, 27]], [[cx + 9.5, 36], [cx + 13.5, 31]]]) k.cyl([a[0], a[1], Z + 10.4], [b[0], b[1], Z + 10.4], 0.45, 0xc4d0ec);
      // The neck's lip, the cork in it, and twine wound three times round the neck with a knot.
      k.lathe(cx, Z, 50.5, 55.5, [[0, 8], [0.3, 8.5], [0.7, 8.5], [1, 7.6]], k.layers({ top: 0x8a94ac, other: 0x4c5670, depth: 0.8 }));
      k.lathe(cx, Z, 55, 61.5, [[0, 6.2], [0.8, 6.8], [1, 6.2]], k.mottle(14, 56, 26, 61, { trim: 0.2, amount: 0.6 }));
      const twine = (x, y, z) => ((Math.atan2(x - cx, z - Z) * 6 + y * 2) % 2 < 1 ? 0x8a5a2a : 0x5e3a1a);
      for (const y of [45.6, 47.3, 49]) ring(k, [cx, y, Z], 8.2 + (49 - y) * 0.15, 0.95, "xz", twine);
      k.ball(27.5, 46.5, Z + 5, 1.6, 1.6, 1.6, twine);
      // The cord off the knot, down over the shoulder to the moon charm and the leaf.
      path(k, [[27.5, 46.5, Z + 5], [30.2, 43.8, Z + 7.6], [32.6, 40.6, Z + 9.6], [34, 37.8, Z + 11.2], [36.2, 36.6, Z + 11.6], [39.6, 36, Z + 11.4]], 0.6, twine);
      k.extrude(Z + 11.4, Z + 12.8, k.vary(0xe0a848, 0.06), { rect: [30, 29, 36.5, 38], where: (c) => (c >> 16) > 150 && (c >> 16) > (c & 255) * 1.6 });
      k.extrude(Z + 9.6, Z + 10.8, "art", { rect: [36.5, 17, 46, 36], round: 0.5, where: (c) => (c >> 16) > 70 && (c >> 16) > ((c >> 8) & 255) * 1.25 });
      // The floor of moss with ferns in it, and sparkles drifting up through the dark.
      k.shape(cx - 17, 2, Z - 10, cx + 17, 4.6, Z + 10, (x, y, z) => inBottle(x, y, z, 1.6) && y < 3.2 + speck(x, 0, z) * 1.4, (x, y, z) => k.mix(0x2e1c2a, 0x5a3424, speck(x * 2, y, z * 2)));
      for (const [x, z, h, lean] of [[6, Z + 4, 11, -1], [10, Z - 4, 14, 1], [14.5, Z + 5.5, 8, -0.5], [27, Z + 4, 9, 1], [31, Z - 3, 13, 1.2], [33.5, Z + 5, 10, 0.6], [23, Z - 6, 12, -0.8]]) {
        const col = k.mix(0x7a4a64, 0x8a4a2e, speck(x, z, 1)), at = (t) => [x + lean * 3 * t * t, 3 + h * t, z];
        path(k, [at(0), at(0.35), at(0.7), at(1)], 0.5, col);
        for (let t = 0.2; t < 0.95; t += 0.14) {
          const [sx, sy] = at(t), len = 2.6 * (1.1 - t);
          for (const side of [-1, 1]) k.cyl([sx, sy, z], [sx + side * len, sy + len * 0.5, z + side * 0.6], 0.5, k.scale(col, 0.85 + speck(t * 9, side, x) * 0.3));
        }
      }
      for (let i = 0; i < 26; i++) {
        const x = cx - 15 + speck(i, 1, 7) * 30, y = 4 + speck(i, 2, 7) ** 1.6 * 34, z = Z - 8 + speck(i, 3, 7) * 15, big = i < 4;
        const c = [0xffc060, 0xc890ff, 0x9ae8ff, 0xfff0d0][i % 4];
        k.box(x - 0.5, y - 0.5, z - 0.5, x + 0.5, y + 0.5, z + 0.5, c, { glow: true });
        if (big) { k.box(x - 1.5, y - 0.5, z - 0.5, x + 1.5, y + 0.5, z + 0.5, c, { glow: true }); k.box(x - 0.5, y - 1.5, z - 0.5, x + 0.5, y + 1.5, z + 0.5, c, { glow: true }); }
      }
      // The ghost: its outline from the art (holes for the eyes and mouth filled),
      // puffed out front and back like a pillow, and glowing.
      const pale = (x, y) => { const c = px(x, y); return c !== null && y > 10.5 && x < 34 && lum(c) >= 140 && (c & 255) >= 180; };
      const ghost = (x, y) => pale(x, y) || ([1, 2, 3].some((d) => pale(x - d, y)) && [1, 2, 3].some((d) => pale(x + d, y)) && [1, 2, 3].some((d) => pale(x, y - d)) && [1, 2, 3].some((d) => pale(x, y + d)));
      k.extrude(Z - 6.5, Z + 6.5, (x, y) => shown(k.mix(k.at(x, y), 0xa8c8f8, 0.15)), { rect: [6, 10, 35, 35], where: (c, x, y) => ghost(x + 0.5, y + 0.5), round: 5.5, glow: true });
    },
  },
};
