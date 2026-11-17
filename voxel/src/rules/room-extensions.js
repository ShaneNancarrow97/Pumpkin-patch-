import { ROOM_EXTENSIONS } from "../content/home-rooms.js";
import { patchLevel } from "./levels.js";
import { reconcileRoomPlacement } from "./house.js";

export const freshRoomExtensions = () => ({ bathroom: false });
export const restoreRoomExtensions = raw => ({ bathroom: raw?.bathroom === true });

export function roomExtensionInfo(s, id = "bathroom") {
  const definition = Object.hasOwn(ROOM_EXTENSIONS, id) ? ROOM_EXTENSIONS[id] : null;
  if (!definition) return null;
  const owned = s.house?.extensions?.[id] === true, level = patchLevel(s).level;
  const unlocked = level >= definition.level && (s.house?.level ?? 0) >= definition.houseLevel;
  const affordable = Number.isFinite(s.coins) && s.coins >= definition.cost;
  const reason = owned ? "Already built" : level < definition.level ? `Reach patch level ${definition.level}` : (s.house?.level ?? 0) < definition.houseLevel ? "Upgrade to Midnight manor" : !affordable ? `Save £${definition.cost.toLocaleString("en-GB")}` : "Ready to build";
  return { ...definition, owned, unlocked, affordable, canBuy: !owned && unlocked && affordable && !s.paused, reason };
}

export function buyRoomExtension(s, id = "bathroom") {
  const info = roomExtensionInfo(s, id);
  if (!info?.canBuy || s.paused) return false;
  s.coins -= info.cost;
  s.house.extensions ??= freshRoomExtensions();
  s.house.extensions[id] = true;
  // Buying a wing never replaces an existing room's paint or furniture.
  s.house.roomStyles ??= {};
  s.house.roomStyles.bathroom ??= "bathroom-plum";
  // The new doorway must not open through a cupboard. Invalid pieces move
  // to a safe position or storage, retaining their purchased copy counts.
  reconcileRoomPlacement(s, "kitchen");
  return true;
}
