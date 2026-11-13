import * as M from "../model.js";
import { money, segmented } from "./kit.js";
export const customerCareUpgrades = s => `<p>Small comforts for fuller baskets and thoughtful thank-yous. Available once Skyla’s shop is open.</p>` + M.CARE_UPGRADES.map(u => {
    const level = s.customerCare[u.id], price = M.careUpgradeCost(s, u.id);
    let benefit = `<p class="small">Extra capacity: +${level} per visitor</p>`;
    if (u.id === "tipJar") {
      const current = M.tipJarBenefits(level), next = price === undefined ? null : M.tipJarBenefits(level + 1), example = n => M.tipJarOffer(n, { amount: 100, quality: 4 }).amount;
      const percent = n => `${Math.round(n * 100)}%`;
      benefit = `<p class="small">${next ? `${next.name} · Tier ${level + 1}` : current.name} · ${level} of ${u.costs.length} owned</p><p class="small">Best tip chance <b>${percent(current.chance)}${next ? ` → ${percent(next.chance)}` : ""}</b> · up to ${money(M.CUSTOMER_TIP_CAP)}</p><p class="small">When a quick 4★ £100 basket gets a tip: <b>${money(example(level))}${next ? ` → ${money(example(level + 1))}` : ""}</b></p>`;
    }
    return `<article class="card"><span class="thumb"><span class="ico i-${u.id === "bags" ? "stock" : "coins"}"></span></span><div><h3>${u.name}</h3><p>${u.text}</p>${benefit}</div><button class="button ${price === undefined ? "" : "gold"}" data-care-upgrade="${u.id}" ${price === undefined || s.paused || !s.shop.unlocked || s.coins < price ? "disabled" : ""}>${price === undefined ? "Complete" : money(price)}</button></article>`;
  }).join("") + `<p class="small">Best chances need 5★ pumpkins and quick service: within 4s at the stall or 8s indoors. Rarer pumpkins have a higher minimum quality; faster tills help keep the queue quick. Guests tip only from money left after their purchases. Tips are automatic and tracked separately.</p>`;
export const customerCareSummary = s => `<div class="commerce-summary"><span><b>${money(M.totalTips(s))}</b> tips earned</span><span><b>${s.customerCare.graded ? (s.customerCare.qualityTotal / s.customerCare.graded).toFixed(1) + "★" : "—"}</b> pumpkin quality</span></div>`;
export function bindCustomerCareUpgrades(body, ui) {
  body.querySelectorAll("[data-care-upgrade]").forEach(b => b.onclick = () => { if (M.buyCareUpgrade(ui.state, b.dataset.careUpgrade)) { ui.save(); ui.tone(820); ui.draw(); } });
}

export function customerCareSheet(ui) {
  let tab = "upgrades";
  const stats = s => {
    const c = s.customerCare;
    return `<div class="stats"><div><b>${money(M.totalTips(s))}</b><span>total tips</span></div><div><b>${money(c.tips.stall)}</b><span>stall tips</span></div><div><b>${money(c.tips.shop)}</b><span>indoor shop tips</span></div><div><b>${c.tipped.stall + c.tipped.shop}</b><span>customers who tipped</span></div><div><b>${c.graded ? (c.qualityTotal / c.graded).toFixed(1) + " / 5" : "—"}</b><span>average pumpkin quality</span></div><div><b>${money(s.stall.income + s.shop.income)}</b><span>pumpkin takings, before tips</span></div></div>
      <h3 class="section">Recent baskets</h3>${c.receipts.length ? c.receipts.map(r => `<article class="care-receipt"><div><b>${r.route === "shop" ? "Indoor shop" : "Farm stall"}</b><small>${r.quantity} pumpkin${r.quantity === 1 ? "" : "s"} · ${M.qualityName(r.quality)} ${r.quality.toFixed(1)}★ · ${r.service.toFixed(1)}s service</small></div><span>${money(r.amount)}<small>+ ${money(r.tip)} tip</small></span></article>`).join("") : `<p>Your first sale will appear here.</p>`}<p class="small">Pumpkin takings, cocoa sales, tips and favour rewards are separate. All payments still contribute to your coins.</p>`;
  };
  return { care: { eyebrow: "Skyla’s counter", title: "Bags & thank-yous", body() { return segmented("care-tab", "Customer care", [["upgrades", "Upgrades"], ["stats", "Stats & tips"]], tab) + (tab === "stats" ? stats(ui.state) : customerCareUpgrades(ui.state)); }, bind(body) {
    body.querySelectorAll("[data-care-tab]").forEach(b => b.onclick = () => { tab = b.dataset.careTab; ui.draw(); });
    bindCustomerCareUpgrades(body, ui);
  } } };
}
