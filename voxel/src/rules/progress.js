// The neighbours' midnight favours and the scrapbook's memories, as in the main
// game (src/core/festival-model.mjs and the achievements in src/app/game.js).
import { shelvedBooks, spookyScore } from "./house.js";
import { patchLevel as levelOf } from "./levels.js";
import { costumeCatalog } from "./wardrobe.js";
import { VISITOR_KINDS } from "../content/visitors.js";

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
  { id: "empire", guest: "Shane & Natalie", kind: 4, title: "Our glowing little empire", text: "Earn £1,000 from your patch and rewards.", target: 1000, reward: 120, money: true, metric: (s) => s.earned },
  // The grand favours: each asks for a season's work in one of the later
  // businesses, and pays enough to matter at that stage of the game.
  { id: "harvester", guest: "Patch the scarecrow", kind: 4, title: "The great harvest", text: "Harvest 2,500 pumpkins.", target: 2500, reward: 900, metric: (s) => s.harvested },
  { id: "neighbourly", guest: "Mabel the witch", kind: 1, title: "A good neighbour", text: "Fill 15 neighbours’ orders.", target: 15, reward: 1200, metric: (s) => s.orders?.filled ?? 0 },
  { id: "warm-hands", guest: "Linen the mummy", kind: 5, title: "Warm hands, cold night", text: "Sell 300 cups at Sandy’s cocoa stand.", target: 300, reward: 1500, metric: (s) => s.festival?.cocoa?.sold ?? 0 },
  { id: "spotless", guest: "Bones the bookworm", kind: 3, title: "Not a crumb in sight", text: "Clear 200 pieces of litter, by hand or with Hettie.", target: 200, reward: 1800, metric: (s) => s.cleanliness?.cleaned ?? 0 },
  { id: "lost-souls", guest: "Jinx the clown", kind: 9, title: "Lost in the Hollow", text: "Send 60 guests through the Hollow House maze.", target: 60, reward: 2500, metric: (s) => s.hollowHouse?.completed ?? 0 },
  { id: "recipe-book", guest: "Luna the werewolf", kind: 7, title: "A well-thumbed recipe book", text: "Learn 8 of Maisie’s recipes.", target: 8, reward: 3000, metric: (s) => s.kitchen?.recipes?.length ?? 0 },
  { id: "hungry", guest: "Moss the zombie", kind: 6, title: "Hungry for more", text: "Sell 250 portions of food.", target: 250, reward: 3500, metric: (s) => s.kitchen?.ledger?.foodSold ?? 0 },
  { id: "all-aboard", guest: "Captain Wraith", kind: 8, title: "All aboard for the Hollow", text: "Carry 150 riders round the hayride.", target: 150, reward: 4500, metric: (s) => s.hayride?.completed ?? 0 },
  { id: "court", guest: "Baron Brassbolt", kind: 10, title: "An audience with the court", text: "Welcome the midnight court 5 times.", target: 5, reward: 5000, metric: (s) => s.visitorEvents?.ledger?.vipGroups ?? 0 },
  { id: "haunted-home", guest: "Pip the ghost", kind: 0, title: "A truly haunted home", text: "Make your home worth 60 haunting points.", target: 60, reward: 6000, metric: spookyScore },
  { id: "full-house", guest: "Count Bram", kind: 2, title: "A full house", text: "Serve 2,000 visitors.", target: 2000, reward: 8000, metric: (s) => s.sold },
  { id: "fortune", guest: "Shane & Natalie", kind: 4, title: "A pumpkin fortune", text: "Earn £500,000.", target: 500000, reward: 12000, money: true, metric: (s) => s.earned },
  { id: "legend", guest: "Shane & Natalie", kind: 4, title: "Legends of the Hollow", text: "Earn £2,000,000.", target: 2000000, reward: 30000, money: true, metric: (s) => s.earned },
];

// Whose face a favour shows: the couple's own favours show Natalie.
export const favourFace = (f) => f.guest === "Shane & Natalie" ? "natalie" : "visitor-" + VISITOR_KINDS[f.kind];
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
  { id: "hollow", icon: "house", title: "The doors creak open", text: "Restore the Hollow House.", memory: "Axel swept the cobwebs, then put most of them back.", met: (s) => s.hollowHouse?.status === "ready" },
  { id: "cocoa", icon: "cup", title: "Something warm", text: "Build Sandy’s cocoa stand.", memory: "The first mug went to a very cold ghost.", met: (s) => (s.festival?.cocoa?.level ?? 0) > 0 },
  { id: "kitchen", icon: "chef", title: "The midnight kitchen", text: "Buy Maisie’s food truck.", memory: "Maisie named the hob before she lit it.", met: (s) => !!s.kitchen?.purchased },
  { id: "hayride", icon: "ride", title: "Into the woods", text: "Open the Hollow Hayride.", memory: "Somewhere out there, something screamed back.", met: (s) => !!s.hayride?.purchased },
  { id: "tidy", icon: "broom", title: "A helping broom", text: "Hire Hettie the caretaker.", memory: "She hums while she sweeps. Nobody knows the tune.", met: (s) => (s.visitorUpgrades?.janitor ?? 0) > 0 },
  { id: "court", icon: "court", title: "Their royal frights", text: "Welcome the midnight court.", memory: "The Countess tipped in coins older than the farm.", met: (s) => (s.visitorEvents?.ledger?.vipGroups ?? 0) > 0 },
  { id: "storyteller", icon: "book", title: "A house full of stories", text: "Shelve 20 books.", memory: "Every room has a story now. Some tell themselves.", met: (s) => shelvedBooks(s) >= 20 },
  { id: "dressed", icon: "outfit", title: "Dressed for every fright", text: "Collect every costume.", memory: "Natalie’s favourite is the one she’s wearing.", met: (s) => costumeCatalog.every((c) => s.wardrobe?.owned?.includes(c.id)) },
  { id: "halfway", icon: "star", title: "Halfway to forever", text: "Reach patch level 10.", memory: "Ten levels in, and the patch still surprises us.", met: (s) => levelOf(s).level >= 10 },
  { id: "million", icon: "crown", title: "A million pumpkin pennies", text: "Earn £1,000,000 in total.", memory: "We counted it twice. Then the cat sat on it.", met: (s) => s.earned >= 1000000 },
  { id: "forever", icon: "star", title: "Our forever haunted home", text: "Reach patch level 20.", memory: "Every lantern lit, every room full, and still room for more.", met: (s) => levelOf(s).level >= 20 },
];

export function checkMemories(s, events) {
  for (const m of MEMORIES) if (!s.memories.includes(m.id) && m.met(s)) { s.memories.push(m.id); events.push({ type: "memory", id: m.id }); }
}

// Level rewards and the HUD share the same milestone definitions.
export { patchLevel } from "./levels.js";
