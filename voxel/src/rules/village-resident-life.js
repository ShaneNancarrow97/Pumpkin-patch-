// Small Green routines, in realm/world units. They are transient presentation
// state: quests keep their own clock, and returning to the village resets no save.
import { PLAN_SCALE as K } from "../content/village.js";
import { villageCellFree, villageWalkObstacles } from "./village-navigation.js";

export const RESIDENT_WALK_RADIUS = .42;
export const RESIDENT_WALK_SPEED = .72;
const FACE = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };
const stop = (x, z, face, wait, activity, extra = {}) => Object.freeze({ x: x * K, z: z * K, face, wait, activity, ...extra });
const ROUTES = Object.freeze({
  "elowen-green": [stop(53.6, 30.2, "south", 14, "watching the lanterns"), stop(52.8, 31.4, "west", 8, "reading her almanac"), stop(53.6, 30.2, "south", 12, "greeting neighbours", { wave: true }), stop(53.4, 28.9, "west", 8, "checking the well lantern")],
  "elowen-library": [stop(49.6, 21.6, "east", 16, "at the library"), stop(49.6, 20, "east", 7, "checking the library door"), stop(51, 20.2, "east", 7, "greeting neighbours", { wave: true }), stop(49.6, 20, "north", 0, "returning to the library")],
  "rowan-bench": [stop(53.8, 20.6, "south", 12, "beside the bench"), stop(52.7, 21.2, "north", 0, "walking to the bench"), stop(52.7, 22.4, "west", 10, "checking the bench"), stop(52.7, 21.2, "south", 0, "returning from the bench"), stop(53.8, 20.6, "south", 10, "greeting neighbours", { wave: true }), stop(52.4, 20, "east", 6, "checking his tools")],
  // The narrow passage is measured between the stall and workshop footing.
  // Keep its exact x; a grid-rounded point would put Rowan inside one of them.
  "rowan-stall": [stop(65.9, 24.6, "west", 18, "at his stall", { reach: 3.8 * K, approach: { x: 65.9 * K, z: 27.5 * K } }), stop(65.9, 27.5, "west", 0, "walking round the awning"), stop(64.6, 27.6, "north", 9, "checking the awning", { wave: true }), stop(65.9, 27.5, "south", 0, "returning to his stall")],
});
Object.values(ROUTES).forEach(Object.freeze);

export function residentRoute(state, id) {
  const v = state?.village;
  const key = id === "elowen" ? v?.built?.["elowen-conservatory"] ? "elowen-library" : "elowen-green" : id === "rowan" ? v?.unlocks?.includes("stall") ? "rowan-stall" : "rowan-bench" : null;
  return key ? { key, stops: ROUTES[key] } : null;
}

// Check the whole segment, including its start, so even a long frame cannot
// skip a fence or cut a corner of newly placed furniture.
export function residentSegmentFree(state, from, to, obstacles = villageWalkObstacles(state)) {
  if (!from || !to || ![from.x, from.z, to.x, to.z].every(Number.isFinite)) return false;
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / .12));
  for (let i = 0; i <= steps; i++) if (!villageCellFree(state, from.x + (to.x - from.x) * i / steps, from.z + (to.z - from.z) * i / steps, RESIDENT_WALK_RADIUS, obstacles)) return false;
  return true;
}

// Usually a leg is one clear segment. A bounded deterministic search handles
// furniture and a changed home post; no route can leave the playable Green.
export function findResidentPath(state, from, to, obstacles = villageWalkObstacles(state)) {
  if (residentSegmentFree(state, from, to, obstacles)) return [{ x: to.x, z: to.z }];
  const free = p => villageCellFree(state, p.x, p.z, RESIDENT_WALK_RADIUS, obstacles);
  if (!free(from) || !free(to)) return [];
  const step = .6, margin = 8, lowX = Math.min(from.x, to.x) - margin, highX = Math.max(from.x, to.x) + margin, lowZ = Math.min(from.z, to.z) - margin, highZ = Math.max(from.z, to.z) + margin;
  const key = (x, z) => `${x},${z}`, distance = p => Math.hypot(to.x - p.x, to.z - p.z);
  const start = { x: from.x, z: from.z, ix: 0, iz: 0, g: 0, f: distance(from), previous: null }, open = [start], best = new Map([[key(0, 0), 0]]);
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
  for (let count = 0; open.length && count < 3500; count++) {
    let nearest = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[nearest].f) nearest = i;
    const current = open.splice(nearest, 1)[0];
    if (current.g > best.get(key(current.ix, current.iz))) continue;
    if (distance(current) < 2.4 && residentSegmentFree(state, current, to, obstacles)) {
      const path = [{ x: to.x, z: to.z }];
      for (let p = current; p.previous; p = p.previous) path.unshift({ x: p.x, z: p.z });
      // Keep only turns with a clear swept segment between them.
      const smooth = []; let last = from;
      for (let i = 0; i < path.length;) { let end = path.length - 1; while (end > i && !residentSegmentFree(state, last, path[end], obstacles)) end--; smooth.push(path[end]); last = path[end]; i = end + 1; }
      return smooth;
    }
    for (const [dx, dz] of directions) {
      const ix = current.ix + dx, iz = current.iz + dz, x = from.x + ix * step, z = from.z + iz * step, g = current.g + Math.hypot(dx, dz) * step, k = key(ix, iz);
      if (x < lowX || x > highX || z < lowZ || z > highZ || g >= (best.get(k) ?? Infinity)) continue;
      const point = { x, z }; if (!residentSegmentFree(state, current, point, obstacles)) continue;
      best.set(k, g); open.push({ ...point, ix, iz, g, f: g + distance(point), previous: current });
    }
  }
  return [];
}

export function createResidentRoutine(state, id) {
  const route = residentRoute(state, id); if (!route) return null;
  const home = route.stops[0];
  return { id, key: route.key, x: home.x, z: home.z, yaw: FACE[home.face], stop: 0, wait: id === "elowen" ? 4 : 7, path: [], travelling: false, walking: false, walkAge: 0, action: "idle", activity: home.activity, reach: home.reach };
}

function routeTo(state, routine, target, obstacles) {
  if (residentSegmentFree(state, routine, target, obstacles)) return [{ x: target.x, z: target.z }];
  if (target.approach && residentSegmentFree(state, target.approach, target, obstacles)) {
    const path = findResidentPath(state, routine, target.approach, obstacles);
    if (path.length) return [...path, { x: target.x, z: target.z }];
  }
  return findResidentPath(state, routine, target, obstacles);
}

// Mutates only this plain transient routine; render objects and saved state are
// untouched. Pausing keeps the exact foot position and resumes the same leg.
export function advanceResidentRoutine(state, routine, dt, { obstacles = villageWalkObstacles(state), paused = false, reducedMotion = false, talking = false, waving = false } = {}) {
  if (!routine) return routine;
  const route = residentRoute(state, routine.id);
  routine.walking = false; routine.action = talking ? "talk" : waving ? "wave" : "idle";
  if (!route || paused || reducedMotion || talking || waving || !Number.isFinite(dt) || dt <= 0) return routine;
  if (routine.key !== route.key) { routine.key = route.key; routine.stop = 0; routine.wait = 0; routine.path = []; routine.travelling = true; }
  const elapsed = Math.min(dt, .25), target = route.stops[routine.stop];
  if (routine.wait > 0) {
    routine.wait = Math.max(0, routine.wait - elapsed);
    if (!routine.travelling && target.wave && routine.wait > target.wait - 2.2) routine.action = "wave";
    return routine;
  }
  if (!routine.travelling) { routine.stop = (routine.stop + 1) % route.stops.length; routine.travelling = true; routine.path = []; }
  const destination = route.stops[routine.stop];
  if (!routine.path.length) routine.path = routeTo(state, routine, destination, obstacles);
  if (!routine.path.length) { routine.wait = 3; routine.activity = "waiting for a clear path"; return routine; }
  const next = routine.path[0], distance = Math.hypot(next.x - routine.x, next.z - routine.z), stride = Math.min(distance, RESIDENT_WALK_SPEED * elapsed);
  const point = distance ? { x: routine.x + (next.x - routine.x) * stride / distance, z: routine.z + (next.z - routine.z) * stride / distance } : next;
  if (!residentSegmentFree(state, routine, point, obstacles)) { routine.path = []; routine.wait = 1.5; routine.activity = "waiting for a clear path"; return routine; }
  if (stride > 1e-6) { routine.yaw = Math.atan2(point.x - routine.x, routine.z - point.z); routine.x = point.x; routine.z = point.z; routine.walking = true; routine.walkAge += stride / RESIDENT_WALK_SPEED; routine.action = "walk"; routine.activity = destination.activity; routine.reach = undefined; }
  if (distance <= stride + 1e-6) {
    routine.path.shift();
    if (!routine.path.length) { routine.travelling = false; routine.wait = destination.wait; routine.yaw = FACE[destination.face]; routine.reach = destination.reach; }
  }
  return routine;
}

// Follow the live figure, preferring the way it faces. Near furniture, try a
// clear side instead of offering a conversation point inside a wall or planter.
export function residentTalkPoint(state, pose, obstacles = villageWalkObstacles(state)) {
  const yaw = pose.yaw ?? FACE[pose.face] ?? 0;
  if (pose.reach) {
    const across = { x: pose.x + Math.sin(yaw) * pose.reach, z: pose.z - Math.cos(yaw) * pose.reach };
    if (villageCellFree(state, across.x, across.z, RESIDENT_WALK_RADIUS, obstacles)) return across;
  }
  for (const reach of [1.8, 1.1, .6]) for (const turn of [0, Math.PI / 2, -Math.PI / 2, Math.PI, Math.PI / 4, -Math.PI / 4]) {
    const point = { x: pose.x + Math.sin(yaw + turn) * reach, z: pose.z - Math.cos(yaw + turn) * reach };
    if (residentSegmentFree(state, pose, point, obstacles)) return point;
  }
  return { x: pose.x, z: pose.z };
}
