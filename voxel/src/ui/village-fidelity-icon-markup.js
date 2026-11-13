// Original brass-and-plum illustrations share one small, transparent atlas.
export const FIDELITY_ICON_IDS = Object.freeze(['journal', 'moth', 'map', 'people', 'satchel', 'workshop', 'build', 'lantern', 'leaf']);
export function fidelityIcon(id) {
  const index = FIDELITY_ICON_IDS.indexOf(id);
  if (index < 0) return '';
  return `<span class="vf-art vf-art-${id}" aria-hidden="true" style="--vf-art-x:${index % 3 * 50}%;--vf-art-y:${Math.floor(index / 3) * 50}%"></span>`;
}
