import atlas from '../../assets/level-rewards/level-rewards.webp';
import { LEVEL_REWARD_GRID } from '../content/level-reward-icon-meta.js';
export { levelRewardIcon, levelRankIcon, levelBadgeMarkup } from './level-reward-icon-markup.js';

// A single shared image/style, not a new base64 image on every live menu card.
export function installLevelRewardArt() {
  if (typeof document === 'undefined' || !document.head || document.querySelector('style[data-level-reward-art]')) return;
  const style = document.createElement('style'); style.dataset.levelRewardArt = '';
  style.textContent = `:root{--level-reward-atlas:url("${atlas}")}
    .level-reward-icon{display:inline-block;width:var(--level-art-size,48px);height:var(--level-art-size,48px);flex:none;background-image:var(--level-reward-atlas);background-repeat:no-repeat;background-size:${LEVEL_REWARD_GRID.columns * 100}% ${LEVEL_REWARD_GRID.rows * 100}%;background-position:var(--level-art-x) var(--level-art-y);image-rendering:auto;pointer-events:none;vertical-align:middle}
    .level-badge{position:relative;display:inline-flex;width:var(--level-badge-size,48px);height:var(--level-badge-size,48px);flex:none;align-items:center;justify-content:center;vertical-align:middle;pointer-events:none}
    .level-badge-number{position:absolute;left:50%;top:var(--level-number-y,50%);transform:translate(-50%,-50%);font-family:var(--body,system-ui);font-size:clamp(12px,calc(var(--level-badge-size,48px)*.33),58px);font-weight:750;line-height:1;letter-spacing:-.04em;font-variant-numeric:tabular-nums;color:#fff2d8;text-shadow:0 1px 2px #15091e,0 0 6px #15091e;pointer-events:none}`;
  document.head.append(style);
}
