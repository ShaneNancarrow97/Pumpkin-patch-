import { SERVICE_OUT, SERVICE_BACK, SERVICE_RIGHT, serviceNav, serviceHeading } from "./service-kit.js";
import { hospitalityIcon } from "./hospitality-icons.js";
import * as M from "../model.js";
import * as H from "../rules/hayride.js";
import { HAYRIDE_PROPERTY, HAYRIDE_TIERS, HAYRIDE_SCARES } from "../content/hayride.js";
import { money } from "./kit.js";
import { hayrideRouteLength, hayrideStops } from "../content/hayride-layout.js";
import { premiumIcon } from "./premium-icon-markup.js";

const number = value => Math.max(0, Math.floor(Number(value) || 0));
const ride = s => s.hayride;
const editable = s => !s.paused;
const disabled = enabled => enabled ? "" : "disabled";
const manage = ui => ui.openHayrideSheet ? ui.openHayrideSheet() : ui.openSheet("hayride");
const config = s => H.hayrideConfig(s);
const phaseName = { loading: "At the platform", departing: "Leaving the station", circuit: "In the woods", arriving: "Returning to the station", unloading: "Guests leaving the wagon" };
const visitArrow = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 12 8-8M4 4h8v8"/></svg>';

// Countdowns are rounded to seconds so a live sheet does not redraw each frame.
function convoyStatus(s) {
  const h = ride(s), c = config(s), v = h.convoy, o = H.hayrideOccupancy(s);
  if (v.phase === "circuit") return { title: phaseName.circuit, text: `Returns in ${Math.max(0, Math.ceil((1 - v.progress) * (v.tripSeconds??c.circuitSeconds)))}s`, progress: Math.max(0, Math.min(1, v.progress)) };
  if (v.phase !== "loading") return { title: phaseName[v.phase] ?? "Preparing the next ride", text: `${o.aboard} ${o.aboard === 1 ? "guest" : "guests"} aboard`, progress: v.phase === "arriving" || v.phase === "unloading" ? 1 : 0 };
  if (o.aboard) return { title: "Boarding", text: o.aboard >= o.seats ? "Ready to depart" : `Departs full or in ${Math.max(0, Math.ceil(H.hayrideLoadingWait(s) - v.loadWait))}s`, progress: 0 };
  return { title: h.open ? phaseName.loading : "Admissions closed", text: h.open ? "Waiting for the first brave guest" : "Open admissions to welcome guests", progress: 0 };
}

function purchaseReason(s) {
  if (!editable(s)) return "Resume the farm to make changes.";
  if (M.patchLevel(s).level < HAYRIDE_PROPERTY.level) return `Purchase unlocks at patch level ${HAYRIDE_PROPERTY.level}.`;
  if (!s.hollowHouse?.purchased || s.hollowHouse.status !== "ready") return "Restore The Hollow House to prepare your next attraction.";
  if (s.coins < HAYRIDE_PROPERTY.price) return `Save ${money(HAYRIDE_PROPERTY.price - s.coins)} more to open the woodland clearing.`;
  return "Includes the clearing, tractor, four-seat wagon and the first woodland circuit.";
}

// One page holds the operational controls; optional scenery and accounts unfold below.
export function hayrideSheets(ui) {
  let accountsOpen = false, scaresOpen = false, section = "overview";
  const changed = (message = "", rebuild = false) => {
    ui.save(); if (rebuild) ui.scene.refreshHayride?.(); ui.tone?.(680); ui.draw();
    if (message) ui.notice?.(message);
  };
  const visit = () => { ui.closeSheet(); if (ui.focusHayride) ui.focusHayride(); else ui.scene.focusHayride?.(); };

  function locked(s) {
    const canBuy = editable(s) && H.hayrideUnlocked(s) && s.coins >= HAYRIDE_PROPERTY.price;
    return `<div class="hayride-sheet" data-hayride-state="locked"><article class="hayride-welcome purchase-card${canBuy ? " purchase-available" : ""}"><span class="hayride-mark" aria-hidden="true">${premiumIcon("attractions")}</span><div><p class="hayride-kicker">Your next scare attraction</p><h3>A trail into the dark</h3><p>Rear boarding, a lantern-lit queue and a tractor ride through the haunted woods.</p></div><button class="button purchase-button wide" data-hayride-action="purchase" ${disabled(canBuy)}>Open the hayride · ${money(HAYRIDE_PROPERTY.price)}</button></article><p class="hayride-note" data-hayride-gate>${purchaseReason(s)}</p><div class="hayride-preview"><span>4 seats</span><span>5 scare scenes</span><span>Tickets on boarding</span></div></div>`;
  }

  function reputation(s) {
    const rating = number(H.hayrideScareRating(s)), appeal = number(H.hayrideFootfallBonus(s) * 100);
    return `<section class="hayride-reputation" aria-label="Hayride appeal"><div><span>Scare factor <b>${rating}<small>/100</small></b></span><span class="hayride-appeal">${appeal ? `+${appeal}% footfall` : ride(s).open ? "Build a reputation" : "Open to attract guests"}</span></div><meter min="0" max="100" value="${rating}" aria-label="Scare factor ${rating} out of 100"></meter><p>Stronger scares draw a crowd. Frightened guests may head home after their ride.</p></section>`;
  }

  function nextUpgrade(s) {
    const h = ride(s), c = config(s), next = HAYRIDE_TIERS[h.tier], level = M.patchLevel(s).level;
    const canBuy = next && editable(s) && level >= next.patchLevel && s.coins >= next.cost;
    return `<section class="hayride-upgrade service-upgrade-block" aria-label="Hayride progression"><div class="hayride-section-title"><h3>Grow the attraction</h3><span>Tier ${h.tier} of ${HAYRIDE_TIERS.length}</span></div><ol class="hayride-tier-track">${HAYRIDE_TIERS.map((tier, i) => `<li class="${i + 1 < h.tier ? "is-owned" : i + 1 === h.tier ? "is-current" : ""}" ${i + 1 === h.tier ? 'aria-current="step"' : ""}><b>${tier.seats}</b><span>seats</span></li>`).join("")}</ol>${next ? `<div class="hayride-next"><div><h4>${next.name}</h4><p>${c.seats} → ${next.seats} seats · ${next.queueCapacity} queue places</p><small>${level < next.patchLevel ? `Patch level ${next.patchLevel} required` : !editable(s) ? "Resume the farm to upgrade" : s.coins < next.cost ? `${money(next.cost - s.coins)} more needed` : "More seats and a better welcome"}</small></div><button class="button purchase-button" data-hayride-action="upgrade" ${disabled(canBuy)}>Upgrade<br><span>${money(next.cost)}</span></button></div>` : '<p class="hayride-note">Your midnight convoy is fully upgraded.</p>'}</section>`;
  }

  function scenery(s) {
    const h = ride(s), owned = new Set(h.haunts?.owned ?? []), active = new Set(h.haunts?.active ?? []);
    return `<details class="hayride-disclosure" data-hayride-disclosure="scares" ${scaresOpen ? "open" : ""}><summary><span>Scares & scenery<small>Purchase and switch woodland effects</small></span><span class="hayride-disclosure-count">${active.size}/${HAYRIDE_SCARES.length}</span></summary><div class="hayride-scare-list">${HAYRIDE_SCARES.map(p => {
      const bought = owned.has(p.id), on = bought && active.has(p.id), locked = h.tier < p.tier;
      const canBuy = !locked && editable(s) && s.coins >= p.cost;
      return `<article class="hayride-scare${on ? " is-active" : ""}"><div><h4>${p.name}</h4><p>${p.text}</p><small>+${p.scare} scare${locked ? ` · Tier ${p.tier}` : ""}</small></div>${bought ? `<button class="button" data-hayride-scare-toggle="${p.id}" aria-pressed="${on}" ${disabled(editable(s))}>${on ? "On" : "Off"}</button>` : `<button class="button${!locked ? " purchase-button" : ""}" data-hayride-scare-buy="${p.id}" ${disabled(canBuy)}>${locked ? `Tier ${p.tier}` : money(p.cost)}</button>`}</article>`;
    }).join("")}</div><p class="hayride-note">Buy once, then switch each improvement on or off. Every base scene stays on the route.</p></details>`;
  }

  function routeUpgrades(s){
    const h=ride(s),level=M.patchLevel(s).level,next=H.HAYRIDE_ROUTE_UPGRADES[h.routeLevel??0],locked=next&&(level<next.patchLevel||h.tier<next.tier);
    return `<section class="hayride-upgrade service-upgrade-block" aria-label="Route length and scenery"><div class="hayride-section-title"><h3>Route & scenery</h3><span>${Math.round(hayrideRouteLength(s))}m · ${hayrideStops(s).length} scenes</span></div><p class="hayride-note">${config(s).circuitSeconds}s paid circuit. Each extension adds a new physical woodland lane and scene; a ride-along follows the complete route.</p>${next?`<div class="hayride-next"><div><h4>${next.name}</h4><p>${next.text}</p><small>+${next.seconds}s · +${next.scare} scare${level<next.patchLevel?` · Patch level ${next.patchLevel}`:h.tier<next.tier?` · Attraction tier ${next.tier}`:""}</small></div><button class="button${!locked?" purchase-button":""}" data-hayride-route ${disabled(editable(s)&&!locked&&s.coins>=next.cost)}>${locked?level<next.patchLevel?`Level ${next.patchLevel}`:`Tier ${next.tier}`:money(next.cost)}</button></div>`:'<p class="hayride-note">The graveyard and crooked thicket are part of your complete woodland circuit.</p>'}</section>`;
  }

  function operations(s) {
    const h=ride(s),level=M.patchLevel(s).level;
    return `<section class="hayride-upgrade service-upgrade-block" aria-label="Tractors and station crew"><div class="hayride-section-title"><h3>Tractors & station crew</h3><span>${H.hayrideFleetSize(s)} tractor${H.hayrideFleetSize(s)>1?"s":""}</span></div>${H.HAYRIDE_OPERATIONS.map(u=>{
      const owned=h[u.id]??0,price=u.costs[owned],done=price===undefined,gate=level<u.level||h.tier<u.tier;
      const note=done?"Fully upgraded":level<u.level?`Patch level ${u.level}`:h.tier<u.tier?`Attraction tier ${u.tier}`:u.id==="dispatch"?`${owned+1}/${u.costs.length} · boarding ${H.hayrideBoardingSeconds(s).toFixed(1)}s now`:`${config(s).seats*2} total seats across two independent wagons`;
      return `<div class="hayride-next"><div><h4>${u.name}</h4><p>${u.text}</p><small>${note}</small></div><button class="button${!done&&!gate?" purchase-button":""}" data-hayride-operation="${u.id}" ${disabled(!done&&!gate&&editable(s)&&s.coins>=price)}>${done?"Owned":gate?level<u.level?`Level ${u.level}`:`Tier ${u.tier}`:money(price)}</button></div>`;
    }).join("")}<p class="hayride-note">A second tractor boards another group while the first is in the woods. Crew shorten boarding and part-load waits; every paid ride still completes its full circuit.</p></section>`;
  }
  function fleetStatus(s){
    if(H.hayrideFleetSize(s)<2)return "";
    return `<div class="hayride-platform-foot" aria-label="Both tractors">${H.hayrideConvoys(s).map((c,index)=>`<span>Tractor ${index+1} · ${c.phase==="circuit"?"in the woods":c.phase==="loading"?`${c.manifest.length}/${config(s).seats} aboard`:c.phase}</span>`).join("")}</div>`;
  }

  function accounts(s) {
    const h = ride(s);
    return `<details class="hayride-disclosure" data-hayride-disclosure="accounts" ${accountsOpen ? "open" : ""}><summary><span>Ticket accounts<small>${number(h.ticketsSold)} paid admissions</small></span><b>${money(h.income)}</b></summary><dl class="hayride-accounts"><div><dt>Ticket takings</dt><dd>${money(h.income)}</dd></div><div><dt>Rides completed</dt><dd>${number(h.completed)}</dd></div><div><dt>Ran home frightened</dt><dd>${number(h.runHome)}</dd></div><div><dt>Visits declined</dt><dd>${number(h.missed)}</dd></div><div><dt>Attraction investment</dt><dd>${money(h.invested)}</dd></div></dl><p class="hayride-note">Guests pay once when they board. Tickets are separate from retail takings and tips.</p></details>`;
  }

  function body(s) {
    const h = ride(s); if (!h.purchased) return locked(s);
    const c = config(s), o = H.hayrideOccupancy(s), status = convoyStatus(s), range = H.hayrideTicketRange(s);
    const overview=`      <section class="hayride-platform" aria-label="Station status"><div class="hayride-platform-title"><h3>${status.title}</h3><span>${number(o.aboard)}/${number(o.seats)} aboard</span></div><p>${status.text}</p><progress max="1" value="${status.progress}" aria-label="Ride circuit progress"></progress><div class="hayride-platform-foot"><span>${number(o.queue)}/${number(o.queueCapacity)} queuing</span><button class="hayride-text-button" data-hayride-action="visit">View station ${visitArrow}</button></div></section>
      <section class="hayride-price-row"><div><h3>Ticket price</h3><p>Charged when a guest boards</p></div><div class="hayride-price-stepper" role="group" aria-label="Hayride ticket price"><button class="button" data-hayride-price-step="-1" aria-label="Reduce ticket price" ${disabled(editable(s) && h.ticketPrice > range.min)}>−</button><output aria-label="Current ticket price">${money(h.ticketPrice)}</output><button class="button" data-hayride-price-step="1" aria-label="Increase ticket price" ${disabled(editable(s) && h.ticketPrice < range.max)}>+</button></div></section>
      <p class="hayride-note">Guests weigh the scares, ticket value and their remaining money. Queued guests keep their quoted price.</p>
      ${fleetStatus(s)}${reputation(s)}${ui.openHayrideRide ? '<button class="button gold wide" data-hayride-action="experience">Ride along</button>' : ""}${accounts(s)}`;
    const content=section==='upgrade'?`${serviceHeading('Make your next great scare')}${nextUpgrade(s)}${operations(s)}${routeUpgrades(s)}`:section==='scares'?`${reputation(s)}${scenery(s)}`:overview;
    return `<div class="hayride-sheet service-sheet" data-hayride-state="owned" data-menu-view="hayride:${section}"><header class="service-identity"><div>${hospitalityIcon('fleet',48)}<span><b>Station & woodland</b><small>${H.hayrideFleetSize(s)} tractor${H.hayrideFleetSize(s)>1?'s':''} · Tier ${h.tier}</small></span></div><button class="service-location" data-hayride-action="visit">View station ${SERVICE_OUT}</button></header>${serviceNav('hayride-section','Hayride management',[['overview','Overview'],['scares','Scares'],['upgrade','Upgrade']],section)}${section==='overview'?`<div class="service-status-row"><span><b>Admissions</b><small>${h.open?'Welcoming brave visitors':'Closed to new passengers'}</small></span><button class="button" data-hayride-action="open" aria-pressed="${h.open}" ${disabled(editable(s))}>${h.open?'Open':'Closed'}</button></div>`:''}${s.paused?'<p class="service-paused">Farm paused. Resume to change tickets or upgrades.</p>':''}${content}</div>`;
  }

  return { hayride: { eyebrow: "A woodland full of unwelcome surprises", title: HAYRIDE_PROPERTY.name ?? "The Hollow Hayride", setTab(value) { section=["overview","scares","upgrade"].includes(value)?value:"overview";scaresOpen=section==="scares"; }, body() { return body(ui.state); }, bind(host) {
    host.querySelectorAll("[data-hayride-section]").forEach(b=>b.onclick=()=>{section=b.dataset.hayrideSection;scaresOpen=section==="scares";ui.draw();});
    host.querySelectorAll("[data-hayride-disclosure]").forEach(detail => detail.addEventListener("toggle", () => { if (detail.dataset.hayrideDisclosure === "accounts") accountsOpen = detail.open; else scaresOpen = detail.open; }));
    host.querySelectorAll("[data-hayride-price-step]").forEach(button => button.onclick = () => { if (H.setHayrideTicketPrice(ui.state, ride(ui.state).ticketPrice + Number(button.dataset.hayridePriceStep))) changed(); });
    host.querySelector("[data-hayride-route]")?.addEventListener("click",()=>{if(H.buyHayrideRoute(ui.state))changed("A new woodland detour is ready for the next departure.",true);});
    host.querySelectorAll("[data-hayride-operation]").forEach(button=>button.onclick=()=>{if(H.buyHayrideOperation(ui.state,button.dataset.hayrideOperation))changed(button.dataset.hayrideOperation==="fleet"?"A second tractor is ready at its own boarding bay.":"The station crew are ready to load more quickly.",true);});
    host.querySelectorAll("[data-hayride-scare-buy]").forEach(button => button.onclick = () => { if (H.buyHayrideScare(ui.state, button.dataset.hayrideScareBuy)) changed("A new fright is waiting in the woods.", true); });
    host.querySelectorAll("[data-hayride-scare-toggle]").forEach(button => button.onclick = () => { const id = button.dataset.hayrideScareToggle, on = !(ride(ui.state).haunts?.active ?? []).includes(id); if (H.setHayrideScareActive(ui.state, id, on)) changed("", true); });
    host.querySelectorAll("[data-hayride-action]").forEach(button => button.onclick = () => {
      const action = button.dataset.hayrideAction;
      if (action === "visit") return visit();
      if (action === "experience") return ui.openHayrideRide?.();
      const s = ui.state, ok = action === "purchase" ? H.buyHayride(s) : action === "open" ? H.setHayrideOpen(s, !ride(s).open) : action === "upgrade" ? H.upgradeHayride(s) : false;
      if (ok) changed(action === "purchase" ? "Your hayride is ready. Open admissions when you’re ready to welcome guests." : action === "upgrade" ? "More room for brave passengers." : "", action !== "open");
    });
  } } };
}

// The outdoor pick opens this small card; the deeper sheet is always deliberate.
export function createHayrideContext(ui) {
  const host = document.createElement("aside"); host.className = "building-context hayride-context"; host.hidden = true; host.setAttribute("aria-label", "The Hollow Hayride"); document.body.append(host);
  let selected = false, lastHTML = "";
  const view = { open() { selected = true; lastHTML = ""; view.tick(); }, close() { selected = false; host.hidden = true; }, tick(blocked = false) {
    host.hidden = !selected || blocked || !!ui.scene.place; if (host.hidden) return;
    const s = ui.state, h = ride(s), c = config(s), o = H.hayrideOccupancy(s), status = h.purchased ? convoyStatus(s) : null;
    const html = `<header><h3>The Hollow Hayride</h3><button class="icon-button" data-hayride-context="close" aria-label="Close hayride card">×</button></header><p>${h.purchased ? `Tier ${h.tier} · ${h.open ? "Open" : "Closed"} · ${money(h.ticketPrice)} ticket` : `Purchase unlocks at patch level ${HAYRIDE_PROPERTY.level}`}</p>${h.purchased ? `<div class="hayride-context-meta"><span>${number(o.aboard)}/${o.seats} aboard · ${number(o.queue)} queuing</span><span>${status.title}</span></div>` : '<p>A tractor, a hay wagon and something waiting in the trees.</p>'}<div class="building-context-actions"><button class="button${!h.purchased ? " gold" : ""}" data-hayride-context="manage">${h.purchased ? "Manage" : "View attraction"}</button>${h.purchased && ui.openHayrideRide ? '<button class="button gold" data-hayride-context="experience">Ride along</button>' : h.purchased ? '<button class="button" data-hayride-context="visit">View station</button>' : ""}</div>`;
    if (html === lastHTML) return; host.innerHTML = lastHTML = html;
    host.querySelectorAll("[data-hayride-context]").forEach(button => button.onclick = () => { const action = button.dataset.hayrideContext; if (action === "close") return view.close(); view.close(); if (action === "experience") ui.openHayrideRide?.(); else if (action === "visit") { if (ui.focusHayride) ui.focusHayride(); else ui.scene.focusHayride?.(); } else manage(ui); });
  } };
  return view;
}
