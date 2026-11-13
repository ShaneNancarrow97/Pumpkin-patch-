import atlas from '../../assets/home-category-icons/home-categories.webp';
import { HOME_CATEGORY_GRID } from '../content/home-category-icon-meta.js';
export { homeCategoryIcon } from './home-category-icon-markup.js';
// One shared image for every category tab, even when the catalogue redraws.
export function installHomeCategoryArt() {
  if (typeof document === 'undefined' || !document.head || document.querySelector('style[data-home-category-art]')) return;
  const style = document.createElement('style'); style.dataset.homeCategoryArt = '';
  style.textContent = `:root{--home-category-atlas:url("${atlas}")}
    .home-category-icon{display:inline-block;inline-size:var(--hc-size,32px);block-size:var(--hc-size,32px);flex:none;vertical-align:middle;background-image:var(--home-category-atlas);background-repeat:no-repeat;background-size:${HOME_CATEGORY_GRID.columns * 100}% ${HOME_CATEGORY_GRID.rows * 100}%;background-position:var(--hc-x) var(--hc-y);pointer-events:none;image-rendering:auto}`;
  document.head.append(style);
}
