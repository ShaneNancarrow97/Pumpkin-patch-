var costumeCatalog = [
  { id: "natalie-base", character: "natalie", name: "Natalie’s original outfit", price: 0, description: "Her olive sweater, favourite boots, glasses, and familiar little details.", row: null, artpath: "assets/house/character-atlas.webp", column: 0 },
  { id: "natalie-witch", character: "natalie", name: "Harvest witch", price: 80, description: "A pointed hat, enchanted layers, and a little pumpkin-growing magic.", row: 0, artpath: "assets/house/natalie-costumes.webp" },
  { id: "natalie-ghostbride", character: "natalie", name: "Ghost bride", price: 120, description: "Moon-white lace and a haunting veil for a wonderfully spooky evening.", row: 1, artpath: "assets/house/natalie-costumes.webp" },
  { id: "natalie-batqueen", character: "natalie", name: "Bat queen", price: 150, description: "Velvet, batwing details, and queen-of-the-patch energy.", row: 2, artpath: "assets/house/natalie-costumes.webp" },
  { id: "shane-base", character: "shane", name: "Shane’s original outfit", price: 0, description: "His black beanie, dark jacket, and dependable harvest-day style.", row: null, artpath: "assets/house/character-atlas.webp", column: 1 },
  { id: "shane-vampire", collection: "90s-horror", character: "shane", name: "Midnight vampire", price: 80, description: "A dramatic cape and a sharp collar. The pumpkins are quite safe.", row: 0, artpath: "assets/house/shane-costumes.webp" },
  { id: "shane-skeleton", character: "shane", name: "Dancing skeleton", price: 100, description: "A skeletal suit for long nights and excellent dancing bones.", row: 1, artpath: "assets/house/shane-costumes.webp" },
  { id: "shane-scarecrow", character: "shane", name: "Pumpkin scarecrow", price: 140, description: "Patched autumn layers, a straw hat, and lantern-orange harvest charm.", row: 2, artpath: "assets/house/shane-costumes.webp" },
  { id: "natalie-vampire", collection: "90s-horror", character: "natalie", name: "Velvet vampire", price: 450, description: "A crimson-lined cape, velvet dress and tiny fangs for a midnight movie marathon.", row: null, artpath: "assets/house/natalie-vampire-idle.webp" },
  { id: "natalie-frankenstein", collection: "90s-horror", character: "natalie", name: "Patchwork monster", price: 650, description: "Playful green makeup, stitched details and chunky boots, straight from the costume box.", row: null, artpath: "assets/house/natalie-frankenstein-idle.webp" },
  { id: "natalie-mummy", collection: "90s-horror", character: "natalie", name: "Moonlit mummy", price: 850, description: "Soft linen wrappings and golden amulet details for a cosy curse beneath the moon.", row: null, artpath: "assets/house/natalie-mummy-idle.webp" },
  { id: "natalie-slasher", collection: "90s-horror", character: "natalie", name: "Midnight slasher", price: 1200, description: "An original pale scream mask and flowing black hood for a spooky nineties movie night.", row: null, artpath: "assets/house/natalie-slasher-idle.webp" },
  { id: "shane-frankenstein", collection: "90s-horror", character: "shane", name: "Patchwork monster", price: 650, description: "A broad-shouldered stitched jacket, playful green makeup and heavy monster boots.", row: null, artpath: "assets/house/shane-frankenstein-idle.webp" },
  { id: "shane-mummy", collection: "90s-horror", character: "shane", name: "Moonlit mummy", price: 850, description: "Weathered linen wrappings, a golden amulet and a very ancient sense of style.", row: null, artpath: "assets/house/shane-mummy-idle.webp" },
  { id: "shane-slasher", collection: "90s-horror", character: "shane", name: "Midnight slasher", price: 1200, description: "An original pale scream mask and ragged black robe. The pumpkins have nothing to fear.", row: null, artpath: "assets/house/shane-slasher-idle.webp" }
];
var costumeById = Object.fromEntries(costumeCatalog.map((item) => [item.id, item]));
function wardrobeItem(id) {
  return typeof id === "string" && Object.hasOwn(costumeById, id) ? costumeById[id] : null;
}
function freshWardrobe() {
  return { owned: ["natalie-base", "shane-base"], equipped: { natalie: "natalie-base", shane: "shane-base" } };
}
function restoreWardrobe(raw) {
  const wardrobe = freshWardrobe();
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return wardrobe;
  if (Array.isArray(raw.owned))
    wardrobe.owned = [.../* @__PURE__ */ new Set([...wardrobe.owned, ...raw.owned.filter((id) => wardrobeItem(id))])];
  for (const character of ["natalie", "shane"]) {
    const id = raw.equipped?.[character], item = wardrobeItem(id);
    if (item?.character === character && wardrobe.owned.includes(id))
      wardrobe.equipped[character] = id;
  }
  return wardrobe;
}
function validWardrobe(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !Array.isArray(raw.owned) || raw.owned.length !== new Set(raw.owned).size || raw.owned.some((id) => !wardrobeItem(id)) || !raw.owned.includes("natalie-base") || !raw.owned.includes("shane-base") || !raw.equipped || typeof raw.equipped !== "object" || Array.isArray(raw.equipped) || Object.keys(raw.equipped).length !== 2)
    return false;
  return ["natalie", "shane"].every((character) => Object.hasOwn(raw.equipped, character) && wardrobeItem(raw.equipped[character])?.character === character && raw.owned.includes(raw.equipped[character]));
}
function buyCostume(s, id) {
  const item = wardrobeItem(id);
  if (!item || item.price === 0 || !s || s.paused || !Number.isFinite(s.coins) || s.coins < item.price || !Array.isArray(s.wardrobe?.owned) || s.wardrobe.owned.includes(id))
    return false;
  s.coins -= item.price;
  s.wardrobe.owned.push(id);
  return true;
}
function wearCostume(s, id) {
  const item = wardrobeItem(id);
  if (!item || !s || s.paused || !Array.isArray(s.wardrobe?.owned) || !s.wardrobe.owned.includes(id) || !s.wardrobe.equipped || typeof s.wardrobe.equipped !== "object" || s.wardrobe.equipped[item.character] === id)
    return false;
  s.wardrobe.equipped[item.character] = id;
  return true;
}

export { buyCostume, costumeById, costumeCatalog, freshWardrobe, restoreWardrobe, validWardrobe, wearCostume };
