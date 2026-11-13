import atlas from "../../assets/kitchen-workshop-icons.webp";

// Share one embedded atlas URL across recipe cards and equipment shortcuts.
const atlasURL = (() => {
  try {
    if (!atlas.startsWith("data:")) return atlas;
    const bytes = Uint8Array.from(atob(atlas.split(",")[1]), c => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
  } catch { return atlas; }
})();

export const KITCHEN_WORKSHOP_ICON_IDS = Object.freeze([
  "hob", "oven", "pot", "pan", "tray", "spice",
  "garden-skillet", "harvest-broth", "spiced-roast",
  "moonfire-chicken", "haunted-pie", "pumpkin-spice-biscuits",
]);
const aliases = Object.freeze({
  "kitchen-hob": "hob", "kitchen-oven": "oven",
  "kitchen-pot-rail": "pot", "kitchen-pan-rail": "pan",
  "kitchen-baking-rack": "tray", "kitchen-spice-shelf": "spice",
});

// Unknown IDs deliberately return nothing so callers retain their old icons.
export function kitchenWorkshopIcon(id) {
  const cell = KITCHEN_WORKSHOP_ICON_IDS.indexOf(aliases[id] || id);
  if (cell < 0) return "";
  return '<span class="cooking-art" aria-hidden="true" style="background-image:url(' + atlasURL + ');background-size:400% 300%;background-position:' + (cell % 4 * 100 / 3) + '% ' + (Math.floor(cell / 4) * 50) + '%"></span>';
}
