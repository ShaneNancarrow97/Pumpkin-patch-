// Shared painted navigation icons. Text beside each picture supplies its name.
import { VILLAGE_UI_GRID, VILLAGE_UI_ICONS } from "../content/village-ui-icon-meta.js";

export function villageUIIcon(id, size = 28) {
  const icon = Object.hasOwn(VILLAGE_UI_ICONS, id) && VILLAGE_UI_ICONS[id];
  if (!icon) return "";
  const pixels = Math.min(96, Math.max(24, Number(size) || 28));
  const x = icon.column / Math.max(1, VILLAGE_UI_GRID.columns - 1) * 100;
  const y = icon.row / Math.max(1, VILLAGE_UI_GRID.rows - 1) * 100;
  return `<span class="village-ui-icon" data-village-ui-icon="${id}" style="--vg-ui-size:${pixels}px;--vg-ui-x:${x}%;--vg-ui-y:${y}%" aria-hidden="true"></span>`;
}
