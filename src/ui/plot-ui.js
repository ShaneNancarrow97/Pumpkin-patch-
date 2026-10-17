import { pumpkinVarieties } from "../content/products.js";
import { availableQuantity, stockQuantity } from "../core/inventory.js";
import { plotVariety, selectedPlotVariety } from "../core/plot-model.mjs";
import { unlocked } from "../core/model.mjs";

function initPlotUi(app2) {
  let returnToShop = false;
  const money = (value) => "£" + Math.floor(value).toLocaleString("en-GB");
  function options(level2) {
    return pumpkinVarieties.map((v, i) => `<option value="pumpkin-${v.id}" ${i > level2 ? "disabled" : ""}>${v.name} · ${money(v.price)}${i > level2 ? " · locked" : ""}</option>`).join("");
  }
  function open(fromShop = false) {
    if (app2.features.home.active) app2.features.home.setMode(false);
    app2.setPlotUpgradeMode(false);
    returnToShop = fromShop;
    const s = app2.state, count3 = unlocked(s);
    app2.showModal(`<section class="plot-crops-menu">
            <p id="crop-choice-announcement" class="crop-choice-announcement" role="status"></p>
            <header class="crop-menu-heading"><div><div class="modal-subtitle">A LITTLE CHOICE IN EVERY PATCH</div><h2>Crops & seeds.</h2></div>
            <div class="crop-menu-wallet"><span>Our coins <strong id="crop-menu-coins"></strong></span><button class="secondary" id="crop-shop">Shop displays →</button></div></header>
            <p class="crop-intro"><span class="crop-intro-lead">Choose each plot’s next crop. </span>Growing pumpkins finish unchanged.<span class="crop-auto-copy"> Helping hands follows your choices.</span></p>
            <p class="crop-menu-note" id="crop-pause-note" hidden>Tea break: resume the game to change seeds or buy upgrades.</p>
            <div class="crop-plot-grid">${Array.from({ length: count3 }, (_, i) => `<article class="crop-plot-card" data-crop-card="${i}">
                <header><span class="crop-preview" data-crop-art="${i}" aria-hidden="true" style="background-image:url('${app2.gameAsset("assets/house/pumpkin-animation.webp")}');"></span><div><span class="tiny-badge">PLOT ${i + 1}</span><h3 data-crop-name="${i}"></h3><small data-crop-unlocks="${i}"></small></div></header>
                <p class="crop-current" data-current-crop="${i}"></p>
                <label for="plot-crop-${i}">Next planting<select id="plot-crop-${i}" aria-label="Next crop for plot ${i + 1}" data-crop-select="${i}" data-unlock-level="${s.plotLevels[i]}">${options(s.plotLevels[i])}</select></label>
                <p class="crop-stock" data-crop-stock="${i}"></p>
                <button class="secondary crop-unlock" data-crop-upgrade="${i}" aria-describedby="crop-upgrade-reason-${i}"></button><small class="crop-upgrade-reason" id="crop-upgrade-reason-${i}" data-crop-reason="${i}"></small>
            </article>`).join("")}</div>
            ${count3 < 12 ? `<button class="secondary crop-expand" id="crop-expand">${12 - count3} more plots await · farm upgrades →</button>` : ""}
            <div class="crop-menu-actions"><button class="secondary" id="upgrade-map">Upgrade on the map</button><button class="primary" id="crop-return">${fromShop === "stall" ? "← Back to the stall" : fromShop ? "← Back to displays" : "Back to the patch →"}</button></div>
        </section>`);
    for (const choice of document.querySelectorAll("[data-crop-select]")) choice.onchange = () => {
      const i = Number(choice.dataset.cropSelect);
      if (app2.actions.choosePlotCrop(i, choice.value)) {
        app2.save();
        app2.renderUI();
        const v = selectedPlotVariety(app2.state, i);
        app2.$("crop-choice-announcement").textContent = "Plot " + (i + 1) + ": " + v.name + " next.";
      } else {
        refresh();
        app2.toast("Resume the game and choose unlocked seeds for this plot.");
      }
    };
    for (const button of document.querySelectorAll("[data-crop-upgrade]")) button.onclick = () => {
      const i = Number(button.dataset.cropUpgrade);
      if (app2.actions.upgradePlot(app2.state, i)) {
        app2.save();
        app2.tone(720);
        app2.renderUI();
        app2.toast("Plot " + (i + 1) + ": " + plotVariety(app2.state, i).name + " unlocked. Next planting: " + selectedPlotVariety(app2.state, i).name + ".");
      }
    };
    app2.$("crop-shop").onclick = () => app2.features.shop.open("stock");
    app2.$("crop-return").onclick = () => returnToShop ? app2.features.shop.open(returnToShop === "stall" ? "stall" : "stock") : app2.closeModal();
    app2.$("upgrade-map").onclick = () => {
      app2.closeModal();
      app2.setPlotUpgradeMode(true);
      app2.viewMap(false);
    };
    if (app2.$("crop-expand")) app2.$("crop-expand").onclick = () => app2.$("upgrades-nav").click();
    refresh();
  }
  function refresh() {
    if (!app2.$("crop-menu-coins")) return;
    const s = app2.state;
    app2.$("crop-menu-coins").textContent = money(s.coins);
    app2.$("crop-pause-note").hidden = !s.paused;
    app2.$("upgrade-map").disabled = s.paused;
    for (const choice of document.querySelectorAll("[data-crop-select]")) {
      const i = Number(choice.dataset.cropSelect), v = selectedPlotVariety(s, i), owned = plotVariety(s, i), next = pumpkinVarieties[s.plotLevels[i] + 1];
      if (choice.dataset.unlockLevel !== String(s.plotLevels[i])) {
        choice.innerHTML = options(s.plotLevels[i]);
        choice.dataset.unlockLevel = s.plotLevels[i];
      }
      if (choice.value !== s.plotCrops[i]) choice.value = s.plotCrops[i];
      choice.disabled = s.paused;
      document.querySelector(`[data-crop-name="${i}"]`).textContent = v.name + " · " + money(v.price);
      document.querySelector(`[data-crop-unlocks="${i}"]`).textContent = "Seeds unlocked through " + owned.name;
      document.querySelector(`[data-crop-art="${i}"]`).className = "crop-preview " + v.id;
      const p = s.plots[i], crop = pumpkinVarieties.find((v2) => v2.price === p.price);
      document.querySelector(`[data-current-crop="${i}"]`).textContent = p.phase === "empty" ? "Empty ground · ready to plant" : (p.phase === "ready" ? "Ready to pick: " : "Growing: ") + crop.name + " · " + money(p.price);
      const free = availableQuantity(s.inventory, s.plotCrops[i]), held = stockQuantity(s.inventory, s.plotCrops[i]) - free;
      document.querySelector(`[data-crop-stock="${i}"]`).textContent = "Shop stock: " + free + " available" + (held ? " · " + held + " reserved" : "");
      const button = document.querySelector(`[data-crop-upgrade="${i}"]`);
      button.textContent = next ? "Unlock " + next.name + " · " + money(next.cost) : "All four varieties unlocked";
      button.disabled = s.paused || !next || s.coins < next.cost;
      document.querySelector(`[data-crop-reason="${i}"]`).textContent = !next ? "Choose any variety above, free." : s.paused ? "Resume to unlock seeds." : s.coins < next.cost ? "Need " + money(next.cost - s.coins) + " more." : v.id !== owned.id ? "Your chosen " + v.name + " seeds will stay selected." : "Selects " + next.name + " for the next planting.";
    }
  }
  return { open, refresh };
}

export { initPlotUi };
