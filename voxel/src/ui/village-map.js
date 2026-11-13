// A measured map of the realm. Its roads, plots and district outlines come
// from the same coordinates as the world; selecting a gate never opens it.
import { DISTRICTS, VILLAGE_BOUNDS, PLAN_SCALE, ROADS, PLOTS, FORAGE_AREAS, FIXTURES, ARRIVAL, BRIDGE, MATERIAL_BY_ID, NODES } from "../content/village.js";
import {EXPANSION_AREA_BY_ID,EXPANSION_CHAPTER_BY_ID} from '../content/village-expansion.js';
import {expansionAreaInfo,requirementMet} from '../rules/village-expansion-access.js';
import { QUEST_BY_ID } from "../content/village-quests.js";
import { patchLevel, stallOpen, nodeReady } from "../model.js";
import { TOWN } from "../content/village-town-square.js";
import { CAVE_ENTRY, ACRE_ENTRY, ACRE_APPROACH } from "../village-expansion-spatial.js";
import { spreadWorld } from "../rules/village-spread.js";
import { villageItemIcon } from "./village-item-markup.js";
import { villageUIIcon } from "./village-ui-icon-markup.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const round = n => Math.round(n * 100) / 100;
const PAD = 14;
// The Acre is west of the original realm bounds. Cave rooms use their own
// local grid and must never extend the surface map or supply surface dots.
const acreBounds = EXPANSION_AREA_BY_ID.acre.bounds;
export const VILLAGE_MAP_BOUNDS = Object.freeze({
  x0: Math.min(VILLAGE_BOUNDS.x0, acreBounds[0]), z0: Math.min(VILLAGE_BOUNDS.z0, acreBounds[1]),
  x1: Math.max(VILLAGE_BOUNDS.x1, acreBounds[2]), z1: Math.max(VILLAGE_BOUNDS.z1, acreBounds[3]),
});
export const VILLAGE_MAP_SIZE = Object.freeze({ width: VILLAGE_MAP_BOUNDS.x1 - VILLAGE_MAP_BOUNDS.x0 + PAD * 2, height: VILLAGE_MAP_BOUNDS.z1 - VILLAGE_MAP_BOUNDS.z0 + PAD * 2 });
export const villageMapPoint = (x, z) => ({ x: round(x - VILLAGE_MAP_BOUNDS.x0 + PAD), y: round(VILLAGE_MAP_BOUNDS.z1 - z + PAD) });
const surfaceAreas = new Set(["surface", "square", "green", "copse", "quarry", "moor", "marsh", "acre"]);
const onMap = p => Number.isFinite(p?.x) && Number.isFinite(p?.z) && p.x >= VILLAGE_MAP_BOUNDS.x0 && p.x <= VILLAGE_MAP_BOUNDS.x1 && p.z >= VILLAGE_MAP_BOUNDS.z0 && p.z <= VILLAGE_MAP_BOUNDS.z1;
const isSurface = area => !area || surfaceAreas.has(area);
const DISTRICT_ART = Object.freeze({ green: "moth-lamp", copse: "hardwood", quarry: "stone", moor: "moonstone", marsh: "star-amber", acre: "fibre", "cave-shallows": "lantern-amethyst", "cave-workings": "ember-garnet", "cave-cathedral": "hollow-opal" });
const DISTRICT_COPY = Object.freeze({
  green: "Neighbours, quiet gardens and gathering trails around the Moth Tree.",
  copse: "Mabel and Tansy’s woodland neighbourhood, with hardwood and moth silk.",
  quarry: "Opal and Cinder’s neighbourhood, rich in iron and clay.",
  moor: "Corvus and the Baron’s neighbourhood, with moonstone and emberbloom.",
  marsh: "The farthest chapter of Mothlight, where star amber waits in the mist.",
  acre: "Granny Brambletooth’s cottage and the scarecrow paths of the western maize estate.",
  "cave-shallows": "The first cave landing below Moonroot Copse, where Lantern Amethyst glows.",
  "cave-workings": "The second cave landing, reached by the stairs within the Lantern Steps.",
  "cave-cathedral": "The deepest cave landing, reached through the Drowned Workings.",
});
const WALKING_COPY = Object.freeze({
  green: "Follow the lantern avenue north from the farm carriage stop.",
  copse: "Take the western road from Hollow Green, then follow it north into the Copse.",
  quarry: "Walk north through Moonclock Square and its arch towards the Quarry bridge.",
  moor: "Take the eastern road out of Hollow Green and follow it towards the midway.",
  marsh: "Follow the northern road beyond the Quarry towards the marsh crossing.",
  acre: "From the north of Moonroot Copse, follow the western path to the Acre gate.",
  "cave-shallows": "Walk to the cave mouth in northern Moonroot Copse, then enter on foot.",
  "cave-workings": "Enter the cave mouth in Moonroot Copse, then take the next stairs down from the Lantern Steps.",
  "cave-cathedral": "Enter through Moonroot Copse and descend through the Lantern Steps and Drowned Workings.",
});
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
const MAP_NAMES = Object.freeze({ green: "Green", copse: "Copse", quarry: "Quarry", moor: "Moor", marsh: "Marsh", acre: "Acre", "cave-shallows": "Cave" });

function requirementTitle(id) {
  if (Array.isArray(id)) return id.map(requirementTitle).join(" and ");
  return id?.startsWith("legacy:") ? QUEST_BY_ID[id.slice(7)]?.title ?? id.slice(7).replaceAll("-", " ") : EXPANSION_CHAPTER_BY_ID[id]?.title ?? (id === "four-seals" ? "the four village seals" : String(id ?? "").replaceAll("-", " "));
}
function areaDetails(state, area, footprint = {}) {
  const level = patchLevel(state).level, info = expansionAreaInfo(state, area.id), open = !!info?.open;
  const rows = [{ key: "level", label: `Patch level ${area.level}`, complete: level >= area.level, value: `${level} / ${area.level}` }];
  if (area.id === "green") rows.push({ key: "invitation", label: "Accept Elowen’s invitation", complete: !!state.village.invited, value: state.village.invited ? "Received" : "Not yet" });
  else rows.push({ key: "story", label: `Complete ${requirementTitle(area.needs)}`, complete: requirementMet(state, area.needs), value: requirementMet(state, area.needs) ? "Complete" : "Not yet" });
  return { ...area, ...footprint, open, available: open, rows, art: DISTRICT_ART[area.id], description: DISTRICT_COPY[area.id], walking: WALKING_COPY[area.id], reason: info.reason, stateLabel: open ? "Explorable" : area.id === "green" ? "Invitation required" : "Locked · story & level" };
}
// These adapters only read the same level/story gates used by physical walking.
export function villageMapDistricts(state) {
  return DISTRICTS.map(d => areaDetails(state, EXPANSION_AREA_BY_ID[d.id], d));
}
export function villageMapAreas(state) {
  const [x0, z0, x1, z1] = acreBounds;
  return [...villageMapDistricts(state), areaDetails(state, EXPANSION_AREA_BY_ID.acre, { polygon: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] }), ...["cave-shallows", "cave-workings", "cave-cathedral"].map(id => areaDetails(state, EXPANSION_AREA_BY_ID[id]))];
}

// Callers supply observed feet, not home guesses. Underground coordinates are
// local to each landing; a followed cave objective is shown at its real mouth.
export function villageMapLivePins({ residents = [], objective = null } = {}) {
  const people = residents.filter(r => r && r.available !== false && r.live !== false && !r.hall && isSurface(r.area) && onMap(r)).map(r => ({ ...r, kind: "resident", label: r.name ?? r.short ?? r.id }));
  if (!objective) return people;
  const cave = EXPANSION_AREA_BY_ID[objective.area]?.layer === "cave";
  const target = cave ? { ...objective, ...CAVE_ENTRY, viaEntrance: true } : { ...objective };
  if (!cave && !isSurface(target.area) || !onMap(target)) return people;
  return [...people, { ...target, kind: "objective", label: objective.name ?? objective.label ?? "Followed objective" }];
}

function centre(polygon) {
  // All current footprints are rectangles; using their bounds retains a
  // sensible label if a later outline becomes an irregular clearing.
  return { x: (Math.min(...polygon.map(p => p[0])) + Math.max(...polygon.map(p => p[0]))) / 2, z: (Math.min(...polygon.map(p => p[1])) + Math.max(...polygon.map(p => p[1]))) / 2 };
}
const svgPoints = points => points.map(([x, z]) => { const p = villageMapPoint(x, z); return `${p.x},${p.y}`; }).join(" ");
const rect = box => { const p = villageMapPoint(box.x0, box.z1); return `x="${p.x}" y="${p.y}" width="${round(box.x1 - box.x0)}" height="${round(box.z1 - box.z0)}"`; };
const pinStyle = point => { const p = villageMapPoint(point.x, point.z); return `--map-x:${round(p.x / VILLAGE_MAP_SIZE.width * 100)}%;--map-y:${round(p.y / VILLAGE_MAP_SIZE.height * 100)}%`; };
const objectiveAction = p => p.chapter ? `data-vgx-guide="${esc(p.chapter)}"` : p.focus ? `data-vg-focus="${esc(p.focus)}"` : p.who ? `data-vg-meet="${esc(p.who)}"` : p.id ? `data-vgx-find-activity="${esc(p.id)}"` : `data-vg-map-district="${esc(EXPANSION_AREA_BY_ID[p.area] ? p.area : "green")}"`;
function mapGraphic(areas, selected, position, pins, portrait) {
  const { width, height } = VILLAGE_MAP_SIZE, districts = areas.filter(d => d.polygon);
  const at = (x, z) => { const p = villageMapPoint(x, z); return `cx="${p.x}" cy="${p.y}"`; };
  const player = onMap(position) ? `<circle class="vg-map-player-aura" ${at(position.x, position.z)} r="6"/><circle class="vg-map-player" data-vg-map-position ${at(position.x, position.z)} r="2.7"/>` : "";
  const square = { x: TOWN.cx * PLAN_SCALE, z: TOWN.cz * PLAN_SCALE };
  const approach = ACRE_APPROACH.map(p => spreadWorld(p.x, p.z));
  const svg = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><defs><pattern id="vg-map-grain" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M2 3h.1m6 6h.1" stroke="#d8bfdf" stroke-opacity=".14" stroke-width="1"/></pattern></defs><rect class="vg-map-bed" x="0" y="0" width="${width}" height="${height}" rx="13"/><rect x="0" y="0" width="${width}" height="${height}" fill="url(#vg-map-grain)" rx="13"/>${districts.map(d => `<polygon class="vg-map-region${d.open ? " is-open" : " is-locked"}${d.id === selected ? " is-selected" : ""}" data-vg-map-polygon="${d.id}" points="${svgPoints(d.polygon)}"/>`).join("")}<rect class="vg-map-water" ${rect(BRIDGE.ravine)}/>${ROADS.map(road => `<polyline class="vg-map-road${road.kind === "forage" ? " is-forage" : ""}${road.kind === "future-spur" ? " is-future" : ""}" data-vg-map-road="${road.id}" points="${svgPoints(road.points)}" stroke-width="${round(Math.max(1.2, road.width * .4))}"/>`).join("")}<polyline class="vg-map-road" data-vg-map-road="acre-approach" points="${svgPoints(approach)}" stroke-width="2"/>${PLOTS.filter(p => p.kind !== "reservation").map(p => `<rect class="vg-map-building${p.district === "green" ? " is-open" : ""}" ${rect(p)} rx="1.6"/>`).join("")}${FORAGE_AREAS.map(a => `<rect class="vg-map-forage" ${rect(a)} rx="4"/>`).join("")}<circle class="vg-map-square" data-vg-map-square ${at(square.x, square.z)} r="${TOWN.r * PLAN_SCALE}"/><circle class="vg-map-acre-entry" data-vg-map-acre-entry ${at(ACRE_ENTRY.x, ACRE_ENTRY.z)} r="2.5"/><circle class="vg-map-fountain" ${at(square.x, square.z)} r="${TOWN.fountain.r * PLAN_SCALE}"/><ellipse class="vg-map-water" ${at(FIXTURES.pond.x, FIXTURES.pond.z)} rx="${round(FIXTURES.pond.w / 2)}" ry="${round(FIXTURES.pond.d / 2)}"/><circle class="vg-map-tree" ${at(FIXTURES.tree.x, FIXTURES.tree.z)} r="4.3"/><circle class="vg-map-stall" ${at(FIXTURES.stall.x, FIXTURES.stall.z)} r="2.2"/><circle class="vg-map-arrival" ${at(...ARRIVAL.back)} r="3"/>${player}<g class="vg-map-compass" transform="translate(${width - 15},${height - 23})"><path d="m0-10 3 9-3-2-3 2 3-9Z"/><text x="0" y="8" text-anchor="middle">N</text></g></svg>`;
  const areaPins = [...districts, areas.find(a => a.id === "cave-shallows")].map(d => {
    // Area labels sit within their footprint. The Green's label uses the
    // southern lawn to leave the observed neighbours and Square legible.
    const point = d.layer === "cave" ? { ...CAVE_ENTRY } : centre(d.polygon), active = d.id === selected || d.layer === "cave" && selected.startsWith("cave-");
    if (d.id === "green") Object.assign(point, { x: Math.min(...d.polygon.map(p => p[0])) + 21, z: ARRIVAL.spawn[1] + 5 });
    if (d.id === "copse") point.z -= 30;
    if (d.id === "quarry") point.z -= 10;
    if (d.id === "acre") point.x -= 15;
    return `<button type="button" class="vg-map-pin${d.open ? " is-open" : " is-locked"}${active ? " is-selected" : ""}" data-vg-map-district="${d.id}"${active ? " data-pad-default" : ""} aria-pressed="${active}" aria-label="${esc(d.name)}${d.layer === "cave" ? " cave entrance" : ""} · ${esc(d.stateLabel)} · view requirements" style="${pinStyle(point)}"><span class="vg-map-pin-art">${villageItemIcon(d.art)}<i>${d.open ? CHECK : villageUIIcon("lock", 24)}</i></span><span class="vg-map-pin-name"><span class="vg-map-name-full">${esc(d.layer === "cave" ? "Cave entrance" : d.name)}</span><span class="vg-map-name-short">${MAP_NAMES[d.id]}</span></span></button>`;
  }).join("");
  // The followed step has its route action immediately beneath the board.
  // Its small marker cannot cover a nearby neighbour's touch target.
  const live = pins.map(p => {
    if (p.kind === "objective") return `<span class="vg-map-objective-marker" data-vg-map-objective="${esc(p.id ?? "followed")}" style="${pinStyle(p)}" aria-hidden="true">✦</span>`;
    const picture = portrait?.(p.id), face = picture ? `<img src="${esc(picture)}" alt="">` : esc((p.short ?? p.label).slice(0, 1));
    return `<button type="button" class="vg-map-live-pin is-resident" data-vg-map-resident="${esc(p.id)}" data-vg-meet="${esc(p.id)}" style="${pinStyle(p)}" aria-label="${esc(`Find ${p.label}${p.location ? ` · ${p.location}` : ""}`)}"><span aria-hidden="true">${face}</span><span class="vg-map-live-label">${esc(p.short ?? p.label)}</span></button>`;
  }).join("");
  return `<figure class="vg-map-figure"><figcaption>North is up · select a place to see its requirements</figcaption><div class="vg-map-chart" style="--map-ratio:${width} / ${height}">${svg}${areaPins}<button type="button" class="vg-map-square-pin" data-vg-focus="square" style="${pinStyle(square)}" aria-label="Moonclock Square · show the walking route"><span aria-hidden="true">${villageUIIcon("map", 24)}</span><b>Moonclock Square</b></button>${live}</div><div class="vg-map-key"><span><i class="is-open"></i>Explorable</span><span><i class="is-locked"></i>Story & level</span>${player ? '<span><i class="is-player"></i>You are here</span>' : ""}${pins.some(p => p.kind === "resident") ? '<span><i class="is-resident"></i>Neighbours</span>' : ""}${pins.some(p => p.kind === "objective") ? '<span><i class="is-objective"></i>Followed step</span>' : ""}</div></figure>`;
}
function districtDetails(d, areas) {
  const caves = d.layer === "cave" ? `<nav class="vg-map-cave-levels" aria-label="Cave landings">${areas.filter(a => a.layer === "cave").map(a => `<button type="button" data-vg-map-district="${a.id}" aria-pressed="${a.id === d.id}">${esc(a.name)}</button>`).join("")}</nav>` : "";
  return `<section class="vg-map-detail" data-vg-map-detail="${d.id}" aria-labelledby="vg-map-district-title"><div class="vg-map-detail-heading">${villageItemIcon(d.art)}<div><span class="vg-ch-kicker">${esc(d.stateLabel)}</span><h3 id="vg-map-district-title">${esc(d.name)}</h3></div></div><p>${esc(d.description)}</p>${caves}<ul class="vg-map-requirements" aria-label="${esc(d.name)} unlock requirements">${d.rows.map(row => `<li class="${row.complete ? "is-ready" : ""}"><span aria-hidden="true">${row.complete ? "✓" : "○"}</span><span>${esc(row.label)}</span><b>${esc(row.value)}</b></li>`).join("")}</ul><div class="vg-map-walking"><b>Walking route</b><p>${esc(d.walking)}</p>${d.open ? `<button type="button" class="vg-map-route" data-vgx-way-area="${d.id}">Show the walking route <span aria-hidden="true">↗</span></button>` : `<p class="vg-map-later">${esc(d.reason)} Complete the listed goals, then follow the physical walking path.</p>`}</div></section>`;
}

// Existing focus IDs keep every landmark on the real navigation path.
export function villageMapLandmarks(state) {
  return [
    { id: "arrival", name: "Farm path", sub: "Carriage home", art: "signpost", ui: "farm" },
    { id: "tree", name: "The Moth Tree", sub: "The village square", art: "moth-lamp", ui: "tree" },
    { id: "square", name: "Moonclock Square", sub: "The Lantern Fountain and the Moonlit Market", art: "moth-lamp", ui: "tree" },
    { id: "elowen-library", name: "Elowen’s library", sub: state.village.built["elowen-conservatory"] ? "Conservatory restored" : "A home for quiet wings", art: "almanac", ui: "home" },
    { id: "rowan-workshop", name: "Rowan’s workshop", sub: state.village.built["rowan-workshop"] ? "Workshop restored" : "A carpenter’s next chapter", art: "workbench", ui: "workshop" },
    { id: "velvet-bat", name: "The Velvet Bat", sub: "Vesper’s tavern", art: "moth-lamp", ui: "home" },
    { id: "stall", name: "Rattlewood’s stall", sub: stallOpen(state) ? "Decorations & upgrades" : "Help Rowan reopen it", art: "market-crates" },
    ...FORAGE_AREAS.map(area => ({ id: `forage:${area.id}`, name: area.name, sub: `${NODES.filter(n => n.district === "green" && n.material === area.material && nodeReady(state, n.id)).length} gathering spots ready`, art: area.material, material: MATERIAL_BY_ID[area.material]?.name })),
  ];
}
// Live observations are optional and never written back to the save.
export function renderVillageMap(state, { selectedDistrict, position = null, residents = [], objective = null, currentArea = "surface", portrait = null } = {}) {
  const areas = villageMapAreas(state), selected = areas.some(a => a.id === selectedDistrict) ? selectedDistrict : "green", district = areas.find(d => d.id === selected);
  const pins = villageMapLivePins({ residents, objective }), landmarks = villageMapLandmarks(state);
  const objectivePin = pins.find(p => p.kind === "objective");
  const followed = objectivePin ? `<div class="vg-map-followed"><span aria-hidden="true">✦</span><div><small>Following${objectivePin.viaEntrance ? " · below the Copse" : ""}</small><b>${esc(objectivePin.label)}</b>${objectivePin.viaEntrance ? '<p>The marker shows the cave entrance. Follow the stairs below to your next step.</p>' : ""}</div><button type="button" ${objectiveAction(objectivePin)} aria-label="Show walking route to ${esc(objectivePin.label)}">Show route <span aria-hidden="true">↗</span></button></div>` : "";
  const places = `<details class="vg-map-landmarks" data-vg-details-key="map-landmarks"><summary>Landmarks & gathering paths <span aria-hidden="true">⌄</span></summary><div>${landmarks.map(place => `<button type="button" class="vg-map-place" data-vg-focus="${place.id}">${villageUIIcon(place.ui, 38) || villageItemIcon(place.art) || villageItemIcon("moth-lamp")}<span><b>${esc(place.name)}</b><small>${esc(place.sub)}</small></span><i aria-hidden="true">›</i></button>`).join("")}</div></details>`;
  const html = `<div class="vg-map-page"><p class="vg-map-intro">Explore Mothlight on foot. Choose a pin for its story, requirements and walking route.</p><div class="vg-map-board">${mapGraphic(areas, selected, isSurface(currentArea) ? position : null, pins, portrait)}${districtDetails(district, areas)}</div>${followed}${places}<p class="vg-ch-footnote">The map follows the village’s actual roads and building footprints. Caves are marked at their surface entrance.</p></div>`;
  return { title: "Mothlight map", tag: "The village & its walking paths", html };
}
