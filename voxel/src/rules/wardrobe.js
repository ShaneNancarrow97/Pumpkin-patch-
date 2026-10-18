// Costumes are the main game's own (src/core/costume-model.mjs). On top of the
// original outfits, Natalie's knit and Shane's beanie can be recoloured.
export { buyCostume, costumeById, costumeCatalog, freshWardrobe, restoreWardrobe, wearCostume } from "../../../src/core/costume-model.mjs";

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
