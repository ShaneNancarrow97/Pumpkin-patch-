import atlas from "../../assets/furniture-set-icons/furniture-sets.webp";
import { FURNITURE_SET_GRID } from "../content/furniture-set-icon-meta.js";
export { furnitureSetIcon } from "./furniture-set-icon-markup.js";

// One shared atlas for all menu redraws, without duplicating embedded image data.
export function installFurnitureSetArt() {
  if (typeof document === "undefined" || !document.head || document.querySelector("style[data-furniture-set-art]")) return;
  const style = document.createElement("style");
  style.dataset.furnitureSetArt = "";
  style.textContent = `:root{--furniture-set-atlas:url("${atlas}")}
    .furniture-set-icon{display:inline-block;inline-size:var(--fs-size,52px);block-size:var(--fs-size,52px);flex:none;vertical-align:middle;background-image:var(--furniture-set-atlas);background-repeat:no-repeat;background-size:${FURNITURE_SET_GRID.columns * 100}% ${FURNITURE_SET_GRID.rows * 100}%;background-position:var(--fs-x) var(--fs-y);image-rendering:auto;pointer-events:none}`;
  document.head.append(style);
}
