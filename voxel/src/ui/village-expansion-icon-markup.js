// The presenter is pure so menu and rule tests need no image loader.
import { EXPANSION_ICON_IDS } from '../content/village-expansion-icon-meta.js';
export { EXPANSION_ICON_IDS };
export function expansionIcon(id,size=32){
  const n=EXPANSION_ICON_IDS.indexOf(id);if(n<0)return '';
  const edge=Math.min(128,Math.max(24,Number(size)||32));
  return `<span class="village-expansion-icon" data-expansion-icon="${id}" aria-hidden="true" style="display:inline-block;flex:none;width:${edge}px;height:${edge}px;background-image:var(--village-expansion-atlas);background-size:400% 300%;background-position:${n%4/3*100}% ${Math.floor(n/4)/2*100}%;background-repeat:no-repeat;pointer-events:none"></span>`;
}
