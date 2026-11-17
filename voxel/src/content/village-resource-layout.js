// Small loose pickups throughout the lived-in village, in addition to the
// original forecourt clearings. Positions and areas use the design grid.
export const VILLAGE_RESOURCE_PATCHES = Object.freeze([
  { id: "logs-11", material: "logs", x: 31, z: 18, area: "library-garden" },
  { id: "herbs-07", material: "herbs", x: 37, z: 14, area: "library-garden" },
  { id: "stone-09", material: "stone", x: 38, z: 24, area: "library-garden" },
  { id: "fibre-09", material: "fibre", x: 33, z: 23, area: "library-garden" },
  { id: "logs-12", material: "logs", x: 75, z: 22, area: "workshop-garden" },
  { id: "herbs-08", material: "herbs", x: 79, z: 24, area: "workshop-garden" },
  { id: "stone-10", material: "stone", x: 75, z: 12, area: "workshop-garden" },
  { id: "fibre-10", material: "fibre", x: 80, z: 11.8, area: "workshop-garden" },
  { id: "logs-13", material: "logs", x: 5, z: 40, area: "northwest-lawn" },
  { id: "stone-11", material: "stone", x: 14, z: 46, area: "northwest-lawn" },
  { id: "herbs-09", material: "herbs", x: 23, z: 39, area: "northwest-lawn" },
  { id: "fibre-11", material: "fibre", x: 35, z: 45, area: "northwest-lawn" },
  { id: "logs-14", material: "logs", x: 41, z: 38, area: "northwest-lawn" },
  { id: "herbs-10", material: "herbs", x: 47, z: 46, area: "northwest-lawn" },
  { id: "stone-12", material: "stone", x: 68, z: 39, area: "northeast-lawn" },
  { id: "logs-15", material: "logs", x: 76, z: 46, area: "northeast-lawn" },
  { id: "fibre-12", material: "fibre", x: 89, z: 40, area: "northeast-lawn" },
  { id: "herbs-11", material: "herbs", x: 103, z: 46, area: "northeast-lawn" },
  { id: "stone-13", material: "stone", x: 113, z: 39, area: "northeast-lawn" },
  { id: "fibre-13", material: "fibre", x: 117, z: 47, area: "northeast-lawn" },
  { id: "logs-16", material: "logs", x: 8, z: 4, area: "west-lawn" },
  { id: "herbs-12", material: "herbs", x: 22, z: 6, area: "west-lawn" },
  { id: "stone-14", material: "stone", x: 115, z: 21, area: "east-lawn" },
  { id: "fibre-14", material: "fibre", x: 115, z: 27, area: "east-lawn" },
].map(n => Object.freeze({ ...n, district: "green", expansion: true })));

export const VILLAGE_RESOURCE_AREAS = Object.freeze([
  { id: "library-garden", name: "Elowen's side garden", x0: 29.5, z0: 13.3, x1: 39.2, z1: 26.6 },
  { id: "workshop-garden", name: "Rowan's side garden", x0: 74.6, z0: 11.2, x1: 80.8, z1: 24.8 },
  { id: "northwest-lawn", name: "Western lantern lawn", x0: 2, z0: 37, x1: 50.5, z1: 49 },
  { id: "northeast-lawn", name: "Eastern lantern lawn", x0: 63, z0: 37, x1: 118, z1: 49 },
  { id: "west-lawn", name: "Western village lawn", x0: 5, z0: 2.8, x1: 27, z1: 6.9 },
  { id: "east-lawn", name: "Tavern verge", x0: 113.3, z0: 12, x1: 117.9, z1: 28.8 },
].map(Object.freeze));

// Reserve the actual planted beds and tree trunks when choosing loose pickup
// sites. These are not broad walking barriers across otherwise open grass.
export const VILLAGE_RESOURCE_EXCLUSIONS = Object.freeze([
  { x0: 29.2, z0: 11.6, x1: 39, z1: 12.6 },
  { x0: 29.2, z0: 27.4, x1: 38.5, z1: 28.4 },
  { x0: 67.6, z0: 9.6, x1: 81, z1: 10.6 },
  { x0: 75, z0: 25.4, x1: 81, z1: 26.4 },
  { x0: 75.55, z0: 14.5, x1: 80.35, z1: 19.5 },
  ...[[31,25.5],[31.5,14.5],[35.5,20],[70.6,25.4],[79,21],[78.6,13.4]].map(([x,z]) => ({ x, z, r: .65 })),
].map(Object.freeze));
