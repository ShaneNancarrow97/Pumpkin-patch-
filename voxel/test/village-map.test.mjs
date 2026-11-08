import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { DISTRICTS, ROADS, VILLAGE_BOUNDS, ARRIVAL, NODES } from "../src/content/village.js";
import { renderVillageChapter } from "../src/ui/village-chapters.js";
import { villageMapDistricts, villageMapPoint, villageMapLandmarks, renderVillageMap, VILLAGE_MAP_SIZE } from "../src/ui/village-map.js";

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

test("meeting a future area's level and available quest goals never pretends the chapter is playable", () => {
  const state = village(20);
  state.village.quests["two-doorbells"] = { done: true, step: 10, base: null };
  state.village.story = ["two-doorbells", "footbridge", "restaurant-opening", "four-stories"];
  const rows = villageMapDistricts(state), copse = rows.find(d => d.id === "copse");
  assert.equal(copse.rows.find(r => r.key === "level").complete, true);
  assert.equal(copse.rows.find(r => r.key === "story").complete, true);
  assert.equal(copse.open, false); assert.equal(copse.available, false);
  assert.equal(copse.rows.find(r => r.key === "chapter").complete, false);
  for (const district of rows.filter(d => d.id !== "green")) {
    assert.equal(district.open, M.districtOpen(state, district.id));
    assert.equal(district.stateLabel, "Locked · later chapter");
    assert.equal(district.rows.find(r => r.key === "chapter").value, "To come");
  }
  // Later story definitions are not yet real quest transactions.
  assert.ok(rows.find(d => d.id === "quarry").rows.find(r => r.key === "story").planned);
});

test("selected lock details report the real level and quest while keeping the region clickable", () => {
  const state = village(), { html } = renderVillageMap(state, { selectedDistrict: "copse" });
  assert.match(html, /data-vg-map-detail="copse"/);
  assert.match(html, /Patch level 6/); assert.match(html, /Complete Two Doorbells/);
  assert.match(html, /district itself comes in a later update/);
  for (const district of DISTRICTS) {
    const pin = html.match(new RegExp(`<button class="vg-map-pin[^>]*data-vg-map-district="${district.id}"[^>]*>`))?.[0];
    assert.ok(pin, `${district.id} has a real button rather than an inaccessible SVG hit target`);
    assert.doesNotMatch(pin, /disabled/);
    assert.match(pin, /aria-label="[^"]+view requirements"/);
    assert.match(pin, new RegExp(`aria-pressed="${district.id === "copse"}"`));
  }
  assert.match(html, /data-vg-map-district="overview" data-pad-default>‹ Back to map/);
  assert.ok(html.indexOf('data-vg-map-detail="copse"') < html.indexOf('class="vg-map-figure"'), "selected lock criteria are immediately visible above the map");
  assert.doesNotMatch(html, /data-vg-focus="(?:copse|quarry|moor|marsh)"/);
});

test("the SVG uses the world's actual north-up footprints and roads", () => {
  const state = village(), { html } = renderVillageMap(state);
  const westSouth = villageMapPoint(VILLAGE_BOUNDS.x0, VILLAGE_BOUNDS.z0), eastNorth = villageMapPoint(VILLAGE_BOUNDS.x1, VILLAGE_BOUNDS.z1);
  assert.ok(westSouth.x < eastNorth.x); assert.ok(westSouth.y > eastNorth.y);
  for (const district of DISTRICTS) {
    const points = district.polygon.map(([x, z]) => { const p = villageMapPoint(x, z); return `${p.x},${p.y}`; }).join(" ");
    assert.ok(html.includes(`data-vg-map-polygon="${district.id}" points="${points}"`), district.id);
  }
  for (const road of ROADS) assert.ok(html.includes(`data-vg-map-road="${road.id}"`), road.id);
  assert.match(html, new RegExp(`viewBox="0 0 ${VILLAGE_MAP_SIZE.width} ${VILLAGE_MAP_SIZE.height}"`));
});

test("the live position uses realm coordinates and rejects invalid or off-map points", () => {
  const state = village(), position = { x: ARRIVAL.spawn[0], z: ARRIVAL.spawn[1] }, p = villageMapPoint(position.x, position.z);
  const { html } = renderVillageMap(state, { position });
  assert.ok(html.includes(`data-vg-map-position cx="${p.x}" cy="${p.y}"`)); assert.match(html, /You are here/);
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


test("the Green pin reveals nearby routes, and Back restores the spatial overview", () => {
  const state = village(), selected = renderVillageMap(state, { selectedDistrict: "green" }).html, overview = renderVillageMap(state, { selectedDistrict: "overview" }).html;
  assert.ok(selected.indexOf('class="vg-map-landmarks"') < selected.indexOf('class="vg-map-figure"'));
  assert.match(selected, /data-vg-map-district="overview" data-pad-default/);
  assert.ok(overview.indexOf('class="vg-map-figure"') < overview.indexOf('class="vg-map-detail"'));
  assert.doesNotMatch(overview, /Back to map/);
});
