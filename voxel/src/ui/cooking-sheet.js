import { patchLevel } from "../rules/levels.js";
import { VARIETIES } from "../rules/farm.js";
import { available } from "../rules/stock.js";
import { availableFood } from "../rules/cooking-sales.js";
import * as C from "../content/cooking.js";
import * as K from "../rules/cooking.js";
import { money, segmented } from "./kit.js";
import { cookingIcon } from "./cooking-icons.js";

const count = n => Math.max(0, Math.floor(Number(n) || 0));
const disabled = ok => ok ? "" : "disabled";
const seconds = n => `${Math.max(0, Math.ceil(Number(n) || 0))}s`;
const phaseNames = { ordered: "Packing your order", travelling: "Cart on its way", unloading: "At the receiving bay" };
const tabs = [["recipes", "Recipes"], ["deliveries", "Deliveries"], ["pantry", "Pantry"], ["food", "Food shelves"]];

// One management surface for the truck, home cooker and shop shelves. Quantities,
// tabs and confirmations belong to this view; money and timers belong to rules.
export function cookingSheets(ui) {
  let tab = "recipes", station = "truck", cart = {}, cancelStation = null;
  const disclosures = { upgrades: false, accounts: false };
  const changed = (message = "") => {
    ui.save(); ui.scene.refreshCooking?.(); ui.tone?.(700); ui.draw();
    if (message) ui.notice?.(message);
  };
  const editable = () => !ui.state.paused;
  const visit = () => { ui.closeSheet(); ui.scene.focusCooking?.(); };
  const known = (s, id) => s.kitchen.recipes.includes(id);
  const recipeName = id => C.RECIPES.find(r => r.id === id)?.name ?? "Recipe";
  const qty = id => count(cart[id]);

  function locked(s) {
    const level = patchLevel(s).level, canBuy = editable() && K.kitchenUnlocked(s) && s.coins >= C.COOKING.price;
    const reason = level < C.COOKING.level ? `Purchase unlocks at patch level ${C.COOKING.level}. Your current level is ${level}.`
      : !editable() ? "Resume the farm to purchase." : s.coins < C.COOKING.price ? `Save ${money(C.COOKING.price - s.coins)} more to open the kitchen.`
      : "Buy the truck when you’re ready. Reaching level 5 does not spend your coins.";
    return `<div class="cooking-sheet" data-cooking-state="locked"><article class="cooking-welcome${canBuy ? " purchase-available" : ""}">${cookingIcon("truck")}<div><p class="cooking-kicker">A new little business</p><h3>The Midnight Kitchen</h3><p>Order ingredients, cook pumpkin treats and fill the shelves in Skyla’s shop.</p></div><button class="button purchase-button wide" data-cooking-action="purchase" ${disabled(canBuy)}>Buy the food truck · ${money(C.COOKING.price)}</button></article><p class="cooking-note" data-cooking-gate>${reason}</p><div class="cooking-quote"><h4>From the farm to the counter</h4><p class="cooking-note">A starter hob and roasted-pumpkin recipe are included. Ingredients arrive by cart after ${seconds(C.COOKING.deliverySeconds)} of game time. Each order has a ${money(C.COOKING.deliveryFee)} delivery fee.</p><p class="cooking-note">The truck works before your home kitchen is built. Cooking uses real ingredients and pumpkins; visitors buy food with the money they have left.</p></div></div>`;
  }

  function capacity(label, used, max) {
    return `<div class="cooking-capacity"><div><span>${label}</span><b>${count(used)} / ${count(max)}</b></div><meter min="0" max="${Math.max(1, max)}" value="${used}" aria-label="${label}: ${count(used)} of ${count(max)}"></meter></div>`;
  }

  function stations(s) {
    const home = K.homeCookingAvailable(s), showHome = home || !!s.kitchen.jobs.home;
    if (station === "home" && !home) station = "truck";
    const stationMarkup = ["truck", ...(showHome ? ["home"] : [])].map(id => {
      const job = s.kitchen.jobs[id], title = id === "home" ? "Home cooker" : "Truck hob";
      if (!job) return `<article class="cooking-station"><div class="cooking-station-head"><div><h4>${title}</h4><p>Ready for a recipe</p></div><span class="cooking-state is-ready">Ready</span></div></article>`;
      const waiting = job.remaining <= 0, recipe = C.RECIPES.find(r => r.id === job.recipe);
      const duration = Math.max(1, job.duration ?? recipe?.seconds ?? 1), progress = Math.max(0, Math.min(1, 1 - job.remaining / duration));
      return `<article class="cooking-station is-busy" data-cooking-job="${id}"><div class="cooking-station-head"><div><h4>${title} · ${recipeName(job.recipe)}</h4><p class="${waiting ? "cooking-note is-warning" : ""}">${waiting ? "Ready — make space in food storage to finish." : `${seconds(job.remaining)} remaining${job.automatic ? " · Chef’s batch" : ""}`}</p></div>${cancelStation !== id ? `<button class="button" data-cooking-cancel="${id}" ${disabled(editable())}>Stop</button>` : ""}</div><progress max="1" value="${progress}" aria-label="${title} cooking progress"></progress>${id === "home" && !home ? '<p class="cooking-note">This paid batch will finish safely. Place the copper range again to start another.</p>' : ""}${cancelStation === id ? `<p class="cooking-note is-warning">Stopping discards this batch. Used ingredients and pumpkins are not refunded.</p><div class="cooking-cancel-confirm"><button class="button" data-cooking-cancel-dismiss>Keep cooking</button><button class="button is-destructive" data-cooking-cancel-confirm="${id}" ${disabled(editable())}>Discard batch</button></div>` : ""}</article>`;
    }).join("");
    return `<section class="cooking-section" aria-label="Cooking stations"><div class="cooking-title-row"><h3>Cooking stations</h3>${home && ui.enterKitchen ? '<button class="cooking-text-button" data-cooking-action="home">Visit kitchen</button>' : ""}</div><div class="cooking-stations">${stationMarkup}</div>${showHome ? `<label class="cooking-field">Cook your next batch at<select data-cooking-station aria-label="Cooking station" ${disabled(editable())}><option value="truck" ${station === "truck" ? "selected" : ""}>Truck hob</option><option value="home" ${station === "home" ? "selected" : ""} ${disabled(home)}>Home cooker${home ? "" : " · Range required"}</option></select></label>` : '<p class="cooking-note">A second station opens when your house has a kitchen with a placed copper range. Both stations share this pantry.</p>'}</section>`;
  }

  function inputs(s, recipe) {
    const supplies = Object.entries(recipe.ingredients ?? {}).map(([id, n]) => {
      const name = C.INGREDIENTS.find(i => i.id === id)?.name ?? id;
      return `<span class="${count(s.kitchen.pantry[id]) < n ? "is-short" : ""}">${n} ${name.toLowerCase()}</span>`;
    });
    for (const [index, n] of Object.entries(recipe.pumpkins ?? {})) {
      supplies.push(`<span class="${available(s, Number(index)) < n ? "is-short" : ""}">${n} ${(VARIETIES[Number(index)]?.name ?? "pumpkin").toLowerCase()} pumpkin${n === 1 ? "" : "s"}</span>`);
    }
    return supplies.join(" · ");
  }

  function recipes(s) {
    const level = patchLevel(s).level;
    return `${stations(s)}<section class="cooking-section"><div class="cooking-title-row"><h3>Your recipe book</h3><span class="cooking-state">${s.kitchen.recipes.length}/${C.RECIPES.length} learned</span></div><p class="cooking-note">Each batch uses the ingredients below immediately. Stopping a batch does not refund them.</p><div class="cooking-list">${C.RECIPES.map(recipe => {
      const learned = known(s, recipe.id), gated = level < recipe.level, readiness = learned ? K.cookingReadiness(s, recipe.id, station) : null;
      const researchPrice = recipe.research ?? 0, ready = learned && editable() && readiness.ok;
      const state = gated ? `Patch level ${recipe.level}` : !learned ? `Research · ${money(researchPrice)}` : readiness.ok ? "Ready to cook" : readiness.reason;
      return `<article class="cooking-recipe" data-cooking-recipe="${recipe.id}">${cookingIcon(recipe.id)}<div class="cooking-recipe-body"><h4>${recipe.name}</h4><p>${recipe.text}</p><p class="cooking-inputs">${inputs(s, recipe)}</p><div class="cooking-recipe-meta"><span>${recipe.yield} portions</span><span>${seconds(recipe.seconds)} base time</span><span>${money(s.kitchen.prices[recipe.id] ?? recipe.price)} each</span></div><span class="cooking-state${ready ? " is-ready" : ""}">${state}</span></div><div class="cooking-recipe-actions">${learned ? `<button class="button purchase-button" data-cooking-start="${recipe.id}" data-cooking-at="${station}" ${disabled(ready)}>Cook ${recipe.yield} · ${station === "home" ? "Home" : "Truck"}</button>` : `<button class="button${!gated ? " purchase-button" : ""}" data-cooking-research="${recipe.id}" ${disabled(!gated && editable() && s.coins >= researchPrice)}>${gated ? `Level ${recipe.level}` : `Research · ${money(researchPrice)}`}</button>`}</div></article>`;
    }).join("")}</div><button class="button wide" data-cooking-go="deliveries">Order ingredients</button></section>`;
  }

  function deliveries(s) {
    const quote = K.quoteIngredientOrder(s, cart), k = s.kitchen;
    const countOrdered = Object.values(cart).reduce((n, amount) => n + count(amount), 0);
    return `<section class="cooking-section"><div class="cooking-title-row"><h3>Ingredient deliveries</h3>${cookingIcon("cart")}</div><p class="cooking-note">Ingredients arrive at the receiving bay after ${seconds(C.COOKING.deliverySeconds)} of game time. A second order waits for the first. Pausing the farm pauses deliveries.</p>${k.orders.length ? k.orders.map((order, index) => {
      const waiting = order.phase === "unloading" && order.remaining <= 0;
      return `<article class="cooking-delivery" data-cooking-order="${order.id}"><div class="cooking-title-row"><div><h4>${index > 0 && order.phase === "ordered" ? "Queued for packing" : phaseNames[order.phase] ?? "Delivery"}</h4><small>${waiting ? "Pantry full — your paid parcel is safe at the bay." : `${seconds(order.remaining)} ${order.phase === "ordered" ? "until departure" : order.phase === "travelling" ? "until arrival" : "to unload"}`}</small></div>${order.phase === "ordered" ? `<button class="button" data-cooking-order-cancel="${order.id}" ${disabled(editable())}>Cancel</button>` : ""}</div><p>${Object.entries(order.items).map(([id, n]) => `${n} ${C.INGREDIENTS.find(i => i.id === id)?.name.toLowerCase() ?? id}`).join(" · ")}</p>${order.phase === "ordered" ? '<small>Cancel before departure to refund the ingredients. Delivery fee is retained.</small>' : ""}</article>`;
    }).join("") : '<p class="cooking-empty">No deliveries are on the road. Build an order below.</p>'}${capacity("Pantry", K.pantryCount(s), K.pantryCapacity(s))}<div class="cooking-list">${C.INGREDIENTS.map(item => `<div class="cooking-order-item"><div><h4>${item.name}</h4><small>${money(item.price)} each · ${count(k.pantry[item.id])} in pantry</small></div><div class="cooking-stepper"><button class="button" data-cooking-quantity-step="${item.id}" data-step="-1" aria-label="Remove one ${item.name.toLowerCase()}" ${disabled(editable() && qty(item.id) > 0)}>−</button><input type="number" inputmode="numeric" min="0" max="${C.COOKING.orderLimit}" value="${qty(item.id)}" data-cooking-order-quantity="${item.id}" aria-label="${item.name} order quantity" ${disabled(editable())}><button class="button" data-cooking-quantity-step="${item.id}" data-step="1" aria-label="Add one ${item.name.toLowerCase()}" ${disabled(editable() && countOrdered < C.COOKING.orderLimit)}>+</button></div></div>`).join("")}</div><div class="cooking-quote"><dl><div><dt>${countOrdered} ingredients</dt><dd>${money(quote.subtotal ?? 0)}</dd></div><div><dt>Delivery fee</dt><dd>${money(quote.fee ?? C.COOKING.deliveryFee)}</dd></div><div class="cooking-total"><dt>Pay now</dt><dd>${money(quote.total ?? 0)}</dd></div></dl><button class="button purchase-button wide" data-cooking-action="order" ${disabled(editable() && quote.ok)}>Place order · ${money(quote.total ?? 0)}</button>${!quote.ok ? `<p class="cooking-note" data-cooking-quote-reason>${quote.reason}</p>` : '<p class="cooking-note">Paid parcels wait safely if the pantry fills up. Delivery never discards your ingredients.</p>'}</div></section>`;
  }

  function pantry(s) {
    return `<section class="cooking-section"><div class="cooking-title-row"><h3>Your shared pantry</h3>${cookingIcon("pantry")}</div>${capacity("Ingredients stored", K.pantryCount(s), K.pantryCapacity(s))}<div class="cooking-pantry">${C.INGREDIENTS.map(item => `<div><span>${item.name}</span><b>${count(s.kitchen.pantry[item.id])}</b></div>`).join("")}</div><p class="cooking-note">Truck and home use the same ingredients. Pumpkin recipes use your harvested farm stock, leaving reserved customer baskets untouched.</p><div class="cooking-pantry">${VARIETIES.map((variety, i) => `<div><span>${variety.name} pumpkins</span><b>${Math.max(0, count(available(s, i)))}</b></div>`).join("")}</div><button class="button wide" data-cooking-go="deliveries">Order ingredients</button></section>`;
  }

  function food(s) {
    const k = s.kitchen;
    return `<section class="cooking-section"><h3>Food shelves at Skyla’s</h3><p class="cooking-note">Choose two recipes for the shop’s wall displays. Hungry indoor customers consider food after their pumpkin basket, using the same wallet. A higher price can mean fewer sales.</p>${!s.shop.unlocked ? '<p class="cooking-note is-warning">Open Skyla’s indoor shop to begin food sales. Your cooked food stays in storage until then.</p>' : ""}${capacity("Finished food", K.foodCount(s), K.foodCapacity(s))}${[0, 1].map(slot => `<label class="cooking-field cooking-shelf">Wall display ${slot + 1}<select data-cooking-display="${slot}" aria-label="Food wall display ${slot + 1}" ${disabled(editable())}><option value="">Empty shelf</option>${C.RECIPES.filter(recipe => known(s, recipe.id)).map(recipe => `<option value="${recipe.id}" ${k.displays[slot] === recipe.id ? "selected" : ""}>${recipe.name} · ${availableFood(s, recipe.id)} available</option>`).join("")}</select></label>`).join("")}<div class="cooking-list">${C.RECIPES.filter(recipe => known(s, recipe.id)).map(recipe => {
      const range = K.foodPriceRange(s, recipe.id), price = k.prices[recipe.id] ?? recipe.price, ready = availableFood(s, recipe.id), reserved = Math.max(0, count(k.food[recipe.id]) - ready);
      return `<article class="cooking-food-row">${cookingIcon(recipe.id)}<div><h4>${recipe.name}</h4><small>${ready} available${reserved ? ` · ${reserved} reserved` : ""}${k.displays.includes(recipe.id) ? " · On display" : ""}</small></div><label class="cooking-field"><span class="sr-only">${recipe.name} selling price</span><select data-cooking-price="${recipe.id}" aria-label="${recipe.name} selling price" ${disabled(editable())}>${Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i).map(value => `<option value="${value}" ${price === value ? "selected" : ""}>${money(value)}</option>`).join("")}</select></label></article>`;
    }).join("")}</div><p class="cooking-note">Low prices may not cover ingredients, delivery fees and pumpkins used. Queued customers keep their quoted price. Food takings are tracked separately.</p></section>`;
  }

  function upgrades(s) {
    const k = s.kitchen, level = patchLevel(s).level, chef = count(k.upgrades.chef) > 0;
    return `<details class="cooking-disclosure" data-cooking-disclosure="upgrades" ${disclosures.upgrades ? "open" : ""}><summary><span>Kitchen improvements<small>Storage, faster cooking and a spooky chef</small></span></summary><div class="cooking-disclosure-body">${C.KITCHEN_UPGRADES.map(item => {
      const tier = count(k.upgrades[item.id]), cost = K.kitchenUpgradeCost(s, item.id), maxed = cost === undefined || cost === null;
      const gate = level < item.level;
      return `<article class="cooking-upgrade"><div><h4>${item.name}</h4><p>${item.text}</p><small>${maxed ? "Fully upgraded" : gate ? `Opens at patch level ${item.level}` : `Tier ${tier}/${item.costs.length}`}</small></div><button class="button${!gate && !maxed ? " purchase-button" : ""}" data-cooking-upgrade="${item.id}" ${disabled(editable() && !gate && !maxed && s.coins >= cost)}>${maxed ? "Complete" : gate ? `Level ${item.level}` : money(cost)}</button></article>`;
    }).join("")}${chef ? `<label class="cooking-field">Chef’s recipe<select data-cooking-chef aria-label="Spooky chef recipe" ${disabled(editable())}><option value="">Rest between batches</option>${C.RECIPES.filter(recipe => known(s, recipe.id)).map(recipe => `<option value="${recipe.id}" ${k.chefRecipe === recipe.id ? "selected" : ""}>${recipe.name}</option>`).join("")}</select></label><div class="cooking-chef-note">${cookingIcon("ghost-chef")}<p class="cooking-note">The chef uses the truck hob and real ingredients. Batches pause when inputs or storage space run out. The chef never orders supplies or spends coins automatically.</p></div>` : `<div class="cooking-chef-note">${cookingIcon("ghost-chef")}<p class="cooking-note">The spooky chef becomes available to hire at patch level 10. Recipes must be researched before the chef can make them.</p></div>`}</div></details>`;
  }

  function accounts(s) {
    const l = s.kitchen.ledger;
    return `<details class="cooking-disclosure" data-cooking-disclosure="accounts" ${disclosures.accounts ? "open" : ""}><summary><span>Kitchen accounts<small>${count(l.foodSold)} portions sold</small></span><b>${money(l.foodIncome)}</b></summary><dl class="cooking-accounts"><div><dt>Food takings</dt><dd>${money(l.foodIncome)}</dd></div><div><dt>Ingredients & deliveries</dt><dd>${money((l.ingredientSpend ?? 0) + (l.deliveryFees ?? 0))}</dd></div><div><dt>Recipe research</dt><dd>${money(l.researchSpend)}</dd></div><div><dt>Truck & improvements</dt><dd>${money(l.invested)}</dd></div></dl><p class="cooking-note">Food uses pumpkins you could otherwise sell. These accounts show cash spent and earned; they do not count that pumpkin value as a cash expense.</p></details>`;
  }

  function body() {
    const s = ui.state;
    if (!s.kitchen.purchased) return locked(s);
    const pages = { recipes, deliveries, pantry, food };
    return `<div class="cooking-sheet" data-cooking-state="owned"><div class="cooking-intro"><div><p class="cooking-kicker">The Midnight Kitchen</p><span class="cooking-status">${C.RECIPES.reduce((n, recipe) => n + availableFood(s, recipe.id), 0)} portions available · ${s.kitchen.orders.length} deliveries</span></div><button class="cooking-text-button" data-cooking-action="visit">View truck</button></div><div class="cooking-tabs">${segmented("cooking-tab", "Kitchen management", tabs, tab)}</div>${s.paused ? '<p class="cooking-paused" role="status">Farm paused. Resume to cook, buy or change prices. Deliveries and batches wait safely.</p>' : ""}${pages[tab](s)}${upgrades(s)}${accounts(s)}</div>`;
  }

  function bind(host) {
    host.querySelectorAll("[data-cooking-tab], [data-cooking-go]").forEach(button => button.onclick = () => { tab = button.dataset.cookingTab ?? button.dataset.cookingGo; cancelStation = null; ui.draw(); });
    host.querySelectorAll("[data-cooking-disclosure]").forEach(detail => detail.addEventListener("toggle", () => { disclosures[detail.dataset.cookingDisclosure] = detail.open; }));
    host.querySelector("[data-cooking-station]")?.addEventListener("change", event => { station = event.target.value === "home" && K.homeCookingAvailable(ui.state) ? "home" : "truck"; ui.draw(); });
    host.querySelectorAll("[data-cooking-quantity-step]").forEach(button => button.onclick = () => { const id = button.dataset.cookingQuantityStep; cart[id] = Math.max(0, Math.min(C.COOKING.orderLimit, qty(id) + Number(button.dataset.step))); ui.draw(); });
    host.querySelectorAll("[data-cooking-order-quantity]").forEach(input => input.addEventListener("change", () => { cart[input.dataset.cookingOrderQuantity] = Math.min(C.COOKING.orderLimit, count(input.value)); ui.draw(); }));
    host.querySelectorAll("[data-cooking-start]").forEach(button => button.onclick = () => { if (K.startCooking(ui.state, button.dataset.cookingStart, button.dataset.cookingAt)) changed("A fresh batch is cooking."); });
    host.querySelectorAll("[data-cooking-research]").forEach(button => button.onclick = () => { if (K.researchRecipe(ui.state, button.dataset.cookingResearch)) changed("A new recipe for your kitchen."); });
    host.querySelectorAll("[data-cooking-cancel]").forEach(button => button.onclick = () => { cancelStation = button.dataset.cookingCancel; ui.draw(); });
    host.querySelector("[data-cooking-cancel-dismiss]")?.addEventListener("click", () => { cancelStation = null; ui.draw(); });
    host.querySelectorAll("[data-cooking-cancel-confirm]").forEach(button => button.onclick = () => { if (K.cancelCooking(ui.state, button.dataset.cookingCancelConfirm)) { cancelStation = null; changed("Batch discarded. Ingredients were not refunded."); } });
    host.querySelectorAll("[data-cooking-order-cancel]").forEach(button => button.onclick = () => { if (K.cancelIngredientOrder(ui.state, Number(button.dataset.cookingOrderCancel))) changed("Ingredients refunded. Delivery fee retained."); });
    host.querySelectorAll("[data-cooking-display]").forEach(select => select.addEventListener("change", () => { if (K.assignFoodDisplay(ui.state, Number(select.dataset.cookingDisplay), select.value || null)) changed(); else ui.draw(); }));
    host.querySelectorAll("[data-cooking-price]").forEach(select => select.addEventListener("change", () => { if (K.setFoodPrice(ui.state, select.dataset.cookingPrice, Number(select.value))) changed(); else ui.draw(); }));
    host.querySelectorAll("[data-cooking-upgrade]").forEach(button => button.onclick = () => { if (K.buyKitchenUpgrade(ui.state, button.dataset.cookingUpgrade)) changed(button.dataset.cookingUpgrade === "chef" ? "Your spooky chef is ready. Choose a recipe below." : "The kitchen has a little more room to grow."); });
    host.querySelector("[data-cooking-chef]")?.addEventListener("change", event => { if (K.setChefRecipe(ui.state, event.target.value || null)) changed(); else ui.draw(); });
    host.querySelectorAll("[data-cooking-action]").forEach(button => button.onclick = () => {
      const action = button.dataset.cookingAction;
      if (action === "visit") return visit();
      if (action === "home") return ui.enterKitchen?.();
      if (action === "purchase" && K.buyFoodTruck(ui.state)) return changed("The Midnight Kitchen is yours. Order ingredients to begin.");
      if (action === "order" && K.placeIngredientOrder(ui.state, cart)) { cart = {}; changed("Order paid. Your ingredient cart will arrive at the receiving bay."); }
    });
  }

  return { cooking: { eyebrow: "From pumpkin patch to kitchen", title: "The Midnight Kitchen", setTab(value) { tab = tabs.some(([id]) => id === value) ? value : "recipes"; }, setStation(value) { station = value === "home" && K.homeCookingAvailable(ui.state) ? "home" : "truck"; }, body, bind } };
}
