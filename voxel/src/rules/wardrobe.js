// Adapt the main wardrobe here, so extra voxel art never changes its catalogue.
import { buyCostume as buyOriginal, costumeCatalog as originals, freshWardrobe as freshOriginal, restoreWardrobe as restoreOriginals, wearCostume as wearOriginal } from "../../../src/core/costume-model.mjs";
import { EXTRA_COSTUMES } from "../costume-expansion.js";

const WHEELS = { id: "natalie-wheelchair", character: "natalie", name: "Purple wheels & dungarees", description: "Purple wheelchair, plaits and stylish dungarees.", price: 0, collection: "everyday" };
export const freshWardrobe = () => { const w = freshOriginal(); w.owned.push(WHEELS.id); return w; };
export const costumeCatalog = [...originals, ...EXTRA_COSTUMES, WHEELS];
export const costumeById = Object.fromEntries(costumeCatalog.map((item) => [item.id, item]));
const extras = Object.fromEntries([...EXTRA_COSTUMES, WHEELS].map((item) => [item.id, item]));
const extra = (id) => typeof id === "string" && Object.hasOwn(extras, id) ? extras[id] : null;

// Preserve the same purchase and pause rules for the extra costumes.
export function buyCostume(s, id) {
  const item = extra(id);
  if (!item) return buyOriginal(s, id);
  if (!s || s.paused || !Number.isFinite(s.coins) || s.coins < item.price || !Array.isArray(s.wardrobe?.owned) || s.wardrobe.owned.includes(id)) return false;
  s.coins -= item.price;
  s.wardrobe.owned.push(id);
  return true;
}
export function wearCostume(s, id) {
  const item = extra(id);
  if (!item) return wearOriginal(s, id);
  if (!s || s.paused || !Array.isArray(s.wardrobe?.owned) || !s.wardrobe.owned.includes(id) || !s.wardrobe.equipped || typeof s.wardrobe.equipped !== "object" || s.wardrobe.equipped[item.character] === id) return false;
  s.wardrobe.equipped[item.character] = id;
  return true;
}

// New IDs fit the existing saved wardrobe; old and malformed saves still load.
export function restoreWardrobe(raw) {
  const wardrobe = restoreOriginals(raw);
  if (!wardrobe.owned.includes(WHEELS.id)) wardrobe.owned.push(WHEELS.id);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return wardrobe;
  if (Array.isArray(raw.owned)) wardrobe.owned = [...new Set([...wardrobe.owned, ...raw.owned.filter((id) => extra(id))])];
  for (const who of ["natalie", "shane"]) {
    const id = raw.equipped?.[who];
    if (extra(id)?.character === who && wardrobe.owned.includes(id)) wardrobe.equipped[who] = id;
  }
  return wardrobe;
}

export const LOOKS = {
  natalie: [
    { id: "olive", name: "Olive knit", price: 0, sweater: 0x604625 },
    { id: "plum", name: "Plum knit", price: 120, sweater: 0x5b2a4a },
    { id: "rust", name: "Rust knit", price: 160, sweater: 0x8a3f22 },
  ],
  shane: [
    { id: "black", name: "Black beanie", price: 0, beanie: 0x1a1210 },
    { id: "pumpkin", name: "Pumpkin beanie", price: 120, beanie: 0xc8641e },
    { id: "moss", name: "Moss beanie", price: 140, beanie: 0x4d5a2c },
  ],
};
export const freshLooks = () => ({ natalie: "olive", shane: "black", owned: ["olive", "black"] });

export function buyLook(s, who, id) {
  const look = LOOKS[who]?.find((l) => l.id === id);
  if (!look) return false;
  if (!s.looks.owned.includes(id)) {
    if (s.coins < look.price) return false;
    s.coins -= look.price;
    s.looks.owned.push(id);
  }
  s.looks[who] = id;
  return true;
}
// The recolour only applies to the original outfit.
export const activeLook = (s, who) => (s.wardrobe.equipped[who] === who + "-base" ? LOOKS[who].find((l) => l.id === s.looks[who]) : undefined);
