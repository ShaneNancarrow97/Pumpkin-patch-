// A few transient passers-by keep to the Green and its garden walks. They never
// become customers, quest givers, colliders or members of a saved ledger.
import { PLAN_SCALE as K, ROADS } from "../content/village.js";
import { VISITOR_ROSTER } from "../content/visitors.js";
import { villageNeighbourhoodClusters, villageNeighbourhoodPaths } from "../content/village-neighbourhoods.js";
import { villageCellFree, villageWalkObstacles } from "./village-navigation.js";
import { residentSegmentFree, RESIDENT_WALK_RADIUS } from "./village-resident-life.js";

export const VILLAGE_WANDERER_LIMIT = 3;
const point = (x, z) => Object.freeze({ x: x * K, z: z * K });
// The avenues stop below the tree's roots; the northern stroll crosses behind
// it. No walk uses the carriage gate, shop counter, house step or narrow spur.
export const VILLAGE_STROLL_LANES = Object.freeze([
  Object.freeze({ id: "lantern-avenue", road: "arrival", stops: Object.freeze([point(57.35, -12.5), point(58.6, -5), point(57.7, 1), point(58.55, -7.4)]) }),
  Object.freeze({ id: "green-avenue", road: "arrival", stops: Object.freeze([point(58.55, 4.2), point(57.35, 11.8), point(58.4, 17.8), point(58.65, 9.1)]) }),
  Object.freeze({ id: "north-crossroad", road: "copse", stops: Object.freeze([point(36, 33.7), point(51, 34.35), point(65, 33.65), point(82, 34.2)]) }),
  // These lanes follow the new walks straight through the orchard and common;
  // stopping short of their bends keeps every possible leg on the paving.
  Object.freeze({ id: "cider-orchard", neighbourhood: "orchard-walk", stops: Object.freeze([point(-15, 51), point(-4, 51), point(7, 51), point(18, 51)]) }),
  Object.freeze({ id: "lantern-common", neighbourhood: "lantern-walk", stops: Object.freeze([point(83, 58), point(95, 58), point(107, 58), point(119, 58)]) }),
]);
const normalKinds = VISITOR_ROSTER.flatMap((kind, index) => kind.vip ? [] : [index]);

// Local xorshift is deliberately separate from every saved gameplay seed.
function next(routine) {
  let seed = routine.seed >>> 0; seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  routine.seed = seed >>> 0 || 0x716c6b31;
  return routine.seed / 4294967296;
}
const visitSeed = state => Math.imul((Math.floor(Number(state?.village?.visits) || 0) >>> 0) + 1, 0x9e3779b1) ^ 0x57414c4b;

function shuffle(lanes, random) {
  for (let i = lanes.length - 1; i > 0; i--) { const j = Math.floor(next(random) * (i + 1)); [lanes[i], lanes[j]] = [lanes[j], lanes[i]]; }
  return lanes;
}

// Saved furniture may divide a walk even when its individual posts stay clear.
// Pick a mutually reachable group, so all later random goals remain safe.
function clearStops(state, lane, obstacles) {
  const stops = lane.stops.filter(p => villageCellFree(state, p.x, p.z, RESIDENT_WALK_RADIUS, obstacles));
  const links = stops.map(() => []);
  const linked = (i, j) => links[i][j] ?? (links[i][j] = links[j][i] = residentSegmentFree(state, stops[i], stops[j], obstacles));
  // One swept segment proves a straight lane's shorter legs too. This avoids
  // repeatedly sampling the same long garden walk when the visit opens.
  if (stops.length >= 2) {
    let first = 0, last = 1, longest = 0;
    for (let i = 0; i < stops.length; i++) for (let j = i + 1; j < stops.length; j++) {
      const length = Math.hypot(stops[j].x - stops[i].x, stops[j].z - stops[i].z);
      if (length > longest) { first = i; last = j; longest = length; }
    }
    const a = stops[first], b = stops[last];
    if (stops.every(p => Math.abs((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x)) < 1e-8) && linked(first, last)) return stops;
  }
  const groups = stops.map((_, first) => {
    const group = [first];
    for (let i = 0; i < stops.length; i++) if (i !== first && group.every(j => linked(i, j))) group.push(i);
    return group.map(i => stops[i]);
  });
  return groups.sort((a, b) => b.length - a.length)[0] ?? [];
}

// Count, painted identities, lane and opening post are stable within a visit.
export function villageWandererPlans(state) {
  const random = { seed: visitSeed(state) }, kinds = normalKinds.slice(), count = 2 + (next(random) > .5 ? 1 : 0);
  const active = new Set(villageNeighbourhoodClusters(state).map(c => c.id)), obstacles = villageWalkObstacles(state);
  const available = VILLAGE_STROLL_LANES.filter(lane => !lane.neighbourhood || active.has(lane.neighbourhood));
  const gardens = shuffle(available.filter(lane => lane.neighbourhood), random), green = shuffle(available.filter(lane => !lane.neighbourhood), random);
  let garden = null;
  for (const lane of gardens) {
    const stops = clearStops(state, lane, obstacles);
    if (stops.length >= 2) { garden = { ...lane, stops }; break; }
  }
  // Share the same small crowd with the new spaces, retaining the original
  // Green/arrival walks. If the player covers a path, its visitors stay away.
  const lanes = garden ? [garden, ...green, ...gardens.filter(lane => lane.id !== garden.id)] : green;
  const plans = [];
  for (const lane of lanes) {
    const stops = lane === garden ? garden.stops : clearStops(state, lane, obstacles);
    if (stops.length < 2) continue;
    const kind = kinds.splice(Math.floor(next(random) * kinds.length), 1)[0];
    plans.push({ id: "village-stroll-" + plans.length, lane: lane.id, kind, stops,
      start: Math.floor(next(random) * stops.length), speed: .7 + next(random) * .28, seed: (next(random) * 4294967296) >>> 0 });
    if (plans.length === count) break;
  }
  return plans;
}

export function createVillageWandererRoutine(plan) {
  const start = plan.stops[plan.start];
  return { id: plan.id, x: start.x, z: start.z, heading: { x: 0, z: 1 }, goal: plan.start,
    wait: 1.5 + (plan.seed % 3000) / 1000, age: 0, walkAge: 0, distance: 0, walking: false, seed: plan.seed };
}

// Each leg is swept against actual bodies and decorations. A blocked guest
// waits or chooses another paved post; it never detours through a flower bed.
export function advanceVillageWanderer(state, plan, routine, dt, { paused = false, hidden = false, obstacles = villageWalkObstacles(state) } = {}) {
  routine.walking = false;
  if (paused || hidden || !Number.isFinite(dt) || dt <= 0) return routine;
  const elapsed = Math.min(.25, dt); routine.age += elapsed;
  if (!villageCellFree(state, routine.x, routine.z, RESIDENT_WALK_RADIUS, obstacles)) {
    const clear = plan.stops.find(p => villageCellFree(state, p.x, p.z, RESIDENT_WALK_RADIUS, obstacles));
    if (clear) { routine.x = clear.x; routine.z = clear.z; routine.goal = plan.stops.indexOf(clear); }
    routine.wait = 2; return routine;
  }
  if (routine.wait > 0) { routine.wait = Math.max(0, routine.wait - elapsed); return routine; }
  let goal = plan.stops[routine.goal];
  if (routine.needsGoal || Math.hypot(goal.x - routine.x, goal.z - routine.z) < .01) {
    const choices = plan.stops.flatMap((p, index) => index !== routine.goal && residentSegmentFree(state, routine, p, obstacles) ? [index] : []);
    if (!choices.length) { routine.wait = 3; return routine; }
    routine.goal = choices[Math.floor(next(routine) * choices.length)]; goal = plan.stops[routine.goal]; routine.needsGoal = false;
  }
  const dx = goal.x - routine.x, dz = goal.z - routine.z, distance = Math.hypot(dx, dz), step = Math.min(distance, plan.speed * elapsed);
  const destination = { x: routine.x + dx / distance * step, z: routine.z + dz / distance * step };
  if (!residentSegmentFree(state, routine, destination, obstacles)) { routine.needsGoal = true; routine.wait = 3; return routine; }
  routine.x = destination.x; routine.z = destination.z; routine.heading = { x: dx / distance, z: dz / distance };
  routine.distance += step; routine.walkAge += step / 1.5; routine.walking = step > 1e-6;
  if (distance <= step + 1e-6) routine.wait = 2 + next(routine) * 4;
  return routine;
}

// Roads are world units already; the native garden paths use the spread design
// grid and are converted once here. The optional state follows hidden scenery.
export function villageStrollOnPaving(point, state = null) {
  const paths = villageNeighbourhoodPaths(state).map(path => ({ width: path.width * K, points: path.points.map(([x, z]) => [x * K, z * K]) }));
  return [...ROADS.filter(road => road.kind === "main"), ...paths].some(road => road.points.slice(1).some(([bx, bz], i) => {
    const [ax, az] = road.points[i], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.z - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(point.x - ax - dx * t, point.z - az - dz * t) <= road.width / 2 - RESIDENT_WALK_RADIUS;
  }));
}
