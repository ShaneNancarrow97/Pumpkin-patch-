// The lake menu's pictures: photographs of the lake's own voxel models
// (fishing-lake-models.js) through the carving stand's studio (stand-art.js),
// so the fish in the menu are the fish that jump in the garden. Without
// WebGL, a drawn fish in its colours stands in.
import { voxelPhoto } from "./stand-art.js";
import { fishModel, trapModel } from "../fishing-lake-models.js";
import { buildEstateDecor } from "../house-estate-world.js";
import { FISH_BY_ID } from "../content/fishing.js";

export const fishingArt = {
  fish: (id) => voxelPhoto(`fish:${id}`, () => fishModel(id), { w: 168, h: 112, from: [.04, .3, 1], fov: 24, pad: 1.04, margin: .06 }),
  lake: () => voxelPhoto("lake", () => buildEstateDecor("fishing-lake"), { w: 520, h: 300, from: [-.25, .78, 1], fov: 26, pad: 1.0, margin: .03, warm: 6, warmAt: [-1, 2.2, 2] }),
  trap: () => voxelPhoto("trap", () => trapModel(), { w: 120, h: 96, from: [.5, .55, 1], fov: 26, pad: 1.06 }),
};

// A drawn fish, for a device without WebGL.
export function fishSvg(id, size = 72) {
  const f = FISH_BY_ID[id]; if (!f) return "";
  const [back, belly, fin, eye] = f.colours;
  return `<svg class="fish-svg" viewBox="0 0 120 80" width="${size}" height="${Math.round(size * .66)}" aria-hidden="true"><path d="M14 40l-12-16v32z" fill="${fin}"/><ellipse cx="60" cy="40" rx="44" ry="${f.eel ? 10 : 22}" fill="${belly}"/><path d="M16 40q44-${f.eel ? 18 : 40} 88 0z" fill="${back}"/><circle cx="88" cy="35" r="4" fill="${eye}"/></svg>`;
}
export const fishPicture = (id, cls = "fish-render") => { const url = fishingArt.fish(id); return url ? `<img class="${cls}" src="${url}" alt="" draggable="false">` : fishSvg(id); };
