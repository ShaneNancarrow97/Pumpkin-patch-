// Pure markup keeps menu rendering available to Node and preserves text fallbacks.
import { VILLAGE_ITEM_ICONS, VILLAGE_ITEM_GRID } from '../content/village-item-icon-meta.js';

export function villageItemIcon(id) {
  const icon = Object.hasOwn(VILLAGE_ITEM_ICONS, id) && VILLAGE_ITEM_ICONS[id];
  if (!icon) return '';
  const x = icon.column / (VILLAGE_ITEM_GRID.columns - 1) * 100;
  const y = icon.row / (VILLAGE_ITEM_GRID.rows - 1) * 100;
  return `<span class="village-item-icon" data-village-item-icon="${id}" style="--vi-x:${x}%;--vi-y:${y}%" aria-hidden="true"></span>`;
}
