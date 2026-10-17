import { escapeHtml } from "./html.js";
import { characterIdleMeta, characterWalkMeta } from "../content/character-walk-meta.mjs";
import { costumeById, costumeCatalog } from "../core/costume-model.mjs";
import { costumeArtMeta, idleArtMeta } from "../content/animation-meta.mjs";

function initCostumeUi(app2) {
  const { buyCostume: buyCostume2, wearCostume: wearCostume2 } = app2.actions;
  const { $, gameAsset, save, tone, toast, showModal, renderUI } = app2;
  let outfitCharacter = "natalie", outfitCollection = "all", previewWalk = false;
  function outfitArtStyle(item) {
    const walking = previewWalk && characterWalkMeta[item.id];
    if (walking) return 'background-image:url("' + gameAsset(walking.preview.path) + '");background-size:300% 200%;background-position:0% 0%;--costume-ar:' + walking.preview.frameWidth / walking.preview.frameHeight + ";";
    const standing = characterIdleMeta[item.id]?.preview;
    if (standing) return 'background-image:url("' + gameAsset(standing.path) + '");background-size:300% 100%;background-position:0% 0%;--costume-ar:' + standing.frameWidth / standing.frameHeight + ";";
    const asset2 = gameAsset(item.price === 0 ? "assets/house/" + item.character + "-idle.webp" : item.artpath), source = item.price === 0 ? idleArtMeta[item.character] : costumeArtMeta[item.id], meta = source ? { rect: source.rects[0], width: source.width, height: source.imageHeight } : null;
    if (meta?.rect && meta.width && meta.height) {
      const [x, y, w, h] = meta.rect;
      return 'background-image:url("' + asset2 + '");background-size:' + meta.width / w * 100 + "% " + meta.height / h * 100 + "%;background-position:" + (meta.width === w ? 0 : x / (meta.width - w) * 100) + "% " + (meta.height === h ? 0 : y / (meta.height - h) * 100) + "%;--costume-ar:" + w / h + ";";
    }
    return 'background-image:url("' + asset2 + '");background-size:' + (item.price === 0 ? "200% 100%" : "400% 300%") + ";background-position:" + (item.price === 0 ? item.column * 100 + "% 0%" : "0% " + item.row * 50 + "%") + ";--costume-ar:.75;";
  }
  function outfitMenuActive() {
    return $("modal").open && !!$("modal-content").querySelector(".costume-menu");
  }
  function refreshOutfitBalance() {
    if (!outfitMenuActive())
      return;
    $("costume-coins").textContent = "£" + Math.floor(app2.state.coins).toLocaleString("en-GB");
    for (const button of $("modal-content").querySelectorAll("[data-buy-costume]")) {
      const item = costumeById[button.dataset.buyCostume];
      button.disabled = app2.state.paused || app2.state.wardrobe.owned.includes(item.id) || app2.state.coins < item.price;
    }
    for (const button of $("modal-content").querySelectorAll("[data-wear-costume]")) {
      const item = costumeById[button.dataset.wearCostume];
      button.disabled = app2.state.paused || app2.state.wardrobe.equipped[item.character] === item.id;
    }
  }
  function outfitRenderCards() {
    const grid = $("costume-grid");
    if (!grid)
      return;
    grid.innerHTML = costumeCatalog.filter((item) => item.character === outfitCharacter && (outfitCollection === "all" || item.collection === outfitCollection)).map((item) => {
      const owned = app2.state.wardrobe.owned.includes(item.id), equipped = app2.state.wardrobe.equipped[item.character] === item.id;
      return '<article class="costume-card' + (equipped ? " equipped" : "") + '" data-costume="' + item.id + '"><div class="costume-art-wrap"><span class="costume-art' + (previewWalk && characterWalkMeta[item.id] ? " costume-walk-preview" : "") + '" style="' + escapeHtml(outfitArtStyle(item)) + '" role="img" aria-label="' + escapeHtml(item.name) + (previewWalk && characterWalkMeta[item.id] ? " walking preview" : " standing preview") + '"></span>' + (equipped ? '<span class="costume-current">Wearing now</span>' : "") + '</div><div class="costume-copy"><small>' + (item.price === 0 ? "THE ORIGINAL" : item.collection === "90s-horror" ? "90S HALLOWEEN" : "HALLOWEEN COSTUME") + "</small><h3>" + escapeHtml(item.name) + "</h3><p>" + escapeHtml(item.description) + '</p></div><div class="costume-actions">' + (owned ? '<span class="owned-label">' + (item.price === 0 ? "Always yours" : "✓ Owned") + '</span><button class="secondary" data-wear-costume="' + item.id + '" ' + (app2.state.paused || equipped ? "disabled" : "") + ">" + (equipped ? "Equipped" : "Wear outfit") + "</button>" : '<button class="primary" data-buy-costume="' + item.id + '" ' + (app2.state.paused || app2.state.coins < item.price ? "disabled" : "") + ">Buy · £" + item.price + "</button>") + "</div></article>";
    }).join("");
    for (const button of grid.querySelectorAll("[data-buy-costume]"))
      button.onclick = () => {
        const item = costumeById[button.dataset.buyCostume];
        if (!buyCostume2(app2.state, item.id))
          return;
        save();
        outfitRenderCards();
        refreshOutfitBalance();
        if (typeof renderUI === "function")
          renderUI();
        tone(620);
        toast(item.name + " is yours. Tap Wear outfit to change.");
      };
    for (const button of grid.querySelectorAll("[data-wear-costume]"))
      button.onclick = () => {
        const item = costumeById[button.dataset.wearCostume];
        if (!wearCostume2(app2.state, item.id))
          return;
        save();
        outfitRenderCards();
        refreshOutfitBalance();
        if (typeof renderUI === "function")
          renderUI();
        tone(740);
        toast((item.character === "natalie" ? "Natalie" : "Shane") + " is wearing " + item.name.toLowerCase() + ".");
      };
    refreshOutfitBalance();
  }
  function openOutfitMenu() {
    showModal('<section class="costume-menu"><div class="modal-subtitle">DRESS FOR THE WITCHING HOUR</div><h2>Halloween wardrobe</h2><p class="costume-intro">Try a look, buy it once, wear it whenever you like.</p><div class="costume-balance"><div class="costume-collection-control"><label for="costume-collection">Collection</label><select id="costume-collection"><option value="all"' + (outfitCollection === "all" ? " selected" : "") + '>All outfits</option><option value="90s-horror"' + (outfitCollection === "90s-horror" ? " selected" : "") + '>90s Halloween</option></select></div><div class="costume-wallet"><span>Harvest coins</span><strong id="costume-coins">£' + Math.floor(app2.state.coins).toLocaleString("en-GB") + '</strong></div></div><div class="costume-tabs" aria-label="Choose a character"><button data-costume-character="natalie" aria-pressed="' + (outfitCharacter === "natalie") + '">Natalie’s outfits</button><button data-costume-character="shane" aria-pressed="' + (outfitCharacter === "shane") + '">Shane’s outfits</button></div><div class="costume-preview-controls" role="group" aria-label="Preview animation"><span>Preview</span><button id="preview-idle" aria-pressed="' + !previewWalk + '">Standing</button><button id="preview-walk" aria-pressed="' + previewWalk + '">Walking</button></div><div class="costume-grid" id="costume-grid"></div><p class="costume-note">Original outfits are always free. Your collection and chosen outfits save with your patch.</p></section>');
    $("costume-collection").onchange = () => {
      outfitCollection = $("costume-collection").value === "90s-horror" ? "90s-horror" : "all";
      outfitRenderCards();
    };
    for (const [id, walking] of [["preview-idle", false], ["preview-walk", true]]) $(id).onclick = () => {
      previewWalk = walking;
      $("preview-idle").setAttribute("aria-pressed", String(!walking));
      $("preview-walk").setAttribute("aria-pressed", String(walking));
      outfitRenderCards();
    };
    for (const button of $("modal-content").querySelectorAll("[data-costume-character]"))
      button.onclick = () => {
        outfitCharacter = button.dataset.costumeCharacter;
        for (const tab of $("modal-content").querySelectorAll("[data-costume-character]"))
          tab.setAttribute("aria-pressed", String(tab === button));
        outfitRenderCards();
      };
    outfitRenderCards();
  }
  if ($("outfits-nav"))
    $("outfits-nav").onclick = openOutfitMenu;
  return { refreshBalance: refreshOutfitBalance, open: openOutfitMenu };
}

export { initCostumeUi };
