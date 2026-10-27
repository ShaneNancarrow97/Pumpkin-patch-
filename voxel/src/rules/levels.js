// Earned milestones, with once-only rewards. Bonus coins never earn more levels.
import { freshHomeActivities, homeRequirements, restoreHomeActivities } from "./home-goals.js";
export { HOME_MILESTONES, HOME_ACTIVITY_KINDS, homeGoal, homeRequirements, recordHomeActivity } from "./home-goals.js";
export const LEVELS = [
  { level: 1, at: 0, name: "Little seed", rewards: [] },
  { level: 2, at: 150, name: "Growing roots", rewards: [{ kind: "coins", amount: 35 }, { kind: "decor", id: "d03" }] },
  { level: 3, at: 500, name: "Local favourite", rewards: [{ kind: "coins", amount: 60 }, { kind: "costume", id: "natalie-witch" }] },
  { level: 4, at: 1000, name: "Autumn empire", rewards: [{ kind: "coins", amount: 100 }, { kind: "upgrade", id: "tools", name: "A better watering can", max: 6 }] },
  { level: 5, at: 2200, name: "Lantern keeper", rewards: [{ kind: "coins", amount: 150 }, { kind: "decor", id: "w04" }] },
  { level: 6, at: 4500, name: "Midnight market", rewards: [{ kind: "coins", amount: 225 }, { kind: "costume", id: "shane-skeleton" }] },
  { level: 7, at: 8500, name: "Moonlit harvest", rewards: [{ kind: "coins", amount: 325 }, { kind: "upgrade", id: "yield", name: "A little extra love", max: 5 }] },
  { level: 8, at: 15000, name: "Haunted hideaway", rewards: [{ kind: "coins", amount: 450 }, { kind: "decor", id: "f12" }] },
  { level: 9, at: 26000, name: "Festival of frights", rewards: [{ kind: "coins", amount: 650 }, { kind: "costume", id: "natalie-tiffany" }] },
  { level: 10, at: 42000, name: "Spooktacular", rewards: [{ kind: "coins", amount: 900 }, { kind: "costume", id: "shane-chucky" }] },
  { level: 11, at: 70000, name: "Harvest legend", rewards: [{ kind: "coins", amount: 1250 }, { kind: "decor", id: "moon-vanity" }] },
  { level: 12, at: 110000, name: "Forever Halloween", rewards: [{ kind: "coins", amount: 1800 }, { kind: "costume", id: "natalie-freddy" }, { kind: "costume", id: "shane-jason" }] },
  { level: 13, at: 170000, name: "Candlelit cookbook", rewards: [{ kind: "coins", amount: 2400 }, { kind: "decor", id: "f14" }] },
  { level: 14, at: 250000, name: "The midnight kitchen", rewards: [{ kind: "coins", amount: 3200 }, { kind: "decor", id: "w08" }] },
  { level: 15, at: 360000, name: "Keys to the attic", rewards: [{ kind: "coins", amount: 4200 }, { kind: "decor", id: "d06" }] },
  { level: 16, at: 500000, name: "Every room a story", rewards: [{ kind: "coins", amount: 5400 }, { kind: "decor", id: "f06" }] },
  { level: 17, at: 680000, name: "A witching-hour feast", rewards: [{ kind: "coins", amount: 6800 }, { kind: "decor", id: "d04" }] },
  { level: 18, at: 900000, name: "The haunting heart", rewards: [{ kind: "coins", amount: 8500 }, { kind: "decor", id: "moon-canopy-bed" }] },
  { level: 19, at: 1200000, name: "Keeper of stories", rewards: [{ kind: "coins", amount: 10500 }, { kind: "decor", id: "moon-wardrobe" }] },
  { level: 20, at: 1600000, name: "Our forever haunted home", rewards: [{ kind: "coins", amount: 15000 }, { kind: "decor", id: "moon-vanity" }] },
];
export const freshProgression = () => ({ claimed: [1], pending: [], receipts: {}, bonusEarned: 0, homeVersion: 1, homeLegacyThrough: 1, homeActivities: freshHomeActivities() });
export const levelEarnings = (s) => Math.max(0, s.earned - (s.progression?.bonusEarned ?? 0));
export function patchLevel(s) {
  const xp = levelEarnings(s), earned = LEVELS.filter(l => l.at <= xp).at(-1);
  let current = LEVELS[0];
  for (const l of LEVELS.slice(1)) {
    if (l.level > earned.level || (l.level > 12 || s.progression?.homeVersion === 1) && homeRequirements(s, l.level).some(r => !r.met)) break;
    current = l;
  }
  const next = LEVELS[current.level], requirements = next ? homeRequirements(s, next.level) : [], blocked = !!next && xp >= next.at && requirements.some(r => !r.met);
  return { ...current, xp, earnedLevel: earned.level, next: next ?? null, requirements, blocked, progress: next ? Math.max(0, Math.min(1, (xp - current.at) / (next.at - current.at))) : 1, tagline: blocked ? `Home goal: ${requirements.find(r => !r.met).text}` : next ? `Next: ${next.name}` : "Every night is Halloween" };
}
// Existing saves keep their level without a backlog of gifts or popups.
export function restoreProgression(raw, s, legacy = false, legacyHome = false) {
  const p = freshProgression();
  if (legacy || !raw || typeof raw !== "object") {
    if (legacyHome || legacy) { p.claimed = LEVELS.slice(0, 12).filter(l => l.at <= s.earned).map(l => l.level); p.homeLegacyThrough = p.claimed.at(-1) ?? 1; }
    return p;
  }
  p.bonusEarned = Number.isFinite(raw.bonusEarned) ? Math.max(0, Math.min(s.earned, raw.bonusEarned)) : 0;
  const earned = LEVELS.filter(l => l.at <= s.earned - p.bonusEarned).at(-1).level;
  p.homeLegacyThrough = legacyHome ? Math.min(12, earned) : Number.isInteger(raw.homeLegacyThrough) ? Math.max(1, Math.min(12, earned, raw.homeLegacyThrough)) : 1;
  p.homeActivities = restoreHomeActivities(raw.homeActivities);
  const valid = (n) => Number.isInteger(n) && n >= 1 && n <= LEVELS.length && LEVELS[n - 1].at <= s.earned - p.bonusEarned;
  p.claimed = [...new Set([1, ...(Array.isArray(raw.claimed) ? raw.claimed.filter(valid) : [])])].sort((a, b) => a - b);
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
