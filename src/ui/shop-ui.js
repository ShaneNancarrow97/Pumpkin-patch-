import { escapeHtml } from "./html.js";
import { asset } from "../platform/assets.js";
import { productCatalog } from "../content/products.js";
import { availableQuantity, stockQuantity } from "../core/inventory.js";
import { checkoutSeconds, shopCapacity, shopUpgradeCosts } from "../content/shop.js";
import { occupiedPlaces } from "../core/shop.js";
import { skylaArt } from "../content/skyla-meta.mjs";
import { shopMapOutline } from "../scene/shop-layout.js";
import { createShopRenderer } from "../scene/shop-renderer.js";
import { createStallPanel } from "./stall-ui.js";

function initShopUi(app2) {
  const renderer = createShopRenderer(app2.scene.art);
  const stall = createStallPanel(app2);
  let panel = "floor", speechIndex = 0, drawFailed = false;
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const names = Object.fromEntries(productCatalog.map((p) => [p.id, p.name]));
  const money = (value) => "£" + Math.floor(value).toLocaleString("en-GB");
  function portrait() {
    const a = skylaArt, r = a.rects[0];
    return `<span class="skyla-portrait" role="img" aria-label="Skyla, our calico shopkeeper" style="background-image:url('${asset(a.path)}');background-size:${a.width / r[2] * 100}% ${a.height / r[3] * 100}%;background-position:${r[0] / (a.width - r[2]) * 100}% ${r[1] / (a.height - r[3]) * 100}%;"></span>`;
  }
  function open(next = "floor") {
    if (app2.features.home.active) app2.features.home.setMode(false);
    panel = ["floor", "stock", "stall", "upgrades"].includes(next) ? next : "floor";
    render();
  }
  function render() {
    const s = app2.state.shop;
    app2.showModal(`<section class="farm-shop-menu" data-shop-panel="${panel}">
            <header class="shop-heading">${portrait()}<div><div class="modal-subtitle">SKYLA · RESIDENT SHOPKEEPER</div><h2>Skyla’s pumpkin shop.</h2><p>A little glow. A warm welcome. A very watchful cat.</p></div></header>
            <div class="shop-wallet">Our coins <strong id="shop-coins">${money(app2.state.coins)}</strong><button class="secondary" id="talk-to-skyla">Ask Skyla</button></div>
            <p class="skyla-dialogue" id="skyla-dialogue" role="status" hidden></p>
            <nav class="shop-tabs" aria-label="Farm shop sections">${[["floor", "Shop floor"], ["stock", "Displays"], ["stall", "Stall"], ["upgrades", "Upgrades"]].map(([id, label]) => `<button data-shop-tab="${id}" class="${panel === id ? "active" : ""}" aria-pressed="${panel === id}">${label}</button>`).join("")}</nav>
            <div id="shop-panel">${panel === "floor" ? floor(s) : panel === "stock" ? stock(s) : panel === "stall" ? stall.markup() : upgrades2(s)}</div>
            <button class="secondary shop-return" id="leave-shop">← Return to the patch</button>
        </section>`);
    app2.$("talk-to-skyla").onclick = talk;
    app2.$("leave-shop").onclick = app2.closeModal;
    for (const b of document.querySelectorAll("[data-shop-tab]")) b.onclick = () => open(b.dataset.shopTab);
    for (const b of document.querySelectorAll("[data-shop-upgrade]")) b.onclick = () => {
      if (app2.actions.upgradeShop(b.dataset.shopUpgrade)) {
        app2.save();
        render();
        app2.renderUI();
        app2.toast("Skyla approves. A little more room to grow.");
      }
    };
    for (const choice of document.querySelectorAll("[data-display-select]")) choice.onchange = () => {
      const index = Number(choice.dataset.displaySelect);
      if (app2.actions.assignDisplay(index, choice.value || null)) {
        app2.save();
        refresh();
        app2.toast("Display updated. Baskets already chosen stay reserved.");
      } else {
        choice.value = app2.state.shop.displays[index] || "";
        app2.toast("That pumpkin already has a display, or the shop is paused.");
      }
    };
    if (app2.$("shop-open-upgrades")) app2.$("shop-open-upgrades").onclick = () => open("upgrades");
    if (app2.$("shop-crops")) app2.$("shop-crops").onclick = () => app2.features.plots.open(true);
    if (app2.$("stall-crops")) app2.$("stall-crops").onclick = () => app2.features.plots.open("stall");
    if (app2.$("retry-shop-art")) app2.$("retry-shop-art").onclick = () => {
      drawFailed = false;
      renderer.reset();
      app2.$("shop-art-status").hidden = true;
      frame(0, app2.scene.time);
    };
    if (drawFailed && app2.$("shop-art-status")) app2.$("shop-art-status").hidden = false;
    refresh();
    frame(0, app2.scene.time);
  }
  function floor(s) {
    return `<div class="shop-floor"><canvas id="shop-canvas" width="1000" height="660" role="img" aria-label="Illustrated farm shop with Skyla on the counter and visitors browsing"></canvas></div><p id="shop-art-status" class="shop-art-status" role="status" hidden>Shop animation paused. Your customers and controls still work. <button class="secondary" id="retry-shop-art">Retry illustration</button></p>
            ${!s.unlocked ? `<div class="shop-opening"><h3>Let’s welcome them inside.</h3><p>Your stall already serves passers-by. Open the indoor shop for ${money(shopUpgradeCosts.open[0])} to let Skyla greet visitors, browse the displays and check out their baskets.</p><button class="primary" data-shop-upgrade="open">Open the shop · ${money(shopUpgradeCosts.open[0])}</button></div>` : ""}
            <div class="shop-summary"><span>Inside <strong id="shop-occupancy"></strong></span><span>Indoor takings <strong id="shop-income"></strong></span><span>Pumpkins sold <strong id="shop-items-sold"></strong></span></div>
            <h3 class="shop-section-title">Who’s browsing?</h3><div id="shop-customers" class="shop-customers" aria-live="off"></div>
            <h3 class="shop-section-title">The latest baskets</h3><div id="shop-receipts" class="shop-receipts"></div>`;
  }
  function stock(s) {
    return `<p>Choose a variety for each display. Harvest stock restocks it automatically. Customers choose affordable baskets; reserved pumpkins stay held until payment.</p><button class="secondary" id="shop-crops">Choose what our plots grow →</button>
            ${!s.unlocked ? '<p class="shop-locked-note">Open the shop before stocking its indoor displays. Your passing customers keep using the stall.</p>' : ""}
            <div class="shop-display-grid">${Array.from({ length: 4 }, (_, i) => {
        const locked = i >= 2 && !s.displayLevel;
        return `<article class="shop-display-card ${locked ? "locked" : ""}"><span class="tiny-badge">DISPLAY ${i + 1}</span><h3>${locked ? "A little more space" : "Choose a pumpkin"}</h3>${locked ? "<p>Unlock two more bins in shop Upgrades.</p>" : `<label>On this display<select data-display-select="${i}" aria-label="Pumpkin variety for display ${i + 1}"><option value="">Empty display</option>${productCatalog.map((p) => `<option value="${p.id}" ${s.displays[i] === p.id ? "selected" : ""}>${escapeHtml(p.name)} · ${money(p.defaultPrice)}</option>`).join("")}</select></label><p class="display-availability" id="display-stock-${i}"></p>`}</article>`;
      }).join("")}</div><button class="secondary" id="shop-open-upgrades">Expand our shop →</button>`;
  }
  function upgrades2(s) {
    const entries = [
      ["open", "A shop for Skyla", "Welcome visitors inside. Your outdoor stall keeps serving too.", Number(s.unlocked)],
      ["capacity", "A warmer welcome", `${shopCapacity[s.capacityLevel]} browsing ${shopCapacity[s.capacityLevel] === 1 ? "place" : "places"} → ${shopCapacity[Math.min(3, s.capacityLevel + 1)]}. Let more visitors browse together.`, s.capacityLevel],
      ["displays", "A fuller cupboard", "Two extra produce bins. Offer all four pumpkin varieties at once.", s.displayLevel],
      ["checkout", "A quicker little paw", `${checkoutSeconds[s.checkoutLevel]}s checkout → ${checkoutSeconds[Math.min(2, s.checkoutLevel + 1)]}s. One till, less waiting.`, s.checkoutLevel]
    ];
    return `<p>More browsing places help visitors shop together. More displays offer choice. A faster till serves the queue sooner.</p><div class="shop-upgrade-list">${entries.map(([id, name, description, level2]) => {
        const price2 = shopUpgradeCosts[id][level2];
        return `<article><div><span class="tiny-badge">${id === "open" ? "START HERE" : !s.unlocked ? "REQUIRES OPEN SHOP" : "SHOP IMPROVEMENT"}</span><h3>${name}</h3><p>${description}</p></div><button class="${price2 === void 0 ? "secondary" : "primary"}" data-shop-upgrade="${id}">${price2 === void 0 ? "Complete" : money(price2)}</button><small id="shop-upgrade-reason-${id}"></small></article>`;
      }).join("")}</div><p class="shop-investment">Invested in our shop: <strong>${money(s.invested)}</strong>. Indoor earnings join the same coin balance as the patch.</p>`;
  }
  function refresh() {
    const menu = app2.$("shop-panel");
    if (!menu) return;
    const s = app2.state.shop;
    app2.$("shop-coins").textContent = money(app2.state.coins);
    for (const b of document.querySelectorAll("[data-shop-upgrade]")) {
      const id = b.dataset.shopUpgrade, level2 = id === "open" ? Number(s.unlocked) : id === "capacity" ? s.capacityLevel : id === "displays" ? s.displayLevel : s.checkoutLevel;
      const price2 = shopUpgradeCosts[id][level2], prerequisite = id === "open" || s.unlocked;
      b.disabled = app2.state.paused || price2 === void 0 || !prerequisite || app2.state.coins < price2;
      const note = app2.$("shop-upgrade-reason-" + id);
      if (note) note.textContent = app2.state.paused ? "Paused" : !prerequisite ? "Open the shop first" : price2 === void 0 ? "Fully upgraded" : app2.state.coins < price2 ? "Need " + money(price2 - app2.state.coins) + " more" : "";
    }
    for (const choice of document.querySelectorAll("[data-display-select]")) {
      const i = Number(choice.dataset.displaySelect);
      choice.disabled = app2.state.paused || !s.unlocked;
      for (const option of choice.querySelectorAll("option")) option.disabled = !!option.value && s.displays.some((id2, n) => n !== i && id2 === option.value);
      const id = s.displays[i], total = id ? stockQuantity(app2.state.inventory, id) : 0, free = id ? availableQuantity(app2.state.inventory, id) : 0;
      app2.$("display-stock-" + i).textContent = !id ? "This bin is empty." : free + " available · " + (total - free) + " reserved" + (!free ? " · grow more to restock" : "");
    }
    if (app2.$("shop-occupancy")) {
      app2.$("shop-occupancy").textContent = occupiedPlaces(s) + " / " + shopCapacity[s.capacityLevel];
      app2.$("shop-income").textContent = money(s.income);
      app2.$("shop-items-sold").textContent = s.itemsSold;
      const phases = { entering: "Arriving", browsing: "Browsing", queue: "Waiting for Skyla", paying: "At Skyla’s till", leaving: "Heading home" };
      const html = s.customers.map((c) => `<article class="customer-card" data-shop-customer="${c.id}"><div><strong>${c.model[0].toUpperCase() + c.model.slice(1)} guest</strong><span>Budget ${money(c.budget)} · up to ${c.basketLimit} pumpkins</span></div><b>${phases[c.phase]}</b><small>${c.outcome === "unavailable" ? "Nothing affordable on today’s displays" : c.basket.length ? c.basket.map((l) => `${l.quantity} × ${names[l.productId]}`).join(" + ") : "Looking for a little autumn magic"}</small></article>`).join("") || `<p class="shop-empty">${s.unlocked ? "Skyla is watching the door. Visitors arrive while you farm or read." : "Open the shop to invite visitors inside."}</p>`;
      if (app2.$("shop-customers").dataset.signature !== html) {
        app2.$("shop-customers").innerHTML = html;
        app2.$("shop-customers").dataset.signature = html;
      }
      const receiptHtml = s.receipts.slice(0, 5).map((r) => `<div><span>${r.quantity} pumpkins <small>${r.basket.map((l) => `${l.quantity} × ${names[l.productId]}`).join(" + ")}</small></span><strong>+${money(r.amount)}</strong></div>`).join("") || '<p class="shop-empty">The first basket is waiting to become a story.</p>';
      if (app2.$("shop-receipts").dataset.signature !== receiptHtml) {
        app2.$("shop-receipts").innerHTML = receiptHtml;
        app2.$("shop-receipts").dataset.signature = receiptHtml;
      }
    }
    stall.refresh();
  }
  function talk() {
    const lines = !app2.state.shop.unlocked ? ["Mrrp? (Skyla has inspected the counter. She is ready when you are.)", "Prrr. (A shop needs pumpkins, visitors, and an excellent cat.)"] : ["Mrrp. (Two orange pumpkins make a lovely little basket.)", "Prrp. (Paws off the reserved pumpkins. They belong to someone’s basket.)", "Miaow. (A faster till means less waiting. I am already very fast at napping.)", "Prrr. (Shane grows them. Natalie makes them glow. I supervise.)"];
    const text = app2.$("skyla-dialogue");
    text.hidden = false;
    text.textContent = lines[speechIndex++ % lines.length];
  }
  function frame(dt, time) {
    const canvas = app2.$("shop-canvas");
    if (canvas && app2.$("modal").open && !drawFailed) {
      try {
        renderer.draw(canvas, app2.state, dt, time, reduced);
      } catch (error) {
        drawFailed = true;
        app2.$("shop-art-status").hidden = false;
        console.error("Shop illustration could not draw:", error);
      }
    }
  }
  const entry = app2.$("enter-shop"), shape = shopMapOutline;
  entry.style.cssText = `left:${shape.x / 10}%;top:${shape.y / 6.1}%;width:${shape.width / 10}%;height:${shape.height / 6.1}%;clip-path:polygon(${shape.polygon});`;
  entry.onclick = () => open();
  app2.$("manage-shop").onclick = () => open();
  return { open, refresh, frame, drawMap: renderer.drawMap, reset() {
    panel = "floor";
    speechIndex = 0;
    drawFailed = false;
    renderer.reset();
  } };
}

export { initShopUi };
