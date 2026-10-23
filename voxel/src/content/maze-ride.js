// The owner's rail is presentation only; guest visit timings stay in Hollow House.
export const MAZE_RIDE_EYE_HEIGHT = 1.65;
export const MAZE_RIDE_ROOM = Object.freeze({ width: 8, depth: 10, corridorWidth: 3.6, turnRadius: .8 });
export const MAZE_RIDE_CHAMBERS = Object.freeze([
  { id: "forgotten-passage", name: "Forgotten passage", x: 0, z: 0 },
  { id: "cobweb-cellar", name: "Cobweb cellar", x: 10, z: -14 },
  { id: "seance-parlour", name: "Séance parlour", x: 0, z: -28 },
  { id: "storm-laboratory", name: "Storm laboratory", x: 10, z: -42 },
  { id: "velvet-crypt", name: "Velvet crypt", x: 0, z: -56 },
].map(Object.freeze));
export const MAZE_RIDE_BASE_ENCOUNTERS = Object.freeze([
  { actor: "ghoul", side: -1, sound: "creak", intensity: .34 },
  { actor: "scarecrow", side: 1, sound: "chains", intensity: .42 },
  { actor: "haunted-girl", side: -1, sound: "whisper", intensity: .48 },
  { actor: "ghoul", side: 1, sound: "sting", intensity: .58 },
  { actor: "wraith", side: -1, sound: "whoosh", intensity: .64 },
].map(Object.freeze));
export const MAZE_RIDE_PREFAB_ENCOUNTERS = Object.freeze({
  "cobweb-canopy": Object.freeze({ actor: "scarecrow", sound: "skitter", intensity: .4 }),
  "whispering-portraits": Object.freeze({ actor: "clown", sound: "whisper", intensity: .5 }),
  "spectral-parade": Object.freeze({ actor: "wraith", sound: "whoosh", intensity: .58 }),
  "thunder-chamber": Object.freeze({ actor: "ghoul", sound: "thunder", intensity: .7 }),
  "phantom-finale": Object.freeze({ actor: "wraith", sound: "sting", intensity: .82 }),
});

const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
const point = (x, z) => ({ x, y: MAZE_RIDE_EYE_HEIGHT, z });
const railCache = new WeakMap();

// Short straight spans and rounded elbows keep interpolation within the floor union.
function roundedRail(vertices) {
  const rail = [{ ...vertices[0] }];
  const lineTo = p => {
    const a = rail.at(-1), steps = Math.ceil(distance(a, p) / .12);
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
    const r = Math.min(MAZE_RIDE_ROOM.turnRadius, ab / 3, bc / 3);
    const enter = point(b.x - ux * r, b.z - uz * r), leave = point(b.x + vx * r, b.z + vz * r);
    lineTo(enter);
    const steps = Math.ceil(r * 2 / .1);
    for (let j = 1; j <= steps; j++) {
      const t = j / steps, q = 1 - t;
      rail.push(point(q * q * enter.x + 2 * q * t * b.x + t * t * leave.x, q * q * enter.z + 2 * q * t * b.z + t * t * leave.z));
    }
  }
  lineTo(vertices.at(-1));
  return rail;
}

// The same room bounds and gap elbows are used to build the native maze geometry.
export function buildMazeRideRoute(tier) {
  const count = Number.isInteger(tier) ? clamp(tier, 1, 5) : 1;
  const chambers = MAZE_RIDE_CHAMBERS.slice(0, count), vertices = [point(chambers[0].x, chambers[0].z + 4.1)];
  for (let i = 0; i < chambers.length; i++) {
    const room = chambers[i], next = chambers[i + 1];
    vertices.push(point(room.x, room.z));
    if (next) vertices.push(point(room.x, room.z - 5), point(room.x, room.z - 7), point(next.x, room.z - 7), point(next.x, next.z + 5));
    else vertices.push(point(room.x, room.z - 4.1));
  }
  const rail = roundedRail(vertices), metrics = railMetrics(rail);
  const centres = chambers.map(room => {
    let nearest = 0;
    for (let i = 1; i < rail.length; i++) if (Math.hypot(rail[i].x - room.x, rail[i].z - room.z) < Math.hypot(rail[nearest].x - room.x, rail[nearest].z - room.z)) nearest = i;
    return metrics.lengths[nearest] / metrics.total;
  });
  const zones = chambers.map((room, index) => ({
    id: room.id, name: room.name, index,
    start: index ? (centres[index - 1] + centres[index]) / 2 : 0,
    end: index < chambers.length - 1 ? (centres[index] + centres[index + 1]) / 2 : 1,
    center: { x: room.x, z: room.z }, bounds: { x0: room.x - 4, x1: room.x + 4, z0: room.z - 5, z1: room.z + 5 },
  }));
  return { rail, zones };
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

// Locate an arc distance without slowing down at densely sampled bends.
function atDistance(rail, metrics, d) {
  let low = 1, high = rail.length - 1;
  while (low < high) { const mid = (low + high) >> 1; if (metrics.lengths[mid] < d) low = mid + 1; else high = mid; }
  const a = rail[low - 1], b = rail[low], span = metrics.lengths[low] - metrics.lengths[low - 1];
  const t = span ? clamp((d - metrics.lengths[low - 1]) / span, 0, 1) : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

// Progress is normalised; the direction is a small, comfortable look-ahead tangent.
export function sampleMazeRail(config, progress = 0) {
  const rail = config?.rail;
  if (!Array.isArray(rail) || rail.length < 2) return { x: 0, y: MAZE_RIDE_EYE_HEIGHT, z: 4.1, dx: 0, dy: 0, dz: -1 };
  const metrics = railMetrics(rail), p = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0, d = p * metrics.total;
  const position = atDistance(rail, metrics, d), before = atDistance(rail, metrics, Math.max(0, d - .18)), after = atDistance(rail, metrics, Math.min(metrics.total, d + .18));
  const dx = after.x - before.x, dy = after.y - before.y, dz = after.z - before.z, length = Math.hypot(dx, dy, dz);
  return { ...position, dx: length ? dx / length : 0, dy: length ? dy / length : 0, dz: length ? dz / length : -1 };
}
