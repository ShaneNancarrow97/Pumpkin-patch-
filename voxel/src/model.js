// Game rules for the voxel reference build. Pure: no DOM, no three.js, so the
// tests run it in Node. One step of update() is a slice of game time.

export const VARIETIES = [
  { id: "orange", name: "Orange", price: 12, cost: 0, grow: 18, color: 0xf0821e, glow: 0xffb04a },
  { id: "moonlight", name: "Moonlight", price: 24, cost: 180, grow: 24, color: 0xd9d2ff, glow: 0xbeb7ff },
  { id: "witchfire", name: "Witchfire", price: 42, cost: 900, grow: 30, color: 0x9d55e6, glow: 0xb774ff },
  { id: "starlight", name: "Starlight", price: 70, cost: 3600, grow: 36, color: 0xf5c84a, glow: 0xffdf64 },
];

export const UPGRADES = [
  { id: "tools", name: "Copper watering can", text: "Pumpkins grow 15% faster.", cost: 80, growth: 1.6, max: 5 },
  { id: "signs", name: "Lantern signs", text: "Visitors arrive 12% more often.", cost: 150, growth: 1.8, max: 4 },
  { id: "plots", name: "Clear more ground", text: "Three more plots in the patch.", cost: 260, growth: 2.4, max: 2 },
  { id: "helper", name: "Helping hands", text: "Shane and Natalie plant and pick for you.", cost: 500, growth: 1, max: 1 },
];

// Shane and Natalie's looks. Colours are from docs/GAME-BIBLE.md.
export const LOOKS = {
  natalie: [
    { id: "olive", name: "Olive knit", price: 0, sweater: 0x604625 },
    { id: "plum", name: "Plum knit", price: 120, sweater: 0x5b2a4a },
    { id: "rust", name: "Rust knit", price: 160, sweater: 0x8a3f22 },
  ],
  shane: [
    { id: "black", name: "Black beanie", price: 0, beanie: 0x1a1210 },
    { id: "pumpkin", name: "Pumpkin beanie", price: 120, beanie: 0xc8641e },
    { id: "moss", name: "Moss beanie", price: 140, beanie: 0x4d5a2c },
  ],
};

export const VISIT = { arrive: 7, patience: 6, linger: 1, leave: 4 };

export function freshState() {
  return {
    coins: 40,
    earned: 0,
    sold: 0,
    harvested: 0,
    taps: 0,
    time: 0,
    stock: [],               // variety ids waiting to be sold
    plots: Array.from({ length: 12 }, () => ({ phase: "empty", progress: 0, variety: 0 })),
    plotLevels: Array(12).fill(0),
    upgrades: { tools: 0, signs: 0, plots: 0, helper: 0 },
    looks: { natalie: "olive", shane: "black", owned: ["olive", "black"] },
    visitors: [],
    nextVisitor: 0,
    visitorTimer: 3,
    helperTimer: 0,
  };
}

export const openPlots = (s) => 6 + s.upgrades.plots * 3;
export const growTime = (s, i) => VARIETIES[s.plotLevels[i]].grow * Math.pow(0.85, s.upgrades.tools);
export const upgradeCost = (s, id) => {
  const u = UPGRADES.find((x) => x.id === id);
  return Math.round(u.cost * Math.pow(u.growth, s.upgrades[id]));
};

export function plant(s, i) {
  if (i < 0 || i >= openPlots(s) || s.plots[i].phase !== "empty") return false;
  s.plots[i] = { phase: "growing", progress: 0, variety: s.plotLevels[i] };
  return true;
}

export function harvest(s, i) {
  const p = s.plots[i];
  if (!p || i >= openPlots(s) || p.phase !== "ready") return false;
  s.stock.push(p.variety);
  s.harvested++;
  s.plots[i] = { phase: "empty", progress: 0, variety: s.plotLevels[i] };
  return true;
}

// Tapping the big pumpkin gives every growing plot two seconds.
export function tap(s) {
  s.taps++;
  for (let i = 0; i < openPlots(s); i++) {
    const p = s.plots[i];
    if (p.phase === "growing") {
      p.progress = Math.min(1, p.progress + 2 / growTime(s, i));
      if (p.progress >= 1) p.phase = "ready";
    }
  }
}

export function buyUpgrade(s, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || s.upgrades[id] >= u.max) return false;
  const c = upgradeCost(s, id);
  if (s.coins < c) return false;
  s.coins -= c;
  s.upgrades[id]++;
  return true;
}

export function upgradePlot(s, i) {
  const next = VARIETIES[s.plotLevels[i] + 1];
  if (i >= openPlots(s) || !next || s.coins < next.cost) return false;
  s.coins -= next.cost;
  s.plotLevels[i]++;
  if (s.plots[i].phase === "empty") s.plots[i].variety = s.plotLevels[i];
  return true;
}

export function buyLook(s, who, id) {
  const look = LOOKS[who]?.find((l) => l.id === id);
  if (!look) return false;
  if (!s.looks.owned.includes(id)) {
    if (s.coins < look.price) return false;
    s.coins -= look.price;
    s.looks.owned.push(id);
  }
  s.looks[who] = id;
  return true;
}

// Advances the farm by dt seconds and returns what happened, for the scene to show.
export function update(s, dt, random = Math.random) {
  const events = [];
  s.time += dt;
  for (let i = 0; i < openPlots(s); i++) {
    const p = s.plots[i];
    if (p.phase !== "growing") continue;
    p.progress = Math.min(1, p.progress + dt / growTime(s, i));
    if (p.progress >= 1) { p.phase = "ready"; events.push({ type: "ripe", plot: i }); }
  }
  if (s.upgrades.helper) {
    s.helperTimer += dt;
    if (s.helperTimer >= 2) {
      s.helperTimer = 0;
      for (let i = 0; i < openPlots(s); i++) {
        if (harvest(s, i)) events.push({ type: "harvest", plot: i });
        if (plant(s, i)) events.push({ type: "plant", plot: i });
      }
    }
  }
  s.visitorTimer -= dt;
  if (s.visitorTimer <= 0) {
    s.visitorTimer = 16 * Math.pow(0.88, s.upgrades.signs) * (0.8 + random() * 0.4);
    const kind = Math.floor(random() * 5);
    s.visitors.push({ id: s.nextVisitor++, kind, age: 0, budget: [20, 40, 80, 140, 60][kind], bought: null, leaveAt: null });
    events.push({ type: "arrival" });
  }
  for (const v of s.visitors) {
    v.age += dt;
    if (v.leaveAt === null && v.age >= VISIT.arrive) {
      // Best pumpkin they can afford.
      let pick = -1;
      s.stock.forEach((variety, idx) => {
        if (VARIETIES[variety].price <= v.budget && (pick < 0 || variety > s.stock[pick])) pick = idx;
      });
      if (pick >= 0) {
        const variety = s.stock.splice(pick, 1)[0], amount = VARIETIES[variety].price;
        s.coins += amount; s.earned += amount; s.sold++;
        v.bought = variety; v.leaveAt = v.age + VISIT.linger;
        events.push({ type: "sale", amount, visitor: v.id });
      } else if (v.age >= VISIT.arrive + VISIT.patience) {
        v.leaveAt = v.age + VISIT.linger;
        events.push({ type: "missed", visitor: v.id });
      }
    }
  }
  s.visitors = s.visitors.filter((v) => v.leaveAt === null || v.age < v.leaveAt + VISIT.leave);
  return events;
}
