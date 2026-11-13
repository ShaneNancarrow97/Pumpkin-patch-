// Live story pages share the existing quest IDs and commands. Tabs change the
// view of those stories, never their progress, rewards or followed objective.
import { FOLK_BY_ID } from "../content/village-folk.js";
import { legacyQuestActionMarkup, legacyQuestRewardsMarkup, friendshipKeepsakesMarkup } from "./village-chapters.js";
import { expansionRewardMarkup } from "./village-expansion-pages.js";
import { fidelityIcon } from "./village-fidelity-icon-markup.js";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const short = id => FOLK_BY_ID[id]?.short ?? id;
const open = record => ["active", "available"].includes(record.status);
export const JOURNAL_TABS = Object.freeze(["active", "discover", "completed"]);
export function nextJournalTab(current, key) {
  const index = Math.max(0, JOURNAL_TABS.indexOf(current));
  return key === "Home" ? JOURNAL_TABS[0] : key === "End" ? JOURNAL_TABS[2] : key === "ArrowRight" ? JOURNAL_TABS[(index + 1) % 3] : key === "ArrowLeft" ? JOURNAL_TABS[(index + 2) % 3] : null;
}
const byline = record => `${short(record.giver)} · ${record.optional ? "Neighbour story" : "Village story"}`;
const rewards = record => record.legacy ? legacyQuestRewardsMarkup(record.legacy) : expansionRewardMarkup(record.chapter.rewards);
const followAttrs = record => record.source === "expansion" ? `data-vgx-track="${esc(record.id)}"` : `data-vg-track="${esc(record.id)}"`;
const routeAttrs = record => record.source === "expansion" ? `data-vgx-guide="${esc(record.id)}"` : `data-vg-objective-guide="${esc(record.id)}"`;
function portraitMarkup(record, portrait, className = "vf-story-portrait") {
  const url = portrait?.(record.giver);
  return `<span class="${className}" aria-hidden="true">${url ? `<img src="${esc(url)}" alt="">` : fidelityIcon("moth")}</span>`;
}
function storyMarkup(state, record) {
  const steps = record.steps.map(step => `<li class="${step.done ? "is-done" : step.current ? "is-current" : "is-later"}"><span aria-hidden="true">${step.done ? "✓" : step.current ? "◇" : "·"}</span><span>${esc(step.name)}${step.done ? '<small class="sr"> · Complete</small>' : step.current ? '<small class="sr"> · Next objective</small>' : ""}</span></li>`).join("");
  const actions = record.legacy && record.status === "active" ? legacyQuestActionMarkup(state, record.legacy, record.legacy.steps[record.completed], record.requirements, false) : record.legacy && record.status === "available" ? `<button class="vg-ch-action" data-vg-meet="${esc(record.giver)}">Talk to ${esc(short(record.giver))} to begin</button>` : "";
  return `<p class="vf-story-description">${esc(record.description)}</p>${record.hint ? `<p class="vf-story-hint">${esc(record.hint)}</p>` : ""}<ol class="vf-story-steps" aria-label="Story steps">${steps}</ol>${actions ? `<div class="vf-story-actions">${actions}</div>` : ""}<div class="vf-story-rewards"><h4>On completion</h4>${rewards(record)}</div>`;
}
const routeArrow = '<svg class="vf-route-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function hero(state, record, portrait) {
  const need = Math.max(1, record.need), completed = Math.min(need, Math.max(0, record.completed));
  const progress = need<=8 ? `<span>Step ${Math.min(need,completed+1)} of ${need}</span><span class="vf-checkpoints" aria-hidden="true">${Array.from({length:need},(_,i)=>`<i class="${i<completed?"is-done":i===completed?"is-current":"is-later"}"></i>`).join("")}</span><meter class="sr" aria-label="Completed steps in ${esc(record.title)}" min="0" max="${need}" value="${completed}"></meter>` : `<span>Chapter progress</span><b>${completed} / ${need}</b><meter aria-label="Completed steps in ${esc(record.title)}" min="0" max="${need}" value="${completed}"></meter>`;
  const requirements = record.requirements.length ? `<ul class="vf-task-requirements" aria-label="Current requirements">${record.requirements.map(row => `<li class="${row.complete ? "is-ready" : ""}"><span>${esc(row.label)}</span><b>${Math.min(row.need, row.have)} / ${row.need}</b></li>`).join("")}</ul>` : "";
  return `<article class="vf-story-hero" data-quest-card="${esc(record.id)}" data-vgx-chapter="${esc(record.id)}"><header>${portraitMarkup(record, portrait)}<div><small>Following · ${esc(short(record.giver))}</small><h3>${esc(record.title)}</h3>${record.status === "available" && record.legacy ? '<span class="vf-story-kind">Ready to begin</span>' : ""}</div></header><div class="vf-story-progress">${progress}</div><div class="vf-next-objective"><small>Next objective</small><p>${esc(record.task)}</p>${requirements}</div><button class="vf-show-way" ${routeAttrs(record)} data-pad-default><span>Show the way</span>${routeArrow}</button><details class="vf-story-fold" data-vg-details-key="objective-story:${esc(record.id)}"><summary>Story &amp; rewards <span aria-hidden="true">⌄</span></summary>${storyMarkup(state, record)}</details></article>`;
}
function row(state, record, followed, portrait) {
  const following = record.id === followed?.id;
  const status = record.status === "active" ? `${record.completed} / ${record.need} steps` : "Ready to begin";
  return `<details class="vf-story-row" data-vg-details-key="objective:${esc(record.id)}"><summary>${portraitMarkup(record, portrait, "vf-row-portrait")}<span class="vf-row-copy"><small>${esc(short(record.giver))} · ${status}</small><b>${esc(record.title)}</b><span>${esc(record.task)}</span></span><i aria-hidden="true">⌄</i></summary><div class="vf-row-details"><div class="vf-row-controls"><button class="vg-ch-action" ${followAttrs(record)} aria-pressed="${following}">${following ? "Following" : "Follow story"}</button><button class="vg-ch-action" ${routeAttrs(record)}>Show the way</button></div>${storyMarkup(state, record)}</div></details>`;
}
export function renderVillageJournal({ state, records, followed = null, who = null, portrait = null, tab = "active" }) {
  const selectedTab = JOURNAL_TABS.includes(tab) ? tab : "active";
  const entries = who ? records.filter(record => record.giver === who || record.status === "active" && record.legacy?.steps[record.completed]?.who === who) : records;
  const selected = entries.find(record => record.id === followed?.id && open(record));
  const active = entries.filter(record => record.status === "active" || record.id === selected?.id), discover = entries.filter(record => record.status === "available" && record.id !== selected?.id), locked = entries.filter(record => record.status === "locked"), done = entries.filter(record => record.status === "done");
  const count = { active: active.length, discover: discover.length, completed: done.length };
  const tabs = JOURNAL_TABS.map(id => `<button type="button" id="vf-tab-${id}" role="tab" aria-selected="${id === selectedTab}" aria-controls="vf-page-${id}" tabindex="${id === selectedTab ? 0 : -1}" data-vg-journal-tab="${id}"><span>${id[0].toUpperCase() + id.slice(1)}</span><small>${count[id]}</small></button>`).join("");
  const current = selected ? `<section class="vg-journal-following" aria-label="Following">${hero(state, selected, portrait)}</section>` : `<div class="vf-journal-empty"><span class="vf-empty-book" aria-hidden="true">${fidelityIcon("journal")}</span><p>Choose a story to follow.</p><span>Its next objective and walking route will stay together.</span></div>`;
  const other = active.filter(record => record.id !== selected?.id);
  const activePage = current + (other.length ? `<section class="vf-journal-others" aria-label="Other active stories"><h3>Other stories <small>${other.length}</small></h3>${other.map(record => row(state, record, followed, portrait)).join("")}</section>` : "");
  const discovery = discover.length ? discover.map(record => row(state, record, followed, portrait)).join("") : '<div class="vf-journal-empty"><p>No new stories are ready just now.</p><span>Help a neighbour or follow your current story.</span></div>';
  const later = locked.length ? `<details class="vf-later-stories" data-vg-details-key="objectives:later"><summary>Coming later <small>${locked.length}</small></summary>${locked.map(record => `<div class="vf-locked-story" data-vg-locked-story="${esc(record.id)}"><small>${esc(byline(record))}</small><b>${esc(record.title)}</b><p>${esc(record.reason)}</p></div>`).join("")}</details>` : "";
  const completed = done.length ? `<div class="vf-completed-list" data-vg-details-key="objectives:finished">${done.map(record => `<details class="vf-completed-story" data-vg-details-key="completed:${esc(record.id)}" data-vg-finished-story="${esc(record.id)}"><summary><span aria-hidden="true">✓</span><span><small>${esc(short(record.giver))} · Complete</small><b>${esc(record.title)}</b></span><i aria-hidden="true">⌄</i></summary><div><small>Rewards received</small>${record.chapter?.change ? `<p>${esc(record.chapter.change)}</p>` : ""}${rewards(record)}</div></details>`).join("")}</div>${friendshipKeepsakesMarkup(state)}` : '<div class="vf-journal-empty"><p>Your stories are still unfolding.</p><span>Completed chapters and their keepsakes will be recorded here.</span></div>';
  const panels = [["active", activePage], ["discover", discovery + later], ["completed", completed]].map(([id, html]) => `<section id="vf-page-${id}" class="vf-journal-page" role="tabpanel" aria-labelledby="vf-tab-${id}" tabindex="0"${id === selectedTab ? "" : " hidden"} data-pad-skip>${html}</section>`).join("");
  const html = `<section class="vg-journal vf-journal" aria-label="Village stories"><div class="vf-journal-seal" aria-hidden="true">${fidelityIcon("moth")}<span></span></div>${who ? `<div class="vf-journal-person"><span>Stories with ${esc(short(who))}</span><button class="vg-ch-action" data-vg-page="journal">All stories</button></div>` : ""}<div class="vf-journal-tabs" role="tablist" aria-label="Journal chapters">${tabs}</div>${panels}<details class="vf-journal-help" data-vg-details-key="explore-help"><summary>Journal notes &amp; village tour</summary><p>Following a story keeps its objective on screen. Talk beside your neighbour to begin a story or hand things over.</p><div><button class="vg-ch-action" data-vg-page="almanac">Almanac</button><button class="vg-ch-action" data-vg-page="materials">Satchel</button><button class="vg-ch-action" data-vg-tour>Take Elowen’s tour</button></div></details></section>`;
  return { title: "Village journal", tag: who ? `Stories with ${short(who)}` : "", html };
}
