// Decor models: each catalogue piece built as a real 3D voxel object that still
// reads as its art from the room camera. A piece without a recipe here is drawn
// as the old standee (decor.js), so pieces can be modelled one at a time.
//
// A RECIPE, keyed by piece id in one of the group files below:
//   f11: {
//     depth: 22,              // z extent in art pixels (back z = 0, front z = depth); required
//     view: 0,                // degrees the art is projected along: 0 = straight on (front-on art),
//                             // about 20-30 for art drawn from above (tops of seats and beds showing)
//     build(k) { ... },       // fills the voxels with the kit k (below)
//     // optional: width, height (default the art's), res (voxels per pixel, default 1),
//     // size (room units per pixel; default the standee's scale, kept inside the footprint),
//     // front (z the projection is anchored at, default depth), lift (pixels added to the projected row)
//   }
// Units are the art's own pixels in decor.png (see DECOR_ART in decor-meta.js
// for each piece's w x h): x right from the art's left edge, y UP from its base,
// z forwards from the back. Read positions straight off the sprite (the bench
// draws it with this grid). The model is centred on its footprint with its base
// on the floor; wall pieces hang with their back at z = 0, facing +z. Rugs are
// built lying down: x across, z front to back, a pixel or two of y.
//
// PAINT (the last-but-one argument of every shape):
//   "art" (default)   the art, projected along `view` onto every voxel it can see; voxels it
//                     can't see take the nearest seen colour of the same shape, a touch darker
//   "fill"            no projection: the nearest colour of the same shape, else of any shape
//   0xrrggbb          a flat colour
//   k.at(x, y)        the art's colour at a pixel;  k.avg(x0, y0, x1, y1) a region's average
//   k.tex(x0, y0, x1, y1, { plane, tile, flip })  a region of the art mapped over the shape's
//                     box: plane "xy" front (default), "xz" top (the region's top row at the back),
//                     "zy" side; tile: true repeats it at one pixel per voxel instead of stretching
//   k.mottle(x0, y0, x1, y1)   colours scattered from a region: a fabric or grain without its layout
//   k.vary(colour, 0.08), k.shade(paint, 0.8), k.mix(a, b, t), k.scale(colour, f)
//   (x, y, z, box) => colour | "art" | "fill"     anything else
// OPTIONS (the last argument): { glow: true } makes the shape's voxels glow (flames,
// bulbs, magic); { part: n } groups shapes so hidden faces borrow colour across them.
//
// SHAPES (all in art pixels; a voxel is filled when its centre is inside):
//   k.box(x0, y0, z0, x1, y1, z1, paint, { round: r, axis: "x"|"y"|"z" })   rounded edges optional
//   k.post(x, z, w, y0, y1, paint, { d })               a square post centred on (x, z)
//   k.cyl([x, y, z], [x, y, z], r | [r0, r1], paint, { caps })   a rod between two points
//   k.lathe(x, z, y0, y1, profile, paint, { depth, ribs: [n, depth] })   turned round a vertical
//       axis; profile is a radius, [[t, r], ...] with t 0..1 from y0 to y1, or t => r
//   k.ball(x, y, z, rx, ry, rz, paint, { ribs })        an ellipsoid (ribs make a pumpkin)
//   k.extrude(z0, z1, paint, { rect: [x0, y0, x1, y1], where: (c, x, y) => bool, round, back })
//       the art's own silhouette pushed back from z0 to z1; round softens it like a cushion
//   k.drape([xa, za], [xb, zb], top, bottom, paint, { folds, amp, thick, tie: { at, y, gather }, flare })
//       cloth hanging from a rail, in folds, optionally tied back
//   k.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => bool, paint)    anything else
//   k.carve(x0, y0, z0, x1, y1, z1, test?)            takes voxels away
//   k.sym(X => ...)                                    runs twice, X(x) = x and X(x) = W - x
//   k.socket(x, y, z, w, h, d)                         a book slot on a shelf (left, shelf top, back)
//   k.glowArt(x0, y0, x1, y1, test?)                   art-painted voxels there that are bright and warm glow
//   k.W, k.H, k.D, k.art                               the model's size and the art's meta
//
// Check a piece with the bench: node tools/decor-bench.mjs f06 --out /tmp/f06.png
import seating from "./seating.js";
import tables from "./tables.js";
import shelves from "./shelves.js";
import flat from "./flat.js";
import lights from "./lights.js";
import curios from "./curios.js";

export const RECIPES = { ...seating, ...tables, ...shelves, ...flat, ...lights, ...curios };
