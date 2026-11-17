// Blank shelves: plain boards for other pieces to stand on, in a choice of
// finishes. Voxel-only content, bought and placed like the premium pieces.
//
// surfaces: [{ x, z, w, d, y }] in room units, in the piece's own unrotated frame:
// x across its width from the footprint's left edge, z from its back edge (for a
// wall shelf, out from the wall), y the board's top above the piece's base (for a
// wall shelf, above the bottom of its brackets). decor-models/shelving.js builds
// every board from these numbers, so the tops are exact.
// finishes: [{ id, name, color }], the first the default.
export const SHELF_FINISHES = Object.freeze([
  { id: "walnut", name: "Walnut", color: 0x6e4229 },
  { id: "ebony", name: "Ebony", color: 0x2e2228 },
  { id: "bone", name: "Bone white", color: 0xd8ccb2 },
  { id: "plum", name: "Midnight plum", color: 0x52304a },
  { id: "sage", name: "Sage", color: 0x748c64 },
  { id: "pumpkin", name: "Pumpkin", color: 0xc96f2e },
].map((f) => Object.freeze(f)));

const S = (x, z, w, d, y) => Object.freeze({ x, z, w, d, y });
export const SHELF_CATALOG = [
  { id: "shelf-floating", name: "Little floating shelf", price: 240, wallWidth: 1, hangHeight: 2.95, spooky: 0,
    description: "One thick plank on a hidden fixing, for a single treasure.",
    surfaces: [S(0.05, 0, 0.9, 0.75, 0.15)] },
  { id: "shelf-bracket", name: "Long bracket shelf", price: 420, wallWidth: 3, hangHeight: 2.75, spooky: 1,
    description: "A long board on three scrolled brackets. Room for a whole row of favourites.",
    surfaces: [S(0.05, 0, 2.9, 0.75, 0.55)] },
  { id: "shelf-two-tier", name: "Two-tier wall shelf", price: 600, wallWidth: 2, hangHeight: 3.05, spooky: 1,
    description: "Two boards between arched ends, on a pair of scrolled brackets.",
    surfaces: [S(0.15, 0, 1.7, 0.75, 0.4), S(0.15, 0, 1.7, 0.75, 1.55)] },
  { id: "shelf-whatnot", name: "Corner whatnot", price: 540, footprint: [1, 1], spooky: 1,
    description: "Three little tiers on turned posts, with a gallery rail for tucking into a corner.",
    surfaces: [S(0.05, 0.05, 0.9, 0.9, 0.15), S(0.05, 0.05, 0.9, 0.9, 1.2), S(0.05, 0.05, 0.9, 0.9, 2.25)] },
  { id: "shelf-etagere", name: "Open étagère", price: 960, footprint: [2, 1], spooky: 1,
    description: "A tall open stand of three wide tiers, for collections that like to be seen.",
    surfaces: [S(0.05, 0.05, 1.9, 0.9, 0.15), S(0.05, 0.05, 1.9, 0.9, 1.2), S(0.05, 0.05, 1.9, 0.9, 2.25)] },
].map(({ footprint, surfaces, ...item }) => Object.freeze({
  ...item, ...(footprint ? { footprint: Object.freeze(footprint), wall: false } : { wall: true }), category: "shelves",
  rug: false, surfaces: Object.freeze(surfaces), finishes: SHELF_FINISHES, collection: "blank-shelves",
}));
