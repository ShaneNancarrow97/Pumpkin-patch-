// Bookshelves: f11 walnut bookshelf, f12 arched gothic bookshelf, f13 sage low
// bookcase, f14 cherry library bookcase. Each is a carcass with shelves you can
// see into, and sockets the player's books stand in (filled from the bottom shelf up).
const dark = (c) => (c >> 16) + ((c >> 8) & 255) + (c & 255) < 150;
const lum = (c) => (c >> 16) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;

// The low bookcases' art is turned a little to show the left side, so its front
// recedes to the right and every line on it climbs. Painted along that slant, a
// model built square to the room still takes the right colour at each point:
// the model's front at (x, y) is the art's (x + dx, y + slope * (x + dx - x0)),
// the slope easing from s0 at the floor to s1 at the top, as perspective does.
const slanted = (k, dx, x0, s0, s1) => (x, y) => { const ax = x + dx; return k.at(ax, y + (s0 + ((s1 - s0) * y) / k.H) * (ax - x0)); };
// A part's paint: its front from the art, its other faces in wood.
const faced = (k, art, wood, top = wood) => k.layers({ front: art, top, left: wood, right: wood, bottom: wood, back: wood, other: art, depth: 1 });
// A row of book slots on a shelf: `n` books `w` wide from x, standing at y.
const slots = (k, x, y, n, h, z, d, w = 2) => { for (let i = 0; i < n; i++) k.socket(x + i * w, y, z, w, h, d); };
// Wood grain: a colour streaking along x (or y) in runs of `len` voxels, for boards and tops.
const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const grain = (k, c, { len = 7, amount = 0.08, along = "x" } = {}) => (x, y, z) => {
  const i = Math.floor(x), j = Math.floor(y), l = Math.floor(z);
  return k.scale(c, 1 + (along === "x" ? hash(Math.floor((i + 7 * hash(0, j, l)) / len), j, l) : hash(i, Math.floor((j + 7 * hash(i, 0, l)) / len), l)) * 2 * amount - amount);
};
// A pointed arch from xa to xb springing at ys, its arcs of radius r: its height at x.
const pointed = (xa, xb, ys, r, x) => { const c = x < (xa + xb) / 2 ? xa + r : xb - r; return ys + Math.sqrt(Math.max(0, r * r - (x - c) ** 2)); };

export default {
  // Front-on art, so it is projected straight on: the carcass is the art's own
  // silhouette pushed back, the compartments are hollowed out to a back panel,
  // and the crest is a thinner carved board standing on the top rail.
  f11: {
    depth: 14,
    build(k) {
      const D = 14;
      k.extrude(0, D, "art", { rect: [0, 0, 39, 54] });
      k.extrude(3, 10, "art", { rect: [5, 53, 34, 63] });
      for (const x of [2, 37]) k.lathe(x, D - 2.5, 53, 59, [[0, 1.6], [0.3, 1.2], [0.7, 0.9], [1, 0.2]], "art");
      // Compartments; the top one keeps its fretwork arches where the art is light.
      for (const [y0, y1] of [[7, 14], [17, 25], [27, 36]]) k.carve(5, y0, 2, 34, y1, D + 1);
      k.carve(5, 38, 2, 34, 51, D + 1, (x, y) => y < 45 || dark(k.at(x, y)));
      k.carve(5.5, 0, 0, 33, 3, D + 1);
      for (const [y, xs] of [[7, [6, 8.5]], [17, [6, 8.5]], [27, [6, 8.5]], [38, [6, 8.5]]]) for (const x of xs) k.socket(x, y, 3, 2.2, 7.5, 9);
    },
  },
  // A gothic bookcase, straight on in the art: a carcass under a pointed arch,
  // a buttress standing proud at each front corner on a plinth, capped and
  // spired, the arch in two mouldings stepping back to a screen of tracery, and
  // four open shelves over a bottom board raised off the floor. The arch runs
  // back to the wall as a pointed roof, and the quatrefoil is pierced through.
  f12: {
    depth: 16,
    build(k) {
      const W = k.W, D = 16, cx = W / 2, wood = k.mottle(1, 8, 6, 42, { trim: 0.2, amount: 0.5 });
      // The arch's half-width at height y, `inset` px in from its outer edge: two arcs meeting in a point.
      const hw = (y, inset) => Math.sqrt(Math.max(0, (21.8 - inset) ** 2 - Math.max(0, y - 40) ** 2)) - 5;
      const inArch = (x, y, inset = 0) => Math.abs(x - cx) <= hw(y, inset), fall = (z) => (z < D - 6 ? 2.5 : 0);
      // The carcass: a back panel under the arch, deep sides to the floor, and the bottom board clear of it.
      k.shape(4, 2, 0, W - 4, 63, 1.6, (x, y) => inArch(x, y, 1 + fall(0)), "art");
      k.sym((X) => k.box(X(2), 0, 0, X(6), 45, D - 5, wood));
      k.box(6, 2, 1, W - 6, 3, D - 2, "art");
      for (const [y0, y1] of [[9, 11], [19, 21], [28, 30], [38, 39]]) k.box(6, y0, 1, W - 6, y1, D - 2, k.layers({ front: "art", top: grain(k, k.scale(k.avg(6, 19, 35, 20), 0.7)), other: "art", depth: 1 }));
      // The arch: an outer moulding flush with the buttresses and an inner one a step
      // back, both run back to the wall as a pointed roof a step lower behind the
      // face (so the room camera, looking down, sees the arch rather than a dome).
      const moulding = k.layers({ front: "art", other: wood, depth: 1 });
      k.shape(2, 40, 0, W - 2, 63, D - 1, (x, y, z) => y >= 41 && inArch(x, y, fall(z)) && !inArch(x, y, 2.2 + fall(z)), moulding);
      k.shape(2, 38, 0, W - 2, 63, D - 2, (x, y, z) => inArch(x, y, 2.2 + fall(z)) && !inArch(x, y, 4 + fall(z)), moulding);
      // The tracery a step further back: three mullions, four lancet heads, two arches
      // over the pairs, and the quatrefoil's ring in the head above the middle mullion.
      const bar = (y, h) => Math.abs(y - h) < 0.75, light = (x, y) => k.mix(k.at(x, y), k.scale(k.avg(1, 8, 6, 42), 1.15), 0.6);
      const tracery = (x, y) => {
        if (y > 44 && [7.7, 13.5, 20.5, 27.5].some((a) => x >= a && x <= a + 6.5 && bar(y, pointed(a - 0.3, a + 6.3, 44, 4, x)))) return true;
        if (y > 44 && [7.4, 20.5].some((a) => x >= a && x <= a + 13 && bar(y, pointed(a, a + 13, 44, 8.2, x)))) return true;
        return (y < 45 && [13.5, 20.5, 27.5].some((m) => Math.abs(x - m) < 0.6)) || Math.abs(Math.hypot(x - cx, y - 50.6) - 3) < 0.7;
      };
      k.shape(5, 39, D - 4.5, W - 5, 63, D - 3, (x, y) => y >= 39.5 && inArch(x, y, 3.8) && tracery(x, y), light);
      // The buttresses: a plinth, a shaft with a sunk lancet panel, a capital, and a spired pinnacle.
      k.sym((X) => {
        k.box(X(0), 0, D - 7, X(6.2), 6, D, "art");
        k.box(X(1), 6, D - 6, X(6), 43.5, D - 1, "art");
        k.carve(X(2), 10, D - 1.6, X(5), 41, D, (x, y) => y < 39 + 1.6 * (1.5 - Math.abs(x - X(3.5))));
        k.box(X(0), 43.5, D - 7, X(6.2), 46, D, "art");
        k.box(X(1.5), 46, D - 5.5, X(5.5), 49, D - 1.5, "art");
        k.box(X(2), 49, D - 5, X(5), 53.5, D - 2, "art");
        k.box(X(3), 53.5, D - 4, X(4), 56, D - 3, "art");
      });
      // A carved boss at the apex, and the quatrefoil.
      k.shape(cx - 2, 59, D - 3, cx + 2, 63, D, (x, y) => Math.abs(x - cx) + Math.abs(y - 61.5) <= 1.6, "art");
      k.carve(cx - 3, 47, 0, cx + 3, 54, D, (x, y) => [[-1.2, 0], [1.2, 0], [0, -1.2], [0, 1.2]].some(([a, b]) => Math.hypot(x - cx - a, y - 50.6 - b) <= 1.3));
      // Books, bottom shelf up; the top row stands behind the tracery.
      for (const [y, n, h] of [[11, 2, 7.5], [21, 3, 6.5], [30, 3, 7], [39, 2, 6.5]]) slots(k, y === 39 ? 8 : 7, y, n, h, 2.5, 8);
    },
  },
  // A low bookcase in worn sage paint, drawn turned to show its left side.
  // Built square to the room: a top slab over a rail with cusped corner
  // brackets, pilasters at the front corners, side panels framing a pair of
  // gothic lancets, one shelf over a deep bottom board, on turned bun feet.
  f13: {
    width: 54, depth: 20,
    build(k) {
      const W = 54, D = 20, art = slanted(k, 8.5, 15, 0.1, 0.02);
      const wood = k.mottle(10, 12, 15, 34, { trim: 0.2, amount: 0.4 }), top = grain(k, k.avg(20, 41, 58, 44)), board = grain(k, k.scale(k.avg(20, 22, 50, 25), 0.8));
      const shade = k.shade(wood, 0.72), face = (t) => faced(k, art, wood, t);
      // Bun feet under the corners, and the moulded base on them.
      for (const x of [4, W - 4]) for (const z of [4, D - 4]) k.lathe(x, z, 0, 5.5, [[0, 1.5], [0.25, 2.4], [0.55, 2.7], [0.8, 1.7], [1, 2.2]], k.shade(wood, 0.9));
      k.box(0, 5, 0, W, 9, D, face(wood));
      // The carcass: back panel, sides, the bottom board and the shelf.
      k.box(2, 9, 0, W - 2, 39, 2, faced(k, art, shade));
      k.box(3, 9, 2, W - 3, 12, D - 1, face(board));
      k.box(3, 21, 2, W - 3, 23, D - 2, face(board));
      k.sym((X) => {
        // The side: a frame round a sunk panel, and in it two lancets on a mullion under a pointed arch.
        k.box(X(1), 9, 0, X(3), 39, D - 2, wood);
        k.carve(X(1), 13, 3, X(2), 34, D - 4);
        const lancet = (z0, z1, ys) => (y, z) => { const s = z1 - z0, far = z < (z0 + z1) / 2 ? z1 - z : z - z0; return Math.abs(y - (ys + Math.sqrt(Math.max(0, s * s - far * far)))) < 0.7 && z > z0 && z < z1; };
        const bars = [lancet(3, 9.6, 26.5), lancet(9.4, 16, 26.5), lancet(3, 16, 22)];
        k.shape(X(1), 13, 3, X(2), 34, D - 4, (x, y, z) => Math.abs(z - 9.5) < 0.6 || bars.some((b) => b(y, z)) || (y < 15), wood);
        // Pilasters, with a sunk flute; the brackets under the rail, curving in from them.
        k.box(X(1), 9, D - 3, X(6), 39, D - 1, face(wood));
        k.carve(X(3), 12, D - 2, X(4), 33, D);
        k.shape(X(6), 29, D - 2, X(15), 36, D - 1, (x, y) => ((Math.abs(x - X(6)) - 10) / 9) ** 2 + ((y - 29) / 6.5) ** 2 >= 1, face(wood));
      });
      k.box(6, 36, D - 3, W - 6, 39, D - 1, face(wood));
      // The top slab, overhanging all round.
      k.box(0, 39, 0, W, 42, D, face(top));
      // Books: two on the bottom board, two on the shelf.
      slots(k, 8, 12, 2, 8.5, 7, 9.5);
      slots(k, 8, 23, 2, 9.5, 6, 10);
    },
  },
  // A cherry library bookcase, the art turned a little to show its left side.
  // Built square to the room: a stepped cornice over a frieze, a gothic arcade
  // hanging under it, pilasters on plinth blocks at the corners, panelled sides,
  // and two shelves over the bottom board, all on a plinth.
  f14: {
    width: 60, depth: 18,
    build(k) {
      const W = 60, D = 18, art = slanted(k, 3, 10, 0.075, 0);
      const wood = k.mottle(5, 10, 9, 30, { trim: 0.2, amount: 0.4 }), top = grain(k, k.avg(20, 43, 58, 46)), board = grain(k, k.scale(k.avg(12, 28, 50, 30), 0.8));
      const shade = k.shade(wood, 0.72), face = (t) => faced(k, art, wood, t), carved = k.vary(k.scale(k.avg(5, 10, 9, 30), 1.1), 0.06);
      // The plinth, with a block under each pilaster.
      k.box(2, 0, 0, W - 2, 6, D - 1, face(wood));
      k.sym((X) => k.box(X(1), 0, D - 6, X(8), 7, D, face(wood)));
      // The carcass: back panel, panelled sides, the bottom board and two shelves.
      k.box(2, 6, 0, W - 2, 42, 2, faced(k, art, shade));
      k.box(4, 6, 2, W - 4, 8, D - 1, face(board));
      for (const y of [17, 28]) k.box(4, y, 2, W - 4, y + 2, D - 2, face(board));
      k.sym((X) => {
        k.box(X(2), 6, 0, X(4), 42, D - 3, wood);
        k.carve(X(2), 10, 3, X(3), 37, D - 6);
        k.box(X(2), 7, D - 4, X(7), 39, D - 1, face(wood));
        k.carve(X(4), 10, D - 2, X(5), 33, D);
      });
      // The arcade: nine cusped arches between the pilasters, hanging from the frieze.
      const span = (W - 14) / 9;
      k.shape(7, 34, D - 3, W - 7, 39, D - 1, (x, y) => { const u = ((x - 7) % span) / span; return y >= 35.6 + 2.4 * Math.sqrt(Math.max(0, 1 - ((u - 0.5) / 0.5) ** 2)) || (y >= 34 && Math.abs(u - 0.5) > 0.4); }, carved);
      k.box(2, 39, D - 4, W - 2, 42, D - 1, face(wood));
      // The cornice, stepping out over the frieze.
      k.box(1, 42, 0, W - 1, 43, D, face(wood));
      k.box(0, 43, 0, W, 45, D + 1, face(top));
      // Books: four on the bottom board and on each shelf.
      for (const [y, h] of [[8, 8], [19, 8], [30, 5.5]]) slots(k, 8, y, 4, h, 6, 9);
    },
  },
};
