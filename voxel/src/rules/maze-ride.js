// A temporary owner walkthrough cannot charge tickets or change the farm save.
import { MAZE_PREFABS } from "../content/hollow-house.js";
import { buildMazeRideRoute, buildMazeRideTimeline, mazeProgressAt, mazeTimeAtDistance, MAZE_RIDE_BASE_ENCOUNTERS, MAZE_RIDE_PREFAB_ENCOUNTERS } from "../content/maze-ride.js";
export { sampleMazeRail, mazeProgressAt } from "../content/maze-ride.js";

let nextRun = 1;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const ids = value => new Set(Array.isArray(value) ? value.filter(id => typeof id === "string") : []);

// Owners may preview a restored attraction while its ticket counter is closed.
export const mazeRideAvailable = state => state?.hollowHouse?.purchased === true && state.hollowHouse.status === "ready";

// Freeze the snapshot so upgrades and switches only affect the next visit.
function freezeSnapshot(value) {
  if (value && typeof value === "object") { for (const child of Object.values(value)) freezeSnapshot(child); Object.freeze(value); }
  return value;
}

// Baseline scares remain available without any purchased installation.
export function buildMazeRideConfig(state) {
  if (!mazeRideAvailable(state)) return null;
  const house = state.hollowHouse, tier = Number.isInteger(house.tier) ? clamp(house.tier, 1, 5) : 1;
  const owned = ids(house.haunts?.owned), active = ids(house.haunts?.active);
  const prefabs = MAZE_PREFABS.filter(prefab => prefab.tier <= tier && owned.has(prefab.id) && active.has(prefab.id));
  // Scares wait at set places in each chamber: the baseline early on, an
  // installed haunt further round. The walk slows as each comes up, so their
  // times follow from the timeline rather than fixing it.
  const route = buildMazeRideRoute(tier), { rail, zones } = route, planned = [];
  for (const zone of zones) {
    const prefab = prefabs.find(item => item.tier === zone.index + 1), at = route.scarePoints[zone.index];
    planned.push({ id: zone.id + ":baseline", distance: at.baseline, ...MAZE_RIDE_BASE_ENCOUNTERS[zone.index], side: zone.side, zone: zone.id, prefab: null });
    if (prefab) planned.push({ id: zone.id + ":" + prefab.id, distance: at.prefab, ...MAZE_RIDE_PREFAB_ENCOUNTERS[prefab.id], side: zone.side, zone: zone.id, prefab: prefab.id });
  }
  const timeline = buildMazeRideTimeline(route, planned.map(e => e.distance)), duration = timeline.duration;
  // A scare starts a moment before the walk reaches its point, so the reveal peaks beside you.
  const encounters = planned.map(({ distance, ...e }) => ({ ...e, at: Math.round((mazeTimeAtDistance(timeline, distance) - 1) * 100) / 100, duration: 3 }));
  encounters.sort((a, b) => a.at - b.at);
  const activePrefabs = prefabs.map(prefab => prefab.id);
  return freezeSnapshot({ key: "maze-ride-v2:" + tier + ":" + (activePrefabs.join(",") || "baseline"), tier, title: "The Hollow House", duration, zones, rail, timeline, encounters, activePrefabs });
}

// Fresh replay state supplies new cue ids without storing anything in the farm.
export function createMazeRide(config) {
  if (!config || !Number.isFinite(config.duration) || config.duration <= 0 || !Array.isArray(config.zones) || !config.zones.length || !Array.isArray(config.rail) || config.rail.length < 2 || !Array.isArray(config.encounters)) return null;
  return { id: "maze-run-" + nextRun++, config, elapsed: 0, progress: 0, paused: false, completed: false, status: "running", eventsFired: [], terror: 0, zone: config.zones[0].id, zoneName: config.zones[0].name };
}

// A large frame emits every crossed cue once, in authored order, then completes.
export function advanceMazeRide(run, dt) {
  if (!run || run.paused || run.completed || !Number.isFinite(dt) || dt <= 0) return [];
  const config = run.config, cues = [];
  run.elapsed = Math.min(config.duration, run.elapsed + dt);
  run.progress = run.elapsed >= config.duration ? 1 : mazeProgressAt(config, run.elapsed);
  const zone = config.zones.find(item => run.progress < item.end) ?? config.zones.at(-1);
  run.zone = zone.id; run.zoneName = zone.name;
  for (const encounter of config.encounters) {
    if (encounter.at > run.elapsed || run.eventsFired.includes(encounter.id)) continue;
    run.eventsFired.push(encounter.id);
    run.terror = clamp(run.terror + Math.round(encounter.intensity * 14), 0, 100);
    cues.push({ ...encounter, type: "encounter", encounterId: encounter.id, id: run.id + ":" + encounter.id });
  }
  if (run.elapsed >= config.duration) {
    run.completed = true; run.status = "complete";
    cues.push({ type: "complete", id: run.id + ":complete", at: config.duration, terror: run.terror });
  }
  return cues;
}

// Pausing only touches the walkthrough; ordinary farm simulation keeps its rules.
export function pauseMazeRide(run, paused = true) {
  if (!run || run.completed || typeof paused !== "boolean" || run.paused === paused) return false;
  run.paused = paused; run.status = paused ? "paused" : "running"; return true;
}
