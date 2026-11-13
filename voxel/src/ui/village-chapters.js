import { furnitureSetIcon } from './furniture-set-icon-markup.js';
// Pure presentation for Mothlight's saved chapter. Transactions and navigation
// are handled by village-game, so opening a page cannot spend, award or mutate.
import * as M from "../model.js";
import { MATERIALS, MATERIAL_BY_ID, NODES, FORAGE_AREAS } from "../content/village.js";
import { villageNodePosition } from "../content/village-node-sites.js";
import { FOLK_BY_ID } from "../content/village-folk.js";
import { QUESTS, DUTY_BY_ID } from "../content/village-quests.js";
import { VILLAGE_DECOR_BY_ID } from "../content/village-decor.js";
import { villageItemIcon } from "./village-item-markup.js";
import { renderVillageMap } from "./village-map.js";
import { villageUIIcon } from "./village-ui-icon-markup.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => "£" + Math.floor(n).toLocaleString("en-GB");
const short = id => FOLK_BY_ID[id]?.short ?? id;
const button = (label, attrs, { disabled = false, primary = false, preferred = false } = {}) => `<button class="vg-ch-action${primary ? " vg-ch-primary" : ""}" ${attrs}${preferred && !disabled ? " data-pad-default" : ""}${disabled ? " disabled" : ""}>${label}</button>`;
const actions = html => `<div class="vg-ch-actions">${html}</div>`;
const pageButton = (kind, label) => button(`${villageUIIcon(({journal:"quests",materials:"satchel",upgrades:"workshop",stall:"workshop",almanac:"quests"})[kind] ?? kind,24)}<span>${esc(label)}</span>`, `data-vg-page="${kind}"`);
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
const materialArt = key => { const id = String(key ?? "").startsWith("blight:") ? "cursed-spores" : String(key ?? "").replace(/^material:/, ""); return MATERIAL_BY_ID[id] ? villageItemIcon(id) : ""; };
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
  for (const id of r.recipes ?? []) gift(`${M.RECIPE_BY_ID[id]?.name ?? id} recipe`, "almanac");
  for (const id of r.costumes ?? []) gift(`${M.costumeById[id]?.name ?? id} costume`);
  if (r.effect === "bench") gift("Village bench restored");
  if (r.build) gift(r.build === "rowan-workshop" ? "Rowan’s workshop restored" : "Elowen’s conservatory restored");
  for (const u of r.unlock ?? []) gift(({ gathering: "Gathering tools", stall: "Rowan's stall", almanac: "Village almanac" })[u] ?? u, ({ gathering: "gathering-kit", almanac: "almanac" })[u]);
  return gifts.length ? `<div class="vg-ch-rewards">${gifts.join("")}</div>` : "";
}
function questAction(s, q, step, rows, preferred = false) {
  if (!step) return "";
  const next = (label, attrs) => button(label, attrs, { primary: true, preferred });
  if (step.kind === "tour") return next("Take Elowen’s tour", "data-vg-tour");
  if (step.kind === "talk") return next(`Talk to ${esc(short(step.who))}`, `data-vg-meet="${esc(step.who)}"`);
  if (["deliver", "give", "pay"].includes(step.kind)) {
    const ready = M.handOver(s, step.who, q.id)?.ok;
    const handover = button(step.kind === "pay" ? `Pay ${esc(short(step.who))} · ${money(step.coins)}` : `Give to ${esc(short(step.who))}`, `data-vg-handover="${esc(step.who)}" data-quest="${q.id}"`, { primary: !!ready, preferred: preferred && ready, disabled: !ready });
    const missing = rows.find(r => !r.complete && MATERIAL_BY_ID[r.key]);
    if (missing) return next(`Find ${esc(MATERIAL_BY_ID[missing.key].name.toLowerCase())}`, `data-vg-gather="${missing.key}"`) + handover;
    if (!ready && step.kind === "give") return next("Continue at the farm", "data-vg-home") + handover;
    return handover;
  }
  if (step.kind === "root-out") return next("Find cursed fungus", `data-vg-gather="cursed-spores" data-vg-district="${esc(step.district ?? "green")}"`);
  if (step.kind === "gather") return next(`Find ${esc(MATERIAL_BY_ID[step.material]?.name.toLowerCase() ?? step.material)}`, `data-vg-gather="${step.material}"`);
  if (step.kind === "place") return next("Make the reading nook", `data-vg-decorate data-near="${esc(step.near)}"`);
  if (step.kind === "find") return step.item === "page-3" ? next("Return to the farm", "data-vg-home") : next("Look on the Green", `data-vg-object="${esc(step.item)}"`);
  if (["cook", "carve", "sell", "harvest", "earn", "fish"].includes(step.kind)) return next("Continue at the farm", "data-vg-home");
  return next(`Find ${esc(short(q.giver))}`, `data-vg-meet="${q.giver}"`);
}
// The most distinctive gift stays visible; the full reward receipt is one
// optional fold below it, so a valuable costume never disappears into a list.
function questPrize(q) {
  const r = q.reward ?? {}, outfits = (r.costumes ?? []).map(id => M.costumeById[id]?.name ?? id);
  let name = outfits.length ? new Set(outfits).size === 1 && outfits.length > 1 ? `${outfits[0]} outfits for both` : outfits.join(" + ") : null;
  name ??= r.decor?.length ? M.decorById[r.decor[0]]?.name ?? "A farmhouse furnishing" : null;
  name ??= r.recipes?.length ? `${M.RECIPE_BY_ID[r.recipes[0]]?.name ?? r.recipes[0]} recipe` : null;
  name ??= (r.unlock ?? []).map(id => ({gathering:"Axe & pickaxe",stall:"Rowan’s stall opens",almanac:"Elowen’s almanac"})[id]).find(Boolean);
  name ??= r.build ? r.build === "rowan-workshop" ? "Rowan’s workshop restored" : "Elowen’s conservatory restored" : null;
  name ??= r.effect === "bench" ? "Village bench restored" : null;
  const piece = Object.keys(r.villageDecor ?? {})[0];
  name ??= piece ? VILLAGE_DECOR_BY_ID[piece]?.name ?? "A village furnishing" : null;
  name ??= Object.keys(r.friendship ?? {}).length ? "A closer friendship" : null;
  return [name, r.coins ? money(r.coins) : null].filter(Boolean).join(" · ");
}
function questCard(s, q, tracked) {
  const step = M.questStep(s, q.id), rows = M.questRequirementRows(s, q.id), hint = M.questStepHint(s, q.id);
  const index = Math.min(q.steps.length, Math.max(1, (s.village.quests[q.id]?.step ?? 0) + 1)), prize = questPrize(q);
  return `<article class="vg-ch-card vg-ch-quest${tracked ? " is-tracked" : ""}" data-quest-card="${q.id}"><div class="vg-ch-card-head"><div>${kicker(`${q.kind === "story" ? "Village story" : short(q.giver) + "’s story"}${tracked ? " · Following" : ""}`)}<h3>${esc(q.title)}</h3></div>${button(tracked ? "Following" : "Follow", `data-vg-track="${q.id}" aria-pressed="${tracked}"`)}</div><div class="vg-ch-step"><span>Next step</span><small>${index} / ${q.steps.length}</small></div><meter class="vg-ch-quest-progress" aria-label="Completed steps in ${esc(q.title)}" min="0" max="${q.steps.length}" value="${index - 1}"></meter><p class="vg-ch-task">${esc(step?.text ?? "Return to your neighbour")}</p>${requirements(rows)}${hint ? `<p class="vg-ch-hint">${esc(hint)}</p>` : ""}${actions(questAction(s, q, step, rows, tracked))}${prize ? `<div class="vg-ch-prize-preview">${villageUIIcon("quests",24)}<span><small>On completion</small><b>${esc(prize)}</b></span></div>` : ""}<details class="vg-ch-reward-fold" data-vg-details-key="reward:${q.id}"><summary>All rewards</summary>${questRewards(q)}</details></article>`;
}
function friendshipKeepsakes(s) {
  return `<details class="vg-ch-history" data-vg-details-key="friendship-keepsakes"><summary>Friendship keepsakes</summary><p class="vg-ch-hint">Each new friendship level brings a gift for your farm or village. A unique item you already own becomes bonus coins.</p>${["elowen", "rowan"].map(id => {
    const bond = M.friendshipWith(s, id), f = FOLK_BY_ID[id];
    if (!bond?.met) return "";
    const reached = Object.entries(f.rewards).filter(([level]) => s.village.claims[`friend:${id}:${level}`]), next = f.rewards[bond.level + 1];
    return `<article class="vg-ch-receipt">${kicker(`${f.short} · Friendship ${bond.level}`)}${next ? `<h3>Next: friendship ${bond.level + 1}</h3>${rewardChips(next)}` : '<h3>A lifelong friend</h3>'}${reached.length ? `<details class="vg-ch-reward-fold" data-vg-details-key="friendship:${id}"><summary>Milestones reached · ${reached.length}</summary>${reached.map(([level, gifts]) => `<div class="vg-ch-friend-reward"><small>Friendship ${level}</small>${rewardChips(gifts)}</div>`).join("")}</details>` : ""}</article>`;
  }).join("")}</details>`;
}
function blightChapters(s, tracked) {
  const chapters = QUESTS.filter(q => q.arc === "blight");
  if (!chapters.length || !s.village.invited) return "";
  const completed = chapters.filter(q => M.questStatus(s, q.id) === "done").length;
  return `<details class="vg-ch-blight" data-vg-details-key="blight-story"><summary>${villageItemIcon("cursed-spores") || villageUIIcon("quests", 28)}<span><b>The cursed bloom</b><small>${completed} / ${chapters.length} chapters restored</small></span><i aria-hidden="true">⌄</i></summary><p class="vg-ch-hint">Red caps and violet spores are taking root beneath Hollow Green. Help Elowen and Rowan trace the blight, study its samples and bring a little of the farm's warmth back to the village.</p>${chapters.map((q, i) => {
    const status = M.questStatus(s, q.id), missing = q.needs.find(id => !s.village.quests[id]?.done);
    const reason = M.patchLevel(s).level < q.level ? `Patch level ${q.level}` : missing ? `Finish ${QUESTS.find(other => other.id === missing)?.title ?? "the previous chapter"}` : "A later chapter";
    const control = status === "offered" ? button(`Talk to ${esc(short(q.giver))}`, `data-vg-meet="${q.giver}"`, { primary: true }) : status === "active" ? button(tracked === q.id ? "Following" : "Follow chapter", `data-vg-track="${q.id}" aria-pressed="${tracked === q.id}"`) : `<span class="vg-ch-blight-status">${status === "done" ? "✓ Restored" : esc(reason)}</span>`;
    return `<article data-blight-chapter="${q.id}" class="${status === "done" ? "is-complete" : ""}">${kicker(`Chapter ${i + 1} · ${status === "done" ? "Complete" : status === "active" ? "In progress" : status === "offered" ? "Ready to begin" : "Locked"}`)}<h4>${esc(q.title)}</h4><p>${esc(q.blurb)}</p>${control}</article>`;
  }).join("")}</details>`;
}
function journal(s, trackedQuestId) {
  const active = M.activeQuests(s), tracked = active.some(q => q.id === trackedQuestId) ? trackedQuestId : M.trackedQuest(s)?.id;
  const done = QUESTS.filter(q => s.village.quests[q.id]?.done), offered = [...M.offeredBy(s, "elowen"), ...M.offeredBy(s, "rowan")];
  let html = intro("book", "Around the Green", "Favours and friendships with your neighbours. Follow one to keep its next step on screen.", `${active.length} active · ${done.length} completed`);
  const followed = active.find(q => q.id === tracked), others = active.filter(q => q.id !== tracked);
  if (followed) html += questCard(s, followed, true);
  if (others.length) html += `<section class="vg-ch-other-stories"><h3>Other stories <span>${others.length}</span></h3>${others.map(q => {
    const step = M.questStep(s, q.id), index = Math.min(q.steps.length, (s.village.quests[q.id]?.step ?? 0) + 1);
    return `<details class="vg-ch-story-fold" data-vg-details-key="story:${q.id}"><summary><span><small>${esc(short(q.giver))} · Step ${index} of ${q.steps.length}</small><b>${esc(q.title)}</b><span class="vg-ch-story-task">${esc(step?.text ?? "Return to your neighbour")}</span></span><i aria-hidden="true">⌄</i></summary>${questCard(s, q, false)}</details>`;
  }).join("")}</section>`;
  if (!active.length) html += `<p class="vg-ch-empty">${offered.length ? "A neighbour has a new story for you." : "Spend time with Elowen and Rowan. Chats, presents and favours deepen your friendships and open their next chapters."}</p>`;
  const otherOffers = offered.filter(q => q.arc !== "blight");
  if (otherOffers.length) html += `<section class="vg-ch-section"><h3>Someone needs a hand</h3>${otherOffers.map(q => `<button class="vg-ch-link" data-vg-meet="${q.giver}"><span><b>${esc(q.title)}</b><small>${esc(short(q.giver))} has a new quest</small></span><span aria-hidden="true">›</span></button>`).join("")}</section>`;
  html += blightChapters(s, tracked);
  html += actions(pageButton("almanac", "Almanac") + pageButton("map", "Village map"));
  if (done.length) html += `<details class="vg-ch-history" data-vg-details-key="finished-stories"><summary>Finished stories · ${done.length}</summary>${done.map(q => `<article class="vg-ch-receipt">${kicker("Completed · rewards received")}<h3>${esc(q.title)}</h3>${questRewards(q)}</article>`).join("")}</details>`;
  html += friendshipKeepsakes(s);
  html += `<details class="vg-help" data-vg-details-key="explore-help"><summary>Ways to explore</summary><dl><dt>Touch</dt><dd>Left thumb moves; right thumb looks. Tap the gold action to interact.</dd><dt>Controller</dt><dd>Left stick moves, right stick looks. Cross interacts, Circle goes back. D-pad moves through menus.</dd><dt>Keyboard</dt><dd>WASD to walk; Q/R to turn; E to interact; C to centre; Escape to go back.</dd></dl>${button(s.village.toured ? "Take the tour again" : "Take Elowen’s tour", "data-vg-tour")}</details>`;
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
// Counts are the usable inventory, not cumulative gathering. Returning spots
// and a full satchel explain their disabled action beside the relevant item.
function materials(s) {
  const cap = M.villageMaterialCapacity(s), canGather = M.canGather(s);
  const needed = new Set(M.activeQuests(s).flatMap(q => M.questRequirementRows(s, q.id).filter(r => !r.complete).map(r => r.key.replace(/^material:/, ""))));
  let html = intro("bag", "Your gathering satchel", `Carry up to ${cap} of each material. Find supplies on the Green, then bring them to a neighbour or Rowan’s workshop.`);
  if (!canGather) html += `<div class="vg-ch-info-note"><b>Your tools are waiting</b><p>Meet Rowan and Elowen to receive your gathering tools.</p>${button("Meet your neighbours", 'data-vg-page="people"', { primary: true, preferred: true })}</div>`;
  html += `<section class="vg-ch-material-list" aria-label="Materials in your satchel">${MATERIALS.filter(m => m.district === "green").map(m => {
    const area = FORAGE_AREAS.find(a => a.material === m.id), nodes = NODES.filter(n => n.material === m.id && n.district === "green").map(n => ({ ...n, ...villageNodePosition(s, n) })), ready = nodes.filter(n => M.nodeReady(s, n.id)).length, next = Math.min(...nodes.map(n => s.village.nodes[n.id] ?? 0)), count = s.village.materials[m.id] ?? 0;
    const blight = m.id === "cursed-spores", full = count >= cap, available = canGather && (!full || blight) && ready > 0;
    const status = full && !blight ? "Full" : !canGather ? "Tools needed" : ready ? `${ready} ready` : "Returning";
    const location = area ? `${area.name}${nodes.some(n => n.x < area.x0 || n.x > area.x1 || n.z < area.z0 || n.z > area.z1) ? " & Green gardens" : ""}` : "Hollow Green";
    return `<article class="vg-ch-material${full ? " is-full" : available ? " is-ready" : ""}" data-vg-material="${m.id}"><div class="vg-ch-card-head"><div class="vg-ch-material-title">${villageItemIcon(m.id)}<div class="vg-ch-material-copy"><h3>${esc(m.name)}</h3>${needed.has(m.id) ? '<small class="vg-ch-needed">Needed for a quest</small>' : ""}</div></div><b>${count}<span> / ${cap}</span></b></div><meter aria-label="${esc(m.name)} stored" min="0" max="${cap}" value="${count}"></meter><footer><span><b class="vg-ch-availability">${status}</b><small>${full ? blight ? "Root out patches even when samples are full" : "Use some supplies or improve your satchel" : ready ? esc(location) : `Next spot in ${wait(next)}`}</small></span>${button(full && !blight ? "Full" : !canGather ? "Find" : ready ? blight ? "Find fungus" : "Find" : "Returning", `data-vg-gather="${m.id}" aria-label="Find ${esc(m.name.toLowerCase())}"`, { disabled: !available, primary: available })}</footer></article>`;
  }).join("")}</section>`;
  html += actions(pageButton("upgrades", "More satchel space") + pageButton("journal", "Quest requirements"));
  const later = MATERIALS.filter(m => m.district !== "green" && s.village.materials[m.id] > 0);
  if (later.length) html += `<details data-vg-details-key="other-materials"><summary>Other keepsakes · ${later.length}</summary><div class="vg-materials">${later.map(m => `<div><span class="vg-ch-requirement-label">${villageItemIcon(m.id)}<span>${esc(m.name)}</span></span><b>${s.village.materials[m.id]} / ${cap}</b></div>`).join("")}</div></details>`;
  html += '<p class="vg-ch-footnote">Other materials belong to later districts. They are not needed to restore Hollow Green.</p>';
  return { title: "Your satchel", tag: `${cap} of each material · Gathering supplies`, html };
}

// Costs stay compact; only the missing amounts need a sentence of explanation.
function upgradeCosts(s, u) {
  const coinsReady = s.coins >= u.coins;
  return `<div class="vg-ch-costs" aria-label="Cost to make ${esc(u.name)}"><span class="${coinsReady ? "" : "is-short"}" aria-label="Costs ${money(u.coins)}; you have ${money(s.coins)}"><b>${money(u.coins)}</b></span>${u.materials.map(m => `<span class="${m.have >= m.need ? "" : "is-short"}" aria-label="${m.need} ${esc(m.name)} needed; you have ${m.have}">${villageItemIcon(m.id)}<b>${m.need}</b><span>${esc(m.name)}</span></span>`).join("")}</div>`;
}
function upgradeReason(s, u) {
  if (!u.unlocked) return u.reason;
  if (s.paused) return "Resume play to make this improvement.";
  const missing = [...(s.coins < u.coins ? [money(Math.ceil(u.coins - s.coins)) + " more"] : []), ...u.materials.filter(m => m.have < m.need).map(m => `${m.need - m.have} more ${m.name.toLowerCase()}`)];
  return missing.length ? `Need ${missing.join(" and ")}.` : "All supplies ready.";
}
function upgradeCard(s, u, preferred = false) {
  const art = furnitureSetIcon(u.id,60) || villageItemIcon(u.id);
  return `<article class="vg-ch-card vg-ch-upgrade${u.canBuy ? " is-ready" : ""}" data-vg-upgrade-card="${u.id}"><div class="vg-ch-upgrade-head">${art}<div>${kicker(u.canBuy ? "Ready to make" : u.unlocked ? s.paused ? "Play is paused" : "Gathering supplies" : "Story requirement")}<h3>${esc(u.name)}</h3></div></div><p>${esc(u.text)}</p>${u.homeItems?.length ? `<div class="vg-ch-rewards" aria-label="Included farmhouse pieces">${u.homeItems.map(id => rewardChip(M.decorById[id]?.name ?? id, furnitureSetIcon(id,24))).join("")}</div>` : ""}${upgradeCosts(s,u)}<p class="vg-ch-hint${u.canBuy ? " is-ready" : ""}">${esc(upgradeReason(s,u))}</p>${actions(button(u.unlocked ? `Make · ${money(u.coins)}` : "Story locked", `data-vg-upgrade="${u.id}" aria-label="Make ${esc(u.name)} for ${money(u.coins)} and materials"`, { disabled: !u.canBuy, primary: u.canBuy, preferred }))}</article>`;
}
function upgrades(s) {
  const stock = M.villageUpgradeStock(s), available = stock.filter(u => !u.owned && u.unlocked), later = stock.filter(u => !u.owned && !u.unlocked), owned = stock.filter(u => u.owned);
  const awayRate = typeof M.villageFarmRate === "function" ? M.villageFarmRate(s) : .025, preferred = available.find(u => u.canBuy)?.id;
  let html = intro("tools", "Make your next improvement", "Better gathering tools, more space and a farm that keeps working while you explore.");
  html += `<div class="vg-ch-summary-band"><span><small>Farm while away</small><b>${+(awayRate * 100).toFixed(1)}%</b></span><span><small>Made for you</small><b>${owned.length} <small>/ ${stock.length}</small></b></span></div>`;
  if (available.length) html += `<section class="vg-ch-upgrade-list" aria-label="Unlocked improvements"><h3 class="vg-ch-section-title">Unlocked improvements <span>${available.length}</span></h3>${available.map(u => upgradeCard(s,u,u.id===preferred)).join("")}</section>`;
  else if (later.length) html += `<div class="vg-ch-info-note"><b>${owned.length ? "More ideas are coming" : "Rowan has a few ideas"}</b><p>Help your neighbours with their stories to open the next improvements.</p>${button("Find Rowan", 'data-vg-meet="rowan"', { primary: true, preferred: true })}</div>`;
  if (later.length) html += `<details class="vg-ch-workshop-fold" data-vg-details-key="workshop-later"><summary><span>Later improvements</span><b>${later.length}</b></summary><p class="vg-ch-hint">Each improvement names the story or purchase it needs.</p>${later.map(u => upgradeCard(s,u)).join("")}</details>`;
  if (owned.length) html += `<details class="vg-ch-workshop-fold" data-vg-details-key="workshop-owned"><summary><span>Already made</span><b>${owned.length}</b></summary>${owned.map(u => `<article class="vg-ch-made"><span aria-hidden="true">✓</span><div><h3>${esc(u.name)}</h3><p>${esc(u.text)}</p></div></article>`).join("")}</details>`;
  html += actions(pageButton("materials", "Find supplies") + pageButton("stall", "Browse the stall"));
  return { title: "Rowan’s workshop", tag: "Choose an improvement · Gather · Make", html };
}
function stall(s, itemArt) {
  if (!M.stallOpen(s)) return { title: "Rattlewood’s stall", tag: "A little work before opening", html: intro("lantern", "A shop full of possibilities", "Help Rowan mend the bench and replace the stall’s awning. Then you can buy decorations for the Green and pieces to take home.") + actions(button("Find Rowan", 'data-vg-meet="rowan"', { primary: true }) + pageButton("journal", "Your stories")) };
  const stock = M.stallStock(s), owned = s.village.decor.owned;
  let html = intro("lantern", "A little piece of Mothlight", "Village pieces go into your decorating catalogue. Farmhouse pieces go into your home inventory.", `Fresh finds in ${wait(s.village.stall.refreshIn)}`);
  html += `<div class="vg-ch-wallet"><span>Available to spend</span><b>${money(s.coins)}</b></div>`;
  for (const kind of ["village", "home"]) {
    const items = stock.filter(i => i.kind === kind); if (!items.length) continue;
    html += `<section class="vg-ch-section"><h3>${kind === "village" ? "For the Green" : "For your farmhouse"}</h3>${items.map(item => {
      const d = VILLAGE_DECOR_BY_ID[item.id], stored = kind === "village" ? owned[item.id] ?? 0 : M.ownedCopies?.(s, item.id) ?? 0, uniqueOwned = kind === "home" && stored > 0 && ["wallpaper", "books"].includes(M.decorById?.[item.id]?.category), art = itemArt?.(item) || (kind === "village" ? villageItemIcon(item.id) : "") || seal(kind === "home" ? "house" : d?.tags.includes("books") ? "book" : d?.tags.includes("plant") ? "leaf" : "lantern");
      const shortfall = Math.max(0, Math.ceil(item.price - s.coins)), available = !uniqueOwned && !!item.left && !shortfall;
      return `<article class="vg-ch-product"><div class="vg-ch-product-art">${art}</div><div class="vg-ch-product-body"><h3>${esc(item.name)}</h3><small>${item.staple ? "Always stocked" : `${item.left} left`}${stored ? ` · ${stored} ${kind === "home" ? "owned" : "stored"}` : ""}</small>${d ? `<p>${esc(d.text)}</p>` : ""}${button(uniqueOwned ? "Owned" : item.left ? money(item.price) : "Sold out", `data-vg-buy="${esc(item.key)}" aria-label="Buy ${esc(item.name)} for ${money(item.price)}"`, { disabled: !available, primary: available })}${!uniqueOwned && item.left && shortfall ? `<small class="vg-ch-shortfall">${money(shortfall)} more needed</small>` : ""}</div></article>`;
    }).join("")}</section>`;
  }
  html += actions(button("Decorate the Green", "data-vg-decorate") + pageButton("upgrades", "Workshop upgrades"));
  html += '<p class="vg-ch-footnote">Lantern posts and stools are always available. New finds rotate during active play.</p>';
  return { title: "Rattlewood’s stall", tag: s.village.discount ? `${Math.round(s.village.discount * 100)}% friend’s discount` : "Made with care. A little crooked.", html };
}
export function renderVillageChapter({ kind, id, state, trackedQuestId, itemArt, position }) {
  const s = typeof state === "function" ? state() : state;
  if (!s?.village) return null;
  if (kind === "journal") return journal(s, trackedQuestId);
  if (kind === "almanac") return almanac(s);
  if (kind === "materials") return materials(s);
  if (kind === "upgrades") return upgrades(s);
  if (kind === "stall") return stall(s, itemArt);
  if (kind === "map") return renderVillageMap(s, { selectedDistrict: id, position });
  return null;
}
// The shared journal reuses these receipts and actions without copying rules.
export { questCard as legacyQuestCardMarkup, questAction as legacyQuestActionMarkup, questRewards as legacyQuestRewardsMarkup, friendshipKeepsakes as friendshipKeepsakesMarkup };
