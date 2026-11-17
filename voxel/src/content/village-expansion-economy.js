// Village discoveries buy useful farm capabilities without another currency.
export const EXPANSION_ECONOMY_UPGRADES = Object.freeze([
  { id: 'cold-store', name: 'Opal’s lantern cold store', reward: 'cold-store-blueprint', level: 9, coins: 1200, materials: { iron: 6, clay: 4 }, gems: { 'ember-garnet': 1 }, text: 'Pumpkins last 20% longer. Preservation wax can add another 10%.' },
]);
export const EXPANSION_COMMISSIONS = Object.freeze([
  { id: 'cinder-first-supper', who: 'cinder', name: 'A supper worth remembering', recipe: 'cinders-lantern-stew', quantity: 4, premium: 1.2 },
  { id: 'cinder-pastry-table', who: 'cinder', name: 'Pastries for the window table', recipe: 'pumpkin-pie', quantity: 4, premium: 1.2 },
  { id: 'granny-pudding-parcel', who: 'granny', name: 'Granny’s doorstep parcels', recipe: 'grannys-bramble-pudding', quantity: 4, premium: 1.2 },
]);
export const EXPANSION_FARM_RECIPES = Object.freeze([
  { id: 'cinders-lantern-stew', name: 'Cinder’s lantern stew', level: 9, price: 20, yield: 3, seconds: 60, research: 0, discovery: 'cinder-recipe', ingredients: { vegetables: 2, stock: 1, herbs: 1 }, pumpkins: { 0: 1 }, method: 'simmer', equipment: ['hob', 'pot'], text: 'A clear, warming pumpkin stew learned at Cinder’s restored restaurant.' },
  { id: 'grannys-bramble-pudding', name: 'Granny’s bramble pudding', level: 8, price: 18, yield: 3, seconds: 55, research: 0, discovery: 'granny-recipe', ingredients: { berries: 2, flour: 1, butter: 1, sugar: 1 }, pumpkins: {}, method: 'bake', equipment: ['oven', 'tray'], text: 'A dark berry pudding under a golden crust, with Granny’s surprisingly generous portions.' },
]);
