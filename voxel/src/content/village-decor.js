// Decorating Mothlight (handover 73): anything here can stand anywhere on the
// Green that isn't a road, a home, a gathering spot or a fixture of the square
// (rules/village.js villageDecorFits). Pieces marked `estate` reuse the garden's
// own models (house-estate-world.js); the rest are Mothlight's, built in
// village-models.js. `tags` say what a piece counts as for a quest that asks
// for a light, a seat or something to read. `stall` pieces turn up at Rowan's.
import { ESTATE_DECOR_BY_ID } from "./house-estate.js";

const FROM_GARDEN = [
  ["lantern-post", ["light"]], ["rose-bed", ["plant"]], ["pumpkin-pile", []], ["stone-urn", ["plant"]], ["garden-bench", ["seat"]],
  ["bird-bath", []], ["gargoyle", []], ["crooked-tree", ["plant"]], ["moon-fountain", []], ["coffin-planter", ["plant"]], ["rose-arch", ["plant"]],
  ["wishing-well", []], ["bat-hedge", ["plant"]], ["mushroom-patch", ["plant"]], ["fire-pit", ["light"]], ["ghost-scarecrow", []], ["hay-bales", ["seat"]],
  ["gravestones", []], ["owl-perch", []], ["witch-cauldron", []], ["picnic-table", ["seat"]], ["lantern-garland", ["light"]], ["lily-pond", ["plant"]],
];
const garden = FROM_GARDEN.map(([id, tags]) => { const d = ESTATE_DECOR_BY_ID[id]; return { id, name: d.name, cost: d.cost, w: d.w, d: d.d, height: d.height, tags, estate: true, stall: true, text: d.text }; });
const mothlight = [
  { id: "moth-lamp", name: "Moth lamp", cost: 160, w: .8, d: .8, height: 2.9, tags: ["light"], stall: true, text: "An iron lamp whose glass is shaped like a moth's wings." },
  { id: "toadstool-lamp", name: "Toadstool lamp", cost: 95, w: .8, d: .8, height: 1.1, tags: ["light"], stall: true, text: "A glowing toadstool. It hums when nobody's listening." },
  { id: "moth-lantern-string", name: "Moth lantern string", cost: 240, w: 3.4, d: .5, height: 2.6, tags: ["light"], stall: true, text: "Paper moth lanterns strung between two poles." },
  { id: "signpost", name: "Carved signpost", cost: 90, w: .8, d: .8, height: 2.4, tags: [], stall: true, text: "Points to the farm, the woods and somewhere nobody's named yet." },
  { id: "market-crates", name: "Market crates", cost: 110, w: 1.6, d: 1.2, height: 1.1, tags: [], stall: true, text: "Stacked crates of apples, gourds and little pumpkins." },
  { id: "reading-stand", name: "Reading stand", cost: 140, w: 1, d: .8, height: 1.3, tags: ["books"], stall: true, text: "A carved lectern with an open book and a stack beside it." },
  { id: "book-cart", name: "Book cart", cost: 180, w: 1.4, d: .9, height: 1.2, tags: ["books"], stall: true, text: "A little wheeled cart of books, for reading wherever you stop." },
  { id: "stool", name: "Timber stool", cost: 60, w: .7, d: .7, height: .7, tags: ["seat"], stall: true, text: "Three legs, one seat, no wobble. Rowan swears." },
  { id: "timber-gate", name: "Timber garden gate", cost: 150, w: 2.4, d: .4, height: 1.6, tags: [], stall: true, text: "A gate with posts and a latch that clicks just so." },
  { id: "flower-barrow", name: "Flower barrow", cost: 130, w: 1.6, d: 1, height: 1, tags: ["plant"], stall: true, text: "A wheelbarrow spilling marigolds and moonflowers." },
  { id: "sundial", name: "Moon sundial", cost: 170, w: 1, d: 1, height: 1.1, tags: [], stall: true, text: "Tells the time by moonlight, roughly." },
  { id: "bunting-posts", name: "Bunting posts", cost: 120, w: 3.4, d: .4, height: 2.5, tags: [], stall: true, text: "Two posts and a run of plum and orange bunting." },
  { id: "workbench", name: "Carpenter's workbench", cost: 260, w: 2, d: 1, height: 1.1, tags: [], stall: false, text: "Rowan's spare bench, with a vice and a jar of nails." },
  { id: "wheelbarrow", name: "Pumpkin wheelbarrow", cost: 140, w: 1.6, d: 1, height: 1.1, tags: [], stall: false, text: "A barrow of your own pumpkins, ready for market." },
  { id: "moth-statue", name: "Moth statue", cost: 420, w: 1.2, d: 1.2, height: 2.2, tags: [], stall: false, text: "A great stone moth on a plinth, wings open." },
  { id: "scarecrow-statue", name: "Rowan's likeness", cost: 380, w: 1, d: 1, height: 2.3, tags: [], stall: false, text: "A carved scarecrow with a familiar grin." },
  { id: "pumpkin-arch", name: "Pumpkin arch", cost: 320, w: 3, d: 1, height: 3, tags: [], stall: false, text: "An arch of stacked pumpkins, lit from within." },
  { id: "moon-gate", name: "Moonlit garden gate", cost: 520, w: 2.6, d: .6, height: 3.2, tags: [], stall: false, text: "A round moon gate of pale stone, glowing faintly at night." },
];
export const VILLAGE_DECOR = Object.freeze([...mothlight, ...garden].map(Object.freeze));
export const VILLAGE_DECOR_BY_ID = Object.freeze(Object.fromEntries(VILLAGE_DECOR.map((d) => [d.id, d])));

// Rowan's stall: two staples always, and four from the rest that change every
// so often (seconds of play). House pieces are things to take home.
export const STALL = Object.freeze({ slots: 4, staples: ["lantern-post", "stool"], refresh: 900,
  home: Object.freeze(["f04", "f07", "f08", "f13", "f16", "d03", "d08", "d15", "shelf-floating", "household-floating-shelf", "household-coat-hooks", "lantern-entry-console", "household-plum-mug", "midnight-reading-bench"]) });
