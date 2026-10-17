import { spookyScore } from "./house-model.mjs";
import { economy } from "../content/economy.js";

var midnightFavours = [
  { id: "basket", title: "A basket for a ghost", guest: "Pip the ghost", type: "ghost", description: "Harvest 6 pumpkins. Even ghosts love a little autumn.", target: 6, reward: 25, metric: (s) => s.harvested },
  { id: "welcome", title: "The midnight welcome", guest: "Mabel the witch", type: "witch", description: "Serve 4 visitors at the farm shop.", target: 4, reward: 35, metric: (s) => s.sold },
  { id: "magic", title: "A little pumpkin magic", guest: "Count Bram", type: "vampire", description: "Boost the patch 16 times.", target: 16, reward: 20, metric: (s) => s.clicks },
  { id: "library", title: "Stories after dark", guest: "Bones the bookworm", type: "skeleton", description: "Put 3 books on your bookshelves.", target: 3, reward: 40, metric: (s) => s.house.placed.reduce((n, p) => n + p.books.length, 0) },
  { id: "walls", title: "Dress the haunted walls", guest: "Mabel the witch", type: "witch", description: "Apply a wallpaper in your house.", target: 1, reward: 25, metric: (s) => s.house.wallpaper ? 1 : 0 },
  { id: "costumes", title: "A party for two", guest: "Pip the ghost", type: "ghost", description: "Collect 2 Halloween costumes. Originals stay free.", target: 2, reward: 50, metric: (s) => Math.max(0, s.wardrobe.owned.length - 2) },
  { id: "seeds", title: "A patch of moonlight", guest: "Mabel the witch", type: "witch", description: "Upgrade one plot to grow more valuable pumpkins.", target: 1, reward: 35, metric: (s) => s.plotLevels.some((level2) => level2 > 0) ? 1 : 0 },
  { id: "haunt", title: "Room for a haunting", guest: "Patch the scarecrow", type: "scarecrow", description: "Make your home worth 12 haunting points.", target: 12, reward: 60, metric: (s) => spookyScore(s) },
  { id: "market", title: "The night market", guest: "Count Bram", type: "vampire", description: "Serve 25 happy visitors.", target: 25, reward: 80, metric: (s) => s.sold },
  { id: "empire", title: "Our glowing little empire", guest: "Shane & Natalie", type: "scarecrow", description: "Earn £1,000 from your patch and rewards.", target: 1e3, reward: 120, metric: (s) => s.earned }
];
function freshFestival() {
  return { claimed: [], comboCount: 0, comboUntil: 0, bestStreak: 0, bonusCoins: 0, nextBonusAt: 0 };
}
function restoreFestival(raw, elapsed = 0) {
  const f = freshFestival();
  if (!raw || typeof raw !== "object")
    return f;
  f.claimed = [...new Set((Array.isArray(raw.claimed) ? raw.claimed : []).filter((id) => midnightFavours.some((f2) => f2.id === id)))];
  f.bestStreak = Number.isSafeInteger(raw.bestStreak) ? Math.max(0, raw.bestStreak) : 0;
  f.bonusCoins = Number.isFinite(raw.bonusCoins) ? Math.max(0, raw.bonusCoins) : 0;
  f.nextBonusAt = Number.isFinite(raw.nextBonusAt) ? Math.max(0, Math.min(elapsed + economy.streakCooldownSeconds, raw.nextBonusAt)) : 0;
  return f;
}
function favourProgress(s, favour) {
  return Math.max(0, Math.min(favour.target, favour.metric(s)));
}
function claimFavour(s, id) {
  const favour = midnightFavours.find((f) => f.id === id);
  if (!favour || s.paused || s.festival.claimed.includes(id) || favourProgress(s, favour) < favour.target)
    return 0;
  s.festival.claimed.push(id);
  s.coins += favour.reward;
  s.earned += favour.reward;
  return favour.reward;
}
function rewardHarvestStreak(s) {
  if (s.paused)
    return { count: 0, bonus: 0 };
  const f = s.festival;
  if (s.elapsed > f.comboUntil)
    f.comboCount = 0;
  f.comboCount++;
  f.comboUntil = s.elapsed + 5;
  f.bestStreak = Math.max(f.bestStreak, f.comboCount);
  const bonus = f.comboCount % 6 === 0 && s.elapsed >= f.nextBonusAt ? economy.streakBonus : 0;
  if (bonus) {
    s.coins += bonus;
    s.earned += bonus;
    f.bonusCoins += bonus;
    f.nextBonusAt = s.elapsed + economy.streakCooldownSeconds;
  }
  return { count: f.comboCount, bonus };
}

export { claimFavour, favourProgress, freshFestival, midnightFavours, restoreFestival, rewardHarvestStreak };
