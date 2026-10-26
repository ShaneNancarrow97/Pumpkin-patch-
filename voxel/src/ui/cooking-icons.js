import atlas from "../../assets/cooking-menu-icons.webp";

// A single compressed atlas is embedded by the standalone build. Reuse one
// object URL rather than repeating its base64 data in every recipe card.
const atlasURL = (() => {
  try {
    if (!atlas.startsWith("data:")) return atlas;
    const bytes = Uint8Array.from(atob(atlas.split(",")[1]), c => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
  } catch { return atlas; }
})();

export const COOKING_ICON_IDS = Object.freeze([
  "truck", "cart", "pantry", "ghost-chef", "wedges", "soup",
  "toffee-apples", "pumpkin-jam", "ghost-cookies", "pumpkin-pie",
  "cocoa-brownies", "moonlight-tart",
]);

export function cookingIcon(id = "truck") {
  const aliases = { chef: "ghost-chef", delivery: "cart", storage: "pantry" };
  const cell = Math.max(0, COOKING_ICON_IDS.indexOf(aliases[id] || id));
  return `<span class="cooking-art" aria-hidden="true" style="background-image:url(${atlasURL});background-size:400% 300%;background-position:${cell % 4 * 100 / 3}% ${Math.floor(cell / 4) * 50}%"></span>`;
}
