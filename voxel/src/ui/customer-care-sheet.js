import * as M from "../model.js";
import { money, segmented } from "./kit.js";
export function customerCareSheet(ui) {
  let tab = "upgrades";
  const upgrades = s => `<p>Small comforts for fuller baskets and thoughtful thank-yous. Available once Skyla’s shop is open.</p>` + M.CARE_UPGRADES.map(u => {
    const level = s.customerCare[u.id], price = M.careUpgradeCost(s, u.id);
    return `<article class="card"><span class="thumb"><span class="ico i-${u.id === "bags" ? "stock" : "coins"}"></span></span><div><h3>${u.name}</h3><p>${u.text}</p><p class="small">${u.id === "bags" ? `Extra capacity: +${level} per visitor` : `Generosity tier ${level} of 3`}</p></div><button class="button ${price === undefined ? "" : "gold"}" data-care-upgrade="${u.id}" ${price === undefined || s.paused || !s.shop.unlocked || s.coins < price ? "disabled" : ""}>${price === undefined ? "Complete" : money(price)}</button></article>`;
  }).join("") + `<p class="small">Pumpkins receive a random 1–5 star quality grade when sold; rarer varieties have a higher minimum. Tips depend on quality, time spent waiting for service and the guest’s remaining money. They are paid automatically and tracked separately.</p>`;
  const stats = s => {
    const c = s.customerCare;
    return `<div class="stats"><div><b>${money(M.totalTips(s))}</b><span>total tips</span></div><div><b>${money(c.tips.stall)}</b><span>stall tips</span></div><div><b>${money(c.tips.shop)}</b><span>indoor shop tips</span></div><div><b>${c.tipped.stall + c.tipped.shop}</b><span>customers who tipped</span></div><div><b>${c.graded ? (c.qualityTotal / c.graded).toFixed(1) + " / 5" : "—"}</b><span>average pumpkin quality</span></div><div><b>${money(s.stall.income + s.shop.income)}</b><span>pumpkin takings, before tips</span></div></div>
      <h3 class="section">Recent baskets</h3>${c.receipts.length ? c.receipts.map(r => `<article class="care-receipt"><div><b>${r.route === "shop" ? "Indoor shop" : "Farm stall"}</b><small>${r.quantity} pumpkin${r.quantity === 1 ? "" : "s"} · ${M.qualityName(r.quality)} ${r.quality.toFixed(1)}★ · ${r.service.toFixed(1)}s service</small></div><span>${money(r.amount)}<small>+ ${money(r.tip)} tip</small></span></article>`).join("") : `<p>Your first sale will appear here.</p>`}<p class="small">Pumpkin takings, cocoa sales, tips and favour rewards are separate. All payments still contribute to your coins.</p>`;
  };
  return { care: { eyebrow: "Skyla’s counter", title: "Bags & thank-yous", body() { return segmented("care-tab", "Customer care", [["upgrades", "Upgrades"], ["stats", "Stats & tips"]], tab) + (tab === "stats" ? stats(ui.state) : upgrades(ui.state)); }, bind(body) {
    body.querySelectorAll("[data-care-tab]").forEach(b => b.onclick = () => { tab = b.dataset.careTab; ui.draw(); });
    body.querySelectorAll("[data-care-upgrade]").forEach(b => b.onclick = () => { if (M.buyCareUpgrade(ui.state, b.dataset.careUpgrade)) { ui.save(); ui.tone(820); ui.draw(); } });
  } } };
}
