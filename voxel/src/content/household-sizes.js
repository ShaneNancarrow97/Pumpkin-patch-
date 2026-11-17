import { HOUSEHOLD_CATALOG } from "./household-catalog.js";

// Measured model envelope: floor pieces are centred; wall pieces have their
// back at local z=0. Top tuples are [height,x0,x1,z0,z1,clearance].
const tops = {
  "household-floating-shelf": [[.5, -.65, .65, .025, .375, 9]],
  "household-washing-machine": [[1.1, -.425, .425, -.425, .425, 9]],
  "household-dryer": [[1.1, -.425, .425, -.425, .425, 9]],
  "household-piano": [[1.55, -.95, .95, -.4, -.1, 9]],
};
export const HOUSEHOLD_SIZES = Object.freeze(Object.fromEntries(HOUSEHOLD_CATALOG.map(item => [item.id, Object.freeze({
  box: Object.freeze([-item.width / 2, item.width / 2, item.wall ? 0 : -item.depth / 2, item.wall ? item.depth : item.depth / 2, item.height]),
  tops: Object.freeze((tops[item.id] ?? []).map(top => Object.freeze(top))),
})])));
