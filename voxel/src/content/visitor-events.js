// Paid occasions bring a bounded group, not an uncapped arrival multiplier.
export const VISITOR_EVENT_UPGRADES = Object.freeze([
  Object.freeze({ id: "rush", name: "Harvest rush", level: 7, costs: Object.freeze([1600]), seconds: 300, min: 10, max: 20, text: "Invite a rush of 10–20 neighbours every five minutes of game time." }),
  Object.freeze({ id: "vip", name: "The midnight court", level: 10, costs: Object.freeze([6000]), seconds: 240, min: 3, max: 5, text: "Welcome 3–5 wealthy Renaissance visitors, each spending their own finite purse." }),
]);
export const VISITOR_EVENT_BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(VISITOR_EVENT_UPGRADES.map(u => [u.id, u]))));
export const VISITOR_EVENT_WORLD_CAP = 70;
// Everyone at once, the attractions' own guests included: the hard ceiling.
export const VISITOR_TOTAL_CAP = 110;
export const VISITOR_EVENT_BURST = 20;
export const VISITOR_EVENT_GAP = .1;
export const COURTIER_KINDS = Object.freeze([11, 12, 13, 14]);
