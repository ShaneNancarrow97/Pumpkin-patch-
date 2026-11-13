// The expansion uses world-unit positions once; cave rooms have local layers.
import {CAST_CHAPTERS} from './village-expansion-cast.js';
import {EXPANSION_STORY,STEP_VERBS} from './village-expansion-story.js';
import {spreadRect,spreadStep} from '../rules/village-spread.js';
// Surface places were drawn on the village's design grid before it was spread apart (rules/village-spread.js): they
// are stored where they now stand. Cave rooms keep their own local grid.
const K=1.5, p=(x,z)=>({x:x*K,z:z*K}), sp=(x,z)=>{const [a,b]=spreadStep(x,z);return{x:a*K,z:b*K};};
const area=(id,name,level,needs,bounds,spawn,extra={})=>{const cave=extra.layer==='cave',[x0,z0,x1,z1]=bounds,b=cave?{x0,z0,x1,z1}:spreadRect({x0,z0,x1,z1});
 return Object.freeze({id,name,level,needs,bounds:[b.x0,b.z0,b.x1,b.z1].map(n=>n*K),spawn:{...(cave?p:sp)(...spawn)},layer:'surface',...extra});};
export const EXPANSION_AREAS=Object.freeze([
 area('green','Hollow Green',3,null,[0,-22,120,50],[58,-17]),
 area('copse','Moonroot Copse',6,'legacy:two-doorbells',[-32,50,12,114],[0,57]),
 area('quarry','Lantern Quarry',9,'copse-restored',[40,56,86,96],[58,64]),
 area('moor','Carnival Moor',12,'restaurant-opening',[126,14,168,82],[132,34]),
 area('marsh','Mirror Marsh',15,'four-seals',[38,108,124,134],[58,112]),
 area('acre','The Crooked Acre',8,'copse-restored',[-98,46,-34,114],[-38,82]),
 area('cave-shallows','The Lantern Steps',6,'legacy:two-doorbells',[-18,-56,18,4],[0,0],{layer:'cave',depth:1,gem:'lantern-amethyst',returnArea:'copse',returnPoint:sp(-30,106)}),
 area('cave-workings','The Drowned Workings',9,'quarry-bell',[-18,-56,18,4],[0,0],{layer:'cave',depth:2,gem:'ember-garnet',returnArea:'cave-shallows',returnPoint:p(10,-24)}),
 area('cave-cathedral','The Root Cathedral',15,'four-seals',[-22,-56,22,4],[0,0],{layer:'cave',depth:3,gem:'hollow-opal',returnArea:'cave-workings',returnPoint:p(12,-30)}),
]);
export const EXPANSION_AREA_BY_ID=Object.freeze(Object.fromEntries(EXPANSION_AREAS.map(a=>[a.id,a])));
export const EXPANSION_GEMS=Object.freeze([
 {id:'lantern-amethyst',name:'Lantern Amethyst',area:'cave-shallows',price:40,colour:0xb882e7},
 {id:'ember-garnet',name:'Ember Garnet',area:'cave-workings',price:70,colour:0xe76a55},
 {id:'hollow-opal',name:'Hollow Opal',area:'cave-cathedral',price:110,colour:0x94d9d7},
].map(Object.freeze));
const chapters=[],activities=[];
function chapter(id,title,who,areaId,level,needs,steps,reward){
 const ids=[],story=EXPANSION_STORY[id]??{};
 for(const [i,step]of steps.entries()){
  const [type,name,rawX,rawZ,extra={}]=step, x=(id==='green-supper'||id.startsWith('festival-')||id==='lantern-night')?[53.4,52.8,54][i%3]:id.startsWith('moor-')&&who==='corvus'?150:id==='moor-collection'?149.5:rawX, z=(id==='green-supper'||id.startsWith('festival-')||id==='lantern-night')?[31.4,29.3,32.5][i%3]:rawZ,aid=`${id}:${i+1}`;ids.push(aid);
  // The story file says what is there before the step (look), what doing it shows (found) and what a puzzle
  // gives away (clue). A clue found by reading stays with its own step as what was found.
  const told=story.steps?.[i]??{};
  activities.push(Object.freeze({id:aid,name,type,area:areaId,who,chapter:id,order:i,...(EXPANSION_AREA_BY_ID[areaId]?.layer==='cave'?p:sp)(x,z),...extra,verb:told.verb??STEP_VERBS[type],look:told.look,found:told.found??(type==='reveal'?undefined:extra.text),clue:told.clue}));
 }
 chapters.push(Object.freeze({id,title,who,area:areaId,level,needs,activities:ids,reward,blurb:story.blurb,intro:story.intro,done:story.done,change:story.change}));
}
chapter('green-research','The Ink Beneath the Roots','elowen','green',3,'legacy:invitation',[
 ['inspect','Read the moth-marked page',49.6,20,{text:'The roots repeat the same three marks: moth, moon, lantern.'}],
 ['puzzle','Put the remembered lights in order',49,24,{choices:['Moth','Moon','Lantern'],solution:['Moth','Moon','Lantern'],hint:'Follow the marks on the moth-marked page.'}],
 ['restore','Light the first ward lantern',51,25],
],{coins:60,effects:['green-research'],decor:['moth-lamp']});
chapter('green-workshop','A Door Worth Knocking On','rowan','green',4,'green-research',[
 ['inspect','Examine the loose workshop bell',64.8,20],
 ['puzzle','Balance Rowan’s bell frame',64.8,20,{choices:['Brace','Bell','Clapper'],solution:['Brace','Bell','Clapper'],hint:'A brace supports the bell; the clapper goes inside it.'}],
 ['restore','Hang the welcoming bell',64.8,20],
],{coins:80,effects:['green-workshop'],decor:['shelf-bracket']});
chapter('green-supper','A Seat for Somebody','vesper','green',5,'legacy:two-doorbells',[
 ['inspect','Find the supper place cards',57,25],
 ['puzzle','Arrange the supper table',57,26,{choices:['Rowan','Elowen','Vesper'],solution:['Rowan','Elowen','Vesper'],hint:'The carpenter sits beside the fresh timber, then the reader, then the host.'}],
 ['reveal','Join the lantern supper',57,27,{text:'The first supper begins. Rowan lifts his mug. Elowen opens the almanac. For the first time in years, every chair has someone to welcome.'}],
],{coins:120,effects:['green-seal'],decor:['midnight-reading-bench']});
chapter('copse-threads','A Stitch in the Dark','mabel','copse',6,'legacy:two-doorbells',[
 ['inspect','Study Mabel’s moving banner',-5,62,{text:'A moon rests above a moth. Beneath them, a stitched door stands open.'}],
 ['inspect','Follow Tansy’s healthy leaf marks',-4,81],
 ['puzzle','Reconstruct the living pattern',-5,65,{choices:['Moon','Moth','Door'],solution:['Moon','Moth','Door'],hint:'Read the banner from top to bottom.'}],
],{coins:100,effects:['tailoring'],costumes:['shane-scarecrow','natalie-mummy']});
chapter('copse-lantern','The Stone That Hums','tansy','cave-shallows',6,'copse-threads',[
 ['inspect','Read the old miners’ marks',0,-5,{text:'The oldest mark is a small bell, followed by a candle and then a star.'}],
 ['story-vein','Free the singing crystal',-7,-12,{gem:'lantern-amethyst',questGem:true}],
 ['puzzle','Answer the ringing stones',6,-20,{choices:['Bell','Candle','Star'],solution:['Bell','Candle','Star'],hint:'The miners’ marks show the ringing order.'}],
],{coins:100,effects:['copse-lantern'],materials:{herbs:3},decor:['mothlight-gem-lantern']});
chapter('copse-restored','Every Window a Welcome','mabel','copse',7,'copse-lantern',[
 ['puzzle','Turn the three garden lanterns',-4,73,{choices:['Root','Stem','Bloom'],solution:['Root','Stem','Bloom'],hint:'Follow the order of healthy growth.'}],
 ['restore','Lift the garden’s Blackroot anchor',-8,96],
 ['reveal','Watch Mabel open her door',-5,62,{text:'The courtyard breathes. A little light travels from Mabel’s window to Tansy’s garden, and the brambles fold back into the earth.'}],
],{coins:180,effects:['copse-restored','copse-seal','preservation-research','herb-beds'],estateDecor:{'herb-planter':2},decor:['mothlight-pattern-table']});
chapter('quarry-bell','The Stone That Rang','opal','quarry',9,'copse-restored',[
 ['inspect','Listen to Opal’s cracked bell',53,74],
 ['puzzle','Route the bridge lanterns',58,66,{choices:['Near','Middle','Far'],solution:['Near','Middle','Far'],hint:'Start on the bank you can already reach.'}],
 ['restore','Secure the bridge’s final brace',58,68],
],{coins:180,effects:['quarry-bell','footbridge'],decor:['mothlight-gem-lantern']});
chapter('quarry-supper','The Supper That Never Arrived','cinder','quarry',10,'quarry-bell',[
 ['inspect','Read the forgotten supper menu',66,70,{text:'A warm dish, a garden garnish and a bright lantern: three things the empty restaurant has been missing.'}],
 ['puzzle','Repair the restaurant’s oven lens',65,72,{choices:['Warm','Garden','Light'],solution:['Warm','Garden','Light'],hint:'The old menu names the missing pieces in order.'}],
 ['farm','Cook a new batch back at your farm',66,70,{metric:'cook',amount:1}],
],{coins:200,effects:['restaurant-recipe','cinder-recipe'],recipes:['cinders-lantern-stew']});
chapter('restaurant-opening','Supper After Midnight','cinder','quarry',10,'quarry-supper',[
 ['inspect','Place the restaurant’s welcome card',66,70],
 ['puzzle','Seat the first supper guests',64,73,{choices:['Carpenter','Reader','Cook'],solution:['Carpenter','Reader','Cook'],hint:'The host’s card lists carpenter, reader and cook.'}],
 ['reveal','Open Cinder’s restaurant',66,70,{text:'Cinder lays the first plate down with both ghostly hands. The chairs scrape back, the bell rings and a supper that waited years finally arrives.'}],
],{coins:220,effects:['restaurant-opening','quarry-seal','cold-store-blueprint','food-commissions','restaurant-commissions'],decor:['mothlight-cinder-serving-board']});
chapter('moor-stage','A Silent Midway','corvus','moor',12,'restaurant-opening',[
 ['inspect','Read Corvus’s abandoned programme',148,46],
 ['puzzle','Set the opening stage cues',146,49,{choices:['Lantern','Curtain','Bow'],solution:['Lantern','Curtain','Bow'],hint:'The audience needs light before the curtain rises, and the bow comes last.'}],
 ['restore','Raise the carnival curtain',147,47],
],{coins:250,effects:['moor-stage','ride-scenery','corvus-scenery'],decor:['recipe-teapot-shelf']});
chapter('moor-collection','A Guest, Not a Customer','baron','moor',13,'moor-stage',[
 ['inspect','Examine the Baron’s empty frame',148,68],
 ['puzzle','Arrange objects by their memories',147,67,{choices:['Gift','Promise','Home'],solution:['Gift','Promise','Home'],hint:'His note remembers a gift, then a promise, then a home.'}],
 ['restore','Make a welcoming corner in the manor',148,68],
],{coins:260,effects:['moor-collection','vip-reservations','baron-reservations'],decor:['mothlight-stained-glass']});
chapter('moor-restored','The Last Bow','corvus','moor',14,'moor-collection',[
 ['puzzle','Choose the final performance sequence',146,47,{choices:['Gather','Listen','Celebrate'],solution:['Gather','Listen','Celebrate'],hint:'Bring the neighbours together, hear their story, then celebrate.'}],
 ['restore','Light the last carnival lantern',151,50],
 ['reveal','Welcome the carnival’s first audience',147,47,{text:'The show begins softly. Corvus waits until every guest has a seat, and only then lets the stars spill from his sleeves.'}],
],{coins:300,effects:['moor-restored','moor-seal'],decor:['mothlight-lantern-night-diorama']});
chapter('marsh-reflections','The Path That Remembered','elowen','marsh',15,'four-seals',[
 ['inspect','Read the observatory’s reflected inscription',85,116],
 ['puzzle','Follow the remembered route',77,118,{choices:['Door','Supper','Lantern'],solution:['Door','Supper','Lantern'],hint:'Mothlight returned through open doors, a shared supper and lanterns.'}],
 ['restore','Raise the drowned stepping stones',75,120],
],{coins:300,effects:['marsh-reflections'],decor:['moth-lamp']});
chapter('marsh-heart','The Root Cathedral','elowen','cave-cathedral',16,'marsh-reflections',[
 ['story-vein','Reveal the cathedral’s memory opal',-10,-24,{gem:'hollow-opal',questGem:true}],
 ['puzzle','Align the mineral constellation',8,-30,{choices:['Root','Heart','Home'],solution:['Root','Heart','Home'],hint:'The roots lead to a heart, and the heart remembers home.'}],
 ['reveal','Hear the buried village memory',0,-35,{text:'The great root is hollow. Inside it, the echoes are not screams but doorbells, supper spoons and the voices of people who stopped visiting.'}],
],{coins:350,effects:['marsh-heart'],decor:['mothlight-stained-glass']});
chapter('marsh-restored','A Window for Every Light','opal','marsh',17,'marsh-heart',[
 ['puzzle','Set the observatory’s welcoming lights',85,116,{choices:['Green','Copse','Quarry','Moor'],solution:['Green','Copse','Quarry','Moor'],hint:'The lights follow the order in which you restored the village.'}],
 ['restore','Open the observatory window',85,118],
 ['reveal','Watch the marsh paths return',85,116,{text:'Across the marsh, each lamp answers another. No forgotten path has to remain forgotten.'}],
],{coins:400,effects:['marsh-restored','marsh-seal'],decor:['midnight-reading-bench']});
chapter('festival-prepare','An Invitation for Everyone','vesper','green',18,'marsh-restored',[
 ['inspect','Read Vesper’s festival programme',102,25],
 ['farm','Harvest a fresh festival basket',58,26,{metric:'harvest',amount:12}],
 ['farm','Cook two fresh festival batches at your farm',58,26,{metric:'cook',amount:2}],
],{coins:400,effects:['festival-prepare'],decor:['recipe-teapot-shelf']});
chapter('festival-arrange','The Village Is the Table','rowan','green',19,'festival-prepare',[
 ['puzzle','Choose the lantern-night programme',58,25,{choices:['Welcome','Supper','Stories','Show'],solution:['Welcome','Supper','Stories','Show'],hint:'Welcome the neighbours before supper; stories lead to the show.'}],
 ['restore','Supply the Lantern Night supper',58,27,{cost:{pumpkins:12,food:4},text:'Bring twelve unreserved pumpkins and four cooked portions for your neighbours.'}],
 ['inspect','Invite the last neighbour',57,26],
],{coins:450,effects:['festival-arrange'],decor:['mothlight-lantern-night-diorama']});
chapter('lantern-night','The Village That Remembered','elowen','green',20,'festival-arrange',[
 ['puzzle','Light the village’s five remembered places',58,26,{choices:['Green','Copse','Quarry','Moor','Marsh'],solution:['Green','Copse','Quarry','Moor','Marsh'],hint:'Follow the road your story took.'}],
 ['reveal','Begin Lantern Night',58,27,{text:'Every window is lit. Granny arrives carrying something that smells surprisingly like cake. Elowen closes the almanac, then opens a new page: Tomorrow.'}],
 ['restore','Keep the lantern-night promise',58,26],
],{coins:600,effects:['lantern-night'],costumes:['natalie-mummy','shane-scarecrow']});
chapter('granny-listens','The House That Listens','granny','acre',8,'copse-restored',[
 ['inspect','Read the scarecrow’s crooked rhyme',-42,82,{text:'Moon before crow, crow before thorn; knock on the door before supper is born.'}],
 ['puzzle','Ring the three field bells',-53,74,{choices:['Moon','Crow','Thorn'],solution:['Moon','Crow','Thorn'],hint:'The scarecrow’s rhyme names the order.'}],
 ['reveal','Knock on Granny’s listening house',-68,75,{text:'The window opens. “Well,” says Granny Brambletooth, “you remembered to knock. That puts you ahead of most crows.”'}],
],{coins:140,effects:['granny-listens','acre-shortcut'],decor:['coffin-planter']});
chapter('granny-bells','Three Bells Before Supper','granny','acre',9,'granny-listens',[
 ['inspect','Find Granny’s welcome recipe',-68,76],
 ['puzzle','Set the watchers’ welcome',-61,88,{choices:['Knock','Wait','Welcome'],solution:['Knock','Wait','Welcome'],hint:'Granny welcomes polite visitors: knock, wait, then welcome.'}],
 ['restore','Open the little garden gate',-61,83],
],{coins:160,effects:['granny-bells','granny-recipe'],recipes:['grannys-bramble-pudding']});
chapter('granny-eyes','Eyes for the Watchers','granny','acre',11,'granny-bells',[
 ['inspect','Study the watchers’ empty eyes',-58,72],
 ['puzzle','Restore the crystal watchers',-58,73,{choices:['Moon','Warmth','Memory'],solution:['Moon','Warmth','Memory'],hint:'Her note calls for moon, warmth and memory.'}],
 ['restore','Wake the kindest scarecrow',-59,74,{cost:{gems:{'lantern-amethyst':1,'ember-garnet':1}}}],
],{coins:200,effects:['granny-eyes','scarecrow-scenery'],decor:['moth-lamp']});
chapter('granny-table','A Place at the Table','granny','acre',14,'granny-eyes',[
 ['farm','Cook a fresh supper for Granny',-68,76,{metric:'cook',amount:1}],
 ['puzzle','Lay Granny’s remembered table',-68,76,{choices:['Cup','Plate','Chair'],solution:['Cup','Plate','Chair'],hint:'She asks for a cup, then a plate, then somewhere for a friend.'}],
 ['reveal','Share supper in the crooked house',-68,76,{text:'Granny takes the smallest chair. “I kept the big one,” she says, “in case someone came.”'}],
],{coins:240,effects:['granny-table'],decor:['mothlight-granny-rocker']});
chapter('granny-invited','Nobody Leaves Granny Behind','granny','acre',18,'granny-table',[
 ['inspect','Deliver Granny’s lantern invitation',-68,76],
 ['puzzle','Choose her festival keepsakes',-67,78,{choices:['Bell','Shawl','Lantern'],solution:['Bell','Shawl','Lantern'],hint:'Her packing list reads bell, shawl, lantern.'}],
 ['reveal','Walk Granny to her garden gate',-61,83,{text:'She locks the crooked door, then unlocks it again. “For next time,” Granny says. “We have a next time now.”'}],
],{coins:300,effects:['granny-invited'],costumes:['natalie-mummy','shane-scarecrow']});
const personal=CAST_CHAPTERS.map(c=>Object.freeze({...c,activities:c.activities.map(a=>a.id)}));
export const EXPANSION_CHAPTERS=Object.freeze([...chapters,...personal]);
const LIGHT_COMPONENTS=Object.freeze([{id:'near',label:'Near mirror',x:1,y:0,shape:'straight'},{id:'middle',label:'Middle mirror',x:2,y:0,shape:'elbow'},{id:'far',label:'Far mirror',x:2,y:1,shape:'elbow'}].map(Object.freeze));
export function normaliseExpansionActivity(activity){
 let a={...activity},kind=a.puzzleKind??(a.type==='puzzle'?'sequence':null);
 if(['quarry-bell:2','marsh-restored:1'].includes(a.id))kind='light-route';
 if(a.id==='quarry-supper:2'){kind='flavour-set';a.name='Remember Cinder’s supper flavours';a.choices=['Pumpkin','Herbs','Butter','Chilli'];a.solution=['Pumpkin','Herbs','Butter'];a.hint='A warm pumpkin dish, a garden garnish and a gentle buttery finish. There was no chilli on the old menu.';}
 if(['moor-stage:2','moor-restored:1','festival-arrange:1'].includes(a.id))kind='stage-slots';
 if(kind==='light-route')a={...a,components:a.components??LIGHT_COMPONENTS,source:{x:0,y:0,direction:'E'},exit:{x:3,y:1},hint:'Turn the mirrors so the lantern beam travels from the entry arrow to the star. A straight mirror must join opposite sides; corner mirrors join two sides.'};
 if(kind==='stage-slots')a={...a,slots:a.slots??a.solution.map((_,i)=>['Entrance','Stage','Finale','Curtain call','Encore'][i]??`Position ${i+1}`)};
 return Object.freeze({...a,puzzleKind:kind});
}
export const EXPANSION_ACTIVITIES=Object.freeze([...activities,...CAST_CHAPTERS.flatMap(c=>c.activities.map((a,i)=>({...a,chapter:c.id,order:i})))].map(normaliseExpansionActivity));
export const EXPANSION_VEINS=Object.freeze(EXPANSION_AREAS.filter(a=>a.layer==='cave').flatMap(a=>[[-11,-10],[-6,-13],[8,-11],[12,-16],[-13,-22],[-6,-25],[8,-26],[12,-32],[-12,-38],[-4,-41],[8,-43],[12,-49]].map(([x,z],i)=>Object.freeze({id:`mine:${a.id}:${i+1}`,name:`${a.depth===1?'Lantern stone':a.depth===2?'Old iron seam':'Cathedral crystal'} ${i+1}`,type:'vein',area:a.id,...p(x,z),gem:a.gem,depth:a.depth}))));
export const EXPANSION_VEIN_BY_ID=Object.freeze(Object.fromEntries(EXPANSION_VEINS.map(v=>[v.id,v])));
export const EXPANSION_CHAPTER_BY_ID=Object.freeze(Object.fromEntries(EXPANSION_CHAPTERS.map(c=>[c.id,c])));
export const EXPANSION_ACTIVITY_BY_ID=Object.freeze(Object.fromEntries(EXPANSION_ACTIVITIES.map(a=>[a.id,a])));
// Every requirement is achievable before the level it gates; friendship stories stay optional.
export const EXPANSION_LEVEL_GATES=Object.freeze({
 6:Object.freeze(['green-research','green-workshop','green-supper']),
 7:'copse-lantern',8:'copse-restored',9:Object.freeze(['copse-restored','green-seal']),
 10:'quarry-bell',11:'quarry-supper',12:'restaurant-opening',
 13:'moor-stage',14:'moor-collection',15:'four-seals',
 16:'marsh-reflections',17:'marsh-heart',18:'marsh-restored',
 19:'festival-prepare',20:'festival-arrange',
});
