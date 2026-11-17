// The garden's fishing lake (handover 71): what bites, what the traps bring
// up, the gear that improves both, and where things stand on the lake piece.
// The rules are in rules/fishing.js; the lake is drawn by fishing-lake-models.js.

// The lake piece's plan in its own units: x across, z towards the jetty's
// shore. The piece's footprint (ESTATE_DECOR "fishing-lake") is 7.2 by 5.2.
export const LAKE = Object.freeze({
  w: 7.2, d: 5.2,
  rx: 3.05, rz: 2.12,                                              // the water's oval, inside its stone bank
  jetty: Object.freeze({ x: -1.2, z0: .35, z1: 2.6, w: 1.1, deck: .3 }), // boards from the shore out over the water
  stand: Object.freeze({ x: -1.2, z: .75 }),                      // where the owner stands to fish: the jetty's end
  bobber: Object.freeze({ x: -1.45, z: -1.05 }),                  // where the line lands
  traps: Object.freeze([{ x: 2.55, z: -1.45 }, { x: -2.75, z: -1.2 }, { x: 2.75, z: 1.15 }, { x: -2.95, z: 1.45 }].map(Object.freeze)),
});

// How much a tier of luck moves a rarity's weight: commons and junk give
// way to rarer fish as the gear gets better.
export const LUCK = Object.freeze({ common: -.14, uncommon: .32, rare: .85, legendary: 1.6, junk: -.45 });
export const RARITY_NAMES = Object.freeze({ common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Legendary", junk: "Junk" });

// Every catch. `rod` and `trap` are how often it turns up on each, before
// luck. `gives` is pantry ingredients; `value` is what a curiosity sells for
// instead. `kg` is its size range. `colours` paint its picture and model:
// back, belly, fin, eye.
export const FISH = Object.freeze([
  { id: "moon-minnow", name: "Moon minnow", rarity: "common", rod: 30, trap: 18, kg: [.04, .18], gives: { fish: 1 }, colours: ["#b9c3d6", "#eef1f6", "#8d97b4", "#1d1a24"], text: "Tiny and silver, and always first to the bait." },
  { id: "lantern-perch", name: "Lantern perch", rarity: "common", rod: 26, trap: 0, kg: [.3, 1.4], gives: { fish: 1 }, colours: ["#d98b32", "#f7d6a0", "#c4532a", "#1d1a24"], stripes: "#5b3a25", text: "Striped like a paper lantern, and as bright." },
  { id: "pumpkinseed", name: "Pumpkinseed sunfish", rarity: "uncommon", rod: 14, trap: 0, kg: [.1, .45], gives: { fish: 1 }, colours: ["#4f8fa3", "#f39a3a", "#3a6f85", "#1d1a24"], spots: "#f6c76a", text: "Orange-bellied and freckled: the patch's own fish." },
  { id: "ghost-roach", name: "Ghost roach", rarity: "uncommon", rod: 12, trap: 0, kg: [.2, .9], gives: { fish: 1 }, colours: ["#d7dde8", "#f4f6fa", "#c98aa0", "#8c2f3e"], text: "So pale you can almost see the reeds through it." },
  { id: "bog-carp", name: "Bog carp", rarity: "uncommon", rod: 9, trap: 0, kg: [1.5, 7], gives: { fish: 2 }, colours: ["#8a7a3c", "#d8c47c", "#6b5426", "#1d1a24"], text: "A bronze old grumbler from the bottom mud." },
  { id: "midnight-eel", name: "Midnight eel", rarity: "rare", rod: 5, trap: 9, kg: [.6, 3], gives: { fish: 2 }, colours: ["#3b2c4f", "#7c6a8e", "#2a1f38", "#e7c45a"], eel: true, text: "Slips in at dusk, purple-black and very cross." },
  { id: "witch-pike", name: "Witch pike", rarity: "rare", rod: 3, trap: 0, kg: [3, 12], gives: { fish: 3 }, colours: ["#5f7d3a", "#c9d79a", "#7b3f6e", "#f1d34b"], spots: "#a0558f", text: "Green, spotted plum and full of teeth." },
  { id: "golden-koi", name: "Golden koi", rarity: "legendary", rod: .6, trap: 0, kg: [2, 6], value: 400, colours: ["#f2b632", "#ffe7a1", "#e47b1c", "#1d1a24"], text: "A collector pays well for one. It looked rather pleased about it." },
  { id: "old-boot", name: "Old boot", rarity: "junk", rod: 6, trap: 4, kg: [.4, .9], value: 0, junk: true, colours: ["#5a3d2b", "#7a5638", "#3a271c", "#c9b48a"], text: "Size nine. No sign of the other one." },
  { id: "crayfish", name: "Signal crayfish", rarity: "common", rod: 0, trap: 46, kg: [.04, .14], gives: { crayfish: 2 }, colours: ["#9a3f2a", "#d97a4f", "#6e2a1c", "#1d1a24"], crayfish: true, text: "Two at a time, snapping, for Maisie's pot." },
  { id: "moon-pearl", name: "Moon pearl mussel", rarity: "rare", rod: 0, trap: 2.4, kg: [.1, .3], value: 150, colours: ["#2f3a4a", "#e9e4f2", "#56657a", "#f4f1ff"], mussel: true, text: "A mussel holding a pearl like a tiny full moon." },
].map((f) => Object.freeze({ ...f, kg: Object.freeze(f.kg), colours: Object.freeze(f.colours), ...(f.gives ? { gives: Object.freeze(f.gives) } : {}) })));
export const FISH_BY_ID = Object.freeze(Object.fromEntries(FISH.map((f) => [f.id, f])));

// Rods: how long the strike window stays open after a bite, and how much
// luck they bring. The enchanted rod never hooks a boot.
export const RODS = Object.freeze([
  { id: "willow", name: "Willow cane", cost: 0, level: 0, window: .9, luck: 0, text: "Bendy, honest and free with the lake." },
  { id: "split-cane", name: "Split-cane rod", cost: 350, level: 0, window: 1.1, luck: 1, text: "A longer strike window and a better class of fish." },
  { id: "moonlight", name: "Moonlight rod", cost: 1400, level: 8, window: 1.3, luck: 2, text: "Silver-whipped: rare fish bite far more often." },
  { id: "enchanted", name: "Enchanted rod", cost: 4800, level: 12, window: 1.55, luck: 3, noJunk: true, text: "Hums when a big one's near. Never hooks a boot." },
].map(Object.freeze));
// Bait: how soon something bites (seconds after the cast), and luck.
export const BAITS = Object.freeze([
  { id: "bread", name: "Bread paste", cost: 0, level: 0, bite: [4, 9], luck: 0, text: "Squashed bread. The minnows love it." },
  { id: "worms", name: "Garden worms", cost: 180, level: 0, bite: [3, 7], luck: 0, text: "Dug from the vegetable beds: quicker bites." },
  { id: "seed-paste", name: "Pumpkin-seed paste", cost: 600, level: 6, bite: [2.2, 5], luck: 1, text: "Quick bites, and the uncommon fish can't resist it." },
  { id: "glow-maggots", name: "Glow maggots", cost: 2000, level: 10, bite: [1.5, 3.5], luck: 1, text: "They shine under the water. Bites come fast." },
].map((b) => Object.freeze({ ...b, bite: Object.freeze(b.bite) })));
// Traps: bought one at a time round the lake's edge, then improved together.
// `every`: seconds to catch something; `holds`: catches before it's full.
export const TRAP_COSTS = Object.freeze([240, 520, 1100, 2400]);
export const TRAP_TIERS = Object.freeze([
  { id: "willow-pot", name: "Willow pots", cost: 0, level: 0, every: 120, holds: 3, luck: 0, text: "Woven pots on a rope, baited with scraps." },
  { id: "iron-creel", name: "Iron creels", cost: 900, level: 7, every: 80, holds: 4, luck: 1, text: "Sturdier and quicker to fill. Eels find them." },
  { id: "witch-knot", name: "Witch-knot creels", cost: 3200, level: 12, every: 55, holds: 5, luck: 2, text: "Knotted with charms: fast, and pearls turn up." },
].map(Object.freeze));
