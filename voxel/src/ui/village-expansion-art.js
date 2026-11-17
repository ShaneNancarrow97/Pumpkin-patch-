// One shared expansion painting atlas; text beside each picture names its action.
import atlas from '../../assets/mothlight-expansion/icons.webp';
export { expansionIcon, EXPANSION_ICON_IDS } from './village-expansion-icon-markup.js';
export function installVillageExpansionArt(){
  if(typeof document==='undefined'||!document.head||document.querySelector('style[data-village-expansion-art]'))return;
  const style=document.createElement('style');style.dataset.villageExpansionArt='';style.textContent=`:root{--village-expansion-atlas:url("${atlas}")}`;document.head.append(style);
}
