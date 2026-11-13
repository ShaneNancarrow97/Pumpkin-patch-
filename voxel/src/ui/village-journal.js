// A single journal hierarchy over unchanged legacy and chapter transactions.
import { FOLK_BY_ID } from "../content/village-folk.js";
import { legacyQuestCardMarkup, legacyQuestRewardsMarkup, friendshipKeepsakesMarkup } from "./village-chapters.js";
import { expansionStoryCardMarkup, expansionRewardMarkup } from "./village-expansion-pages.js";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const short = id => FOLK_BY_ID[id]?.short ?? id;
const open = record => ["active", "available"].includes(record.status);
const rewards = (state, record) => record.legacy ? legacyQuestRewardsMarkup(record.legacy) : expansionRewardMarkup(record.chapter.rewards);
const byline = record => `${short(record.giver)} · ${record.optional ? "Neighbour story" : "Village story"}`;
function card(state, record, followed, portrait) {
  if (record.source === "expansion") return expansionStoryCardMarkup(record.chapter, followed?.id, portrait, { focused: true });
  if (record.status === "active") return legacyQuestCardMarkup(state, record.legacy, followed?.id === record.id);
  return `<article class="vg-ch-card" data-quest-card="${esc(record.id)}"><small>${esc(byline(record))} · Ready to begin</small><h3>${esc(record.title)}</h3><p>${esc(record.description)}</p><div class="vg-ch-actions"><button class="vg-ch-action" data-vg-track="${esc(record.id)}" aria-pressed="${followed?.id === record.id}">${followed?.id === record.id ? "Following" : "Follow story"}</button><button class="vg-ch-action vg-ch-primary" data-vg-meet="${esc(record.giver)}">Talk to ${esc(short(record.giver))}</button></div><details class="vg-ch-reward-fold" data-vg-details-key="reward:${esc(record.id)}"><summary>On completion</summary>${rewards(state, record)}</details></article>`;
}
function fold(state, record, followed, portrait) {
  return `<details class="vg-ch-story-fold" data-vg-details-key="objective:${esc(record.id)}"><summary><span><small>${esc(byline(record))} · ${record.status === "active" ? "In progress" : "Ready to begin"}</small><b>${esc(record.title)}</b><span class="vg-ch-story-task">${esc(record.task)}</span></span><i aria-hidden="true">⌄</i></summary>${card(state, record, followed, portrait)}</details>`;
}
export function renderVillageJournal({ state, records, followed = null, who = null, portrait = null }) {
  const entries = who ? records.filter(record => record.giver === who) : records;
  const selected = entries.find(record => record.id === followed?.id && open(record));
  const current = entries.filter(record => open(record) && record.id !== selected?.id), done = entries.filter(record => record.status === "done"), locked = entries.filter(record => record.status === "locked");
  let html = '<section class="vg-journal" aria-label="Village stories">';
  if (!selected) html += `<header class="vg-journal-head"><h3>${who ? `Stories with ${esc(short(who))}` : "Choose a story"}</h3><p>Follow a story to keep its next step and walking route together.</p>${who ? '<button class="vg-ch-action" data-vg-page="journal">All stories</button>' : ""}</header>`;
  if (selected) html += `<section class="vg-journal-following" aria-label="Following"><h3 class="vg-ch-section-title">Following</h3>${card(state, selected, followed, portrait)}</section>`;
  else if (!current.length) html += '<p class="vg-ch-empty">No open stories here just now. The chapters below explain what comes next.</p>';
  if (selected && who) html += '<button class="vg-ch-action" data-vg-page="journal">All stories</button>';
  for (const optional of [false, true]) {
    const group = current.filter(record => record.optional === optional);
    if (group.length) html += `<section class="vg-journal-open" aria-label="${optional ? "Neighbour stories" : "Village stories"}"><h3 class="vg-ch-section-title">${optional ? "Neighbour stories" : "Village stories"} <span>${group.length}</span></h3>${group.map(record => fold(state, record, followed, portrait)).join("")}</section>`;
  }
  if (locked.length) html += `<details class="vg-ch-history" data-vg-details-key="objectives:later"><summary>Coming later · ${locked.length}</summary>${locked.map(record => `<article class="vg-ch-receipt" data-vg-locked-story="${esc(record.id)}"><small>${esc(byline(record))}</small><h3>${esc(record.title)}</h3><p>${esc(record.reason)}</p></article>`).join("")}</details>`;
  if (done.length) html += `<details class="vg-ch-history" data-vg-details-key="objectives:finished"><summary>Finished stories · ${done.length}</summary>${done.map(record => `<article class="vg-ch-receipt" data-vg-finished-story="${esc(record.id)}"><small>Complete · rewards received · ${esc(short(record.giver))}</small><h3>${esc(record.title)}</h3>${record.chapter?.change ? `<p>${esc(record.chapter.change)}</p>` : ""}${rewards(state, record)}</article>`).join("")}</details>`;
  html += `<div class="vg-ch-actions"><button class="vg-ch-action" data-vg-page="almanac">Almanac</button><button class="vg-ch-action" data-vg-page="materials">Your satchel</button><button class="vg-ch-action" data-vg-page="map">Village map</button></div>${friendshipKeepsakesMarkup(state)}<details class="vg-help" data-vg-details-key="explore-help"><summary>Following stories &amp; village tour</summary><p>Follow one story to keep its next step on screen. Other stories remain available above. Talk beside a neighbour to begin a story or hand things over.</p><p>Elowen can show you around again whenever you like.</p><button class="vg-ch-action" data-vg-tour>Take Elowen’s tour</button></details></section>`;
  return { title: "Village journal", tag: `${entries.filter(record => open(record)).length} open stories · ${done.length} completed`, html };
}
