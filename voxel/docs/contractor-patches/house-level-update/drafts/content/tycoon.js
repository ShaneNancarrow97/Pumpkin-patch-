// The festival's long-term loop: land, ingredients, recipes and destinations.
export const LEVEL_THRESHOLDS=[0,30,90,180,320,520,800,1200,1750,2450,3300,4400,5800,7600,9800,12500,15800,19800,24600,30400];
export const LEVEL_NAMES=["Little seed","Growing roots","Lantern keeper","Village favourite","Market gardener","Autumn artisan","Midnight baker","Moonlit host","Haunted entrepreneur","Night market","Harvest master","Spooky chocolatier","Cottage alchemist","Festival favourite","Manor merchant","Ghostly gourmet","Moonberry magnate","Legend of the patch","Spooktacular estate","The forever festival"];
export const LAND_PARCELS=[
  {id:"meadow",name:"East meadow",price:450,level:2,text:"Four ingredient beds and space for Cocoa Corner."},
  {id:"orchard",name:"Crooked orchard",price:2400,level:5,text:"Four more beds, orchard produce and the popcorn pitch."},
  {id:"moon-garden",name:"Moonlight garden",price:8500,level:9,text:"Rare moonberries, four beds and a toffee-apple pitch."},
];
export const INGREDIENTS={
  wheat:{name:"Flour wheat",pack:5,price:18},corn:{name:"Sweetcorn",pack:5,price:20},apple:{name:"Apples",pack:5,price:30,needs:"orchard"},
  moonberry:{name:"Moonberries",pack:3,price:45,needs:"moonbotany"},milk:{name:"Milk",pack:5,price:12},
  sugar:{name:"Sugar",pack:5,price:10},butter:{name:"Butter",pack:5,price:18},cocoa:{name:"Cocoa",pack:5,price:16,needs:"cocoa"},
};
export const GARDEN_CROPS=[
  {id:"wheat",name:"Flour wheat",land:1,seed:2,seconds:45,yield:3,colour:0xd8b45d},
  {id:"corn",name:"Sweetcorn",land:1,seed:3,seconds:60,yield:3,colour:0xe4c047},
  {id:"apple",name:"Orchard apples",land:2,needs:"orchard",seed:4,seconds:85,yield:3,colour:0xbb4935},
  {id:"moonberry",name:"Moonberries",land:3,needs:"moonbotany",seed:7,seconds:120,yield:2,colour:0x9977ee},
];
export const RECIPES=[
  {id:"pumpkin-soup",name:"Lantern pumpkin soup",level:3,seconds:28,yield:4,price:18,inputs:{pumpkin:2,milk:1,wheat:1},colour:0xe98a32},
  {id:"hot-chocolate",name:"Midnight hot chocolate",level:4,research:"chocolate",seconds:24,yield:6,price:8,inputs:{cocoa:2,milk:2,sugar:1},colour:0x824331},
  {id:"pumpkin-pie",name:"Pumpkin moon pie",level:5,research:"pastry",seconds:38,yield:4,price:32,inputs:{pumpkin:2,wheat:2,butter:1,sugar:1},colour:0xc97b35},
  {id:"popcorn",name:"Witchfire popcorn",level:6,research:"popcorn",seconds:25,yield:6,price:12,inputs:{corn:2,butter:1},colour:0xe1c17a},
  {id:"apple-jam",name:"Crooked orchard preserve",level:7,research:"preserves",seconds:45,yield:4,price:28,inputs:{apple:3,sugar:2},colour:0xad493a},
  {id:"toffee-apple",name:"Haunted toffee apple",level:10,research:"toffee",seconds:35,yield:5,price:18,inputs:{apple:3,sugar:2,butter:1},colour:0xb44c32},
  {id:"moonberry-tart",name:"Moonberry starlight tart",level:12,research:"moon-pastry",seconds:60,yield:4,price:72,inputs:{moonberry:3,wheat:2,butter:2,sugar:1},colour:0x9e77d5},
];
export const RESEARCH=[
  {id:"cocoa",name:"Cocoa alchemy",level:3,coins:100,insight:5,text:"Source cocoa for chocolate recipes."},
  {id:"chocolate",name:"The perfect hot chocolate",level:4,coins:180,insight:8,needs:"cocoa",text:"Cook your own cups for the stand and shop."},
  {id:"pastry",name:"Midnight pastry",level:5,coins:350,insight:12,text:"Turn your pumpkins into moon pies."},
  {id:"popcorn",name:"Witchfire kernels",level:6,coins:450,insight:16,text:"A buttery recipe for the popcorn stand."},
  {id:"orchard",name:"Orchard botany",level:5,coins:300,insight:10,land:2,text:"Grow and source apples."},
  {id:"preserves",name:"Preserving autumn",level:7,coins:650,insight:20,needs:"orchard",text:"Make jars for Skyla's wall shelves."},
  {id:"irrigation",name:"Enchanted irrigation",level:7,coins:1500,insight:28,land:2,text:"Ingredient beds harvest and replant themselves while seeds are affordable."},
  {id:"toffee",name:"Toffee cauldron",level:10,coins:1200,insight:35,needs:"orchard",text:"Supply a third festival stand."},
  {id:"moonbotany",name:"Moonlight botany",level:9,coins:1400,insight:30,land:3,text:"Grow and source rare moonberries."},
  {id:"moon-pastry",name:"Starlight patisserie",level:12,coins:2800,insight:50,needs:"moonbotany",text:"Bake the festival's most valuable tart."},
];
export const FESTIVAL_STANDS=[
  {id:"cocoa",name:"Cocoa Corner",land:1,level:2,prices:[350,1100,3200],product:"hot-chocolate",wholesale:44,retail:[8,10,12],colour:0x744359},
  {id:"popcorn",name:"Witchfire popcorn",land:2,level:6,prices:[900,2600,6500],product:"popcorn",wholesale:65,retail:[12,15,18],colour:0xb77a32},
  {id:"toffee",name:"Toffee & trouble",land:3,level:10,prices:[1800,4800,11000],product:"toffee-apple",wholesale:100,retail:[18,22,26],colour:0x963e42},
];
export const recipeById=Object.fromEntries(RECIPES.map(r=>[r.id,r]));
export const standById=Object.fromEntries(FESTIVAL_STANDS.map(s=>[s.id,s]));
export const landWidth=level=>40+12*level;
export const standPoint=id=>({x:46+12*FESTIVAL_STANDS.findIndex(s=>s.id===id),z:20.8});
export const gardenPoint=index=>({x:43+12*Math.floor(index/4)+(index%2)*5.5,z:10.5+Math.floor(index%4/2)*4});
