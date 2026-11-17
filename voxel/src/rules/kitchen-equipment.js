// A tool only helps in the room where it is placed; storage grants nothing.
import { KITCHEN_EQUIPMENT, KITCHEN_CAPABILITIES, KITCHEN_CAPABILITY_NAMES } from "../content/kitchen-equipment.js";
import { RECIPE_BY_ID } from "../content/cooking.js";
import { buyDecor, placeDecorAt, sendToRoom, roomUnlocked, pieceFootprint, roomLayout, footprint, fits, wallZones, wallPlacementRange } from "./house.js";

export const homeKitchenOpen = s => !!s.house && roomUnlocked(s, "kitchen");
export function kitchenEquipment(s, station = "home") {
  if (station === "truck") return s.kitchen?.purchased
    ? ["hob", "pot", "pan", ...(s.kitchen.upgrades["truck-oven"] ? ["oven", "tray"] : []), ...(s.kitchen.upgrades["truck-spices"] ? ["spice"] : [])] : [];
  if (station !== "home" || !homeKitchenOpen(s)) return [];
  const all = [];
  for (const piece of s.house.placed ?? []) {
    const grants = piece.room === "kitchen" && KITCHEN_CAPABILITIES[piece.id];
    if (Array.isArray(grants)) all.push(...grants);
  }
  return [...new Set(all)];
}
export const homeCookingAvailable = s => !!s.kitchen?.purchased && kitchenEquipment(s).some(id => id === "hob" || id === "oven");
export function equipmentRequirements(s, recipeOrId, station = "home") {
  const recipe = typeof recipeOrId === "string" ? RECIPE_BY_ID[recipeOrId] : recipeOrId;
  const present = kitchenEquipment(s, station), required = [...(recipe?.equipment ?? [])];
  const missing = required.filter(id => !present.includes(id));
  return { required, present, missing, ok: missing.length === 0, names: missing.map(id => KITCHEN_CAPABILITY_NAMES[id] ?? id) };
}

// Buying and placing use the same furniture ownership and collision rules as
// Decorate. A full room keeps a paid item safely in storage.
export function buyCookingEquipment(s, id) {
  const item = KITCHEN_EQUIPMENT.find(item => item.id === id);
  if (s.paused || !s.kitchen?.purchased || !item || !homeKitchenOpen(s)) return false;
  const existing = s.house.placed.find(piece => piece.id === id);
  if (existing) {
    if (existing.room !== "kitchen") sendToRoom(s, existing.instance, "kitchen");
    return { ok: true, id, placed: existing.room === "kitchen", instance: existing.instance, purchased: false };
  }
  const owned = s.house.owned.includes(id);
  if (!owned && !buyDecor(s, id)) return false;
  if (!owned) s.kitchen.ledger.invested += item.price;
  const instance = placeDecorAt(s, id, "kitchen", kitchenSpot(s, item));

  return { ok: true, id, placed: !!instance, instance, purchased: !owned };
}

// Where a new tool looks best. Cookers stand against the back wall in a run
// beside the hearth (never in front of it); pots, pans, trays and spices hang
// at worktop-and-above height on the wall nearest the cookers, never down at
// the skirting. Null when nowhere suits, and the house's own search decides.
const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function kitchenSpot(s, item) {
  const L = roomLayout(s, "kitchen"); if (!L) return null;
  const hearth = wallZones(s, "kitchen", "back").find((z) => z.kind === "hearth");
  const cookers = (s.house.placed ?? []).filter((p) => p.room === "kitchen" && !p.on && (KITCHEN_CAPABILITIES[p.id] ?? []).some((g) => g === "hob" || g === "oven"));
  const centre = (p) => { const f = pieceFootprint(p); return { x: p.x + f.w / 2, z: p.z + f.d / 2 }; };
  const heart = cookers.length ? centre(cookers[0]) : hearth ? { x: hearth.x + hearth.w / 2, z: .5 } : { x: L.w / 2, z: .5 };
  if (!item.wall) {
    const w = footprint(item.id).w, clear = (x) => !hearth || x + w <= hearth.x + 1e-6 || x >= hearth.x + hearth.w - 1e-6, xs = [];
    for (let x = 0; x + w <= L.w + 1e-6; x = +(x + .05).toFixed(2)) if (clear(x) && fits(s, "kitchen", item.id, x, 0)) xs.push(x);
    // Beside the hearth or the last cooker: the free back-wall spot nearest it.
    const best = xs.sort((a, b) => Math.abs(a + w / 2 - heart.x) - Math.abs(b + w / 2 - heart.x))[0];
    return best === undefined ? null : { x: best, z: 0 };
  }
  let best = null;
  for (const wall of ["back", "left", "right"]) {
    const range = wallPlacementRange(s, { id: item.id, room: "kitchen", wall }), w = footprint(item.id).w;
    for (let y = Math.max(1.15, range.y0); y <= Math.min(3, range.y1) + 1e-6; y = +(y + .1).toFixed(2)) for (let x = range.x0; x <= range.x1 + 1e-6; x = +(x + .1).toFixed(2)) {
      const at = wall === "back" ? { x: x + w / 2, z: 0 } : { x: wall === "left" ? 0 : L.w, z: x + w / 2 };
      const score = near(at, heart) + Math.abs(y - 1.5) * 1.5;
      if ((!best || score < best.score) && fits(s, "kitchen", item.id, x, 0, undefined, { wall, y })) best = { x, z: 0, wall, y, score };
    }
  }
  return best && { x: best.x, z: 0, wall: best.wall, y: best.y };
}
