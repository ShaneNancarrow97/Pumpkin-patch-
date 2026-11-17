import atlas from "../../assets/village-ui-icons/village-ui.webp";
import { VILLAGE_UI_GRID } from "../content/village-ui-icon-meta.js";
export { villageUIIcon } from "./village-ui-icon-markup.js";

// Install the single shared picture once, keeping live menu markup small.
export function installVillageUIArt() {
  if (typeof document === "undefined" || !document.head || document.querySelector("style[data-village-ui-art]")) return;
  const style = document.createElement("style"); style.dataset.villageUiArt = "";
  style.textContent = `:root{--village-ui-atlas:url("${atlas}")}
    .village-ui-icon{display:inline-block;inline-size:var(--vg-ui-size,28px);block-size:var(--vg-ui-size,28px);flex:none;vertical-align:middle;background-image:var(--village-ui-atlas);background-repeat:no-repeat;background-size:${VILLAGE_UI_GRID.columns * 100}% ${VILLAGE_UI_GRID.rows * 100}%;background-position:var(--vg-ui-x) var(--vg-ui-y);image-rendering:auto;pointer-events:none}`;
  document.head.append(style);
}
