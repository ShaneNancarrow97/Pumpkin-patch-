// A short workshop list, sharing authoritative quotes with the actual purchases.
import { expansionEconomyInfo, expansionWaxInfo } from '../rules/village-expansion-economy.js';
const cash=n=>'£'+Math.floor(n).toLocaleString('en-GB');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(id,label,enabled,extra='')=>`<button class="button ${enabled?'gold':''}" data-expansion-economy="${id}" ${extra} ${enabled?'':'disabled'}>${label}</button>`;
export function renderVillageExpansionEconomy(s,{who=null,station=null}={}){
 const q=expansionEconomyInfo(s),cold=q.upgrades[0],wax=q.wax,batch=q.batches[0],cards=[];
 const want=id=>!who||who===id;
 if(want('tansy')){
  cards.push(`<article class="service-upgrade-block"><h3>Clean garden herbs</h3><p>${q.herbs} village bundles · ${q.pantryHerbs} clean herbs in the pantry. One bundle makes one cooking ingredient.</p>${button('prepare-herbs','Prepare one bundle',q.canPrepareHerbs&&q.herbs>0&&!s.paused)}${!q.canPrepareHerbs?'<p class="small">Learn Tansy’s herb-growing chapter first. Your reward includes two real garden planters.</p>':''}</article>`);
  const make=station?button('preservation-wax',`Make at ${station==='home'?'the home kitchen':'Maisie’s cooker'}`,expansionWaxInfo(s,station).canCook,`data-expansion-station="${station}"`):'<p class="small">Make this utility recipe at Maisie’s cooker or your home kitchen. It needs a hob and pot.</p>';
  cards.push(`<article class="service-upgrade-block"><h3>Preservation wax</h3><p>One herb + one butter · 30 farm seconds · ${wax.wax} pots ready. Protect one harvest batch for 10% longer storage.</p>${wax.job?`<p class="small">Warming at the ${wax.job.station==='home'?'home kitchen':'food truck'} · ${Math.ceil(wax.job.remaining)}s left.</p>`:make}<p class="small">${safe(wax.reason)}</p>${button('protect-stock',batch?`Protect ${batch.quantity} pumpkins · 1 wax`:'No untreated stock batch',!!batch&&wax.wax>0&&!s.paused,batch?`data-expansion-batch="${safe(batch.id)}"`:'')}</article>`);
 }
 if(want('opal'))cards.push(`<article class="service-upgrade-block"><h3>${cold.name}</h3><p>${cold.text}</p><p class="small">${cold.owned?'Installed':cold.unlocked?'1200 coins · 6 iron · 4 clay · 1 Ember Garnet':'Restore Opal’s quarry story to discover the blueprint.'}</p>${button('cold-store',cold.owned?'Installed':`Install · ${cash(cold.coins)}`,cold.canBuy)}</article>`);
 const orders=q.commissions.filter(c=>!who||c.who===who);
 if(orders.length)cards.push(`<h3 class="section">${who==='granny'?'Granny’s doorstep parcels':'Restaurant orders'}</h3><p class="small">Real food leaves your cupboard once and is paid as trade. Already-reserved servings stay with their guests.</p>${orders.map(c=>`<article class="service-upgrade-block"><h3>${c.name}</h3><p>${safe(c.recipe.replaceAll('-',' '))} · ${c.have}/${c.quantity} portions · ${cash(c.amount)}</p><p class="small">${!c.unlocked?'Learn the recipe and open the restaurant first.':c.remaining>0?`Next table in ${Math.ceil(c.remaining)} farm seconds.`:'The table is ready for your delivery.'}</p>${button(c.id,`Deliver · ${cash(c.amount)}`,c.canDeliver)}</article>`).join('')}`);
 return `<div class="expansion-economy-list"><p>Discoveries become useful equipment, recipes and supplies. Head home to prepare food; delivery and cooking clocks run on farm time.</p>${cards.join('')}<p class="small">Village food trade earned ${cash(q.income)}. This is separate from Maisie’s normal sales.</p></div>`;
}
export function bindVillageExpansionEconomy(root,act){
 root.querySelectorAll('[data-expansion-economy]').forEach(b=>b.onclick=()=>act('economy:'+b.dataset.expansionEconomy,{station:b.dataset.expansionStation??'truck',batch:b.dataset.expansionBatch}));
}
