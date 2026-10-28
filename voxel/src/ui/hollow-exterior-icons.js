import atlas from "../../assets/hollow-exterior-icons.webp";

// One compressed atlas and one URL for every menu redraw; full art stays out
// of repeated markup and the source PNG is never imported into the game.
const atlasURL = (() => {
  try {
    if (!atlas.startsWith("data:")) return atlas;
    const bytes = Uint8Array.from(atob(atlas.split(",")[1]), c => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
  } catch { return atlas; }
})();

export const HOLLOW_EXTERIOR_ICON = Object.freeze({
  derelict: 0, restoring: 1, tier1: 2, tier2: 3, tier3: 4, tier4: 5, tier5: 6, crest: 7,
});

export function hollowExteriorIcon(index = HOLLOW_EXTERIOR_ICON.crest) {
  const cell = Number.isFinite(index) ? Math.max(0, Math.min(7, Math.trunc(index))) : 7;
  return `<span class="hollow-exterior-art" aria-hidden="true" style="background-image:url(${atlasURL});background-position:${cell % 4 * 100 / 3}% ${Math.floor(cell / 4) * 100}%"></span>`;
}
