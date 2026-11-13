// Owner-by-owner farm training and the little heat gauge beside Boost.
import * as M from '../model.js';
import { money } from './kit.js';
import { serviceNav } from './service-kit.js';

const OWNERS = [['shane', 'Shane'], ['natalie', 'Natalie']];
const TRAINING = {
  plant: ['Quicker planting', 'plant', 'Planting'],
  water: ['Quicker watering', 'tools', 'Watering'],
  capacity: ['A bigger picking basket', 'stock', 'Picking'],
};
const secs = n => `${Math.round(n * 10) / 10}s`;
const slots = n => `${n} ${n === 1 ? 'plot' : 'plots'}`;
const pips = (level, max) => `<span class="farm-work-pips" role="img" aria-label="Tier ${level} of ${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</span>`;
const art = id => `<span class="farm-work-art" aria-hidden="true"><span class="ico i-${id}"></span></span>`;

// Metadata owns prices and level gates; the UI never infers whether a buy is valid.
function purchase(s, info, attr, value, label) {
  if (info.done) return `<span class="farm-work-owned">Fully trained</span>`;
  if (!info.unlocked) return `<button class="button farm-buy" disabled>Level ${info.requiredLevel}</button>`;
  const short = Math.max(0, info.cost - s.coins);
  return `<button class="button gold purchase-button farm-buy" data-${attr}="${value}" ${s.paused || short ? 'disabled' : ''} aria-label="${label}, ${money(info.cost)}">${money(info.cost)}${short ? `<small>need ${money(short)}</small>` : ''}</button>`;
}

// A preview changes only the chosen tier in a shallow rule-state copy.
function nextHelper(s, who, kind) {
  const work = s.farmWork;
  return M.helperStatus({ ...s, farmWork: { ...work, helpers: { ...work.helpers, [who]: { ...work.helpers[who], [kind]: work.helpers[who][kind] + 1 } } } }, who);
}
function nextBoost(s, kind) {
  const work = s.farmWork;
  return M.boostStatus({ ...s, farmWork: { ...work, boost: { ...work.boost, [kind]: work.boost[kind] + 1 } } });
}

export const farmWorkTabs = current => serviceNav('farm-section', 'Farm upgrade sections', [['patch', 'Patch'], ['helpers', 'Helping hands'], ['boost', 'Boost']], current);

// Two portrait-led cards keep each owner's purchase and skills together.
export function helperUpgradeCards(s, ui) {
  const cards = OWNERS.map(([who, name]) => {
    const now = M.helperStatus(s, who), hire = M.helperUpgradeInfo(s, who, 'hire'), portrait = ui.portrait(who);
    const head = `<header class="farm-helper-head"><span class="farm-helper-face">${portrait ? `<img src="${portrait}" alt="">` : art('auto')}</span><div><h3>${name}</h3><span class="farm-helper-state${now.hired ? ' is-hired' : ''}">${now.hired ? 'Helping hand' : 'Ready to help'}</span></div>${!now.hired ? purchase(s, hire, 'helper-buy', `${who}:hire`, `Hire ${name}`) : ''}</header>`;
    const metrics = `<div class="farm-helper-metrics"><span><b>${secs(now.plantSeconds)}</b>plant</span><span><b>${secs(now.waterSeconds)}</b>water</span><span><b>${slots(now.capacity)}</b>per pick</span></div>`;
    if (!now.hired) return `<article class="farm-helper-card">${head}<p class="farm-helper-invite">Plant, water and pick with ${name}. Hire once, then train their skills separately.</p>${metrics}</article>`;
    const rows = Object.entries(TRAINING).map(([kind, [label, icon, verb]]) => {
      const info = M.helperUpgradeInfo(s, who, kind), next = !info.done ? nextHelper(s, who, kind) : null;
      const value = status => kind === 'capacity' ? slots(status.capacity) : secs(kind === 'plant' ? status.plantSeconds : status.waterSeconds);
      const effect = next ? `${value(now)} <span aria-hidden="true">→</span> <b>${value(next)}</b>${kind === 'capacity' ? ' per pick' : ' per plot'}` : `${value(now)}${kind === 'capacity' ? ' per pick' : ' per plot'}`;
      return `<div class="farm-training-row">${art(icon)}<div class="farm-training-copy"><h4>${label}</h4><p>${effect}</p>${pips(info.level, info.max)}</div>${purchase(s, info, 'helper-buy', `${who}:${kind}`, `${name}: ${verb}`)}</div>`;
    }).join('');
    return `<article class="farm-helper-card">${head}${metrics}<div class="farm-training">${rows}</div></article>`;
  }).join('');
  return `<div class="farm-work farm-helping-hands"><div class="farm-work-intro"><h3>A little teamwork</h3><p>One helping hand for each of you. Skills belong to that character, including when you take control.</p></div><div class="farm-helper-list">${cards}</div><p class="farm-work-footnote">Helping hands rest while you play. Ripe crops wait a moment for your own picking streak; a full barn keeps the crop safe.</p></div>`;
}

// Upgrades show exact before/after effects, not a second live heat display.
export function boostUpgradeCards(s) {
  const now = M.boostStatus(s);
  const cards = ['power', 'cooling'].map(kind => {
    const info = M.boostUpgradeInfo(s, kind), next = !info.done ? nextBoost(s, kind) : null;
    const title = kind === 'power' ? 'Pumpkin power' : 'Keep your cool';
    const description = kind === 'power' ? 'More growth from every accepted boost.' : 'Use less heat, then cool down faster between boosts.';
    const effect = kind === 'power'
      ? `<span>Growth per boost</span><b>×${now.strength}${next ? ` <span aria-hidden="true">→</span> ×${next.strength}` : ''}</b>`
      : `<span>Heat per boost</span><b>${now.heatPerUse}%${next ? ` <span aria-hidden="true">→</span> ${next.heatPerUse}%` : ''}</b><span>Cooling per second</span><b>${now.coolPerSecond}%${next ? ` <span aria-hidden="true">→</span> ${next.coolPerSecond}%` : ''}</b>`;
    return `<article class="farm-boost-card"><header>${art(kind === 'power' ? 'boost' : 'tools')}<div><h3>${title}</h3><p>${description}</p></div></header><div class="farm-boost-effects">${effect}</div><footer>${pips(info.level, info.max)}${purchase(s, info, 'boost-buy', kind, title)}</footer></article>`;
  }).join('');
  return `<div class="farm-work farm-boost-upgrades"><div class="farm-work-intro"><h3>A spark, not a sprint</h3><p>The dial beside Boost fills with each use. At 100% it overheats; let it fall to 35% before boosting again.</p></div><div class="farm-boost-list">${cards}</div><p class="farm-work-footnote">Heat cools during play and rests during a tea break. Upgrades improve each use; they never remove the limit.</p></div>`;
}

export function bindFarmWorkPurchases(body, ui) {
  body.querySelectorAll('[data-helper-buy]').forEach(button => button.onclick = () => {
    const [who, kind] = button.dataset.helperBuy.split(':');
    if (!M.buyHelperUpgrade(ui.state, who, kind)) return;
    const name = OWNERS.find(([id]) => id === who)?.[1] ?? who;
    ui.tone(820); ui.notice(kind === 'hire' ? `${name} is ready to lend a hand.` : `${name}’s ${kind === 'capacity' ? 'picking basket' : kind === 'plant' ? 'planting' : 'watering'} improved.`);
    ui.save?.(); ui.draw();
  });
  body.querySelectorAll('[data-boost-buy]').forEach(button => button.onclick = () => {
    if (!M.buyBoostUpgrade(ui.state, button.dataset.boostBuy)) return;
    ui.tone(820); ui.notice(button.dataset.boostBuy === 'power' ? 'A little more pumpkin power.' : 'Boost cooling improved.');
    ui.save?.(); ui.draw();
  });
}

const dialRefs = new WeakMap();
export const boostDialMarkup = () => `<span class="boost-dial" aria-hidden="true"><svg viewBox="0 0 42 24" focusable="false"><path class="boost-dial-track" d="M5 21a16 16 0 0 1 32 0"/><path class="boost-dial-danger" d="M32.3 9.7A16 16 0 0 1 37 21"/><g class="boost-dial-needle" transform="rotate(-80 21 20)"><path d="M21 20V7"/><circle cx="21" cy="20" r="2"/></g></svg><span class="boost-dial-value">0%</span></span>`;

// Mount once: event listeners, keyboard focus and the button node stay intact.
export function mountBoostDial(button) {
  if (!button || dialRefs.has(button)) return;
  const label = document.createElement('span'); label.className = 'boost-button-label';
  for (const child of [...button.childNodes]) if (child.nodeType === 3 && child.textContent.trim()) { label.textContent = child.textContent.trim(); child.replaceWith(label); break; }
  if (!label.isConnected) { label.textContent = 'Boost'; button.append(label); }
  button.insertAdjacentHTML('beforeend', boostDialMarkup()); button.classList.add('boost-with-dial');
  dialRefs.set(button, { label, needle: button.querySelector('.boost-dial-needle'), value: button.querySelector('.boost-dial-value'), key: '' });
}

export function renderBoostDial(button, status) {
  if (!button || !status) return;
  mountBoostDial(button);
  const refs = dialRefs.get(button), heat = Math.max(0, Math.min(100, Number(status.heat) || 0)), hot = !!status.overheated;
  refs.needle.setAttribute('transform', `rotate(${(heat * 1.6 - 80).toFixed(1)} 21 20)`);
  const key = `${Math.round(heat)}:${hot}`;
  if (key === refs.key) return;
  refs.key = key; refs.value.textContent = `${Math.round(heat)}%`; refs.label.textContent = hot ? 'Cooling' : 'Boost';
  button.classList.toggle('is-overheated', hot); button.classList.toggle('is-hot', heat >= 80);
  button.setAttribute('aria-label', hot ? `Boost cooling: ${Math.round(heat)}% heat. Ready again at 35%.` : `Boost crops. Heat ${Math.round(heat)}%; overheats at 100%.`);
  button.title = hot ? 'Cooling down — ready again at 35% heat' : `Boost growth · ${Math.round(heat)}% heat`;
}
