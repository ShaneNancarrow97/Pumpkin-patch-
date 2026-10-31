// The owner's walkthrough of the Hollow House: where the rooms are, the rail
// through them and how fast it is walked. Presentation only; guest visit
// timings stay in hollow-house.js.
//
// Each chamber is entered through a doorway in the middle of its near wall.
// The rail curves to one side of the room (`side`), round the chamber's
// centrepiece, and out through the far doorway; passages link the rooms. An
// entry hall leads in from the foyer and an exit hall leads out, each with
// double doors. The rail is walked at a steady pace that slows as each scare
// comes up, holds at the doors, and takes longer the more chambers there are.
export const MAZE_RIDE_EYE_HEIGHT = 1.65;
export const MAZE_RIDE_ROOM = Object.freeze({ width: 8, depth: 10, corridorWidth: 3.6, turnRadius: .8, hall: 6, swing: 2 });
// cruise/creep: metres a second walking and while a scare comes up; slow:
// the stretch of the rail (metres before and after the scare point) walked at
// creep, eased in and out over `ease` metres; door: seconds at each end while
// the doors open; settle: metres to slow over before the exit doors.
export const MAZE_RIDE_PACE = Object.freeze({ cruise: 1.9, creep: .55, slow: [1.1, .45], ease: .8, door: 1.4, settle: 2.4, step: 1 / 20 });
export const MAZE_RIDE_CHAMBERS = Object.freeze([
  { id: "forgotten-passage", name: "Forgotten passage", x: 0, z: 0, side: -1 },
  { id: "cobweb-cellar", name: "Cobweb cellar", x: 10, z: -14, side: 1 },
  { id: "seance-parlour", name: "Séance parlour", x: 0, z: -28, side: 1 },
  { id: "storm-laboratory", name: "Storm laboratory", x: 10, z: -42, side: -1 },
  { id: "velvet-crypt", name: "Velvet crypt", x: 0, z: -56, side: -1 },
].map(Object.freeze));
export const MAZE_RIDE_BASE_ENCOUNTERS = Object.freeze([
  { actor: "ghoul", sound: "creak", intensity: .34 },
  { actor: "scarecrow", sound: "chains", intensity: .42 },
  { actor: "haunted-girl", sound: "whisper", intensity: .48 },
  { actor: "ghoul", sound: "sting", intensity: .58 },
  { actor: "wraith", sound: "whoosh", intensity: .64 },
].map(Object.freeze));
export const MAZE_RIDE_PREFAB_ENCOUNTERS = Object.freeze({
  "cobweb-canopy": Object.freeze({ actor: "scarecrow", sound: "skitter", intensity: .4 }),
  "whispering-portraits": Object.freeze({ actor: "clown", sound: "whisper", intensity: .5 }),
  "spectral-parade": Object.freeze({ actor: "wraith", sound: "whoosh", intensity: .58 }),
  "thunder-chamber": Object.freeze({ actor: "ghoul", sound: "thunder", intensity: .7 }),
  "phantom-finale": Object.freeze({ actor: "wraith", sound: "sting", intensity: .82 }),
});
// Where in a chamber its scares wait, as offsets along the room from its centre
// (+z is back towards the entrance): the baseline early, an installed haunt late.
export const MAZE_RIDE_SCARE_AT = Object.freeze({ baseline: 1.9, prefab: -3 });

const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
const point = (x, z) => ({ x, y: MAZE_RIDE_EYE_HEIGHT, z });
const smooth = (t) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const railCache = new WeakMap();

// Floor rectangles: the rooms, the three legs of each passage, and the halls.
export function mazeRideRegions(config) {
  const zones = config?.zones ?? [], half = MAZE_RIDE_ROOM.corridorWidth / 2, hall = MAZE_RIDE_ROOM.hall;
  const regions = zones.map(z => ({ ...z.bounds, zone: z.index, kind: "room" }));
  for (let i = 1; i < zones.length; i++) {
    const a = zones[i - 1].center, b = zones[i].center, bend = (a.z + b.z) / 2;
    regions.push({ x0: a.x - half, x1: a.x + half, z0: bend - half, z1: a.z, zone: i - 1, kind: "passage" });
    regions.push({ x0: Math.min(a.x, b.x) - half, x1: Math.max(a.x, b.x) + half, z0: bend - half, z1: bend + half, zone: i - 1, kind: "passage" });
    regions.push({ x0: b.x - half, x1: b.x + half, z0: b.z, z1: bend + half, zone: i, kind: "passage" });
  }
  if (zones.length) {
    const first = zones[0].center, last = zones.at(-1).center;
    regions.push({ x0: first.x - half, x1: first.x + half, z0: first.z, z1: first.z + 5 + hall, zone: 0, kind: "entry" });
    regions.push({ x0: last.x - half, x1: last.x + half, z0: last.z - 5 - hall, z1: last.z, zone: zones.length - 1, kind: "exit" });
  }
  return regions;
}

// Short straight spans and rounded elbows keep interpolation within the floor union.
function roundedRail(vertices) {
  const rail = [{ ...vertices[0] }];
  const lineTo = p => {
    const a = rail.at(-1), steps = Math.ceil(distance(a, p) / .1);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      rail.push({ x: a.x + (p.x - a.x) * t, y: MAZE_RIDE_EYE_HEIGHT, z: a.z + (p.z - a.z) * t });
    }
  };
  for (let i = 1; i < vertices.length - 1; i++) {
    const a = vertices[i - 1], b = vertices[i], c = vertices[i + 1];
    const ab = distance(a, b), bc = distance(b, c);
    const ux = (b.x - a.x) / ab, uz = (b.z - a.z) / ab, vx = (c.x - b.x) / bc, vz = (c.z - b.z) / bc;
    if (ux * vx + uz * vz > .999) { lineTo(b); continue; }
    const r = Math.min(MAZE_RIDE_ROOM.turnRadius * (ux * vx + uz * vz > .5 ? 2 : 1), ab / 2.2, bc / 2.2);
    const enter = point(b.x - ux * r, b.z - uz * r), leave = point(b.x + vx * r, b.z + vz * r);
    lineTo(enter);
    const steps = Math.ceil(r * 2 / .08);
    for (let j = 1; j <= steps; j++) {
      const t = j / steps, q = 1 - t;
      rail.push(point(q * q * enter.x + 2 * q * t * b.x + t * t * leave.x, q * q * enter.z + 2 * q * t * b.z + t * t * leave.z));
    }
  }
  lineTo(vertices.at(-1));
  return rail;
}

// Cache immutable authored rails; caller-owned mutable rails are sampled afresh.
function railMetrics(rail) {
  if (Object.isFrozen(rail) && railCache.has(rail)) return railCache.get(rail);
  const lengths = [0];
  for (let i = 1; i < rail.length; i++) lengths.push(lengths[i - 1] + distance(rail[i - 1], rail[i]));
  const result = { lengths, total: lengths.at(-1) || 0 };
  if (Object.isFrozen(rail)) railCache.set(rail, result);
  return result;
}
// How far along the rail (metres) its closest point to (x, z) lies.
function distanceNear(rail, metrics, x, z) {
  let best = 0;
  for (let i = 1; i < rail.length; i++) if (Math.hypot(rail[i].x - x, rail[i].z - z) < Math.hypot(rail[best].x - x, rail[best].z - z)) best = i;
  return metrics.lengths[best];
}

// The pace along the rail: cruise, creeping past each scare point, slowing to the exit doors.
function paceAt(d, total, scares) {
  const P = MAZE_RIDE_PACE;
  let v = P.cruise;
  for (const s of scares) {
    const before = s - P.slow[0], after = s + P.slow[1];
    const w = d < before ? smooth(1 - (before - d) / P.ease) : d > after ? smooth(1 - (d - after) / P.ease) : 1;
    v = Math.min(v, P.cruise - (P.cruise - P.creep) * w);
  }
  const start = smooth(d / 1.2), end = smooth((total - d) / P.settle);
  return Math.max(.12, v * (.3 + .7 * start) * (.35 + .65 * end));
}
// Distance travelled at even time steps: a door hold, the walk, a door hold.
function buildTimeline(total, scares) {
  const P = MAZE_RIDE_PACE, samples = [];
  const hold = Math.round(P.door / P.step);
  for (let i = 0; i < hold; i++) samples.push(0);
  let d = 0, t = 0, next = P.step;
  while (d < total) {
    const dd = Math.min(.01, total - d), dt = dd / paceAt(d + dd / 2, total, scares);
    while (t + dt >= next && d < total) { samples.push(d + dd * (next - t) / dt); next += P.step; }
    t += dt; d += dd;
  }
  samples.push(total);
  for (let i = 0; i < hold; i++) samples.push(total);
  return { step: P.step, distances: samples, duration: (samples.length - 1) * P.step };
}

// The rail, chamber zones, scare points and timeline for a foyer tier.
export function buildMazeRideRoute(tier) {
  const count = Number.isInteger(tier) ? clamp(tier, 1, 5) : 1, R = MAZE_RIDE_ROOM;
  const chambers = MAZE_RIDE_CHAMBERS.slice(0, count), first = chambers[0], last = chambers.at(-1);
  const vertices = [point(first.x, first.z + 5 + R.hall - .7)];
  for (let i = 0; i < chambers.length; i++) {
    const room = chambers[i], next = chambers[i + 1], s = room.side;
    vertices.push(point(room.x, room.z + 5), point(room.x + s * R.swing, room.z + 2.4), point(room.x + s * R.swing, room.z - 2.4), point(room.x, room.z - 5));
    if (next) vertices.push(point(room.x, room.z - 7), point(next.x, room.z - 7));
    else vertices.push(point(room.x, room.z - 5 - R.hall + 1.7));
  }
  const rail = roundedRail(vertices), metrics = railMetrics(rail);
  // Each chamber's zone begins at its doorway (the first takes the entry hall,
  // the last the exit hall), so its name shows as you step into it.
  const doors = chambers.map((room, i) => (i ? distanceNear(rail, metrics, room.x, room.z + 5) / metrics.total : 0));
  const zones = chambers.map((room, index) => ({
    id: room.id, name: room.name, index, side: room.side,
    start: doors[index], end: index < chambers.length - 1 ? doors[index + 1] : 1,
    center: { x: room.x, z: room.z }, bounds: { x0: room.x - R.width / 2, x1: room.x + R.width / 2, z0: room.z - R.depth / 2, z1: room.z + R.depth / 2 },
  }));
  const scarePoints = chambers.map(room => ({
    baseline: distanceNear(rail, metrics, room.x + room.side * R.swing, room.z + MAZE_RIDE_SCARE_AT.baseline),
    prefab: distanceNear(rail, metrics, room.x + room.side * R.swing, room.z + MAZE_RIDE_SCARE_AT.prefab),
  }));
  return { rail, zones, scarePoints, length: metrics.total };
}
// The timeline for a route, given the distances (metres) at which scares wait.
export function buildMazeRideTimeline(route, scares) {
  return buildTimeline(route.length, [...scares].sort((a, b) => a - b));
}
// How far along the rail (0..1) the walk is after `elapsed` seconds.
export function mazeProgressAt(config, elapsed) {
  const line = config?.timeline, list = line?.distances;
  if (!Array.isArray(list) || !list.length) return clamp((Number(elapsed) || 0) / Math.max(1e-9, config?.duration || 1), 0, 1);
  const total = list.at(-1) || 1, t = clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, (list.length - 1) * line.step) / line.step;
  const i = Math.floor(t), a = list[i], b = list[Math.min(list.length - 1, i + 1)];
  return clamp((a + (b - a) * (t - i)) / total, 0, 1);
}
// When the walk reaches a distance (metres) along the rail.
export function mazeTimeAtDistance(timeline, d) {
  const list = timeline.distances;
  let i = 0; while (i < list.length - 1 && list[i + 1] < d) i++;
  const a = list[i], b = list[Math.min(list.length - 1, i + 1)];
  return (i + (b > a ? clamp((d - a) / (b - a), 0, 1) : 0)) * timeline.step;
}

// Locate an arc distance without slowing down at densely sampled bends.
function atDistance(rail, metrics, d) {
  let low = 1, high = rail.length - 1;
  while (low < high) { const mid = (low + high) >> 1; if (metrics.lengths[mid] < d) low = mid + 1; else high = mid; }
  const a = rail[low - 1], b = rail[low], span = metrics.lengths[low] - metrics.lengths[low - 1];
  const t = span ? clamp((d - metrics.lengths[low - 1]) / span, 0, 1) : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

// Progress is the fraction of the rail's length; the direction is a small, comfortable look-ahead tangent.
export function sampleMazeRail(config, progress = 0) {
  const rail = config?.rail;
  if (!Array.isArray(rail) || rail.length < 2) return { x: 0, y: MAZE_RIDE_EYE_HEIGHT, z: 4.1, dx: 0, dy: 0, dz: -1 };
  const metrics = railMetrics(rail), p = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0, d = p * metrics.total;
  const position = atDistance(rail, metrics, d), before = atDistance(rail, metrics, Math.max(0, d - .18)), after = atDistance(rail, metrics, Math.min(metrics.total, d + .18));
  const dx = after.x - before.x, dy = after.y - before.y, dz = after.z - before.z, length = Math.hypot(dx, dy, dz);
  return { ...position, dx: length ? dx / length : 0, dy: length ? dy / length : 0, dz: length ? dz / length : -1 };
}
