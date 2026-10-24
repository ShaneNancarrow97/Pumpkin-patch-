// The woodland attraction's economy and timing; its measured site lives elsewhere.
// rideAlongSeconds: the owner's ride-along runs the whole woodland route at a
// walking pace. Paying guests' circuits stay circuitSeconds, so their visits and
// the farm's economy are unchanged.
export const HAYRIDE_PROPERTY = Object.freeze({ name: "The Hollow Hayride", rideAlongSeconds: 150, level: 11, price: 7500, approachSeconds: 12, returnSeconds: 10, queuePatience: 220, maxWait: 15, departureSeconds: 3, arrivalSeconds: 3, unloadSeconds: 6, routeVersion: 1 });
export const HAYRIDE_TIERS = [
  { level: 1, name: "The first fearful circuit", patchLevel: 11, cost: 0, seats: 4, queueCapacity: 8, minTicket: 4, maxTicket: 12, circuitSeconds: 90, boardingSeconds: 1.5, scare: 20 },
  { level: 2, name: "Lantern convoy", patchLevel: 12, cost: 6500, seats: 6, queueCapacity: 12, minTicket: 4, maxTicket: 16, circuitSeconds: 90, boardingSeconds: 1.25, scare: 28 },
  { level: 3, name: "Midnight procession", patchLevel: 12, cost: 14000, seats: 8, queueCapacity: 16, minTicket: 4, maxTicket: 20, circuitSeconds: 90, boardingSeconds: 1, scare: 36 },
];
// Every landmark exists in the basic circuit; these purchases strengthen its show.
export const HAYRIDE_SCARES = [
  { id: "turning-scarecrows", name: "Watching scarecrows", tier: 1, cost: 900, scare: 12, text: "Pumpkin heads turn to watch the wagon pass through the patch." },
  { id: "spider-drop", name: "The spider descent", tier: 1, cost: 1400, scare: 14, text: "A tunnel spider drops beside the wagon, then rises into the web." },
  { id: "bride-procession", name: "The bride's procession", tier: 2, cost: 2200, scare: 17, text: "The manor's bride approaches through a veil of cold mist." },
  { id: "spectral-burst", name: "Spectral pursuit", tier: 2, cost: 3200, scare: 18, text: "The purple gas ghost surges towards the lane before the investigators repel it." },
  { id: "bus-breakout", name: "Prison bus breakout", tier: 3, cost: 4500, scare: 20, text: "Zombie passengers lurch from the prison bus at the final bend." },
];
export const HAYRIDE_SCARE_BY_ID = Object.fromEntries(HAYRIDE_SCARES.map(p => [p.id, p]));
