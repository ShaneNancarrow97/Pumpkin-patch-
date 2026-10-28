import { SERVICE_OUT, SERVICE_BACK, SERVICE_RIGHT, serviceNav, serviceHeading, serviceMetrics, serviceNotice } from "./service-kit.js";
import { recipeShoppingList, kitchenNextStep } from "./kitchen-guide.js";
import { maisieIcon } from "../maisie.js";
import { patchLevel } from "../rules/levels.js";
import { VARIETIES } from "../rules/farm.js";
import { available } from "../rules/stock.js";
import { availableFood } from "../rules/cooking-sales.js";
import * as C from "../content/cooking.js";
import * as K from "../rules/cooking.js";
import * as E from "../rules/kitchen-equipment.js";
import * as X from "../rules/cooking-mix.js";
import { KITCHEN_EQUIPMENT, KITCHEN_CAPABILITY_NAMES } from "../content/kitchen-equipment.js";
import { money, segmented } from "./kit.js";
import { cookingIcon } from "./cooking-icons.js";
import { ingredientIcon } from "./kitchen-food-art.js";

const count = n => Math.max(0, Math.floor(Number(n) || 0));
const disabled = ok => ok ? "" : "disabled";
const seconds = n => `${Math.max(0, Math.ceil(Number(n) || 0))}s`;
const phaseNames = { ordered: "Packing your order", travelling: "Cart on its way", unloading: "At the receiving bay" };
const tabs = [["cook", "Cook"], ["supplies", "Supplies"], ["food", "Sell"], ["improve", "Upgrade"]];
const groupFor = tab => ({recipes:"cook",mix:"cook",deliveries:"supplies",pantry:"supplies",equipment:"improve",upgrades:"improve"})[tab]??tab;

// One management surface for the truck, home cooker and shop shelves. Quantities,
// tabs and confirmations belong to this view; money and timers belong to rules.
export function cookingSheets(ui) {
  let tab = "recipes", selectedRecipe = undefined, discoverOpen = false, station = "truck", cart = {}, cancelStation = null, batches = "1";
  let mixIngredients = {}, mixPumpkins = {}, mixMethod = "pan", mixAdd = "vegetables";
  const disclosures = { upgrades: false, accounts: false };
  const changed = (message = "") => {
    ui.save(); ui.scene.refreshCooking?.(); ui.tone?.(700); ui.draw();
    if (message) ui.notice?.(message);
  };
  const editable = () => !ui.state.paused;
  const visit = () => { ui.closeSheet(); ui.leavePlace?.(); ui.scene.focusCooking?.(); };
  const known = (s, id) => s.kitchen.recipes.includes(id);
  const recipeName = id => C.RECIPES.find(r => r.id === id)?.name ?? "Recipe";
  const qty = id => count(cart[id]);
  const capabilityName = id => KITCHEN_CAPABILITY_NAMES[id] ?? id;
  const homeOpen = () => E.homeKitchenOpen(ui.state);
  const atHome = () => ui.scene.place?.kind === "room" && ui.scene.place.id === "kitchen";
  const ensureHome = () => station !== "home" || atHome() || ui.enterKitchen?.({ tab, noOpen: true }) === true;
  const batchCount = (s, id) => batches === "max" ? Math.max(1, K.maxCookingBatches(s, id, station)) : Number(batches);
  const pendingOutput = s => Object.values(s.kitchen.jobs).reduce((n, job) => n + (job ? Math.max(0, count(job.batches || 1) - count(job.completed)) * (C.RECIPE_BY_ID[job.recipe]?.yield ?? 0) : 0), 0);
  function batchControl() {
    return `<label class="cooking-field cooking-batch-choice">Production run<select data-cooking-batches aria-label="Batches to cook" ${disabled(editable())}>${[["1", "1 batch"], ["5", "5 batches"], ["10", "10 batches"], ["max", "Maximum possible"]].map(([value, title]) => `<option value="${value}" ${batches === value ? "selected" : ""}>${title}</option>`).join("")}</select></label>`;
  }
  function requirements(s, recipe, where = station) {
    const r = E.equipmentRequirements(s, recipe, where);
    return `<div class="cooking-requirements" aria-label="Equipment requirements">${r.required.map(id => `<span class="cooking-requirement ${r.present.includes(id) ? "is-present" : "is-missing"}"><i aria-hidden="true"></i>${capabilityName(id)}${r.present.includes(id) ? "" : " · Needed"}</span>`).join("")}</div>`;
  }

  function locked(s) {
    const level = patchLevel(s).level, canBuy = editable() && K.kitchenUnlocked(s) && s.coins >= C.COOKING.price;
    const reason = level < C.COOKING.level ? `Purchase unlocks at patch level ${C.COOKING.level}. Your current level is ${level}.`
      : !editable() ? "Resume the farm to purchase." : s.coins < C.COOKING.price ? `Save ${money(C.COOKING.price - s.coins)} more to open the kitchen.`
      : "Buy the truck when you’re ready. Reaching level 5 does not spend your coins.";
    return `<div class="cooking-sheet" data-cooking-state="locked"><article class="cooking-welcome${canBuy ? " purchase-available" : ""}">${maisieIcon()}<div><p class="cooking-kicker">A new little business</p><h3>The Midnight Kitchen</h3><p>Order ingredients, cook pumpkin treats and fill the shelves in Skyla’s shop.</p></div><button class="button purchase-button wide" data-cooking-action="purchase" ${disabled(canBuy)}>Buy the food truck · ${money(C.COOKING.price)}</button></article><p class="cooking-note" data-cooking-gate>${reason}</p><div class="cooking-quote"><h4>From the farm to the counter</h4><p class="cooking-note">A starter hob and roasted-pumpkin recipe are included. Ingredients arrive by cart after ${seconds(C.COOKING.deliverySeconds)} of game time. Each order has a ${money(C.COOKING.deliveryFee)} delivery fee.</p><p class="cooking-note">The truck works before your home kitchen is built. Cooking uses real ingredients and pumpkins; visitors buy food with the money they have left.</p></div></div>`;
  }

  function capacity(label, used, max) {
    return `<div class="cooking-capacity"><div><span>${label}</span><b>${count(used)} / ${count(max)}</b></div><meter min="0" max="${Math.max(1, max)}" value="${used}" aria-label="${label}: ${count(used)} of ${count(max)}"></meter></div>`;
  }

  function stations(s) {
    const home = E.homeCookingAvailable(s), open = E.homeKitchenOpen(s), showHome = open || !!s.kitchen.jobs.home;
    if (station === "home" && !open) station = "truck";
    const stationMarkup = [station].map(id => {
      const job = s.kitchen.jobs[id], title = id === "home" ? "Home cooker" : "Truck hob";
      if (!job) return ``; // Idle cookers need no card.

      const waiting = job.remaining <= 0, recipe = C.RECIPES.find(r => r.id === job.recipe);
      const runBatches = Math.max(1, count(job.batches || 1)), completed = Math.min(runBatches, count(job.completed));
      const duration = Math.max(1, job.duration ?? recipe?.seconds ?? 1), progress = Math.max(0, Math.min(1, (completed + 1 - job.remaining / duration) / runBatches));
      const runRemaining = Math.max(0, runBatches - completed - 1) * duration + job.remaining;
      return `<article class="cooking-station is-busy" data-cooking-job="${id}"><div class="cooking-station-head"><div><h4>${title} · ${recipeName(job.recipe)}</h4><p class="${waiting ? "cooking-note is-warning" : ""}">${waiting ? "Ready — make space in food storage to finish." : `${completed}/${runBatches} batches ready · ${seconds(runRemaining)} left${job.automatic ? " · Chef" : ""}`}</p></div>${cancelStation !== id ? `<button class="button" data-cooking-cancel="${id}" ${disabled(editable())}>Stop</button>` : ""}</div><progress max="1" value="${progress}" aria-label="${title} cooking progress"></progress>${id === "home" && !home ? '<p class="cooking-note">This paid run will finish safely. Replace the kitchen equipment to start another.</p>' : ""}${cancelStation === id ? `<p class="cooking-note is-warning">Stopping discards every unfinished batch. Ingredients and pumpkins for the full run were used when it started and are not refunded.</p><div class="cooking-cancel-confirm"><button class="button" data-cooking-cancel-dismiss>Keep cooking</button><button class="button is-destructive" data-cooking-cancel-confirm="${id}" ${disabled(editable())}>Discard run</button></div>` : ""}</article>`;
    }).join("");
    return `<section class="cooking-section cooking-worktop" aria-label="Cooking station"><div class="cooking-run-controls"><label class="cooking-field">Cook at<select data-cooking-station aria-label="Cooking station" ${disabled(editable())}><option value="truck" ${station === "truck" ? "selected" : ""}>Maisie’s truck</option><option value="home" ${station === "home" ? "selected" : ""} ${disabled(open)}>Home kitchen${open ? "" : " · House level 2"}</option></select></label>${batchControl()}</div>${stationMarkup}${pendingOutput(s)?`<p class="cooking-note">${pendingOutput(s)} portions reserved for batches in progress.</p>`:""}</section>`;
  }

  function inputs(s, recipe, run = 1) {
    const supplies = Object.entries(recipe.ingredients ?? {}).map(([id, n]) => {
      const name = C.INGREDIENTS.find(i => i.id === id)?.name ?? id;
      return `<span class="cooking-input ${count(s.kitchen.pantry[id]) < n * run ? "is-short" : ""}">${ingredientIcon(id, 20)}<span>${n * run} ${name.toLowerCase()}</span></span>`;
    });
    for (const [index, n] of Object.entries(recipe.pumpkins ?? {})) {
      supplies.push(`<span class="cooking-input ${available(s, Number(index)) < n * run ? "is-short" : ""}">${ingredientIcon(`pumpkin:${index}`, 20)}<span>${n * run} ${(VARIETIES[Number(index)]?.name ?? "pumpkin").toLowerCase()} pumpkin${n * run === 1 ? "" : "s"}</span></span>`);
    }
    return supplies.join(" · ");
  }

  function recipeCard(s,recipe,expanded=false) {
    const run=batchCount(s,recipe.id), learned=known(s,recipe.id), gated=patchLevel(s).level<recipe.level;
    const ready=learned?K.cookingReadiness(s,recipe.id,station,run):null, price=recipe.research??0;
    const shopping=recipeShoppingList(s,recipe,run), incoming=Object.entries(recipe.ingredients).some(([id,n])=>count(s.kitchen.pantry[id])<n*run);
    const supplyAction=ready?.missingEquipment.length?`<button class="button" data-cooking-go="${station==='home'?'equipment':'upgrades'}">Get cookware</button>`:shopping.quantity?`<button class="button" data-recipe-order="${recipe.id}">Order missing ingredients</button>`:`<button class="button" data-cooking-go="${incoming?'deliveries':'pantry'}">${incoming?'View deliveries':'View pantry'}</button>`;
    return `<article class="recipe-entry${expanded?' is-selected':''}" data-cooking-recipe="${recipe.id}"><button class="recipe-choice" data-recipe-select="${recipe.id}" aria-expanded="${expanded}" aria-controls="recipe-${recipe.id}">${cookingIcon(recipe.id)}<span><b>${recipe.name}</b><small>${recipe.yield} portions · ${seconds(recipe.seconds)}${recipe.homeOnly?' · Home kitchen':''}</small><em class="${learned?'recipe-learned':''}">${learned?(ready.ok?'Ready to cook':ready.reason):gated?`Level ${recipe.level}`:'Discover or study'}</em></span><i aria-hidden="true">${expanded?'−':'+'}</i></button>${expanded?`<div class="recipe-detail" id="recipe-${recipe.id}">${learned?`<button class="button purchase-button wide" data-cooking-start="${recipe.id}" data-cooking-at="${station}" ${disabled(editable()&&ready.ok)}>Cook ${recipe.yield*run} portions</button>`:`<button class="button purchase-button wide" data-cooking-research="${recipe.id}" ${disabled(editable()&&!gated&&s.coins>=price)}>Study recipe · ${money(price)}</button>`}<p>${recipe.text}</p><div class="cooking-inputs">${inputs(s,recipe,run)}</div>${requirements(s,recipe)}<div class="recipe-yield"><span>${recipe.yield*run} portions</span><span>${seconds(recipe.seconds*Math.pow(.85,s.kitchen.upgrades.speed)*run)} total</span><span>${money(s.kitchen.prices[recipe.id])} each</span></div><div class="recipe-help-actions">${recipe.homeOnly&&station!=='home'?`<button class="button" data-cooking-action="home">Go to home kitchen</button>`:supplyAction}<button class="button" data-cooking-fill-mix="${recipe.id}" ${disabled(!gated)}>Mix these ingredients</button></div></div>`:''}</article>`;
  }
  function recipes(s) {
    const level=patchLevel(s).level, learned=C.RECIPES.filter(r=>known(s,r.id)), discover=C.RECIPES.filter(r=>!known(s,r.id)&&r.level<=level), future=C.RECIPES.filter(r=>r.level>level&&!known(s,r.id));
    if(selectedRecipe===undefined&&learned.length)selectedRecipe=learned[0].id;
    return `${stations(s)}${nextStep(s)}<section class="cooking-section"><div class="service-section-heading"><h3>Recipe book</h3><button class="service-inline-link" data-cooking-go="mix">Mix ingredients ${SERVICE_OUT}</button></div><div class="recipe-book">${learned.map(r=>recipeCard(s,r,selectedRecipe===r.id)).join('')}</div>${discover.length?`<details class="service-disclosure" data-recipe-discovery ${discoverOpen?'open':''}><summary>Discover more dishes <span>${discover.length} recipes</span></summary><p class="cooking-note">Try the ingredients in your pot, or study a recipe to learn it.</p><div class="recipe-book">${discover.map(r=>recipeCard(s,r,selectedRecipe===r.id)).join('')}</div></details>`:''}${future.length?`<details class="service-disclosure"><summary>Coming next <span>${future.length} recipes</span></summary><div class="recipe-future">${future.map(r=>`<div>${cookingIcon(r.id)}<span><b>${r.name}</b><small>Unlocks at level ${r.level}</small></span></div>`).join('')}</div></details>`:''}</section>`;
  }

  function nextStep(s){
    if(selectedRecipe&&!known(s,selectedRecipe))return "";
    const step=kitchenNextStep(s,station,selectedRecipe),recipe=C.RECIPE_BY_ID[step.recipe];
    const action=(text,attrs)=>`<button class="service-inline-link" ${attrs}>${text} <span aria-hidden="true">${SERVICE_RIGHT}</span></button>`;
    if(step.kind==='supplies')return serviceNotice('Ingredients needed',recipe.name,action('Order supplies',`data-recipe-order="${recipe.id}"`));
    if(step.kind==='delivery')return serviceNotice('Delivery on its way','Supplies for your next dish',action('View delivery','data-cooking-go="deliveries"'));
    if(step.kind==='equipment')return serviceNotice('Cookware needed','Place tools in your home kitchen',action('Choose equipment','data-cooking-go="equipment"'));
    if(step.kind==='harvest')return serviceNotice('Fresh from the patch',`Harvest ${step.quantity} ${VARIETIES[step.variety].name} pumpkin${step.quantity===1?'':'s'} to cook your next dish.`,action('Go to the patch','data-cooking-action="farm"'));
    if(step.kind==='sell')return serviceNotice('Food ready to sell','Put your fresh dishes on Skyla’s shelves and choose a price.',action('Stock the shelves','data-cooking-go="food"'));
    if(step.kind==='shop')return serviceNotice('Food ready for your shop','Open Skyla’s indoor shop when you’re ready to sell dishes.',action('Manage Skyla’s shop','data-cooking-action="shop"'));
    return '';
  }

  function equipment(s) {
    const present = E.kitchenEquipment(s, "home"), open = E.homeKitchenOpen(s);
    return `<section class="cooking-section"><div class="cooking-title-row"><h3>Kitchen equipment</h3>${open && !atHome() ? '<button class="button" data-cooking-action="home-equipment">Enter kitchen</button>' : ""}</div><p class="cooking-note">Dishes use the tools you place in the actual kitchen. Equipment in storage or another room does not count. Spices, meat and vegetables still come from your pantry.</p>${!open ? '<p class="cooking-note is-warning">Expand the house to level 2 to open its kitchen.</p>' : ""}<div class="cooking-requirements" aria-label="Installed kitchen equipment">${Object.entries(KITCHEN_CAPABILITY_NAMES).map(([id, name]) => `<span class="cooking-requirement ${present.includes(id) ? "is-present" : "is-missing"}"><i aria-hidden="true"></i>${name}${present.includes(id) ? " · Ready" : " · Missing"}</span>`).join("")}</div><div class="cooking-list">${KITCHEN_EQUIPMENT.map(item => {
      const placed = s.house.placed.find(p => p.id === item.id && p.room === "kitchen"), owned = s.house.owned.includes(item.id);
      return `<article class="cooking-equipment" data-cooking-equipment-card="${item.id}">${cookingIcon(item.id)}<div><h4>${item.name}</h4><p>${item.description}</p><small>${item.grants.map(capabilityName).join(" · ")}${placed ? " · Placed in kitchen" : owned ? " · Owned, not in kitchen" : ""}</small></div><button class="button${!placed ? " purchase-button" : ""}" data-cooking-equipment="${item.id}" ${disabled(editable() && open && !placed && (owned || s.coins >= item.price))}>${placed ? "Placed" : owned ? "Place in kitchen" : `Buy & place · ${money(item.price)}`}</button></article>`;
    }).join("")}</div><p class="cooking-note">If the kitchen has no clear spot, a purchased item stays safely in storage. Use Decorate to move, turn or place it. Existing copper ranges, pan rails, utensil racks and spice cabinets can provide these tools too.</p><button class="button wide" data-cooking-action="furnish">Arrange kitchen furniture</button></section>`;
  }

  const mixItems = () => [...Object.entries(mixIngredients).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n, name: C.INGREDIENT_BY_ID[id]?.name ?? id })), ...Object.entries(mixPumpkins).filter(([, n]) => n > 0).map(([id, n]) => ({ id: `pumpkin:${id}`, n, name: `${VARIETIES[id]?.name ?? "Pumpkin"} pumpkin` }))];
  function mixSelection(s) {
    const selection = { ingredients: { ...mixIngredients }, pumpkins: { ...mixPumpkins }, method: mixMethod, station, batches: 1 };
    selection.batches = batches === "max" ? Math.max(1, X.maxCookingMixBatches(s, selection)) : Number(batches);
    return selection;
  }
  function setMixQuantity(id, n) {
    const source = id.startsWith("pumpkin:") ? mixPumpkins : mixIngredients, key = id.replace("pumpkin:", "");
    const adding = !source[key] && n > 0;
    if (adding && mixItems().length >= 5) { ui.notice?.("Choose up to five ingredient types."); return; }
    if (n > 0) source[key] = Math.max(1, Math.min(9, count(n))); else delete source[key];
  }
  function mix(s) {
    const selection = mixSelection(s), preview = X.previewCookingMix(s, selection), recipe = C.RECIPE_BY_ID[preview.recipe], items = mixItems();
    const options = [...C.INGREDIENTS.map(item => ({ id: item.id, name: item.name, stock: count(s.kitchen.pantry[item.id]) })), ...VARIETIES.map((item, id) => ({ id: `pumpkin:${id}`, name: `${item.name} pumpkin`, stock: available(s, id) }))];
    if (!options.some(item => item.id === mixAdd && !items.some(i => i.id === item.id))) mixAdd = options.find(item => !items.some(i => i.id === item.id))?.id ?? "";
    return `${stations(s)}<section class="cooking-section"><div class="cooking-title-row"><h3>Try a little kitchen magic</h3><span class="cooking-state">${items.length}/5 ingredients</span></div><p class="cooking-note">Choose ingredient amounts for one batch, then fry, simmer or bake. Discoveries join your recipe book when the first batch finishes. An unmatched mix uses nothing.</p><div class="cooking-mix-add"><label class="cooking-field">Add an ingredient<select data-cooking-mix-add aria-label="Ingredient to add" ${disabled(editable() && items.length < 5)}>${options.filter(item => !items.some(i => i.id === item.id)).map(item => `<option value="${item.id}" ${mixAdd === item.id ? "selected" : ""}>${item.name} · ${item.stock} available</option>`).join("")}</select></label><button class="button" data-cooking-mix-add-button ${disabled(editable() && items.length < 5 && !!mixAdd)}>Add</button></div><div class="cooking-mix-bowl">${items.length ? items.map(item => `<div class="cooking-order-item"><div><h4 class="cooking-ingredient-name">${ingredientIcon(item.id, 28)}<span>${item.name}</span></h4><small>${item.n * selection.batches} needed for this run</small></div><div class="cooking-stepper"><button class="button" data-cooking-mix-step="${item.id}" data-step="-1" aria-label="Use one less ${item.name.toLowerCase()}" ${disabled(editable())}>−</button><input type="number" min="0" max="9" inputmode="numeric" value="${item.n}" data-cooking-mix-quantity="${item.id}" aria-label="${item.name} per batch" ${disabled(editable())}><button class="button" data-cooking-mix-step="${item.id}" data-step="1" aria-label="Use one more ${item.name.toLowerCase()}" ${disabled(editable() && item.n < 9)}>+</button></div></div>`).join("") : '<p class="cooking-empty">Your mixing bowl is empty. Add ingredients above, or use a recipe from your book.</p>'}</div><label class="cooking-field">Cooking method<select data-cooking-mix-method aria-label="Cooking method" ${disabled(editable())}>${[["pan", "Fry in a pan"], ["simmer", "Simmer in a pot"], ["bake", "Bake in an oven"]].map(([id, name]) => `<option value="${id}" ${mixMethod === id ? "selected" : ""}>${name}</option>`).join("")}</select></label><article class="cooking-mix-preview" data-cooking-mix-preview>${recipe ? cookingIcon(recipe.id) : cookingIcon(mixMethod === "bake" ? "oven" : mixMethod === "simmer" ? "pot" : "pan")}<div><h4>${recipe ? `${preview.known ? "" : "New discovery · "}${recipe.name}` : "What will you make?"}</h4><p class="cooking-note${preview.ok ? "" : " is-warning"}" data-cooking-mix-reason>${preview.ok ? `${recipe.yield * selection.batches} portions · ${selection.batches} ${selection.batches === 1 ? "batch" : "batches"} · ${seconds(preview.seconds)} total` : preview.reason}</p>${recipe ? requirements(s, recipe) : ""}</div><button class="button purchase-button wide" data-cooking-mix-start ${disabled(editable() && preview.ok)}>${preview.known ? "Cook" : "Discover & cook"}${recipe ? ` ${recipe.yield * selection.batches} portions` : ""}</button></article><div class="cooking-mix-footer"><button class="button" data-cooking-mix-clear ${disabled(items.length > 0)}>Clear bowl</button><button class="button" data-cooking-go="equipment">Check equipment</button></div><p class="cooking-note">All ingredients for the full production run are used when you start. Finished batches enter food stock one at a time; stopping discards the unfinished batches without a refund.</p></section>`;
  }

  function deliveries(s) {
    const quote = K.quoteIngredientOrder(s, cart), k = s.kitchen;
    const countOrdered = Object.values(cart).reduce((n, amount) => n + count(amount), 0);
    return `<section class="cooking-section"><div class="cooking-title-row"><h3>Ingredient deliveries</h3>${cookingIcon("cart")}</div><p class="cooking-note">Ingredients arrive at the receiving bay after ${seconds(C.COOKING.deliverySeconds)} of game time. A second order waits for the first. Pausing the farm pauses deliveries.</p>${k.orders.length ? k.orders.map((order, index) => {
      const waiting = order.phase === "unloading" && order.remaining <= 0;
      return `<article class="cooking-delivery" data-cooking-order="${order.id}"><div class="cooking-title-row"><div><h4>${index > 0 && order.phase === "ordered" ? "Queued for packing" : phaseNames[order.phase] ?? "Delivery"}</h4><small>${waiting ? "Pantry full — your paid parcel is safe at the bay." : `${seconds(order.remaining)} ${order.phase === "ordered" ? "until departure" : order.phase === "travelling" ? "until arrival" : "to unload"}`}</small></div>${order.phase === "ordered" ? `<button class="button" data-cooking-order-cancel="${order.id}" ${disabled(editable())}>Cancel</button>` : ""}</div><p>${Object.entries(order.items).map(([id, n]) => `${n} ${C.INGREDIENTS.find(i => i.id === id)?.name.toLowerCase() ?? id}`).join(" · ")}</p>${order.phase === "ordered" ? '<small>Cancel before departure to refund the ingredients. Delivery fee is retained.</small>' : ""}</article>`;
    }).join("") : '<p class="cooking-empty">No deliveries are on the road. Build an order below.</p>'}${capacity("Pantry", K.pantryCount(s), K.pantryCapacity(s))}<div class="cooking-list">${C.INGREDIENTS.map(item => `<div class="cooking-order-item"><div><h4 class="cooking-ingredient-name">${ingredientIcon(item.id, 28)}<span>${item.name}</span></h4><small>${money(item.price)} each · ${count(k.pantry[item.id])} in pantry</small></div><div class="cooking-stepper"><button class="button" data-cooking-quantity-step="${item.id}" data-step="-1" aria-label="Remove one ${item.name.toLowerCase()}" ${disabled(editable() && qty(item.id) > 0)}>−</button><input type="number" inputmode="numeric" min="0" max="${C.COOKING.orderLimit}" value="${qty(item.id)}" data-cooking-order-quantity="${item.id}" aria-label="${item.name} order quantity" ${disabled(editable())}><button class="button" data-cooking-quantity-step="${item.id}" data-step="1" aria-label="Add one ${item.name.toLowerCase()}" ${disabled(editable() && countOrdered < C.COOKING.orderLimit)}>+</button></div></div>`).join("")}</div><div class="cooking-quote service-checkout"><dl><div><dt>${countOrdered} ingredients</dt><dd>${money(quote.subtotal ?? 0)}</dd></div><div><dt>Delivery fee</dt><dd>${money(quote.fee ?? C.COOKING.deliveryFee)}</dd></div><div class="cooking-total"><dt>Pay now</dt><dd>${money(quote.total ?? 0)}</dd></div></dl><button class="button purchase-button wide" data-cooking-action="order" ${disabled(editable() && quote.ok)}>Place order · ${money(quote.total ?? 0)}</button>${!quote.ok ? `<p class="cooking-note" data-cooking-quote-reason>${quote.reason}</p>` : '<p class="cooking-note">Paid parcels wait safely if the pantry fills up. Delivery never discards your ingredients.</p>'}</div></section>`;
  }

  function pantry(s) {
    return `<section class="cooking-section"><div class="cooking-title-row"><h3>Your shared pantry</h3>${cookingIcon("pantry")}</div>${capacity("Ingredients stored", K.pantryCount(s), K.pantryCapacity(s))}<div class="cooking-pantry">${C.INGREDIENTS.map(item => `<div><span class="cooking-ingredient-name">${ingredientIcon(item.id, 24)}<span>${item.name}</span></span><b>${count(s.kitchen.pantry[item.id])}</b></div>`).join("")}</div><p class="cooking-note">Truck and home use the same ingredients. Pumpkin recipes use your harvested farm stock, leaving reserved customer baskets untouched.</p><div class="cooking-pantry">${VARIETIES.map((variety, i) => `<div><span class="cooking-ingredient-name">${ingredientIcon(`pumpkin:${i}`, 24)}<span>${variety.name} pumpkins</span></span><b>${Math.max(0, count(available(s, i)))}</b></div>`).join("")}</div><button class="button wide" data-cooking-go="deliveries">Order ingredients</button></section>`;
  }

  function food(s) {
    const k = s.kitchen;
    return `<section class="cooking-section"><h3>Food shelves at Skyla’s</h3><p class="cooking-note">Choose two recipes for the shop’s wall displays. Hungry customers use the money left after their pumpkin basket. Carrier bags let the hungriest guests take up to three portions. A higher price can mean fewer sales.</p>${!s.shop.unlocked ? '<p class="cooking-note is-warning">Open Skyla’s indoor shop to begin food sales. Your cooked food stays in storage until then.</p>' : ""}${capacity("Finished food", K.foodCount(s), K.foodCapacity(s))}${[0, 1].map(slot => `<label class="cooking-field cooking-shelf">Wall display ${slot + 1}<select data-cooking-display="${slot}" aria-label="Food wall display ${slot + 1}" ${disabled(editable())}><option value="">Empty shelf</option>${C.RECIPES.filter(recipe => known(s, recipe.id)).map(recipe => `<option value="${recipe.id}" ${k.displays[slot] === recipe.id ? "selected" : ""}>${recipe.name} · ${availableFood(s, recipe.id)} available</option>`).join("")}</select></label>`).join("")}<div class="cooking-list">${C.RECIPES.filter(recipe => known(s, recipe.id)).map(recipe => {
      const range = K.foodPriceRange(s, recipe.id), price = k.prices[recipe.id] ?? recipe.price, ready = availableFood(s, recipe.id), reserved = Math.max(0, count(k.food[recipe.id]) - ready);
      return `<article class="cooking-food-row">${cookingIcon(recipe.id)}<div><h4>${recipe.name}</h4><small>${ready} available${reserved ? ` · ${reserved} reserved` : ""}${k.displays.includes(recipe.id) ? " · On display" : ""}</small></div><label class="cooking-field"><span class="sr-only">${recipe.name} selling price</span><select data-cooking-price="${recipe.id}" aria-label="${recipe.name} selling price" ${disabled(editable())}>${Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i).map(value => `<option value="${value}" ${price === value ? "selected" : ""}>${money(value)}</option>`).join("")}</select></label></article>`;
    }).join("")}</div><p class="cooking-note">Low prices may not cover ingredients, delivery fees and pumpkins used. Queued customers keep their quoted price. Food takings are tracked separately.</p></section>`;
  }

  function upgrades(s) {
    const k = s.kitchen, level = patchLevel(s).level, chef = count(k.upgrades.chef) > 0;
    return `<details class="cooking-disclosure" data-cooking-disclosure="upgrades" ${disclosures.upgrades ? "open" : ""}><summary><span>Truck improvements<small>Storage, speed & your spooky chef</small></span></summary><div class="cooking-disclosure-body">${C.KITCHEN_UPGRADES.map(item => {
      const tier = count(k.upgrades[item.id]), cost = K.kitchenUpgradeCost(s, item.id), maxed = cost === undefined || cost === null;
      const gate = level < item.level;
      return `<article class="cooking-upgrade"><div><h4>${item.name}</h4><p>${item.text}</p><small>${maxed ? "Fully upgraded" : gate ? `Opens at patch level ${item.level}` : `Tier ${tier}/${item.costs.length}`}</small></div><button class="button${!gate && !maxed ? " purchase-button" : ""}" data-cooking-upgrade="${item.id}" ${disabled(editable() && !gate && !maxed && s.coins >= cost)}>${maxed ? "Complete" : gate ? `Level ${item.level}` : money(cost)}</button></article>`;
    }).join("")}${chef ? `<label class="cooking-field">Chef’s recipe<select data-cooking-chef aria-label="Spooky chef recipe" ${disabled(editable())}><option value="">Rest between batches</option>${C.RECIPES.filter(recipe => known(s, recipe.id) && !recipe.homeOnly).map(recipe => `<option value="${recipe.id}" ${k.chefRecipe === recipe.id ? "selected" : ""}>${recipe.name}</option>`).join("")}</select></label><div class="cooking-chef-note">${cookingIcon("ghost-chef")}<p class="cooking-note">The chef uses the truck hob and real ingredients. Batches pause when inputs or storage space run out. The chef never orders supplies or spends coins automatically.</p></div>` : `<div class="cooking-chef-note">${cookingIcon("ghost-chef")}<p class="cooking-note">The spooky chef becomes available to hire at patch level 10. Recipes must be researched before the chef can make them.</p></div>`}</div></details>`;
  }

  function accounts(s) {
    const l = s.kitchen.ledger;
    return `<details class="cooking-disclosure" data-cooking-disclosure="accounts" ${disclosures.accounts ? "open" : ""}><summary><span>Kitchen accounts<small>${count(l.foodSold)} portions sold</small></span><b>${money(l.foodIncome)}</b></summary><dl class="cooking-accounts"><div><dt>Food takings</dt><dd>${money(l.foodIncome)}</dd></div><div><dt>Ingredients & deliveries</dt><dd>${money((l.ingredientSpend ?? 0) + (l.deliveryFees ?? 0))}</dd></div><div><dt>Recipe research</dt><dd>${money(l.researchSpend)}</dd></div><div><dt>Truck & improvements</dt><dd>${money(l.invested)}</dd></div></dl><p class="cooking-note">Food uses pumpkins you could otherwise sell. These accounts show cash spent and earned; they do not count that pumpkin value as a cash expense.</p></details>`;
  }

  function body() {
    const s=ui.state;if(!s.kitchen.purchased)return locked(s);
    const group=groupFor(tab), identity=tab==="food"?"Skyla’s food shelves":tab==="equipment"?"Home kitchen":station==="home"?"Home kitchen":"Maisie’s kitchen", pages={recipes,mix,equipment,deliveries,pantry,food,upgrades:s=>upgrades(s).replace(/<details[^>]*><summary>[\s\S]*?<\/summary>/,'').replace(/<\/details>$/,'')};
    const sub=group==='supplies'?serviceNav('cooking-tab','Ingredient supplies',[['deliveries','Order supplies'],['pantry','In your pantry']],tab):group==='improve'?serviceNav('cooking-tab','Kitchen upgrades',[['upgrades','Truck & chef'],['equipment','Home equipment']],tab):tab==='mix'?`<button class="service-inline-link" data-cooking-go="recipes">${SERVICE_BACK} Back to recipes</button>`:'';
    return `<div class="cooking-sheet service-sheet" data-cooking-state="owned" data-menu-view="cooking:${tab}"><header class="service-identity"><div>${station==='home'?cookingIcon('hob'):maisieIcon()}<span><b>${identity}</b><small>${K.foodCount(s)} portions · ${s.kitchen.orders.length} deliveries</small></span></div><button class="service-location" data-cooking-action="${tab==='food'?'viewshop':station==='home'?'home':'visit'}">${tab==='food'?'View shop':station==='home'?'View room':'View truck'} <span aria-hidden="true">${SERVICE_OUT}</span></button></header>${serviceNav('cooking-section','Kitchen management',tabs,group)}${s.paused?'<div class="service-paused"><span>Farm paused · deliveries and cooking wait.</span><button class="service-inline-link" data-cooking-action="resume">Resume</button></div>':''}${sub}${pages[tab](s)}${tab==='food'?accounts(s):''}</div>`;
  }

  function bind(host) {
    host.querySelectorAll('[data-cooking-section]').forEach(b=>b.onclick=()=>{tab=({cook:'recipes',supplies:'deliveries',food:'food',improve:station==='home'?'equipment':'upgrades'})[b.dataset.cookingSection];ui.draw();});
    host.querySelectorAll('[data-recipe-select]').forEach(b=>b.onclick=()=>{selectedRecipe=selectedRecipe===b.dataset.recipeSelect?null:b.dataset.recipeSelect;ui.draw();});
    host.querySelector('[data-recipe-discovery]')?.addEventListener('toggle',e=>{discoverOpen=e.currentTarget.open;});
    host.querySelectorAll('[data-recipe-order]').forEach(b=>b.onclick=()=>{const r=C.RECIPE_BY_ID[b.dataset.recipeOrder],list=recipeShoppingList(ui.state,r,batchCount(ui.state,r.id));cart={...list.items};tab='deliveries';ui.draw();if(list.partial)ui.notice?.('This cart holds 40 ingredients. Order the remaining supplies afterwards.');});
    const tabStrip = host.querySelector(".cooking-tabs"), currentTab = tabStrip?.querySelector("[aria-pressed=true]");
    if (tabStrip && currentTab) tabStrip.scrollLeft = Math.max(0, currentTab.offsetLeft - (tabStrip.clientWidth - currentTab.offsetWidth) / 2);
    host.querySelectorAll("[data-cooking-tab], [data-cooking-go]").forEach(button => button.onclick = () => { tab = button.dataset.cookingTab ?? button.dataset.cookingGo; cancelStation = null; ui.draw(); });
    host.querySelectorAll("[data-cooking-disclosure]").forEach(detail => detail.addEventListener("toggle", () => { disclosures[detail.dataset.cookingDisclosure] = detail.open; }));
    host.querySelector("[data-cooking-station]")?.addEventListener("change", event => { station = event.target.value === "home" && homeOpen() ? "home" : "truck"; ensureHome(); ui.draw(); });
    host.querySelectorAll("[data-cooking-batches]").forEach(select => select.addEventListener("change", event => { batches = ["1", "5", "10", "max"].includes(event.target.value) ? event.target.value : "1"; ui.draw(); }));
    host.querySelectorAll("[data-cooking-quantity-step]").forEach(button => button.onclick = () => { const id = button.dataset.cookingQuantityStep; cart[id] = Math.max(0, Math.min(C.COOKING.orderLimit, qty(id) + Number(button.dataset.step))); ui.draw(); });
    host.querySelectorAll("[data-cooking-order-quantity]").forEach(input => input.addEventListener("change", () => { cart[input.dataset.cookingOrderQuantity] = Math.min(C.COOKING.orderLimit, count(input.value)); ui.draw(); }));
    host.querySelectorAll("[data-cooking-start]").forEach(button => button.onclick = () => { if (!ensureHome()) return; const run = batchCount(ui.state, button.dataset.cookingStart); const job=K.startCooking(ui.state, button.dataset.cookingStart, button.dataset.cookingAt, false, run); if (job) { changed(`${run} ${run === 1 ? "batch is" : "batches are"} cooking, one at a time.`); ui.showCookingAnimation?.(job,button.dataset.cookingAt); } else ui.draw(); });
    host.querySelectorAll("[data-cooking-equipment]").forEach(button => button.onclick = () => { if (!atHome() && ui.enterKitchen?.({ tab: "equipment", noOpen: true }) !== true) return; const result = E.buyCookingEquipment(ui.state, button.dataset.cookingEquipment); if (!result) return ui.draw(); if (atHome()) ui.scene.refreshRoom?.(); changed(result.placed ? "Equipment placed in your kitchen." : "Purchased safely into storage. Make room and place it from Decorate."); });
    host.querySelectorAll("[data-cooking-fill-mix]").forEach(button => button.onclick = () => { const recipe = C.RECIPE_BY_ID[button.dataset.cookingFillMix]; if (!recipe) return; mixIngredients = { ...recipe.ingredients }; mixPumpkins = { ...recipe.pumpkins }; mixMethod = recipe.method; tab = "mix"; if (recipe.homeOnly && homeOpen()) { station = "home"; ensureHome(); } ui.draw(); });
    host.querySelector("[data-cooking-mix-add]")?.addEventListener("change", event => { mixAdd = event.target.value; });
    host.querySelector("[data-cooking-mix-add-button]")?.addEventListener("click", () => { if (editable() && mixAdd) { setMixQuantity(mixAdd, 1); ui.draw(); } });
    host.querySelectorAll("[data-cooking-mix-quantity]").forEach(input => input.addEventListener("change", () => { if (!editable()) return; setMixQuantity(input.dataset.cookingMixQuantity, count(input.value)); ui.draw(); }));
    host.querySelectorAll("[data-cooking-mix-step]").forEach(button => button.onclick = () => { if (!editable()) return; const id = button.dataset.cookingMixStep, current = mixItems().find(item => item.id === id)?.n ?? 0; setMixQuantity(id, current + Number(button.dataset.step)); ui.draw(); });
    host.querySelector("[data-cooking-mix-method]")?.addEventListener("change", event => { mixMethod = event.target.value; ui.draw(); });
    host.querySelector("[data-cooking-mix-clear]")?.addEventListener("click", () => { mixIngredients = {}; mixPumpkins = {}; ui.draw(); });
    host.querySelector("[data-cooking-mix-start]")?.addEventListener("click", () => { if (!ensureHome()) return; const job=X.startCookingMix(ui.state, mixSelection(ui.state)); if (job) { changed("Your ingredients are cooking. The first finished batch will reveal the recipe."); ui.showCookingAnimation?.(job,station); } else ui.draw(); });
    host.querySelectorAll("[data-cooking-research]").forEach(button => button.onclick = () => { if (K.researchRecipe(ui.state, button.dataset.cookingResearch)) changed("A new recipe for your kitchen."); });
    host.querySelectorAll("[data-cooking-cancel]").forEach(button => button.onclick = () => { cancelStation = button.dataset.cookingCancel; ui.draw(); });
    host.querySelector("[data-cooking-cancel-dismiss]")?.addEventListener("click", () => { cancelStation = null; ui.draw(); });
    host.querySelectorAll("[data-cooking-cancel-confirm]").forEach(button => button.onclick = () => { if (K.cancelCooking(ui.state, button.dataset.cookingCancelConfirm)) { cancelStation = null; changed("Batch discarded. Ingredients were not refunded."); } });
    host.querySelectorAll("[data-cooking-order-cancel]").forEach(button => button.onclick = () => { if (K.cancelIngredientOrder(ui.state, Number(button.dataset.cookingOrderCancel))) changed("Ingredients refunded. Delivery fee retained."); });
    host.querySelectorAll("[data-cooking-display]").forEach(select => select.addEventListener("change", () => { if (K.assignFoodDisplay(ui.state, Number(select.dataset.cookingDisplay), select.value || null)) changed(); else ui.draw(); }));
    host.querySelectorAll("[data-cooking-price]").forEach(select => select.addEventListener("change", () => { if (K.setFoodPrice(ui.state, select.dataset.cookingPrice, Number(select.value))) changed(); else ui.draw(); }));
    host.querySelectorAll("[data-cooking-upgrade]").forEach(button => button.onclick = () => { if (K.buyKitchenUpgrade(ui.state, button.dataset.cookingUpgrade)) changed(button.dataset.cookingUpgrade === "chef" ? "Your spooky chef is ready. Choose a recipe below." : "Kitchen improvement installed."); });
    host.querySelector("[data-cooking-chef]")?.addEventListener("change", event => { if (K.setChefRecipe(ui.state, event.target.value || null)) changed(); else ui.draw(); });
    host.querySelectorAll("[data-cooking-action]").forEach(button => button.onclick = () => {
      const action = button.dataset.cookingAction;
      if(action==='resume'){ui.state.paused=false;ui.save();ui.draw();return;}
      if(action==='farm'){ui.leavePlace?.();ui.closeSheet();return;}
      if(action==='shop')return ui.openShopSheet?.('shop');
      if(action==='viewshop'){ui.closeSheet();if(ui.state.shop.unlocked)ui.enterShop?.();else ui.openShopSheet?.('shop');return;}
      if (action === "visit") return visit();
      if (action === "home" || action === "home-equipment") return ui.enterKitchen?.({ tab: action === "home-equipment" ? "equipment" : tab });
      if (action === "furnish") { if (!ui.enterKitchen?.({ tab: "equipment", noOpen: true })) return; ui.closeSheet(); ui.openKitchenDecorate?.(); return; }
      if (action === "purchase" && K.buyFoodTruck(ui.state)) return changed("The Midnight Kitchen is yours. Order ingredients to begin.");
      if (action === "order" && K.placeIngredientOrder(ui.state, cart)) { cart = {}; changed("Order paid. Your ingredient cart will arrive at the receiving bay."); }
    });
  }

  return { cooking: { eyebrow: "From pumpkin patch to kitchen", title: () => "Kitchen & cooking", setTab(value) { tab = ["recipes","mix","equipment","deliveries","pantry","food","upgrades"].includes(value) ? value : "recipes"; }, setStation(value) { station = value === "home" && homeOpen() ? "home" : "truck"; }, body, bind } };
}
