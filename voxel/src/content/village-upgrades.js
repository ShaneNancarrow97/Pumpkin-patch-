// Rowan's workshop links village restoration to better tools, household sets
// and a managed farm while the owners explore. Purchases use coins and materials.
export const VILLAGE_UPGRADES = Object.freeze([
  { id: "satchel-pockets", name: "Extra satchel pockets", text: "Carry 60 of each material, up from 40.", coins: 120, materials: { fibre: 4 }, needs: "rowan-stall", capacity: 60 },
  { id: "satchel-frame", name: "A sturdy satchel frame", text: "Carry 80 of each material, up from 60.", coins: 280, materials: { logs: 6, fibre: 6 }, needs: "rowan-2", previous: "satchel-pockets", capacity: 80 },
  { id: "gathering-kit", name: "A careful gathering kit", text: "Fallen timber, stone, fibre and herbs return 15% sooner after gathering.", coins: 200, materials: { logs: 4, fibre: 4 }, needs: "rowan-stall", respawn: .85 },
  { id: "gathering-straps", name: "Timber and stone straps", text: "Bring back 3 logs or stone from each pile, up from 2.", coins: 350, materials: { logs: 8, stone: 6, fibre: 4 }, needs: "rowan-2", previous: "gathering-kit", extra: 1 },
  { id: "away-ledger", name: "A farm ledger", text: "A shared ledger keeps the farm running at 5% while you explore Mothlight, up from 2.5%.", coins: 350, materials: { logs: 4, fibre: 4 }, needs: "rowan-stall", farmRate: .05 },
  { id: "away-steward", name: "A trusted farm steward", text: "Rowan's neighbour minds your farm at 7.5% speed while you explore.", coins: 850, materials: { logs: 10, stone: 6, fibre: 6 }, needs: "rowan-2", previous: "away-ledger", farmRate: .075 },
  { id: "away-network", name: "The lantern network", text: "An organised village crew keeps farm earnings, crops and production at 10% while you explore.", coins: 1600, materials: { logs: 16, stone: 10, fibre: 8, herbs: 4 }, needs: "two-doorbells", previous: "away-steward", farmRate: .10 },
  { id: "moonlit-reading-set", name: "Moonlit reading set", text: "A reading bench, floating shelf and plum mug for your farmhouse. A little of Elowen's library, brought home.", coins: 650, materials: { logs: 8, fibre: 6, herbs: 3 }, needs: "elowen-2", homeItems: ["midnight-reading-bench", "shelf-floating", "household-plum-mug"] },
  { id: "rattlewood-workshop-set", name: "Rattlewood hallway set", text: "A lantern console, coat hooks and bracket shelf for your farmhouse, made by Rowan.", coins: 700, materials: { logs: 12, stone: 4, fibre: 4 }, needs: "rowan-2", homeItems: ["lantern-entry-console", "household-coat-hooks", "shelf-bracket"] },
].map((u) => Object.freeze({ ...u, materials: Object.freeze(u.materials), effect: `upgrade:${u.id}` })));
export const VILLAGE_UPGRADE_BY_ID = Object.freeze(Object.fromEntries(VILLAGE_UPGRADES.map((u) => [u.id, u])));
