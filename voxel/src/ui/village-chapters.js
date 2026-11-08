// Pure presentation for Mothlight's saved chapter. Transactions and navigation
// are handled by village-game, so opening a page cannot spend, award or mutate.
import * as M from "../model.js";
import { MATERIALS, MATERIAL_BY_ID, NODES } from "../content/village.js";
import { FOLK_BY_ID } from "../content/village-folk.js";
import { QUESTS, DUTY_BY_ID } from "../content/village-quests.js";
import { VILLAGE_DECOR_BY_ID } from "../content/village-decor.js";
import { villageItemIcon } from "./village-item-markup.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => "£" + Math.floor(n).toLocaleString("en-GB");
const short = id => FOLK_BY_ID[id]?.short ?? id;
const button = (label, attrs, { disabled = false, primary = false } = {}) => `<button class="vg-ch-action${primary ? " vg-ch-primary" : ""}" ${attrs}${disabled ? " disabled" : ""}>${label}</button>`;
const actions = html => `<div class="vg-ch-actions">${html}</div>`;
const pageButton = (kind, label) => button(label, `data-vg-page="${kind}"`);
const paths = {
  book: '<path d="M12 6C8 3 5 3 2 5v15c3-2 6-2 10 1 4-3 7-3 10-1V5c-3-2-6-2-10 1Zm0 0v15M5 8l4 1m6 0 4-1M5 12l4 1m6 0 4-1"/>',
  leaf: '<path d="M5 19c-6-8 1-15 15-15 0 14-8 20-15 15Zm0 0L16 8m-5 5V8m0 5 5 1M3 22l2-3"/>',
  bag: '<path d="M6 8h12l3 12H3L6 8ZM8 8V6a4 4 0 0 1 8 0v2M8 14h8m-4-3v6"/>',
  lantern: '<path d="M9 6V4a3 3 0 0 1 6 0v2M5 7h14l-2 4v7l2 3H5l2-3v-7L5 7Zm2 4h10M8 18h8m-4-7v7"/>',
  house: '<path d="m2 11 10-8 10 8M5 9v12h14V9m-9 12v-7h4v7M8 9h.1m8 0h.1"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16 6-2 8-8 4 4-8 6-4Zm-6 4 4 4M12 1v2m0 18v2M1 12h2m18 0h2"/>',
  tools: '<path d="m5 3 4 4 3-3-4-3m4 3 5 1 3 3-3 3-3-1L5 21l-3-3L13 8M18 16l4 4-2 2-4-4M5 9l3 3"/>',
};
const seal = kind => {
  const art = villageItemIcon(({ book: "almanac", bag: "satchel", tools: "gathering-kit", letter: "wandering-letter" })[kind]);
  return `<span class="vg-ch-seal${art ? " vg-ch-illustration" : ""}" aria-hidden="true">${art || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${paths[kind] ?? paths.lantern}</svg>`}</span>`;
};
const kicker = text => `<span class="vg-ch-kicker">${esc(text)}</span>`;
const intro = (icon, title, text, meta = "") => `<div class="vg-ch-intro">${seal(icon)}<div>${meta ? kicker(meta) : ""}<h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>`;
const wait = seconds => seconds < 60 ? `${Math.max(1, Math.ceil(seconds))}s` : `${Math.ceil(seconds / 60)} min`;
// Only named materials get a material picture; generic quest criteria retain their labels.
const materialArt = key => { const id = String(key ?? "").replace(/^material:/, ""); return MATERIAL_BY_ID[id] ? villageItemIcon(id) : ""; };
const requirements = rows => rows.length ? `<ul class="vg-ch-requirements" aria-label="Requirements">${rows.map(r => `<li class="${r.complete ? "is-ready" : ""}"><span aria-hidden="true">${r.complete ? "✓" : "○"}</span><span class="vg-ch-requirement-label">${materialArt(r.key)}<span>${esc(r.label)}</span></span><b>${r.key === "coins" ? money(r.have) + " / " + money(r.need) : `${r.have} / ${r.need}`}</b></li>`).join("")}</ul>` : "";
const rewardName = r => {
  if (r.kind === "coins") return money(r.amount);
  if (r.kind === "discount") return `${Math.round(r.amount * 100)}% at Rowan’s stall`;
  const name = r.name ?? (r.kind === "recipe" ? M.RECIPE_BY_ID[r.id]?.name : r.kind === "costume" ? M.costumeById[r.id]?.name : r.kind === "decor" ? M.decorById[r.id]?.name : r.kind === "material" ? MATERIAL_BY_ID[r.id]?.name : VILLAGE_DECOR_BY_ID[r.id]?.name) ?? r.id;
  return `${r.amount > 1 ? `${r.amount} × ` : ""}${name}${r.kind === "recipe" ? " recipe" : ""}`;
};
const rewardChip = (label, art = "") => `<span>${art}<span class="vg-ch-reward-text">${esc(label)}</span></span>`;
const rewardChips = rows => `<div class="vg-ch-rewards">${rows.map(r => rewardChip(rewardName(r), ["material", "village-decor"].includes(r.kind) ? villageItemIcon(r.id) : "")).join("")}</div>`;
function questRewards(q) {
  const r = q.reward ?? {}, gifts = [], gift = (label, icon) => gifts.push(rewardChip(label, icon ? villageItemIcon(icon) : ""));
  if (r.coins) gift(money(r.coins));
  for (const [id, n] of Object.entries(r.villageDecor ?? {})) gift(`${n > 1 ? `${n} × ` : ""}${VILLAGE_DECOR_BY_ID[id]?.name ?? id}`, id);
  for (const [id, xp] of Object.entries(r.friendship ?? {})) gift(`${short(id)} +${xp} friendship`);
  for (const id of r.decor ?? []) gift(M.decorById[id]?.name ?? "A farmhouse piece");
  if (r.effect === "bench") gift("Village bench restored");
  if (r.build) gift(r.build === "rowan-workshop" ? "Rowan’s workshop restored" : "Elowen’s conservatory restored");
  for (const u of r.unlock ?? []) gift(({ gathering: "Gathering tools", stall: "Rowan's stall", almanac: "Village almanac" })[u] ?? u, ({ gathering: "gathering-kit", almanac: "almanac" })[u]);
  return gifts.length ? `<div class="vg-ch-rewards">${gifts.join("")}</div>` : "";
}
function questAction(s, q, step, rows) {
  if (!step) return "";
  if (step.kind === "tour") return button("Take Elowen’s tour", "data-vg-tour", { primary: true });
  if (step.kind === "talk") return button(`Talk to ${esc(short(step.who))}`, `data-vg-meet="${esc(step.who)}"`, { primary: true });
  if (["deliver", "give", "pay"].includes(step.kind)) {
    const ready = M.handOver(s, step.who, q.id)?.ok;
    let html = button(step.kind === "pay" ? `Pay ${money(step.coins)}` : "Hand over", `data-vg-handover="${esc(step.who)}" data-quest="${q.id}"`, { primary: true, disabled: !ready });
    const missing = rows.find(r => !r.complete && MATERIAL_BY_ID[r.key]);
    if (missing) html += button(`Find ${esc(MATERIAL_BY_ID[missing.key].name.toLowerCase())}`, `data-vg-gather="${missing.key}"`);
    else if (!ready && step.kind === "give") html += button("Go to the farm", "data-vg-home");
    return html;
  }
  if (step.kind === "gather") return button(`Find ${esc(MATERIAL_BY_ID[step.material]?.name.toLowerCase() ?? step.material)}`, `data-vg-gather="${step.material}"`, { primary: true });
  if (step.kind === "place") return button("Make the reading nook", `data-vg-decorate data-near="${esc(step.near)}"`, { primary: true });
  if (step.kind === "find") return step.item === "page-3" ? button("Return to the farm", "data-vg-home", { primary: true }) : button("Look on the Green", `data-vg-object="${esc(step.item)}"`, { primary: true });
  if (["cook", "carve", "sell", "harvest", "earn", "fish"].includes(step.kind)) return button("Continue at the farm", "data-vg-home", { primary: true });
  return button(`Find ${esc(short(q.giver))}`, `data-vg-meet="${q.giver}"`);
}
function questCard(s, q, tracked) {
  const step = M.questStep(s, q.id), rows = M.questRequirementRows(s, q.id), hint = M.questStepHint(s, q.id);
  return `<article class="vg-ch-card vg-ch-quest${tracked ? " is-tracked" : ""}" data-quest-card="${q.id}"><div class="vg-ch-card-head"><div>${kicker(`${q.kind === "story" ? "Village story" : short(q.giver) + "’s story"}${tracked ? " · Following" : ""}`)}<h3>${esc(q.title)}</h3></div>${button(tracked ? "Following" : "Follow", `data-vg-track="${q.id}" aria-pressed="${tracked}"`)}</div><p class="vg-ch-task">${esc(step?.text ?? "Return to your neighbour")}</p>${requirements(rows)}${hint ? `<p class="vg-ch-hint">${esc(hint)}</p>` : ""}${actions(questAction(s, q, step, rows))}<details class="vg-ch-reward-fold"><summary>On completion</summary>${questRewards(q)}</details></article>`;
}
function friendshipKeepsakes(s) {
  return `<details class="vg-ch-history"><summary>Friendship keepsakes</summary><p class="vg-ch-hint">Each new friendship level brings a gift for your farm or village. A unique item you already own becomes bonus coins.</p>${["elowen", "rowan"].map(id => {
    const bond = M.friendshipWith(s, id), f = FOLK_BY_ID[id];
    if (!bond?.met) return "";
    const reached = Object.entries(f.rewards).filter(([level]) => s.village.claims[`friend:${id}:${level}`]), next = f.rewards[bond.level + 1];
    return `<article class="vg-ch-receipt">${kicker(`${f.short} · Friendship ${bond.level}`)}${next ? `<h3>Next: friendship ${bond.level + 1}</h3>${rewardChips(next)}` : '<h3>A lifelong friend</h3>'}${reached.length ? `<details class="vg-ch-reward-fold"><summary>Milestones reached · ${reached.length}</summary>${reached.map(([level, gifts]) => `<div class="vg-ch-friend-reward"><small>Friendship ${level}</small>${rewardChips(gifts)}</div>`).join("")}</details>` : ""}</article>`;
  }).join("")}</details>`;
}
function journal(s, trackedQuestId) {
  const active = M.activeQuests(s), tracked = active.some(q => q.id === trackedQuestId) ? trackedQuestId : M.trackedQuest(s)?.id;
  const done = QUESTS.filter(q => s.village.quests[q.id]?.done), offered = [...M.offeredBy(s, "elowen"), ...M.offeredBy(s, "rowan")];
  let html = intro("book", "Small acts. A village restored.", "Follow one story at a time. Your farm, friendships and little acts of care all move Mothlight forward.", `${done.length} stories completed`);
  html += actions(pageButton("almanac", "Almanac") + pageButton("materials", "Satchel") + pageButton("upgrades", "Upgrades"));
  html += active.map(q => questCard(s, q, q.id === tracked)).join("");
  if (!active.length) html += `<p class="vg-ch-empty">${offered.length ? "A neighbour has a new story for you." : "Spend time with Elowen and Rowan. Chats, presents and favours deepen your friendships and open their next chapters."}</p>`;
  if (offered.length) html += `<section class="vg-ch-section"><h3>Someone needs a hand</h3>${offered.map(q => `<button class="vg-ch-link" data-vg-meet="${q.giver}"><span><b>${esc(q.title)}</b><small>${esc(short(q.giver))} has a new quest</small></span><span aria-hidden="true">›</span></button>`).join("")}</section>`;
  if (done.length) html += `<details class="vg-ch-history"><summary>Finished stories · ${done.length}</summary>${done.map(q => `<article class="vg-ch-receipt">${kicker("Completed · rewards received")}<h3>${esc(q.title)}</h3>${questRewards(q)}</article>`).join("")}</details>`;
  html += friendshipKeepsakes(s);
  html += `<details class="vg-help"><summary>Ways to explore</summary><dl><dt>Touch</dt><dd>Left thumb moves; right thumb looks. Tap the gold action to interact.</dd><dt>Controller</dt><dd>Left stick moves, right stick looks. Cross interacts, Circle goes back. D-pad moves through menus.</dd><dt>Keyboard</dt><dd>WASD to walk; Q/E to turn; F to interact; Escape to go back.</dd></dl>${button(s.village.toured ? "Take the tour again" : "Take Elowen’s tour", "data-vg-tour")}</details>`;
  return { title: "Village journal", tag: "Stories of Hollow Green", html };
}
function almanac(s) {
  if (!M.almanacOpen(s)) return { title: "Elowen’s almanac", tag: "A book waiting for its story", html: intro("letter", "Find the wandering letter", "Help Elowen recover the three pages of her letter. She will give you an almanac of everyday tasks and keepsake rewards.") + actions(button("Visit Elowen", 'data-vg-meet="elowen"', { primary: true }) + pageButton("journal", "Your stories")) };
  const duties = M.almanacPage(s), finished = duties.filter(d => d.done).length;
  let html = intro("book", `Page ${s.village.almanac.pages + 1}`, "Every little task pays as you play. Finish the page to receive its keepsake and turn to a fresh page.", `${finished} / ${duties.length || 4} tasks complete`);
  html += `<section class="vg-ch-prize">${kicker("Finish this page to receive")}${rewardChips(M.almanacPrize(s))}<p>Rewards arrive automatically. No collection trip needed.</p></section>`;
  if (!duties.length) html += '<p class="vg-ch-empty">Your next page is being written. Resume play to see its four tasks.</p>';
  html += duties.map(d => {
    const kind = DUTY_BY_ID[d.id]?.kind, action = d.done ? "" : kind === "decorate" ? button("Decorate", "data-vg-decorate") : ["chat", "gift", "favour"].includes(kind) ? pageButton("people", "Neighbours") : kind === "gather" ? pageButton("materials", "Gather materials") : button("Visit the farm", "data-vg-home");
    return `<article class="vg-ch-duty${d.done ? " is-ready" : ""}"><div><span aria-hidden="true">${d.done ? "✓" : "✧"}</span><h3>${esc(d.text)}</h3><b>${money(d.coins)}</b></div><meter aria-label="${esc(d.text)}" min="0" max="${d.need}" value="${Math.min(d.have, d.need)}"></meter><footer><small>${d.done ? "Complete · coins received" : `${d.have} / ${d.need}`}</small>${action}</footer></article>`;
  }).join("");
  html += `<p class="vg-ch-footnote">${s.village.almanac.pages} page${s.village.almanac.pages === 1 ? "" : "s"} completed. Gathering timers and almanac tasks use active play time.</p>`;
  return { title: "Elowen’s almanac", tag: "The everyday magic of Mothlight", html };
}
function materials(s) {
  const cap = M.villageMaterialCapacity(s), canGather = M.canGather(s);
  let html = intro("bag", `${cap} of each material`, "Gather on the Green, then bring your finds to neighbours or use them for Rowan’s upgrades.");
  html += actions(pageButton("upgrades", "Improve your satchel") + pageButton("journal", "Quest requirements"));
  if (!canGather) html += `<p class="vg-ch-hint">Meet Rowan and Elowen to receive your gathering tools.</p>${button("Meet your neighbours", 'data-vg-page="people"', { primary: true })}`;
  html += MATERIALS.filter(m => m.district === "green").map(m => {
    const nodes = NODES.filter(n => n.material === m.id && n.district === "green"), ready = nodes.filter(n => M.nodeReady(s, n.id)).length, next = Math.min(...nodes.map(n => s.village.nodes[n.id] ?? 0)), count = s.village.materials[m.id] ?? 0;
    return `<article class="vg-ch-material"><div class="vg-ch-card-head"><div class="vg-ch-material-title">${villageItemIcon(m.id)}<h3>${esc(m.name)}</h3></div><b>${count}<span> / ${cap}</span></b></div><meter aria-label="${esc(m.name)} stored" min="0" max="${cap}" value="${count}"></meter><footer><small>${count >= cap ? "Satchel full for this material" : ready ? `${ready} gathering spots ready` : `Next spot in ${wait(next)}`}</small>${button("Find", `data-vg-gather="${m.id}" aria-label="Find ${esc(m.name.toLowerCase())}"`, { disabled: !canGather || count >= cap })}</footer></article>`;
  }).join("");
  const later = MATERIALS.filter(m => m.district !== "green" && s.village.materials[m.id] > 0);
  if (later.length) html += `<details><summary>Other keepsakes · ${later.length}</summary><div class="vg-materials">${later.map(m => `<div><span class="vg-ch-requirement-label">${villageItemIcon(m.id)}<span>${esc(m.name)}</span></span><b>${s.village.materials[m.id]} / ${cap}</b></div>`).join("")}</div></details>`;
  html += '<p class="vg-ch-footnote">Other materials belong to later districts. They are not needed to restore Hollow Green.</p>';
  return { title: "Your satchel", tag: "Gather · restore · make a home", html };
}
function upgrades(s) {
  const stock = M.villageUpgradeStock(s);
  let html = intro("tools", "Made by Rowan", "Room for more finds. Better tools for the work ahead. Each upgrade is yours permanently.", `${stock.filter(u => u.owned).length} / ${stock.length} made`);
  html += stock.map(u => `<article class="vg-ch-card${u.owned ? " is-owned" : ""}"><div class="vg-ch-upgrade-head">${villageItemIcon(u.id)}<div>${kicker(u.owned ? "Owned" : u.unlocked ? "Workshop upgrade" : "A little further in the story")}<h3>${esc(u.name)}</h3></div></div><p>${esc(u.text)}</p>${u.owned ? '<span class="vg-ch-owned">✓ Made for you</span>' : requirements([{ key: "coins", label: "Coins", have: s.coins, need: u.coins, complete: s.coins >= u.coins }, ...u.materials.map(m => ({ key: m.id, label: m.name, have: m.have, need: m.need, complete: m.have >= m.need }))]) + `<p class="vg-ch-hint">${esc(u.reason)}</p>` + actions(button(`Make · ${money(u.coins)}`, `data-vg-upgrade="${u.id}"`, { disabled: !u.canBuy, primary: true }))}</article>`).join("");
  html += actions(pageButton("materials", "Your materials") + pageButton("stall", "Browse the stall"));
  return { title: "Rowan’s workshop", tag: "Useful things, made to last", html };
}
function stall(s, itemArt) {
  if (!M.stallOpen(s)) return { title: "Rattlewood’s stall", tag: "A little work before opening", html: intro("lantern", "A shop full of possibilities", "Help Rowan mend the bench and replace the stall’s awning. Then you can buy decorations for the Green and pieces to take home.") + actions(button("Find Rowan", 'data-vg-meet="rowan"', { primary: true }) + pageButton("journal", "Your stories")) };
  const stock = M.stallStock(s), owned = s.village.decor.owned;
  let html = intro("lantern", "A little piece of Mothlight", "Village pieces go into your decorating catalogue. Farmhouse pieces go into your home inventory.", `Fresh finds in ${wait(s.village.stall.refreshIn)}`);
  html += actions(button("Decorate the Green", "data-vg-decorate", { primary: true }) + pageButton("upgrades", "Workshop upgrades"));
  for (const kind of ["village", "home"]) {
    const items = stock.filter(i => i.kind === kind); if (!items.length) continue;
    html += `<section class="vg-ch-section"><h3>${kind === "village" ? "For the Green" : "For your farmhouse"}</h3>${items.map(item => {
      const d = VILLAGE_DECOR_BY_ID[item.id], stored = kind === "village" ? owned[item.id] ?? 0 : M.ownedCopies?.(s, item.id) ?? 0, uniqueOwned = kind === "home" && stored > 0 && ["wallpaper", "books"].includes(M.decorById?.[item.id]?.category), art = itemArt?.(item) || (kind === "village" ? villageItemIcon(item.id) : "") || seal(kind === "home" ? "house" : d?.tags.includes("books") ? "book" : d?.tags.includes("plant") ? "leaf" : "lantern");
      return `<article class="vg-ch-product"><div class="vg-ch-product-art">${art}</div><div class="vg-ch-product-body"><h3>${esc(item.name)}</h3><small>${item.staple ? "Always stocked" : `${item.left} left`}${stored ? ` · ${stored} ${kind === "home" ? "owned" : "stored"}` : ""}</small>${d ? `<p>${esc(d.text)}</p>` : ""}${button(uniqueOwned ? "Owned" : item.left ? money(item.price) : "Sold out", `data-vg-buy="${esc(item.key)}" aria-label="Buy ${esc(item.name)} for ${money(item.price)}"`, { disabled: uniqueOwned || !item.left || s.coins < item.price, primary: true })}</div></article>`;
    }).join("")}</section>`;
  }
  html += '<p class="vg-ch-footnote">Lantern posts and stools are always available. New finds rotate during active play.</p>';
  return { title: "Rattlewood’s stall", tag: s.village.discount ? `${Math.round(s.village.discount * 100)}% friend’s discount` : "Made with care. A little crooked.", html };
}
function map(s) {
  const destinations = [
    ["arrival", "Carriage home", "Return to your pumpkin patch", "compass"],
    ["tree", "The Moth Tree", "Lanterns at the heart of the Green", "leaf"],
    ["elowen-library", "Elowen’s library", s.village.built["elowen-conservatory"] ? "Conservatory restored" : "Help Elowen make a home", "book"],
    ["rowan-workshop", "Rowan’s workshop", s.village.built["rowan-workshop"] ? "Workshop restored" : "A carpenter’s next chapter", "tools"],
    ["velvet-bat", "The Velvet Bat", "Vesper keeps a light on", "house"],
    ["stall", "Rattlewood’s stall", M.stallOpen(s) ? "Decorations and useful upgrades" : "Help Rowan reopen his stall", "lantern"],
  ];
  let html = intro("compass", "Find your way around", "Choose a landmark to look towards it. Move or centre the camera to return to your character.");
  html += `<div class="vg-ch-destinations">${destinations.map(([id, name, sub, icon]) => `<button class="vg-ch-link" data-vg-focus="${id}">${seal(icon)}<span><b>${esc(name)}</b><small>${esc(sub)}</small></span><span aria-hidden="true">›</span></button>`).join("")}</div>`;
  html += actions(button("Decorate the Green", "data-vg-decorate", { primary: true }) + pageButton("almanac", "Almanac"));
  html += '<p class="vg-ch-footnote">The paths beyond Hollow Green belong to future chapters. Your current stories and materials are all here.</p>';
  return { title: "Hollow Green", tag: "The first neighbourhood of Mothlight", html };
}
export function renderVillageChapter({ kind, state, trackedQuestId, itemArt }) {
  const s = typeof state === "function" ? state() : state;
  if (!s?.village) return null;
  if (kind === "journal") return journal(s, trackedQuestId);
  if (kind === "almanac") return almanac(s);
  if (kind === "materials") return materials(s);
  if (kind === "upgrades") return upgrades(s);
  if (kind === "stall") return stall(s, itemArt);
  if (kind === "map") return map(s);
  return null;
}
