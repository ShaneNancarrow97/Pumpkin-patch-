// The original four retain their indices and economics. Extra voxel crops
// live here, so the shared 2D game's catalogue is never changed.
import { pumpkinVarieties } from "../../../src/content/products.js";

const original = pumpkinVarieties.map((v, i) => Object.freeze({
  ...v, grow: [18, 24, 30, 36][i],
  color: [0xf0821e, 0xd9d2ff, 0x9d55e6, 0xf5c84a][i],
  glow: [0xffb04a, 0xbeb7ff, 0xb774ff, 0xffdf64][i],
}));
export const PUMPKIN_VARIETIES = Object.freeze([
  ...original,
  Object.freeze({
    id: "midnight-moon", name: "Midnight Moon", price: 110, cost: 7800,
    grow: 48, color: 0x172243, glow: 0xffd875,
    description: "Deep navy-blue pumpkins scattered with golden moons and stars.",
  }),
]);
export const VARIETY_COUNT = PUMPKIN_VARIETIES.length;
export const MAX_VARIETY_INDEX = VARIETY_COUNT - 1;
export const VARIETY_INDICES = Object.freeze(PUMPKIN_VARIETIES.map((_, i) => i));
