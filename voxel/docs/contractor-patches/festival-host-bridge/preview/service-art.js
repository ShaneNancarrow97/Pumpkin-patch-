// Reviewed atlas metadata only. Asset loading belongs to the preview, never
// this helper; category illustrations are not evidence of an order's contents.
export const SERVICE_ATLASES = Object.freeze({
 'kitchen-dishes': Object.freeze({ columns: 4, rows: 4 }),
 'hospitality-icons': Object.freeze({ columns: 4, rows: 3 }),
 'kitchen-ingredients': Object.freeze({ columns: 6, rows: 3 })
});

// Keep the cell order aligned with voxel/src/ui/kitchen-food-art.js. That live
// UI module is deliberately not imported: it also loads assets and browser APIs.
export const DISH_ART_IDS = Object.freeze([
 'wedges', 'soup', 'toffee-apples', 'pumpkin-jam',
 'ghost-cookies', 'pumpkin-pie', 'cocoa-brownies', 'moonlight-tart',
 'garden-skillet', 'harvest-broth', 'spiced-roast', 'moonfire-chicken',
 'haunted-pie', 'pumpkin-spice-biscuits', 'mixing-bowl', 'recipe-book'
]);
export const DISH_ART_INDEX = Object.freeze(Object.fromEntries(DISH_ART_IDS.map((id,index)=>[id,index])));
export const SERVICE_CATEGORY_ART = Object.freeze({
 food: Object.freeze({ atlas: 'hospitality-icons', index: 2 }),
 cocoa: Object.freeze({ atlas: 'hospitality-icons', index: 6 }),
 garden: Object.freeze({ atlas: 'kitchen-ingredients', index: 7 }),
 ride: Object.freeze({ atlas: 'hospitality-icons', index: 3 })
});

/**
 * serviceArt(kind, offer) -> {atlas,index,columns,rows,illustrative}.
 * `atlas` is an asset stem, not a URL. Only an exact food recipe ID with reviewed
 * art is literal; cocoa, garden, ride and food fallbacks are category artwork.
 * Return a fresh descriptor, without mutating or retaining the supplied offer.
 */
export function serviceArt(kind,offer){
 const recipeId=typeof offer?.recipeId==='string'?offer.recipeId:null;
 if(kind==='food'&&recipeId!==null&&Object.hasOwn(DISH_ART_INDEX,recipeId)){
  const atlas='kitchen-dishes';
  return {atlas,index:DISH_ART_INDEX[recipeId],...SERVICE_ATLASES[atlas],illustrative:false};
 }
 const art=Object.hasOwn(SERVICE_CATEGORY_ART,kind)?SERVICE_CATEGORY_ART[kind]:SERVICE_CATEGORY_ART.food;
 return {...art,...SERVICE_ATLASES[art.atlas],illustrative:true};
}
