// Mothlight's town square: the plan of the ground the spread opened between the Green and the Quarry
// (rules/village-spread.js, TOWN_SQUARE). A round plaza on the Quarry road with the Lantern Fountain at its heart,
// the Moonclock gate over the road at its north side, the Moonlit Market's stalls on the west and a bandstand on
// the east, ringed by lamps, planters and autumn trees. Grid units on the spread ground (x east, z north), where
// it stands; the world builds it from this and the walking rules keep out of it.
import { PLAN_SCALE as K } from "./village.js";

const around = (n, r, start = 0, skip = () => false) => Array.from({ length: n }, (_, i) => start + i * 360 / n)
  .filter((deg) => !skip(deg)).map((deg) => { const a = deg * Math.PI / 180; return Object.freeze({ x: 58 + Math.cos(a) * r, z: 58 + Math.sin(a) * r, deg }); });

export const TOWN = Object.freeze({
  cx: 58, cz: 58, r: 16,
  // The Lantern Fountain: a stone basin, two bowls and the Lamplighter raising a lantern over the square.
  fountain: Object.freeze({ x: 58, z: 58, r: 4.4, lantern: Object.freeze({ x: 58.9, z: 58, y: 8.15 }) }),
  // The Moonclock: a gatehouse over the Quarry road, its clock facing the square and the Quarry.
  gate: Object.freeze({ x: 58, z: 76.7, w: 13, d: 4.2, open: 7.2, clock: 10.6 }),
  // The bandstand, its steps towards the fountain.
  bandstand: Object.freeze({ x: 69, z: 58, r: 3.6 }),
  // The Moonlit Market: three stalls on the west side, facing the fountain.
  stalls: Object.freeze([
    { x: 45.6, z: 51, goods: "sweets", colour: "plum" },
    { x: 45.6, z: 58, goods: "apples", colour: "crimson" },
    { x: 45.6, z: 65, goods: "potions", colour: "teal" },
  ].map(Object.freeze)),
  benches: Object.freeze([
    { x: 52.5, z: 66, facing: "south" }, { x: 63.5, z: 66, facing: "south" },
    { x: 52.5, z: 50, facing: "north" }, { x: 63.5, z: 50, facing: "north" },
  ].map(Object.freeze)),
  // Lamps round the plaza's edge, none on the road's way in or out; planters on the diagonals; trees beyond.
  lamps: Object.freeze(around(12, 14.2, 15)),
  planters: Object.freeze(around(4, 12.5, 45)),
  trees: Object.freeze(around(12, 19.5, 0, (deg) => deg % 90 === 0)),
  // The way in from the Green: two moth pillars either side of the road.
  pillars: Object.freeze([{ x: 53.3, z: 40.4 }, { x: 62.7, z: 40.4 }].map(Object.freeze)),
});

const G = TOWN.gate;
// The gate's two piers (the road runs between them, under the arch).
export const TOWN_GATE_PIERS = Object.freeze([-1, 1].map((s) => Object.freeze({
  x0: G.x + Math.min(s * G.open / 2, s * G.w / 2), x1: G.x + Math.max(s * G.open / 2, s * G.w / 2), z0: G.z - G.d / 2, z1: G.z + G.d / 2,
})));
export const inTownPlaza = (x, z) => Math.hypot(x - TOWN.cx, z - TOWN.cz) < TOWN.r + .2;
export const inTownGate = (x, z) => x > G.x - G.w / 2 - .2 && x < G.x + G.w / 2 + .2 && z > G.z - G.d / 2 - .2 && z < G.z + G.d / 2 + .2;
// Lamps for the halos and the light pool: where each one's light hangs.
export const TOWN_LAMPS = Object.freeze([
  ...TOWN.lamps.map((l) => Object.freeze({ x: l.x, z: l.z, y: 3.4 })),
  Object.freeze({ ...TOWN.fountain.lantern }),
  ...[-1, 1].map((s) => Object.freeze({ x: G.x + s * 3.9, z: G.z - G.d / 2 - .3, y: 3.6 })),
  Object.freeze({ x: TOWN.bandstand.x, z: TOWN.bandstand.z, y: 6 }),
]);

// What a walker goes round, in world units: circles { x, z, r } and boxes { x0, z0, x1, z1 }.
const W = (b) => ({ x0: b.x0 * K, z0: b.z0 * K, x1: b.x1 * K, z1: b.z1 * K });
export function townSquareObstacles() {
  const f = TOWN.fountain, b = TOWN.bandstand;
  return [
    { x: f.x * K, z: f.z * K, r: (f.r + .3) * K },
    { x: b.x * K, z: b.z * K, r: (b.r + .1) * K },
    ...TOWN_GATE_PIERS.map(W),
    ...TOWN.stalls.map((s) => W({ x0: s.x - 1.1, z0: s.z - 1.75, x1: s.x + 1.1, z1: s.z + 1.75 })),
    ...TOWN.pillars.map((p) => W({ x0: p.x - .7, z0: p.z - .7, x1: p.x + .7, z1: p.z + .7 })),
    ...TOWN.planters.map((p) => ({ x: p.x * K, z: p.z * K, r: 1.25 * K })),
  ];
}
// What the play camera can't see through: the gate's piers.
export const townSquareBlockers = () => TOWN_GATE_PIERS.map(W);
