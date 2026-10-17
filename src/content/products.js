var pumpkinVarieties = [
  { id: "orange", name: "Orange", price: 12, cost: 0, glow: "255,153,42", description: "The cheerful little classic." },
  { id: "moonlight", name: "Moonlight", price: 24, cost: 180, glow: "190,183,255", description: "Pale pumpkins with a soft moonlit glow." },
  { id: "witchfire", name: "Witchfire", price: 42, cost: 900, glow: "183,116,255", description: "Enchanted purple pumpkins for midnight spells." },
  { id: "starlight", name: "Starlight", price: 70, cost: 3600, glow: "255,223,100", description: "Golden pumpkins, warm as a fallen star." }
];
var productCatalog = pumpkinVarieties.map((variety) => ({
  id: `pumpkin-${variety.id}`,
  name: variety.name + " pumpkin",
  category: "pumpkin",
  defaultPrice: variety.price
}));
function findProduct(id) {
  return typeof id === "string" ? productCatalog.find((product) => product.id === id) : void 0;
}
function productForLegacyPrice(price2) {
  return productCatalog.find((product) => product.defaultPrice === price2);
}

export { findProduct, productCatalog, productForLegacyPrice, pumpkinVarieties };
