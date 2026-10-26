// A tool only helps in the room where it is placed; storage grants nothing.
import { KITCHEN_EQUIPMENT, KITCHEN_CAPABILITIES, KITCHEN_CAPABILITY_NAMES } from "../content/kitchen-equipment.js";
import { RECIPE_BY_ID } from "../content/cooking.js";
import { buyDecor, placeDecor, sendToRoom, roomUnlocked } from "./house.js";

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
  const instance = placeDecor(s, id, "kitchen");
  return { ok: true, id, placed: !!instance, instance, purchased: !owned };
}
