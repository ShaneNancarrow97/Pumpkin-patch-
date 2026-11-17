// Pure markup keeps catalogue rendering independent of images and the DOM.
import { HOME_CATEGORY_GRID, HOME_CATEGORY_ICONS } from '../content/home-category-icon-meta.js';
const ALIASES = Object.freeze({ function: 'all', parlour: 'seating', bedroom: 'beds', attic: 'storage', stored: 'owned', here: 'room', elsewhere: 'owned' });
export function homeCategoryIcon(id, size = 32) {
  const key = Object.hasOwn(ALIASES, id) ? ALIASES[id] : id;
  const icon = Object.hasOwn(HOME_CATEGORY_ICONS, key) && HOME_CATEGORY_ICONS[key];
  if (!icon) return '';
  const pixels = Math.min(96, Math.max(20, Number(size) || 32));
  const x = icon.column / (HOME_CATEGORY_GRID.columns - 1) * 100, y = icon.row / (HOME_CATEGORY_GRID.rows - 1) * 100;
  return `<span class="home-category-icon" data-home-category-icon="${key}" style="--hc-size:${pixels}px;--hc-x:${x}%;--hc-y:${y}%" aria-hidden="true"></span>`;
}
