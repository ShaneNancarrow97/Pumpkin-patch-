// Shared management surfaces keep the farm visible and the next action clear.
export const serviceNav = (name, label, items, current) => `<nav class="service-nav segmented" role="group" aria-label="${label}">${items.map(([id,title])=>`<button type="button" data-${name}="${id}" aria-pressed="${id===current}">${title}</button>`).join('')}</nav>`;
export const serviceHeading = (title, detail='') => `<div class="service-section-heading"><h3>${title}</h3>${detail?`<span>${detail}</span>`:''}</div>`;
export const serviceMetrics = items => `<div class="service-metrics">${items.map(([value,label])=>`<div><b>${value}</b><span>${label}</span></div>`).join('')}</div>`;
export const serviceNotice = (title, detail, action='') => `<aside class="service-next"><div><b>${title}</b><p>${detail}</p></div>${action}</aside>`;
export const SERVICE_OUT='<svg class="service-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 12 8-8M4 4h8v8"/></svg>';
export const SERVICE_BACK='<svg class="service-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3m4-4L3 8l4 4"/></svg>';
export const SERVICE_RIGHT='<svg class="service-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
