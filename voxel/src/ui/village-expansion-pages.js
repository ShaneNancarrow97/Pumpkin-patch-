// Read-only expansion pages. World interactions and transactions stay in the
// village controller; browsing a reward or a locked route cannot award it.
import { villageUIIcon } from './village-ui-icon-markup.js';
import { expansionIcon } from './village-expansion-icon-markup.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const button = (label, attrs = '', disabled = false) => `<button type="button" class="vgx-action" ${attrs}${disabled ? ' disabled' : ''}>${label}</button>`;
const list = value => Array.isArray(value) ? value : [];
const open = c => c.status === 'available' || c.status === 'active';

// What each kind of reward is for, so a row reads "For your home · Moth lamp" rather than a bare name.
const REWARD_KINDS = { coins: 'Coins', decor: 'For your home', 'village-decor': 'For the village', 'estate-decor': 'For your garden', costume: 'Outfit', recipe: 'Recipe', blueprint: 'Blueprint', material: 'Supplies', benefit: 'Opens' };
export const expansionRewardMarkup = rewards => {
  const rows = list(rewards).filter(r => REWARD_KINDS[r.kind] || r.name || r.title);
  if (!rows.length) return '';
  return `<div class="vgx-rewards" aria-label="Rewards">${rows.map(r => {
    const label = r.kind === 'coins' ? `£${r.amount ?? ''}` : `${r.amount > 1 ? r.amount + ' × ' : ''}${r.name ?? r.title ?? r.label ?? r.id?.replaceAll('-', ' ') ?? 'A keepsake'}`;
    return `<span class="vgx-reward-${esc(r.kind)}"><small>${esc(REWARD_KINDS[r.kind] ?? 'A keepsake')}</small><b>${esc(label)}</b></span>`;
  }).join('')}</div>`;
};

const face = (c, portrait) => { const url = portrait?.(c.giver ?? c.who); return `<span class="vgx-story-face" aria-hidden="true">${url ? `<img src="${esc(url)}" alt="">` : esc((c.giverName ?? c.who ?? 'M')[0].toUpperCase())}</span>`; };
const byline = c => [c.giverName, c.areaName ?? c.area].filter(Boolean).map(esc).join(' · ');

// A chapter's steps as a checklist: done, the one to do now, and what follows.
function stepsMarkup(c) {
  const steps = list(c.steps);
  if (!steps.length) { const next = c.next?.name ?? c.next?.text ?? c.nextText; return next ? `<p class="vgx-next"><small>Next step</small><b>${esc(next)}</b></p>` : ''; }
  return `<ol class="vgx-steps" aria-label="Steps">${steps.map(step => `<li class="${step.done ? 'is-done' : step.current ? 'is-current' : 'is-later'}"><i aria-hidden="true">${step.done ? '✓' : step.current ? '➤' : ''}</i><span>${esc(step.name)}${step.current && step.area && step.area !== c.area ? `<small>${esc(step.areaName ?? step.area)}</small>` : ''}</span>${step.done ? '<em class="vgx-visually-hidden">done</em>' : step.current ? '<em class="vgx-visually-hidden">next</em>' : ''}</li>`).join('')}</ol>`;
}
// What still stands in the way of the current step, when it is not simply "go there".
const blocker = c => { const reason = c.next?.reason; return reason && reason !== 'Ready' && c.next?.canAct === false ? `<p class="vgx-need">${esc(reason)}</p>` : ''; };

function storyCard(c, tracked, portrait) {
  const following = tracked === c.id;
  return `<article class="vgx-story-card${following ? ' is-following' : ''}" data-vgx-chapter="${esc(c.id)}"><header>${face(c, portrait)}<div><small>${following ? 'Following · ' : ''}${byline(c)}</small><h3>${esc(c.title)}</h3></div><span class="vgx-story-count" aria-label="${c.completed ?? 0} of ${c.need ?? 1} steps done">${c.completed ?? 0}/${c.need ?? 1}</span></header><p class="vgx-story-blurb">${esc(c.description ?? c.blurb)}</p>${stepsMarkup(c)}${blocker(c)}${expansionRewardMarkup(c.rewards)}<div class="vgx-actions">${button(following ? '✓ Following' : 'Follow chapter', `data-vgx-track="${esc(c.id)}" aria-pressed="${following}"`)}${button('Show the way', `data-vgx-guide="${esc(c.id)}"${following ? ' data-pad-default' : ''}`)}</div></article>`;
}
const lockedRow = c => `<div class="vgx-locked"><b>${esc(c.title)}</b><small><i aria-hidden="true">🔒</i> ${esc(c.reason ?? `Reach farm level ${c.level}.`)}</small></div>`;
const finishedRow = c => `<div class="vgx-finished-row"><i aria-hidden="true">✓</i><span><b>${esc(c.title)}</b>${c.change ? `<small>${esc(c.change)}</small>` : ''}</span></div>`;

// One neighbour's optional stories: where they are up to, their open story in full, or what opens the next.
function neighbourMarkup(who, chapters, tracked, portrait) {
  const done = chapters.filter(c => c.status === 'done').length, current = chapters.find(c => c.status !== 'done');
  const head = `<header class="vgx-neighbour-head">${face(chapters[0], portrait)}<div><b>${esc(chapters[0].giverName ?? who)}</b><small>${done} of ${chapters.length} stories shared</small></div></header>`;
  if (!current) return `<section class="vgx-neighbour">${head}<p class="vgx-complete">✓ A lifelong friend. Every story is told.</p></section>`;
  return `<section class="vgx-neighbour">${head}${open(current) ? storyCard(current, tracked, null) : lockedRow(current)}</section>`;
}

// The journal's story pages: Mothlight's main story first and in full, then each neighbour's own stories.
export function expansionJournalMarkup(chapters, tracked, { compact = false, portrait = null } = {}) {
  if (!list(chapters).length) return '';
  const main = chapters.filter(c => !c.optional), personal = chapters.filter(c => c.optional), done = main.filter(c => c.status === 'done');
  const current = main.filter(open).sort((a, b) => Number(b.id === tracked) - Number(a.id === tracked));
  const locked = main.filter(c => c.status === 'locked'), followedPersonal = personal.find(c => c.id === tracked && open(c));
  if (compact) return `<section class="vgx-journal vgx-journal-compact">${[...current, ...(followedPersonal ? [followedPersonal] : [])].filter(c => c.id === tracked).map(c => storyCard(c, tracked, portrait)).join('')}</section>`;
  const head = `<header class="vgx-section-head">${villageUIIcon('quests', 32)}<div><small>Mothlight’s story</small><h3>The village that forgot to knock</h3><p>${done.length} of ${main.length} story chapters restored</p></div></header><div class="vgx-story-meter" role="img" aria-label="${done.length} of ${main.length} chapters"><i style="width:${main.length ? Math.round(done.length / main.length * 100) : 0}%"></i></div>`;
  const now = current.length ? current.map(c => storyCard(c, tracked, portrait)).join('') : locked.length ? `<p class="vgx-empty">The next chapter is not open yet. ${esc(locked[0].reason ?? '')}</p>` : '<p class="vgx-empty">Every chapter is told. Mothlight remembers.</p>';
  const coming = locked.length ? `<section class="vgx-coming" aria-label="Coming next"><h4>Coming next</h4>${locked.slice(0, 3).map(lockedRow).join('')}${locked.length > 3 ? `<p class="vgx-more">and ${locked.length - 3} later chapters</p>` : ''}</section>` : '';
  const finished = done.length ? `<details class="vgx-finished" data-vg-details-key="expansion:finished"><summary>Finished chapters <small>${done.length}</small><i aria-hidden="true">⌄</i></summary>${done.map(finishedRow).join('')}</details>` : '';
  const givers = [...new Set(personal.map(c => c.giver ?? c.who))];
  const neighbours = personal.length ? `<details class="vgx-neighbour-stories" data-vg-details-key="expansion:neighbour-stories"${followedPersonal ? ' open' : ''}><summary>Neighbour stories <small>Optional friendships · ${personal.filter(c => c.status === 'done').length} of ${personal.length} shared</small><i aria-hidden="true">⌄</i></summary><p>Get to know your neighbours at your own pace. Their stories bring personal keepsakes home.</p>${givers.map(who => neighbourMarkup(who, personal.filter(c => (c.giver ?? c.who) === who), tracked, portrait)).join('')}</details>` : '';
  return `<section class="vgx-journal" aria-label="The village that forgot to knock">${head}${now}${coming}${finished}${neighbours}</section>`;
}

export function expansionMapMarkup(areas, current) {
  return `<section class="vgx-route-book"><header class="vgx-section-head">${villageUIIcon('map', 32)}<div><small>Beyond the lantern path</small><h3>Places to discover</h3><p>Choose a place to see its route and requirements.</p></div></header><div class="vgx-area-grid">${list(areas).map(a => `<button type="button" class="vgx-area ${a.open || a.unlocked ? 'is-open' : ''}" data-vgx-area="${esc(a.id)}" aria-label="${esc(a.name)}${a.open || a.unlocked ? '' : ', locked'}"><span class="vgx-area-seal" aria-hidden="true">${expansionIcon(a.id.startsWith('cave') ? 'cave' : a.id === 'acre' ? 'scarecrow-maze' : a.id === 'moor' ? 'festival' : 'restoration', 32)}</span><span><b>${esc(a.name)}</b><small>${current === a.id ? 'You are here' : a.open || a.unlocked ? 'Path open' : a.reason ?? `Level ${a.level}`}</small></span><i aria-hidden="true">›</i></button>`).join('')}</div></section>`;
}

// What the step's own button says. A farm errand is accepted first and reported back afterwards.
function actLabel(info, type) {
  if (type === 'farm') return info.started ? info.verb ?? 'Report back' : 'I’ll see to it';
  return info.verb ?? (['mine', 'vein', 'story-vein'].includes(type) ? 'Mine this vein' : type === 'build' || type === 'restore' ? 'Restore this place' : type === 'talk' ? 'Continue the story' : 'Look closer');
}
const costMarkup = info => list(info.costRows).length ? `<ul class="vgx-costs" aria-label="What this needs">${info.costRows.map(r => `<li class="${r.have >= r.need ? 'is-met' : ''}"><span>${esc(String(r.id).replaceAll('-', ' '))}</span><b>${Math.min(r.have, r.need)}/${r.need}</b></li>`).join('')}</ul>` : '';

export function expansionActivityMarkup(info, { nearby = false, slot = null } = {}) {
  if (!info) return { title: 'A place waiting for its story', tag: 'Mothlight', html: '<p>Follow the lanterns to another discovery.</p>' };
  const options = list(info.options ?? info.choices), type = info.type ?? info.kind, complete = info.done || info.status === 'done', puzzle = type === 'puzzle';
  let controls = '';
  if (!nearby) controls = button('Show the way', `data-vgx-find-activity="${esc(info.id)}" data-pad-default`);
  else if (complete) controls = '<p class="vgx-complete">✓ Done. This is part of your story now.</p>';
  else if (info.canAct === false) controls = type === 'farm' && info.started ? '' : '<p class="vgx-complete">Come back when you have what this needs.</p>';
  else if (list(info.styleChoices).length) controls = `<p class="vgx-board-note">Choose a colour for this memory. Every choice has the same rewards.</p><div class="vgx-puzzle-options">${info.styleChoices.map(style => button(esc(style), `data-vgx-style="${esc(style)}" data-vgx-activity="${esc(info.id)}"`)).join('')}</div>`;
  else if (info.puzzleKind === 'light-route') {
    controls = `<p class="vgx-board-note">Turn each mirror until the beam runs from the lamp to the star.</p><p class="vgx-light-route"><span>☀ Lamp · row ${(info.source?.y ?? 0) + 1} →</span><span>★ Star · row ${(info.exit?.y ?? 1) + 1}</span></p><div class="vgx-light-board" role="group" aria-label="Lantern mirror board">${list(info.components).map(c => `<button class="vgx-conduit" type="button" data-vgx-rotate="${esc(c.id)}" data-vgx-activity="${esc(info.id)}" style="--conduit-turn:${(info.rotations?.[c.id] ?? 0) * 90}deg;grid-column:${c.x + 1};grid-row:${c.y + 1}" aria-label="Turn ${esc(c.label ?? c.id)}, ${((info.rotations?.[c.id] ?? 0) % 4) * 90} degrees"><i aria-hidden="true">${c.shape === 'straight' ? '━' : '┗'}</i><small>${esc(c.label ?? c.id)}</small></button>`).join('')}</div><div class="vgx-actions">${button('Send the light', `data-vgx-submit="${esc(info.id)}"`)}${button('Reset board', `data-vgx-reset="${esc(info.id)}"`)}</div>`;
  } else if (info.puzzleKind === 'flavour-set') {
    controls = `<p class="vgx-board-note">Choose everything that belongs. The order does not matter.</p><div class="vgx-puzzle-options vgx-ingredient-grid" role="group" aria-label="Choose what belongs">${options.map((o, i) => { const value = typeof o === 'string' ? o : o.id ?? String(i), chosen = list(info.selected).includes(value); return button(`${chosen ? '✓ ' : ''}${esc(typeof o === 'string' ? o : o.label ?? value)}`, `data-vgx-choice="${esc(value)}" data-vgx-activity="${esc(info.id)}" aria-pressed="${chosen}"`); }).join('')}</div><div class="vgx-actions">${button('Try this combination', `data-vgx-submit="${esc(info.id)}"`)}${button('Clear choices', `data-vgx-reset="${esc(info.id)}"`)}</div>`;
  } else if (info.puzzleKind === 'stage-slots') {
    const selected = list(info.slots).includes(slot) ? slot : info.slots?.[0];
    controls = `<p class="vgx-board-note">Give each place its own piece. Pick a place, then what goes there.</p><div class="vgx-stage-slots" role="group" aria-label="Choose a place">${list(info.slots).map(name => button(`<small>${esc(name)}</small><b>${esc(info.assignments?.[name] ?? 'Empty')}</b>`, `data-vgx-slot="${esc(name)}" aria-pressed="${name === selected}"`)).join('')}</div><p class="vgx-board-note">What goes in <b>${esc(selected)}</b>?</p><div class="vgx-puzzle-options">${options.map((o, i) => { const value = typeof o === 'string' ? o : o.id ?? String(i); return button(esc(typeof o === 'string' ? o : o.label ?? value), `data-vgx-choice="${esc(value)}" data-vgx-activity="${esc(info.id)}" data-vgx-target-slot="${esc(selected)}"`); }).join('')}</div><div class="vgx-actions">${button('Rehearse the scene', `data-vgx-submit="${esc(info.id)}"`)}${button('Reset places', `data-vgx-reset="${esc(info.id)}"`)}</div>`;
  } else if (options.length) controls = `<p class="vgx-board-note">Choose them in the right order.</p><div class="vgx-puzzle-options" role="group" aria-label="Choose in order">${options.map((o, i) => button(esc(typeof o === 'string' ? o : o.label ?? o.name ?? o.text ?? o.id), `data-vgx-choice="${esc(typeof o === 'string' ? String(i) : o.id ?? String(i))}" data-vgx-activity="${esc(info.id)}"`, !!info.blocked)).join('')}</div>${list(info.selected).length ? `<div class="vgx-actions">${button('Start again', `data-vgx-reset="${esc(info.id)}"`)}</div>` : ''}`;
  else controls = `<div class="vgx-actions">${button(esc(actLabel(info, type)), `data-vgx-act="${esc(info.id)}" data-pad-default`, info.canAct === false || !!info.blocked)}</div>`;
  const icon = expansionIcon(['mine', 'vein', 'story-vein'].includes(type) ? info.gem ?? 'gemcraft' : puzzle ? 'ward' : type === 'reveal' ? 'festival' : 'restoration', 56);
  const tag = info.chapterTitle ? `${info.chapterTitle}${info.steps ? ` · Step ${info.step} of ${info.steps}` : ''}` : info.areaName ?? 'Mothlight mystery';
  const reason = info.reason && info.reason !== 'Ready' && !complete ? `<p class="vgx-need">${esc(info.reason)}</p>` : '';
  const clue = puzzle && !complete && info.clue ? `<div class="vgx-clue"><small>What you know</small><p>${esc(info.clue)}</p></div>` : info.clue && !puzzle ? `<blockquote>${esc(info.clue)}</blockquote>` : '';
  const picked = info.selected?.length && (!info.puzzleKind || info.puzzleKind === 'sequence') ? `<p class="vgx-selected-pattern" aria-live="polite"><small>So far</small> ${info.selected.map(esc).join(' → ')}</p>` : '';
  const errand = type === 'farm' && nearby && !complete && info.started && info.canAct === false ? `<div class="vgx-actions">${button('Return to your farm', 'data-vg-home data-pad-default')}</div>` : '';
  const help = puzzle && nearby && !complete ? `<details class="vgx-help" data-vg-details-key="puzzle-help:${esc(info.id)}"><summary>A little help</summary><p>${esc(info.hint ?? 'Look closely at the objects around you. Their shapes and order tell a story.')}</p>${button('Show me the solution', `data-vgx-solve="${esc(info.id)}"`)}</details>` : '';
  const found = complete && info.found ? `<div class="vgx-found"><small>What you found</small><p>${esc(info.found)}</p></div>` : '';
  return { title: info.name ?? info.title ?? 'A new discovery', tag, html: `<section class="vgx-activity"><div class="vgx-activity-seal" aria-hidden="true">${icon}</div><p class="vgx-description">${esc(info.description ?? info.text ?? info.blurb)}</p>${reason}${costMarkup(info)}${clue}${picked}${controls}${errand}${found}${help}${expansionRewardMarkup(info.rewards)}</section>` };
}

// The card shown for a few seconds when a chapter ends: what changed, what it brought, and what comes next.
export function expansionReceiptMarkup({ title, change, rewards, next } = {}) {
  return `<small>Chapter complete</small><h3>${esc(title ?? 'Village chapter')}</h3><p>${esc(change ?? 'The village remembers what you did.')}</p>${expansionRewardMarkup(rewards)}${next ? `<p class="vgx-receipt-next"><small>${next.open ? 'Next chapter' : 'Coming next'}</small><b>${esc(next.title)}</b>${next.open ? '' : `<span>${esc(next.reason ?? '')}</span>`}</p>` : ''}`;
}
