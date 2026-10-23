import test from "node:test";
import assert from "node:assert/strict";
import { freshState, saveData } from "../src/model.js";
import { MAZE_PREFABS, FOYER_TIERS } from "../src/content/hollow-house.js";
import { MAZE_RIDE_EYE_HEIGHT, MAZE_RIDE_ROOM, sampleMazeRail } from "../src/content/maze-ride.js";
import { mazeRideAvailable, buildMazeRideConfig, createMazeRide, advanceMazeRide, pauseMazeRide } from "../src/rules/maze-ride.js";

const prefabIds = MAZE_PREFABS.map(prefab => prefab.id);
function ready(tier = 1, owned = [], active = owned) {
  const state = freshState();
  Object.assign(state.hollowHouse, { purchased: true, status: "ready", tier, open: false, haunts: { owned: [...owned], active: [...active] } });
  return state;
}

// Independent floor rectangles catch rail cuts through the walls at a bend.
function insideFloor(config, x, z) {
  const within = (x0, x1, z0, z1) => x >= x0 - 1e-9 && x <= x1 + 1e-9 && z >= z0 - 1e-9 && z <= z1 + 1e-9;
  if (config.zones.some(zone => within(zone.bounds.x0, zone.bounds.x1, zone.bounds.z0, zone.bounds.z1))) return true;
  const half = MAZE_RIDE_ROOM.corridorWidth / 2;
  for (let i = 1; i < config.zones.length; i++) {
    const a = config.zones[i - 1].center, b = config.zones[i].center, middle = (a.z + b.z) / 2;
    if (within(a.x - half, a.x + half, middle, a.z)) return true;
    if (within(Math.min(a.x, b.x) - half, Math.max(a.x, b.x) + half, middle - half, middle + half)) return true;
    if (within(b.x - half, b.x + half, b.z, middle)) return true;
  }
  return false;
}

test("only a purchased, restored house admits an owner, including closed previews", () => {
  for (const state of [null, {}, { hollowHouse: null }, freshState()]) { assert.equal(mazeRideAvailable(state), false); assert.equal(buildMazeRideConfig(state), null); }
  const state = ready();
  for (const status of ["derelict", "restoring", "unknown"]) { state.hollowHouse.status = status; assert.equal(buildMazeRideConfig(state), null); }
  state.hollowHouse.status = "ready"; state.hollowHouse.purchased = false; assert.equal(mazeRideAvailable(state), false);
  state.hollowHouse.purchased = true;
  assert.equal(mazeRideAvailable(state), true); assert.equal(buildMazeRideConfig(state).tier, 1);
  state.hollowHouse.open = true; assert.equal(mazeRideAvailable(state), true);
});

test("each tier adds a baseline chamber and preserves the separate guest duration", () => {
  for (let tier = 1; tier <= 5; tier++) {
    const config = buildMazeRideConfig(ready(tier));
    assert.equal(config.tier, tier); assert.equal(config.duration, 28 + 7 * (tier - 1));
    assert.equal(config.zones.length, tier); assert.equal(config.encounters.length, tier);
    assert.equal(config.zones[0].start, 0); assert.equal(config.zones.at(-1).end, 1);
    assert.ok(config.encounters.every(event => !event.prefab));
    for (const [index, zone] of config.zones.entries()) {
      assert.equal(zone.index, index); assert.ok(zone.start < zone.end);
      if (index) assert.equal(config.zones[index - 1].end, zone.start);
      assert.equal(config.encounters.filter(event => event.zone === zone.id && event.actor).length, 1);
    }
  }
  assert.deepEqual(FOYER_TIERS.map(tier => tier.mazeSeconds), [28, 28, 28, 28, 28]);
});

test("only authoritative, owned, active and tier-valid installations enter the snapshot", () => {
  const state = ready(2, ["cobweb-canopy", "spectral-parade", "thunder-chamber", "unknown"], ["whispering-portraits", "spectral-parade", "cobweb-canopy", "cobweb-canopy", "__proto__"]);
  assert.deepEqual(buildMazeRideConfig(state).activePrefabs, ["cobweb-canopy"]);
  state.hollowHouse.haunts.owned.push("whispering-portraits");
  assert.deepEqual(buildMazeRideConfig(state).activePrefabs, ["cobweb-canopy", "whispering-portraits"]);
  state.hollowHouse.haunts.active = [];
  assert.equal(buildMazeRideConfig(state).encounters.length, 2);
  for (const haunts of [null, {}, { owned: {}, active: "cobweb-canopy" }]) { state.hollowHouse.haunts = haunts; assert.deepEqual(buildMazeRideConfig(state).activePrefabs, []); }
  for (const [input, tier] of [[-4, 1], [0, 1], [99, 5], [2.5, 1], [NaN, 1], ["5", 1]]) { state.hollowHouse.tier = input; assert.equal(buildMazeRideConfig(state).tier, tier); }
});

test("every installation combination has spaced, finite encounters in its own chamber", () => {
  for (let tier = 1; tier <= 5; tier++) for (let mask = 0; mask < 32; mask++) {
    const active = prefabIds.filter((_, index) => mask & (1 << index)), config = buildMazeRideConfig(ready(tier, prefabIds, active));
    assert.equal(config.encounters.length, tier + active.filter(id => MAZE_PREFABS.find(prefab => prefab.id === id).tier <= tier).length);
    assert.equal(new Set(config.encounters.map(event => event.id)).size, config.encounters.length);
    for (let i = 0; i < config.encounters.length; i++) {
      const event = config.encounters[i], zone = config.zones.find(zone => zone.id === event.zone);
      assert.ok(event.at >= 2); assert.ok(event.at + event.duration <= config.duration + 1e-9);
      assert.ok(event.at / config.duration >= zone.start && event.at / config.duration <= zone.end);
      assert.ok(event.intensity > 0 && event.intensity <= 1); assert.ok([-1, 1].includes(event.side));
      assert.ok(["ghoul", "clown", "scarecrow", "wraith", "haunted-girl"].includes(event.actor));
      if (i) assert.ok(event.at - config.encounters[i - 1].at >= 5 - 1e-9);
    }
  }
});

test("all tier rails sample at eye height with wall clearance and finite unit headings", () => {
  for (let tier = 1; tier <= 5; tier++) {
    const config = buildMazeRideConfig(ready(tier));
    for (let i = 0; i <= 1200; i++) {
      const point = sampleMazeRail(config, i / 1200);
      assert.ok(Object.values(point).every(Number.isFinite)); assert.equal(point.y, MAZE_RIDE_EYE_HEIGHT);
      assert.ok(Math.abs(Math.hypot(point.dx, point.dy, point.dz) - 1) < 1e-9);
      for (let angle = 0; angle < 8; angle++) assert.ok(insideFloor(config, point.x + Math.cos(angle * Math.PI / 4) * .7, point.z + Math.sin(angle * Math.PI / 4) * .7), `tier ${tier} rail ${i} clearance`);
    }
    for (let i = 1; i < config.rail.length; i++) {
      const a = config.rail[i - 1], b = config.rail[i], span = Math.hypot(b.x - a.x, b.z - a.z);
      assert.ok(span > 0 && span <= .121);
    }
    assert.deepEqual(sampleMazeRail(config, -10), sampleMazeRail(config, 0));
    assert.deepEqual(sampleMazeRail(config, 10), sampleMazeRail(config, 1));
    for (const progress of [NaN, Infinity, -Infinity, null, "bad"]) assert.ok(Object.values(sampleMazeRail(config, progress)).every(Number.isFinite));
  }
  assert.ok(Object.values(sampleMazeRail(null)).every(Number.isFinite));
});

test("rail speed uses distance rather than the number of points around a turn", () => {
  const config = buildMazeRideConfig(ready(5)), spans = [];
  for (let i = 1; i <= 2000; i++) {
    const a = sampleMazeRail(config, (i - 1) / 2000), b = sampleMazeRail(config, i / 2000);
    spans.push(Math.hypot(b.x - a.x, b.z - a.z));
  }
  assert.ok(Math.max(...spans) / Math.min(...spans) < 1.015);
});

test("pause freezes the clock, cues and status until explicit resume", () => {
  const run = createMazeRide(buildMazeRideConfig(ready(3, prefabIds)));
  assert.ok(pauseMazeRide(run, true)); assert.equal(run.status, "paused");
  const before = structuredClone(run);
  assert.deepEqual(advanceMazeRide(run, 1000), []); assert.deepEqual(run, before);
  assert.equal(pauseMazeRide(run, true), false); assert.equal(pauseMazeRide(run, "false"), false);
  assert.ok(pauseMazeRide(run, false)); assert.equal(run.status, "running");
  assert.equal(run.elapsed, 0); assert.ok(advanceMazeRide(run, 10).length > 0);
});

test("invalid deltas leave the run untouched and exact boundaries fire once", () => {
  const config = buildMazeRideConfig(ready(1)), run = createMazeRide(config), before = structuredClone(run);
  for (const dt of [NaN, Infinity, -Infinity, -1, 0, "20", null, undefined]) assert.deepEqual(advanceMazeRide(run, dt), []);
  assert.deepEqual(run, before);
  const at = config.encounters[0].at;
  assert.deepEqual(advanceMazeRide(run, at - .01), []);
  assert.equal(advanceMazeRide(run, .01).length, 1);
  assert.deepEqual(advanceMazeRide(run, .01), []);
  assert.equal(run.eventsFired.length, 1);
});

test("a large delta matches small steps and emits exactly one completion", () => {
  const config = buildMazeRideConfig(ready(5, prefabIds)), large = createMazeRide(config), small = createMazeRide(config);
  const largeCues = advanceMazeRide(large, 1e100), smallCues = [];
  while (!small.completed) smallCues.push(...advanceMazeRide(small, .13));
  assert.deepEqual(large.eventsFired, small.eventsFired); assert.equal(large.terror, small.terror);
  assert.equal(large.elapsed, config.duration); assert.equal(large.progress, 1); assert.equal(large.zone, config.zones.at(-1).id);
  assert.equal(large.status, "complete"); assert.ok(large.terror >= 0 && large.terror <= 100);
  assert.equal(largeCues.length, config.encounters.length + 1); assert.equal(smallCues.length, largeCues.length);
  assert.equal(largeCues.filter(cue => cue.type === "complete").length, 1);
  assert.equal(new Set(largeCues.map(cue => cue.id)).size, largeCues.length);
  assert.deepEqual(advanceMazeRide(large, 100), []); assert.equal(pauseMazeRide(large, true), false);
});

test("fresh replay uses the same snapshot and new cue ids without sharing runtime state", () => {
  const config = buildMazeRideConfig(ready(2, prefabIds)), first = createMazeRide(config), cues = advanceMazeRide(first, config.duration);
  const replay = createMazeRide(config);
  assert.notEqual(first.id, replay.id); assert.equal(replay.config, config); assert.equal(replay.elapsed, 0);
  assert.equal(replay.completed, false); assert.equal(replay.paused, false); assert.equal(replay.terror, 0); assert.deepEqual(replay.eventsFired, []);
  assert.ok(advanceMazeRide(replay, config.duration).every(cue => !cues.some(previous => previous.id === cue.id)));
  assert.equal(createMazeRide(null), null);
});

test("snapshots survive later upgrades and walkthroughs never change the save or ledger", () => {
  const state = ready(1, ["cobweb-canopy"]), before = JSON.stringify(saveData(state)), config = buildMazeRideConfig(state);
  const run = createMazeRide(config); advanceMazeRide(run, 9); pauseMazeRide(run, true); pauseMazeRide(run, false); advanceMazeRide(run, 100);
  assert.equal(JSON.stringify(saveData(state)), before);
  assert.ok(Object.isFrozen(config)); assert.ok(Object.isFrozen(config.encounters[0])); assert.ok(Object.isFrozen(config.rail[0]));
  state.hollowHouse.tier = 5; state.hollowHouse.haunts.owned.push("phantom-finale"); state.hollowHouse.haunts.active = ["phantom-finale"];
  assert.equal(config.tier, 1); assert.deepEqual(config.activePrefabs, ["cobweb-canopy"]);
  const next = buildMazeRideConfig(state); assert.equal(next.tier, 5); assert.deepEqual(next.activePrefabs, ["phantom-finale"]); assert.notEqual(next.key, config.key);
});
