// Pure markup: safe to import from chapter rendering and Node verification.
import { FURNITURE_SET_GRID, FURNITURE_SET_ICONS } from "../content/furniture-set-icon-meta.js";

/** Painted bundle/contents art. Unknown IDs return nothing, preserving fallbacks. */
export function furnitureSetIcon(id, size = 52) {
  const icon = Object.hasOwn(FURNITURE_SET_ICONS, id) && FURNITURE_SET_ICONS[id];
  if (!icon) return "";
  const pixels = Math.min(160, Math.max(24, Number(size) || 52));
  const x = icon.column / Math.max(1, FURNITURE_SET_GRID.columns - 1) * 100;
  const y = icon.row / Math.max(1, FURNITURE_SET_GRID.rows - 1) * 100;
  return `<span class="furniture-set-icon" data-furniture-set-icon="${id}" style="--fs-size:${pixels}px;--fs-x:${x}%;--fs-y:${y}%" aria-hidden="true"></span>`;
}
