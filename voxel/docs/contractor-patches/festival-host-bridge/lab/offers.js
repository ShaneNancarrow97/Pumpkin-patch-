// Read-only previews for the private service lab, not promises of live demand.
// Food quoting reserves a hold and ride planning allocates a visit, so both run
// only against a detached copy. No receipt, binding, payment or clock is made.
import { RECIPE_BY_ID } from '../../../../src/content/cooking.js';
import { availableFood, quoteFoodForCustomer } from '../../../../src/rules/cooking-sales.js';
import { COCOA_SPECIALS, quoteStandOrder } from '../../../../src/rules/cocoa-menu.js';
import { gardenBed } from '../../../../src/rules/garden-crops.js';
import { hayrideConfig, planHayrideVisit } from '../../../../src/rules/hayride.js';

const count=value=>Number.isFinite(value)?Math.max(0,value):0;
const unavailable=(label,reason)=>({available:false,label,reason,amount:null,quantity:0});
const guest=(id,budget)=>({id,kind:0,spot:id%8,budget,basket:[],preferred:[0],age:0,courtier:true,vip:true,needs:{hunger:100,thirst:100,happiness:70,value:1.5}});
const cocoaName=id=>id==='cocoa'?'Basic hot chocolate':COCOA_SPECIALS.find(p=>p.id===id)?.name??id;

/**
 * Return {food,cocoa,garden,ride} for the next default nominated lab guest.
 * Current displays are authoritative by default. Only an explicit
 * {previewSelection:true} quotes the selected theme's proposed first display
 * on the detached copy, for idle theme browsing before preparation.
 * Each offer has available/label/reason/amount/quantity. Monetary amounts are
 * current quotes only, not committed sales. Food includes recipeId and stock;
 * cocoa includes detached {id,name,price,stock} items; garden includes phase;
 * ride includes routeLevel and circuitSeconds, not an invented total trip time.
 * The caller separately gates actions by the Festival's lifecycle/outbox.
 */
export function serviceOffers(world,theme,{previewSelection=false}={}){
 const empty=reason=>({food:unavailable('Menu dish',reason),cocoa:unavailable('Cocoa order',reason),garden:unavailable('Kitchen garden',reason),ride:unavailable('Hollow hayride',reason)});
 if(!world||typeof world!=='object'||!Array.isArray(theme?.recipeIds)||!theme.recipeIds.length)return empty('invalid-venue');
 const s=structuredClone(world);
 if(previewSelection===true&&s.kitchen)s.kitchen.displays=[theme.recipeIds[0],null];
 // A quote creates its own hold on the copy. Capture availability beforehand
 // so the UI reports current stock, not stock minus this uncommitted preview.
 const stocks=new Map(Object.keys(s.kitchen?.food??{}).map(id=>[id,availableFood(s,id)]));
 const quote=quoteFoodForCustomer(s,guest(s.shop?.nextCustomer??0,100));
 const displays=(s.kitchen?.displays??[]).filter(id=>RECIPE_BY_ID[id]);
 const recipeId=quote?.recipe??displays.find(id=>(stocks.get(id)??0)>0)??displays[0]??null;
 const recipe=RECIPE_BY_ID[recipeId],stock=stocks.get(recipeId)??0;
 const food={...unavailable(recipe?.name??'Menu dish',s.paused?'world-paused':'unavailable'),recipeId,stock};
 if(quote)Object.assign(food,{available:true,reason:null,amount:quote.price*quote.quantity,quantity:quote.quantity});

 const c=s.festival?.cocoa,lines=c?quoteStandOrder(s,guest(s.nextVisitor??0,60),false):[];
 const items=lines.map(line=>({id:line.id,name:cocoaName(line.id),price:line.price,stock:count(line.id==='cocoa'?c.stock:c.extras?.[line.id]?.stock)}));
 const cocoa={...unavailable('Cocoa & treats',s.paused?'world-paused':'unavailable'),items};
 if(items.length)Object.assign(cocoa,{available:true,reason:null,amount:items.reduce((n,line)=>n+line.price,0),quantity:items.length});

 const piece=s.estate?.placed?.find(p=>p.id==='vegetable-bed'),bed=piece&&gardenBed(s,piece.instance);
 const garden={...unavailable('Kitchen garden',s.paused?'world-paused':'missing-bed'),phase:bed?.state.phase??null};
 if(bed&&!s.paused)Object.assign(garden,{available:true,reason:null});

 const plan=planHayrideVisit(s,guest(s.nextVisitor??0,60),'arrival',{force:true,approachSeconds:.1,returnSeconds:.1});
 const config=hayrideConfig(s),ride={...unavailable('Hollow hayride',s.paused?'world-paused':'unavailable'),routeLevel:count(s.hayride?.routeLevel),circuitSeconds:config.circuitSeconds};
 if(plan)Object.assign(ride,{available:true,reason:null,amount:plan.quote,quantity:1});
 return {food,cocoa,garden,ride};
}
