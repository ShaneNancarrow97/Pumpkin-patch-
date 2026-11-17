import { GATE_Z } from "./farm-layout.js";
// The attraction shares this plan with its farm model, foyer and visitor routes.
export const HOLLOW_PROPERTY = { name: "The Hollow House", level: 9, price: 1750, restorationCost: 2500, restorationSeconds: 90, x: 6.5, z: 6.4, door: [6.5, 9.5], transferSeconds: 2.5, westEdge: -8, speed: 3 };
export const FOYER_TIERS = [
  { level: 1, name: "A brave little welcome", w: 10, d: 8, cost: 0, patchLevel: 9, capacity: 3, mazeCapacity: 2, serviceSeconds: 3.5, mazeSeconds: 28, minTicket: 4, maxTicket: 10, decorCapacity: 10 },
  { level: 2, name: "Candlelit reception", w: 11, d: 8, cost: 1800, patchLevel: 11, capacity: 5, mazeCapacity: 3, serviceSeconds: 3, mazeSeconds: 28, minTicket: 4, maxTicket: 12, decorCapacity: 14 },
  { level: 3, name: "The shadow staircase", w: 12, d: 9, cost: 4200, patchLevel: 13, capacity: 7, mazeCapacity: 5, serviceSeconds: 2.5, mazeSeconds: 28, minTicket: 4, maxTicket: 15, decorCapacity: 20 },
  { level: 4, name: "Grand gothic hall", w: 13, d: 10, cost: 8500, patchLevel: 15, capacity: 10, mazeCapacity: 7, serviceSeconds: 2, mazeSeconds: 28, minTicket: 4, maxTicket: 18, decorCapacity: 28 },
  { level: 5, name: "The velvet afterlife", w: 14, d: 10, cost: 16000, patchLevel: 17, capacity: 14, mazeCapacity: 10, serviceSeconds: 1.6, mazeSeconds: 28, minTicket: 4, maxTicket: 24, decorCapacity: 36 },
];
export const HOLLOW_FOYER_TIERS = FOYER_TIERS;

// Paid haunt installations are reusable; active effects produce a bounded rating.
export const MAZE_PREFABS = [
  { id: "cobweb-canopy", name: "The cobweb canopy", tier: 1, cost: 180, scare: 12, effect: "webs", text: "Silver webs sway above the queue while tiny spiders patrol the corners." },
  { id: "whispering-portraits", name: "Whispering portraits", tier: 2, cost: 500, scare: 15, effect: "portraits", text: "Portrait eyes wake and watch the room. A rather unsettling welcome." },
  { id: "spectral-parade", name: "Spectral parade", tier: 3, cost: 1200, scare: 20, effect: "ghosts", text: "A procession of glowing ghosts drifts through the dark maze doorway." },
  { id: "thunder-chamber", name: "The thunder chamber", tier: 4, cost: 2500, scare: 23, effect: "storm", text: "Electric runes and a slow storm glow turn the hall into a midnight laboratory." },
  { id: "phantom-finale", name: "The phantom finale", tier: 5, cost: 5200, scare: 25, effect: "phantoms", text: "A grand apparition rises beyond the stairs. Brave guests may want another go." },
];
export const MAZE_PREFAB_BY_ID = Object.assign(Object.create(null), Object.fromEntries(MAZE_PREFABS.map(p => [p.id, p])));

// The lantern walk joins the two halves of the farm above the patch: from
// Skyla's counter west to the Hollow House door, where the west lane comes up
// from its own gate. Guests walk it both ways, in view: a shopper with a
// pumpkin walks over to the maze, and a maze guest walks over to the stall.
// Nobody leaves the map to get from one side to the other.
export const HOLLOW_LINK = [[31.8, 10.2], [31.6, 11.1], [20, 11.1], [8.6, 11], [6.5, 10.5], HOLLOW_PROPERTY.door];
export const HOLLOW_LINK_BACK = [...HOLLOW_LINK].reverse();
// A guest's own way between their place at the counter (farm-layout.js
// counterPlace) and the door: a step back from the counter onto the walk, then
// along it from its first point to their west, so nobody cuts back across the
// counter or the guests beside them. Reversed, it brings them back to it.
export function hollowLinkFrom(place) {
  const join = HOLLOW_LINK.findIndex((p, i) => i > 0 && p[0] < place[0]);
  return [[...place], [place[0], HOLLOW_LINK[1][1]], ...HOLLOW_LINK.slice(join).map(p => [...p])];
}
export const HOLLOW_FRONT_APPROACH = [[-3, GATE_Z], [-3, 10.5], [6.5, 10.5], HOLLOW_PROPERTY.door];
export const HOLLOW_RETURN = [HOLLOW_PROPERTY.door, [6.5, 10.5], [-3, 10.5], [-3, GATE_Z]];
export const HOLLOW_PATHS = [HOLLOW_LINK, HOLLOW_FRONT_APPROACH];
export function hollowPathDistance(x, z) {
  let best = Infinity;
  for (const route of HOLLOW_PATHS) for (let i = 1; i < route.length; i++) {
    const [ax, az] = route[i - 1], [bx, bz] = route[i], dx = bx - ax, dz = bz - az, length = dx * dx + dz * dz;
    const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / length)) : 0;
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}

export const FOYER_DECOR = [
  { id: "velvet-bench", name: "Burgundy waiting bench", category: "furniture", tier: 1, cost: 160, w: 2, d: .9, height: 1.2, layer: "floor" },
  { id: "spectral-sofa", name: "Spectral velvet sofa", category: "furniture", tier: 2, cost: 420, w: 2.5, d: 1.2, height: 1.4, layer: "floor" },
  { id: "parlour-table", name: "Crooked parlour table", category: "furniture", tier: 1, cost: 130, w: 1.4, d: 1.2, height: .9, layer: "floor" },
  { id: "gothic-cabinet", name: "Gothic curio cabinet", category: "furniture", tier: 2, cost: 380, w: 1.6, d: .8, height: 2.3, layer: "floor" },
  { id: "skull-plinth", name: "Smiling skull plinth", category: "decorations", tier: 1, cost: 95, w: .7, d: .7, height: 1.5, layer: "floor" },
  { id: "pumpkin-cluster", name: "Reception pumpkins", category: "decorations", tier: 1, cost: 80, w: 1, d: 1, height: .8, layer: "floor" },
  { id: "book-stack", name: "Books of brave visitors", category: "decorations", tier: 1, cost: 65, w: .7, d: .7, height: .7, layer: "floor" },
  { id: "standing-lantern", name: "Tall copper lantern", category: "lighting", tier: 1, cost: 110, w: .6, d: .6, height: 1.8, layer: "floor" },
  { id: "candle-cluster", name: "Three midnight candles", category: "lighting", tier: 1, cost: 75, w: .65, d: .65, height: 1.2, layer: "floor" },
  { id: "haunted-portrait", name: "The previous proprietor", category: "decorations", tier: 1, cost: 180, w: 1.2, d: .15, height: 1.6, layer: "wall" },
  { id: "cobweb", name: "Silver corner cobweb", category: "decorations", tier: 1, cost: 45, w: 1.2, d: .15, height: 1.1, layer: "wall" },
  { id: "ghost-orb", name: "Friendly floating ghost", category: "effects", tier: 3, cost: 650, w: .8, d: .8, height: 2.6, layer: "air" },
  { id: "fog-cauldron", name: "Purple fog cauldron", category: "effects", tier: 3, cost: 520, w: 1, d: 1, height: 1.1, layer: "floor" },
  { id: "grand-chandelier", name: "Floating candle chandelier", category: "lighting", tier: 2, cost: 580, w: 2, d: 2, height: 4.3, layer: "ceiling" },
  { id: "curtain-arch", name: "Velvet curtain arch", category: "entrance", tier: 2, cost: 460, w: 2, d: .7, height: 2.6, layer: "floor" },
  { id: "ticket-sign", name: "Tickets and tiny warnings", category: "reception", tier: 1, cost: 100, w: .6, d: .6, height: 1.6, layer: "floor" },
];
const finish = (id, category, name, cost, tier, color, light, dark) => ({ id, category, name, cost, tier, color, palette: [color, light, dark] });
export const FOYER_FINISHES = [
  finish("wooden-boards", "floor", "Old oak boards", 0, 1, 0x6b422d, 0x946449, 0x39271e),
  finish("gothic-tiles", "floor", "Gothic chequer tiles", 280, 1, 0x666374, 0xb0a7b2, 0x302b3b),
  finish("worn-stone", "floor", "Worn flagstones", 420, 2, 0x716a73, 0x9d929b, 0x45404c),
  finish("patterned-carpet", "floor", "Burgundy patterned carpet", 780, 3, 0x663247, 0xa76572, 0x352031),
  finish("old-wallpaper", "walls", "Faded moth wallpaper", 0, 1, 0x655164, 0x8d7384, 0x3a2c3c),
  finish("wood-panelling", "walls", "Carved walnut panels", 300, 1, 0x513729, 0x7d5941, 0x2b221e),
  finish("exposed-brick", "walls", "Exposed midnight brick", 520, 2, 0x6e4244, 0x955e5d, 0x3f2c33),
  finish("gothic-stone", "walls", "Gothic cut stone", 920, 3, 0x6b687b, 0x9b96ac, 0x3e3b4e),
  finish("wood-counter", "reception", "Oak ticket counter", 0, 1, 0x73462d, 0xa87448, 0x39291f),
  finish("gothic-counter", "reception", "Carved gothic desk", 450, 2, 0x3b2d3c, 0x6e5366, 0x211c2b),
  finish("velvet-counter", "reception", "Velvet and brass reception", 1100, 4, 0x683146, 0xb58b51, 0x352131),
  finish("candle-glow", "lighting", "Candlelit welcome", 0, 1, 0xffb766, 0xffdd9c, 0xbf7141),
  finish("moon-chandelier", "lighting", "Moonlit chandelier", 400, 2, 0xc7a4ef, 0xf0d8ff, 0x7a639e),
  finish("amber-chandelier", "lighting", "Grand amber chandelier", 900, 4, 0xffca81, 0xffedc2, 0xc28b4f),
  finish("gothic-door", "entrance", "Gothic maze doorway", 0, 1, 0x362737, 0x735363, 0x181722),
  finish("velvet-curtains", "entrance", "Burgundy velvet curtains", 350, 2, 0x652b44, 0x9c5068, 0x321c2d),
  finish("briar-arch", "entrance", "Briar archway", 800, 3, 0x324d38, 0x6e8652, 0x1b2d26),
  finish("quiet-air", "effects", "Quiet midnight air", 0, 1, 0x9d85b2, 0xc0a6d4, 0x625471),
  finish("purple-mist", "effects", "Gentle purple mist", 500, 3, 0x9161b5, 0xbe94db, 0x584071),
  finish("floating-candles", "effects", "Floating candles", 1100, 4, 0xffc27b, 0xffe5b4, 0x99765a),
  finish("friendly-haunting", "effects", "Friendly haunting", 1900, 5, 0xd8c3ec, 0xf1e7fa, 0x9a80b8),
];
export const FOYER_DEFAULT_FINISHES = { floor: "wooden-boards", walls: "old-wallpaper", reception: "wood-counter", lighting: "candle-glow", entrance: "gothic-door", effects: "quiet-air" };
const byId = list => Object.assign(Object.create(null), Object.fromEntries(list.map(item => [item.id, item])));
export const FOYER_DECOR_BY_ID = byId(FOYER_DECOR);
export const FOYER_FINISH_BY_ID = byId(FOYER_FINISHES);
export const AXEL_LINES = ["Axel’s the name. Frights are the game.", "One ticket? How delightfully brave.", "Mind the gills. They’re only mostly undead.", "The screams are complimentary.", "Another satisfied survivor! Fancy another go?", "Do mind the ghosts. They’re terribly rude."];
// Keep the original export for existing menus and integrations.
export const MORTIMER_LINES = AXEL_LINES;
