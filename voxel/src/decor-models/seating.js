// Seating and beds: f01 moss velvet armchair, f02 plum sofa, f03 rocking chair,
// f04 pumpkin pouffe, f05 crescent iron bed, f06 burgundy canopy bed.

// A cushion standing up, puffed in the middle, leaning back by `lean` px per px of height.
function pillow(k, x0, y0, x1, y1, z, thick, paint, lean = 0) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
  return k.shape(x0, y0, z - thick - (y1 - y0) * lean, x1, y1, z + thick, (x, y, zz) => {
    const u = (x - cx) / hw, v = (y - cy) / hh, t = (thick / 2) * Math.sqrt(Math.max(0, (1 - u ** 4) * (1 - v ** 4)));
    return Math.abs(zz - (z - (y - y0) * lean)) <= t + 0.35;
  }, paint);
}

// A steady random number for a voxel, for scattering things like stars.
const speck = (x, y, z) => { let h = (Math.floor(x) * 374761393 + Math.floor(y) * 668265263 + Math.floor(z) * 1440662683) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// A frame turned by `deg` about (cx, cz), for pieces the art draws at an angle:
// shapes are given in the piece's own u (across), y, w (forwards) and placed turned.
function turn(k, cx, cz, deg) {
  const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  const at = (u, y, w) => [cx + u * c + w * s, y, cz - u * s + w * c], local = (x, z) => [(x - cx) * c - (z - cz) * s, (x - cx) * s + (z - cz) * c];
  const shape = (u0, y0, w0, u1, y1, w1, test, paint, opts) => {
    const xs = [], zs = [];
    for (const u of [u0, u1]) for (const w of [w0, w1]) { const [x, , z] = at(u, 0, w); xs.push(x); zs.push(z); }
    return k.shape(Math.min(...xs), y0, Math.min(...zs), Math.max(...xs), y1, Math.max(...zs), (x, y, z) => { const [u, w] = local(x, z); return u >= u0 && u <= u1 && w >= w0 && w <= w1 && test(u, y, w); }, paint, opts);
  };
  return {
    at, shape,
    box: (u0, y0, w0, u1, y1, w1, paint, opts) => shape(u0, y0, w0, u1, y1, w1, () => true, paint, opts),
    cyl: (a, b, r, paint, opts) => k.cyl(at(...a), at(...b), r, paint, opts),
    lathe: (u, w, y0, y1, profile, paint, opts) => { const [x, , z] = at(u, 0, w); return k.lathe(x, z, y0, y1, profile, paint, opts); },
  };
}
// A pointed (gothic) arch springing at y from xa to xb: its height at x.
const pointed = (xa, xb, y, x) => { const s = xb - xa; return y + Math.sqrt(Math.max(0, s * s - (x < (xa + xb) / 2 ? xb - x : x - xa) ** 2)); };

export default {
  // A four-poster seen from the foot, headboard to the wall, as the art draws it.
  // The art is a three-quarter view, so each part takes its colours from where
  // that part is in the art (k.tex, k.mottle) rather than from a projection.
  f06: {
    depth: 60,
    build(k) {
      const W = k.W, D = 60, wood = k.mottle(17.5, 34, 21, 50), woodDark = k.shade(wood, 0.78), gold = k.vary(0xd8a548, 0.12);
      const velvet = k.mottle(24, 50, 56, 56, { trim: 0.3, amount: 0.6 }), cream = k.mottle(10, 26, 17, 31, { trim: 0.3 });
      const sheet = k.mottle(8, 14, 15, 24, { trim: 0.25 }), damask = k.tex(24, 13, 52, 22, { plane: "xz", tile: true }), damaskFront = k.tex(24, 13, 52, 22, { tile: true });
      const posts = [[3.5, 3.5], [W - 3.5, 3.5], [3.5, D - 3.5], [W - 3.5, D - 3.5]];
      // Turned posts: a bun foot, a panelled block, a vase-turned column, a capital and an urn finial.
      for (const [x, z] of posts) {
        k.lathe(x, z, 0, 5, [[0, 2], [0.4, 2.9], [1, 2.4]], woodDark, { part: 1 });
        k.post(x, z, 5, 5, 15, k.layers({ front: k.tex(16.5, 6, 21.5, 15), other: wood }), { part: 1 });
        k.post(x, z, 4.4, 15, 30, wood, { part: 1 });
        k.lathe(x, z, 30, 51, [[0, 2.6], [0.12, 1.7], [0.4, 2.4], [0.85, 1.4], [1, 1.9]], wood, { part: 1 });
        k.post(x, z, 4.8, 51, 55, woodDark, { part: 1 });
        k.lathe(x, z, 55, 58.5, [[0, 1.7], [0.5, 1.2], [1, 0.3]], wood, { part: 1 });
      }
      // The frame: a panelled foot rail and side rails round the mattress, open underneath.
      k.box(5, 5, D - 5.5, W - 5, 13, D - 2, k.layers({ front: k.tex(21, 6, 55, 13), other: woodDark }));
      k.sym((X) => k.box(X(2), 6, 5, X(5), 12.5, D - 5, k.layers({ left: k.tex(21, 6, 55, 13, { plane: "zy" }), right: k.tex(21, 6, 55, 13, { plane: "zy" }), other: woodDark })));
      // Mattress and sheet, the damask blanket over them turned down at the head, hanging over the sides.
      k.box(5, 11, 5, W - 5, 20, D - 5.5, sheet);
      k.box(4, 13, 24, W - 4, 22, D - 4.5, k.layers({ top: damask, front: damaskFront, left: k.tex(24, 13, 52, 22, { plane: "zy", tile: true }), right: k.tex(24, 13, 52, 22, { plane: "zy", tile: true }), other: damask }), { round: 1.5, axis: "z" });
      k.box(4.5, 19, 21, W - 4.5, 22.5, 26, sheet, { round: 1, axis: "x" });
      // Pillows, and the round cushion with its button.
      for (const x0 of [8, 33]) k.box(x0, 19, 6, x0 + 22, 28, 17, cream, { round: 3 });
      k.cyl([W / 2, 25, 17.5], [W / 2, 25, 21.5], 4.6, k.tex(26, 26, 37, 31.5), { caps: false });
      k.post(W / 2, 21.6, 1.2, 24.4, 25.6, gold);
      // The carved headboard between the back posts, arched to a crest.
      k.shape(5, 10, 2, W - 5, 44, 5.5, (x, y) => y < 35 + 8 * Math.cos(((x - W / 2) / (W - 10)) * Math.PI) ** 2, k.layers({ front: k.tex(9, 30, 40, 38.5), other: woodDark }));
      // The canopy: rails between the posts and a swagged valance all round, with a
      // gold rope and fringe; shallow at the foot, so the pillows show below it.
      k.box(2, 51, 2, W - 2, 54, 5, wood); k.box(2, 51, D - 5, W - 2, 54, D - 2, wood);
      k.sym((X) => k.box(X(2), 51, 2, X(5), 54, D - 2, wood));
      const hem = (u, low) => low + 2.2 * (1 - Math.abs(Math.sin((u / 12) * Math.PI)));
      const valance = (x0, z0, x1, z1, along, low) => {
        k.shape(x0, low - 3, z0, x1, 56, z1, (x, y, z) => y >= hem(along(x, z), low) + 0.8 && y <= 55.5, velvet, { part: 3 });
        k.shape(x0, low - 3, z0, x1, 56, z1, (x, y, z) => { const h = hem(along(x, z), low); return y < h + 0.8 && (y >= h || (y >= h - 2.6 && Math.floor(along(x, z)) % 3 === 1)); }, gold);
      };
      valance(1.5, D - 1.6, W - 1.5, D, (x) => x - 1.5, 51.5);
      valance(1.5, 0, W - 1.5, 1.6, (x) => x - 1.5, 47.5);
      k.sym((X) => valance(X(0.4), 2, X(2), D - 2, (x, z) => z - 2, 50));
      // A curtain behind the headboard, in heavy folds.
      k.drape([6, 2.5], [W - 6, 2.5], 51, 18, k.shade(velvet, 0.8), { folds: 7, amp: 0.8, thick: 1.2 });
      // Drapes: down each side from the back post, and across the foot from each
      // front post, tied back to the post with a gold tassel.
      k.sym((X) => {
        k.drape([X(1.4), 6], [X(1.4), 22], 50, 1, velvet, { folds: 4, amp: 1.2, thick: 1.8 });
        k.drape([X(4), D - 1.4], [X(20), D - 1.4], 50, 1, velvet, { folds: 4, amp: 1.3, thick: 1.9, tie: { at: 0, y: 25, gather: 0.32 }, flare: 1.8 });
        k.lathe(X(2.6), D + 0.6, 18, 27, [[0, 2.2], [0.5, 1.6], [0.72, 0.8], [0.85, 0.8], [1, 1.3]], gold);
      });
    },
  },
  // The art shows the seat from a little above, so it is projected at 20°:
  // k.y(v, z) turns an art row into a height at depth z.
  f01: {
    depth: 50, view: 20,
    build(k) {
      const wood = k.avg(15, 0, 20, 8), dark = k.scale(wood, 0.7);
      // Cabriole legs: in at the knee, out to a little foot.
      for (const [x, z, out] of [[18, 44, -1], [52, 44, 1], [6, 6, -1], [56, 6, 1]]) {
        k.cyl([x, 11, z], [x + out * 1.5, 1.5, z + 1], [2.2, 1.3], wood);
        k.ball(x + out * 1.8, 1.2, z + 1, 1.8, 1.2, 1.8, dark);
      }
      // The frame under the cushion, studded front and sides.
      k.box(3, 9, 3, 59, k.y(19, 49), 49, "art", { round: 2 });
      // The seat cushion, plump at the edges.
      k.box(15, k.y(17, 49), 12, 47, k.y(23, 49), 49.5, "art", { round: 2.5 });
      // Rolled arms: a block with a fat roll along the top, and the scrolled front.
      for (const [x0, x1] of [[0, 16], [46, 62]]) {
        const cx = (x0 + x1) / 2, top = k.y(35, 50);
        k.box(x0 + 1, 9, 4, x1 - 1, top - 4, 50, "art", { round: 2 });
        k.cyl([cx, top - 5, 4], [cx, top - 5, 50.5], (x1 - x0) / 2, "art", { caps: false });
      }
      // The tufted back, its domed top following the art's outline.
      k.box(4, 16, 1, 58, k.y(48, 12), 13, "art", { round: 3 });
      k.extrude(1, 13, "art", { rect: [3, 46, 60, 59], round: 3 });
      // The moon cushion, leaning on the back.
      k.box(23, k.y(30, 18), 12, 48, k.y(49, 14), 18, "art", { round: 2.5 });
      // The throw over the right arm, falling to a fringe.
      k.drape([44, 51.5], [53, 51.5], k.y(31, 51), 6.5, "art", { folds: 4, amp: 0.6, thick: 1.4 });
      k.box(44, k.y(29, 50) - 0.5, 28, 53, k.y(31, 40) + 1, 51, "art", { round: 1 });
    },
  },
  // A carved camelback sofa, near enough straight on in the art: the front of
  // every part takes the art, the tops, sides and back a plain velvet from it.
  f02: {
    depth: 30,
    build(k) {
      const D = 30, velvet = k.mottle(12, 10, 52, 14, { trim: 0.3, amount: 0.35 }), wood = k.avg(5, 6, 59, 7), dark = k.scale(wood, 0.72);
      const cover = (d = 1) => k.layers({ front: "art", other: velvet, depth: d });
      // Cabriole legs at the corners, out to a little foot; short square ones at the back.
      for (const [x, out] of [[6, -1], [58.5, 1]]) {
        k.cyl([x, 6.5, D - 3], [x + out, 1.2, D - 2.5], [1.9, 1.1], "art");
        k.ball(x + out * 1.3, 1, D - 2.4, 1.6, 1, 1.6, dark);
        k.post(x, 4, 2.4, 0, 6.5, dark);
      }
      // The frame under the seat, and the carved shell hanging from the middle of its rail.
      k.box(4.5, 5.5, 2, 59.5, 9, D - 1, k.layers({ front: "art", other: dark }));
      k.extrude(D - 2.5, D, "art", { rect: [27, 1.5, 35, 6], round: 1 });
      // The seat cushion, piped along its front.
      k.box(8.5, 8.6, 8, 55.5, 15.8, D + 0.2, cover(), { round: 1.5 });
      // Rolled arms: a panel under a fat roll that leans out over it, faced
      // at the front with the carved wooden scroll.
      for (const [x0, x1, out] of [[0, 10, -1], [53.5, 63.5, 1]]) {
        const cx = (x0 + x1) / 2;
        k.box(x0 + (out < 0 ? 2.6 : 0.8), 7, 3, x1 - (out > 0 ? 2.6 : 0.8), 19, D - 2, velvet, { round: 1 });
        k.cyl([cx + out * 0.4, 20.6, 2.5], [cx + out * 0.4, 20.6, D - 1.5], 4.9, velvet, { caps: false });
        k.extrude(D - 2.5, D + 0.5, "art", { rect: [x0, 0, x1, 25.5], round: 1, back: false });
      }
      // The buttoned back, padded, under its carved crest rail.
      k.extrude(1.5, 8.5, cover(1.5), { rect: [8, 8, 57, 28.5], round: 1.5 });
      k.extrude(2.5, 6.5, k.layers({ front: "art", other: dark }), { rect: [8, 24, 58, 34] });
      // Buttons sunk into the padding in a diamond lattice, so the tufting has real hollows.
      for (let y = 17.5, row = 0; y < 27; y += 3, row++) for (let x = 13 + (row % 2) * 3; x < 52; x += 6) {
        k.box(x - 0.5, y - 0.5, 6.4, x + 0.5, y + 0.5, 7.4, k.mix(k.at(40, 21), 0xc89a52, 0.5));
        k.carve(x - 0.5, y - 0.5, 7.4, x + 0.5, y + 0.5, 9);
      }
      // Cushions leaning on the back: two square, one round with a button.
      pillow(k, 12, 15.5, 22.5, 25, 10, 5, "art", 0.15);
      pillow(k, 43.5, 15.5, 53.5, 24.5, 9.5, 4.4, "art", 0.15);
      k.shape(35, 16, 7, 45, 26, 13.5, (x, y, z) => { const r = Math.hypot(x - 40, y - 20.8) / 4.8; return r <= 1 && Math.abs(z - 10.3) <= 2.6 * Math.sqrt(1 - r ** 4) + 0.2; }, "art");
      k.ball(40, 20.8, 12.8, 0.9, 0.9, 0.9, k.at(40, 21));
    },
  },
  // A rocking chair, turned as the art turns it so its rockers sweep across
  // the room rather than hide behind its legs. Built in the chair's own frame
  // (u across, w forwards) and turned into place; dark turned wood, worn to
  // brown on top, with a gold crescent in the medallion of its carved back.
  f03: {
    width: 54, depth: 64,
    build(k) {
      const t = turn(k, 27, 32, 24), wood = k.mottle(14, 26, 32, 40, { trim: 0.2, amount: 0.5 }), worn = k.vary(k.avg(20, 48, 23, 50), 0.1), edge = (p) => k.layers({ top: worn, other: p, depth: 0.6 });
      const turned = [[0, 1.5], [0.15, 2.1], [0.25, 1.4], [0.6, 1.6], [0.75, 2.2], [0.85, 1.4], [1, 1.6]], wb = -12.5;
      for (const s of [-1, 1]) {
        // A rocker on a shallow arc, its long tail behind and its toe out in front, the ends rounded.
        const base = (w) => 60 - Math.sqrt(3600 - (w + 1) ** 2);
        t.shape(s * 12.75 - 1.5, 0, -28, s * 12.75 + 1.5, 12, 25, (u, y, w) => y >= base(w) && y <= base(w) + 3.2, edge(wood), { part: 3 });
        for (const w of [-27.5, 24.5]) t.cyl([s * 12.75 - 1.5, base(w) + 1.8, w], [s * 12.75 + 1.5, base(w) + 1.8, w], 1.8, edge(wood), { part: 3 });
        // Turned legs; the back ones run on up as the posts, square-blocked and spear-topped.
        t.lathe(s * 14, 12.5, 1.5, 17, turned, wood);
        t.lathe(s * 11.5, wb, 1.5, 17, turned, wood);
        t.lathe(s * 11.5, wb, 17, 46, [[0, 1.6], [0.1, 2.1], [0.16, 1.4], [0.5, 1.7], [0.84, 1.4], [0.9, 2.1], [1, 1.6]], wood);
        t.box(s * 11.5 - 1.8, 46, wb - 1.8, s * 11.5 + 1.8, 51, wb + 1.8, edge(wood));
        t.lathe(s * 11.5, wb, 51, 61, [[0, 1.4], [0.15, 1.9], [0.3, 0.9], [0.45, 1.7], [1, 0.1]], wood);
        // Arms on a turned support and two spindles, rolled over at the front.
        t.lathe(s * 14, 12.5, 21.5, 32, [[0, 1.3], [0.2, 1.9], [0.5, 1.2], [0.8, 1.8], [1, 1.3]], wood);
        for (const f of [0.35, 0.65]) t.lathe(s * (11.5 + 2.5 * f), wb + 25 * f, 21.5, 33, 0.8, wood);
        t.cyl([s * 11.5, 33.5, wb], [s * 15, 33.5, 14], 1.7, edge(wood), { caps: true });
        t.cyl([s * 15 - 1.9, 32.3, 14.6], [s * 15 + 1.9, 32.3, 14.6], 2.1, edge(wood));
        // A square block over each front leg, where the seat rails meet.
        t.box(s * 14 - 1.8, 15.5, 10.7, s * 14 + 1.8, 21.6, 14.3, edge(wood));
      }
      // The seat: a deep board on its rails, wider at the front.
      t.shape(-15, 15, -14, 15, 22, 13.5, (u, y, w) => Math.abs(u) <= 13.5 + ((w + 14) / 27.5) * 1.5, k.layers({ top: k.mottle(16, 19, 34, 23, { trim: 0.2, amount: 0.5 }), other: wood, depth: 1 }));
      // The back: a rail, five turned spindles, a carved board with the moon medallion, and a pointed crest.
      t.box(-10, 21.5, wb - 1, 10, 24.5, wb + 1, wood);
      for (const u of [-8, -4, 0, 4, 8]) t.lathe(u, wb, 24, 39, [[0, 0.8], [0.3, 1.2], [0.5, 0.7], [0.7, 1.2], [1, 0.8]], wood);
      t.box(-10, 38.5, wb - 1.2, 10, 41, wb + 1.2, edge(wood));
      t.shape(-10, 41, wb - 1.2, 10, 59, wb + 1.2, (u, y) => y <= 52 + 6.5 * (1 - Math.abs(u) / 10) ** 1.4 && !(y > 52.5 && Math.abs(Math.abs(u) - 4.5) < 1.2 && y < 54.5), edge(wood));
      t.shape(-6, 40, wb, 6, 53, wb + 2.2, (u, y) => Math.hypot(u, y - 46.5) <= 5.4, wood);
      t.shape(-5, 41, wb + 1, 5, 52, wb + 2.4, (u, y) => Math.hypot(u, y - 46.5) <= 4.2, 0x2a2238);
      t.shape(-5, 41, wb + 1, 5, 52, wb + 3.2, (u, y) => Math.hypot(u, y - 46.5) <= 3.8 && Math.hypot(u - 1.6, y - 47.3) > 3.1, k.vary(0xb98a3c, 0.08));
    },
  },
  // A round footstool: a pumpkin of a cushion, ribbed into lobes, on a carved
  // ring with brass studs and four cabriole legs. The art looks down on it, so
  // the ring takes it projected at 26°, anchored at the front leg. Built at
  // three voxels to four pixels, as it is small and round all over.
  f04: {
    depth: 62, view: 26, front: 56, res: 0.75,
    build(k) {
      const cx = 31, cz = 31, wood = k.mottle(24, 2, 33, 24, { trim: 0.2, amount: 0.5 }), dark = k.scale(k.avg(26, 4, 32, 12), 0.7), brass = k.vary(0xc89a52, 0.1);
      // Cabriole legs at the front, back and sides: a carved knee bowed out under
      // the ring, in to a slim ankle, out again to a scrolled foot.
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2, at = (r, y) => [cx + Math.sin(a) * r, y, cz + Math.cos(a) * r];
        k.cyl(at(26, 26), at(28.6, 19), [3.6, 3], wood, { part: 10 + i });
        k.cyl(at(28.6, 19), at(26.4, 6), [3, 1.6], wood, { part: 10 + i });
        k.cyl(at(26.4, 6), at(28.4, 1.6), [1.6, 2.3], wood, { part: 10 + i, caps: true });
      }
      // The carved ring the cushion sits on, its lower edge scalloped between the legs.
      k.lathe(cx, cz, 23, 33, (t) => 28.5 - (t < 0.12 ? 1 : 0), "art", { max: 28.5, part: 2 });
      k.carve(0, 22, 0, 62, 26, 62, (x, y, z) => y < 23 + 3 * Math.abs(Math.sin(Math.atan2(x - cx, z - cz) * 2)));
      // Brass studs all round the top of the ring.
      k.lathe(cx, cz, 32, 34, 29.4, (x, y, z) => (Math.floor(((Math.atan2(x - cx, z - cz) + Math.PI) / (2 * Math.PI)) * 40) % 2 ? dark : brass(x, y, z)));
      // The cushion: a squat pumpkin sunk into the ring, ribbed into ten round
      // lobes that meet in a dimple at the button. It is shaded from the art's
      // own oranges by lobe and height rather than projected, so the colour
      // follows the lobes from every side.
      const light = k.at(12, 50), mid = k.avg(20, 38, 40, 44), deep = k.avg(20, 32, 40, 36), velvet = k.mottle(4, 40, 58, 54, { trim: 0.3, amount: 0.25 });
      const groove = (x, z) => 1 - Math.abs(Math.cos(Math.atan2(x - cx, z - cz) * 5)), yc = 36.5, ry = 13;
      k.shape(0, 32, 0, 62, yc + ry, 62, (x, y, z) => {
        const r = Math.hypot(x - cx, z - cz), s = r / (31 * (1 - 0.14 * groove(x, z)));
        return s * s + ((y - yc) / ry) ** 2 <= 1 && y <= yc + ry - 2.4 * Math.exp(-((r / 4.5) ** 2));
      }, (x, y, z) => {
        const h = Math.min(1, Math.max(0, (y - 33) / 14)), g = groove(x, z) ** 0.8, c = k.mix(k.mix(deep, mid, Math.min(1, h * 3)), light, Math.max(0, h * 1.3 - 0.25) * (1 - g));
        return k.mix(k.mix(c, deep, g * 0.6), velvet(x, y, z), 0.2);
      });
      k.ball(cx, yc + ry - 2.2, cz, 1.5, 1, 1.5, k.scale(deep, 0.85));
    },
  },
  // A wrought-iron bed seen from the foot, headboard to the wall. The art turns
  // it to show a side, so like the canopy bed each part takes its colours from
  // where it is in the art rather than from a projection. Thin iron, so it is
  // built a little larger than the art to fill its footprint.
  f05: {
    width: 58, height: 60, depth: 70, size: 0.038,
    build(k) {
      const W = 58, D = 70, iron = k.mottle(0, 14, 2, 50, { trim: 0.15, amount: 0.5 }), glint = k.vary(k.mix(k.avg(0, 14, 2, 50), 0x9a8a80, 0.35), 0.1), gold = k.vary(0xb8904c, 0.1);
      const cream = k.mottle(24, 31, 40, 33, { trim: 0.3, amount: 0.4 }), plum = k.mottle(14, 24, 34, 29, { trim: 0.35, amount: 0.4 }), pillowCol = k.vary(k.scale(k.avg(5, 35, 14, 43), 1.35), 0.05);
      const starry = (base, rate) => (x, y, z, b) => { const c = base(x, y, z, b); return speck(x * 1.7, y * 1.3, z * 1.9) < rate ? k.mix(c, gold(x, y, z), 0.7) : c; };
      const head = 3.5, foot = D - 3.5, posts = [[3.5, head, 52], [W - 3.5, head, 52], [3.5, foot, 37], [W - 3.5, foot, 37]];
      // Posts: collared iron rods on wider feet, each topped with a spear.
      for (const [x, z, top] of posts) {
        k.lathe(x, z, 0, top, (t) => { const y = t * top; return [3, 12, top - 9, top - 2].some((c) => Math.abs(y - c) < 1) ? 2.5 : y < 2.5 ? 2.3 : 1.7; }, iron, { max: 2.5, part: 1 });
        k.lathe(x, z, top, top + 6, [[0, 1.1], [0.2, 2], [0.45, 1.2], [0.6, 1.6], [1, 0.1]], glint, { part: 1 });
      }
      // The frame: side rails from head to foot, under the mattress.
      k.sym((X) => k.box(X(2.6), 10, head, X(4.4), 12.5, foot, iron));
      // The mattress under a turned-down sheet; the starry plum blanket over it,
      // hanging to a hem at the sides and the foot; the sheet trailing off the left side.
      k.box(5, 12, head + 1.5, W - 5, 20, foot - 1.5, cream, { round: 1.5 });
      k.box(4.6, 19, head + 3, W - 4.6, 22.2, 27, cream, { round: 1.2, axis: "x" });
      k.box(4.2, 9, 24, W - 4.2, 23, foot - 1, k.layers({ top: starry(plum, 0.025), other: starry(k.shade(plum, 0.8), 0.02), depth: 1 }), { round: 1.6, axis: "z" });
      k.box(4.4, 21.5, 22.5, W - 4.4, 24, 27.5, cream, { round: 1.2, axis: "x" });
      k.box(3.2, 22, 25, 11, 24.2, 52, cream, { round: 1, axis: "z" });
      k.shape(2.4, 10, 25, 4.4, 24, 52, (x, y, z) => y >= 11.5 + 0.9 * Math.sin(z * 0.3) && x >= 2.9 + 0.5 * Math.sin(z * 0.6), cream);
      // Pillows against the headboard, and the little star cushion in front of them.
      for (const x0 of [6.5, 29.5]) k.box(x0, 19, head + 1, x0 + 22, 30, head + 11, pillowCol, { round: 3.5 });
      pillow(k, 19, 20.5, 39, 30.5, head + 13.5, 5.5, starry(k.mottle(16, 35, 26, 41, { trim: 0.3, amount: 0.3 }), 0.08), 0.12);
      // The footboard: a rail low down, an arched top rail with a fleur at its
      // crown, and between them a row of pointed gothic arches on slim bars.
      const crown = (x, lo, hi) => lo + (hi - lo) * Math.cos(((x - W / 2) / (W - 7)) * Math.PI);
      // Bars from y0 up to top(x), with a pointed arch between each pair, cut
      // low so it meets the bars part-way up at ys.
      const grille = (z, y0, ys, n, top) => {
        const span = (W - 7) / n;
        k.shape(3.5, y0, z - 0.7, W - 3.5, 60, z + 0.7, (x, y) => {
          const i = Math.min(n - 1, Math.floor((x - 3.5) / span)), xa = 3.5 + i * span, near = Math.min(x - xa, xa + span - x);
          return (near < 0.6 && y <= top(x)) || (y >= ys && Math.abs(y - pointed(xa, xa + span, ys - 0.866 * span * 0.55, x)) < 0.65 && y <= top(x));
        }, glint);
      };
      k.box(3.5, 6.5, foot - 0.8, W - 3.5, 8.5, foot + 0.8, iron);
      k.shape(3.5, 24, foot - 0.9, W - 3.5, 31, foot + 0.9, (x, y) => Math.abs(y - crown(x, 25.5, 28.5)) < 1.1, iron);
      grille(foot, 8, 17, 8, (x) => crown(x, 25.5, 28.5));
      k.ball(W / 2, 30.5, foot, 1.3, 1.6, 0.9, glint); k.cyl([W / 2, 31.5, foot], [W / 2, 34.5, foot], [1, 0.1], glint);
      // The headboard: a round arch from post to post with a fleur at its crown,
      // the crescent moon hanging in it, and an arcade of pointed arches below.
      const arch = (x) => 45 + 10 * Math.sqrt(Math.max(0, 1 - ((x - W / 2) / (W / 2 - 3.5)) ** 2));
      k.box(3.5, 19, head - 0.8, W - 3.5, 21, head + 0.8, iron);
      k.box(3.5, 33, head - 0.7, W - 3.5, 34.4, head + 0.7, iron);
      k.shape(3.5, 40, head - 0.9, W - 3.5, 57, head + 0.9, (x, y) => Math.abs(y - arch(x)) < 1.1, iron);
      grille(head, 21, 34, 4, (x) => Math.min(arch(x), 34 + 0.866 * ((W - 7) / 4) * 0.45 + 0.6));
      k.ball(W / 2, 56.5, head, 1.3, 1.6, 0.9, glint); k.cyl([W / 2, 57.5, head], [W / 2, 60, head], [1, 0.1], glint);
      k.shape(W / 2 - 6, 41, head - 1, W / 2 + 6, 54, head + 1, (x, y) => Math.hypot(x - W / 2, y - 47.5) <= 5.4 && Math.hypot(x - W / 2 - 2.4, y - 48.6) > 4.4, gold);
      k.post(W / 2 - 1, head, 0.8, 52.6, 54.6, iron);
    },
  },
};
