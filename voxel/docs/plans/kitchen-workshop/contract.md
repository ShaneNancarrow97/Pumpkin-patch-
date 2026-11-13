# Historical implementation plan

The current contractor handover is 46-kitchen-hospitality-workshop.md. Earlier agent ownership notes below describe the initial work split, not active jobs. Midnight Moon was delivered separately as handover 45 and is included here. Pumpkin spice biscuits now also work at the truck after buying its oven and seasoning kits; the other five new dishes remain home-kitchen dishes.

# Kitchen workshop contractor contract

Worktree /workspace/kitchen-workshop branch contractor/kitchen-workshop. Base121f4cdb (cooking handover44), publishedlead3f92ca8 unchanged. User: home cooking physically in kitchen, dish requirements oven/pots/pans/spices/meat/vegetables; Zelda-like combinations and mass production/sales. Preserve original game,12levels, save data, unfinishedprivate20levels, contractor delivery withHTML+handover45.

Root owns model.js version13 fresh/save/update, main.js navigation, places.js livekitchenworkstationeffects, cookingicon dispatch/sharededitorintegration, build/package/docs. Rulesagent owns content/cooking.js and rules/cooking.js plus NEW rules/kitchen-equipment.js + rules/cooking-mix.js + NEW tests. Furnitureagent owns NEW content/kitchen-equipment.js + kitchen-props.js, existing decor.js/catalogintegration/decor-sizes as needed, NEW tests. UIagent owns ui/cooking-sheet.js/css only. Salesagent owns rules/cooking-sales.js, food-props.js; coordinate rulesagent owns receipt sanitation in rules/cooking.js. Artagent NEW assets/icons modules only. QA NEW runner/reports only; NO browser before rootGO.

## Equipment API/data

New actualdecor pieces (affordable utility variants; premium remainvalid): kitchen-hob600 (hob), kitchen-oven1100 (oven), kitchen-pot-rail180(pot), kitchen-pan-rail160(pan), kitchen-baking-rack220(tray), kitchen-spice-shelf260(spice). Use existing house buyDecor/placeDecor/placement/editor, tools qualify only ifPLACEDroomkitchen. Existing copper-range grants hob+oven+tray+pot+pan (model includes cookware); copper-pan-rail grants pan, iron-utensil-rack grants pan+pot, gothic-spice-cabinet grants spice. Explicit capability mapping in content/kitchen-equipment.js.

Furnitureagent exports KITCHEN_EQUIPMENT catalogue through existing premiumcatalogintegration, KITCHEN_CAPABILITIES mapping; kitchenProp(id) nativegroup correctfootprint/height/floorwall. Rulesagent exports kitchenEquipment(s,station='home') ->capabilityIDs, equipmentRequirements(s,recipe,station), homeCookingAvailable(s), buyCookingEquipment(s,id) ->{ok,placed,instance,...} orfalse. Conveniencepurchase uses existing housebuy/place safely, purchases tostorage ifnofit andsaysso. No freeautoinstall. Rulespure noDOM/three.

Startertruckincludes hob,pot,pan; paid truck ovenkit700L7 grants oven+tray; seasoningkit260L7 grants spice. Legacyv12knownbakingrecipes grandfather truckovenkit tokeepvalidpurchases/jobs. Newgame truckneedsovenupgrade forbakes. Homephysicalpiecesalwaysrequired. Startedhomejobcontinues ifequipmentstored; newjobsblocked.

## Recipes, ingredients

Preserve original8IDs/costs/prices, add heatmethod+requirements: wedgespan/hob; soup,jam,toffee pot/hob; cookies,pie,brownies,tart oven/tray. Add raw vegetables3, meat6, chicken5, stock2, herbs2, spices3. 6 HOME-ONLY recipes:

- garden-skillet L5 price12 yield3 time40 vegetables2+butter1+herbs1 hob,pan
- harvest-broth L6 price14 yield3 time50 vegetables2+stock1+herbs1 hob,pot
- spiced-roast L7 price19 yield3 time65 meat2+vegetables2+spices1 oven,tray,spice
- moonfire-chicken L8 price18 yield3 time60 chicken2+butter1+herbs1+vegetables1 hob,pan
- haunted-pie L9 price26 yield4 time80 meat2+vegetables2+flour2+butter1 oven,tray
- pumpkin-spice-biscuits L10 price8 yield6 time60 flour2+butter1+sugar1+spices1 +orange1 oven,tray,spice

Newrecipes research optionalshortcut or discover via exactmix atgate. Costsreasonable180..1800.

## Bulk jobs

Preserve API startCooking(s,id,station='truck',automatic=false,batches=1), cookingReadiness(s,id,station='truck',batches=1); add maxCookingBatches(s,id,station)<=10. Consume fullinputs upfront, no refundcancellation. Job priorfields+batches,completed. Onebatch at a time, linear perbatchduration (no instanttenfoldoutput). Remainingreservedoutput=(batches-completed)*yield. food+allremainingoutputs<=capacity beforestart. Existingjobsrestoreas1batch. Preservefixedduration/remaining, unfinishedoutputreservations acrossstations, no replayafterreload. Chefdefault1, onlyrecipespossibletruck. Pausegameclock.

## Mixing

previewCookingMix(s,{ingredients,pumpkins,method,station='home',batches=1}) -> {recipe:id|null,known,level,ok,reason,...}; exactingredients+method pan/simmer/bake, <=5distincttypes inclpumpkin, amounts1..9. Unknownmix noconsumption. startCookingMix(s,selection) starts discoveryjob ifeligible; learn onFIRSTcompletedbatch, recipe-discovered event. Restorevalidunknownrecipejob ifdiscoverymetadata. Newrecipes homeonly. KnownrecipeUI fillmix. Never bypass equipment/level/capacity/input/heldpumpkin.

## UI/world

Home accessed by navigating actualkitchen. Root ui.enterKitchen() works ifroomopen evenmissingrange thenequipmentpage. openCookingSheet('equipment','home') fromkitchenbutton. UI homestart fromfarm navigates beforestart; pure ruleslocationagnostic. Equipment directsection, present/missing badges, buy+place eachtool/storagestatus. Experimenttab ingredientchooser<=5types+amounts+method, preview/readiness/cook. Bulk1/5/10/Max selectors; portions/totaltime/reservedcapacity; no-refundhint. Avoidcrowdedlabels: horizontal44px six-tabrow allowed, no pageoverflow; rootQA checks. 12pxmin/44pxtargets/amberbuys/generatedicons.

Real kitchen liveglow/steam onlywhilehomejob, no duplicateactors/newpointlights. Cookcontext on hob/oven/range; preserveeditorcontrols.

## Sales

Batchfoodfeeds existing2shelves; no freewholesalebutton. Hungryguest buys1–3 basedappetite/baglevel/samewallet: bags0=1; bags1 hunger>=70 ->2; bags>=2 hunger>=85 ->3; VIP3 onlywithbags>=1. Realquantityholds/lockedprice/nooversell. Restorefoodreceiptquantity1..3 (rulesagent). Nativefoodprops new6dishes. Separatefoodincome/units/tips. Testfinitewallet/caps/reservations/save/pause.
