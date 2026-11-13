// A captured view of the village, with markers projected by its own camera.
// Selecting a place only shows its saved requirements and physical walking route.
import { DISTRICTS, VILLAGE_BOUNDS, PLAN_SCALE, FORAGE_AREAS, ARRIVAL, MATERIAL_BY_ID, NODES } from "../content/village.js";
import {EXPANSION_AREA_BY_ID,EXPANSION_CHAPTER_BY_ID} from '../content/village-expansion.js';
import {expansionAreaInfo,requirementMet} from '../rules/village-expansion-access.js';
import { QUEST_BY_ID } from "../content/village-quests.js";
import { patchLevel, stallOpen, nodeReady } from "../model.js";
import { TOWN } from "../content/village-town-square.js";
import { CAVE_ENTRY } from "../village-expansion-spatial.js";
import { villageItemIcon } from "./village-item-markup.js";
import { villageUIIcon } from "./village-ui-icon-markup.js";
import { expansionIcon } from "./village-expansion-icon-markup.js";

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
// Snapshot projection owns terrain height and the realm-to-three.js z flip.
// Percentages are derived from image pixels, so resizing preserves alignment.
const hasSnapshot = snapshot => !!snapshot?.url && Number.isFinite(snapshot.width) && snapshot.width > 0 && Number.isFinite(snapshot.height) && snapshot.height > 0 && typeof snapshot.projectPoint === "function";
export function villageMapSnapshotPoint(point, snapshot) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.z) || !hasSnapshot(snapshot)) return null;
  let p;
  try { p = snapshot.projectPoint(point); } catch { return null; }
  if (p?.visible === false || !Number.isFinite(p?.x) || !Number.isFinite(p?.y) || p.x < 0 || p.y < 0 || p.x > snapshot.width || p.y > snapshot.height) return null;
  return { x: round(p.x / snapshot.width * 100), y: round(p.y / snapshot.height * 100) };
}
const pinStyle = p => `--map-x:${p.x}%;--map-y:${p.y}%`;
const objectiveAction = p => p.chapter ? `data-vgx-guide="${esc(p.chapter)}"` : p.focus ? `data-vg-focus="${esc(p.focus)}"` : p.who ? `data-vg-meet="${esc(p.who)}"` : p.id ? `data-vgx-find-activity="${esc(p.id)}"` : `data-vg-map-district="${esc(EXPANSION_AREA_BY_ID[p.area] ? p.area : "green")}"`;
function mapGraphic(areas, selected, position, pins, portrait, snapshot, snapshotError, showResidents) {
  const ready = hasSnapshot(snapshot);
  if (!ready) return `<figure class="vg-map-figure"><div class="vg-map-picture-status" role="status" aria-live="polite"><span aria-hidden="true">${villageUIIcon("map", 40)}</span><p>${snapshotError ? "Map picture unavailable. Close and reopen the map to try again." : "Preparing the village view…"}</p></div></figure>`;
  const areaPins = [...areas.filter(a => a.polygon), areas.find(a => a.id === "cave-shallows")].map(d => {
    // District labels are projected onto ground inside the authored footprint;
    // entrances and the Square retain their exact world positions.
    const point = d.layer === "cave" ? { ...CAVE_ENTRY } : centre(d.polygon), active = d.id === selected || d.layer === "cave" && selected.startsWith("cave-");
    if (d.id === "green") Object.assign(point, { x: Math.min(...d.polygon.map(p => p[0])) + 21, z: ARRIVAL.spawn[1] + 5 });
    if (d.id === "copse") point.z -= 30;
    if (d.id === "quarry") point.z -= 10;
    if (d.id === "acre") point.x -= 15;
    const projected = villageMapSnapshotPoint(point, snapshot);
    if (!projected) return "";
    const art = d.layer === "cave" ? expansionIcon("cave", 24) : d.id === "acre" ? expansionIcon("scarecrow-maze", 24) : villageItemIcon(d.art);
    return `<button type="button" class="vg-map-pin${d.open ? " is-open" : " is-locked"}${active ? " is-selected" : ""}" data-vg-map-district="${d.id}"${active ? " data-pad-default" : ""} aria-pressed="${active}" aria-label="${esc(d.name)}${d.layer === "cave" ? " cave entrance" : ""} · ${esc(d.stateLabel)} · view requirements" style="${pinStyle(projected)}"><span class="vg-map-pin-art">${art}<i>${d.open ? CHECK : villageUIIcon("lock", 24)}</i></span><span class="vg-map-pin-name">${MAP_NAMES[d.id]}</span></button>`;
  }).join("");
  const live = pins.map(p => {
    if (p.kind === "resident" && !showResidents) return "";
    const projected = villageMapSnapshotPoint(p, snapshot);
    if (!projected) return "";
    if (p.kind === "objective") return `<span class="vg-map-objective-marker" data-vg-map-objective="${esc(p.id ?? "followed")}" style="${pinStyle(projected)}" aria-hidden="true">✦</span>`;
    const picture = portrait?.(p.id), face = picture ? `<img src="${esc(picture)}" alt="">` : esc((p.short ?? p.label).slice(0, 1));
    return `<button type="button" class="vg-map-live-pin is-resident" data-vg-map-resident="${esc(p.id)}" data-vg-meet="${esc(p.id)}" style="${pinStyle(projected)}" aria-label="${esc(`Find ${p.label}${p.location ? ` · ${p.location}` : ""}`)}"><span aria-hidden="true">${face}</span><span class="vg-map-live-label">${esc(p.short ?? p.label)}</span></button>`;
  }).join("");
  const square = villageMapSnapshotPoint({ x: TOWN.cx * PLAN_SCALE, z: TOWN.cz * PLAN_SCALE }, snapshot);
  const player = onMap(position) && villageMapSnapshotPoint(position, snapshot);
  const people = pins.filter(p => p.kind === "resident").length;
  return `<figure class="vg-map-figure"><figcaption class="vg-map-toolbar"><span>The village as it stands · select a marker</span>${people ? `<button type="button" class="vg-map-neighbour-toggle" data-vg-map-neighbours aria-pressed="${showResidents}">${villageUIIcon("people", 24)}<span>Neighbours <small>${people}</small></span></button>` : ""}</figcaption><div class="vg-map-chart" style="--map-ratio:${snapshot.width} / ${snapshot.height}"><img class="vg-map-snapshot" data-vg-map-snapshot src="${esc(snapshot.url)}" width="${snapshot.width}" height="${snapshot.height}" alt="A tilted view of Mothlight Village and its walking paths" draggable="false">${areaPins}${square ? `<button type="button" class="vg-map-square-pin" data-vg-focus="square" style="${pinStyle(square)}" aria-label="Moonclock Square · show the walking route"><span aria-hidden="true">${villageUIIcon("map", 24)}</span><b>Square</b></button>` : ""}${player ? `<span class="vg-map-you" data-vg-map-position style="${pinStyle(player)}" role="img" aria-label="You are here"></span>` : ""}${live}</div><div class="vg-map-key"><span><i class="is-open"></i>Explorable</span><span><i class="is-locked"></i>Story & level</span>${player ? '<span><i class="is-player"></i>You are here</span>' : ""}${showResidents && people ? '<span><i class="is-resident"></i>Neighbours</span>' : ""}${pins.some(p => p.kind === "objective") ? '<span><i class="is-objective"></i>Followed step</span>' : ""}</div></figure>`;
}
function districtDetails(d, areas) {
  const caves = d.layer === "cave" ? `<nav class="vg-map-cave-levels" aria-label="Cave landings">${areas.filter(a => a.layer === "cave").map(a => `<button type="button" data-vg-map-district="${a.id}" aria-pressed="${a.id === d.id}">${esc(a.name)}</button>`).join("")}</nav>` : "";
  const art = d.layer === "cave" ? expansionIcon(d.art, 42) : d.id === "acre" ? expansionIcon("scarecrow-maze", 42) : villageItemIcon(d.art);
  return `<section class="vg-map-detail" data-vg-map-detail="${d.id}" aria-labelledby="vg-map-district-title"><div class="vg-map-detail-heading">${art}<div><span class="vg-ch-kicker">${esc(d.stateLabel)}</span><h3 id="vg-map-district-title">${esc(d.name)}</h3></div></div><p>${esc(d.description)}</p>${caves}<ul class="vg-map-requirements" aria-label="${esc(d.name)} unlock requirements">${d.rows.map(row => `<li class="${row.complete ? "is-ready" : ""}"><span aria-hidden="true">${row.complete ? "✓" : "○"}</span><span>${esc(row.label)}</span><b>${esc(row.value)}</b></li>`).join("")}</ul><div class="vg-map-walking"><b>Walking route</b><p>${esc(d.walking)}</p>${d.open ? `<button type="button" class="vg-map-route" data-vgx-way-area="${d.id}">Show the walking route <span aria-hidden="true">↗</span></button>` : `<p class="vg-map-later">${esc(d.reason)} Complete the listed goals, then follow the physical walking path.</p>`}</div></section>`;
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
export function renderVillageMap(state, { selectedDistrict, position = null, residents = [], objective = null, currentArea = "surface", portrait = null, snapshot = null, snapshotError = false, showResidents = false } = {}) {
  const areas = villageMapAreas(state), selected = areas.some(a => a.id === selectedDistrict) ? selectedDistrict : "green", district = areas.find(d => d.id === selected);
  const pins = villageMapLivePins({ residents, objective }), landmarks = villageMapLandmarks(state);
  const objectivePin = pins.find(p => p.kind === "objective");
  const followed = objectivePin ? `<div class="vg-map-followed"><span aria-hidden="true">✦</span><div><small>Following${objectivePin.viaEntrance ? " · below the Copse" : ""}</small><b>${esc(objectivePin.label)}</b>${objectivePin.viaEntrance ? '<p>The marker shows the cave entrance. Follow the stairs below to your next step.</p>' : ""}</div><button type="button" ${objectiveAction(objectivePin)} aria-label="Show walking route to ${esc(objectivePin.label)}">Show route <span aria-hidden="true">↗</span></button></div>` : "";
  const places = `<details class="vg-map-landmarks" data-vg-details-key="map-landmarks"><summary>Landmarks & gathering paths <span aria-hidden="true">⌄</span></summary><div>${landmarks.map(place => `<button type="button" class="vg-map-place" data-vg-focus="${place.id}">${villageUIIcon(place.ui, 38) || villageItemIcon(place.art) || villageItemIcon("moth-lamp")}<span><b>${esc(place.name)}</b><small>${esc(place.sub)}</small></span><i aria-hidden="true">›</i></button>`).join("")}</div></details>`;
  const html = `<div class="vg-map-page"><p class="vg-map-intro">Choose a place in the village for its story, requirements and walking route.</p><div class="vg-map-board">${mapGraphic(areas, selected, isSurface(currentArea) ? position : null, pins, portrait, snapshot, snapshotError, showResidents)}${districtDetails(district, areas)}</div>${followed}${places}<p class="vg-ch-footnote">A picture of the village when you opened the map. Caves are marked at their surface entrance.</p></div>`;
  return { title: "Mothlight map", tag: "The village & its walking paths", html };
}
