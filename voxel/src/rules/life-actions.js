// Tool work is transient. Only the caller commits the existing farming rule
// after receiving one completion; releasing early never changes the farm.
import { barnBlocked, openPlots } from './farm.js';
import { wateringStatus } from './hands-on.js';

export const LIFE_ACTIONS = Object.freeze({
  plant: Object.freeze({ seconds: .8, label: 'Planting' }),
  water: Object.freeze({ seconds: 1.1, label: 'Watering' }),
  harvest: Object.freeze({ seconds: .75, label: 'Picking' }),
  clean: Object.freeze({ seconds: 1, label: 'Cleaning' }),
});
export const ACTION_REACH = 2.05;
const finite = n => Number.isFinite(n);

// Shared availability prevents held tools repeatedly acting on the wrong phase.
export function actionAvailable(s, target, kind) {
  if (!s || s.paused || !target || !LIFE_ACTIONS[kind]) return false;
  if (kind === 'clean') return target.type === 'litter' && typeof target.id === 'string' && !!s.cleanliness?.litter.some(p => p.id === target.id);
  if (target.type !== 'plot' || !Number.isInteger(target.index) || target.index < 0 || target.index >= openPlots(s)) return false;
  const p = s.plots[target.index];
  if (kind === 'plant') return p?.phase === 'empty';
  if (kind === 'water') return wateringStatus(s, target.index).available;
  return p?.phase === 'ready' && !barnBlocked(s);
}

export function toolForTarget(s, target, tool = 'hand') {
  if (tool !== 'hand') return LIFE_ACTIONS[tool] ? tool : null;
  if (target?.type === 'litter') return 'clean';
  const phase = target?.type === 'plot' && s?.plots[target.index]?.phase;
  return phase === 'empty' ? 'plant' : phase === 'growing' ? 'water' : phase === 'ready' ? 'harvest' : null;
}

// Snapshot the crop identity as well as its phase. Another helper may replace
// that crop during the gesture; the original gesture must not affect the new one.
export function beginAction(s, target, tool = 'hand') {
  const kind = toolForTarget(s, target, tool);
  if (!actionAvailable(s, target, kind) || finite(target.distance) && target.distance > ACTION_REACH) return null;
  const saved = target.type === 'plot' ? { type: 'plot', index: target.index } : { type: 'litter', id: target.id };
  for (const key of ['x', 'z']) if (finite(target[key])) saved[key] = target[key];
  return { kind, target: saved, elapsed: 0, duration: LIFE_ACTIONS[kind].seconds, label: LIFE_ACTIONS[kind].label, status: 'active', crop: target.type === 'plot' ? s.plots[target.index] : null };
}

export const actionProgress = job => !job || job.status === 'cancelled' || job.status === 'invalid' ? 0 : Math.max(0, Math.min(1, job.elapsed / job.duration));

// A completion is consumed here before the caller runs the purchase/harvest
// rule, so a large frame or a held button cannot charge or harvest twice.
export function tickAction(s, job, dt) {
  if (!job || job.status !== 'active' || !finite(dt) || dt <= 0 || s?.paused) return null;
  if (!actionAvailable(s, job.target, job.kind) || job.crop && s.plots[job.target.index] !== job.crop) { job.status = 'invalid'; return null; }
  job.elapsed = Math.min(job.duration, job.elapsed + dt);
  if (job.elapsed + 1e-9 < job.duration) return null;
  job.status = 'completed';
  return { kind: job.kind, target: { ...job.target } };
}

export function cancelAction(job) {
  if (!job || job.status !== 'active') return false;
  job.status = 'cancelled'; return true;
}

// Held tools continue to the closest suitable neighbour, never a map-wide
// harvest. The controller walks there and rechecks reach before starting it.
export function selectNextPlot(s, current, kind, positions, radius = 3.2) {
  const index = Number.isInteger(current) ? current : current?.index;
  const from = positions?.[index];
  if (!from || !finite(from.x) || !finite(from.z) || !finite(radius) || radius <= 0) return null;
  const candidates = [];
  for (let i = 0; i < openPlots(s); i++) {
    const p = positions[i];
    if (i === index || !p || !finite(p.x) || !finite(p.z) || !actionAvailable(s, { type: 'plot', index: i }, kind)) continue;
    const distance = Math.hypot(p.x - from.x, p.z - from.z);
    if (distance <= radius) candidates.push({ type: 'plot', index: i, x: p.x, z: p.z, distance });
  }
  candidates.sort((a, b) => a.distance - b.distance || a.index - b.index);
  return candidates[0] ?? null;
}
