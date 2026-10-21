import * as M from "../model.js";
import { cocoaArt } from "../sandy.js";
import { money, segmented } from "./kit.js";

const cup = cocoaArt("shop");

export function festivalMeadowSheet(ui) {
  let tab = "estate";
  const visit = () => { ui.leavePlace(); ui.closeSheet(); ui.scene.refreshEstate(); ui.scene.focus(ui.state.festival.meadow ? 45 : 36, 17, 1.65); };
  const affordable = (amount, level) => ui.state.coins >= amount && M.patchLevel(ui.state).level >= level && !ui.state.paused;
  const estate = (s) => {
    const owned = s.festival.meadow, level = M.patchLevel(s).level;
    return `<article class="card hero"><span class="thumb"><span class="ico i-patch"></span></span><div><h3>Moonbrew Meadow</h3><p>A lantern-lit corner beyond the east fence, with a cobbled walk and space for a festival stand.</p></div></article>
      <p>${owned ? "The gate is open. Your meadow adds a cocoa pitch, planted borders and benches to the farm. Drag the map to explore." : "Grow your patch’s reputation, then open the gate and start a new little business."}</p>
      <div class="stats"><div><b>${owned ? "54 × 26" : "40 → 54"}</b><span>${owned ? "expanded farm bounds" : "farm width"}</span></div><div><b>1</b><span>buildable stand pitch</span></div></div>
      ${owned ? `<button class="button gold wide" data-festival-action="visit">Visit the meadow</button><button class="button wide" data-festival-action="stand">Manage cocoa stand</button>` : `<button class="button gold wide" data-festival-action="land" ${affordable(M.MEADOW.price, M.MEADOW.level) ? "" : "disabled"}>${level < M.MEADOW.level ? `Opens at patch level ${M.MEADOW.level}` : `Open the meadow · ${money(M.MEADOW.price)}`}</button>${level < M.MEADOW.level ? `<p class="small">Current patch level: ${level}. Keep harvesting and serving the neighbours.</p>` : ""}`}
      <p class="small">Further festival pitches and kitchen-made supplies are planned for later updates.</p>`;
  };
  const cocoa = (s) => {
    const c = s.festival.cocoa, next = M.COCOA_TIERS[c.level], current = M.COCOA_TIERS[c.level - 1];
    if (!s.festival.meadow) return `${cup}<p>Open Moonbrew Meadow to prepare a cocoa pitch.</p><button class="button gold wide" data-festival-action="estate">See the meadow</button>`;
    if (!current) return `<article class="card hero">${cup}<div><h3>${next.name}</h3><p>A copper urn, warm cups and a cosy first stop before pumpkin shopping.</p></div></article><p>Includes 10 starter cups. Buy premixed supplies for £2 a cup; choose your selling price and keep the stand stocked.</p><button class="button gold wide" data-festival-action="upgrade" ${affordable(next.price, next.level) ? "" : "disabled"}>${M.patchLevel(s).level < next.level ? `Unlocks at level ${next.level}` : `Build the stand · ${money(next.price)}`}</button><button class="button wide" data-festival-action="visit">See the pitch</button>`;
    const batch = Math.min(M.COCOA_SUPPLY.batch, current.capacity - c.stock), supplyCost = batch * M.COCOA_SUPPLY.unit;
    return `<article class="card hero">${cocoaArt("sandy")}<div><p class="eyebrow">Tier ${c.level} of 3 · ${c.open ? "Open" : "Closed"}</p><h3>${current.name}</h3><p>Sandy’s haunted hot chocolate. Visitors pay from their own budget, then continue to Skyla’s pumpkin counter.</p></div></article>
      <div class="stats"><div><b>${c.stock}/${current.capacity}</b><span>plain cups in stock</span></div><div><b>${c.sold}</b><span>cups sold</span></div><div><b>${money(c.gross - c.supplies)}</b><span>takings less supplies</span></div></div>
      <div class="setting"><span>Open for a warm welcome<small>Closing sends waiting visitors on to the pumpkins.</small></span><button class="button" data-festival-action="open" ${s.paused ? "disabled" : ""} aria-pressed="${c.open}">${c.open ? "Open" : "Closed"}</button></div>
      <button class="button gold wide" data-festival-action="restock" ${batch > 0 && affordable(supplyCost, 1) ? "" : "disabled"}>${batch ? `Stock ${batch} cups · ${money(supplyCost)}` : "Cupboard is full"}</button>
      <article class="card">${cocoaArt("cocoa")}<div><h3>Plain cocoa</h3><p>A warm ghost mug. Choose the selling price below.</p></div></article><div class="chips" role="group" aria-label="Cocoa selling price">${Array.from({ length: current.maxPrice - 2 }, (_, i) => i + 3).map((price) => `<button class="chip" data-cocoa-price="${price}" ${s.paused ? "disabled" : ""} aria-pressed="${c.price === price}">${money(price)}</button>`).join("")}</div>
      <p class="small">Festival guests bring £${[0, 4, 7, 9][c.level]} extra for drinks and treats and keep money for their planned pumpkin basket. Visitors compare price with thirst, hunger, value and their budget. Higher prices can mean fewer sales. A cup costs £2 to restock.</p>
      <h3 class="section">Sandy’s specials</h3>${M.COCOA_SPECIALS.map(p => {
        const unlocked = c.level >= p.tier, e = c.extras[p.id], batch = Math.min(10, M.specialCapacity(s, p.id) - e.stock), cost = batch * p.cost;
        return `<article class="card">${cocoaArt(p.id)}<div><h3>${p.name}</h3><p>${p.text}</p><p class="small">${unlocked ? `${e.stock} ready · sells for ${money(c.prices[p.id])} · ${e.sold} sold` : `Unlocks with stand tier ${p.tier}`}</p></div><button class="button ${unlocked ? "gold" : ""}" data-special-stock="${p.id}" ${!unlocked || !batch || !affordable(cost, 1) ? "disabled" : ""}>${!unlocked ? "Locked" : !batch ? "Full" : `${batch} · ${money(cost)}`}</button></article>${unlocked ? `<div class="special-prices"><label>${p.name} price <select data-special-price="${p.id}" ${s.paused ? "disabled" : ""} aria-label="${p.name} selling price">${Array.from({length:p.maxPrice-p.minPrice+1},(_,i)=>i+p.minPrice).map(price=>`<option value="${price}" ${c.prices[p.id] === price ? "selected" : ""}>${money(price)}</option>`).join("")}</select></label></div>` : ""}`;
      }).join("")}
      ${next ? `<h3 class="section">Grow the stand</h3><article class="card hero">${cup}<div><h3>${next.name}</h3><p>Room for ${next.capacity} cups, faster service and prices up to ${money(next.maxPrice)}.</p></div></article><button class="button wide" data-festival-action="upgrade" ${affordable(next.price, next.level) ? "" : "disabled"}>${M.patchLevel(s).level < next.level ? `Opens at patch level ${next.level}` : `Upgrade · ${money(next.price)}`}</button>` : `<p class="small">Your midnight pavilion is fully upgraded.</p>`}
      <h3 class="section">Moth courier</h3>${c.courier ? `<div class="setting"><span>Automatic supplies<small>Restocks at 5 cups; keeps £100 safely in your purse.</small></span><button class="button" data-festival-action="auto" ${s.paused ? "disabled" : ""} aria-pressed="${c.autoSupply}">${c.autoSupply ? "On" : "Off"}</button></div>` : `<p>A fluttery little helper buys replacement supplies at the normal price. Available from stand tier 2.</p><button class="button wide" data-festival-action="courier" ${c.level >= 2 && affordable(M.COCOA_SUPPLY.courier, 1) ? "" : "disabled"}>Hire courier · ${money(M.COCOA_SUPPLY.courier)}</button>`}
      <button class="button wide" data-festival-action="visit">Visit the stand</button><p class="small">Cocoa takings ${money(c.gross)} · supplies ${money(c.supplies)} · setup and upgrades ${money(c.invested)}. Existing cocoa hospitality upgrades improve service and patience; the physical stand sells from stock.</p>`;
  };
  return { festival: {
    eyebrow: "A festival of our own", title: "Sandy’s Haunted Cocoa",
    setTab(value) { tab = value === "cocoa" ? "cocoa" : "estate"; },
    body() { return segmented("festival-tab", "Festival management", [["estate", "Meadow"], ["cocoa", "Cocoa stand"]], tab) + (tab === "estate" ? estate(ui.state) : cocoa(ui.state)); },
    bind(body) {
      body.querySelectorAll("[data-festival-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.festivalTab; ui.draw(); });
      body.querySelectorAll("[data-special-price]").forEach(select => select.onchange = () => { if (M.setCocoaSpecialPrice(ui.state, select.dataset.specialPrice, Number(select.value))) { ui.save(); ui.draw(); } else select.value = String(ui.state.festival.cocoa.prices[select.dataset.specialPrice]); });
      body.querySelectorAll("[data-special-stock]").forEach(b => b.onclick = () => { if (M.restockCocoaSpecial(ui.state, b.dataset.specialStock)) { ui.save(); ui.tone(760); ui.draw(); } });
      body.querySelectorAll("[data-cocoa-price]").forEach((b) => b.onclick = () => { if (M.setCocoaPrice(ui.state, Number(b.dataset.cocoaPrice))) { ui.save(); ui.draw(); } });
      body.querySelectorAll("[data-festival-action]").forEach((b) => b.onclick = () => {
        const s = ui.state, c = s.festival.cocoa, action = b.dataset.festivalAction;
        if (action === "visit") return visit();
        if (action === "estate" || action === "stand") { tab = action === "stand" ? "cocoa" : "estate"; ui.draw(); return; }
        let changed = false;
        if (action === "land") changed = M.buyMeadow(s);
        if (action === "upgrade") changed = M.upgradeCocoa(s);
        if (action === "restock") changed = M.restockCocoa(s) > 0;
        if (action === "open") changed = M.setCocoaOpen(s, !c.open);
        if (action === "courier") changed = M.hireCocoaCourier(s);
        if (action === "auto") changed = M.setCocoaAutoSupply(s, !c.autoSupply);
        if (!changed) return;
        ui.save(); ui.tone(760); ui.scene.refreshEstate();
        if (action === "land" || action === "upgrade") { tab = "cocoa"; visit(); ui.notice(action === "land" ? "The meadow gate is open. Tap the prepared pitch to build." : "Your cocoa stand is ready for a warm welcome."); }
        else ui.draw();
      });
    },
  } };
}
