// Fountain seeds use a saved planting serial, so reloads cannot reroll a crop.
import { FOUNTAIN } from "../content/fountain.js";
import { patchLevel } from "./levels.js";
export { FOUNTAIN } from "../content/fountain.js";

const whole = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export const freshFountain = () => ({ owned: false, planted: 0, popped: 0, pumpkins: 0, coins: 0, last: null });
export function restoreFountain(raw) {
  const state = freshFountain();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return state;
  state.owned = raw.owned === true;
  for (const key of ["planted", "popped", "pumpkins", "coins"]) state[key] = whole(raw[key]);
  return state;
}
export const fountainChance = state => state.fountain?.owned ? FOUNTAIN.chance : 0;
export function fountainSeedInfo(state, level = patchLevel(state).level) {
  const owned = state.fountain?.owned === true, unlocked = level >= FOUNTAIN.opensAt;
  return { ...FOUNTAIN, owned, unlocked, affordable: state.coins >= FOUNTAIN.cost,
    canBuy: !state.paused && !owned && unlocked && state.coins >= FOUNTAIN.cost };
}
export function buyFountainSeeds(state, level = patchLevel(state).level) {
  if (!fountainSeedInfo(state, level).canBuy) return false;
  state.coins -= FOUNTAIN.cost;
  state.fountain ??= freshFountain(); state.fountain.owned = true;
  return true;
}
// A stable uniform number in [0,1), separate from piñata and village randomness.
export function fountainRoll(serial, plot) {
  let h = 0x6f756e74;
  for (const n of [serial, plot, 0x53544152]) {
    h = Math.imul(h ^ (Math.floor(Number(n) || 0) >>> 0), 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}
// Called only after the normal plant transaction succeeds. Every paid roll is saved.
export function plantsFountain(state, plot) {
  if (!fountainChance(state)) return false;
  const fountain = state.fountain;
  const serial = whole(fountain.planted);
  fountain.planted = serial < Number.MAX_SAFE_INTEGER ? serial + 1 : 0;
  return fountainRoll(serial, plot) < FOUNTAIN.chance;
}

// Presentation events are transient. Rewards/ledgers are committed before queueing.
const bursts = new WeakMap();
export function burstFountain(state, index, variety) {
  state.fountain ??= freshFountain();
  const f = state.fountain;
  f.popped++; f.pumpkins += FOUNTAIN.pumpkins; f.coins += FOUNTAIN.coins;
  state.coins += FOUNTAIN.coins; state.earned += FOUNTAIN.coins;
  const event = { type: "fountain-burst", index, variety, amount: FOUNTAIN.pumpkins, coins: FOUNTAIN.coins, serial: f.popped };
  f.last = { ...event, at: state.time };
  const queue = bursts.get(state) ?? []; queue.push(event); bursts.set(state, queue);
  return event;
}
export function drainFountainBursts(state, events = []) {
  events.push(...(bursts.get(state) ?? [])); bursts.delete(state); return events;
}
