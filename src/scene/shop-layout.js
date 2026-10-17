var shopScene = {
  id: "farm-shop",
  width: 1e3,
  height: 660,
  background: "assets/house/shop-interior.webp",
  entrance: { x: 108, y: 422 },
  checkout: { x: 823, y: 490 },
  skyla: { x: 914, y: 309, height: 76 },
  displays: [{ x: 341, y: 308 }, { x: 451, y: 308 }, { x: 565, y: 308 }, { x: 676, y: 308 }],
  browsePlaces: [
    { x: 340, y: 454 },
    { x: 457, y: 454 },
    { x: 573, y: 454 },
    { x: 686, y: 454 },
    { x: 431, y: 535 },
    { x: 577, y: 535 }
  ]
};
var shopMapOutline = {
  x: 675,
  y: 84,
  width: 285,
  height: 245,
  polygon: "15% 13%,18% 2%,82% 0%,89% 21%,94% 37%,99% 42%,96% 95%,84% 100%,24% 92%,2% 82%,6% 53%,11% 37%"
};

export { shopMapOutline, shopScene };
