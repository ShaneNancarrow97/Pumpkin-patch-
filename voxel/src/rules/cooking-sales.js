// Optional shop food uses each guest's existing purse. A held serving is real
// inventory, with its price fixed until payment; the renderer never sells it.
import { RECIPE_BY_ID } from '../content/cooking.js';
import { enjoyTreat } from './guest-needs.js';
import { BIG_SPENDER_KIND } from './big-spender.js';

const ownerOf = customer => 'customer-' + customer.id;
const amountOf = lines => (lines ?? []).reduce((total, line) => total + line.price * line.quantity, 0);
const purse = value => Number.isFinite(value) ? Math.max(0, value) : 0;
const holds = s => s.kitchen?.foodHolds ?? [];
const heldBy = (s, c) => holds(s).find(h => h.owner === ownerOf(c));
export const availableFood = (s, recipe) => Math.max(0, (s.kitchen?.food?.[recipe] ?? 0) - holds(s).reduce((n, h) => n + (h.recipe === recipe ? h.quantity : 0), 0));

// Bags let hungry guests take a little food home. They still choose against
// the change in their own purse, never against a second food-only budget.
export function foodBasketLimit(s, customer) {
  const bags = Number.isFinite(s.customerCare?.bags) ? Math.max(0, Math.min(3, Math.floor(s.customerCare.bags))) : 0;
  const hunger = purse(customer.needs?.hunger);
  if (!bags) return 1;
  if (customer.starving) return 8;
  if (customer.vip || customer.kind === BIG_SPENDER_KIND) return 6;
  if (bags >= 2 && hunger >= 85) return 3;
  return hunger >= 70 ? 2 : 1;
}

// A guest who brought a separate purse for the currently wanted pumpkin keeps
// that money if this shop could not offer one. Food and tips cannot spend it.
export function protectedFoodPurse(s, customer, lines = customer.basket) {
  const wish = customer.wish;
  if (!wish || !Number.isFinite(wish.purse) || wish.purse <= 0) return 0;
  return (lines ?? []).some(line => line.variety === wish.variety && line.quantity > 0 && line.price >= wish.purse) ? 0 : wish.purse;
}

export const foodPaymentReserve = (s, customer) => {
  const h = heldBy(s, customer);
  return h ? h.quantity * h.price : 0;
};

export function quoteFoodForCustomer(s, customer, pumpkinLines = customer.basket) {
  const k = s.kitchen;
  if (s.paused || !k?.purchased || !s.shop?.unlocked || customer.food?.status === 'paid') return null;
  const existing = heldBy(s, customer);
  if (existing) return existing;
  const hunger = purse(customer.needs?.hunger), value = Math.max(.5, Math.min(1.5, customer.needs?.value ?? 1));
  if (hunger < 40) return null;
  const change = purse(customer.budget) - amountOf(pumpkinLines) - protectedFoodPurse(s, customer, pumpkinLines);
  const options = [...new Set(k.displays)].map((id, index) => {
    const recipe = RECIPE_BY_ID[id], price = k.prices[id];
    if (!recipe || !k.recipes.includes(id) || !Number.isSafeInteger(price) || price < 1 || availableFood(s, id) < 1 || price > change) return null;
    const fair = Math.round(recipe.basePrice * (.85 + hunger * .004) * value);
    if (price > fair) return null;
    // Stable tastes vary the two shelves without rerolling on each render.
    const preference = 1 + ((customer.id * 7 + index * 11) % 13) / 65;
    const quantity = Math.min(foodBasketLimit(s, customer), availableFood(s, id), Math.floor(change / price));
    return { recipe: id, price, quantity, score: recipe.basePrice * preference / price };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  if (!options.length) return null;
  const selected = options[0], hold = { owner: ownerOf(customer), recipe: selected.recipe, price: selected.price, quantity: selected.quantity };
  k.foodHolds.push(hold);
  customer.food = { recipe: hold.recipe, price: hold.price, quantity: hold.quantity, status: 'held' };
  return hold;
}

export function releaseFoodForCustomer(s, customer) {
  if (!s.kitchen) return;
  s.kitchen.foodHolds = holds(s).filter(h => h.owner !== ownerOf(customer));
  if (customer.food?.status === 'held') customer.food.status = 'released';
}

// The pumpkin receipt is reserved, not yet deducted from the same wallet.
// Debiting food here makes the later care/tip calculation see only real change.
export function commitFoodForCustomer(s, customer, { reserved = 0, protectedPurse = 0 } = {}) {
  if (s.paused || !s.kitchen?.purchased || customer.food?.status === 'paid') return null;
  const k = s.kitchen, h = heldBy(s, customer);
  if (!h) return null;
  const amount = h.quantity * h.price;
  if (!RECIPE_BY_ID[h.recipe] || !Number.isSafeInteger(h.quantity) || h.quantity < 1 || h.quantity > 8 || !Number.isSafeInteger(h.price) || h.price < 1 || k.food[h.recipe] < h.quantity || purse(customer.budget) - purse(reserved) - purse(protectedPurse) < amount) {
    releaseFoodForCustomer(s, customer); return null;
  }
  k.foodHolds = holds(s).filter(other => other !== h);
  k.food[h.recipe] -= h.quantity;
  customer.budget -= amount;
  s.coins += amount; s.earned += amount;
  k.ledger.foodIncome += amount; k.ledger.foodSold += h.quantity;
  const receipt = { id: k.ledger.foodSold, recipe: h.recipe, quantity: h.quantity, amount, at: s.time };
  k.ledger.receipts.unshift(receipt); k.ledger.receipts.length = Math.min(32, k.ledger.receipts.length);
  customer.food = { recipe: h.recipe, price: h.price, quantity: h.quantity, status: 'paid', amount };
  enjoyTreat(customer, true, Math.max(.5, Math.min(1.5, RECIPE_BY_ID[h.recipe].basePrice / h.price)));
  return receipt;
}
