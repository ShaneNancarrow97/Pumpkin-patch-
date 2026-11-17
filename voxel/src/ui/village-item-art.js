import atlas from '../../assets/menu-items/village-items.webp';
import { VILLAGE_ITEM_GRID } from '../content/village-item-icon-meta.js';
import { installVillageBlightArt } from './village-blight-art.js';

// Install one shared atlas; live menu redraws only contain stable, small markup.
export function installVillageItemArt() {
  installVillageBlightArt();
  if (typeof document === 'undefined' || !document.head || document.querySelector('style[data-village-item-art]')) return;
  const style = document.createElement('style');
  style.dataset.villageItemArt = '';
  style.textContent = `:root{--village-item-atlas:url("${atlas}")}
    .village-item-icon{display:inline-block;inline-size:var(--vi-size,48px);block-size:var(--vi-size,48px);flex:none;vertical-align:middle;background-image:var(--village-item-atlas);background-repeat:no-repeat;background-size:${VILLAGE_ITEM_GRID.columns*100}% ${VILLAGE_ITEM_GRID.rows*100}%;background-position:var(--vi-x) var(--vi-y);image-rendering:auto;pointer-events:none}`;
  document.head.append(style);
}
