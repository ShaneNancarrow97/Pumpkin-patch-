// First playable cooking tier. These gates follow the published twelve-level
// economy; a future progression pass can change data without replacing saves.
export const COOKING = Object.freeze({ level: 5, price: 900, deliverySeconds: 60, deliveryFee: 6, orderLimit: 40, maxOrders: 2, pantryBase: 60, foodBase: 30 });
export const INGREDIENTS = Object.freeze([
  { id: "flour", name: "Flour", price: 2 },
  { id: "sugar", name: "Sugar", price: 2 },
  { id: "milk", name: "Milk", price: 3 },
  { id: "butter", name: "Butter", price: 3 },
  { id: "cocoa", name: "Cocoa", price: 4 },
  { id: "apples", name: "Apples", price: 3 },
  { id: "marshmallows", name: "Marshmallows", price: 2 },
  { id: "vegetables", name: "Vegetables", price: 3 },
  { id: "meat", name: "Meat", price: 6 },
  { id: "chicken", name: "Chicken", price: 5 },
  { id: "stock", name: "Vegetable stock", price: 2 },
  { id: "herbs", name: "Garden herbs", price: 2 },
  { id: "spices", name: "Autumn spices", price: 3 },
  { id: "berries", name: "Bramble berries", price: 3 },
].map(Object.freeze));
export const INGREDIENT_BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(INGREDIENTS.map(i => [i.id, i]))));
export const INGREDIENTS_BY_ID = INGREDIENT_BY_ID;
export const RECIPES = Object.freeze([
  { id: "wedges", name: "Lantern wedges", level: 5, price: 11, yield: 2, seconds: 30, research: 0, ingredients: { butter: 1 }, pumpkins: { 0: 1 }, text: "Roast orange pumpkin with butter until its edges glow." },
  { id: "soup", name: "Cauldron soup", level: 6, price: 13, yield: 2, seconds: 42, research: 180, ingredients: { milk: 1, butter: 1 }, pumpkins: { 0: 1 }, text: "A warming little pot of pumpkin soup for chilly visitors." },
  { id: "toffee-apples", name: "Wicked toffee apples", level: 7, price: 8, yield: 2, seconds: 45, research: 320, ingredients: { apples: 2, sugar: 2 }, pumpkins: {}, text: "Crisp apples hidden under a crackling amber shell." },
  { id: "pumpkin-jam", name: "Midnight pumpkin preserve", level: 8, price: 22, yield: 2, seconds: 70, research: 600, ingredients: { sugar: 2, apples: 1 }, pumpkins: { 0: 1 }, text: "A slow-bubbling preserve with a candlelit autumn flavour." },
  { id: "ghost-cookies", name: "Ghost cookies", level: 9, price: 4, yield: 4, seconds: 60, research: 850, ingredients: { flour: 2, sugar: 1, butter: 1 }, pumpkins: {}, text: "Buttery biscuits that haunt the shop shelves, briefly." },
  { id: "pumpkin-pie", name: "Hollow House pie", level: 10, price: 27, yield: 2, seconds: 85, research: 1400, ingredients: { flour: 2, sugar: 1, butter: 1 }, pumpkins: { 0: 1 }, text: "A golden pastry lid keeps a sweet pumpkin secret." },
  { id: "cocoa-brownies", name: "Graveyard brownies", level: 11, price: 7, yield: 4, seconds: 78, research: 2000, ingredients: { flour: 1, sugar: 1, cocoa: 2, butter: 1, marshmallows: 1 }, pumpkins: {}, text: "Rich, dark squares with a ghostly marshmallow topping." },
  { id: "moonlight-tart", name: "Moonlight tart", level: 12, price: 27, yield: 2, seconds: 90, research: 3200, ingredients: { flour: 2, sugar: 2, butter: 1 }, pumpkins: { 1: 1 }, text: "Pale Moonlight pumpkin folded into a crescent of pastry." },
  { id: "garden-skillet", name: "Garden ghost skillet", level: 5, price: 12, yield: 3, seconds: 40, research: 180, ingredients: { vegetables: 2, butter: 1, herbs: 1 }, pumpkins: {}, method: "pan", equipment: ["hob", "pan"], homeOnly: true, text: "Sizzle vegetables, butter and herbs into a bright little harvest supper." },
  { id: "harvest-broth", name: "Harvest cauldron broth", level: 6, price: 14, yield: 3, seconds: 50, research: 280, ingredients: { vegetables: 2, stock: 1, herbs: 1 }, pumpkins: {}, method: "simmer", equipment: ["hob", "pot"], homeOnly: true, text: "Let vegetables, stock and herbs bubble gently in a deep cooking pot." },
  { id: "spiced-roast", name: "Midnight spiced roast", level: 7, price: 19, yield: 3, seconds: 65, research: 500, ingredients: { meat: 2, vegetables: 2, spices: 1 }, pumpkins: {}, method: "bake", equipment: ["oven", "tray", "spice"], homeOnly: true, text: "Roast meat and vegetables with autumn spices until deeply golden." },
  { id: "moonfire-chicken", name: "Moonfire herb chicken", level: 8, price: 18, yield: 3, seconds: 60, research: 750, ingredients: { chicken: 2, butter: 1, herbs: 1, vegetables: 1 }, pumpkins: {}, method: "pan", equipment: ["hob", "pan"], homeOnly: true, text: "Pan-cook chicken with butter, herbs and vegetables for a warming supper." },
  { id: "haunted-pie", name: "Haunted harvest pie", level: 9, price: 26, yield: 4, seconds: 80, research: 1200, ingredients: { meat: 2, vegetables: 2, flour: 2, butter: 1 }, pumpkins: {}, method: "bake", equipment: ["oven", "tray"], homeOnly: true, text: "Fold a rich meat-and-vegetable filling into a buttery pastry crust." },
  { id: "pumpkin-spice-biscuits", name: "Pumpkin spice biscuits", level: 10, price: 8, yield: 6, seconds: 60, research: 1800, ingredients: { flour: 2, butter: 1, sugar: 1, spices: 1 }, pumpkins: { 0: 1 }, method: "bake", equipment: ["oven", "tray", "spice"], text: "Bake pumpkin, flour, butter, sugar and autumn spices into six fragrant biscuits." },
  // Berries come from the garden's bramble patches (or a delivery).
  { id: "bramble-crumble", name: "Bramble crumble", level: 6, price: 15, yield: 3, seconds: 55, research: 420, ingredients: { berries: 2, flour: 1, butter: 1, sugar: 1 }, pumpkins: {}, method: "bake", equipment: ["oven", "tray"], text: "Dark garden berries under a buttery, golden crumble." },
  { id: "bramble-apple-pie", name: "Bramble and apple pie", level: 9, price: 27, yield: 3, seconds: 80, research: 1250, ingredients: { berries: 2, apples: 2, flour: 2, butter: 1 }, pumpkins: {}, method: "bake", equipment: ["oven", "tray"], text: "Garden apples and berries under a lattice of crisp pastry." },
].map(r => Object.freeze({ ...r,
  method: r.method ?? (r.id === "wedges" ? "pan" : ["soup", "toffee-apples", "pumpkin-jam"].includes(r.id) ? "simmer" : "bake"),
  equipment: Object.freeze(r.equipment ?? (r.id === "wedges" ? ["hob", "pan"] : ["soup", "toffee-apples", "pumpkin-jam"].includes(r.id) ? ["hob", "pot"] : ["oven", "tray"])),
  basePrice: r.price, ingredients: Object.freeze(r.ingredients), pumpkins: Object.freeze(r.pumpkins) })));
export const RECIPE_BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(RECIPES.map(r => [r.id, r]))));
export const RECIPES_BY_ID = RECIPE_BY_ID;
export const KITCHEN_UPGRADES = Object.freeze([
  { id: "pantry", name: "Pantry shelves", level: 5, costs: [160, 480, 1400], text: "Room for another 60 raw ingredients per tier." },
  { id: "storage", name: "Food cupboard", level: 5, costs: [140, 420, 1200], text: "Store another 30 finished dishes per tier." },
  { id: "speed", name: "Enchanted utensils", level: 7, costs: [600, 1800, 5000], text: "Each tier cuts new cooking times by 15%." },
  { id: "truck-oven", name: "Truck baking kit", level: 7, costs: [700], text: "An oven and reusable trays for the truck's baked recipes." },
  { id: "truck-spices", name: "Truck seasoning kit", level: 7, costs: [260], text: "A mortar and spice station. Pantry spices are still consumed by recipes." },
  { id: "chef", name: "Hire the midnight chef", level: 10, costs: [7500], text: "A spooky chef cooks your selected recipe using ingredients you supply." },
].map(u => Object.freeze({ ...u, costs: Object.freeze(u.costs) })));
