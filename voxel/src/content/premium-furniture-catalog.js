// Premium kitchen and bedroom furniture, using the existing house rules.
export const PREMIUM_FURNITURE_CATALOG = [
  { id: "copper-range", name: "Moonfire copper range", price: 14000, description: "A cast-iron range with brass fittings, copper cookware and a warm ember glow.", footprint: [3,2], spooky: 3 },
  { id: "preserves-dresser", name: "Harvest preserves dresser", price: 10000, description: "A carved walnut dresser filled with preserves and favourite crockery.", footprint: [2,1], spooky: 1 },
  { id: "copper-sink-island", name: "Copper pumpkin kitchen island", price: 12000, description: "A generous worktop, recessed copper sink and hanging pans for an autumn kitchen.", footprint: [3,2], spooky: 1 },
  { id: "moon-canopy-bed", name: "Moonlit velvet canopy bed", price: 22000, description: "Plum velvet drapes, carved moon finials and a quilt made for midnight dreams.", footprint: [3,3], spooky: 4 },
  { id: "moon-wardrobe", name: "Crescent carved wardrobe", price: 16000, description: "A tall walnut wardrobe with gilded moons and room for imagined adventures.", footprint: [2,1], spooky: 3 },
  { id: "moon-vanity", name: "Midnight looking-glass vanity", price: 18000, description: "An oval looking glass, little keepsakes and a matching velvet stool.", footprint: [2,2], spooky: 3 },
].map(item=>Object.freeze({...item,footprint:Object.freeze(item.footprint),category:"furniture",wall:false,rug:false,collection:"premium-furniture"}));
