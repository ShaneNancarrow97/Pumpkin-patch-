// Original brass-and-plum illustrations share two bounded transparent atlases.
const MENU = Object.freeze(['journal', 'moth', 'map', 'people', 'satchel', 'workshop', 'build', 'lantern', 'leaf']);
const DIALOGUE = Object.freeze(['chat', 'compass', 'bond', 'back']);
export const FIDELITY_ICON_IDS = Object.freeze([...MENU, ...DIALOGUE]);
export function fidelityIcon(id) {
  const menu = MENU.indexOf(id), dialogue = DIALOGUE.indexOf(id);
  if (menu < 0 && dialogue < 0) return '';
  const index = menu >= 0 ? menu : dialogue, columns = menu >= 0 ? 3 : 2;
  const atlas = menu >= 0 ? '' : '--vf-art-image:var(--village-fidelity-dialogue-atlas);--vf-art-grid:200% 200%;';
  return `<span class="vf-art vf-art-${id}" aria-hidden="true" style="${atlas}--vf-art-x:${index % columns * 100 / (columns - 1)}%;--vf-art-y:${Math.floor(index / columns) * 100 / (columns - 1)}%"></span>`;
}
