// Adapt the main wardrobe here, so extra voxel art never changes its catalogue.
import { buyCostume as buyOriginal, costumeCatalog as originals, freshWardrobe as freshOriginal, restoreWardrobe as restoreOriginals, wearCostume as wearOriginal } from "../../../src/core/costume-model.mjs";
import { EXTRA_COSTUMES } from "../costume-expansion.js";
import { SECRET_LOOKS } from "../content/homecoming.js";

const WHEELS = { id: "natalie-wheelchair", character: "natalie", name: "Purple wheels & dungarees", description: "Purple wheelchair, plaits and stylish dungarees.", price: 0, collection: "everyday" };
export const freshWardrobe = () => { const w = freshOriginal(); w.owned.push(WHEELS.id); return w; };
export const costumeCatalog = [...originals, ...EXTRA_COSTUMES, WHEELS];
export const costumeById = Object.fromEntries(costumeCatalog.map((item) => [item.id, item]));
const extras = Object.fromEntries([...EXTRA_COSTUMES, WHEELS].map((item) => [item.id, item]));
const extra = (id) => typeof id === "string" && Object.hasOwn(extras, id) ? extras[id] : null;

// Preserve the same purchase and pause rules for the extra costumes.
export const VILLAGE_COSTUME_GATES = Object.freeze({
  "natalie-mummy": { quest: "lantern-keepers", title: "The Lantern Keepers" },
  "shane-mummy": { quest: "lantern-keepers", title: "The Lantern Keepers" },
});
// These are granted rewards, including later level rewards, never a cash unlock.
// Existing owned costumes are always kept, including saves made before the village gate.
export function costumeVillageGate(s, id) {
  const gate = typeof id === "string" && Object.hasOwn(VILLAGE_COSTUME_GATES, id) ? VILLAGE_COSTUME_GATES[id] : null;
  return !gate || s?.wardrobe?.owned?.includes(id) ? null : { ...gate, reason: `Earn in Mothlight: ${gate.title}` };
}
export function buyCostume(s, id) {
  if (costumeVillageGate(s, id)) return false;
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
    ...SECRET_LOOKS.filter(look => look.character === "natalie"),
  ],
  shane: [
    { id: "black", name: "Black beanie", price: 0, beanie: 0x1a1210 },
    { id: "pumpkin", name: "Pumpkin beanie", price: 120, beanie: 0xc8641e },
    { id: "moss", name: "Moss beanie", price: 140, beanie: 0x4d5a2c },
    ...SECRET_LOOKS.filter(look => look.character === "shane"),
  ],
};
export const freshLooks = () => ({ natalie: "olive", shane: "black", owned: ["olive", "black"] });
const lookFor = (who, id) => (who === "natalie" || who === "shane") ? LOOKS[who].find(look => look.id === id) : undefined;
const LOOK_IDS = new Set(Object.values(LOOKS).flat().map(look => look.id));

// New colours use the existing saved look inventory. Keep valid old purchases,
// but never equip an unknown colour, another owner's colour or unowned reward.
export function restoreLooks(raw) {
  const looks = freshLooks();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return looks;
  if (Array.isArray(raw.owned)) looks.owned = [...new Set([...looks.owned, ...raw.owned.filter(id => LOOK_IDS.has(id))])];
  for (const who of ["natalie", "shane"]) {
    if (lookFor(who, raw[who]) && looks.owned.includes(raw[who])) looks[who] = raw[who];
  }
  return looks;
}

export function buyLook(s, who, id) {
  const look = lookFor(who, id);
  if (!look || !s || s.paused || !Array.isArray(s.looks?.owned)) return false;
  if (!s.looks.owned.includes(id)) {
    if (look.secret || !Number.isFinite(look.price) || !Number.isFinite(s.coins) || s.coins < look.price) return false;
    s.coins -= look.price;
    s.looks.owned.push(id);
  }
  s.looks[who] = id;
  return true;
}
// An explicit Wear look action equips the original outfit and an already earned
// colour together. Discovering the keepsake itself never changes either outfit.
export function wearVillageLook(s, who, id) {
  const look = lookFor(who, id), base = who + "-base";
  if (!s || s.paused || !look?.secret || !Array.isArray(s.looks?.owned) || !s.looks.owned.includes(id)
    || !Array.isArray(s.wardrobe?.owned) || !s.wardrobe.owned.includes(base) || !s.wardrobe.equipped || typeof s.wardrobe.equipped !== "object" || Array.isArray(s.wardrobe.equipped)
    || (s.wardrobe.equipped[who] === base && s.looks[who] === id)) return false;
  s.wardrobe.equipped[who] = base;
  s.looks[who] = id;
  return true;
}
// The recolour only applies to the original outfit.
export const activeLook = (s, who) => (s?.wardrobe?.equipped?.[who] === who + "-base" && Array.isArray(s?.looks?.owned) && s.looks.owned.includes(s.looks[who]) ? lookFor(who, s.looks[who]) : undefined);
