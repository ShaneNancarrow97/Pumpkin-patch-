// The neighbours' midnight favours and the scrapbook's memories, as in the main
// game (src/core/festival-model.mjs and the achievements in src/app/game.js).
import { shelvedBooks, spookyScore } from "./house.js";

export const FAVOURS = [
  { id: "basket", guest: "Pip the ghost", kind: 0, title: "A basket for a ghost", text: "Harvest 6 pumpkins. Even ghosts love a little autumn.", target: 6, reward: 25, metric: (s) => s.harvested },
  { id: "welcome", guest: "Mabel the witch", kind: 1, title: "The midnight welcome", text: "Serve 4 visitors.", target: 4, reward: 35, metric: (s) => s.sold },
  { id: "magic", guest: "Count Bram", kind: 2, title: "A little pumpkin magic", text: "Boost the patch 16 times.", target: 16, reward: 20, metric: (s) => s.taps },
  { id: "library", guest: "Bones the bookworm", kind: 3, title: "Stories after dark", text: "Put 3 books on your bookshelves.", target: 3, reward: 40, metric: shelvedBooks },
  { id: "walls", guest: "Mabel the witch", kind: 1, title: "Dress the haunted walls", text: "Hang wallpaper in one of your rooms.", target: 1, reward: 25, metric: (s) => (Object.keys(s.house.wallpapers).length ? 1 : 0) },
  { id: "costumes", guest: "Pip the ghost", kind: 0, title: "A party for two", text: "Collect 2 Halloween costumes. The originals stay free.", target: 2, reward: 50, metric: (s) => Math.max(0, s.wardrobe.owned.length - 2) },
  { id: "seeds", guest: "Mabel the witch", kind: 1, title: "A patch of moonlight", text: "Upgrade one plot to grow more valuable pumpkins.", target: 1, reward: 35, metric: (s) => (s.plotLevels.some((l) => l > 0) ? 1 : 0) },
  { id: "haunt", guest: "Patch the scarecrow", kind: 4, title: "Room for a haunting", text: "Make your home worth 12 haunting points.", target: 12, reward: 60, metric: spookyScore },
  { id: "market", guest: "Count Bram", kind: 2, title: "The night market", text: "Serve 25 happy visitors.", target: 25, reward: 80, metric: (s) => s.sold },
  { id: "empire", guest: "Shane & Natalie", kind: 4, title: "Our glowing little empire", text: "Earn £1,000 from your patch and rewards.", target: 1000, reward: 120, metric: (s) => s.earned },
];

export const favourProgress = (s, f) => Math.max(0, Math.min(f.target, f.metric(s)));
export const claimable = (s) => FAVOURS.filter((f) => !s.claimed.includes(f.id) && favourProgress(s, f) >= f.target);
export function claimFavour(s, id) {
  const f = FAVOURS.find((x) => x.id === id);
  if (!f || s.claimed.includes(id) || favourProgress(s, f) < f.target) return 0;
  s.claimed.push(id);
  s.coins += f.reward; s.earned += f.reward;
  return f.reward;
}

export const MEMORIES = [
  { id: "first", icon: "seed", title: "Our first little harvest", text: "Pick 5 pumpkins.", memory: "Five pumpkins. One big beginning.", met: (s) => s.harvested >= 5 },
  { id: "visitors", icon: "heart", title: "The neighbourhood favourite", text: "Serve 10 happy visitors.", memory: "Word travels fast when the pumpkins are good.", met: (s) => s.sold >= 10 },
  { id: "moon", icon: "moon", title: "A little moonlight", text: "Upgrade a plot to Moonlight seeds.", memory: "This plot now grows pale pumpkins worth £24 each.", met: (s) => s.plotLevels.some((l) => l > 0) },
  { id: "helper", icon: "hands", title: "Better together", text: "Buy the Helping hands upgrade.", memory: "Shane and Natalie now keep the farm growing.", met: (s) => s.upgrades.auto > 0 },
  { id: "empire", icon: "crown", title: "An autumn empire", text: "Earn £1,000 in total.", memory: "From a handful of seeds to something wonderful.", met: (s) => s.earned >= 1000 },
  { id: "clicker", icon: "spark", title: "Pumpkin whisperer", text: "Tap the big pumpkin 100 times.", memory: "Good things grow with a little encouragement.", met: (s) => s.taps >= 100 },
];

export function checkMemories(s, events) {
  for (const m of MEMORIES) if (!s.memories.includes(m.id) && m.met(s)) { s.memories.push(m.id); events.push({ type: "memory", id: m.id }); }
}

// The patch's level, from everything earned (the main game's HUD meter).
export function patchLevel(s) {
  const e = s.earned;
  if (e >= 1000) return { level: 4, name: "Autumn empire", tagline: "Built with a lot of heart", progress: (e % 1000) / 1000 };
  if (e >= 500) return { level: 3, name: "Local favourite", tagline: "A patch worth visiting", progress: (e - 500) / 500 };
  if (e >= 150) return { level: 2, name: "Growing roots", tagline: "Something good is growing", progress: (e - 150) / 350 };
  return { level: 1, name: "Little seed", tagline: "A lovely beginning", progress: e / 150 };
}
