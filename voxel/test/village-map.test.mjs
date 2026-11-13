import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { DISTRICTS, VILLAGE_BOUNDS, ARRIVAL, NODES } from "../src/content/village.js";
import { renderVillageChapter } from "../src/ui/village-chapters.js";
import { TOWN } from "../src/content/village-town-square.js";
import { CAVE_ENTRY } from "../src/village-expansion-spatial.js";
import { EXPANSION_AREA_BY_ID } from "../src/content/village-expansion.js";
import { villageMapDistricts, villageMapAreas, villageMapLivePins, villageMapPoint, villageMapSnapshotPoint, villageMapLandmarks, renderVillageMap as renderMap, VILLAGE_MAP_SIZE, VILLAGE_MAP_BOUNDS } from "../src/ui/village-map.js";

// A deterministic projection stub tests the renderer independently of WebGL.
const snapshot = { url: "blob:captured-world", width: VILLAGE_MAP_SIZE.width, height: VILLAGE_MAP_SIZE.height, projectPoint: ({ x, z }) => ({ ...villageMapPoint(x, z), visible: true }) };
const renderVillageMap = (state, options = {}) => renderMap(state, { snapshot, ...options });
const percent = n => Math.round(n * 100) / 100;

function level(state, n) {
  state.earned = M.LEVELS[n - 1].at;
  state.progression.claimed = M.LEVELS.slice(0, n).map(l => l.level);
}
function village(n = 3) {
  const state = M.freshState(); level(state, n); M.inviteToVillage(state); return state;
}

test("the map keeps all five areas visible and uses the current invitation gate", () => {
  const state = M.freshState(), districts = villageMapDistricts(state);
  assert.deepEqual(districts.map(d => d.id), DISTRICTS.map(d => d.id));
  assert.equal(districts.find(d => d.id === "green").open, false);
  assert.equal(districts.find(d => d.id === "green").rows.find(r => r.key === "invitation").complete, false);
  level(state, 3); M.inviteToVillage(state);
  const open = villageMapDistricts(state).find(d => d.id === "green");
  assert.equal(open.open, true); assert.equal(open.stateLabel, "Explorable");
  assert.ok(open.rows.every(r => r.complete));
});

test("district map unlocks follow the same restored story and level gates as walking", () => {
  const state = village(20);
  state.village.quests["two-doorbells"] = { done: true, step: 10, base: null };
  state.village.story = ["two-doorbells", "footbridge", "restaurant-opening", "four-stories"];
  const rows = villageMapDistricts(state), copse = rows.find(d => d.id === "copse");
  assert.equal(copse.rows.find(r => r.key === "level").complete, true);
  assert.equal(copse.rows.find(r => r.key === "story").complete, true);
  assert.equal(copse.open, true); assert.equal(copse.available, true);
  for (const district of rows.filter(d => d.id !== "green")) {
    assert.equal(district.open, M.districtOpen(state, district.id));
    assert.equal(district.stateLabel, district.id==='copse'?"Explorable":"Locked · story & level");
    assert.ok(district.rows.every(r=>!r.planned),'all shipped chapters have real unlock criteria');
  }
  assert.match(rows.find(d=>d.id==='quarry').rows.find(r=>r.key==='story').label,/Every Window a Welcome/);
  for(const flag of ['copse-restored','restaurant-opening','green-seal','copse-seal','quarry-seal','moor-seal'])state.village.expansion.effects.push(flag);
  for(const district of villageMapDistricts(state)){assert.equal(district.open,true,district.id);assert.ok(district.rows.every(r=>r.complete),district.id);}
});

test("selected lock details report the real level and quest while keeping the region clickable", () => {
  const state = village(), { html } = renderVillageMap(state, { selectedDistrict: "copse" });
  assert.match(html, /data-vg-map-detail="copse"/);
  assert.match(html, /Patch level 6/); assert.match(html, /Complete Two Doorbells/);
  assert.match(html, /follow the physical walking path/);assert.doesNotMatch(html,/comes in a later update/);
  for (const district of DISTRICTS) {
    const pin = html.match(new RegExp(`<button[^>]*class="vg-map-pin[^>]*data-vg-map-district="${district.id}"[^>]*>`))?.[0];
    assert.ok(pin, `${district.id} has a real button rather than an inaccessible SVG hit target`);
    assert.doesNotMatch(pin, /disabled/);
    assert.match(pin, /aria-label="[^"]+view requirements"/);
    assert.match(pin, new RegExp(`aria-pressed="${district.id === "copse"}"`));
  }
  assert.ok(html.indexOf('class="vg-map-figure"') < html.indexOf('data-vg-map-detail="copse"'), "selecting a place retains the spatial overview first");
  assert.doesNotMatch(html, /data-vgx-way-area="copse"/, "a locked area cannot offer a route action");
  assert.doesNotMatch(html, /data-vg-focus="(?:copse|quarry|moor|marsh)"/);
});

test("the map uses the captured world image and its own pixel projection", () => {
  const state = village(), capture = { url: "blob:real-world-image", width: 1600, height: 1100, projectPoint: () => ({ x: 400, y: 220, visible: true }) };
  const { html } = renderVillageMap(state, { snapshot: capture });
  assert.match(html, /data-vg-map-snapshot src="blob:real-world-image" width="1600" height="1100"/);
  assert.match(html, /--map-ratio:1600 \/ 1100/);
  assert.match(html, /--map-x:25%;--map-y:20%/);
  assert.doesNotMatch(html, /<svg[^>]*viewBox="0 0 (?:[3-9]\d{2}|\d{4})|vg-map-road|vg-map-region|vg-map-polygon/);
  assert.deepEqual(villageMapSnapshotPoint({ x: 87, z: 35 }, capture), { x: 25, y: 20 });
});

test("the live position uses realm coordinates and rejects invalid or off-map points", () => {
  const state = village(), position = { x: ARRIVAL.spawn[0], z: ARRIVAL.spawn[1] }, p = villageMapPoint(position.x, position.z);
  const { html } = renderVillageMap(state, { position });
  assert.ok(html.includes(`data-vg-map-position style="--map-x:${percent(p.x / snapshot.width * 100)}%;--map-y:${percent(p.y / snapshot.height * 100)}%"`)); assert.match(html, /You are here/);
  for (const position of [{ x: NaN, z: 0 }, { x: Infinity, z: 0 }, { x: 0, z: VILLAGE_BOUNDS.z1 + 1 }]) assert.doesNotMatch(renderVillageMap(state, { position }).html, /data-vg-map-position/);
});

test("landmark shortcuts preserve the existing routes and current gathering readiness", () => {
  const state = village(), places = villageMapLandmarks(state);
  for (const id of ["arrival", "tree", "elowen-library", "rowan-workshop", "velvet-bat", "stall"]) assert.ok(places.some(p => p.id === id), id);
  const logs = NODES.filter(n => n.district === "green" && n.material === "logs");
  for (const node of logs) state.village.nodes[node.id] = 60;
  assert.equal(villageMapLandmarks(state).find(p => p.id === "forage:fallen-timber").sub, "0 gathering spots ready");
  state.village.nodes[logs[0].id] = 0;
  assert.equal(villageMapLandmarks(state).find(p => p.id === "forage:fallen-timber").sub, "1 gathering spots ready");
});

test("chapter integration reads only state and validates selected IDs", () => {
  const state = village(), before = JSON.stringify(state);
  const page = renderVillageChapter({ kind: "map", id: "moor", state, position: { x: 87, z: 10 } });
  assert.equal(page.title, "Mothlight map"); assert.match(page.html, /data-vg-map-detail="moor"/);
  assert.equal(JSON.stringify(state), before);
  for (const id of ["__proto__", '<img src=x onerror="bad">']) {
    const { html } = renderVillageMap(state, { selectedDistrict: id });
    assert.match(html, /data-vg-map-detail="green"/); assert.doesNotMatch(html, /onerror/);
  }
});


test("every area selection keeps one spatial overview with inline criteria and walking guidance", () => {
  const state = village();
  for (const selectedDistrict of ["overview", ...villageMapAreas(state).map(a => a.id)]) {
    const { html } = renderVillageMap(state, { selectedDistrict });
    assert.equal(html.match(/class="vg-map-figure"/g)?.length, 1);
    assert.ok(html.indexOf('class="vg-map-figure"') < html.indexOf('class="vg-map-detail"'));
    assert.ok(html.indexOf('class="vg-map-detail"') < html.indexOf('class="vg-map-landmarks"'));
    assert.match(html, /Walking route/);
    assert.doesNotMatch(html, /Back to map|vgx-route-book|data-vg-map-district="overview"/);
  }
  assert.match(renderVillageMap(state).html, /data-vgx-way-area="green"/);
});

test("the Acre, Moonclock Square and single cave mouth use the actual spread surface coordinates", () => {
  const state = village(), { html } = renderVillageMap(state), areas = villageMapAreas(state);
  assert.ok(VILLAGE_MAP_BOUNDS.x0 <= EXPANSION_AREA_BY_ID.acre.bounds[0]);
  assert.ok(VILLAGE_MAP_BOUNDS.x1 >= VILLAGE_BOUNDS.x1);
  const style = p => {
    const point = villageMapPoint(p.x, p.z), round = n => Math.round(n * 100) / 100;
    return `--map-x:${round(point.x / VILLAGE_MAP_SIZE.width * 100)}%;--map-y:${round(point.y / VILLAGE_MAP_SIZE.height * 100)}%`;
  };
  const [x0, z0, x1, z1] = EXPANSION_AREA_BY_ID.acre.bounds;
  for (const [id, point] of [["cave-shallows", CAVE_ENTRY]]) {
    const button = html.match(new RegExp(`<button[^>]*data-vg-map-district="${id}"[^>]*>`))?.[0];
    assert.ok(button?.includes(style(point)), id);
  }
  const acrePin = html.match(/<button[^>]*data-vg-map-district="acre"[^>]*>/)?.[0];
  const [, mapX, mapY] = acrePin.match(/--map-x:([\d.]+)%;--map-y:([\d.]+)%/);
  const acreX = Number(mapX) / 100 * VILLAGE_MAP_SIZE.width + VILLAGE_MAP_BOUNDS.x0 - 14;
  const acreZ = VILLAGE_MAP_BOUNDS.z1 + 14 - Number(mapY) / 100 * VILLAGE_MAP_SIZE.height;
  assert.ok(acreX >= x0 && acreX <= x1 && acreZ >= z0 && acreZ <= z1, "the Acre area label remains within its real surface footprint");
  const square = { x: TOWN.cx * 1.5, z: TOWN.cz * 1.5 };
  assert.ok(html.match(/<button[^>]*data-vg-focus="square"[^>]*>/)?.[0].includes(style(square)));
  assert.equal(areas.filter(a => a.layer === "cave").length, 3);
  assert.equal(html.match(/class="vg-map-pin[^>]*data-vg-map-district="cave-/g)?.length, 1);
  for (const id of ["cave-workings", "cave-cathedral"]) {
    const selected = renderVillageMap(state, { selectedDistrict: id }).html;
    assert.ok(selected.includes(`data-vg-map-detail="${id}"`));
    assert.ok(selected.includes(`Patch level ${EXPANSION_AREA_BY_ID[id].level}`));
    assert.match(selected, /Cave landings/);
    assert.doesNotMatch(selected, /data-vgx-way-area=/);
  }
});

test("live pins show observed residents and route a followed underground objective through the real entrance", () => {
  const state = village(), residents = [
    { id: "elowen", name: "Elowen Mothwick", x: 43, z: 35, area: "green", live: true, available: true },
    { id: "rowan", x: 110, z: 35, area: "green", live: false },
    { id: "mabel", x: -30, z: 120, area: "copse", available: false },
    { id: "tansy", x: 0, z: -20, area: "cave-shallows" },
    { id: "vesper", x: 3, z: 3, area: "green", hall: "velvet-bat" },
    { id: "lost", x: Infinity, z: 5, area: "green" },
  ], objective = { id: "copse-lantern:2", chapter: "copse-lantern", name: "Free the singing crystal", area: "cave-shallows", x: -10.5, z: -18 };
  const before = JSON.stringify({ state, residents, objective }), pins = villageMapLivePins({ residents, objective });
  assert.deepEqual(pins.filter(p => p.kind === "resident").map(p => p.id), ["elowen"]);
  assert.equal(pins.find(p => p.kind === "objective").x, CAVE_ENTRY.x);
  assert.equal(pins.find(p => p.kind === "objective").z, CAVE_ENTRY.z);
  assert.equal(pins.find(p => p.kind === "objective").viaEntrance, true);
  const { html } = renderVillageMap(state, { residents, objective, currentArea: "cave-shallows", position: { x: 0, z: -12 }, showResidents: true });
  assert.match(html, /data-vg-map-resident="elowen" data-vg-meet="elowen"/);
  assert.match(html, /data-vg-map-objective="copse-lantern:2"/);
  assert.match(html, /data-vgx-guide="copse-lantern" aria-label="Show walking route to Free the singing crystal"/);
  assert.match(html, /The marker shows the cave entrance/);
  assert.doesNotMatch(html, /data-vg-map-position|data-vg-map-resident="(?:rowan|mabel|tansy|vesper|lost)"/);
  assert.equal(JSON.stringify({ state, residents, objective }), before);
});

test("surface objective pins retain live world coordinates and reject off-map or unknown-layer observations", () => {
  const objective = { id: "green-research:1", chapter: "green-research", name: "Read the page", x: 75, z: 30, area: "green" };
  assert.deepEqual(villageMapLivePins({ objective })[0], { ...objective, kind: "objective", label: "Read the page" });
  for (const objective of [{ x: NaN, z: 0 }, { x: VILLAGE_MAP_BOUNDS.x0 - 1, z: 0 }, { x: 0, z: 0, area: "invented-hall" }]) assert.deepEqual(villageMapLivePins({ objective }), []);
});

test("resident portraits are escaped image sources rather than visible URL text", () => {
  const portrait = 'data:image/png;base64,cG9ydHJhaXQ=', { html } = renderVillageMap(village(), { residents: [{ id: "elowen", short: "Elowen", x: 43, z: 30, area: "green" }], portrait: () => portrait, showResidents: true });
  assert.ok(html.includes(`<img src="${portrait}" alt="">`));
  assert.doesNotMatch(html, />data:image/);
  assert.doesNotMatch(renderVillageMap(village(), { residents: [{ id: "elowen", x: 43, z: 30 }], portrait: () => 'bad" onerror="bad', showResidents: true }).html, /src="bad" onerror/);
});

test("neighbour pins are optional so destination markers lead the captured view", () => {
  const residents = [{ id: "elowen", short: "Elowen", x: 43, z: 30, area: "green" }];
  const closed = renderVillageMap(village(), { residents }).html, open = renderVillageMap(village(), { residents, showResidents: true }).html;
  assert.match(closed, /data-vg-map-neighbours aria-pressed="false"/);
  assert.doesNotMatch(closed, /data-vg-map-resident="elowen"/);
  assert.match(open, /data-vg-map-neighbours aria-pressed="true"/);
  assert.match(open, /data-vg-map-resident="elowen"/);
});

test("missing or failed captures show honest status text without a diagram fallback", () => {
  const pending = renderMap(village()).html, failed = renderMap(village(), { snapshotError: true }).html;
  assert.match(pending, /Preparing the village view/);
  assert.match(failed, /Map picture unavailable. Close and reopen the map to try again/);
  for (const html of [pending, failed]) assert.doesNotMatch(html, /data-vg-map-snapshot|vg-map-chart|vg-map-region|vg-map-road/);
});

test("invalid or hidden image projections cannot place invented markers", () => {
  for (const projectPoint of [() => ({ x: NaN, y: 5 }), () => ({ x: 2, y: 3, visible: false }), () => ({ x: -1, y: 3 }), () => ({ x: 1601, y: 3 }), () => { throw new Error("Camera unavailable"); }]) {
    const capture = { url: "blob:captured", width: 1600, height: 1100, projectPoint };
    assert.equal(villageMapSnapshotPoint({ x: 1, z: 2 }, capture), null);
    assert.doesNotMatch(renderVillageMap(village(), { snapshot: capture }).html, /class="vg-map-pin |data-vg-map-position|data-vg-focus="square" style=/);
  }
});
