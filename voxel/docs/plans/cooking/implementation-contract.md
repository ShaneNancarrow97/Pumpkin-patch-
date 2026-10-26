# Cooking contractor contract

Base5083446 (includes completed exterior); lead3f92ca8. Preserve unfinished20-level work; current unlocks5–12 only. First playable slice must complete paid order→cart→pantry→cooking→stock→finite-wallet shop sale. No new currency, no spoilage, no offline wallclock, no automatic purchase on levelling. Pause uses existinggame time. Rendering owns no money. Stateversion12 additive kitchen.

## Ownership
Root:model, main, scene, build, existing shop/house UI integration. Rulesagent:new content/cooking.js and rules/cooking.js. Salesagent:new rules/cooking-sales.js + selling.js only. UIagent:new ui/cooking-sheet.js/css only. Worldagent:new cooking-world.js, food-props.js, content/cooking-layout.js only. Artagent:new runtime/concept assets+iconmodule only. QAagent:new tests/tools/reports only. Avoid editing other owners' files; agree APIs by messaging.

## Public rule API (exportfrommodel byroot)
freshKitchen(),restoreKitchen(raw,s),updateKitchen(s,dt,events)
kitchenUnlocked(s),buyFoodTruck(s)
quoteIngredientOrder(s,items),placeIngredientOrder(s,items),cancelIngredientOrder(s,id)
researchRecipe(s,id),startCooking(s,recipeId,station='truck'),cancelCooking(s,station)
buyKitchenUpgrade(s,id),setChefRecipe(s,idOrNull)
assignFoodDisplay(s,slot,recipeOrNull),setFoodPrice(s,recipeId,price)
kitchenSummary(s) optionalreadmodel.

s.kitchen = {purchased,pantry:{ingredientId:qty},food:{recipeId:qty},recipes:[unlockedIDs],prices:{recipeId:posted},displays:[id|null,id|null],orders:[{id,phase,remaining,items,...}],jobs:{truck:null|job,home:null|job},upgrades:{pantry:0,storage:0,speed:0,chef:0},chefRecipe:null|id,ledger:{ingredientSpend,researchSpend,foodIncome,foodSold,invested,...},nextOrder,nextJob,...}. Rulesagent can add bounded fields but keep these names for consumers. Current orders oneactive plus onepending. Delivered order credits once; pantryfull holds sealed parcels. Consumption on jobstart atomic; cancellation has NO refund afterstart (explicit UI). Finishedstorefull blocks completion untilspace; no loss. Restore validates IDs, finitecounts, phases, duplicates and queues, IDs andexactlyonce receipts.

Foodtruckatlevel5 requires purchase£900, includes starterhob and firstrecipe, sharedpantry independent of home room. Home secondstation requires house kitchen open AND placed copper-range; doesn't spend on free cooker. Recipes may be researched atlevels5–12; inputcost includes pumpkinopportunitycost. Pumpkininput must respect stock.available and commit stock removal/freshbatches consistently. No access to held/wanted reserved stock. Chefhirelevel10, consumes realingredients/stock, dispatches job only ifoutputcapacity/inputready. No freefood, no infinite autoordering.

Sales: indoor realshopcustomers only firstslice (passersby untouched). Hungry visitors reserve optional food after primarypumpkin basket quote using uncommitted change and unspent wishpurse protection. Food-only shoppers may queue ifno pumpkinavailable. Receipt exactlyonce; foodStockholds separate; prices locked in hold. Foodcheckout uses same c.budget, never negative; no pumpkin items/tips inflation. Separate foodincome/units receipts. Onsave ordinarycustomers are cleared, holds released, foodstock stays; kitchenfoodholds must not persist or repair onrestore. foodslots actual two wall displays rendered in shop. Salesfunctions quoteFoodForCustomer(s,c),commitFoodForCustomer(s,c),releaseFoodForCustomer(s,c) names salesagent owns; communicatefinalhooks.

UI: one contextualCooking sheet with Recipes/Deliveries/Pantry/Food (nestednotmenustacks), collapsed advanced Chef/upgrades. Exactorderprice+fee+wait, fullpantry/fullfood feedback, price/displaycontrols, researchgate/waittime/cancelconsumptionrules visible. 44pxtargets, goldpurchasebuttons, no permanentHUD panel. Root adds entry More/Upgradesshop link, maptruck and placedrange click context. Door/pieceediting must not break. Current12levelcap unchanged.

World: candidate truckcompact besideShop x40.5–45,z1.4–4.1; servicecartlane x38.8 fromnorth z−6 toreceivingz4.2 (cartwidth~1.2); separatefromShopboundsx27.5–36.5 and allvisitorpaths z≥6.6. Inspect current fences/wilds beforefixing. Do not alter shop,Hollow,hayride,meadow props or path. Explicitterrain/footprint data and roadclearance; root updateswilds footprint/cameraonly whenpurchased. Native meshesbatched, no pointlights; return optional lamp positions to existingpool. Cart reconstructs fromorderphase/progress; no newstate fromtick. Small servingcounter+oven visible, foodstock wallminiatures (usefoodProps) rendered separately byroot. No depthclipping or zero-scaleboxes.
