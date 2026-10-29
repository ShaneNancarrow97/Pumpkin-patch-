// One coordinate plan for garden rules, the 360-degree scene and its menus.
export const ESTATE_EXPANSIONS = [
  { name: "Cottage garden", width: 26, depth: 24, cost: 0, houseLevel: 0, capacity: 12 },
  { name: "Lantern garden", width: 32, depth: 28, cost: 650, houseLevel: 1, capacity: 20 },
  { name: "Moonlit grounds", width: 38, depth: 32, cost: 2200, houseLevel: 2, capacity: 32 },
  { name: "Haunted estate", width: 44, depth: 36, cost: 6500, houseLevel: 3, capacity: 48 },
];
export const ESTATE_HOUSE_RESERVE = { x0: -8, x1: 8, z0: -6, z1: 6 };
// The house's walls by level, centred on the garden's origin with the front
// door in the middle of the front wall (house-estate-world.js builds them).
// From level 2 a kitchen wing stands off the left side.
export const ESTATE_HOUSE_SIZES = [{ w: 6, d: 5, h: 3.8 }, { w: 8, d: 6, h: 6.4 }, { w: 9.5, d: 7, h: 7 }, { w: 11, d: 7.6, h: 7.8 }];
export const ESTATE_KITCHEN_WING = { level: 2, out: .45, z: -.35, w: 2.2, d: 3.6 };
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
// Full-house collections reuse finish ownership, so old gardens need no save migration.
const houseSkin = (id, name, text, cost, houseLevel, palettes, accent, windowGlow) => ({
  id, name, text, cost, houseLevel, palettes, accent, windowGlow,
  finishes: Object.fromEntries(["walls", "roof", "trim", "door"].map(part => [part, `${id}-${part}`])),
});
export const ESTATE_HOUSE_SKINS = [
  houseSkin("harvest-haunt", "Harvest haunt", "Burnt-pumpkin walls, black slates and a lantern-warm welcome.", 320, 0,
    { walls: [0x99502f, 0xc87a42, 0x603825], roof: [0x292735, 0x4b4353, 0x191a25], trim: [0xd3a55e, 0xf3ce83, 0x8e673b], door: [0x533044, 0x815064, 0x321f30] }, 0xf3a34e, 0xffb95e),
  houseSkin("moonlit-cottage", "Moonlit cottage", "Ghost-pale stone, blue slates and silver details beneath the moon.", 380, 0,
    { walls: [0x9b9eaa, 0xc6c7ce, 0x666b7e], roof: [0x3c4e70, 0x667c9b, 0x28364e], trim: [0xd8d8d2, 0xf1eee0, 0x9b9faa], door: [0x465675, 0x7488a6, 0x2b3852] }, 0xc7dcff, 0xc5e4ff),
  houseSkin("witchwood", "Witchwood retreat", "Mossy timber, plum roof tiles and an eerie green glow among the ivy.", 1100, 1,
    { walls: [0x526045, 0x7d8d5e, 0x34422f], roof: [0x503452, 0x7b5279, 0x312535], trim: [0xb79d63, 0xd9c286, 0x796c43], door: [0x39283f, 0x624468, 0x251c2c] }, 0x9ccb70, 0xc1ed94),
  houseSkin("candy-coven", "Candy coven", "Gingerbread brickwork, berry tiles and icing-white trim for a wickedly sweet home.", 1250, 1,
    { walls: [0x95603f, 0xc18a60, 0x613c2c], roof: [0x783c62, 0xa45b82, 0x4d2947], trim: [0xe7d5ba, 0xffecd1, 0xb49a85], door: [0x8d3e4d, 0xbd6676, 0x5b293d] }, 0xec92b2, 0xffcb94),
  houseSkin("vampire-manor", "Vampire manor", "Charcoal masonry, oxblood joinery and antique gold. The candles never go out.", 2800, 2,
    { walls: [0x433842, 0x665160, 0x2b252f], roof: [0x262333, 0x454052, 0x171720], trim: [0xb28b59, 0xdfbb7c, 0x78603c], door: [0x6a293c, 0x9e4658, 0x411d2c] }, 0xd35667, 0xffa779),
  houseSkin("storm-laboratory", "Storm laboratory", "Weathered blue stone, copper-green roofing and electric windows for midnight experiments.", 3200, 2,
    { walls: [0x5b6c7d, 0x8296a2, 0x394958], roof: [0x36756f, 0x64a49a, 0x244e4d], trim: [0xb4c4c8, 0xdeece9, 0x748c97], door: [0x344759, 0x59768b, 0x22323f] }, 0x87e0d5, 0xa5f2ed),
  houseSkin("pumpkin-palace", "Pumpkin palace", "A grand jack-o’-lantern estate in rich pumpkin, ebony and harvest gold.", 6500, 3,
    { walls: [0xa75b31, 0xd68c4c, 0x6c3824], roof: [0x322637, 0x584259, 0x201a28], trim: [0xd9ac58, 0xffd784, 0x92703d], door: [0x4d2d39, 0x7e4752, 0x301d28] }, 0xffbd57, 0xffce78),
  houseSkin("midnight-crypt", "Midnight crypt", "Bone-white stone and obsidian roofs, watched over by a spectral violet light.", 7200, 3,
    { walls: [0xb6ad9e, 0xe2d6bf, 0x817b79], roof: [0x282337, 0x4b3b5e, 0x191724], trim: [0x55405f, 0x80618c, 0x362b42], door: [0x332b43, 0x574769, 0x211e2c] }, 0xc69ee6, 0xdec2ff),
];
for (const skin of ESTATE_HOUSE_SKINS) for (const [part, palette] of Object.entries(skin.palettes)) {
  ESTATE_FINISHES.push({ ...finish(skin.finishes[part], part, `${skin.name} ${part}`, 0, skin.houseLevel, ...palette), skinOnly: true, skinId: skin.id, accent: skin.accent, windowGlow: skin.windowGlow });
}
export const ESTATE_SKIN_BY_ID = Object.assign(Object.create(null), Object.fromEntries(ESTATE_HOUSE_SKINS.map(skin => [skin.id, skin])));
export const ESTATE_DEFAULT_FINISHES = { walls: "warm-timber", roof: "midnight-slate", trim: "old-brass", door: "plum-door", fence: "gothic-iron" };
export const ESTATE_DECOR_BY_ID = Object.assign(Object.create(null), Object.fromEntries(ESTATE_DECOR.map(d => [d.id, d])));
export const ESTATE_FINISH_BY_ID = Object.assign(Object.create(null), Object.fromEntries(ESTATE_FINISHES.map(f => [f.id, f])));
