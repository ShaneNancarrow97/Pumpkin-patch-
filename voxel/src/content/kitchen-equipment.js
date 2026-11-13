// Useful kitchen pieces share the house's normal buying, storage and placement.
// Capabilities belong to a placed object, never to a purchase in storage.
const tools = [
  { id: "kitchen-hob", name: "Lantern kitchen hob", price: 600, footprint: [2, 1], grants: ["hob"], description: "An enamel hob on a walnut cupboard. A placed pan or pot makes it useful." },
  { id: "kitchen-oven", name: "Moonfire baking oven", price: 1100, footprint: [2, 1], grants: ["oven"], description: "A little cast-iron oven with ember-lit glass. Add a baking tray for pies and biscuits." },
  { id: "kitchen-pot-rail", name: "Copper cooking pots", price: 180, wallWidth: 1, grants: ["pot"], description: "A deep stockpot and saucepan for soups, preserves and simmering." },
  { id: "kitchen-pan-rail", name: "Harvest frying pans", price: 160, wallWidth: 1, grants: ["pan"], description: "A seasoned iron skillet and copper frying pan for the kitchen hob." },
  { id: "kitchen-baking-rack", name: "Baking tray rack", price: 220, wallWidth: 1, grants: ["tray"], description: "A pair of reusable oven trays, hung neatly above the worktop." },
  { id: "kitchen-spice-shelf", name: "Autumn spice shelf", price: 260, wallWidth: 1, grants: ["spice"], description: "Labelled jars and a mortar for preparing spices. Recipes still use pantry ingredients." },
];
export const KITCHEN_EQUIPMENT = Object.freeze(tools.map(item => Object.freeze({
  ...item, grants: Object.freeze(item.grants), footprint: item.footprint && Object.freeze(item.footprint),
  category: item.wallWidth ? "decor" : "furniture", wall: !!item.wallWidth, rug: false,
  hangHeight: 2.5, spooky: item.id === "kitchen-oven" ? 2 : 1, collection: "kitchen-workshop",
})));
export const KITCHEN_EQUIPMENT_BY_ID = Object.freeze(Object.fromEntries(KITCHEN_EQUIPMENT.map(item => [item.id, item])));
export const KITCHEN_CAPABILITIES = Object.freeze(Object.fromEntries([
  ...KITCHEN_EQUIPMENT.map(item => [item.id, item.grants]),
  ["copper-range", ["hob", "oven", "tray", "pot", "pan"]],
  ["copper-pan-rail", ["pan"]],
  ["iron-utensil-rack", ["pan", "pot"]],
  ["gothic-spice-cabinet", ["spice"]],
].map(([id, grants]) => [id, Object.freeze(grants)])));
export const KITCHEN_CAPABILITY_NAMES = Object.freeze({
  hob: "Hob", oven: "Oven", pot: "Cooking pot", pan: "Frying pan", tray: "Baking tray", spice: "Spice preparation",
});
