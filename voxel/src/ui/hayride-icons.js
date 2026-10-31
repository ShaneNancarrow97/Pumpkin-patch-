import atlas from '../../assets/hayride-upgrade-icons.webp';
import { HAYRIDE_ICON_GRID, hayrideIconCell } from '../content/hayride-icon-map.js';

// Reuse one URL across live menu redraws. The complete atlas is embedded by
// esbuild; no remote image request or source PNG is part of the runtime.
const atlasURL = (() => {
  try {
    if (!atlas.startsWith('data:')) return atlas;
    const bytes = Uint8Array.from(atob(atlas.split(',')[1]), c => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
  } catch { return atlas; }
})();

export function hayrideIcon(id, size = 48) {
  const cell = hayrideIconCell(id);
  // Unknown future upgrades retain their existing textual/fallback treatment.
  if (!cell) return '';
  const pixels = Number.isFinite(size) ? Math.max(24, Math.min(96, size)) : 48;
  const { columns, rows } = HAYRIDE_ICON_GRID;
  const x = cell.column * 100 / (columns - 1), y = cell.row * 100 / (rows - 1);
  return `<span class="hayride-upgrade-art" data-hayride-icon="${id}" aria-hidden="true" style="display:inline-block;flex-shrink:0;width:${pixels}px;height:${pixels}px;background-image:url(${atlasURL});background-size:${columns * 100}% ${rows * 100}%;background-position:${x}% ${y}%"></span>`;
}
