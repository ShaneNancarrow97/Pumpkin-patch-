// Bookshelves: f11 walnut bookshelf, f12 arched gothic bookshelf, f13 sage low
// bookcase, f14 cherry library bookcase. Each is a carcass with shelves you can
// see into, and sockets the player's books stand in.
const dark = (c) => (c >> 16) + ((c >> 8) & 255) + (c & 255) < 150;

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
};
