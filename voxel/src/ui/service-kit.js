// Shared management surfaces keep the farm visible and the next action clear.
export const serviceNav = (name, label, items, current) => `<nav class="service-nav segmented" role="group" aria-label="${label}">${items.map(([id,title])=>`<button type="button" data-${name}="${id}" aria-pressed="${id===current}">${title}</button>`).join('')}</nav>`;
export const serviceHeading = (title, detail='') => `<div class="service-section-heading"><h3>${title}</h3>${detail?`<span>${detail}</span>`:''}</div>`;
export const serviceMetrics = items => `<div class="service-metrics">${items.map(([value,label])=>`<div><b>${value}</b><span>${label}</span></div>`).join('')}</div>`;
export const serviceNotice = (title, detail, action='') => `<aside class="service-next"><div><b>${title}</b><p>${detail}</p></div>${action}</aside>`;
export const SERVICE_OUT='<svg class="service-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 12 8-8M4 4h8v8"/></svg>';
export const SERVICE_BACK='<svg class="service-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3m4-4L3 8l4 4"/></svg>';
export const SERVICE_RIGHT='<svg class="service-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';

// Line icons for the service tabs, drawn on a 24-unit grid in the tab's colour.
const TAB_ICONS = {
  cook: '<path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-3Zm-2 0h20M9 7c0-2 2-2 2-4m3 4c0-2 2-2 2-4"/>',
  supplies: '<path d="M3 8l9-4 9 4v9l-9 4-9-4V8Zm0 0 9 4 9-4m-9 4v9M7.5 6l9 4"/>',
  food: '<path d="M3 12V4h8l10 10-8 8L3 12Zm5-4h.01"/>',
  improve: '<path d="M12 20V6m-6 6 6-6 6 6M5 3h14"/>',
  menu: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9Zm11 1h2a2 2 0 0 1 0 4h-2M8 3c0 2 2 2 2 4m3-4c0 2 2 2 2 4"/>',
  helpers: '<path d="M12 12c-3-5-8-4-8 0 0 3 4 3 8 0Zm0 0c3-5 8-4 8 0 0 3-4 3-8 0Zm0 0v8M10 4l2 3 2-3"/>',
  upgrade: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z"/>',
};
export const tabIcon = (id) => TAB_ICONS[id] ? `<svg class="service-tab-icon" viewBox="0 0 24 24" aria-hidden="true">${TAB_ICONS[id]}</svg>` : "";
// The section tabs with an icon over each label, so they read at a glance.
export const serviceTabs = (name, label, items, current) => `<nav class="service-nav service-tabs segmented" role="group" aria-label="${label}">${items.map(([id, title, icon]) => `<button type="button" data-${name}="${id}" aria-pressed="${id === current}">${tabIcon(icon ?? id)}<span>${title}</span></button>`).join("")}</nav>`;
// A price you nudge a step at a time: wide targets, and the price stays in view.
// attrs(value) returns the attributes that set that price when pressed.
export const priceStepper = ({ label, value, min, max, attrs, text = String, wrap = "", disabled = false }) =>
  `<div class="price-stepper" role="group" aria-label="${label}" ${wrap}><button type="button" ${attrs(value - 1)} aria-label="Lower the price" ${disabled || value <= min ? "disabled" : ""}>−</button><output aria-live="polite">${text(value)}</output><button type="button" ${attrs(value + 1)} aria-label="Raise the price" ${disabled || value >= max ? "disabled" : ""}>+</button></div>`;
// A slim filled bar with its numbers, for stock against room.
export const stockMeter = (value, max, label) => `<div class="supply-meter" role="img" aria-label="${label}: ${value} of ${max}"><i style="--fill:${Math.max(0, Math.min(1, max ? value / max : 0)).toFixed(3)}"></i><span><b>${value}</b> / ${max} ${label}</span></div>`;
