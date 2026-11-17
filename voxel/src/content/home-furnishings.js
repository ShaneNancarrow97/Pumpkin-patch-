// Fine-voxel pieces for a home that the owners can use as well as decorate.
const pieces = [
  { id: "costume-rack", name: "Midnight costume rail", price: 180, footprint: [2, 1], interaction: "wardrobe", description: "Velvet capes, a little pumpkin jumper and polished boots. Walk up to choose a costume." },
  { id: "moon-dressing-mirror", name: "Crescent dressing mirror", price: 240, footprint: [1, 1], interaction: "wardrobe", description: "A silvered cheval mirror with a bat-wing crest. Check a new look before heading out." },
  { id: "lantern-entry-console", name: "Lantern entrance console", price: 210, footprint: [2, 1], description: "Carved walnut, a brass key dish and a softly lit welcome home." },
  { id: "hanging-herb-shelf", name: "Blackthorn plant shelf", price: 135, wallWidth: 1, category: "decor", description: "Trailing ivy, moon fern and dried lavender on a little walnut wall shelf." },
  { id: "moonweave-rug", name: "Moonweave hearth rug", price: 150, footprint: [3, 2], rug: true, description: "Plum wool, woven stars and a golden crescent beneath tired gardening boots." },
  { id: "midnight-reading-bench", name: "Midnight reading bench", price: 195, footprint: [2, 1], description: "A tufted plum cushion beneath a carved bat backrest. A place for two and a book." },
  { id: "bedside-candle-cabinet", name: "Little candle cabinet", price: 120, footprint: [1, 1], category: "lights", description: "A sturdy bedside cupboard with a turned handle and a trio of warm candles." },
  { id: "mothlight-pattern-table", name: "Mabel’s living pattern table", price: 650, footprint: [2,1], interaction: "wardrobe", collection: "mothlight", unlockEffect: "tailoring", description: "An embroidered plum runner, brass pattern lines and neatly wound thread from Mabel’s restored cottage." },
  { id: "mothlight-gem-lantern", name: "Lantern Amethyst reliquary", price: 450, footprint: [1,1], category: "lights", collection: "mothlight", unlockEffect: "copse-lantern", description: "A faceted amethyst held in aged brass. Its gentle light remembers the first cave descent." },
  { id: "mothlight-stained-glass", name: "Opal’s remembered window", price: 900, wallWidth: 1.3, category: "decor", collection: "mothlight", unlockEffect: "quarry-bell", description: "A domed plum-glass panel, warm central jewel and delicate brass leading." },
  { id: "mothlight-granny-rocker", name: "Granny’s patchwork rocker", price: 750, footprint: [2,2], collection: "mothlight", unlockEffect: "granny-table", description: "Curved oak runners, worn brass knobs and a quilted seat from the house inside the scarecrow maze." },
  { id: "mothlight-cinder-serving-board", name: "Cinder’s supper keepsake", price: 350, footprint: [1,1], category: "decor", collection: "mothlight", unlockEffect: "restaurant-opening", description: "Two mismatched mugs and a little lattice pie on a carved walnut serving board." },
  { id: "mothlight-lantern-night-diorama", name: "The village that remembered", price: 1600, footprint: [2,1], category: "lights", collection: "mothlight", unlockEffect: "lantern-night", description: "A miniature Mothlight beneath a golden moon; every tiny window softly glows." },
];
export const HOME_FURNISHINGS = Object.freeze(pieces.map(item => Object.freeze({
  ...item, footprint: item.footprint && Object.freeze(item.footprint),
  category: item.category ?? "furniture", wall: !!item.wallWidth, rug: !!item.rug,
  hangHeight: 2.25, spooky: item.id === "costume-rack" ? 2 : 1, collection: item.collection ?? "living-home",
})));
export const HOME_FURNISHINGS_BY_ID = Object.freeze(Object.fromEntries(HOME_FURNISHINGS.map(item => [item.id, item])));
