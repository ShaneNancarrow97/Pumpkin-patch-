// Sprite geometry and timing use one measured body scale and a shared foot
// anchor. Changing the walking frame must never resize or lift a neighbour.
export const VILLAGE_PERSON_HEIGHT = 2.3;
export function activeVillageMood(mood, time) {
  return mood?.m === "talk" ? "talk" : mood?.m === "wave" && Number.isFinite(mood.at) && time >= mood.at && time - mood.at < 2.2 ? "wave" : "idle";
}
export function validVillageSprite(meta) {
  if (!meta || typeof meta.url !== "string" || !(meta.w > 0 && meta.h > 0 && meta.rows > 0) || !Array.isArray(meta.frames) || !meta.frames.length) return false;
  return meta.frames.every(f => f && [f.x, f.y, f.w, f.h, f.ax, f.ay].every(Number.isFinite) && f.x >= 0 && f.y >= 0 && f.w > 0 && f.h > 0 && f.x + f.w <= meta.w && f.y + f.h <= meta.h && f.ax >= 0 && f.ax <= f.w && f.ay >= 0 && f.ay <= f.h) && Object.values(meta.actions ?? {}).every(list => Array.isArray(list) && list.length > 0 && list.every(index => Number.isInteger(index) && index >= 0 && index < meta.frames.length));
}
export function villageFrameShape(meta, frame) {
  const unit = (meta.height ?? VILLAGE_PERSON_HEIGHT) / meta.rows;
  return { width: frame.w * unit, height: frame.h * unit, x: (frame.w / 2 - frame.ax) * unit, y: (frame.ay - frame.h / 2) * unit, unit };
}
export function villageSpritePose(meta, { time = 0, walking = false, mood = "idle" } = {}) {
  const actions = meta.actions ?? {}, action = walking && actions.walk?.length ? "walk" : mood === "wave" && actions.wave?.length ? "wave" : mood === "talk" && actions.talk?.length ? "talk" : "idle";
  const list = actions[action]?.length ? actions[action] : actions.idle?.length ? actions.idle : [0];
  const age = Math.max(0, Number.isFinite(time) ? time : 0), index = Math.floor(age * (action === "walk" ? 6 : action === "wave" ? 2 : 1.2)) % list.length;
  const frame = list[index];
  return { action, frame: Number.isInteger(frame) && frame >= 0 && frame < meta.frames.length ? frame : 0, leadingLeg: action === "walk" ? index < list.length / 2 ? "left" : "right" : null };
}
export function visibleVillagePick(object) {
  for (let p = object; p; p = p.parent) if (p.visible === false) return false;
  return true;
}
