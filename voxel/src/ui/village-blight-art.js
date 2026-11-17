import spores from "../../assets/village-blight/cursed-spores.webp";

// Browser-only asset import is separate from Node-safe village item markup.
export function installVillageBlightArt() {
  if (typeof document === "undefined" || !document.head || document.querySelector("style[data-village-blight-art]")) return;
  const style = document.createElement("style");
  style.dataset.villageBlightArt = "";
  style.textContent = `.village-item-icon.village-blight-icon{background-image:url("${spores}");background-repeat:no-repeat;background-position:center;background-size:contain;image-rendering:auto}`;
  document.head.append(style);
}
