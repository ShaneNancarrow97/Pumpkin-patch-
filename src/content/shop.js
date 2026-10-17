var shopCapacity = [1, 2, 4, 6];
var shopUpgradeCosts = { open: [600], capacity: [900, 3200, 9500], displays: [1200], checkout: [1800, 5200] };
var checkoutSeconds = [12, 10, 8];
var supportedCheckoutSeconds = [3.5, 2.5, 1.5, ...checkoutSeconds];
var customerModels = ["ghost", "witch", "vampire", "skeleton", "scarecrow"];
var customerProfiles = [
  { budget: 25, basketLimit: 2, preferred: ["pumpkin-orange", "pumpkin-moonlight"] },
  { budget: 70, basketLimit: 1, preferred: ["pumpkin-starlight", "pumpkin-witchfire", "pumpkin-moonlight"] },
  { budget: 60, basketLimit: 3, preferred: ["pumpkin-moonlight", "pumpkin-orange"] },
  { budget: 100, basketLimit: 2, preferred: ["pumpkin-witchfire", "pumpkin-moonlight"] },
  { budget: 180, basketLimit: 3, preferred: ["pumpkin-starlight", "pumpkin-witchfire"] },
  { budget: 40, basketLimit: 2, preferred: ["pumpkin-orange", "pumpkin-moonlight"] }
];

export { checkoutSeconds, customerModels, customerProfiles, shopCapacity, shopUpgradeCosts, supportedCheckoutSeconds };
