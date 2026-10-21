// One coordinate plan for garden rules, the 360-degree scene and its menus.
export const ESTATE_EXPANSIONS = [
  { name: "Cottage garden", width: 26, depth: 24, cost: 0, houseLevel: 0, capacity: 12 },
  { name: "Lantern garden", width: 32, depth: 28, cost: 650, houseLevel: 1, capacity: 20 },
  { name: "Moonlit grounds", width: 38, depth: 32, cost: 2200, houseLevel: 2, capacity: 32 },
  { name: "Haunted estate", width: 44, depth: 36, cost: 6500, houseLevel: 3, capacity: 48 },
];
export const ESTATE_HOUSE_RESERVE = { x0: -8, x1: 8, z0: -6, z1: 6 };
export const ESTATE_PATH_HALF_WIDTH = 1.5;
export const ESTATE_BORDER = .5;

export const ESTATE_DECOR = [
  { id: "lantern-post", name: "Copper lantern", cost: 85, w: .8, d: .8, height: 2.8, score: 1, houseLevel: 0, text: "A warm little beacon for the garden path." },
  { id: "rose-bed", name: "Midnight rose bed", cost: 110, w: 2.4, d: 1.2, height: .9, score: 1, houseLevel: 0, text: "Plum roses with silver leaves and a timber border." },
  { id: "pumpkin-pile", name: "Glowing pumpkin pile", cost: 100, w: 1.4, d: 1.4, height: 1, score: 1, houseLevel: 0, text: "A family of smiling pumpkins for the doorstep." },
  { id: "stone-urn", name: "Moonflower urn", cost: 140, w: 1, d: 1, height: 1.5, score: 1, houseLevel: 0, text: "A carved stone planter spilling with night flowers." },
  { id: "garden-bench", name: "Twisted iron bench", cost: 250, w: 2.4, d: 1.2, height: 1.4, score: 2, houseLevel: 0, text: "Somewhere to sit and admire your little empire." },
  { id: "bird-bath", name: "Raven bird bath", cost: 360, w: 1.5, d: 1.5, height: 1.5, score: 2, houseLevel: 0, text: "Moonlit water, with a raven who has claimed the best spot." },
  { id: "gargoyle", name: "Sleepy gargoyle", cost: 450, w: 1.2, d: 1.2, height: 1.9, score: 3, houseLevel: 1, text: "A watchful stone friend with very small wings." },
  { id: "crooked-tree", name: "Crooked autumn tree", cost: 650, w: 3, d: 3, height: 5, score: 3, houseLevel: 1, text: "Copper leaves, a crooked trunk and a few friendly bats." },
  { id: "moon-fountain", name: "Crescent fountain", cost: 1200, w: 3.2, d: 3.2, height: 2.8, score: 5, houseLevel: 2, text: "A glowing crescent above a tiered stone pool." },
  { id: "coffin-planter", name: "Coffin planter", cost: 240, w: 1.2, d: 2, height: .85, score: 2, houseLevel: 0, text: "Quite a comfortable home for trailing ivy." },
  { id: "rose-arch", name: "Haunted rose arch", cost: 620, w: 2.8, d: 1.2, height: 3.4, score: 3, houseLevel: 1, text: "Climbing roses wind around a wrought-iron arch." },
  { id: "wishing-well", name: "Whispering well", cost: 780, w: 2.2, d: 2.2, height: 3, score: 4, houseLevel: 1, text: "A tiled little roof and a bucket full of wishes." },
  { id: "bat-hedge", name: "Bat topiary", cost: 175, w: 2, d: 1, height: 1.6, score: 2, houseLevel: 0, text: "A neatly clipped hedge with a wonderfully untidy silhouette." },
  { id: "mushroom-patch", name: "Mooncap mushrooms", cost: 125, w: 1.5, d: 1.5, height: .75, score: 1, houseLevel: 0, text: "Little lilac caps glowing in the autumn grass." },
  { id: "fire-pit", name: "Harvest fire bowl", cost: 720, w: 2.2, d: 2.2, height: 1.2, score: 4, houseLevel: 1, text: "A copper fire bowl for cosy evenings outside." },
  { id: "ghost-scarecrow", name: "Garden ghost", cost: 320, w: 1.6, d: 1, height: 2.4, score: 2, houseLevel: 0, text: "A friendly sheet ghost with a tiny lantern." },
];
const finish = (id, category, name, cost, houseLevel, color, light, dark) => ({ id, category, name, cost, houseLevel, color, palette: [color, light, dark] });
export const ESTATE_FINISHES = [
  finish("warm-timber", "walls", "Warm timber", 0, 0, 0x75503b, 0x967052, 0x493326),
  finish("moon-stone", "walls", "Moonwashed stone", 280, 0, 0x828594, 0xa8aab4, 0x585c6d),
  finish("midnight-brick", "walls", "Midnight brick", 650, 1, 0x4a3547, 0x715267, 0x302534),
  finish("pumpkin-plaster", "walls", "Pumpkin plaster", 1100, 2, 0xc27b43, 0xe4a164, 0x875031),
  finish("midnight-slate", "roof", "Midnight slate", 0, 0, 0x302f43, 0x51516a, 0x1f202d),
  finish("witch-plum", "roof", "Witch-plum tiles", 260, 0, 0x57384f, 0x7e5674, 0x372536),
  finish("verdigris", "roof", "Verdigris copper", 580, 1, 0x46716b, 0x69988a, 0x2d4a47),
  finish("ember-tiles", "roof", "Ember tiles", 950, 2, 0x8e493c, 0xb36a50, 0x5d302d),
  finish("old-brass", "trim", "Old brass", 0, 0, 0xb7975e, 0xdfbf80, 0x7b6139),
  finish("bone-ivory", "trim", "Bone ivory", 180, 0, 0xdfd0ad, 0xf5e6c8, 0xa99a7b),
  finish("black-iron", "trim", "Black iron", 340, 1, 0x292830, 0x49464d, 0x19191f),
  finish("moon-silver", "trim", "Moon silver", 700, 2, 0xabadb7, 0xd6d5dd, 0x777b8b),
  finish("plum-door", "door", "Plum welcome", 0, 0, 0x4a2d45, 0x72536a, 0x2d1d2c),
  finish("copper-door", "door", "Copper welcome", 160, 0, 0x985c39, 0xc88b57, 0x613c2a),
  finish("sage-door", "door", "Sage welcome", 320, 1, 0x536347, 0x84916b, 0x35412f),
  finish("midnight-door", "door", "Midnight welcome", 550, 2, 0x292638, 0x4c465e, 0x1a1926),
  finish("gothic-iron", "fence", "Gothic iron", 0, 0, 0x252630, 0x4b4852, 0x171820),
  finish("weathered-pickets", "fence", "Weathered pickets", 220, 0, 0x795d45, 0xa18260, 0x4d3e30),
  finish("bone-fence", "fence", "Bone-white pickets", 550, 1, 0xd2c3a0, 0xefdfbe, 0x9c8e74),
  finish("rose-iron", "fence", "Briar iron", 900, 2, 0x5e3c52, 0x8b5b74, 0x3b2938),
];
export const ESTATE_DEFAULT_FINISHES = { walls: "warm-timber", roof: "midnight-slate", trim: "old-brass", door: "plum-door", fence: "gothic-iron" };
export const ESTATE_DECOR_BY_ID = Object.assign(Object.create(null), Object.fromEntries(ESTATE_DECOR.map(d => [d.id, d])));
export const ESTATE_FINISH_BY_ID = Object.assign(Object.create(null), Object.fromEntries(ESTATE_FINISHES.map(f => [f.id, f])));
