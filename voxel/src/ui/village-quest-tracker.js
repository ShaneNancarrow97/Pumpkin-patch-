// Read-only checklist art for the followed story. Rule-provided completion is
// authoritative; this view never advances a quest or consumes its materials.
import { villageUIIcon } from './village-ui-icon-markup.js';
import { villageItemIcon } from './village-item-markup.js';
import { ps5Icon } from './dualsense-icons.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

// Standard D-pad Up applies to PS5 and generic mapped pads. The existing input
// source attribute selects keyboard/touch hints without another input listener.
export function trackerToggleHintMarkup() {
  return `<span class="vg-quest-toggle-mark" aria-hidden="true"><span class="vg-quest-chevron">⌄</span><small class="vg-quest-shortcut-pad">${ps5Icon('up',26)}</small><kbd class="vg-quest-keycap">T</kbd></span>`;
}

export function trackerPortraitMarkup(quest, portraitURL) {
  const image = typeof portraitURL === 'string' && /^(data:image\/|blob:|https?:\/)/.test(portraitURL);
  return image ? `<img src="${esc(portraitURL)}" alt="">` : villageUIIcon('quests', 32);
}

export function trackerDetailsMarkup(rows = [], hint = '') {
  const list = Array.isArray(rows) ? rows : [];
  const checklist = list.length ? `<ul class="vg-quest-requirements" aria-label="Current quest requirements">${list.map(row => {
    const key = String(row.key ?? ''), material = key.startsWith('blight:') ? 'cursed-spores' : key.replace(/^material:/, '');
    const need = count(row.need), have = Math.min(need, count(row.have));
    const amount = key === 'coins' ? `£${have.toLocaleString('en-GB')} / £${need.toLocaleString('en-GB')}` : `${have} / ${need}`;
    return `<li class="${row.complete ? 'is-ready' : ''}" data-quest-requirement="${esc(key)}"><span class="vg-quest-check" aria-hidden="true">${row.complete ? '✓' : '○'}</span><span class="vg-quest-requirement-label">${villageItemIcon(material)}<span>${esc(row.label)}</span></span><b>${amount}</b><span class="sr">${row.complete ? 'Complete' : 'Still needed'}</span></li>`;
  }).join('')}</ul>` : '';
  return `${checklist}${hint ? `<p class="vg-quest-help">${esc(hint)}</p>` : ''}<button id="vg-quest-journal">Open quests <span aria-hidden="true">›</span></button>`;
}
