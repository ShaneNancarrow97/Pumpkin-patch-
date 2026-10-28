import { DROP } from "./farm-layout.js";
// Shared world coordinates: rules, terrain and visitor animation use one plan.
// The meadow's lane leaves the main path in the lower yard, so it sits DROP
// further south with it (content/farm-layout.js); the booth stays put.
const LANE = 24 + DROP;
export const MEADOW = { price: 1200, level: 4, width: 54, bounds: { x0: 40, x1: 54, z0: 5, z1: 29 + DROP }, counter: [47, 20.6], stand: [47, 17.9], speed: 3, queue: 4 };
export const COCOA_TIERS = [
  { name: "Moonbrew cocoa cart", price: 650, level: 5, capacity: 30, maxPrice: 4 },
  { name: "Lantern cocoa kiosk", price: 1800, level: 7, capacity: 60, maxPrice: 5 },
  { name: "Midnight cocoa pavilion", price: 4800, level: 10, capacity: 100, maxPrice: 6 },
  { name: "Ghostlight cocoa salon", price: 9000, level: 13, capacity: 160, maxPrice: 9 },
  { name: "Sandy’s grand midnight lounge", price: 16000, level: 16, capacity: 240, maxPrice: 12 },
];
export const COCOA_SUPPLY = { unit: 2, batch: 10, courier: 1200, reserve: 100, bulkBatch: 20, bulkCourier: 1200, barista: 1600 };
export const COCOA_ALLOWANCE = [0, 4, 7, 9, 14, 20];
export const MEADOW_EXIT = [[31.8, 10.2], [31.6, 12.6], [35, 10.6], [38, 8.6], [42.5, 6.6], [49, 6.6], [53.6, 6.6], [57, 6.6]];
export const MEADOW_PATHS = [
  MEADOW_EXIT,
  [[33, LANE], [49, LANE]], [[47, LANE], MEADOW.counter], [MEADOW.counter, [49, 20.6], [49, LANE]],
];
export const COCOA_APPROACH = [[33, 28.5 + DROP], [33, LANE], [47, LANE]];
export const PUMPKIN_APPROACH = [[49, LANE], [33, LANE], ...[[32.4, 21.6], [30.4, 18.6], [30.2, 15.6], [31.6, 12.6]].map(([x, z]) => [x, z + DROP]), [31.8, 10.2]];
export const fieldWidth = (s) => s.festival?.meadow ? MEADOW.width : 40;
export function pathDistance(x, z) {
  let best = Infinity;
  for (const points of MEADOW_PATHS) for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz));
  }
  return best;
}
// Places to stand and talk, off every path, opened by the cocoa stand's level
// (rules/meadow-chat.js). Guests take places in a ring round each one. Each
// spot's walks avoid the benches, the booth and the planters:
//   to: from the stall's lane to the spot
//   cocoa: from the spot towards Sandy's queue (and back, reversed)
//   exit: on to the homeward path, which it joins at MEADOW_EXIT[join]; without
//         a join, home is through the farm gate (rules extend it with the farm)
// A spot with a `comfort` opens when that comfort is bought (MEADOW_COMFORTS).
export const CHAT_SPOTS = [
  { id: "benches", name: "by the benches", x: 43, z: 23.3, seats: 4, level: 1, to: [[35, 10.6], [39, 16], [40.4, 22.6]], cocoa: [[45.5, 23.4]], exit: [[40.4, 22.6], [40.2, 16], [41, 9.6]], join: 4 },
  { id: "lantern", name: "under the lantern", x: 51.5, z: 15, seats: 3, level: 2, to: [[35, 10.6], [38, 8.6], [42.5, 6.6], [49.5, 7.5], [51.5, 10]], cocoa: [[50.8, 21.2]], exit: [[51.5, 9]], join: 6 },
  { id: "brazier", name: "round the brazier", x: 40.5, z: 13.5, seats: 4, level: 3, to: [[35, 10.6], [38.5, 11.5]], cocoa: [[42.8, 15.5], [43.4, 20.4]], exit: [[41, 9.6]], join: 4 },
  { id: "dancefloor", name: "on the dance floor", x: 52, z: 23.2, seats: 5, ring: 1.05, level: 1, comfort: "dancefloor", to: [[31.6, 15.6], [30.2, 18.6], [30.4, 21.6], [32.4, 24.6], [33, 27], [49, 27], [50.3, 25.4]], cocoa: [[50.4, 21.6]], exit: [[50.3, 25.4], [49, 27], [33, 27], [33, 28.5 + DROP]] },
];
export const CHAT_RING = .85;
// A guest's place in a spot's ring: four or five stand round it, three round a point.
export const chatPlace = (spot, seat) => { const a = (seat / spot.seats) * Math.PI * 2 + (spot.seats === 3 ? -Math.PI / 2 : Math.PI / 4), r = spot.ring ?? CHAT_RING; return [spot.x + Math.cos(a) * r, spot.z + Math.sin(a) * r]; };

// Comforts that make the meadow the talk of the village, each bought once from
// Sandy's menu once the stand reaches `stand`. Every one brings a few more
// visitors (COMFORT_FOOTFALL each), and does something of its own for the chats.
export const MEADOW_COMFORTS = [
  { id: "bunting", name: "Fairy-light bunting", price: 450, stand: 1, text: "Strings of little lights round the meadow.", effect: "More guests stop for a chat" },
  { id: "blankets", name: "Blankets and cushions", price: 900, stand: 1, text: "Tartan blankets on every bench and bale.", effect: "Chats last longer, and guests wait longer for company" },
  { id: "mugs", name: "Souvenir mugs", price: 1500, stand: 2, text: "Sandy’s own ghost mugs, to take home.", effect: "Chatters go back for a refill" },
  { id: "dancefloor", name: "A dance floor", price: 2600, stand: 2, text: "Boards down in the corner and a gramophone by the fence.", effect: "A fourth place to chat, with room for five" },
  { id: "trolley", name: "Sandy’s cocoa trolley", price: 4200, stand: 3, text: "Sandy wheels hot cocoa round to the groups.", effect: "Chatters are served where they stand, no queue" },
];
export const COMFORT_FOOTFALL = .03;
