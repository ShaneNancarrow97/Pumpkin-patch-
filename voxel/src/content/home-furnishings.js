// Fine-voxel pieces for a home that the owners can use as well as decorate.
const pieces = [
  { id: "costume-rack", name: "Midnight costume rail", price: 180, footprint: [2, 1], interaction: "wardrobe", description: "Velvet capes, a little pumpkin jumper and polished boots. Walk up to choose a costume." },
  { id: "moon-dressing-mirror", name: "Crescent dressing mirror", price: 240, footprint: [1, 1], interaction: "wardrobe", description: "A silvered cheval mirror with a bat-wing crest. Check a new look before heading out." },
  { id: "lantern-entry-console", name: "Lantern entrance console", price: 210, footprint: [2, 1], description: "Carved walnut, a brass key dish and a softly lit welcome home." },
  { id: "hanging-herb-shelf", name: "Blackthorn plant shelf", price: 135, wallWidth: 1, category: "decor", description: "Trailing ivy, moon fern and dried lavender on a little walnut wall shelf." },
  { id: "moonweave-rug", name: "Moonweave hearth rug", price: 150, footprint: [3, 2], rug: true, description: "Plum wool, woven stars and a golden crescent beneath tired gardening boots." },
  { id: "midnight-reading-bench", name: "Midnight reading bench", price: 195, footprint: [2, 1], description: "A tufted plum cushion beneath a carved bat backrest. A place for two and a book." },
  { id: "bedside-candle-cabinet", name: "Little candle cabinet", price: 120, footprint: [1, 1], category: "lights", description: "A sturdy bedside cupboard with a turned handle and a trio of warm candles." },
];
export const HOME_FURNISHINGS = Object.freeze(pieces.map(item => Object.freeze({
  ...item, footprint: item.footprint && Object.freeze(item.footprint),
  category: item.category ?? "furniture", wall: !!item.wallWidth, rug: !!item.rug,
  hangHeight: 2.25, spooky: item.id === "costume-rack" ? 2 : 1, collection: "living-home",
})));
export const HOME_FURNISHINGS_BY_ID = Object.freeze(Object.fromEntries(HOME_FURNISHINGS.map(item => [item.id, item])));
