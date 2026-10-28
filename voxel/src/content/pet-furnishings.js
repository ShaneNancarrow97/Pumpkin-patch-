// Beds and bowls belong to the normal room catalogue; pet routines are cosmetic.
export const PET_FURNISHINGS = Object.freeze([
  { id: "moon-cat-bed", name: "Skyla’s crescent basket", price: 90, footprint: [1, 1], description: "A woven moon basket and plum cushion for Skyla’s afternoon naps.", petUse: "cat-bed" },
  { id: "harvest-dog-bed", name: "Harvest hound bed", price: 120, footprint: [2, 1], description: "A long quilted bed for Sandy or Maisie. Both dogs enjoy a proper stretch.", petUse: "dog-bed" },
  { id: "midnight-pet-bowls", name: "Midnight supper bowls", price: 60, footprint: [1, 1], description: "Food and fresh water on a walnut tray. The pets visit for a snack or a drink.", petUse: "bowls" },
].map(item => Object.freeze({ ...item, footprint: Object.freeze(item.footprint), category: "furniture", wall: false, rug: false, spooky: 1, collection: "home-companions" })));

// Actual model bounds, in the same floor-centred coordinates as the furniture kit.
export const PET_FURNISHING_SIZES = Object.freeze({
  "moon-cat-bed": { box: [-.44, .44, -.40, .40, .42] },
  "harvest-dog-bed": { box: [-.90, .90, -.40, .42, .30] },
  "midnight-pet-bowls": { box: [-.45, .45, -.33, .33, .18] },
});
