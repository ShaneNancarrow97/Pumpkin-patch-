import { asset } from "../platform/assets.js";
import { uiIcons } from "../content/ui-icon-meta.mjs";

function iconArt(name) {
  return uiIcons[name] ? '<img class="game-icon" src="' + asset(uiIcons[name]) + '" alt="" aria-hidden="true" draggable="false">' : "";
}

export { iconArt };
