import * as M from "../model.js";
import * as E from "../rules/house-estate.js";
import { ESTATE_DECOR, ESTATE_DECOR_BY_ID, ESTATE_EXPANSIONS, ESTATE_FINISHES, ESTATE_FINISH_BY_ID, ESTATE_HOUSE_SKINS } from "../content/house-estate.js";
import { money, segmented } from "./kit.js";

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

// Small catalogue drawings echo the silhouettes of the native voxel props.
function gardenIcon(id, thumbnail) {
  if (thumbnail) return `<span class="estate-art" aria-hidden="true"><img src="${thumbnail}" alt=""></span>`;
  const drawings = {
    "lantern-post": '<path d="M23 43V18m-8 0h16l-3-7H18zm2 0v11h12V18m-9 25h8M20 22h6"/>',
    "rose-bed": '<path d="m6 35 24-7 12 6-24 8zm5-3v-9m10 7V18m11 9V15"/><path d="m7 22 4-4 4 4-4 4zm10-5 4-4 4 4-4 4zm11-3 4-4 4 4-4 4z"/>',
    "pumpkin-pile": '<path d="M24 16c-7-7-18 0-15 10s17 9 21 2m-7-14 2-6m0 9c8-6 17 0 15 10S21 36 20 29m-3-10c-3 4-3 8 0 11m13-10c3 3 4 7 1 11M13 23h1m10 1h1m9 1h1"/>',
    "stone-urn": '<path d="M14 21h20l-3 11H17zm10 11v7m-9 3h18m-5-24V9m-7 10-7-8m13 5 8-6"/><path d="m12 9 3 1 1 4-4-1zm14-3 3 2-1 4-3-2zm8 1 3 1-1 4-3-1z"/>',
    "garden-bench": '<path d="m7 26 25-6 10 6-26 7zm3-11 25-6v11m-25-5v11m7-12v11m10-14v11M10 29v9m28-10v9M17 33v10m15-13v10"/>',
    "bird-bath": '<path d="m8 22 23-6 10 6-23 7zm2 0c3 12 22 11 28 0M24 30v10m-9 3h18m-2-27v-5l5-3 4 3-5 2m0 0 4 6-8-2"/>',
    "gargoyle": '<path d="M16 39h17l-2-9-1-12-6-5-7 5 1 13zm3-22-5-7 8 3m7 3 6-6-1 10m-17 4L8 19l4 14 6-2m12-8 11-4-5 14-5-2M21 21h1m5 0h1m-6 6h5"/>',
    "crooked-tree": '<path d="m24 43-3-17 5-15m-4 19-9-8m12 2 12-7m-15 4-8-9m13 2 9-7m-21 4-8 4 4 7m25-14 7 4-6 8M18 43h13"/>',
    "moon-fountain": '<path d="m6 36 23-6 14 6-23 7zm7-12 16-4 8 5-16 5zm12 3v7M29 7c-11 0-12 15-1 18-5-7-5-11 1-18zM12 35l-1-7m25 6 2-6"/>',
    "coffin-planter": '<path d="m10 30 5-16 19-5 7 7-7 17-16 7zm6-14 4 5 14-4 5-4M19 21l-6 13m21-17-8 19m-4-20-5-9m10 8 3-10m-6 10 11-4"/>',
    "rose-arch": '<path d="M11 41V19c0-17 26-17 26 0v22M16 39V19c0-10 16-10 16 0v20m-21-9 5-5m16 5 5-5M11 19l5 5m16-5 5 5"/><path d="m11 11 3-3 3 3-3 3zm18-5 3-3 3 3-3 3zm6 28 3-3 3 3-3 3z"/>',
    "wishing-well": '<path d="m7 17 18-12 18 12-18 5zm4 0v19m28-19v19m-27-5 15-4 13 5-15 5zm0 0v8l13 5 15-5v-7m-15-10v9m-4-2h8v5h-8"/>',
    "bat-hedge": '<path d="m7 23 3-9 8 6 6-10 6 10 8-6 3 9-7 8-7-3-3 7-3-7-7 3zm17 12v8m-7 0h14"/>',
    "mushroom-patch": '<path d="M7 25c-1-13 19-16 20-3zm9 0v12m9-20c1-12 17-11 18 0zm10 0v12m-11 9c0-7 12-8 13-1zm6 0v8M12 18h1m9 1h1m11-8h1"/>',
    "fire-pit": '<path d="m7 31 23-6 12 7-23 6zm1 0 6 9 18 2 9-10m-24 6-2 7m17-5 2 5M18 27c-8-8 4-10 3-19 12 9 0 10 9 16 0-6 4-8 4-11 10 10 5 16-4 18"/>',
    "ghost-scarecrow": '<path d="M13 33V17a11 11 0 0 1 22 0v16l-5-4-6 6-6-5zm11 0v11m-4-26h1m7 0h1m-7 6h4m10-3 6 5m-2-1v10m-4 0h8v6h-8"/>',
  };
  return `<span class="estate-art" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${drawings[id] ?? drawings["lantern-post"]}</svg></span>`;
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
      const buttons = gardenView === "placed" ? `<button class="button" data-estate-select="${item.instance}" ${editable(s) ? "" : "disabled"}>Move</button>`
        : gardenView === "stored" ? `<button class="button gold" data-estate-place="${d.id}" ${editable(s) ? "" : "disabled"}>Place</button>`
        : `${locked ? `<button class="button" disabled>Locked</button>` : `<button class="button ${amount ? "" : "gold"}" data-estate-buy="${d.id}" ${editable(s) && s.coins >= d.cost ? "" : "disabled"}>${money(d.cost)}</button>`}${amount ? `<button class="button" data-estate-place="${d.id}" ${editable(s) ? "" : "disabled"}>Place · ${amount}</button>` : ""}`;
      return `<article class="estate-card">${gardenIcon(d.id, ui.scene.estateDecorThumb?.(d.id))}<div><h3>${d.name}</h3><p>${gardenView === "placed" ? "Tap Move to position it in the garden." : d.text}</p><small>${locked ? `Opens with the ${HOUSE_NAMES[d.houseLevel]}` : `${d.w} × ${d.d} footprint · ${amount} stored${placed ? ` · ${placed} outside` : ""}`}</small></div><div class="estate-card-actions">${buttons}</div></article>`;
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
      body.querySelectorAll("[data-estate-buy]").forEach(b => b.onclick = () => { if (E.buyEstateDecor(ui.state, b.dataset.estateBuy)) { change(); ui.notice("In garden storage. Choose Place when you’re ready."); } });
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
