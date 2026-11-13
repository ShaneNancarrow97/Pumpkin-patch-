// Cosmetic keepsakes for taking a village discovery back into everyday farm life.
// These are colours for the existing base sprites, not purchasable costumes.
const look = (character, bond, name, colour, description) => Object.freeze({
  id: `${character}-homecoming-${bond}`, character, bond, name, description,
  secret: true, [character === "natalie" ? "sweater" : "beanie"]: colour,
});

export const SECRET_LOOKS = Object.freeze([
  look("natalie", "botanist", "Moonfern knit", 0x315f53, "Tansy’s deep fern green, earned by bringing the herb garden home."),
  look("shane", "botanist", "Moonfern beanie", 0x315f53, "A little of Tansy’s herb garden, worn back on the farm."),
  look("natalie", "midnight-host", "Mulberry supper knit", 0x763d62, "Cinder’s rich mulberry, for a kitchen that feeds both worlds."),
  look("shane", "midnight-host", "Mulberry supper beanie", 0x763d62, "A thank-you from Cinder for warm suppers carried between neighbours."),
  look("natalie", "ghostlight", "Ghostlight knit", 0x526d9c, "Corvus’s moon-blue, earned when his village magic finds an audience."),
  look("shane", "ghostlight", "Ghostlight beanie", 0x526d9c, "A moon-blue keepsake from the lanterns beyond the midway."),
]);

export const SECRET_LOOK_IDS = Object.freeze(SECRET_LOOKS.map(look => look.id));

const bond = (id, name, clue, icon, benefit, steps) => Object.freeze({
  id, name, clue, icon, benefit,
  lookIds: Object.freeze(SECRET_LOOKS.filter(look => look.bond === id).map(look => look.id)),
  steps: Object.freeze(steps.map(step => Object.freeze(step))),
});

export const HOME_BONDS = Object.freeze([
  bond("botanist", "Tansy’s moonfern", "Bring the herb garden home. Let its care reach the pumpkin shelves.", "leaf",
    "Village herbs supply the pantry; preservation wax keeps a treated pumpkin batch fresh 10% longer.", [
      { id: "herb-beds", label: "Restore the village herb beds", need: 1, world: "village" },
      { id: "herbs-prepared", label: "Prepare village herbs for the pantry", need: 6, world: "farm" },
      { id: "stock-treated", label: "Protect pumpkin batches with wax", need: 3, world: "farm" },
    ]),
  bond("midnight-host", "Cinder’s midnight table", "A neighbour’s table remembers the cook who keeps coming back.", "satchel",
    "Cook Cinder’s village recipe at home, then deliver spare portions through the restaurant’s commissions.", [
      { id: "restaurant-opening", label: "Open Cinder’s restaurant", need: 1, world: "village" },
      { id: "home-suppers", label: "Cook dishes in your home kitchen", need: 3, world: "farm" },
      { id: "cinder-commissions", label: "Deliver Cinder’s lantern-stew commissions", need: 3, world: "village" },
    ]),
  bond("ghostlight", "Corvus’s ghostlight", "Give the quiet midway a second life beneath your farm’s lanterns.", "lantern",
    "Corvus’s restored stage brings the Turning Scarecrows scene to your farm’s hayride.", [
      { id: "moor-stage", label: "Restore Corvus’s silent midway", need: 1, world: "village" },
      { id: "turning-scarecrows", label: "Bring Turning Scarecrows to the hayride", need: 1, world: "farm" },
      { id: "hayride-guests", label: "Welcome guests through a completed hayride", need: 25, world: "farm" },
    ]),
]);
