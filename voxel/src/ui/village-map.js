// A measured map of the realm. Its roads, plots and district outlines come
// from the same coordinates as the world; selecting a gate never opens it.
import { DISTRICTS, DISTRICT_BY_ID, VILLAGE_BOUNDS, ROADS, PLOTS, FORAGE_AREAS, FIXTURES, ARRIVAL, BRIDGE, MATERIAL_BY_ID, NODES } from "../content/village.js";
import { QUEST_BY_ID } from "../content/village-quests.js";
import { patchLevel, districtOpen, stallOpen, nodeReady } from "../model.js";
import { villageItemIcon } from "./village-item-markup.js";
import { villageUIIcon } from "./village-ui-icon-markup.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const round = n => Math.round(n * 100) / 100;
const PAD = 10;
export const VILLAGE_MAP_SIZE = Object.freeze({ width: VILLAGE_BOUNDS.x1 - VILLAGE_BOUNDS.x0 + PAD * 2, height: VILLAGE_BOUNDS.z1 - VILLAGE_BOUNDS.z0 + PAD * 2 });
export const villageMapPoint = (x, z) => ({ x: round(x - VILLAGE_BOUNDS.x0 + PAD), y: round(VILLAGE_BOUNDS.z1 - z + PAD) });

const STORY_NAMES = Object.freeze({ footbridge: "Restore the Quarry footbridge", "restaurant-opening": "Open Cinder’s restaurant", "four-stories": "Complete the Four Stories chapter" });
const DISTRICT_ART = Object.freeze({ green: "moth-lamp", copse: "hardwood", quarry: "stone", moor: "moonstone", marsh: "star-amber" });
const DISTRICT_COPY = Object.freeze({
  green: "Your first neighbourhood: neighbours, quiet gardens and gathering trails.",
  copse: "A woodland neighbourhood for Mabel and Tansy, with hardwood and moth silk.",
  quarry: "Opal and Cinder’s planned neighbourhood, rich in iron and clay.",
  moor: "The road to Corvus and the Baron, with moonstone and emberbloom.",
  marsh: "The farthest chapter of Mothlight, where star amber waits in the mist.",
});
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="4" y="10" width="16" height="12" rx="3"/><path d="M12 15v3"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';

// A planned district still has a closed gate after its visible goals are met.
// districtOpen remains authoritative; the map never invents travel or a cost.
export function villageMapDistricts(state) {
  const level = patchLevel(state).level;
  return DISTRICTS.map(d => {
    const open = districtOpen(state, d.id), available = d.id === "green" || open;
    const quest = d.story && Object.hasOwn(QUEST_BY_ID, d.story) ? QUEST_BY_ID[d.story] : null;
    const rows = [{ key: "level", label: `Patch level ${d.level}`, complete: level >= d.level, value: `${level} / ${d.level}` }];
    if (d.id === "green") rows.push({ key: "invitation", label: "Accept Elowen’s invitation", complete: !!state.village.invited, value: state.village.invited ? "Received" : "Not yet" });
    else if (quest) rows.push({ key: "story", label: `Complete ${quest.title}`, complete: !!state.village.quests[quest.id]?.done, value: state.village.quests[quest.id]?.done ? "Complete" : "Not yet" });
    else rows.push({ key: "story", label: STORY_NAMES[d.story] ?? "Complete this district’s story", complete: false, planned: true, value: "Later story" });
    if (!available) rows.push({ key: "chapter", label: "This district’s playable chapter", complete: false, planned: true, value: "To come" });
    return { ...d, open, available, rows, art: DISTRICT_ART[d.id], description: DISTRICT_COPY[d.id], stateLabel: open ? "Explorable" : available ? "Invitation required" : "Locked · later chapter" };
  });
}

function centre(polygon) {
  // All current footprints are rectangles; using their bounds retains a
  // sensible label if a later outline becomes an irregular clearing.
  return { x: (Math.min(...polygon.map(p => p[0])) + Math.max(...polygon.map(p => p[0]))) / 2, z: (Math.min(...polygon.map(p => p[1])) + Math.max(...polygon.map(p => p[1]))) / 2 };
}
const svgPoints = points => points.map(([x, z]) => { const p = villageMapPoint(x, z); return `${p.x},${p.y}`; }).join(" ");
const rect = box => { const p = villageMapPoint(box.x0, box.z1); return `x="${p.x}" y="${p.y}" width="${round(box.x1 - box.x0)}" height="${round(box.z1 - box.z0)}"`; };
function mapGraphic(districts, selected, position, focusRegion = true) {
  const { width, height } = VILLAGE_MAP_SIZE;
  const at = (x, z) => { const p = villageMapPoint(x, z); return `cx="${p.x}" cy="${p.y}"`; };
  const hasPosition = Number.isFinite(position?.x) && Number.isFinite(position?.z) && position.x >= VILLAGE_BOUNDS.x0 && position.x <= VILLAGE_BOUNDS.x1 && position.z >= VILLAGE_BOUNDS.z0 && position.z <= VILLAGE_BOUNDS.z1;
  const player = hasPosition ? `<circle class="vg-map-player-aura" ${at(position.x, position.z)} r="6"/><circle class="vg-map-player" data-vg-map-position ${at(position.x, position.z)} r="2.7"/>` : "";
  const svg = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><defs><pattern id="vg-map-grain" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M2 3h.1m6 6h.1" stroke="#d8bfdf" stroke-opacity=".14" stroke-width="1"/></pattern></defs><rect class="vg-map-bed" x="0" y="0" width="${width}" height="${height}" rx="13"/><rect x="0" y="0" width="${width}" height="${height}" fill="url(#vg-map-grain)" rx="13"/>${districts.map(d => `<polygon class="vg-map-region${d.open ? " is-open" : " is-locked"}${d.id === selected ? " is-selected" : ""}" data-vg-map-polygon="${d.id}" points="${svgPoints(d.polygon)}"/>`).join("")}<rect class="vg-map-water" ${rect(BRIDGE.ravine)}/>${ROADS.map(road => `<polyline class="vg-map-road${road.kind === "forage" ? " is-forage" : ""}${road.kind === "future-spur" ? " is-future" : ""}" data-vg-map-road="${road.id}" points="${svgPoints(road.points)}" stroke-width="${round(Math.max(1.2, road.width * .4))}"/>`).join("")}${PLOTS.filter(p => p.kind !== "reservation").map(p => `<rect class="vg-map-building${p.district === "green" ? " is-open" : ""}" ${rect(p)} rx="1.6"/>`).join("")}${FORAGE_AREAS.map(a => `<rect class="vg-map-forage" ${rect(a)} rx="4"/>`).join("")}<ellipse class="vg-map-water" ${at(FIXTURES.pond.x, FIXTURES.pond.z)} rx="${round(FIXTURES.pond.w / 2)}" ry="${round(FIXTURES.pond.d / 2)}"/><circle class="vg-map-tree" ${at(FIXTURES.tree.x, FIXTURES.tree.z)} r="4.3"/><circle class="vg-map-stall" ${at(FIXTURES.stall.x, FIXTURES.stall.z)} r="2.2"/><circle class="vg-map-arrival" ${at(...ARRIVAL.back)} r="3"/>${player}<g class="vg-map-compass" transform="translate(${width - 15},${height - 23})"><path d="m0-10 3 9-3-2-3 2 3-9Z"/><text x="0" y="8" text-anchor="middle">N</text></g></svg>`;
  const pins = districts.map(d => {
    const c = centre(d.polygon), p = villageMapPoint(c.x, c.z), active = d.id === selected;
    return `<button class="vg-map-pin${d.open ? " is-open" : " is-locked"}${active ? " is-selected" : ""}" data-vg-map-district="${d.id}"${active && focusRegion ? " data-pad-default" : ""} aria-pressed="${active}" aria-label="${esc(d.name)} · ${esc(d.stateLabel)} · view requirements" style="--map-x:${round(p.x / width * 100)}%;--map-y:${round(p.y / height * 100)}%"><span class="vg-map-pin-art">${villageItemIcon(d.art)}<i>${d.open ? CHECK : villageUIIcon("lock", 24) || LOCK}</i></span><span class="vg-map-pin-name">${esc(d.name)}</span></button>`;
  }).join("");
  return `<figure class="vg-map-figure"><figcaption>Five neighbourhoods. One village to bring back to life.</figcaption><div class="vg-map-chart" style="--map-ratio:${width} / ${height}">${svg}${pins}</div><div class="vg-map-key"><span><i class="is-open"></i>Explorable</span><span><i class="is-locked"></i>Later chapter</span>${hasPosition ? '<span><i class="is-player"></i>You are here</span>' : ""}</div></figure>`;
}
function districtDetails(d) {
  return `<section class="vg-map-detail" data-vg-map-detail="${d.id}" aria-labelledby="vg-map-district-title"><div class="vg-map-detail-heading">${villageItemIcon(d.art)}<div><span class="vg-ch-kicker">${esc(d.stateLabel)}</span><h3 id="vg-map-district-title">${esc(d.name)}</h3></div></div><p>${esc(d.description)}</p><ul class="vg-map-requirements" aria-label="${esc(d.name)} unlock requirements">${d.rows.map(row => `<li class="${row.complete ? "is-ready" : row.planned ? "is-planned" : ""}"><span aria-hidden="true">${row.complete ? "✓" : row.planned ? "◇" : "○"}</span><span>${esc(row.label)}</span><b>${esc(row.value)}</b></li>`).join("")}</ul>${!d.available ? '<p class="vg-map-later">This road stays closed in this chapter. Level and story goals prepare the way; the district itself comes in a later update.</p>' : d.open ? '<p class="vg-map-later">Choose a landmark below to follow its route.</p>' : '<p class="vg-map-later">Elowen’s invitation opens the Green from the farm.</p>'}</section>`;
}

// Existing focus IDs keep every landmark on the real navigation path.
export function villageMapLandmarks(state) {
  return [
    { id: "arrival", name: "Farm path", sub: "Carriage home", art: "signpost", ui: "farm" },
    { id: "tree", name: "The Moth Tree", sub: "The village square", art: "moth-lamp", ui: "tree" },
    { id: "elowen-library", name: "Elowen’s library", sub: state.village.built["elowen-conservatory"] ? "Conservatory restored" : "A home for quiet wings", art: "almanac", ui: "home" },
    { id: "rowan-workshop", name: "Rowan’s workshop", sub: state.village.built["rowan-workshop"] ? "Workshop restored" : "A carpenter’s next chapter", art: "workbench", ui: "workshop" },
    { id: "velvet-bat", name: "The Velvet Bat", sub: "Vesper’s tavern", art: "moth-lamp", ui: "home" },
    { id: "stall", name: "Rattlewood’s stall", sub: stallOpen(state) ? "Decorations & upgrades" : "Help Rowan reopen it", art: "market-crates" },
    ...FORAGE_AREAS.map(area => ({ id: `forage:${area.id}`, name: area.name, sub: `${NODES.filter(n => n.district === "green" && n.material === area.material && nodeReady(state, n.id)).length} gathering spots ready`, art: area.material, material: MATERIAL_BY_ID[area.material]?.name })),
  ];
}
export function renderVillageMap(state, { selectedDistrict, position = null } = {}) {
  const selected = Object.hasOwn(DISTRICT_BY_ID, selectedDistrict) ? selectedDistrict : "green";
  const districts = villageMapDistricts(state), district = districts.find(d => d.id === selected);
  const landmarks = villageMapLandmarks(state);
  // An area opens its criteria at the top. The Green also puts its routes
  // first, so confirming its pin has a useful destination list straight away.
  const detailFirst = Object.hasOwn(DISTRICT_BY_ID, selectedDistrict);
  const overview = `<p class="vg-map-intro">Tap an area to see its story and unlock goals. Select a landmark to follow a route.</p>${mapGraphic(districts, selected, position, !detailFirst)}`;
  const places = `<section class="vg-map-landmarks" aria-labelledby="vg-map-landmarks-title"><h3 id="vg-map-landmarks-title">Around Hollow Green</h3><div>${landmarks.map(place => `<button class="vg-map-place" data-vg-focus="${place.id}">${villageUIIcon(place.ui, 38) || villageItemIcon(place.art) || villageItemIcon("moth-lamp")}<span><b>${esc(place.name)}</b><small>${esc(place.sub)}</small></span><i aria-hidden="true">›</i></button>`).join("")}</div></section>`;
  const routesFirst = detailFirst && selected === "green";
  const content = detailFirst ? `<button class="vg-map-back" data-vg-map-district="overview" data-pad-default>‹ Back to map</button>${districtDetails(district)}${routesFirst ? places : ""}${overview}` : `${overview}${districtDetails(district)}`;
  const html = `<div class="vg-map-page">${content}${routesFirst ? "" : places}<p class="vg-ch-footnote">The map follows the realm’s actual roads and building footprints. North is up.</p></div>`;
  return { title: "Mothlight map", tag: "Hollow Green & the roads beyond", html };
}
