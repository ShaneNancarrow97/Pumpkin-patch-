import { SERVICE_OUT, SERVICE_BACK, SERVICE_RIGHT, serviceNav, serviceTabs, serviceHeading, serviceMetrics, serviceNotice, priceStepper, stockMeter } from "./service-kit.js";
import * as M from "../model.js";
import { cocoaArt } from "../sandy.js";
import { money, segmented } from "./kit.js";

const cup = cocoaArt("shop");

export function festivalMeadowSheet(ui) {
  let tab = "cocoa", section = "menu", automationOpen = false;
  const visit = () => { ui.leavePlace(); ui.closeSheet(); ui.scene.refreshEstate(); ui.scene.focus(ui.state.festival.meadow ? 45 : 36, 17, 1.65); };
  const affordable = (amount, level) => ui.state.coins >= amount && M.patchLevel(ui.state).level >= level && !ui.state.paused;
  const estate = (s) => {
    const owned = s.festival.meadow, level = M.patchLevel(s).level, depth = M.fieldDepth?.(s) ?? 26;
    return `<article class="card hero"><span class="thumb"><span class="ico i-patch"></span></span><div><h3>Moonbrew Meadow</h3><p>A lantern-lit corner beyond the east fence, with a cobbled walk and space for a festival stand.</p></div></article>
      <p>${owned ? "The gate is open. Your meadow adds a cocoa pitch, planted borders and benches to the farm. Drag the map to explore." : "Grow your patch’s reputation, then open the gate and start a new little business."}</p>
      ${serviceMetrics([[owned?'Open':'For sale','Meadow gate'],['Cocoa & seating','Visitor area']])}
      ${owned ? `<button class="button gold wide" data-festival-action="visit">Visit the meadow</button><button class="button wide" data-festival-action="stand">Manage cocoa stand</button>` : `<button class="button gold wide" data-festival-action="land" ${affordable(M.MEADOW.price, M.MEADOW.level) ? "" : "disabled"}>${level < M.MEADOW.level ? `Opens at patch level ${M.MEADOW.level}` : `Open the meadow · ${money(M.MEADOW.price)}`}</button>${level < M.MEADOW.level ? `<p class="small">Current patch level: ${level}. Keep harvesting and serving the neighbours.</p>` : ""}`}
      <p class="small">Visitors can stop here for cocoa and a chat before returning to the pumpkins.</p>`;
  };
  // Comforts that make the meadow popular: guests chat more, and more visitors come.
  const comforts = (s) => {
    const c = s.festival.cocoa, bonus = Math.round(M.meadowFootfallBonus(s) * 100), chatting = s.visitors.filter(M.chatting).length;
    return `<p class="small">Each comfort brings ${Math.round(M.COMFORT_FOOTFALL * 100)}% more visitors as word gets round${bonus ? `: +${bonus}% so far` : ""}. ${chatting ? `${chatting} ${chatting === 1 ? "guest is" : "guests are"} chatting in the meadow now.` : "Guests chat in the meadow on their way home."}</p>`
      + M.MEADOW_COMFORTS.map((x) => {
        const owned = M.comfortOwned(s, x.id), ready = c.level >= x.stand;
        const art = { bunting: `<span class="thumb"><span class="ico i-boost"></span></span>`, blankets: `<span class="thumb"><span class="ico i-home"></span></span>`, mugs: cocoaArt("cocoa"), dancefloor: `<span class="thumb"><span class="ico i-music"></span></span>`, trolley: cocoaArt("deluxe") }[x.id] ?? cup;
        return `<article class="card${owned ? " done" : ""}${ready ? "" : " waiting"}">${art}<div><h3>${x.name}</h3><p>${x.text}</p><p class="effect">${x.effect}</p></div><button class="button${owned ? "" : " gold"}" data-comfort="${x.id}" ${owned || !ready || !affordable(x.price, 1) ? "disabled" : ""}>${owned ? "In place" : ready ? money(x.price) : `Stand tier ${x.stand}`}</button></article>`;
      }).join("");
  };
  // Each drink is a card: what it is, how full its shelf is, a price you nudge,
  // and one restock button.
  function product(s,p){
    const c=s.festival.cocoa,plain=!p,current=M.COCOA_TIERS[c.level-1],e=plain?{stock:c.stock,sold:c.sold}:c.extras[p.id];
    const capacity=plain?current.capacity:M.specialCapacity(s,p.id),batch=Math.min(10,capacity-e.stock),cost=batch*(plain?M.COCOA_SUPPLY.unit:p.cost);
    const price=plain?c.price:c.prices[p.id],name=plain?'Classic haunted cocoa':p.name;
    const stepper=priceStepper({label:`${name} selling price`,value:price,min:plain?3:p.minPrice,max:plain?current.maxPrice:p.maxPrice,text:money,disabled:s.paused,wrap:plain?'data-plain-cocoa-price':`data-special-price="${p.id}"`,attrs:v=>plain?`data-cocoa-price="${v}"`:`data-special-price-set="${p.id}" data-value="${v}"`});
    return `<article class="service-product${e.stock?'':' is-empty'}">${cocoaArt(plain?'cocoa':p.id)}<div class="service-product-copy"><h3>${name}</h3><p>${plain?'A warm ghost mug for chilly visitors.':p.text}</p></div>${stockMeter(e.stock,capacity,'cups ready')}<div class="service-product-controls"><div class="service-price"><span>Price</span>${stepper}</div><button class="button purchase-button" ${plain?'data-festival-action="restock"':`data-special-stock="${p.id}"`} ${!batch||!affordable(cost,1)?'disabled':''}>${batch?`Restock ${batch} · ${money(cost)}`:'Fully stocked'}</button></div><small class="service-product-foot">${e.sold} sold · ${money(plain?M.COCOA_SUPPLY.unit:p.cost)} a cup to make</small></article>`;
  }
  function helpers(s){const c=s.festival.cocoa;return `${serviceHeading('A little help behind the counter')}<p>Helpers keep Sandy serving while you look after the patch.</p><article class="service-upgrade-block">${cocoaArt('shop')}<h3>Moth courier</h3><p>Buys ${c.bulkCourier?20:10} plain cups when five remain. Supplies cost their normal price, with £100 kept in your purse.</p>${c.courier?`<div class="service-status-row"><span>Automatic plain cocoa</span><button class="button" data-festival-action="auto" aria-pressed="${c.autoSupply}" ${s.paused?'disabled':''}>${c.autoSupply?'On':'Off'}</button></div>`:`<button class="button purchase-button" data-festival-action="courier" ${c.level<2||!affordable(M.COCOA_SUPPLY.courier,1)?'disabled':''}>${c.level<2?'Stand tier 2 required':`Hire courier · ${money(M.COCOA_SUPPLY.courier)}`}</button>`}</article><article class="service-upgrade-block">${cocoaArt('barista')}<h3>Ghost barista</h3><p>Serves each order 35% faster.</p><button class="button${c.barista?'':' purchase-button'}" data-festival-action="barista" ${c.barista||c.level<3||!affordable(M.COCOA_SUPPLY.barista,1)?'disabled':''}>${c.barista?'Hired':c.level<3?'Stand tier 3 required':`Hire barista · ${money(M.COCOA_SUPPLY.barista)}`}</button></article><article class="service-upgrade-block">${cocoaArt('courier-crate')}<h3>Courier’s supply crate</h3><p>Order up to 20 portions at a time. Choose which specials to restock automatically.</p><button class="button${c.bulkCourier?'':' purchase-button'}" data-festival-action="bulk-courier" ${c.bulkCourier||!c.courier||!affordable(M.COCOA_SUPPLY.bulkCourier,1)?'disabled':''}>${c.bulkCourier?'Installed':!c.courier?'Hire the courier first':money(M.COCOA_SUPPLY.bulkCourier)}</button>${c.bulkCourier?M.COCOA_SPECIALS.filter(p=>c.level>=p.tier).map(p=>`<div class="setting"><span>${p.name}<small>${money(p.cost)} per portion · buys at five left</small></span><button class="button" data-special-auto="${p.id}" aria-pressed="${c.autoSpecials.includes(p.id)}" ${s.paused?'disabled':''}>${c.autoSpecials.includes(p.id)?'Auto on':'Auto off'}</button></div>`).join(''):''}</article>`;}
  function standUpgrades(s){const c=s.festival.cocoa,next=M.COCOA_TIERS[c.level],current=M.COCOA_TIERS[c.level-1];return `${serviceHeading('Grow Sandy’s stand',`Tier ${c.level}/${M.COCOA_TIERS.length}`)}<article class="service-upgrade-block">${cup}<h3>${next?next.name:'The grand midnight lounge'}</h3><p>${next?`${current.capacity} ${SERVICE_RIGHT} ${next.capacity} cups · faster service · more deluxe recipes`:'Sandy’s stand is fully upgraded.'}</p>${next?`<button class="button purchase-button" data-festival-action="upgrade" ${affordable(next.price,next.level)?'':'disabled'}>${M.patchLevel(s).level<next.level?`Unlocks at level ${next.level}`:`Upgrade stand · ${money(next.price)}`}</button>`:''}</article>${serviceHeading('Make the meadow welcoming')}${comforts(s)}<button class="service-inline-link" data-festival-action="estate">Meadow land & visitor area ${SERVICE_RIGHT}</button>`;}
  function cocoa(s){
    const c=s.festival.cocoa,next=M.COCOA_TIERS[c.level],current=M.COCOA_TIERS[c.level-1];
    if(!s.festival.meadow)return `<div class="service-sheet"><article class="service-upgrade-block">${cocoaArt('sandy')}<p class="eyebrow">Step 1 of 2</p><h3>A cosy corner for cocoa</h3><p>Open Moonbrew Meadow, then build Sandy’s first stand. The new visitor area includes paths, benches and planted borders.</p><button class="button purchase-button" data-festival-action="land" ${affordable(M.MEADOW.price,M.MEADOW.level)?'':'disabled'}>${M.patchLevel(s).level<M.MEADOW.level?`Unlocks at level ${M.MEADOW.level}`:`Open meadow · ${money(M.MEADOW.price)}`}</button></article><button class="service-inline-link" data-festival-action="visit">View the meadow plot ${SERVICE_OUT}</button></div>`;
    if(!current)return `<div class="service-sheet"><article class="service-upgrade-block">${cocoaArt('sandy')}<p class="eyebrow">Step 2 of 2</p><h3>Open Sandy’s haunted cocoa</h3><p>A warm first stop before pumpkin shopping. Includes ten starter cups.</p><button class="button purchase-button" data-festival-action="upgrade" ${affordable(next.price,next.level)?'':'disabled'}>${M.patchLevel(s).level<next.level?`Unlocks at level ${next.level}`:`Build the stand · ${money(next.price)}`}</button></article><button class="service-inline-link" data-festival-action="visit">View the pitch ${SERVICE_OUT}</button></div>`;
    const future=M.COCOA_SPECIALS.filter(p=>p.tier>c.level);
    const menu=`${serviceMetrics([[c.stock,'plain cups ready'],[c.sold,'cups sold'],[money(c.gross),'takings']])}${!c.stock?serviceNotice('A warm welcome needs cocoa','Restock classic cups below, or hire a courier from Helpers.'):''}<div class="service-product-list">${product(s,null)}${M.COCOA_SPECIALS.filter(p=>p.tier<=c.level).map(p=>product(s,p)).join('')}</div>${future.length?`<details class="service-disclosure"><summary>Future specials <span>${future.length} to unlock</span></summary><div class="recipe-future">${future.map(p=>`<div>${cocoaArt(p.id)}<span><b>${p.name}</b><small>Stand tier ${p.tier}</small></span></div>`).join('')}</div></details>`:''}<details class="service-disclosure"><summary>Prices & accounts</summary><p class="small">Guests compare prices with thirst, hunger and their money. Expensive drinks can sell less often.</p><div class="service-info-list"><div><span>Cocoa takings</span><b>${money(c.gross)}</b></div><div><span>Supplies spent</span><b>${money(c.supplies)}</b></div><div><span>Stand & improvements</span><b>${money(c.invested)}</b></div></div></details>`;
    return `<div class="service-sheet" data-menu-view="sandy:${section}"><header class="service-identity service-hero"><div>${cocoaArt('sandy')}<span><b>Sandy’s haunted cocoa</b><small>Stand tier ${c.level} of ${M.COCOA_TIERS.length}</small></span></div><button class="service-switch" data-festival-action="open" aria-pressed="${c.open}" ${s.paused?'disabled':''} aria-label="${c.open?'Open: tap to close the stand':'Closed: tap to open the stand'}"><i aria-hidden="true"></i><span>${c.open?'Open':'Closed'}</span></button><button class="service-location" data-festival-action="visit" aria-label="View stand">Stand <span aria-hidden="true">${SERVICE_OUT}</span></button></header>${serviceTabs('sandy-section','Cocoa management',[['menu','Menu & stock','menu'],['helpers','Helpers','helpers'],['upgrade','Upgrade','upgrade']],section)}${s.paused?'<p class="service-paused">Farm paused. Resume to buy or change prices.</p>':''}${section==='helpers'?helpers(s):section==='upgrade'?standUpgrades(s):menu}</div>`;
  }

  return { festival: {
    eyebrow: "A festival of our own", title: () => tab === "estate" ? "Moonbrew Meadow" : "Sandy’s haunted cocoa",
    setTab(value) { tab = value === "cocoa" ? "cocoa" : "estate"; },
    body({embedded=false}={}){return tab==='estate'?`<div class="service-sheet"><button class="service-inline-link" data-festival-action="stand">${SERVICE_BACK} Sandy’s cocoa</button>${estate(ui.state)}</div>`:cocoa(ui.state);},
    bind(body, { embedded = false } = {}) {
      body.querySelectorAll('[data-sandy-section]').forEach(b=>b.onclick=()=>{section=b.dataset.sandySection;ui.draw();});
      body.querySelector("[data-sandy-automation]")?.addEventListener("toggle", e => { automationOpen = e.currentTarget.open; });
      body.querySelectorAll("[data-special-auto]").forEach(b => b.onclick = () => { if(M.setCocoaAutoSpecial(ui.state,b.dataset.specialAuto,!ui.state.festival.cocoa.autoSpecials.includes(b.dataset.specialAuto))){ui.save();ui.draw();} });
      body.querySelectorAll("[data-festival-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.festivalTab; ui.draw(); });
      body.querySelectorAll("[data-special-price-set]").forEach(b => b.onclick = () => { if (M.setCocoaSpecialPrice(ui.state, b.dataset.specialPriceSet, Number(b.dataset.value))) { ui.save(); ui.draw(); } });
      body.querySelectorAll("[data-special-stock]").forEach(b => b.onclick = () => { if (M.restockCocoaSpecial(ui.state, b.dataset.specialStock)) { ui.save(); ui.tone(760); ui.draw(); } });
      body.querySelectorAll("[data-cocoa-price]").forEach((b) => b.onclick = () => { if (M.setCocoaPrice(ui.state, Number(b.dataset.cocoaPrice))) { ui.save(); ui.draw(); } });
      body.querySelectorAll("[data-comfort]").forEach((b) => b.onclick = () => {
        const comfort = M.MEADOW_COMFORTS.find((x) => x.id === b.dataset.comfort);
        if (!M.buyComfort(ui.state, comfort.id)) return;
        ui.save(); ui.tone(820); ui.notice(`${comfort.name} for the meadow. ${comfort.effect}.`); ui.draw();
      });
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
        if (action === "barista") changed = M.buyCocoaAutomation(s,"barista");
        if (action === "bulk-courier") changed = M.buyCocoaAutomation(s,"bulkCourier");
        if (action === "auto") changed = M.setCocoaAutoSupply(s, !c.autoSupply);
        if (!changed) return;
        ui.save(); ui.tone(760); ui.scene.refreshEstate();
        if (action === "land" || action === "upgrade") { tab = "cocoa"; ui.draw(); ui.notice(action === "land" ? "The meadow gate is open. Tap the prepared pitch to build." : "Your cocoa stand is ready for a warm welcome."); }
        else ui.draw();
      });
    },
  } };
}
