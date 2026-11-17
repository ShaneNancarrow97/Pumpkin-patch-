import * as M from "../model.js";
import * as E from "../rules/house-estate.js";
import { ESTATE_DECOR, ESTATE_DECOR_BY_ID, ESTATE_EXPANSIONS, ESTATE_FINISHES, ESTATE_FINISH_BY_ID, ESTATE_HOUSE_SKINS } from "../content/house-estate.js";
import { money, segmented } from "./kit.js";
import { gardenSpriteIcon as gardenIcon } from "./garden-icons.js";
import { fishingArt } from "./fishing-art.js";
// The lake is newer than the garden's picture grid: a photograph of its model.
const lakeArt = () => { const url = fishingArt.lake(); return url ? `<span class="estate-art"><img src="${url}" alt="" style="width:100%;height:100%;object-fit:contain"></span>` : ""; };

const HOUSE_NAMES = ["Little cottage", "Crooked cottage", "Midnight manor", "Haunted haven"];
const FINISH_GROUPS = [["walls", "Walls"], ["roof", "Roof"], ["trim", "Window trim"], ["door", "Front door"], ["fence", "Garden fence"]];
const hex = n => "#" + n.toString(16).padStart(6, "0");

// Compact colour studies show the bundle's real palette and its theme emblem.
function houseSkinIcon(skin) {
  const finish = part => ESTATE_FINISH_BY_ID[skin.finishes[part]];
  const style = ["walls", "roof", "trim", "door"].map(part => `--skin-${part}:${hex(finish(part).color)}`).join(";") + `;--skin-accent:${hex(skin.accent)};--skin-window:${hex(skin.windowGlow)}`;
  const tall = skin.houseLevel > 0, y = tall ? 34 : 49, peak = tall ? 12 : 27;
  let emblem;
  if (["harvest-haunt", "pumpkin-palace"].includes(skin.id)) emblem = '<ellipse cx="20" cy="88" rx="10" ry="8"/><path d="m17 86 2-2 2 2m2 0 2-2 2 2m-10 4 5 2 5-2M20 80l2-5" class="skin-ink"/>';
  else if (skin.id === "moonlit-cottage") emblem = '<path d="M12 88V76a8 8 0 0 1 16 0v12l-4-2-4 3-4-3z"/><path d="M17 77h1m5 0h1" class="skin-ink"/>';
  else if (skin.id === "witchwood") emblem = '<path d="M10 84c0-12 20-12 20 0zm10 0v9m-2-68 7-13 8 12z"/><path d="M17 79h1m6 1h1" class="skin-ink"/>';
  else if (skin.id === "candy-coven") emblem = '<path d="M17 92V75c0-7 9-7 9-1" fill="none" stroke="var(--skin-accent)" stroke-width="6"/><path d="m14 81 6-3m-6 11 6-3" class="skin-ink"/><circle cx="93" cy="78" r="7"/><path d="M93 85v9" class="skin-ink"/>';
  else if (skin.id === "vampire-manor") emblem = '<path d="m39 20-10-7 2 11 7 5 6-3 5 6 5-6 7 3 7-5 2-11-11 7-10-7z"/>';
  else if (skin.id === "storm-laboratory") emblem = '<path d="m90 11-10 19h8l-5 16 17-23h-9l7-12z"/>';
  else emblem = '<path d="M12 78a8 8 0 0 1 16 0v8h-3v6H15v-6h-3z"/><path d="M16 79h2m4 0h2m-6 8v4m4-4v4" class="skin-ink"/>';
  return `<span class="estate-skin-preview" style="${style}" aria-hidden="true"><svg viewBox="0 0 112 104"><ellipse cx="56" cy="96" rx="50" ry="6" fill="#0d0b1499"/><path d="M23 ${y}h62v47H23z" fill="var(--skin-walls)"/><path d="m85 ${y} 14 7v47l-14-7z" fill="var(--skin-door)"/><path d="M19 ${y} 54 ${peak} 90 ${y}z" fill="var(--skin-roof)" stroke="var(--skin-trim)" stroke-width="3"/><path d="m90 ${y} 12 7-13 1" fill="var(--skin-roof)"/>${tall ? '<path d="M24 76h60v17H24z" fill="var(--skin-walls)"/><path d="M24 68h60" stroke="var(--skin-trim)" stroke-width="3"/>' : ""}<path d="M48 73h15v21H48z" fill="var(--skin-door)" stroke="var(--skin-trim)" stroke-width="2"/><path d="M30 54h12v12H30zm39 0h11v12H69z" fill="var(--skin-window)" stroke="var(--skin-trim)" stroke-width="2"/>${tall ? '<path d="M30 38h12v12H30zm39 0h11v12H69z" fill="var(--skin-window)" stroke="var(--skin-trim)" stroke-width="2"/>' : ""}${skin.houseLevel === 3 ? '<path d="M87 37V18h12v25m-14-25 8-11 8 11z" fill="var(--skin-roof)" stroke="var(--skin-trim)" stroke-width="2"/>' : ""}<g fill="var(--skin-accent)" stroke="var(--skin-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${emblem}</g><path d="M49 95h14" stroke="var(--skin-trim)" stroke-width="3"/></svg></span>`;
}

// Garden purchases, exterior finishes and the growing grounds share one sheet.
export function estateSheet(ui) {
  let tab = "garden", gardenView = "catalogue", finishGroup = "walls", exteriorView = "skins", skinLevel = "all", ownedSkinsOnly = false;
  const change = () => { ui.save(); ui.scene.refreshHouseEstate(); ui.tone(680); ui.draw(); };
  const visit = () => { if (ui.scene.place?.kind !== "estate") ui.enterEstate(); ui.closeSheet(); };
  const editable = s => !s.paused;
  function garden(s) {
    const b = E.estateBounds(s), stored = Object.values(s.estate.ownedDecor).reduce((n, q) => n + q, 0);
    const items = gardenView === "placed" ? s.estate.placed : ESTATE_DECOR.filter(d => gardenView !== "stored" || s.estate.ownedDecor[d.id] > 0);
    const intro = `<div class="estate-summary"><span><b>${s.estate.placed.length}/${b.capacity}</b> in the garden</span><span><b>${stored}</b> in storage</span><span><b>${E.estateScore(s)}</b> garden charm</span></div>
      ${segmented("estate-inventory", "Garden pieces", [["catalogue", "Catalogue"], ["stored", "Storage"], ["placed", "In garden"]], gardenView)}`;
    if (!items.length) return intro + `<p class="estate-empty">${gardenView === "stored" ? "All your pieces are outside. Store one from its controls to bring it back here." : "A little space for something wonderfully spooky. Choose a piece from the catalogue."}</p>`;
    return intro + items.map(item => {
      const d = ESTATE_DECOR_BY_ID[item.id], amount = s.estate.ownedDecor[d.id] ?? 0, placed = s.estate.placed.filter(p => p.id === d.id).length, locked = s.house.level < d.houseLevel;
      const buttons = gardenView === "placed" ? `<button class="button" data-estate-select="${item.instance}" data-pad-default ${editable(s) ? "" : "disabled"}>Move</button>`
        : gardenView === "stored" ? `<button class="button gold" data-estate-place="${d.id}" data-pad-default ${editable(s) ? "" : "disabled"}>Place</button>`
        : `${locked ? `<button class="button" disabled>Locked</button>` : `<button class="button ${amount ? "" : "gold"}" data-estate-buy="${d.id}" data-pad-default ${editable(s) && s.coins >= d.cost ? "" : "disabled"}>${money(d.cost)}</button>`}${amount ? `<button class="button" data-estate-place="${d.id}" ${editable(s) ? "" : "disabled"}>Place · ${amount}</button>` : ""}`;
      return `<article class="estate-card">${gardenIcon(d.id, ui.scene.estateDecorThumb?.(d.id)) || (d.lake ? lakeArt() : "")}<div><h3>${d.name}</h3><p>${gardenView === "placed" ? "Tap Move to position it in the garden." : d.text}</p><small>${locked ? `Opens with the ${HOUSE_NAMES[d.houseLevel]}` : `${d.crop ? `Grows ${d.crop.amount} ${d.crop.name} in ${Math.round(d.crop.seconds / 60 * 10) / 10} min · ` : d.carving ? "Opens pumpkin carving · " : ""}${d.w} × ${d.d} footprint · ${amount} stored${placed ? ` · ${placed} outside` : ""}`}</small></div><div class="estate-card-actions">${buttons}</div></article>`;
    }).join("") + `<p class="small">Store and reuse garden pieces freely. Keep the front path and the space around the house clear.</p>`;
  }
  function finishes(s) {
    return `<p>Choose a finish for each part of the house. Bought finishes are yours to use again.</p><div class="chips estate-finish-tabs" role="group" aria-label="Exterior parts">${FINISH_GROUPS.map(([id, label]) => `<button class="chip" data-estate-part="${id}" aria-pressed="${finishGroup === id}">${label}</button>`).join("")}</div>`
      + ESTATE_FINISHES.filter(f => f.category === finishGroup && !f.skinOnly).map(f => {
        const owned = s.estate.ownedFinishes.includes(f.id), equipped = s.estate.finishes[f.category] === f.id, locked = s.house.level < f.houseLevel;
        return `<article class="estate-card estate-finish-card"><span class="estate-finish-swatch" aria-hidden="true" style="--finish-main:${hex(f.palette[0])};--finish-light:${hex(f.palette[1])};--finish-dark:${hex(f.palette[2])}"></span><div><h3>${f.name}</h3><p>${equipped ? "On your house" : locked ? `Opens with the ${HOUSE_NAMES[f.houseLevel]}` : owned ? "Yours to use any time" : `A new look for the ${FINISH_GROUPS.find(([id]) => id === f.category)[1].toLowerCase()}`}</p></div>${equipped ? `<button class="button" disabled>In use</button>` : locked ? `<button class="button" disabled>Locked</button>` : `<button class="button ${owned ? "" : "gold"}" data-estate-${owned ? "finish" : "buyfinish"}="${f.id}" ${editable(s) && (owned || s.coins >= f.cost) ? "" : "disabled"}>${owned ? "Use" : money(f.cost)}</button>`}</article>`;
      }).join("") + `<button class="button wide" data-estate-visit>See the house</button>`;
  }
  function skins(s) {
    const active = E.activeEstateSkin(s), ownedCount = ESTATE_HOUSE_SKINS.filter(skin => E.ownsEstateSkin(s, skin.id)).length;
    const classic = ["walls", "roof", "trim", "door"].every(part => s.estate.finishes[part] === E.ESTATE_DEFAULT_FINISHES[part]);
    const filters = [["all", "All"], ...["Little", "Crooked", "Manor", "Haven"].map((name, i) => [String(i), name])];
    const cards = ESTATE_HOUSE_SKINS.filter(skin => (skinLevel === "all" || skin.houseLevel === Number(skinLevel)) && (!ownedSkinsOnly || E.ownsEstateSkin(s, skin.id))).map(skin => {
      const owned = E.ownsEstateSkin(s, skin.id), applied = active?.id === skin.id, locked = s.house.level < skin.houseLevel;
      const status = applied ? "On your house" : locked ? `Needs the ${HOUSE_NAMES[skin.houseLevel]}` : owned ? "Yours · use any time" : "Walls, roof, trim and door";
      const action = applied ? `<button class="button" disabled>Applied</button>` : locked ? `<button class="button" disabled>Locked</button>` : owned ? `<button class="button" data-estate-skin="${skin.id}" ${editable(s) ? "" : "disabled"}>Use skin</button>` : `<button class="button gold" data-estate-buyskin="${skin.id}" ${editable(s) && s.coins >= skin.cost ? "" : "disabled"}>Buy & apply · ${money(skin.cost)}</button>`;
      return `<article class="estate-card estate-skin-card${applied ? " skin-applied" : ""}">${houseSkinIcon(skin)}<div class="estate-skin-copy"><small class="estate-skin-tier">${HOUSE_NAMES[skin.houseLevel]}</small><h3>${skin.name}</h3><p>${skin.text}</p></div><footer><small>${status}</small>${action}</footer></article>`;
    }).join("");
    const empty = `<div class="estate-skin-empty"><p>${ownedCount ? "No owned skins match this house level." : "You haven’t collected a house skin yet."} Show all skins to browse the collection.</p><button class="button" data-estate-showall>Show all skins</button></div>`;
    return `<p class="estate-skin-intro">Two skins unlock with each house upgrade. Buy once and reuse as your home grows.</p><div class="estate-skin-current"><span>Current look<b>${active?.name ?? (classic ? "Classic look" : "Mixed finishes")}</b></span><small>${ownedCount}/${ESTATE_HOUSE_SKINS.length} collected</small></div><div class="estate-skin-toolbar"><button class="chip" data-estate-owned aria-pressed="${ownedSkinsOnly}">Owned only</button><button class="button" data-estate-classic aria-label="Use the free classic house look" ${classic || !editable(s) ? "disabled" : ""}>${classic ? "Classic applied" : "Classic look · Free"}</button></div><div class="estate-skin-levels" role="group" aria-label="Skins by house upgrade">${filters.map(([id,name]) => `<button class="chip" data-estate-skinlevel="${id}" aria-label="${id === "all" ? "Skins for all houses" : "Skins unlocked with the " + HOUSE_NAMES[Number(id)]}" aria-pressed="${skinLevel === id}">${name}</button>`).join("")}</div>${cards || empty}`;
  }
  function exterior(s) {
    return segmented("estate-exterior", "Exterior customisation", [["skins", "House skins"], ["finishes", "Mix finishes"]], exteriorView)
      + (exteriorView === "skins" ? skins(s) : finishes(s));
  }
  function grounds(s) {
    const current = E.estateBounds(s), next = ESTATE_EXPANSIONS[s.estate.expansion + 1], house = M.nextLevel(s);
    const rooms = M.houseRooms.filter(r => M.roomUnlocked(s, r.id)).map(r => r.name.toLowerCase()).join(", ");
    return `<article class="estate-ground-card"><p class="eyebrow">Your own little corner</p><h3>${current.name}</h3><p>${current.width} × ${current.depth} grounds · space for ${current.capacity} garden pieces</p><div class="estate-ground-map" aria-hidden="true"><i></i><b></b><span></span></div>${next ? `<p>${next.width} × ${next.depth} grounds and room for ${next.capacity} pieces.</p><button class="button gold wide" data-estate-expand ${E.canExpandEstate(s) ? "" : "disabled"}>${s.house.level < next.houseLevel ? `Needs the ${HOUSE_NAMES[next.houseLevel]}` : `Expand the garden · ${money(next.cost)}`}</button>` : `<p class="estate-complete">Your haunted grounds are fully expanded.</p>`}</article>
      <article class="estate-ground-card"><p class="eyebrow">House ${s.house.level + 1} of 4</p><h3>${HOUSE_NAMES[s.house.level]}</h3><p>${rooms}. The house on your plot grows with the rooms inside.</p>${house ? `<h4>Next: ${house.name}</h4><p>${house.rooms.filter(r => r.opens).map(r => `A new ${r.name.toLowerCase()}`).join(" · ") || "Larger rooms and more space for your collection"}.</p><button class="button wide" data-estate-house ${editable(s) && s.coins >= house.cost ? "" : "disabled"}>Upgrade house · ${money(house.cost)}</button>` : `<p class="estate-complete">Your forever home is complete.</p>`}<button class="button wide" data-estate-inside>Enter the house</button></article><p class="small">Garden charm is a collection score. It does not add free income or change visitor budgets.</p>`;
  }
  return { estate: {
    eyebrow: "Shane & Natalie’s home", title: () => tab === "garden" ? "The haunted garden" : tab === "exterior" ? "Make it yours" : "House & grounds",
    setTab(value) { tab = ["garden", "exterior", "grounds"].includes(value) ? value : "garden"; },
    body() { return segmented("estate-tab", "House estate", [["garden", "Garden"], ["exterior", "Exterior"], ["grounds", "Grounds"]], tab) + ({ garden, exterior, grounds })[tab](ui.state); },
    bind(body) {
      body.querySelectorAll("[data-estate-tab]").forEach(b => b.onclick = () => { tab = b.dataset.estateTab; ui.draw(); });
      body.querySelectorAll("[data-estate-inventory]").forEach(b => b.onclick = () => { gardenView = b.dataset.estateInventory; ui.draw(); });
      body.querySelectorAll("[data-estate-exterior]").forEach(b => b.onclick = () => { exteriorView = b.dataset.estateExterior; ui.draw(); });
      body.querySelectorAll("[data-estate-skinlevel]").forEach(b => b.onclick = () => { skinLevel = b.dataset.estateSkinlevel; ui.draw(); });
      body.querySelector("[data-estate-owned]")?.addEventListener("click", () => { ownedSkinsOnly = !ownedSkinsOnly; ui.draw(); });
      body.querySelector("[data-estate-showall]")?.addEventListener("click", () => { ownedSkinsOnly = false; skinLevel = "all"; ui.draw(); });
      body.querySelector("[data-estate-classic]")?.addEventListener("click", () => { if (E.equipClassicEstateLook(ui.state)) change(); });
      body.querySelectorAll("[data-estate-buyskin]").forEach(b => b.onclick = () => {
        const id = b.dataset.estateBuyskin;
        if (E.buyEstateSkin(ui.state, id)) { E.equipEstateSkin(ui.state, id); change(); ui.notice("A new haunting for your home. Use skins again for free."); }
      });
      body.querySelectorAll("[data-estate-skin]").forEach(b => b.onclick = () => { if (E.equipEstateSkin(ui.state, b.dataset.estateSkin)) change(); });
      body.querySelectorAll("[data-estate-part]").forEach(b => b.onclick = () => { finishGroup = b.dataset.estatePart; ui.draw(); });
      // On a pad a bought piece goes straight into hand in the garden, as the house's catalogue does.
      body.querySelectorAll("[data-estate-buy]").forEach(b => b.onclick = () => { const id = b.dataset.estateBuy; if (!E.buyEstateDecor(ui.state, id)) return; change(); if (document.body.classList.contains("pad-menus")) { visit(); ui.estateTools.selectForPlacement(id); } else ui.notice("In garden storage. Choose Place when you’re ready."); });
      body.querySelectorAll("[data-estate-place]").forEach(b => b.onclick = () => { visit(); ui.estateTools.selectForPlacement(b.dataset.estatePlace); });
      body.querySelectorAll("[data-estate-select]").forEach(b => b.onclick = () => { visit(); ui.estateTools.select(b.dataset.estateSelect); });
      body.querySelectorAll("[data-estate-finish]").forEach(b => b.onclick = () => { if (E.equipEstateFinish(ui.state, b.dataset.estateFinish)) change(); });
      body.querySelectorAll("[data-estate-buyfinish]").forEach(b => b.onclick = () => { const id = b.dataset.estateBuyfinish; if (E.buyEstateFinish(ui.state, id)) { E.equipEstateFinish(ui.state, id); change(); } });
      body.querySelector("[data-estate-expand]")?.addEventListener("click", () => { if (E.expandEstate(ui.state)) { change(); ui.scene.estateCamera?.reset(); ui.notice("More room for a little garden magic."); } });
      body.querySelector("[data-estate-house]")?.addEventListener("click", () => { if (!ui.state.paused) ui.upgradeEstateHouse?.(); });
      body.querySelectorAll("[data-estate-visit]").forEach(b => b.onclick = visit);
      body.querySelector("[data-estate-inside]")?.addEventListener("click", () => { ui.enterRoom(ui.state.house.activeRoom); ui.closeSheet(); });
    },
  } };
}
