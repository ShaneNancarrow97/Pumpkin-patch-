// Camera-relative rows and a distance-driven gait shared by painted characters.
// A row is authored coverage: missing rows/actions return null, never a mirror.
export const DIRECTION_NAMES = Object.freeze(["front", "frontRight", "right", "backRight", "back", "backLeft", "left", "frontLeft"]);
export const WALK_PHASES = Object.freeze(["left-contact", "left-down", "left-pass", "left-up", "right-contact", "right-down", "right-pass", "right-up"]);
const TURN = Math.PI * 2, SECTOR = TURN / DIRECTION_NAMES.length;
const finite = n => Number.isFinite(n);
const wrap = n => ((n % TURN) + TURN) % TURN;
const cycle = n => ((n % 1) + 1) % 1;

// Both vectors lie on the world's x/z plane. The second points at the viewer,
// so camera turns select new artwork without changing the character's heading.
export function directionalAngle(heading, towardCamera, previous = 0) {
  if (!heading || !towardCamera || ![heading.x, heading.z, towardCamera.x, towardCamera.z].every(finite) || Math.hypot(heading.x, heading.z) < 1e-6 || Math.hypot(towardCamera.x, towardCamera.z) < 1e-6) return finite(previous) ? wrap(previous) : 0;
  return wrap(Math.atan2(heading.x * towardCamera.z - heading.z * towardCamera.x, heading.x * towardCamera.x + heading.z * towardCamera.z));
}
export function directionFromAngle(angle = 0) { return DIRECTION_NAMES[Math.round(wrap(finite(angle) ? angle : 0) / SECTOR) % DIRECTION_NAMES.length]; }
export function gaitPhase(distance, strideLength = 1.2) { return finite(distance) && finite(strideLength) && strideLength > 0 ? cycle(Math.max(0, distance) / strideLength) : 0; }

// Validate once when loading, keeping the per-frame selector cheap. Partial
// manifests are allowed but their actual direction names remain explicit.
export function validDirectionalSprite(meta) {
  if (!meta || typeof meta.url !== "string" || ![meta.w, meta.h, meta.rows, meta.height].every(n => finite(n) && n > 0) || !meta.cell || ![meta.cell.w, meta.cell.h].every(n => finite(n) && n > 0) || ![meta.cell.ax, meta.cell.ay].every(finite)) return false;
  if (!Array.isArray(meta.frames) || !meta.frames.length || !Array.isArray(meta.directions) || !meta.directions.length || meta.directions.some(name => !DIRECTION_NAMES.includes(name)) || new Set(meta.directions).size !== meta.directions.length) return false;
  if (!meta.frames.every(f => f && [f.x, f.y, f.w, f.h, f.ax, f.ay].every(finite) && f.x >= 0 && f.y >= 0 && f.w === meta.cell.w && f.h === meta.cell.h && f.ax === meta.cell.ax && f.ay === meta.cell.ay && f.x + f.w <= meta.w && f.y + f.h <= meta.h && f.ax >= 0 && f.ax <= f.w && f.ay >= 0 && f.ay <= f.h)) return false;
  const validRow = row => Array.isArray(row) && row.every(index => Number.isInteger(index) && index >= 0 && index < meta.frames.length);
  if (!Array.isArray(meta.walk) || meta.walk.length !== meta.directions.length || !meta.walk.every(row => validRow(row) && row.length === WALK_PHASES.length && new Set(row).size === row.length)) return false;
  return meta.idle === undefined || Array.isArray(meta.idle) && meta.idle.length === meta.directions.length && meta.idle.every(validRow);
}

// Phase is kept independently of facing: turning never swaps the leading leg.
// Wave/talk use the original performance until their directional art is authored.
export function directionalSpritePose(meta, { angle = 0, phase = 0, walking = false, mood = "idle", time = 0 } = {}) {
  if (!meta || mood === "talk" || mood === "wave") return null;
  const direction = directionFromAngle(angle), directionIndex = meta.directions?.indexOf(direction) ?? -1, action = walking ? "walk" : "idle", list = meta[action]?.[directionIndex];
  if (directionIndex < 0 || !Array.isArray(list) || !list.length) return null;
  const progress = finite(phase) ? cycle(phase) : 0, phaseIndex = Math.min(list.length - 1, Math.floor((walking ? progress : cycle(Math.max(0, finite(time) ? time : 0) * 1.2 / list.length)) * list.length)), frame = list[phaseIndex];
  if (!Number.isInteger(frame) || frame < 0 || frame >= (meta.frames?.length ?? 0)) return null;
  return { frame, direction, directionIndex, phase: progress, phaseIndex, leadingLeg: walking && meta.locomotion !== "float" ? progress < .5 ? "left" : "right" : null, action, authored: true };
}
