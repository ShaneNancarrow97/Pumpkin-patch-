import { escapeHtml } from "./html.js";
import { productCatalog } from "../content/products.js";
import { availableQuantity, stockQuantity } from "../core/inventory.js";
import { stallProfiles } from "../content/stall.js";

function createStallPanel(app2) {
  const money = (n) => "£" + Math.floor(n).toLocaleString("en-GB");
  const names = Object.fromEntries(productCatalog.map((p) => [p.id, p.name]));
  const basket = (lines) => lines.map((l) => l.quantity + " × " + names[l.productId]).join(" + ");
  function markup() {
    return `<section class="stall-panel"><h3 class="shop-section-title">A pumpkin for every pocket.</h3>
            <p>Passers-by choose by taste, budget and what is available. Some take a pair; others save for one special pumpkin. Keep a little variety growing.</p>
            <div class="stall-ledger"><span>Outdoor takings<strong id="stall-income"></strong></span><span>Guests served<strong id="stall-served"></strong></span><span>Pumpkins sold<strong id="stall-items"></strong></span></div>
            <div class="stall-stock-grid">${productCatalog.map((p) => `<article><span class="crop-preview ${p.id.slice(8)}" aria-hidden="true" style="background-image:url('${app2.gameAsset("assets/house/pumpkin-animation.webp")}');"></span><div><h4>${escapeHtml(p.name)}</h4><small>Usual price ${money(p.defaultPrice)}</small><p data-stall-stock="${p.id}"></p></div></article>`).join("")}</div>
            <button class="secondary" id="stall-crops">Choose what we grow →</button><p class="stall-note">Outdoor guests see every variety in stock. Skyla’s indoor display choices and reserved baskets stay separate.</p>
            <h3 class="shop-section-title">At the stall</h3><div id="stall-guests" class="shop-customers" aria-live="off"></div>
            <details class="stall-demand"><summary>What do our visitors look for?</summary><div>${stallProfiles.map((p) => `<article><strong>${escapeHtml(p.name)}</strong><span>${money(p.budget)} budget · up to ${p.basketLimit}</span><small>${p.preferred.map((id) => escapeHtml(names[id])).join(" / ")} preferred; another affordable variety is welcome.</small></article>`).join("")}</div></details>
            <h3 class="shop-section-title">The latest outdoor baskets</h3><div id="stall-receipts" class="shop-receipts"></div>
            <p id="stall-missed" class="stall-note"></p><p class="stall-note">Stall totals start with this chapter. All takings join our shared coins.</p>
        </section>`;
  }
  function replace(id, html) {
    const el = app2.$(id);
    if (el.dataset.signature !== html) {
      el.innerHTML = html;
      el.dataset.signature = html;
    }
  }
  function refresh() {
    if (!app2.$("stall-income")) return;
    const s = app2.state.stall;
    app2.$("stall-income").textContent = money(s.income);
    app2.$("stall-served").textContent = String(s.served);
    app2.$("stall-items").textContent = String(s.itemsSold);
    for (const node of document.querySelectorAll("[data-stall-stock]")) {
      const id = node.dataset.stallStock, free = availableQuantity(app2.state.inventory, id), held = stockQuantity(app2.state.inventory, id) - free;
      node.textContent = free + " available" + (held ? " · " + held + " held indoors" : "") + (!free ? " · grow more" : "");
    }
    const outcomes = { shopping: "Choosing a pumpkin", bought: "Heading home", budget: "Nothing within budget", soldout: "Back after harvest" };
    replace("stall-guests", app2.state.visitors.map((v) => `<article class="customer-card" data-stall-guest="${v.id}"><div><strong>${escapeHtml(stallProfiles[v.profile].name)}</strong><span>Budget ${money(v.budget)} · up to ${v.basketLimit}</span></div><b>${v.age < 3 ? "Arriving" : outcomes[v.outcome]}</b><small>${v.basket.length ? escapeHtml(basket(v.basket)) + " · " + money(v.amount) : "Prefers " + v.preferred.map((id) => escapeHtml(names[id])).join(" / ")}</small></article>`).join("") || '<p class="shop-empty">A lantern on the path. Our next visitor is on their way.</p>');
    replace("stall-receipts", s.receipts.slice(0, 5).map((r) => `<div data-stall-receipt="${r.visitorId}"><span>${escapeHtml(stallProfiles[r.profile].name)}<small>${escapeHtml(basket(r.basket))}</small></span><strong>+${money(r.amount)}</strong></div>`).join("") || '<p class="shop-empty">Our next basket starts the stall ledger.</p>');
    app2.$("stall-missed").textContent = `Left without a pumpkin: ${s.missedBudget} outside budget · ${s.missedStock} while stock was unavailable. Affordable varieties help more visitors find something.`;
  }
  return { markup, refresh };
}

export { createStallPanel };
