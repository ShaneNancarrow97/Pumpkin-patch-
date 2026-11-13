// Small household animations are cosmetic. They never consume stock, coins or
// kitchen ingredients, and each placed copy keeps its own switch/channel.
import { HOUSEHOLD_BY_ID } from "../content/household-catalog.js";

const MEDIA = new Set(["television", "laptop", "washing-machine"]);
export const HOME_TV_CHANNELS = Object.freeze(["Midnight ghosts", "Pumpkin parade", "Starlight forecast"]);
export const restoreHomeMedia = raw => raw && typeof raw === "object" && !Array.isArray(raw) ? ({
  on: raw?.on === true,
  channel: Number.isInteger(raw?.channel) && raw.channel >= 0 && raw.channel < HOME_TV_CHANNELS.length ? raw.channel : 0,
}) : undefined;
export const isHomeMediaPiece = p => MEDIA.has(HOUSEHOLD_BY_ID[p?.id]?.interaction);
const piece = (s, instance) => s?.house?.placed?.find(p => p.instance === instance);
export function homeMedia(s, instance) {
  const p = piece(s, instance);
  if (!isHomeMediaPiece(p)) return null;
  const media = restoreHomeMedia(p.media) ?? { on: false, channel: 0 }, television = HOUSEHOLD_BY_ID[p.id].interaction === "television";
  return { ...media, television, name: television ? HOME_TV_CHANNELS[media.channel] : HOUSEHOLD_BY_ID[p.id].interaction === "laptop" ? "Moonlit display" : "Gentle spin" };
}
export function toggleHomeMedia(s, instance) {
  const p = piece(s, instance), current = homeMedia(s, instance);
  if (s?.paused || !current) return false;
  p.media = { on: !current.on, channel: current.channel };
  return true;
}
export function cycleHomeChannel(s, instance) {
  const p = piece(s, instance), current = homeMedia(s, instance);
  if (s?.paused || !current?.television) return false;
  p.media = { on: true, channel: (current.channel + 1) % HOME_TV_CHANNELS.length };
  return true;
}
