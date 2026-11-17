import { expansionRewardOwned } from '../rules/village-expansion-benefits.js';
import { actExpansionEconomy } from '../rules/village-expansion-economy.js';
import { renderVillageExpansionEconomy, bindVillageExpansionEconomy } from './village-expansion-economy.js';
import { SERVICE_OUT, SERVICE_BACK, SERVICE_RIGHT, serviceNav, serviceTabs, serviceHeading, serviceMetrics, serviceNotice, priceStepper, stockMeter } from "./service-kit.js";
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
import { ingredientIcon, dishIcon } from "./kitchen-food-art.js";

const count = n => Math.max(0, Math.floor(Number(n) || 0));
const disabled = ok => ok ? "" : "disabled";
const seconds = n => `${Math.max(0, Math.ceil(Number(n) || 0))}s`;
const phaseNames = { ordered: "Packing your order", travelling: "Cart on its way", unloading: "At the receiving bay" };
const tabs = [["cook", "Cook"], ["supplies", "Pantry"], ["food", "Sell"], ["improve", "Progress"]];
// A recipe's readiness, said in two words on its tile; the full reason is in its detail.
const shortReason = (reason, cookware) => cookware ? "Needs cookware" : /^Need \d/.test(reason) ? "Needs supplies" : /^Grow /.test(reason) ? "Needs pumpkins" : /busy/.test(reason) ? "Cooker busy" : /room/.test(reason) ? "Cupboard full" : /home kitchen/.test(reason) ? "Home kitchen" : /Resume/.test(reason) ? "Paused" : "Not ready";
const recipeArt = (id,size=56) => dishIcon(id,size) || dishIcon("mixing-bowl",size);
// A picture for each kitchen upgrade, from the kitchen's own icons and food art.
const UPGRADE_ART = { pantry: () => cookingIcon("pantry"), storage: () => dishIcon("pumpkin-jam", 44) || cookingIcon("pantry"), speed: () => dishIcon("mixing-bowl", 44) || cookingIcon("truck"), "truck-oven": () => dishIcon("pumpkin-pie", 44) || cookingIcon("truck"), "truck-spices": () => ingredientIcon("spices", 40) || cookingIcon("pantry"), chef: () => cookingIcon("ghost-chef") };
const groupFor = tab => ({recipes:"cook",mix:"cook",deliveries:"supplies",pantry:"supplies",equipment:"improve",upgrades:"improve"})[tab]??tab;

// One management surface for the truck, home cooker and shop shelves. Quantities,
// tabs and confirmations belong to this view; money and timers belong to rules.
export function cookingSheets(ui) {
  let tab = "recipes", selectedRecipe = undefined, discoverOpen = false, station = "truck", cart = {}, cancelStation = null, batches = "1";
  let mixIngredients = {}, mixPumpkins = {}, mixMethod = "pan", mixAdd = "vegetables";
  const disclosures = { upgrades: false, accounts: false };
  let recipeFilter = "known", activeFoodSlot = null;
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
  // Batches and the cooker are quick choices, so they are pills rather than menus.
  function batchControl(s, id = selectedRecipe, maximum) {
    const max = maximum ?? (id ? K.maxCookingBatches(s, id, station) : 0);
    return `<div class="cook-choice cook-batch-choice" role="group" aria-label="Batches to cook" data-cooking-batches><span>Batch size</span>${[["1", "1"], ["5", "5"], ["10", "10"], ["max", `Max${max ? ` · ${max}` : ""}`]].map(([value, title]) => `<button type="button" data-cooking-batch="${value}" aria-pressed="${batches === value}" ${disabled(editable() && (value !== "max" || max > 0))}>${title}</button>`).join("")}</div>`;
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
    return `<div class="cooking-sheet" data-cooking-state="locked"><article class="cooking-welcome${canBuy ? " purchase-available" : ""}">${maisieIcon()}<div><p class="cooking-kicker">A new little business</p><h3>The Midnight Kitchen</h3><p>Order ingredients, cook pumpkin treats and fill the shelves in Skyla’s shop.</p></div><button class="button purchase-button wide${canBuy ? " can-act" : ""}" data-cooking-action="purchase" ${disabled(canBuy)}>Buy the food truck · ${money(C.COOKING.price)}</button></article><p class="cooking-note" data-cooking-gate>${reason}</p><div class="cooking-quote"><h4>From the farm to the counter</h4><p class="cooking-note">A starter hob and roasted-pumpkin recipe are included. Ingredients arrive by cart after ${seconds(C.COOKING.deliverySeconds)} of game time. Each order has a ${money(C.COOKING.deliveryFee)} delivery fee.</p><p class="cooking-note">The truck works before your home kitchen is built. Cooking uses real ingredients and pumpkins; visitors buy food with the money they have left.</p></div></div>`;
  }

  function capacity(label, used, max) {
    return `<div class="cooking-capacity"><div><span>${label}</span><b>${count(used)} / ${count(max)}</b></div><meter min="0" max="${Math.max(1, max)}" value="${used}" aria-label="${label}: ${count(used)} of ${count(max)}"></meter></div>`;
  }

  function stations(s) {
    const home = E.homeCookingAvailable(s), open = E.homeKitchenOpen(s), showHome = open || !!s.kitchen.jobs.home;
    if (station === "home" && !open) station = "truck";
    const stationMarkup = [station].map(id => {
      const job = s.kitchen.jobs[id], title = id === "home" ? "Home cooker" : "Truck hob";
      if (!job) {const wax=s.village?.expansion?.economy?.waxJob;if(wax?.station!==id)return ``;return `<article class="cooking-station is-busy">${cookingIcon('pumpkin-jam')}<div class="cooking-station-copy"><p class="cooking-kicker">${title} · utility recipe</p><h4>Preservation wax</h4><p class="cooking-note">${seconds(wax.remaining)} left · one pot for a harvest batch</p></div></article>`;} // Idle cookers need no card.

      const waiting = job.remaining <= 0, recipe = C.RECIPES.find(r => r.id === job.recipe);
      const runBatches = Math.max(1, count(job.batches || 1)), completed = Math.min(runBatches, count(job.completed));
      const duration = Math.max(1, job.duration ?? recipe?.seconds ?? 1), progress = Math.max(0, Math.min(1, (completed + 1 - job.remaining / duration) / runBatches));
      const runRemaining = Math.max(0, runBatches - completed - 1) * duration + job.remaining;
      return `<article class="cooking-station is-busy" data-cooking-job="${id}">${cookingIcon(job.recipe)}<div class="cooking-station-copy"><p class="cooking-kicker">${title} · now cooking</p><h4>${recipeName(job.recipe)}</h4><p class="${waiting ? "cooking-note is-warning" : "cooking-note"}">${waiting ? "Ready — make space in food storage to finish." : `Batch ${Math.min(runBatches, completed + 1)} of ${runBatches} · ${seconds(runRemaining)} left${job.automatic ? " · Chef" : ""}`}</p><div class="cook-progress" role="progressbar" aria-label="${title} cooking progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress * 100)}"><i style="--fill:${progress.toFixed(3)}"></i></div></div>${cancelStation !== id ? `<button class="button cook-stop" data-cooking-cancel="${id}" ${disabled(editable())}>Stop</button>` : ""}${id === "home" && !home ? '<p class="cooking-note cook-wide">This paid run will finish safely. Replace the kitchen equipment to start another.</p>' : ""}${cancelStation === id ? `<div class="cook-wide"><p class="cooking-note is-warning">Stopping discards every unfinished batch. Ingredients and pumpkins for the full run were used when it started and are not refunded.</p><div class="cooking-cancel-confirm"><button class="button" data-cooking-cancel-dismiss>Keep cooking</button><button class="button is-destructive" data-cooking-cancel-confirm="${id}" ${disabled(editable())}>Discard run</button></div></div>` : ""}</article>`;
    }).join("");
    return `<section class="cooking-section cooking-worktop" aria-label="Cooking station"><div class="cook-toolbar"><div class="cook-choice" role="group" aria-label="Cooking station" data-cooking-station><span>Cook at</span><button type="button" data-cooking-station-pick="truck" aria-pressed="${station === "truck"}" ${disabled(editable())}>Truck</button><button type="button" data-cooking-station-pick="home" aria-pressed="${station === "home"}" ${disabled(editable() && open)} ${open ? "" : 'title="Opens at house level 2"'}>Home</button></div></div>${stationMarkup}${pendingOutput(s)?`<p class="cooking-note">${pendingOutput(s)} portions reserved for batches in progress.</p>`:""}</section>`;
  }

  // What a run needs, each with how many you have, short ones marked.
  function inputs(s, recipe, run = 1) {
    const chip = (id, name, need, have) => `<span class="cooking-input ${have < need ? "is-short" : ""}">${ingredientIcon(id, 22)}<span><b>${need}</b> ${name}<small>${have} in store</small></span></span>`;
    const supplies = Object.entries(recipe.ingredients ?? {}).map(([id, n]) => chip(id, (C.INGREDIENTS.find(i => i.id === id)?.name ?? id).toLowerCase(), n * run, count(s.kitchen.pantry[id])));
    for (const [index, n] of Object.entries(recipe.pumpkins ?? {})) supplies.push(chip(`pumpkin:${index}`, `${(VARIETIES[Number(index)]?.name ?? "pumpkin").toLowerCase()} pumpkin${n * run === 1 ? "" : "s"}`, n * run, Math.max(0, count(available(s, Number(index))))));
    return supplies.join("");
  }

  // A recipe is a tile in a grid; the chosen one opens a full-width panel under
  // its row with what it needs and one clear Cook button.
  function recipeCard(s, recipe) {
    const learned=known(s,recipe.id), villageLocked=!learned&&recipe.discovery&&!expansionRewardOwned(s,recipe.discovery), gated=patchLevel(s).level<recipe.level||villageLocked;
    const ready=learned?K.cookingReadiness(s,recipe.id,station,1):null;
    const mood=learned?(ready.ok?"ready":"short"):gated?"locked":"new";
    const badge=learned?(ready.ok?"Ready":shortReason(ready.reason,ready.missingEquipment.length)):villageLocked?`Discover with ${recipe.discovery==='cinder-recipe'?'Cinder':'Granny'}`:gated?`Level ${recipe.level}`:"New recipe";
    return `<article class="recipe-entry recipe-tile is-${mood}${selectedRecipe===recipe.id?' is-selected':''}" data-cooking-recipe="${recipe.id}"><button class="recipe-choice" data-recipe-select="${recipe.id}" aria-pressed="${selectedRecipe===recipe.id}" aria-controls="cooking-chosen-dish">${recipeArt(recipe.id)}<b>${recipe.name}</b><small>${recipe.yield} portions${recipe.homeOnly?' · Home':''}</small><em class="recipe-badge">${badge}</em></button></article>`;
  }
  function chosenDish(s,recipe){
    if(!recipe)return '<div class="cooking-empty">Choose a dish from your recipe book.</div>';
    const run=batchCount(s,recipe.id),learned=known(s,recipe.id),villageLocked=!learned&&recipe.discovery&&!expansionRewardOwned(s,recipe.discovery),gated=patchLevel(s).level<recipe.level||villageLocked;
    const ready=learned?K.cookingReadiness(s,recipe.id,station,run):null;
    const shopping=recipeShoppingList(s,recipe,run), incoming=Object.entries(recipe.ingredients).some(([id,n])=>count(s.kitchen.pantry[id])<n*run);
    let help='';
    if(recipe.homeOnly&&station!=='home')help='<button class="button can-act" data-cooking-action="home">Use home kitchen</button>';
    else if(ready?.missingEquipment.length)help=`<button class="button can-act" data-cooking-go="${station==='home'?'equipment':'upgrades'}">Get cookware</button>`;
    else if(shopping.quantity)help=`<button class="button can-act" data-recipe-order="${recipe.id}">Add missing ingredients to cart</button>`;
    else if(incoming)help='<button class="button" data-cooking-go="deliveries">View incoming delivery</button>';
    const canCook=learned&&editable()&&ready.ok,canLearn=!learned&&editable()&&!gated&&s.coins>=recipe.research;
    const cta=learned?`<button class="button cook-cta${canCook?' can-act':''}" data-cooking-start="${recipe.id}" data-cooking-at="${station}" ${disabled(canCook)} data-pad-default>Cook ${recipe.yield*run} portions <span aria-hidden="true">→</span></button>`:`<button class="button purchase-button cook-cta${canLearn?' can-act':''}" data-cooking-research="${recipe.id}" ${disabled(canLearn)} data-pad-default>${villageLocked?`Discover with ${recipe.discovery==='cinder-recipe'?'Cinder':'Granny'}`:gated?`Unlocks at level ${recipe.level}`:`Learn recipe · ${money(recipe.research)}`}</button>`;
    return `<article class="recipe-detail cook-dish-hero" id="cooking-chosen-dish"><div class="cook-dish-cover">${recipeArt(recipe.id,128)}<small>${recipe.homeOnly?'Home kitchen recipe':'Maisie’s recipe book'}</small></div><div class="cook-dish-content"><p class="cooking-kicker">${learned?'On the menu':'A new discovery'}</p><h3>${recipe.name}</h3><p class="cook-dish-description">${recipe.text}</p><div class="cook-dish-facts"><span>${recipe.yield*run} portions</span><span>${seconds(recipe.seconds*Math.pow(.85,s.kitchen.upgrades.speed)*run)}</span><span>${money(s.kitchen.prices[recipe.id])} each</span></div>${learned?batchControl(s,recipe.id):''}<div class="cooking-inputs">${inputs(s,recipe,run)}</div>${ready?.missingEquipment.length?requirements(s,recipe):''}${learned&&!ready.ok?`<p class="cooking-note is-warning" data-cooking-ready-reason>${ready.reason}</p>`:''}${learned&&ready.ok&&!editable()?`<p class="cooking-note is-warning cook-paused">Tea break: the farm is paused. <button class="service-inline-link" data-cooking-action="resume">Carry on</button></p>`:''}<div class="cook-dish-actions">${cta}${help}</div><button class="service-inline-link cook-experiment-link" data-cooking-fill-mix="${recipe.id}" ${disabled(!gated)}>Try these in the mixing pot</button></div></article>`;
  }
  function recipes(s) {
    const level=patchLevel(s).level,learned=C.RECIPES.filter(r=>known(s,r.id)),discover=C.RECIPES.filter(r=>!known(s,r.id)&&r.level<=level&&(!r.discovery||expansionRewardOwned(s,r.discovery))),future=C.RECIPES.filter(r=>!known(s,r.id)&&(r.level>level||r.discovery&&!expansionRewardOwned(s,r.discovery)));
    const lists={known:learned,new:discover,later:future};
    if(!lists[recipeFilter].length)recipeFilter=learned.length?'known':discover.length?'new':'later';
    const visible=lists[recipeFilter];
    if(!visible.some(r=>r.id===selectedRecipe))selectedRecipe=visible[0]?.id;
    return `${stations(s)}${chosenDish(s,C.RECIPE_BY_ID[selectedRecipe])}<section class="cooking-section cook-book-section"><div class="service-section-heading"><h3>Recipe book</h3><button class="service-inline-link" data-cooking-go="mix">Mix your own ${SERVICE_OUT}</button></div><div class="cook-book-filters" role="group" aria-label="Recipe collection">${[['known','My recipes',learned.length],['new','Discover',discover.length],['later','Coming later',future.length]].map(([id,label,n])=>`<button data-recipe-filter="${id}" aria-pressed="${recipeFilter===id}">${label}<small>${n}</small></button>`).join('')}</div><div class="recipe-book">${visible.map(r=>recipeCard(s,r)).join('')}</div></section>${nextStep(s)}${expansionRewardOwned(s,'preservation-research')||expansionRewardOwned(s,'herb-beds')?`<details class="service-disclosure" data-cooking-disclosure="village-preservation" ${disclosures['village-preservation']?'open':''}><summary>Tansy’s preservation recipes</summary>${renderVillageExpansionEconomy(s,{who:'tansy',station})}</details>`:''}`;
  }

  function nextStep(s){
    if(selectedRecipe&&!known(s,selectedRecipe))return "";
    const step=kitchenNextStep(s,station,selectedRecipe),recipe=C.RECIPE_BY_ID[step.recipe];
    const action=(text,attrs)=>`<button class="service-inline-link can-act-link" ${attrs}>${text} <span aria-hidden="true">${SERVICE_RIGHT}</span></button>`;
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
    return `<section class="cooking-section"><div class="cooking-title-row"><h3>Home kitchen tools</h3>${open && !atHome() ? '<button class="button" data-cooking-action="home-equipment">Enter kitchen</button>' : ""}</div>${open ? `${stockMeter(present.length, Object.keys(KITCHEN_CAPABILITY_NAMES).length, "tools ready")}<p class="cooking-note"><b>${C.RECIPES.filter(r => E.equipmentRequirements(s, r, "home").ok).length} of ${C.RECIPES.length}</b> recipes can be cooked at home now. Buying a tool sets it down in the kitchen for you: cookers beside the hearth, pans and racks on the wall above.</p>` : ""}${!open ? '<p class="cooking-note is-warning">Expand the house to level 2 to open its kitchen.</p>' : ""}<div class="cooking-requirements" aria-label="Installed kitchen equipment">${Object.entries(KITCHEN_CAPABILITY_NAMES).map(([id, name]) => `<span class="cooking-requirement ${present.includes(id) ? "is-present" : "is-missing"}"><i aria-hidden="true"></i>${name}${present.includes(id) ? " · Ready" : " · Missing"}</span>`).join("")}</div><div class="cooking-list">${KITCHEN_EQUIPMENT.map(item => {
      const placed = s.house.placed.find(p => p.id === item.id && p.room === "kitchen"), owned = s.house.owned.includes(item.id);
      return `<article class="cooking-equipment" data-cooking-equipment-card="${item.id}">${cookingIcon(item.id)}<div><h4>${item.name}</h4><p>${item.description}</p><small>${item.grants.map(capabilityName).join(" · ")}${placed ? " · Placed in kitchen" : owned ? " · Owned, not in kitchen" : ""}</small></div><button class="button${!placed ? " purchase-button" : ""}${editable() && open && !placed && (owned || s.coins >= item.price) ? " can-act" : ""}" data-cooking-equipment="${item.id}" ${disabled(editable() && open && !placed && (owned || s.coins >= item.price))}>${placed ? "Placed" : owned ? "Place in kitchen" : `Buy & place · ${money(item.price)}`}</button></article>`;
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
    return `${stations(s)}<section class="cooking-section"><div class="cooking-title-row"><h3>A little kitchen magic</h3><span class="cooking-state">${items.length}/5 ingredients</span></div><p class="cooking-note">Tap ingredients into your bowl, choose a method, then cook. Unmatched mixes use nothing.</p><div class="mix-ingredient-tray" role="group" aria-label="Ingredients to add">${options.filter(item=>!items.some(i=>i.id===item.id)).map(item=>`<button data-mix-ingredient-pick="${item.id}" ${disabled(editable()&&items.length<5)}>${ingredientIcon(item.id,32)||cookingIcon('pantry')}<b>${item.name}</b><small>${item.stock} stored</small></button>`).join('')}</div><div class="cooking-mix-bowl">${items.length?items.map(item=>`<div class="mix-bowl-item">${ingredientIcon(item.id,36)||cookingIcon('pantry')}<div><b>${item.name}</b><small>${item.n*selection.batches} for this run</small></div><div class="cooking-stepper"><button class="button" data-cooking-mix-step="${item.id}" data-step="-1" aria-label="Use one less ${item.name.toLowerCase()}" ${disabled(editable())}>−</button><output aria-label="${item.name} per batch">${item.n}</output><button class="button" data-cooking-mix-step="${item.id}" data-step="1" aria-label="Use one more ${item.name.toLowerCase()}" ${disabled(editable()&&item.n<9)}>+</button></div></div>`).join(''):'<p class="cooking-empty">Your bowl is ready. Pick an ingredient above.</p>'}</div><div class="mix-methods" role="group" aria-label="Cooking method">${[['pan','Fry','pan'],['simmer','Simmer','pot'],['bake','Bake','oven']].map(([id,name,icon])=>`<button data-mix-method-pick="${id}" aria-pressed="${mixMethod===id}" ${disabled(editable())}>${cookingIcon(icon)}<span>${name}</span></button>`).join('')}</div>${batchControl(s, undefined, X.maxCookingMixBatches(s,selection))}<article class="cooking-mix-preview" data-cooking-mix-preview>${recipe?cookingIcon(recipe.id):cookingIcon(mixMethod==='bake'?'oven':mixMethod==='simmer'?'pot':'pan')}<div><h4>${recipe?`${preview.known?'':'New discovery · '}${recipe.name}`:'What will you make?'}</h4><p class="cooking-note${preview.ok?'':' is-warning'}" data-cooking-mix-reason>${preview.ok?`${recipe.yield*selection.batches} portions · ${seconds(preview.seconds)} total`:preview.reason}</p>${recipe&&preview.missingEquipment?.length?requirements(s,recipe):''}</div><button class="button cook-cta wide" data-cooking-mix-start ${disabled(editable()&&preview.ok)}>${preview.known?'Cook':'Discover & cook'}${recipe?` ${recipe.yield*selection.batches} portions`:''}</button></article><div class="cooking-mix-footer"><button class="button" data-cooking-mix-clear ${disabled(items.length>0)}>Clear bowl</button><button class="button" data-cooking-go="equipment">Cookware</button></div></section>`;
  }

  function deliveries(s) {
    const quote=K.quoteIngredientOrder(s,cart),k=s.kitchen,total=Object.values(cart).reduce((n,q)=>n+count(q),0);
    const incoming={};for(const order of k.orders)for(const [id,n] of Object.entries(order.items))incoming[id]=(incoming[id]??0)+n;
    return `<section class="cooking-section pantry-shop"><div class="service-section-heading"><h3>Pantry & deliveries</h3>${stockMeter(K.pantryCount(s),K.pantryCapacity(s),'ingredients')}</div><p class="cooking-note">Tap +1 or +5 to pack your cart. One delivery fee per order.</p>${k.orders.length?`<div class="cook-incoming">${k.orders.map((order,index)=>`<article class="cooking-delivery" data-cooking-order="${order.id}">${cookingIcon('cart')}<div><h4>${index>0&&order.phase==='ordered'?'Queued delivery':phaseNames[order.phase]??'Delivery'}</h4><small>${order.phase==='unloading'&&order.remaining<=0?'Pantry full · paid parcel kept safely':`${seconds(order.remaining)} · ${Object.values(order.items).reduce((n,q)=>n+q,0)} ingredients`}</small></div>${order.phase==='ordered'?`<button class="button" data-cooking-order-cancel="${order.id}" ${disabled(editable())}>Cancel</button>`:''}</article>`).join('')}</div>`:''}<div class="pantry-shopping-grid">${C.INGREDIENTS.map(item=>`<article class="pantry-ingredient${qty(item.id)?' in-cart':''}">${ingredientIcon(item.id,48)||cookingIcon('pantry')}<h4>${item.name}</h4><small><b>${count(k.pantry[item.id])}</b> stored${incoming[item.id]?` · ${incoming[item.id]} incoming`:''}</small><span class="pantry-unit-price">${money(item.price)} each</span><div class="pantry-add-actions"><button data-cooking-quantity-step="${item.id}" data-step="1" ${disabled(editable()&&total<C.COOKING.orderLimit)}>+1</button><button data-cooking-quantity-step="${item.id}" data-step="5" ${disabled(editable()&&total<C.COOKING.orderLimit)}>+5</button></div>${qty(item.id)?`<div class="pantry-cart-line"><button data-cooking-quantity-step="${item.id}" data-step="-1" aria-label="Remove one ${item.name.toLowerCase()}" ${disabled(editable())}>−</button><output aria-label="${item.name} in cart">${qty(item.id)} in cart</output><button data-cooking-quantity-clear="${item.id}" aria-label="Remove all ${item.name.toLowerCase()} from cart" ${disabled(editable())}>×</button></div>`:''}</article>`).join('')}</div><div class="cooking-quote service-checkout pantry-checkout"><div><b>${total} / ${C.COOKING.orderLimit} in cart</b><span>${total?`${money(quote.subtotal)} + ${money(quote.fee)} delivery`:'Choose ingredients above'}</span></div><button class="button cook-cta${editable()&&quote.ok?' can-act':''}" data-cooking-action="order" ${disabled(editable()&&quote.ok)}>Order · ${money(quote.total??0)}</button>${total?'<button class="service-inline-link" data-cooking-cart-clear>Empty cart</button>':''}${!quote.ok&&total?`<p class="cooking-note is-warning" data-cooking-quote-reason>${quote.reason}</p>`:''}</div><details class="service-disclosure pantry-farm-stock"><summary>From your pumpkin patch <span>Shared stock</span></summary><div class="cooking-pantry">${VARIETIES.map((v,i)=>`<div><span class="cooking-ingredient-name">${ingredientIcon(`pumpkin:${i}`,24)}<span>${v.name}</span></span><b>${Math.max(0,count(available(s,i)))}</b></div>`).join('')}</div><p class="cooking-note">Truck and home share this pantry. Paid deliveries never discard ingredients when storage is full.</p></details></section>`;
  }
  const pantry = deliveries;

  // Maisie's menu board: two dishes guests buy at the truck's hatch on their way
  // home (and, if the player chooses, from Skyla's shelves too), then each
  // dish's stock and a price you nudge up or down.
  function food(s) {
    const k = s.kitchen, cooked = C.RECIPES.filter(recipe => known(s, recipe.id)), anyReady = cooked.some(recipe => availableFood(s, recipe.id) > 0);
    const slot = i => {
      const on = C.RECIPE_BY_ID[k.displays[i]], fill = !on && anyReady && editable();
      return `<div class="food-slot${on ? " is-filled" : ""}" data-cooking-display="${i}"><div class="food-slot-face">${on ? recipeArt(on.id) : '<span class="food-slot-empty" aria-hidden="true">+</span>'}<div><p class="cooking-kicker">Menu board ${i + 1}</p><b>${on ? on.name : "Empty shelf"}</b><small>${on ? `${availableFood(s, on.id)} ready · ${money(k.prices[on.id] ?? on.price)} each` : "Choose a dish below"}</small></div></div><button class="button food-slot-edit${fill ? " can-act" : ""}" data-food-slot-edit="${i}" aria-expanded="${activeFoodSlot===i}">${on?"Change dish":"Choose a dish"} <span aria-hidden="true">${activeFoodSlot===i?"−":"+"}</span></button>${activeFoodSlot===i?`<div class="food-slot-picks" role="group" aria-label="Dish for menu board ${i + 1}">${cooked.map(recipe => `<button type="button" data-cooking-display-pick="${i}" data-recipe="${recipe.id}" aria-pressed="${k.displays[i] === recipe.id}" ${disabled(editable())}>${recipeArt(recipe.id)}<span>${recipe.name}</span></button>`).join("")}<button type="button" data-cooking-display-pick="${i}" data-recipe="" aria-pressed="${!on}" ${disabled(editable())}><span>Empty</span></button></div>`:""}</div>`;
    };
    const where = k.sellAt === "shop" ? "shop" : "truck";
    return `<section class="cooking-section"><div class="service-section-heading"><h3>The truck’s menu board</h3>${stockMeter(K.foodCount(s), K.foodCapacity(s), "portions stored")}</div><p class="cooking-note">Guests stop at Maisie’s hatch on their way home and buy what’s on the board.</p><div class="food-slots">${slot(0)}${slot(1)}</div><div class="cook-choice food-outlet" role="group" aria-label="Where guests buy food"><span>Sold at</span><button type="button" data-food-outlet="truck" aria-pressed="${where === "truck"}" ${disabled(editable())}>The truck</button><button type="button" data-food-outlet="shop" aria-pressed="${where === "shop"}" ${disabled(editable())}>Truck and Skyla’s shop</button></div>${where === "shop" && !s.shop.unlocked ? '<p class="cooking-note is-warning">Skyla’s shop isn’t open yet, so for now food sells only at the truck.</p>' : ""}<div class="service-section-heading"><h3>Dishes & prices</h3><span>Paid from what’s left after pumpkins</span></div><div class="cooking-list food-prices">${cooked.map(recipe => {
      const range = K.foodPriceRange(s, recipe.id), price = k.prices[recipe.id] ?? recipe.price, ready = availableFood(s, recipe.id), reserved = Math.max(0, count(k.food[recipe.id]) - ready);
      return `<article class="cooking-food-row">${recipeArt(recipe.id)}<div><h4>${recipe.name}</h4><small>${ready} ready${reserved ? ` · ${reserved} reserved` : ""}${k.displays.includes(recipe.id) ? ' · <span class="on-show">On show</span>' : ""}</small></div>${priceStepper({ label: `${recipe.name} selling price`, value: price, min: range.min, max: range.max, text: money, disabled: !editable(), wrap: `data-cooking-price="${recipe.id}"`, attrs: v => `data-cooking-price-set="${recipe.id}" data-value="${v}"` })}</article>`;
    }).join("")}</div><p class="cooking-note">A higher price can mean fewer sales; a low one may not cover ingredients, deliveries and the pumpkins used. Carrier bags let the hungriest guests take up to three portions. Queued customers keep their quoted price.</p></section>`;
  }

  function upgrades(s) {
    const k = s.kitchen, level = patchLevel(s).level, chef = count(k.upgrades.chef) > 0;
    return `<details class="cooking-disclosure" data-cooking-disclosure="upgrades" ${disclosures.upgrades ? "open" : ""}><summary><span>Truck improvements<small>Storage, speed & your spooky chef</small></span></summary><div class="cooking-disclosure-body">${C.KITCHEN_UPGRADES.map(item => {
      const tier = count(k.upgrades[item.id]), cost = K.kitchenUpgradeCost(s, item.id), maxed = cost === undefined || cost === null;
      const gate = level < item.level;
      const pips = `<span class="cook-tier-pips" aria-hidden="true">${item.costs.map((_, i) => `<i class="${i < tier ? "is-on" : ""}"></i>`).join("")}</span>`;
      return `<article class="cooking-upgrade${maxed ? " is-maxed" : gate ? " is-gated" : ""}"><span class="cook-upgrade-art" aria-hidden="true">${UPGRADE_ART[item.id]?.() ?? cookingIcon("truck")}</span><div><h4>${item.name}</h4><p>${item.text}</p><small>${pips}${maxed ? "Fully upgraded" : gate ? `Opens at patch level ${item.level}` : `Tier ${tier}/${item.costs.length}`}</small></div><button class="button${!gate && !maxed ? " purchase-button" : ""}${editable() && !gate && !maxed && s.coins >= cost ? " can-act" : ""}" data-cooking-upgrade="${item.id}" ${disabled(editable() && !gate && !maxed && s.coins >= cost)}>${maxed ? "Complete" : gate ? `Level ${item.level}` : money(cost)}</button></article>`;
    }).join("")}${chef ? `<section class="chef-recipe-section"><h4>Your chef’s menu</h4><p class="cooking-note">Choose one dish to keep cooking while supplies and storage allow.</p><div class="chef-recipe-picks" role="group" aria-label="Spooky chef recipe"><button data-chef-recipe-pick="" aria-pressed="${!k.chefRecipe}" ${disabled(editable())}>${cookingIcon('ghost-chef')}<b>Rest</b></button>${C.RECIPES.filter(r=>known(s,r.id)&&!r.homeOnly).map(r=>`<button data-chef-recipe-pick="${r.id}" aria-pressed="${k.chefRecipe===r.id}" ${disabled(editable())}>${recipeArt(r.id)}<b>${r.name}</b></button>`).join('')}</div><p class="cooking-note">The chef uses real ingredients and never orders or spends coins for you.</p></section>` : `<div class="cooking-chef-note">${cookingIcon("ghost-chef")}<p class="cooking-note">The spooky chef becomes available to hire at patch level 10. Recipes must be researched before the chef can make them.</p></div>`}</div></details>`;
  }

  function accounts(s) {
    const l = s.kitchen.ledger;
    return `<details class="cooking-disclosure" data-cooking-disclosure="accounts" ${disclosures.accounts ? "open" : ""}><summary><span>Kitchen accounts<small>${count(l.foodSold)} portions sold</small></span><b>${money(l.foodIncome)}</b></summary><dl class="cooking-accounts"><div><dt>Food takings</dt><dd>${money(l.foodIncome)}</dd></div><div><dt>Ingredients & deliveries</dt><dd>${money((l.ingredientSpend ?? 0) + (l.deliveryFees ?? 0))}</dd></div><div><dt>Recipe research</dt><dd>${money(l.researchSpend)}</dd></div><div><dt>Truck & improvements</dt><dd>${money(l.invested)}</dd></div></dl><p class="cooking-note">Food uses pumpkins you could otherwise sell. These accounts show cash spent and earned; they do not count that pumpkin value as a cash expense.</p></details>`;
  }

  function progress(s){
    return `<section class="cooking-section"><h3>Grow your kitchen</h3><p class="cooking-note">More storage, quicker batches and a chef to keep your menu moving.</p>${upgrades(s).replace(/<details[^>]*><summary>[\s\S]*?<\/summary>/,'').replace(/<\/details>$/,'')}</section><details class="service-disclosure" ${tab==='equipment'?'open':''}><summary>Home kitchen cookware <span>Place & arrange</span></summary>${equipment(s)}</details>${accounts(s)}`;
  }
  // The tabs with something to do in them now: a dish ready to cook on an idle
  // cooker, supplies to order, food to put on show, an upgrade within reach.
  function tabActions(s){
    const on=new Set();if(!editable())return on;
    const step=kitchenNextStep(s,station,selectedRecipe);
    if(!s.kitchen.jobs[station]&&C.RECIPES.some(r=>known(s,r.id)&&(!r.homeOnly||station==='home')&&K.cookingReadiness(s,r.id,station,1).ok))on.add('cook');
    if(step.kind==='supplies')on.add('supplies');
    if(step.kind==='sell'||(s.shop.unlocked&&s.kitchen.displays.some(d=>!d)&&C.RECIPES.some(r=>known(s,r.id)&&availableFood(s,r.id)>0)))on.add('food');
    const level=patchLevel(s).level;
    if(C.KITCHEN_UPGRADES.some(item=>{const cost=K.kitchenUpgradeCost(s,item.id);return level>=item.level&&cost!==undefined&&cost!==null&&s.coins>=cost;}))on.add('improve');
    return on;
  }
  function body() {
    const s=ui.state;if(!s.kitchen.purchased)return locked(s);
    const group=groupFor(tab),identity=tab==='food'?'Maisie’s menu board':station==='home'?'Your home kitchen':'Maisie’s midnight kitchen';
    const pages={recipes,mix,equipment:progress,deliveries,pantry,food,upgrades:progress};
    const jobs=Object.entries(s.kitchen.jobs).filter(([,j])=>j),busyCount=jobs.length+(s.village?.expansion?.economy?.waxJob?1:0),status=busyCount?`${busyCount} cooker${busyCount===1?'':'s'} busy`:'Ready for a little kitchen magic';
    // Away from the Cook tab (which has its own card for the cooker in hand), a
    // strip of what's on the go: the dish, where, the batch, the time left for
    // the whole run and a bar that fills (in 2% steps, so it redraws sparingly).
    const nowCooking=jobs.length&&group!=='cook'?`<div class="cook-now" aria-label="Cooking now">${jobs.map(([where,j])=>{const runs=Math.max(1,count(j.batches||1)),done=Math.min(runs,count(j.completed)),each=Math.max(1,j.duration??C.RECIPE_BY_ID[j.recipe]?.seconds??1),left=Math.max(0,runs-done-1)*each+Math.max(0,Number(j.remaining)||0),filled=Math.round(Math.max(0,Math.min(1,(done+1-Math.max(0,Number(j.remaining)||0)/each)/runs))*50)*2;return `<div class="cook-now-job"><span class="cook-now-art">${recipeArt(j.recipe,40)}</span><span class="cook-now-copy"><b>${C.RECIPE_BY_ID[j.recipe]?.name??'Something new'}</b><small>${where==='home'?'Home kitchen':'The truck'} · ${j.remaining<=0?'ready: make room in the cupboard':`batch ${Math.min(runs,done+1)} of ${runs} · ${seconds(left)} left`}</small><i class="cook-now-bar"><i style="width:${filled}%"></i></i></span></div>`;}).join('')}</div>`:'';
    return `<div class="cooking-sheet service-sheet cooking-simple" data-cooking-state="owned" data-menu-view="cooking:${tab}"><header class="service-identity service-hero"><div>${station==='home'?cookingIcon('hob'):maisieIcon()}<span><b>${identity}</b><small><span class="service-status${busyCount?' is-open':''}">${status}</span></small></span></div><button class="service-location" data-cooking-action="${station==='home'&&tab!=='food'?'home':'visit'}" aria-label="View ${station==='home'&&tab!=='food'?'room':'truck'}">${station==='home'&&tab!=='food'?'Room':'Truck'} ${SERVICE_OUT}</button></header>${nowCooking}${(()=>{const act=tabActions(s);return serviceTabs('cooking-section','Kitchen management',tabs,group).replace(/data-cooking-section="(\w+)"/g,(m,id)=>act.has(id)&&id!==group?`${m} data-has-action`:m);})()}${s.paused?'<div class="service-paused"><span>Farm paused · cooking and deliveries wait.</span><button class="service-inline-link" data-cooking-action="resume">Resume</button></div>':''}${tab==='mix'?`<button class="service-inline-link" data-cooking-go="recipes">${SERVICE_BACK} Back to recipes</button>`:''}${pages[tab](s)}</div>`;
  }

  function bind(host) {
    bindVillageExpansionEconomy(host,(id,action)=>{const result=actExpansionEconomy(ui.state,id.slice(8),action);if(result.ok){ui.save();ui.tone?.(720);}ui.notice?.(result.reason);ui.draw();});
    host.querySelectorAll('[data-cooking-section]').forEach(b=>b.onclick=()=>{tab=({cook:'recipes',supplies:'deliveries',food:'food',improve:station==='home'?'equipment':'upgrades'})[b.dataset.cookingSection];ui.draw();});
    host.querySelectorAll('[data-recipe-filter]').forEach(b=>b.onclick=()=>{recipeFilter=b.dataset.recipeFilter;selectedRecipe=undefined;ui.draw();});
    host.querySelectorAll('[data-recipe-select]').forEach(b=>b.onclick=()=>{selectedRecipe=b.dataset.recipeSelect;ui.draw();});
    host.querySelector('[data-recipe-discovery]')?.addEventListener('toggle',e=>{discoverOpen=e.currentTarget.open;});
    host.querySelectorAll('[data-recipe-order]').forEach(b=>b.onclick=()=>{const r=C.RECIPE_BY_ID[b.dataset.recipeOrder],list=recipeShoppingList(ui.state,r,batchCount(ui.state,r.id));cart={...list.items};tab='deliveries';ui.draw();if(list.partial)ui.notice?.('Your cart holds 40 ingredients. Order the rest after this delivery.');});
    const tabStrip = host.querySelector(".cooking-tabs"), currentTab = tabStrip?.querySelector("[aria-pressed=true]");
    if (tabStrip && currentTab) tabStrip.scrollLeft = Math.max(0, currentTab.offsetLeft - (tabStrip.clientWidth - currentTab.offsetWidth) / 2);
    host.querySelectorAll("[data-cooking-tab], [data-cooking-go]").forEach(button => button.onclick = () => { tab = button.dataset.cookingTab ?? button.dataset.cookingGo; cancelStation = null; ui.draw(); });
    host.querySelectorAll("[data-cooking-disclosure]").forEach(detail => detail.addEventListener("toggle", () => { disclosures[detail.dataset.cookingDisclosure] = detail.open; }));
    host.querySelectorAll("[data-cooking-station-pick]").forEach(button => button.onclick = () => { station = button.dataset.cookingStationPick === "home" && homeOpen() ? "home" : "truck"; ensureHome(); ui.draw(); });
    host.querySelectorAll("[data-cooking-batch]").forEach(button => button.onclick = () => { batches = ["1", "5", "10", "max"].includes(button.dataset.cookingBatch) ? button.dataset.cookingBatch : "1"; ui.draw(); });
    host.querySelectorAll("[data-cooking-quantity-step]").forEach(button => button.onclick = () => { const id = button.dataset.cookingQuantityStep; const total=Object.values(cart).reduce((n,q)=>n+count(q),0),delta=Number(button.dataset.step); cart[id] = Math.max(0, qty(id) + (delta>0?Math.min(delta,C.COOKING.orderLimit-total):delta)); ui.draw(); });
    host.querySelectorAll('[data-cooking-quantity-clear]').forEach(b=>b.onclick=()=>{delete cart[b.dataset.cookingQuantityClear];ui.draw();});
    host.querySelector('[data-cooking-cart-clear]')?.addEventListener('click',()=>{cart={};ui.draw();});
    host.querySelectorAll('[data-mix-ingredient-pick]').forEach(b=>b.onclick=()=>{if(editable()){setMixQuantity(b.dataset.mixIngredientPick,1);ui.draw();}});
    host.querySelectorAll('[data-mix-method-pick]').forEach(b=>b.onclick=()=>{mixMethod=b.dataset.mixMethodPick;ui.draw();});
    host.querySelectorAll('[data-chef-recipe-pick]').forEach(b=>b.onclick=()=>{if(K.setChefRecipe(ui.state,b.dataset.chefRecipePick||null))changed();});
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
    host.querySelectorAll("[data-cooking-research]").forEach(button => button.onclick = () => { if (K.researchRecipe(ui.state, button.dataset.cookingResearch)) { selectedRecipe=button.dataset.cookingResearch;recipeFilter="known";changed("A new recipe for your kitchen."); } });
    host.querySelectorAll("[data-cooking-cancel]").forEach(button => button.onclick = () => { cancelStation = button.dataset.cookingCancel; ui.draw(); });
    host.querySelector("[data-cooking-cancel-dismiss]")?.addEventListener("click", () => { cancelStation = null; ui.draw(); });
    host.querySelectorAll("[data-cooking-cancel-confirm]").forEach(button => button.onclick = () => { if (K.cancelCooking(ui.state, button.dataset.cookingCancelConfirm)) { cancelStation = null; changed("Batch discarded. Ingredients were not refunded."); } });
    host.querySelectorAll("[data-cooking-order-cancel]").forEach(button => button.onclick = () => { if (K.cancelIngredientOrder(ui.state, Number(button.dataset.cookingOrderCancel))) changed("Ingredients refunded. Delivery fee retained."); });
    host.querySelectorAll("[data-food-outlet]").forEach(button => button.onclick = () => { if (K.setFoodOutlet(ui.state, button.dataset.foodOutlet)) changed(button.dataset.foodOutlet === "shop" ? "Food sells at the truck and in Skyla’s shop." : "Food sells at Maisie’s truck."); });
    host.querySelectorAll("[data-food-slot-edit]").forEach(button=>button.onclick=()=>{const slot=Number(button.dataset.foodSlotEdit);activeFoodSlot=activeFoodSlot===slot?null:slot;ui.draw();});
    host.querySelectorAll("[data-cooking-display-pick]").forEach(button => button.onclick = () => { if (K.assignFoodDisplay(ui.state, Number(button.dataset.cookingDisplayPick), button.dataset.recipe || null)) { activeFoodSlot=null;changed(); } else ui.draw(); });
    host.querySelectorAll("[data-cooking-price-set]").forEach(button => button.onclick = () => { if (K.setFoodPrice(ui.state, button.dataset.cookingPriceSet, Number(button.dataset.value))) changed(); else ui.draw(); });
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
