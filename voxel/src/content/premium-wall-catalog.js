// Voxel-only content. These entries use existing buying, storage and wall hooks.
export const PREMIUM_WALL_CATALOG = [
  { id: "copper-pan-rail", name: "Harvest copper pan rail", price: 4500, description: "Four copper pans on a brass rail, ready for an autumn feast.", wallWidth: 3, spooky: 1 },
  { id: "gothic-spice-cabinet", name: "Apothecary spice cabinet", price: 6500, description: "Carved walnut shelves for jars of cinnamon and midnight secrets.", wallWidth: 2, spooky: 3 },
  { id: "iron-utensil-rack", name: "Midnight utensil rack", price: 3500, description: "A ladle, slotted turner, whisk and pan for a witch's kitchen.", wallWidth: 2, spooky: 2 },
  { id: "recipe-teapot-shelf", name: "Pumpkin tea & recipe shelf", price: 5000, description: "Gilt recipe books beside a copper pumpkin teapot. A decorative set.", wallWidth: 3, spooky: 2 },
  { id: "crescent-mirror", name: "Crescent looking glass", price: 8000, description: "A sculpted golden moon around softly tinted glass.", wallWidth: 2, spooky: 3 },
  { id: "haunted-manor-painting", name: "The manor after midnight", price: 11000, description: "A tiny moonlit manor in a gilded frame, lit by two candles.", wallWidth: 3, spooky: 4 },
].map(item=>Object.freeze({...item,category:"decor",wall:true,rug:false,hangHeight:4.05,collection:"premium-walls"}));
