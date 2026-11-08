// Rowan's practical Green upgrades use the existing purse and materials. Farm
// benefits remain his friendship gifts, so gathering never replaces farm trade.
export const VILLAGE_UPGRADES = Object.freeze([
  { id: "satchel-pockets", name: "Extra satchel pockets", text: "Carry 60 of each material, up from 40.", coins: 120, materials: { fibre: 4 }, needs: "rowan-stall", capacity: 60 },
  { id: "satchel-frame", name: "A sturdy satchel frame", text: "Carry 80 of each material, up from 60.", coins: 280, materials: { logs: 6, fibre: 6 }, needs: "rowan-2", previous: "satchel-pockets", capacity: 80 },
  { id: "gathering-kit", name: "A careful gathering kit", text: "Fallen timber, stone, fibre and herbs return 15% sooner after gathering.", coins: 200, materials: { logs: 4, fibre: 4 }, needs: "rowan-stall", respawn: .85 },
  { id: "gathering-straps", name: "Timber and stone straps", text: "Bring back 3 logs or stone from each pile, up from 2.", coins: 350, materials: { logs: 8, stone: 6, fibre: 4 }, needs: "rowan-2", previous: "gathering-kit", extra: 1 },
].map((u) => Object.freeze({ ...u, materials: Object.freeze(u.materials), effect: `upgrade:${u.id}` })));
export const VILLAGE_UPGRADE_BY_ID = Object.freeze(Object.fromEntries(VILLAGE_UPGRADES.map((u) => [u.id, u])));
