import atlas from '../../assets/village-fidelity/icons.webp';
export { fidelityIcon, FIDELITY_ICON_IDS } from './village-fidelity-icon-markup.js';

// Install the shared picture once; pure menu helpers remain usable in Node.
export function installVillageFidelityArt() {
  if (typeof document === 'undefined' || !document.head || document.querySelector('style[data-village-fidelity-art]')) return;
  const style = document.createElement('style'); style.dataset.villageFidelityArt = '';
  style.textContent = `:root{--village-fidelity-atlas:url("${atlas}")}
.vf-art{display:inline-block;inline-size:var(--vf-art-size,32px);block-size:var(--vf-art-size,32px);flex:none;vertical-align:middle;background-image:var(--village-fidelity-atlas);background-repeat:no-repeat;background-size:300% 300%;background-position:var(--vf-art-x) var(--vf-art-y);image-rendering:auto;pointer-events:none}`;
  document.head.append(style);
}
