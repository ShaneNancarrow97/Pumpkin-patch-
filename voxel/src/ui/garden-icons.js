import atlas from "../../assets/home/garden-icons.png";
import { ESTATE_DECOR } from "../content/house-estate.js";

// One generated 4×7 atlas, matching the catalogue order exactly. Keep its data
// URL in one stylesheet, rather than repeating a multi-megabyte URL per card.
export const GARDEN_ICON_GRID = Object.freeze({ columns: 4, rows: 7 });
export const GARDEN_ICON_IDS = Object.freeze(ESTATE_DECOR.map(item => item.id));
let installed = false;
function install() {
  if (installed || typeof document === "undefined") return;
  const style=document.createElement("style"); style.dataset.gardenIcons="";
  style.textContent=`:root{--garden-icon-atlas:url("${atlas}")}`;
  document.head.append(style); installed=true;
}
export function gardenSpriteIcon(id) {
  const index=GARDEN_ICON_IDS.indexOf(id);if(index<0)return "";
  install();
  return `<span class="estate-art garden-sprite" aria-hidden="true" style="--garden-x:${index%4/3*100}%;--garden-y:${Math.floor(index/4)/6*100}%"></span>`;
}
