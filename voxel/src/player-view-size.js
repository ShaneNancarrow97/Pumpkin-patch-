import { PLAYER_SIDE_WALK_META } from "./player-side-walk-meta.js";
import { PLAYER_VIEW_SCALE } from "./player-view-scale.js";

// The scale an owner view is drawn at. Every view is sized against the front
// sprite at its own size, the size the owner has when nobody controls them, so
// taking control or turning round never changes how big they look. The
// turnarounds were baked to targetHeight, which the front reaches at
// frontScale.idle; PLAYER_VIEW_SCALE then shrinks each turnaround's
// bigger-headed art to read as the same person (tools/measure_player_views.py).
export function playerViewScale(id, view) {
  const m = PLAYER_SIDE_WALK_META[id];
  if (!m || view === "front") return 1;
  const baked = view === "back" ? m.backScale : view === "plant" || view === "harvest" ? m.targetHeight / 320 : 1;
  return baked * (PLAYER_VIEW_SCALE[id]?.[view] ?? 1) / (m.frontScale?.idle ?? 1);
}
// The walks have no idle: the frame that stands in for one, side-on or from behind.
export const playerStandFrame = (id, view) => PLAYER_VIEW_SCALE[id]?.[view === "side" ? "standSide" : "standBack"] ?? 0;
