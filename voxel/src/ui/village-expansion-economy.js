// Read-only cards share authoritative quotes with every one-tap transaction.
import { expansionEconomyInfo, expansionWaxInfo } from '../rules/village-expansion-economy.js';
import { MATERIAL_BY_ID } from '../content/village.js';
import { RECIPE_BY_ID } from '../content/cooking.js';
import { villageItemIcon } from './village-item-markup.js';
import { expansionIcon } from './village-expansion-icon-markup.js';
const cash = n => '£' + Math.floor(n).toLocaleString('en-GB');
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button = (id, label, enabled, extra = '') => `<button type="button" class="button ${enabled ? 'gold' : ''}" data-expansion-economy="${id}" ${extra}${enabled ? '' : ' disabled'}>${label}</button>`;
const seal = (id, fallback = 'commission') => `<span class="vc-discovery-art" aria-hidden="true">${villageItemIcon(id) || expansionIcon(id, 56) || expansionIcon(fallback, 56)}</span>`;
const heading = (icon, eyebrow, title) => `<header class="vc-discovery-heading">${seal(icon)}<div><small>${safe(eyebrow)}</small><h3>${safe(title)}</h3></div></header>`;
const count = (label, amount, extra = '') => `<span><b>${safe(amount)}</b><small>${safe(label)}</small>${extra}</span>`;
const note = (text, ready = false) => text ? `<p class="vc-discovery-note${ready ? ' is-ready' : ''}">${safe(text)}</p>` : '';
const cost = (name, have, need, art = '') => `<span class="${have >= need ? 'is-ready' : 'is-short'}">${art}<span>${safe(name)}<b>${have} / ${need}</b></span></span>`;
export function renderVillageExpansionEconomy(s, { who = null, station = null } = {}) {
  const q = expansionEconomyInfo(s), cold = q.upgrades[0], wax = q.wax, batch = q.batches[0], cards = [];
  const want = id => !who || who === id;
  if (want('tansy')) {
    cards.push(`<article class="service-upgrade-block vc-discovery-card">${heading('herbs', 'From garden to kitchen', 'Clean garden herbs')}<p>One village bundle becomes one cooking ingredient.</p><div class="vc-discovery-counts">${count('village bundles', q.herbs)}<i aria-hidden="true">→</i>${count('clean herbs in pantry', q.pantryHerbs)}</div>${button('prepare-herbs', 'Prepare one bundle', q.canPrepareHerbs && q.herbs > 0 && !s.paused)}${!q.canPrepareHerbs ? note('Learn Tansy’s herb-growing chapter first. Your reward includes two real garden planters.') : ''}</article>`);
    const make = station ? button('preservation-wax', `Make at ${station === 'home' ? 'the home kitchen' : 'Maisie’s cooker'}`, expansionWaxInfo(s, station).canCook, `data-expansion-station="${station}"`) : note('Make at Maisie’s cooker or your home kitchen with a hob and pot.');
    cards.push(`<article class="service-upgrade-block vc-discovery-card">${heading('ward', 'A little harvest protection', 'Preservation wax')}<p>Protect one pumpkin batch for 10% longer storage.</p><div class="vc-discovery-counts">${count('pots ready', wax.wax)}${count('farm seconds to make', 30)}</div><div class="vc-discovery-recipe">${villageItemIcon('herbs')}<span>1 clean herb <i aria-hidden="true">+</i> 1 butter</span></div>${wax.job ? `<div class="vc-discovery-progress"><b>Warming at the ${wax.job.station === 'home' ? 'home kitchen' : 'food truck'}</b><span>${Math.ceil(wax.job.remaining)}s left</span><meter min="0" max="30" value="${Math.max(0, 30 - wax.job.remaining)}" aria-label="Preservation wax cooking progress"></meter></div>` : make}${note(wax.reason)}${button('protect-stock', batch ? `Protect ${batch.quantity} pumpkins · 1 wax` : 'No untreated stock batch', !!batch && wax.wax > 0 && !s.paused, batch ? `data-expansion-batch="${safe(batch.id)}"` : '')}</article>`);
  }
  if (want('opal')) {
    const requirements = `<div class="vc-discovery-costs" aria-label="Cold store requirements">${cost('Coins', s.coins, cold.coins)}${cold.materials.map(r => cost(MATERIAL_BY_ID[r.id]?.name ?? r.id, r.have, r.need, villageItemIcon(r.id))).join('')}${cold.gems.map(r => cost(r.id.replaceAll('-', ' '), r.have, r.need, expansionIcon(r.id, 24))).join('')}</div>`;
    cards.push(`<article class="service-upgrade-block vc-discovery-card${cold.owned ? ' is-owned' : ''}">${heading('gemcraft', cold.owned ? 'Installed at your farm' : 'Opal’s blueprint', cold.name)}<p>${safe(cold.text)}</p>${cold.owned ? '<p class="vc-discovery-owned">✓ Installed</p>' : cold.unlocked ? requirements : note('Restore Opal’s quarry story to discover the blueprint.')}${button('cold-store', cold.owned ? 'Installed' : `Install · ${cash(cold.coins)}`, cold.canBuy)}</article>`);
  }
  const orders = q.commissions.filter(c => !who || c.who === who);
  if (orders.length) cards.push(`<section class="vc-commission-section"><h3>${who === 'granny' ? 'Granny’s doorstep parcels' : 'Restaurant orders'}</h3><p class="vc-discovery-note">Cook at home, then bring unreserved portions to your neighbour.</p>${orders.map(c => {
    const name = RECIPE_BY_ID[c.recipe]?.name ?? c.recipe.replaceAll('-', ' ');
    const status = !c.unlocked ? 'Learn the recipe and open the restaurant first.' : c.remaining > 0 ? `Next table in ${Math.ceil(c.remaining)} farm seconds.` : c.have < c.quantity ? `Prepare ${c.quantity - c.have} more unreserved portions.` : 'Ready for your delivery.';
    return `<article class="service-upgrade-block vc-discovery-card${c.canDeliver ? ' is-ready' : ''}">${heading(c.who === 'granny' ? 'granny-house' : 'commission', 'Kitchen commission', c.name)}<p>${safe(name)}</p><div class="vc-discovery-counts">${count('available portions', `${c.have} / ${c.quantity}`)}${count('delivery reward', cash(c.amount))}</div>${note(status, c.canDeliver)}${button(c.id, `Deliver · ${cash(c.amount)}`, c.canDeliver)}</article>`;
  }).join('')}</section>`);
  return `<div class="expansion-economy-list vc-discoveries">${cards.join('')}<details class="vc-catalogue-note" data-vg-details-key="discovery-help:${safe(who ?? 'all')}"><summary>Farm time & your discoveries</summary><p>Prepare food at home or at Maisie’s truck. Delivery and cooking clocks run on farm time.</p><p>Real food leaves your cupboard once. Portions already reserved for guests stay with their orders.</p><p>Village food trade earned ${cash(q.income)}. This is separate from Maisie’s normal sales.</p></details></div>`;
}
export function bindVillageExpansionEconomy(root, act) {
  root.querySelectorAll('[data-expansion-economy]').forEach(b => b.onclick = () => act('economy:' + b.dataset.expansionEconomy, { station: b.dataset.expansionStation ?? 'truck', batch: b.dataset.expansionBatch }));
}
