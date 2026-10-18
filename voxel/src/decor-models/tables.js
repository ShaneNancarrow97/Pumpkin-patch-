// Tables and desks: f07 carved coffee table, f08 brass tea table, f09 gothic writing desk, f10 harvest dining table.
// The art draws them in three-quarter view from above, so each is built square
// to the room and painted part by part from where that part is in the art.

// Wood grain: a colour that streaks along x (or z) in runs of `len` voxels.
const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const grain = (k, c, { len = 6, amount = 0.1, along = "x" } = {}) => (x, y, z) => {
  const i = Math.floor(x), j = Math.floor(y), l = Math.floor(z);
  return k.scale(c, 1 + (along === "x" ? hash(Math.floor((i + 7 * hash(0, j, l)) / len), j, l) : hash(i, j, Math.floor((l + 7 * hash(i, j, 0)) / len))) * 2 * amount - amount);
};

// A rod along a path of [x, y, z, r] points, joined round: cabriole legs and the like.
const path = (k, pts, paint, opts = {}) => { for (let i = 1; i < pts.length; i++) k.cyl(pts[i - 1].slice(0, 3), pts[i].slice(0, 3), [pts[i - 1][3], pts[i][3]], paint, { caps: true, ...opts }); };
// Turned work with its profile as [y, r] pairs at real heights, read straight off the art.
const turn = (k, x, z, pts, paint, opts) => { const y0 = pts[0][0], y1 = pts[pts.length - 1][0]; return k.lathe(x, z, y0, y1, pts.map(([y, r]) => [(y - y0) / (y1 - y0), r]), paint, opts); };

// The art's own pixels (null where clear). The kit doesn't hand them out, but
// extrude's `where` sees every opaque one, so a pass that fills nothing collects them.
const pixelsOf = (k) => {
  const seen = new Map();
  k.extrude(0, 1, 0, { where: (c, x, y) => { seen.set(y * 4096 + x, c); return false; } });
  return (x, y) => seen.get(Math.floor(y) * 4096 + Math.floor(x)) ?? null;
};

export default {
  // An oval coffee table in dark carved wood: the top with a moulded rim and an
  // inlaid border, a carved apron scalloped below with the gold crescent at the
  // front, and four cabriole legs set at its corners.
  f07: {
    depth: 34,
    build(k) {
      const W = k.W, D = 34, cx = W / 2, cz = D / 2, top = k.avg(10, 26, 50, 31), gold = k.vary(0xb48c5c, 0.1);
      const leg = k.shade(k.mottle(9.5, 1, 14, 11, { trim: 0.2, amount: 0.7 }), 1.5), oval = (x, z, rx, rz) => Math.hypot((x - cx) / rx, (z - cz) / rz);
      // The top: a lip below the rim, the rim's bevel catching the light, an inlaid line inside it.
      const wood = grain(k, top, { len: 8, amount: 0.1 }), side = k.vary(k.scale(top, 0.66), 0.06);
      k.shape(0, 21, 0, W, 24, D, (x, y, z) => oval(x, z, y < 22 ? 29.6 : 30.6, y < 22 ? 15.8 : 16.6) <= 1, (x, y, z) => {
        const r = oval(x, z, 30.6, 16.6);
        if (y < 23) return side(x, y, z);
        if (r > 0.93) return k.scale(top, 1.15);
        if (r > 0.8 && r < 0.86) return k.scale(top, 0.62);
        return wood(x, y, z);
      });
      // The apron: an oval band of carving (the art's, all round, centred on the
      // crescent), dropping in scallops below and to a point under the moon.
      const lower = (x, z) => { const a = Math.atan2((x - cx) / 27.5, (z - cz) / 13.5), b = Math.PI - Math.abs(a); return 13 - 1.1 * Math.abs(Math.sin(a * 4)) - 2.2 * Math.exp(-((a / 0.16) ** 2)) - 2.2 * Math.exp(-((b / 0.16) ** 2)); };
      k.shape(cx - 27.6, 10, cz - 13.6, cx + 27.6, 21, cz + 13.6, (x, y, z) => { const r = oval(x, z, 27.5, 13.5), r2 = oval(x, z, 25.8, 11.8); return r <= 1 && r2 >= 1 && y >= lower(x, z); }, k.tex(6, 10.5, 62, 21));
      // The crescent, standing proud of the carving.
      k.shape(26, 11, cz + 12.8, 36, 21, cz + 14.4, (x, y) => Math.hypot(x - cx, y - 15.8) <= 3.9 && Math.hypot(x - cx - 1.7, y - 17.3) > 3.1, gold);
      // Cabriole legs: out at the knee under the apron, in at the ankle, out to a pad foot.
      for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const x = cx + sx * 19.4, z = cz + sz * 9.5, ox = sx * 0.83, oz = sz * 0.55;
        const at = (o, y, r) => [x + o * ox, y, z + o * oz, r];
        path(k, [at(-0.5, 21, 2.7), at(2.2, 17, 3), at(1.4, 12.5, 2.3), at(-0.6, 7.5, 1.7), at(-0.7, 3.5, 1.5), at(0.6, 1.4, 1.7)], leg, { part: 9 });
        k.ball(x + ox * 0.9, 1, z + oz * 0.9, 2.2, 1, 2.2, k.shade(leg, 0.9), { part: 9 });
        k.ball(x + ox * 2.4, 17.4, z + oz * 2.4, 1.3, 1.6, 1.3, gold);
      }
    },
  },
  // A round tea table on a turned pedestal: the top rimmed in brass with a vine
  // inlaid round it, a pierced gothic skirt with drops and long pendants, and
  // three legs curving out to lion's paws.
  f08: {
    depth: 54,
    build(k) {
      const W = k.W, D = 54, cx = W / 2, cz = D / 2, top = k.avg(8, 53, 46, 60), brass = k.vary(0x80562e, 0.08), bright = k.vary(0xa27a46, 0.06), inlay = k.vary(k.mix(top, 0xc49a5c, 0.38), 0.08);
      const bronze = k.shade(k.mottle(2, 40, 52, 49, { trim: 0.25, amount: 0.6 }), 1.4), r = (x, z) => Math.hypot(x - cx, z - cz), ang = (x, z) => Math.atan2(x - cx, z - cz);
      const stem = k.vary(k.scale(k.avg(24, 12, 31, 31), 1.35), 0.1);
      // The top: a brass rim with a raised lip, the wood inside, a gilt vine going round.
      const wood = grain(k, top, { len: 7, amount: 0.1 });
      k.shape(0, 49, 0, W, 53, D, (x, y, z) => r(x, z) <= (y < 50 ? 25 : 26.6) && (y < 52 || r(x, z) > 25.2), (x, y, z) => {
        const d = r(x, z), a = ang(x, z), vine = 18 + 1.4 * Math.sin(a * 9);
        if (y > 52) return bright(x, y, z);
        if (d > 25 || y < 51) return brass(x, y, z);
        if (Math.abs(d - vine) < 0.7 || Math.abs(d - 22.6) < 0.45 || d < 2.6 * Math.abs(Math.cos(a * 2)) + 0.6) return inlay(x, y, z);
        return wood(x, y, z);
      });
      // The skirt: pointed arches all round, hanging from a band under the top,
      // with a drop where each pair meets (u = 0) and a long pendant at four of them.
      const n = 16, R = 23.6, seg = (2 * Math.PI) / n, a = (seg * R) / 2, rr = a * 1.25;
      const edge = (x, z) => { const t = ang(x, z) / seg + 0.5, u = Math.abs(t - Math.round(t)) * seg * R; return 41 + 0.7 * Math.sqrt(Math.max(0, rr * rr - (a - u + rr - a) ** 2)); };
      k.shape(cx - R - 1, 40, cz - R - 1, cx + R + 1, 48.6, cz + R + 1, (x, y, z) => { const d = r(x, z); return d <= R && d >= R - 1.6 && y >= edge(x, z); }, bronze, { part: 7 });
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) * seg - Math.PI, x = cx + Math.sin(t) * (R - 0.8), z = cz + Math.cos(t) * (R - 0.8);
        if ([2, 5, 10, 13].includes(i)) turn(k, x, z, [[32.6, 0.3], [33.8, 1.5], [36.6, 2.5], [38.6, 1.3], [39.6, 0.7], [40.6, 1.2], [42, 0.8]], bronze, { part: 7 });
        else turn(k, x, z, [[39.4, 0.3], [40.4, 1.1], [42, 0.8]], bronze, { part: 7 });
      }
      // The pedestal, turned: a foot finial, a block for the legs, a collar, a bulb, a carved capital.
      turn(k, cx, cz, [[6.8, 1], [7.6, 2.2], [9, 2.7], [10.6, 2.1], [11, 3.3], [17, 3.4], [17.4, 4.6], [19.6, 4.6], [20, 3.8], [21, 3.8], [21.8, 3], [23, 3.4], [25.5, 3.9], [28, 3], [30, 2.2], [32, 2.2], [33, 2.8], [36, 3], [40, 3], [43.5, 3.3], [46.4, 3.5], [46.6, 4.1], [49, 4.1]], stem, { part: 8 });
      // Three legs curving out to lion's paws: two splayed to the front as the art
      // shows them, one to the back. at(o, y, r, s): o out along the leg, s across it.
      for (const a of [-Math.PI / 3, Math.PI / 3, Math.PI]) {
        const ox = Math.sin(a), oz = Math.cos(a), at = (o, y, rr, s = 0) => [cx + o * ox + s * oz, y, cz + o * oz - s * ox, rr];
        path(k, [at(3.5, 15, 2.4), at(8, 14.5, 2.3), at(12, 12, 2.1), at(15, 8.5, 1.9), at(17, 5, 1.7), at(18.3, 3, 1.9)], stem, { part: 6 });
        const [px, , pz] = at(18.6, 0);
        k.ball(px, 2.2, pz, 2.6, 2.2, 2.6, stem, { part: 6 });
        for (const s of [-1.4, 0, 1.4]) { const [tx, , tz] = at(20.4, 0, 0, s); k.ball(tx, 1.1, tz, 1.1, 1.1, 1.1, stem, { part: 6 }); }
      }
    },
  },
  // A gothic writing desk: a top on four turned legs, three drawers in the
  // apron with arched brackets below, traceried sides, and a hutch of six small
  // drawers between scrolled ends under a pierced crest with pinnacles. On it
  // a sheet of paper and an inkwell with its quill.
  f09: {
    depth: 30,
    build(k) {
      const W = k.W, D = 30, px = pixelsOf(k), brass = k.vary(0xc08a50, 0.1);
      // Everything under the top is shaded in the art; the room shades it here.
      const wood = k.shade(k.mottle(11, 5, 15, 17, { trim: 0.2, amount: 0.6 }), 1.25), dark = k.shade(k.mottle(13, 26, 56, 34, { trim: 0.3, amount: 0.5 }), 1.2);
      const top = k.avg(12, 35, 50, 37);
      // Legs: square where the apron meets them, turned below to a ring and a tapered foot.
      for (const x of [4.5, W - 4.5]) for (const z of [3.5, D - 3.5]) {
        k.post(x, z, 4, 15, 34, wood, { part: 1 });
        turn(k, x, z, [[0, 1.3], [1.6, 1.9], [3.6, 2.5], [5, 2.5], [6.2, 1.6], [15, 2]], wood, { part: 1 });
      }
      // The top, its front edge moulded and catching the light.
      k.box(1, 34, 0.5, W - 1, 36.5, D - 0.5, k.layers({ front: grain(k, k.scale(top, 1.1), { len: 9, amount: 0.07 }), other: grain(k, top, { len: 8, amount: 0.08 }), depth: 1 }), { round: 0.6, axis: "x" });
      // The apron: drawers at each side down to 26, a shallower one over the knee space,
      // and arched brackets springing from the legs.
      k.shape(6.5, 25.6, D - 4, W - 6.5, 34, D - 2.6, (x, y) => y >= (x < 19.5 || x > W - 19.5 ? 26 : 28), dark);
      k.box(2.5, 25.6, 2.6, W - 2.5, 34, 4, dark);
      k.sym((X) => {
        k.shape(X(6.5), 17, D - 4, X(15.5), 26, D - 2.6, (x, y) => Math.hypot(Math.abs(X(x) - 15.5), y - 17) >= 8.6, dark);
        k.shape(X(19.5), 23.5, D - 4, X(24), 28, D - 2.6, (x, y) => Math.hypot(Math.abs(X(x) - 24), y - 23.5) >= 4.3, dark);
        // The sides: a traceried panel, two lancets, its lower edge pointed.
        k.shape(X(2.5), 18, 5.5, X(4), 34, D - 5.5, (x, y, z) => y >= 21 + 3 * Math.abs(Math.cos(((z - 5.5) / (D - 11)) * Math.PI)), k.layers({ left: k.tex(1, 18, 11, 34, { plane: "zy" }), right: k.tex(1, 18, 11, 34, { plane: "zy" }), other: dark }));
      });
      k.box(7.5, 26.8, D - 3, 18.5, 33.3, D - 2, k.tex(15.5, 26.5, 25.5, 33.2));
      k.box(20, 28.5, D - 3, W - 20, 33.3, D - 2, k.tex(26.5, 28.5, 45.5, 33.4));
      k.box(W - 18.5, 26.8, D - 3, W - 7.5, 33.3, D - 2, k.tex(15.5, 26.5, 25.5, 33.2, { flip: true }));
      // Brass pulls: a ring on each side drawer, a rose on the middle one.
      for (const x of [13, W - 13]) { k.box(x - 0.5, 30, D - 2, x + 0.5, 31.5, D - 1, brass); k.shape(x - 1.5, 28, D - 2, x + 1.5, 30, D - 1.2, (x2, y) => y < 29 || Math.abs(x2 - x) > 0.5, brass); }
      k.box(W / 2 - 0.5, 30.5, D - 2, W / 2 + 0.5, 31.5, D - 1, brass); k.box(W / 2 - 1.5, 30.5, D - 2, W / 2 + 1.5, 31.5, D - 1.4, brass);
      // The hutch: six small drawers under a cornice, between scrolled ends.
      const hx = [7.5, W - 7.5], hz = 10;
      k.box(hx[0], 36.5, 1, hx[1], 48.5, hz - 1, dark);
      k.box(8.5, 37, hz - 1, 21, 48.3, hz, k.tex(11, 37.5, 20, 48.5));
      k.box(22, 37, hz - 1, W - 22, 48.3, hz, k.tex(20, 39.6, 34.5, 48.5));
      k.box(W - 21, 37, hz - 1, W - 8.5, 48.3, hz, k.tex(11, 37.5, 20, 48.5, { flip: true }));
      for (const x of [14.75, W / 2, W - 14.75]) for (const y of [40, 45]) k.box(x - 0.5, y, hz, x + 0.5, y + 1, hz + 0.8, brass);
      k.box(hx[0] - 1, 48.5, 0.5, hx[1] + 1, 50, hz + 1, k.layers({ front: k.scale(top, 0.95), other: k.scale(top, 0.8), depth: 1 }), { round: 0.5, axis: "x" });
      k.sym((X) => k.shape(X(hx[0] - 1.5), 36.5, 1, X(hx[0]), 48.5, hz + 6, (x, y, z) => z <= hz + 5.5 * ((48.5 - y) / 12) ** 1.6 + 0.3, k.layers({ left: dark, right: dark, other: k.scale(top, 0.85), depth: 0.6 })));
      // The crest: the art's own pierced arch and gables, cut as a board along the
      // back of the cornice, with turned pinnacles at its ends.
      const dx = 7;
      k.shape(dx, 50, 2, 44 + dx, 63, 4.5, (x, y) => px(x - dx, y) !== null, (x, y) => k.scale(px(x - dx, y) ?? top, 1.25));
      for (const x of [3 + dx, 40 + dx]) turn(k, x, 3.3, [[50, 1.9], [52, 1.9], [52.2, 2.2], [53.2, 2.2], [53.4, 1.5], [57.5, 0.6], [58.2, 0.9], [59, 0.2]], wood);
      // A sheet of paper with lines of writing; the inkwell on its dish, a glint on its glass, the quill in it.
      const paper = k.mix(k.avg(21, 37, 37, 39.5), 0xd09a50, 0.45), ink = k.vary(0x2c3a4c, 0.12);
      k.box(19, 36.5, 14, 39, 37.4, 23, (x, y, z) => (x > 21 && x < 37 && z > 15.5 && z < 21.5 && Math.floor(z) % 2 === 0 && hash(Math.floor(x / 3), Math.floor(z), 1) > 0.25 ? k.mix(paper, 0x3a2a20, 0.3) : paper));
      const ix = W - 12, iz = 16;
      turn(k, ix, iz, [[36.5, 3.6], [37.4, 3.6]], k.scale(top, 0.6));
      turn(k, ix, iz, [[37.4, 2.2], [38.2, 2.8], [40.6, 2.8], [41.6, 2], [42, 1.1], [43.2, 1.1]], (x, y, z) => (x < ix - 0.6 && z > iz + 0.6 && y > 39 && y < 41.5 ? 0x7d8ea3 : ink(x, y, z)));
      turn(k, ix, iz, [[42.4, 1.4], [43.4, 1.4]], brass);
      // The quill leans back and to the right, its vane a thin blade facing the room, broader on one side of the shaft.
      const a = [ix + 0.3, 42.5, iz], b = [ix + 6.5, 62.6, iz - 4], d = b.map((v, i) => v - a[i]), L = Math.hypot(...d), u = d.map((v) => v / L);
      const side = [u[1], -u[0], 0].map((v) => v / Math.hypot(u[0], u[1])), nrm = [u[1] * side[2] - u[2] * side[1], u[2] * side[0] - u[0] * side[2], u[0] * side[1] - u[1] * side[0]], dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
      const feather = k.shade(k.mottle(46, 49, 51, 61, { trim: 0.2, amount: 0.7 }), 1.15);
      k.cyl(a, b, 0.45, k.mix(feather, 0xf0dcb0, 0.5));
      k.shape(ix - 3, 45, iz - 6, ix + 10, 63, iz + 2, (x, y, z) => {
        const p = [x - a[0], y - a[1], z - a[2]], t = dot(p, u) / L, s = dot(p, side), n = dot(p, nrm);
        if (t < 0.2 || t > 1) return false;
        const w = 2.6 * Math.sin(((t - 0.2) / 0.8) * Math.PI) ** 0.6;
        return Math.abs(n) < 0.7 && s > -w * 0.6 && s < w;
      }, feather);
    },
  },
  // A refectory table: a plank top with breadboard ends on two trestles of turned
  // legs and sled feet. Between the legs on each long side, a gothic arcade stands
  // on a low stretcher (the art shows it under the top, so it sits where the room
  // camera sees it rather than hidden down the middle).
  f10: {
    depth: 32,
    build(k) {
      const W = k.W, D = 32, top = k.avg(16, 25, 48, 28), edge = k.avg(14, 21.5, 58, 23.5), dark = k.avg(14, 18.5, 40, 20.5);
      // The art shades everything under the top; the room's own light and shadow do
      // that here, so those parts take the art's wood a shade lighter.
      const leg = k.shade(k.mottle(15.5, 6, 22, 14, { trim: 0.25, amount: 0.6 }), 1.35), shoe = k.shade(k.mottle(16, 0.5, 22, 4, { trim: 0.25, amount: 0.6 }), 1.3);
      // The top: planks along its length between breadboard ends, a groove between each.
      const plank = grain(k, top, { len: 7, amount: 0.09 }), end = grain(k, k.scale(top, 0.94), { len: 5, amount: 0.08, along: "z" });
      const front = grain(k, edge, { len: 9, amount: 0.07 });
      k.box(0.5, 21, 0.5, W - 0.5, 24, D - 0.5, (x, y, z) => {
        const ends = x < 4.5 || x > W - 4.5;
        if (y > 23 && (Math.abs(x - 4.5) < 0.5 || Math.abs(x - (W - 4.5)) < 0.5)) return k.scale(top, 0.62);
        if (y > 23 && !ends && (z - 0.5) % 7.4 < 1 && z > 2 && z < D - 2) return k.scale(top, 0.66);
        if (z > D - 1.5 && y < 23) return front(x, y, z);
        return ends ? end(x, y, z) : plank(x, y, z);
      }, { round: 0.6 });
      // The apron under the top, all round.
      k.box(4, 18, 4, W - 4, 21, 6, k.vary(dark, 0.06)); k.box(4, 18, D - 6, W - 4, 21, D - 4, k.vary(dark, 0.06));
      k.sym((X) => k.box(X(4), 18, 4, X(6), 21, D - 4, k.vary(dark, 0.06)));
      // The trestles: two turned legs on a sled foot, with a rail between them low down.
      const xs = [14.5, W - 14.5], zs = [7, D - 7];
      for (const x of xs) {
        k.box(x - 3.5, 0, 1.5, x + 3.5, 4, D - 1.5, shoe, { round: 0.8, axis: "x" });
        k.carve(x - 4, 0, 0, x + 4, 4, 4, (_, y, z) => y - z > -0.5);
        k.carve(x - 4, 0, D - 4, x + 4, 4, D, (_, y, z) => y - (D - z) > -0.5);
        for (const z of zs) {
          k.post(x, z, 4.6, 4, 6, leg);
          k.lathe(x, z, 6, 15.4, [[0, 2.1], [0.08, 2.8], [0.16, 1.7], [0.42, 4], [0.76, 1.6], [0.88, 2.7], [1, 2.7]], leg);
          k.post(x, z, 4.6, 15.4, 18, leg);
        }
        k.box(x - 1.8, 8, zs[0], x + 1.8, 10.5, zs[1], shoe);
      }
      // The arcades: three pointed arches between posts, on a stretcher between the legs.
      const arcade = k.shade(k.mottle(24, 12, 42, 19, { trim: 0.25, amount: 0.5 }), 1.6), span = [xs[0] + 2.7, xs[1] - 2.7], n = 3, post = 1.4, a = (span[1] - span[0] - post * (n + 1)) / n / 2;
      for (const z of [5, D - 5]) {
        k.box(span[0], 8, z - 1.5, span[1], 10.5, z + 1.5, shoe);
        k.shape(span[0], 10.5, z - 0.9, span[1], 18, z + 0.9, (x, y) => {
          for (let i = 0; i < n; i++) {
            const cx = span[0] + post * (i + 1) + a * (2 * i + 1), u = Math.abs(x - cx);
            if (u < a && (y < 11.2 || (u + a) ** 2 + (y - 11.2) ** 2 <= 4 * a * a)) return false;
          }
          return true;
        }, arcade);
      }
    },
  },
};
