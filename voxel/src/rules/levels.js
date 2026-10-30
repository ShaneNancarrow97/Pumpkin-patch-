// Earned milestones, with once-only rewards. Bonus coins never earn more levels.
import { freshHomeActivities, homeRequirements, restoreHomeActivities } from "./home-goals.js";
export { HOME_MILESTONES, HOME_ACTIVITY_KINDS, homeGoal, homeRequirements, recordHomeActivity } from "./home-goals.js";
export const LEVELS = [
  { level: 1, at: 0, name: "Little seed", rewards: [] },
  { level: 2, at: 300, name: "Growing roots", rewards: [{ kind: "coins", amount: 35 }, { kind: "decor", id: "d03" }] },
  { level: 3, at: 1200, name: "Local favourite", rewards: [{ kind: "coins", amount: 60 }, { kind: "costume", id: "natalie-witch" }] },
  { level: 4, at: 2800, name: "Autumn empire", rewards: [{ kind: "coins", amount: 100 }, { kind: "upgrade", id: "tools", name: "A better watering can", max: 6 }] },
  { level: 5, at: 6000, name: "Lantern keeper", rewards: [{ kind: "coins", amount: 150 }, { kind: "decor", id: "w04" }] },
  { level: 6, at: 12500, name: "Midnight market", rewards: [{ kind: "coins", amount: 225 }, { kind: "costume", id: "shane-skeleton" }] },
  { level: 7, at: 24000, name: "Moonlit harvest", rewards: [{ kind: "coins", amount: 325 }, { kind: "upgrade", id: "yield", name: "A little extra love", max: 5 }] },
  { level: 8, at: 42000, name: "Haunted hideaway", rewards: [{ kind: "coins", amount: 450 }, { kind: "decor", id: "f12" }] },
  { level: 9, at: 72000, name: "Festival of frights", rewards: [{ kind: "coins", amount: 650 }, { kind: "costume", id: "natalie-tiffany" }] },
  { level: 10, at: 115000, name: "Spooktacular", rewards: [{ kind: "coins", amount: 900 }, { kind: "costume", id: "shane-chucky" }] },
  { level: 11, at: 180000, name: "Harvest legend", rewards: [{ kind: "coins", amount: 1250 }, { kind: "decor", id: "moon-vanity" }] },
  { level: 12, at: 270000, name: "Forever Halloween", rewards: [{ kind: "coins", amount: 1800 }, { kind: "costume", id: "natalie-freddy" }, { kind: "costume", id: "shane-jason" }] },
  // Levels 13–20 lead back home (home-goals.js), and the late upgrade tiers
  // open along the way (unlocks.js).
  { level: 13, at: 400000, name: "Candlelit cookbook", rewards: [{ kind: "coins", amount: 2400 }, { kind: "decor", id: "f14" }, { kind: "costume", id: "natalie-frankenstein" }] },
  { level: 14, at: 580000, name: "The midnight kitchen", rewards: [{ kind: "coins", amount: 3200 }, { kind: "decor", id: "w08" }] },
  { level: 15, at: 820000, name: "Keys to the attic", rewards: [{ kind: "coins", amount: 4200 }, { kind: "decor", id: "d06" }, { kind: "costume", id: "shane-frankenstein" }] },
  { level: 16, at: 1120000, name: "Every room a story", rewards: [{ kind: "coins", amount: 5400 }, { kind: "decor", id: "f06" }] },
  { level: 17, at: 1500000, name: "A witching-hour feast", rewards: [{ kind: "coins", amount: 6800 }, { kind: "decor", id: "d04" }, { kind: "costume", id: "natalie-mummy" }] },
  { level: 18, at: 1980000, name: "The haunting heart", rewards: [{ kind: "coins", amount: 8500 }, { kind: "decor", id: "moon-canopy-bed" }] },
  { level: 19, at: 2600000, name: "Keeper of stories", rewards: [{ kind: "coins", amount: 10500 }, { kind: "decor", id: "moon-wardrobe" }, { kind: "costume", id: "shane-mummy" }] },
  { level: 20, at: 3400000, name: "Our forever haunted home", rewards: [{ kind: "coins", amount: 15000 }, { kind: "costume", id: "natalie-slasher" }, { kind: "costume", id: "shane-slasher" }] },
];
// The slower pace: each level asks for two to three times the earnings it once did.
// A level once reached is kept (patchLevel), so saves from before the change
// keep every level they had, checked against the thresholds they earned them
// under; only the levels still to come take longer.
export const LEVEL_PACE = 2;
export const LEGACY_LEVEL_AT = Object.freeze([0, 150, 500, 1000, 2200, 4500, 8500, 15000, 26000, 42000, 70000, 110000, 170000, 250000, 360000, 500000, 680000, 900000, 1200000, 1600000]);
export const freshProgression = () => ({ claimed: [1], pending: [], receipts: {}, bonusEarned: 0, homeVersion: 1, homeLegacyThrough: 1, homeActivities: freshHomeActivities(), pace: LEVEL_PACE, floorLevel: 1, floorFrom: 0 });
export const levelEarnings = (s) => Math.max(0, s.earned - (s.progression?.bonusEarned ?? 0));
const keptLevel = (s) => Math.max(1, ...(s.progression?.claimed ?? []).filter((n) => Number.isInteger(n) && n >= 1 && n <= LEVELS.length));
export function patchLevel(s) {
  const xp = levelEarnings(s), kept = keptLevel(s), earned = LEVELS[Math.max(kept, LEVELS.filter(l => l.at <= xp).at(-1).level) - 1];
  let current = LEVELS[0];
  for (const l of LEVELS.slice(1)) {
    if (l.level > kept && (l.level > earned.level || (l.level > 12 || s.progression?.homeVersion === 1) && homeRequirements(s, l.level).some(r => !r.met))) break;
    current = l;
  }
  const next = LEVELS[current.level], requirements = next ? homeRequirements(s, next.level) : [], blocked = !!next && xp >= next.at && requirements.some(r => !r.met);
  // The level a save had when the pace changed may sit above what the new pace
  // has earned yet: its bar fills from the earnings it had then, not from zero.
  const floor = s.progression?.floorLevel === current.level ? s.progression.floorFrom : NaN, from = floor < current.at ? floor : current.at;
  return { ...current, xp, earnedLevel: earned.level, next: next ?? null, requirements, blocked, progress: next ? Math.max(0, Math.min(1, (xp - from) / (next.at - from))) : 1, tagline: blocked ? `Home goal: ${requirements.find(r => !r.met).text}` : next ? `Next: ${next.name}` : "Every night is Halloween" };
}
// Existing saves keep their level without a backlog of gifts or popups.
export function restoreProgression(raw, s, legacy = false, legacyHome = false) {
  const p = freshProgression();
  if (legacy || !raw || typeof raw !== "object") {
    if (legacyHome || legacy) { p.claimed = LEVELS.slice(0, 12).filter(l => LEGACY_LEVEL_AT[l.level - 1] <= s.earned).map(l => l.level); p.homeLegacyThrough = p.claimed.at(-1) ?? 1; }
    p.floorLevel = Math.max(1, ...p.claimed); p.floorFrom = Math.max(0, Number(s.earned) || 0);
    return p;
  }
  p.bonusEarned = Number.isFinite(raw.bonusEarned) ? Math.max(0, Math.min(s.earned, raw.bonusEarned)) : 0;
  // Claims are checked against the thresholds they were earned under.
  const paced = raw.pace === LEVEL_PACE && !legacyHome, at = (n) => paced ? LEVELS[n - 1].at : LEGACY_LEVEL_AT[n - 1];
  p.floorFrom = paced ? (Number.isFinite(raw.floorFrom) ? Math.max(0, Math.min(s.earned, raw.floorFrom)) : 0) : Math.max(0, s.earned - p.bonusEarned);
  const earned = LEVELS.filter(l => at(l.level) <= s.earned - p.bonusEarned).at(-1).level;
  p.homeLegacyThrough = legacyHome ? Math.min(12, earned) : Number.isInteger(raw.homeLegacyThrough) ? Math.max(1, Math.min(12, earned, raw.homeLegacyThrough)) : 1;
  p.homeActivities = restoreHomeActivities(raw.homeActivities);
  // The level kept when the pace changed stays valid at any earnings it was
  // reached with under the old thresholds.
  const floor = paced && Number.isInteger(raw.floorLevel) && raw.floorLevel >= 1 && raw.floorLevel <= LEVELS.length && LEGACY_LEVEL_AT[raw.floorLevel - 1] <= s.earned - p.bonusEarned ? raw.floorLevel : 1;
  const valid = (n) => Number.isInteger(n) && n >= 1 && n <= LEVELS.length && (n <= floor || at(n) <= s.earned - p.bonusEarned);
  p.claimed = [...new Set([1, ...(Array.isArray(raw.claimed) ? raw.claimed.filter(valid) : [])])].sort((a, b) => a - b);
  p.floorLevel = paced ? Math.min(floor, p.claimed.at(-1)) : p.claimed.at(-1);
  p.pending = [...new Set((Array.isArray(raw.pending) ? raw.pending : []).filter((n) => n > 1 && p.claimed.includes(n)))].sort((a, b) => a - b);
  // Only sanitised award receipts are shown; a malformed receipt cannot invent a reward.
  for (const level of p.pending) {
    const rewards = LEVELS[level - 1].rewards;
    p.receipts[level] = rewards.map((r, i) => ({ ...r, ...(raw.receipts?.[level]?.[i]?.duplicate === true ? { duplicate: true } : {}) }));
  }
  return p;
}
export function awardLevels(s) {
  if (s.paused) return [];
  s.progression ??= freshProgression();
  const p = s.progression, reached = patchLevel(s).level, unlocked = [];
  const coins = (amount) => { s.coins += amount; s.earned += amount; p.bonusEarned += amount; };
  for (const milestone of LEVELS) {
    if (milestone.level > reached || p.claimed.includes(milestone.level)) continue;
    const receipt = milestone.rewards.map((r) => {
      if (r.kind === "coins") coins(r.amount);
      else if (r.kind === "upgrade") { if (s.upgrades[r.id] < r.max) s.upgrades[r.id]++; else { coins(100); return { ...r, duplicate: true }; } }
      else {
        const owned = r.kind === "decor" ? s.house.owned : s.wardrobe.owned;
        if (!owned.includes(r.id)) owned.push(r.id);
        else { coins(50); return { ...r, duplicate: true }; }
      }
      return { ...r };
    });
    p.claimed.push(milestone.level); p.pending.push(milestone.level); p.receipts[milestone.level] = receipt;
    unlocked.push(milestone.level);
  }
  return unlocked;
}
export function dismissLevel(s, level) {
  if (s.progression?.pending[0] !== level) return false;
  s.progression.pending.shift(); delete s.progression.receipts[level]; return true;
}
