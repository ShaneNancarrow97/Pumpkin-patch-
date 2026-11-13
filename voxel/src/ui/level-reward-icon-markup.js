// Shared illustrated rewards and rank frames; actual level numerals stay crisp
// DOM text. This module is pure and can be used by menu and rule-side tests.
import { LEVEL_REWARD_GRID, LEVEL_REWARD_ICONS } from '../content/level-reward-icon-meta.js';

const levelNumber = value => Math.min(20, Math.max(1, Math.floor(Number(value)) || 1));
const sizeOf = value => Math.min(192, Math.max(24, Number(value) || 48));
export function levelRankIcon(level) {
  const number = levelNumber(level);
  return number >= 20 ? 'rank-eclipse' : number >= 16 ? 'rank-manor' : number >= 12 ? 'rank-moth' : number >= 8 ? 'rank-moon' : number >= 4 ? 'rank-lantern' : 'rank-seed';
}
export function levelRewardIcon(id, size = 48) {
  const icon = Object.hasOwn(LEVEL_REWARD_ICONS, id) && LEVEL_REWARD_ICONS[id];
  if (!icon) return '';
  const x = icon.column / (LEVEL_REWARD_GRID.columns - 1) * 100;
  const y = icon.row / (LEVEL_REWARD_GRID.rows - 1) * 100;
  return `<span class="level-reward-icon" data-level-reward-icon="${id}" style="--level-art-size:${sizeOf(size)}px;--level-art-x:${x}%;--level-art-y:${y}%" aria-hidden="true"></span>`;
}
export function levelBadgeMarkup(level, size = 48) {
  const number = levelNumber(level), id = levelRankIcon(number), pixels = sizeOf(size);
  return `<span class="level-badge" data-level-badge="${number}" style="--level-badge-size:${pixels}px;--level-number-y:${LEVEL_REWARD_ICONS[id].numberY}%" aria-hidden="true">${levelRewardIcon(id, pixels)}<b class="level-badge-number">${number}</b></span>`;
}
