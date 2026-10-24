import * as M from "../model.js";
import * as H from "../rules/hollow-house.js";
import { premiumIcon } from "./premium-icon-markup.js";
import { HOLLOW_PROPERTY, FOYER_TIERS, FOYER_DECOR, FOYER_DECOR_BY_ID, FOYER_FINISHES, MAZE_PREFABS } from "../content/hollow-house.js";
import prefabIcons from "../../assets/maze-prefab-icons.png";
import { money, segmented } from "./kit.js";

const GROUPS = [["all", "All"], ["reception", "Reception"], ["lighting", "Lighting"], ["furniture", "Furniture"], ["decorations", "Decor"], ["effects", "Effects"], ["entrance", "Entrance"]];
const SURFACES = [["floor", "Floors"], ["walls", "Walls"], ["reception", "Reception"], ["lighting", "Lighting"], ["entrance", "Entrance"], ["effects", "Effects"]];
const hex = n => "#" + n.toString(16).padStart(6, "0");
const config = s => FOYER_TIERS[Math.max(0, Math.min(4, s.hollowHouse.tier - 1))];
const status = s => { const h = s.hollowHouse; return !h.purchased ? "Derelict property" : h.status === "restoring" ? "Restoration in progress" : h.status !== "ready" ? "Awaiting restoration" : h.open ? "Open" : "Restored · closed"; };
const gateText = s => M.patchLevel(s).level < HOLLOW_PROPERTY.level ? `Purchase unlocks at patch level ${HOLLOW_PROPERTY.level}.` : "A forgotten house, waiting for a rather unusual welcome.";
const occupancy = s => { const o = H.hollowOccupancy(s); return { foyer: o.foyer ?? o.inside ?? 0, maze: o.maze ?? 0 }; };
const art = id => `<span class="estate-art" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="m6 22 18-15 18 15M10 19v24h28V19M20 43V29h8v14m-13-20h4m10 0h4M21 15v5h6v-5"/>${id === "ghost-orb" ? '<path d="M17 27a7 7 0 0 1 14 0v10l-4-2-3 3-3-3-4 2zm4 0h1m4 0h1"/>' : ""}</svg></span>`;
const openManage = (ui, tab = "manage") => ui.openHollowSheet ? ui.openHollowSheet(tab) : ui.openSheet("hollow");
// Keep a single copy of the generated atlas out of repeatedly refreshed markup.
const prefabIconURL = (() => { try { if (!prefabIcons.startsWith("data:")) return prefabIcons; return URL.createObjectURL(new Blob([Uint8Array.from(atob(prefabIcons.split(",")[1]), c => c.charCodeAt(0))], { type: "image/png" })); } catch { return prefabIcons; } })();
// Generated art: three columns, two rows; the last cell is the attraction crest.
const prefabArt = index => `<span class="maze-prefab-art" aria-hidden="true" style="background-image:url(${prefabIconURL});background-position:${index % 3 * 50}% ${Math.floor(index / 3) * 100}%"></span>`;
const scareSummary = s => {
  const rating = Math.round(H.mazeScareRating(s)), appeal = Math.round(H.mazeFootfallBonus(s) * 100);
  return `<section class="maze-scare-summary" aria-label="Scare Maze reputation"><div class="maze-scare-heading"><span>Scare rating <b>${rating}<small>/100</small></b></span><span class="maze-footfall">${appeal ? `+${appeal}% visitors` : s.hollowHouse.open ? "Add a haunt to build appeal" : "Open to attract visitors"}</span></div><meter class="maze-scare-meter" min="0" max="100" value="${rating}" aria-label="Scare rating ${rating} out of 100"></meter><p>More scares bring more visitors. Nervous guests may run home; braver ones may queue for another paid visit.</p></section>`;
};

// Management is deliberate; selecting the building first shows the small card.
export function hollowSheets(ui) {
  let tab = "manage", decorTab = "catalogue", category = "all", surface = "floor";
  const changed = () => { ui.save(); ui.scene.refreshFoyer?.(); ui.scene.refreshHollow?.(); ui.tone(680); ui.draw(); };
  const editable = s => !s.paused;
  function manage(s) {
    const h = s.hollowHouse, c = config(s), o = occupancy(s);
    if (!h.purchased) return `<article class="estate-ground-card"><p class="eyebrow">Derelict attraction</p><h3>The Hollow House</h3><p>${gateText(s)}</p><button class="button gold wide" data-hollow-action="purchase" ${H.hollowUnlocked(s) && editable(s) && s.coins >= HOLLOW_PROPERTY.price ? "" : "disabled"}>Purchase property · ${money(HOLLOW_PROPERTY.price)}</button></article><p class="small">The building must be restored before it can open or sell tickets.</p>`;
    if (h.status === "restoring") return `<article class="estate-ground-card"><p class="eyebrow">Restoring the old house</p><h3>A little dust, a little magic</h3><p>Axel is preparing his reception. ${Math.max(0, Math.ceil(h.restoreRemaining))}s remaining.</p><progress max="${HOLLOW_PROPERTY.restorationSeconds}" value="${HOLLOW_PROPERTY.restorationSeconds - h.restoreRemaining}" aria-label="Restoration progress"></progress></article>`;
    if (h.status !== "ready") return `<article class="estate-ground-card"><p class="eyebrow">Your next step</p><h3>Restore the reception</h3><p>Repair the foyer, prepare the maze and make a place for Axel’s ticket desk.</p><button class="button gold wide" data-hollow-action="restore" ${editable(s) && s.coins >= HOLLOW_PROPERTY.restorationCost ? "" : "disabled"}>Restore · ${money(HOLLOW_PROPERTY.restorationCost)}</button></article>`;
    const range = H.ticketPriceRange(s), min = range.min ?? c.minTicket, max = range.max ?? c.maxTicket;
    return `<div class="estate-summary"><span><b>${o.foyer}/${c.capacity}</b> in reception</span><span><b>${o.maze}/${c.mazeCapacity}</b> in the maze</span><span><b>${h.ticketsSold}</b> tickets sold</span></div>
      <div class="setting"><span>Admission<small>Closing stops new visits; admitted visitors finish safely.</small></span><button class="button" data-hollow-action="open" aria-pressed="${h.open}" ${editable(s) ? "" : "disabled"}>${h.open ? "Open" : "Closed"}</button></div>
      <div class="special-prices"><label>Ticket price<select data-hollow-price aria-label="Hollow House ticket price" ${editable(s) ? "" : "disabled"}>${Array.from({ length: max - min + 1 }, (_, i) => min + i).map(price => `<option value="${price}" ${price === h.ticketPrice ? "selected" : ""}>${money(price)}</option>`).join("")}</select></label></div>
      <p class="small">Guests consider bravery, value and their remaining money. A higher ticket price can mean fewer sales.</p>
      ${scareSummary(s)}
      <div class="maze-visit-actions"><button class="button gold" data-hollow-action="experience">Experience</button><button class="button" data-hollow-action="enter">Enter foyer</button><button class="button" data-hollow-action="decorate">Decorate</button></div>
      <p class="small">Axel takes ${c.serviceSeconds}s per ticket. Your attraction keeps running while you explore elsewhere.</p>`;
  }
  function haunts(s) {
    if (!H.hollowReady(s)) return manage(s);
    const h = s.hollowHouse, owned = new Set(h.haunts?.owned ?? []), active = new Set(h.haunts?.active ?? []);
    return scareSummary(s) + `<div class="maze-prefab-list">` + MAZE_PREFABS.map((p, index) => {
      const bought = owned.has(p.id), on = bought && active.has(p.id), locked = h.tier < p.tier;
      const button = bought
        ? `<button class="button maze-prefab-toggle" data-maze-toggle="${p.id}" aria-pressed="${on}" ${editable(s) ? "" : "disabled"}>${on ? "Enabled" : "Enable"}</button>`
        : `<button class="button ${locked ? "" : "gold"}" data-maze-buy="${p.id}" ${!locked && editable(s) && s.coins >= p.cost ? "" : "disabled"}>${locked ? `Foyer level ${p.tier}` : `Buy & enable · ${money(p.cost)}`}</button>`;
      return `<article class="maze-prefab-card${on ? " is-active" : ""}${locked ? " is-locked" : ""}">${prefabArt(index)}<div class="maze-prefab-copy"><h3>${p.name}</h3><p>${p.text}</p><span class="maze-prefab-meta">+${p.scare} scare · ${bought ? on ? "In your maze" : "Owned · switched off" : `Foyer level ${p.tier}`}</span></div><div class="maze-prefab-actions">${button}</div></article>`;
    }).join("") + `</div><p class="small">Pay once, then switch each installation on or off at any time. Room upgrades and decorative furniture are separate.</p>`;
  }
  function upgrades(s) {
    const h = s.hollowHouse, c = config(s), next = FOYER_TIERS[h.tier];
    if (!H.hollowReady(s)) return manage(s);
    return `<article class="estate-ground-card"><div class="maze-upgrade-heading">${prefabArt(5)}<div><p class="eyebrow">Foyer level ${h.tier} of 5</p><h3>${c.name}</h3></div></div><p>${c.w} × ${c.d} room · ${c.decorCapacity} decoration spaces · ${c.capacity} waiting visitors</p>${next ? `<h4>Next: ${next.name}</h4><p>${next.w} × ${next.d} room, ${next.capacity} in reception, ${next.mazeCapacity} in the maze and ${next.serviceSeconds}s ticket service.</p><p class="small">Also unlocks ${MAZE_PREFABS.find(p => p.tier === next.level)?.name ?? "new haunt installations"}.</p><button class="button gold wide" data-hollow-action="upgrade" ${editable(s) && M.patchLevel(s).level >= next.patchLevel && s.coins >= next.cost ? "" : "disabled"}>${M.patchLevel(s).level < next.patchLevel ? `Unlocks at patch level ${next.patchLevel}` : `Upgrade foyer · ${money(next.cost)}`}</button>` : `<p class="estate-complete">A perfectly luxurious haunted reception.</p>`}</article><p class="small">Room upgrades preserve owned decorations and finishes. Keep ticket queues, the stairway and doors clear.</p>`;
  }
  function stats(s) {
    const h = s.hollowHouse;
    return `<div class="stats"><div><b>${money(h.income)}</b><span>ticket takings</span></div><div><b>${h.ticketsSold}</b><span>tickets sold</span></div><div><b>${h.completed}</b><span>maze visits completed</span></div><div><b>${h.runHome ?? 0}</b><span>ran home frightened</span></div><div><b>${h.repeatVisits ?? 0}</b><span>return visits</span></div><div><b>${h.missed}</b><span>visits declined</span></div><div><b>${money(h.invested)}</b><span>property and upgrades</span></div></div>
      <h3 class="section">Recent admissions</h3>${h.receipts.length ? h.receipts.slice(0, 8).map(r => `<p class="guest">Visitor ${Number(r.visitor ?? r.guest ?? 0) + 1} · ${money(r.amount ?? r.price ?? 0)} ticket</p>`).join("") : `<p class="small">Axel’s first ticket will appear here.</p>`}<p class="small">Ticket sales are recorded separately from pumpkins, cocoa and tips. Each visit is charged once; a return visit needs a new ticket.</p>`;
  }
  function catalogue(s) {
    const f = s.hollowHouse.foyer, c = config(s);
    const rows = decorTab === "placed" ? f.placed : FOYER_DECOR.filter(d => (decorTab !== "storage" || f.ownedDecor[d.id] > 0) && (category === "all" || category === d.category));
    return `<div class="estate-summary"><span><b>${f.placed.length}/${c.decorCapacity}</b> in reception</span><span><b>${Object.values(f.ownedDecor).reduce((a, b) => a + b, 0)}</b> in storage</span></div>
      ${decorTab === "placed" ? "" : `<div class="chips" role="group" aria-label="Foyer item categories">${GROUPS.map(([id, name]) => `<button class="chip" data-foyer-category="${id}" aria-pressed="${category === id}">${name}</button>`).join("")}</div>`}
      ${rows.length ? rows.map(row => {
        const d = FOYER_DECOR_BY_ID[row.id], stored = f.ownedDecor[d.id] ?? 0, locked = s.hollowHouse.tier < d.tier;
        const thumbnail = ui.scene.foyerDecorThumb?.(d.id), visual = thumbnail ? `<span class="estate-art"><img src="${thumbnail}" alt=""></span>` : art(d.id);
        const button = decorTab === "placed" ? `<button class="button" data-foyer-select="${row.instance}" ${editable(s) ? "" : "disabled"}>Move</button>` : decorTab === "storage" ? `<button class="button gold" data-foyer-place="${d.id}" ${editable(s) ? "" : "disabled"}>Place</button>` : locked ? `<button class="button" disabled>Level ${d.tier}</button>` : `<button class="button ${stored ? "" : "gold"}" data-foyer-buy="${d.id}" ${editable(s) && s.coins >= d.cost ? "" : "disabled"}>${money(d.cost)}</button>${stored ? `<button class="button" data-foyer-place="${d.id}" ${editable(s) ? "" : "disabled"}>Place · ${stored}</button>` : ""}`;
        return `<article class="estate-card">${visual}<div><h3>${d.name}</h3><p>${d.layer === "wall" ? "Wall decoration" : d.layer === "ceiling" ? "Ceiling decoration" : d.layer === "air" ? "Animated effect" : `${d.w} × ${d.d} footprint`} · ${stored} stored</p></div><div class="estate-card-actions">${button}</div></article>`;
      }).join("") : `<p class="estate-empty">${decorTab === "storage" ? "All your decorations are in reception. Store a piece to reuse it here." : "A little space for something wonderfully spooky."}</p>`}`;
  }
  function surfaces(s) {
    const h = s.hollowHouse, f = h.foyer;
    return `<div class="chips" role="group" aria-label="Foyer surfaces and fixtures">${SURFACES.map(([id, name]) => `<button class="chip" data-foyer-surface="${id}" aria-pressed="${surface === id}">${name}</button>`).join("")}</div>` + FOYER_FINISHES.filter(d => d.category === surface).map(d => {
      const owned = f.ownedFinishes.includes(d.id), equipped = f.finishes[d.category] === d.id, locked = h.tier < d.tier;
      return `<article class="estate-card"><span class="estate-finish-swatch" aria-hidden="true" style="--finish-main:${hex(d.palette[0])};--finish-light:${hex(d.palette[1])};--finish-dark:${hex(d.palette[2])}"></span><div><h3>${d.name}</h3><p>${equipped ? "In your foyer" : locked ? `Opens at foyer level ${d.tier}` : owned ? "Yours to use again" : surface === "reception" ? "A finish for Axel’s working ticket desk" : "A new reception atmosphere"}</p></div>${equipped ? `<button class="button" disabled>In use</button>` : locked ? `<button class="button" disabled>Level ${d.tier}</button>` : `<button class="button ${owned ? "" : "gold"}" data-foyer-${owned ? "finish" : "buyfinish"}="${d.id}" ${editable(s) && (owned || s.coins >= d.cost) ? "" : "disabled"}>${owned ? "Use" : money(d.cost)}</button>`}</article>`;
    }).join("");
  }
  const enterForDecor = () => { if (ui.scene.place?.kind !== "foyer") ui.enterFoyer(); ui.closeSheet(); };
  return {
    attractions: { eyebrow: "A little more fright", title: "Attractions", body() { const s = ui.state; return `<article class="estate-card">${prefabArt(5)}<div><h3>The Hollow House</h3><p>${status(s)}</p><small>${s.hollowHouse.purchased ? `Foyer level ${s.hollowHouse.tier} · Scare Maze` : `Purchase opens at patch level ${HOLLOW_PROPERTY.level}`}</small></div><button class="button gold" data-attraction="hollow">Manage</button></article><article class="estate-card"><span class="estate-art" aria-hidden="true">${premiumIcon("attractions")}</span><div><h3>The Hollow Hayride</h3><p>${s.hayride.purchased ? `${s.hayride.open ? "Open" : "Closed"} · ${M.hayrideConfig(s).seats}-seat wagon` : "A trail into the haunted woods"}</p><small>${s.hayride.purchased ? "Tickets on boarding · scare appeal" : `Purchase opens at patch level ${M.HAYRIDE_PROPERTY.level}`}</small></div><button class="button gold" data-attraction="hayride">Manage</button></article>`; }, bind(body) { body.querySelector('[data-attraction="hollow"]').onclick = () => openManage(ui); body.querySelector('[data-attraction="hayride"]').onclick = () => ui.openHayrideSheet(); } },
    hollow: { eyebrow: "Axel’s haunted reception", title: "The Hollow House", setTab(value) { tab = ["manage", "haunts", "upgrades", "stats"].includes(value) ? value : "manage"; }, body() { return segmented("hollow-tab", "Attraction management", [["manage", "Manage"], ["haunts", "Haunts"], ["upgrades", "Upgrade"], ["stats", "Stats"]], tab) + ({ manage, haunts, upgrades, stats })[tab](ui.state); }, bind(body) {
      body.querySelectorAll("[data-hollow-tab]").forEach(b => b.onclick = () => { tab = b.dataset.hollowTab; ui.draw(); });
      body.querySelectorAll("[data-maze-buy]").forEach(b => b.onclick = () => { if (H.buyMazePrefab(ui.state, b.dataset.mazeBuy)) changed(); });
      body.querySelectorAll("[data-maze-toggle]").forEach(b => b.onclick = () => { const id = b.dataset.mazeToggle, on = !(ui.state.hollowHouse.haunts?.active ?? []).includes(id); if (H.setMazePrefabActive(ui.state, id, on)) changed(); });
      body.querySelector("[data-hollow-price]")?.addEventListener("change", e => { if (H.setHollowTicketPrice(ui.state, Number(e.target.value))) changed(); else e.target.value = String(ui.state.hollowHouse.ticketPrice); });
      body.querySelectorAll("[data-hollow-action]").forEach(b => b.onclick = () => {
        const action = b.dataset.hollowAction;
        if (action === "experience") { ui.openMazeRide?.(); return; }
        if (action === "enter") { ui.enterFoyer(); ui.closeSheet(); return; }
        if (action === "decorate") { ui.enterFoyer(); ui.openFoyerSheet?.("catalogue"); return; }
        const s = ui.state, h = s.hollowHouse;
        const ok = action === "purchase" ? H.buyHollowProperty(s) : action === "restore" ? H.beginHollowRestoration(s) : action === "open" ? H.setHollowOpen(s, !h.open) : action === "upgrade" ? H.upgradeHollowFoyer(s) : false;
        if (ok) { changed(); if (action === "purchase") ui.notice("The old house is yours. Restoration comes next."); else if (action === "restore") ui.notice("The restoration team has arrived."); else if (action === "upgrade") ui.notice(h.lastEvent?.stored ? `Foyer expanded. ${h.lastEvent.stored} decoration${h.lastEvent.stored === 1 ? "" : "s"} returned to storage to clear the new lanes.` : "A little more room for brave souls."); }
      });
    } },
    foyer: { eyebrow: "Reception decoration", title: "Make an entrance", setTab(value) { decorTab = ["catalogue", "storage", "placed", "surfaces"].includes(value) ? value : "catalogue"; }, body() { if (!H.hollowReady(ui.state)) return `<p>Restore The Hollow House to decorate its reception.</p>`; return segmented("foyer-tab", "Foyer decoration", [["catalogue", "Items"], ["storage", "Storage"], ["placed", "In room"], ["surfaces", "Surfaces"]], decorTab) + (decorTab === "surfaces" ? surfaces(ui.state) : catalogue(ui.state)); }, bind(body) {
      body.querySelectorAll("[data-foyer-tab]").forEach(b => b.onclick = () => { decorTab = b.dataset.foyerTab; ui.draw(); });
      body.querySelectorAll("[data-foyer-category]").forEach(b => b.onclick = () => { category = b.dataset.foyerCategory; ui.draw(); });
      body.querySelectorAll("[data-foyer-surface]").forEach(b => b.onclick = () => { surface = b.dataset.foyerSurface; ui.draw(); });
      body.querySelectorAll("[data-foyer-buy]").forEach(b => b.onclick = () => { if (H.buyFoyerDecor(ui.state, b.dataset.foyerBuy)) { changed(); ui.notice("In reception storage. Choose Place when you’re ready."); } });
      body.querySelectorAll("[data-foyer-place]").forEach(b => b.onclick = () => { enterForDecor(); ui.foyerTools.selectForPlacement(b.dataset.foyerPlace); });
      body.querySelectorAll("[data-foyer-select]").forEach(b => b.onclick = () => { enterForDecor(); ui.foyerTools.select(b.dataset.foyerSelect); });
      body.querySelectorAll("[data-foyer-finish]").forEach(b => b.onclick = () => { if (H.equipFoyerFinish(ui.state, b.dataset.foyerFinish)) changed(); });
      body.querySelectorAll("[data-foyer-buyfinish]").forEach(b => b.onclick = () => { const id = b.dataset.foyerBuyfinish; if (H.buyFoyerFinish(ui.state, id)) { H.equipFoyerFinish(ui.state, id); changed(); } });
    } },
  };
}

// A building selection is a small invitation, with deeper management on demand.
export function createHollowContext(ui) {
  const host = document.createElement("aside"); host.className = "building-context hollow-context"; host.hidden = true; host.setAttribute("aria-label", "The Hollow House"); document.body.append(host);
  let selected = false, lastHTML = "";
  const view = { open() { selected = true; lastHTML = ""; view.tick(false); }, close() { selected = false; host.hidden = true; }, tick(blocked = false) {
    host.hidden = !selected || blocked || !!ui.scene.place; if (host.hidden) return;
    const s = ui.state, h = s.hollowHouse, c = config(s), o = occupancy(s), ready = H.hollowReady(s);
    const html = `<header><div><h3>The Hollow House</h3><p>${h.purchased ? `Level ${h.tier} · ` : ""}${status(s)}</p></div><button class="icon-button" data-hollow-context="close" aria-label="Close attraction details">×</button></header>${ready ? `<p class="building-context-summary">${o.maze}/${c.mazeCapacity} in maze · ${o.foyer}/${c.capacity} waiting · ${money(h.ticketPrice)} ticket</p>` : `<p class="building-context-summary">${h.status === "restoring" ? `${Math.max(0, Math.ceil(h.restoreRemaining))}s until restoration completes` : !h.purchased ? gateText(s) : "Restore the house before admitting visitors."}</p>`}<div class="building-context-actions"><button class="button gold" data-hollow-context="experience" ${ready ? "" : "disabled"}>Experience</button><button class="button" data-hollow-context="enter" ${ready ? "" : "disabled"}>Enter</button><button class="button" data-hollow-context="manage">Manage</button><button class="button" data-hollow-context="upgrade" ${ready ? "" : "disabled"}>Upgrade</button></div>`;
    if (html !== lastHTML) { host.innerHTML = html; lastHTML = html; }
  } };
  host.addEventListener("click", e => {
    const action = e.target.closest("[data-hollow-context]")?.dataset.hollowContext; if (!action) return;
    if (action === "close") { view.close(); return; }
    view.close();
    if (action === "experience") ui.openMazeRide?.(); else if (action === "enter") ui.enterFoyer(); else openManage(ui, action === "upgrade" ? "upgrades" : "manage");
  });
  return view;
}
