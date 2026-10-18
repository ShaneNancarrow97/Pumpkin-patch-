// Seating and beds: f01 moss velvet armchair, f02 plum sofa, f03 rocking chair,
// f04 pumpkin pouffe, f05 crescent iron bed, f06 burgundy canopy bed.
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
};
