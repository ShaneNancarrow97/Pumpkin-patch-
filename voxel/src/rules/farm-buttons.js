// Button work is bounded by the selected owner's training, using the normal
// transactions so yield, fresh batches, barn space and the market cart agree.
import { plant, harvest, openPlots } from './farm.js';
import { helperStatus } from './farm-work.js';

export function plantNext(s) {
  if (s.paused) return -1;
  for (let i = 0; i < openPlots(s); i++) if (plant(s, i)) return i;
  return -1;
}

export function pickBatch(s, owner = 'natalie', candidates = null) {
  if (s.paused) return [];
  const status = helperStatus(s, owner);
  if (!status) return [];
  const result = [], seen = new Set(), capacity = status.capacity;
  for (const i of candidates ?? Array.from({ length: openPlots(s) }, (_, n) => n)) {
    if (result.length >= capacity) break;
    if (!Number.isInteger(i) || i < 0 || i >= openPlots(s) || seen.has(i)) continue;
    seen.add(i);
    const count = harvest(s, i);
    if (count) result.push({ plot: i, count });
  }
  return result;
}
