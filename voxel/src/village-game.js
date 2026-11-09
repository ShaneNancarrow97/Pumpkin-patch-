import { installFurnitureSetArt } from './ui/furniture-set-icons.js';
import { installVillageUIArt, villageUIIcon } from './ui/village-ui-icons.js';
import { createVillageProximity } from './village-proximity.js';
import { createVillageWanderers } from './village-wanderers.js';
import { createVillageFarmReminder } from './ui/village-farm-reminder.js';
import * as Expansion from './content/village-expansion.js';
import { expansionIcon } from './ui/village-expansion-icon-markup.js';
import { installVillageExpansionArt } from './ui/village-expansion-art.js';
import { renderVillageExpansionEconomy, bindVillageExpansionEconomy } from './ui/village-expansion-economy.js';
import { companionInfo, selectVillageCompanion, markExpansionNeighbourMet } from './rules/village-expansion-companions.js';
import { expansionJournalMarkup, expansionMapMarkup, expansionActivityMarkup, expansionRewardMarkup } from './ui/village-expansion-pages.js';
// Mothlight's first saved visit. The scene owns the picture; this controller
// owns input and calls the village's existing rules for every transaction.
import * as THREE from "three";
import * as M from "./model.js";
import { PLAN_SCALE as K, ARRIVAL, FIXTURES, NODES, MATERIALS, FORAGE_AREAS } from "./content/village.js";
import { villageNodePosition } from "./content/village-node-sites.js";
import { FOLK_BY_ID, HOST_BY_ID } from "./content/village-folk.js";
import { VILLAGE_DECOR_BY_ID } from "./content/village-decor.js";
import { QUEST_BY_ID, BLUEPRINTS } from "./content/village-quests.js";
import { INSIDES, DOOR_NORMAL } from "./village-view.js";
import { moveVillageWalker, moveVillageHallWalker, villageCellFree } from "./rules/village-navigation.js";
import { animateSprite } from "./sprite-voxels.js";
import { LEAN } from "./world.js";
import { gaitPhase, BASE_OWNER_STRIDE } from "./directional-sprite-math.js";
import { createVillageConversation } from "./ui/village-conversation.js";
import { villageSpritePortrait } from "./village-sprite-actors.js";
import { tourVoiceText } from "./content/village-tour.js";
import { createNarrationControls } from "./ui/narration-controls.js";
import { createVillageControls, villageCameraLook } from "./ui/village-controls.js";
import { createVillageReturnPrompt } from "./ui/village-return-prompt.js";
import { createVillageQuestReceipt } from "./ui/village-quest-receipt.js";
import { createVillageDecorate } from "./ui/village-decorate.js";
import { renderVillageChapter } from "./ui/village-chapters.js";
import { createVillagePanelTrail, villagePanelSection } from "./ui/village-panel-trail.js";
import { trackerPortraitMarkup, trackerDetailsMarkup, trackerToggleHintMarkup } from "./ui/village-quest-tracker.js";
import { gardenSpriteIcon } from "./ui/garden-icons.js";
import { villageItemIcon } from "./ui/village-item-markup.js";
import { installVillageItemArt } from "./ui/village-item-art.js";
import { decorIcon } from "./ui/kit.js";

const escape = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"£"+Math.round(n).toLocaleString("en-GB");
const GATHER_REACH=2.1, TALK_REACH=3, HALL_TALK_REACH=3.3;
const GATHER_CONTACTS=Object.freeze([.3,.8,1.3]);
const NAVIGATION = [["map","Map","map","Places and routes"],["people","People","people","Find your neighbours"],["journal","Quests","quests","Your next step"],["materials","Satchel","satchel","Materials and supplies"],["upgrades","Workshop","workshop","Useful improvements"],["decorate","Build","build","Make the village yours"]];
function navigationMarkup(hub=false) {
  return NAVIGATION.map(([id,label,icon,hint])=>`<button ${id==="decorate"?(hub?'data-vg-decorate':'id="vg-decorate"'):`data-vg-page="${id}"`} class="${hub?'vg-nav-card':'vg-nav-button'}">${villageUIIcon(icon,hub?36:28)}<span><b>${label}</b>${hub?`<small>${hint}</small>`:""}</span></button>`).join("");
}
export function createVillageGame({ state, scene, save, notice, closeMenus = () => {}, onLeave = () => {}, onRender = () => {}, onGatherSound = () => {}, conversationView = createVillageConversation, portrait = villageSpritePortrait, narration, savePrefs = () => {}, prefs = {}, onFullscreen = () => {}, controlsView = createVillageControls, decorateView = createVillageDecorate, returnPromptView = createVillageReturnPrompt, questReceiptView = createVillageQuestReceipt, itemArt = item => item.kind === "home" ? decorIcon(item.id, 56) : gardenSpriteIcon(item.id) || villageItemIcon(item.id) }) {
  installVillageItemArt(); installFurnitureSetArt(); installVillageUIArt(); installVillageExpansionArt();
  const root=document.createElement("section");root.id="village-game";root.hidden=true;root.setAttribute("aria-label","Mothlight Village");
  root.innerHTML=`<header class="vg-heading"><button id="vg-home" aria-label="Return to the farm">${villageUIIcon("farm",24)} <span>Farm</span></button><div><small>Mothlight Village</small><b id="vg-place">Hollow Green</b></div><span id="vg-coins" aria-label="Coins"></span><button id="vg-person" aria-label="Switch playable character">Shane</button><button id="vg-fullscreen" aria-label="Toggle fullscreen" title="Fullscreen">⛶</button></header><section id="vg-objective" class="vg-objective" aria-label="Followed quest" hidden><button id="vg-quest-toggle" class="vg-quest-toggle" aria-expanded="false" aria-controls="vg-quest-details" aria-keyshortcuts="T" title="Expand quest details · D-pad Up / T"><span id="vg-quest-portrait" class="vg-quest-portrait" aria-hidden="true"></span><span class="vg-quest-copy"><span class="vg-quest-heading"><strong id="vg-quest-title"></strong><small id="vg-quest-counts"></small></span><span id="vg-task"></span></span>${trackerToggleHintMarkup()}</button><div id="vg-quest-details" class="vg-quest-details" hidden></div><small id="vg-wayfinding" hidden></small></section><button id="vg-farm-rate" class="vg-farm-rate" aria-label="Farm production while exploring · open workshop"><span>Farm at work</span><b id="vg-rate">2.5%</b></button><div id="vg-gather" class="vg-gather" role="status" aria-live="polite" hidden><span id="vg-gather-art" aria-hidden="true"></span><div><b id="vg-gather-label"></b><span class="vg-gather-track"><i id="vg-gather-fill"></i></span></div></div><div id="vg-tour" class="vg-tour" hidden><b></b><span></span><button id="vg-tour-skip">Skip tour</button></div><nav class="vg-dock" aria-label="Village actions">${navigationMarkup()}</nav><aside id="vg-panel" hidden role="dialog" aria-modal="false" aria-labelledby="vg-panel-title"><header><button id="vg-panel-back" aria-label="Back to previous page" hidden><span aria-hidden="true">‹</span></button><div class="vg-panel-heading"><small id="vg-panel-tag"></small><h2 id="vg-panel-title"></h2></div><button id="vg-panel-close" aria-label="Close village panel">×</button></header><div id="vg-panel-body"></div></aside><div id="vg-stick-zone" aria-label="Movement thumbstick"><div id="vg-stick" hidden><i></i></div></div><button id="vg-interact" class="vg-interact" hidden>Talk</button><button id="vg-look" class="vg-look" aria-label="Centre the camera">◎</button>`;
  document.body.append(root);
  const farmReminder=createVillageFarmReminder(),reminder=document.createElement("div");reminder.className="vg-farm-reminder";reminder.hidden=true;reminder.setAttribute("role","status");reminder.setAttribute("aria-live","polite");reminder.innerHTML=`${villageUIIcon("farm",28)}<span>A little check on your farm?<small>Your pumpkins are still growing back home.</small></span>`;root.append(reminder);
  const invitation=document.createElement("button");invitation.id="village-invitation";invitation.hidden=true;invitation.textContent="A letter from Elowen  ›";invitation.onclick=()=>open();document.body.append(invitation);
  const $=id=>root.querySelector("#"+id),view=scene.villageView;
  const proximity=createVillageProximity(view.scene,(x,z)=>view.expansionGroundAt?.(x,z)??view.groundAt(x,z));
  const wanderers=createVillageWanderers({scene:view.scene,state,createVisitor:kind=>scene.villageVisitor?.(kind),groundAt:(x,z)=>view.groundAt(x,z)});
  let surveying=false,active=false,who="shane",actor=null,walkingAge=0,clock=0,idle=0,page=null,offered=null,oldPlayer=null,dialogueDone=null,chat=null,greeting=null,dialogueChoices=new Set(),dialogueCameraOwned=false,tourLine=null,waypoint=null,gather=null,gatherSerial=0,questExpanded=false,questHudSignature="",latestPad=null,returnPathArmed=true,wasPaused=!!state().paused,expansionSlot=null,expansionCached=[],expansionCachedAt=-1,expansionReceiptRemaining=0;
  const tourVoices=createNarrationControls({mount:$("vg-tour"),narration,savePrefs,line:()=>view.director.active?tourLine:null});
  if(narration){$("vg-tour-skip").setAttribute("data-voice-skip","");tourVoices.element.append($("vg-tour-skip"));}
  const pos={x:ARRIVAL.spawn[0],z:ARRIVAL.spawn[1]},heading={x:0,z:-1},keys=new Set();
  const spriteRight=new THREE.Vector3(),spriteForward=new THREE.Vector3();
  const dialogue=conversationView({portrait,narration,savePrefs,onChoice(index,meta){
    if(meta?.choice&&!dialogueChoices.has(meta.choice))return false;
    if(greeting){
      const session=greeting,choice=session.choices[index],run=session.actions[index];
      if(!choice||choice.disabled||!run||meta&&(meta.id!==session.who||meta.choice!==choice))return false;
      // Closing clears the old session. Capture its action first, then let a
      // real transaction open a fresh chat/menu without a generic reply.
      dialogue.close(false);run();return{handled:true};
    }
    // Scripted story answers still use the presenter's own choice.reply.
    if(!chat)return undefined;if(meta&&(meta.id!==chat.who||meta.choice!==chat.choices[index]))return false;
    if(!besideNeighbour(chat.who)){dialogue.close(false);return{handled:true};}
    const result=M.answerChat(state(),chat.who,chat.id,index);if(!result)return false;changed(result.events);chat=null;return result.reply;
  },onContinue({finished}){if(!finished)return;const done=dialogueDone;dialogueDone=null;dialogue.close();done?.();},onClose(id){if(id)view.folk.mood(id,"idle");releaseInput();view.dialogueCamera?.end();dialogueDone=null;chat=null;greeting=null;dialogueChoices.clear();}});
  const returnPrompt=returnPromptView({onConfirm(){releaseInput();close();},onCancel(){releaseInput();render();}});
  const questReceipts=questReceiptView({onOpenQuests(){if(active&&!dialogue.active&&!returnPrompt.active)showPanel("journal");}});
  const expansionReceipt=document.createElement("aside");expansionReceipt.className="vgx-milestone";expansionReceipt.hidden=true;expansionReceipt.setAttribute("role","status");expansionReceipt.setAttribute("aria-live","polite");root.append(expansionReceipt);
  const busy=()=>returnPrompt.active||!!page||dialogue.active||!!view.dialogueCamera?.active||view.director.active||state().paused||!!gather;
  const controls=controlsView({root,blocked:()=>busy()||decorate.active,onRelease:()=>keys.clear()});
  const decorate=decorateView({state,view,root,notice,onMenuInput:(surface,pad)=>controls.handleMenu(surface,pad),onInputReset:()=>controls.release(),onChanged:events=>changed(events),actorPosition:()=>({...pos}),onClose(){releaseInput();centre();render();},onShop:()=>showPanel("stall")});
  let panelSignature="",panelAge=0,panelOpener=null;
  const panelTrail=createVillagePanelTrail();
  function openDecorate(options={}) {
    if(!active||returnPrompt.active||view.director.active||dialogue.active||state().paused)return false;
    if(view.activeExpansionArea){notice("Decorate the village gardens above ground.");return false;}
    proximity.hide();cancelGather();if(view.inside)leaveHall();closePanel();releaseInput();surveying=true;view.play.pause?.();
    return decorate.open(options);
  }
  function namedExpansionRewards(rows=[]){return rows.map(row=>{const catalog=row.kind==="costume"?M.costumeById:row.kind==="recipe"?M.RECIPE_BY_ID:row.kind==="village-decor"?VILLAGE_DECOR_BY_ID:row.kind==="estate-decor"?M.ESTATE_DECOR_BY_ID:M.decorById;const name=catalog?.[row.id]?.name??M.decorById?.[row.id]?.name??VILLAGE_DECOR_BY_ID[row.id]?.name??M.ESTATE_DECOR_BY_ID?.[row.id]?.name;return name?{...row,name}:row;});}
  function expansionRecords(){if(!M.expansionJournal)return[];if(clock-expansionCachedAt>.2||expansionCachedAt<0){expansionCached=M.expansionJournal(state()).map(chapter=>({...chapter,rewards:namedExpansionRewards(chapter.rewards)}));expansionCachedAt=clock;}return expansionCached;}
  function trackedExpansion(){const records=expansionRecords(),saved=state().village.expansion?.tracked;return records.find(c=>c.id===prefs.villageTrackedQuest)??records.find(c=>c.id===saved)??null;}
  function followExpansion(id){const chapter=expansionRecords().find(c=>c.id===id&&c.status!=="done");if(!chapter)return false;if(prefs.villageTrackedQuest===id&&state().village.expansion?.tracked===id)return true;prefs.villageTrackedQuest=id;M.actVillageExpansion?.(state(),"track",{chapter:id});savePrefs();save();return true;}
  function currentArea(){if(view.activeExpansionArea)return view.activeExpansionArea;return Expansion.EXPANSION_AREAS.find(a=>a.layer!=="cave"&&pos.x>=a.bounds[0]&&pos.x<=a.bounds[2]&&pos.z>=a.bounds[1]&&pos.z<=a.bounds[3])?.id??(state().village.expansion?.area&&!state().village.expansion.area.startsWith("cave")?state().village.expansion.area:"green");}
  function expansionContext(){return{area:currentArea(),x:pos.x,z:pos.z};}
  function nearActivity(info){return !!info&&!view.inside&&info.area===currentArea()&&Math.hypot(info.x-pos.x,info.z-pos.z)<=TALK_REACH;}
  function expansionInfo(id){return M.expansionActivityInfo?.(state(),id)??Expansion.EXPANSION_ACTIVITY_BY_ID[id];}
  function onEvent(e){
    if(e.type==="expansion-chapter-complete"){
      expansionCachedAt=-1;const chapter=Expansion.EXPANSION_CHAPTER_BY_ID[e.chapter??e.id],title=e.title??chapter?.title??"Village chapter";
      expansionReceipt.innerHTML=`<small>Chapter complete</small><h3>${escape(title)}</h3><p>The village remembers what you did.</p>${expansionRewardMarkup(namedExpansionRewards(e.rewards))}`;expansionReceiptRemaining=6;expansionReceipt.hidden=false;return true;
    }
    if(e.type?.startsWith("expansion-")){expansionCachedAt=-1;return true;}

    if(e.type==="village-resource-ready"){if(active)view.sync();render();return true;}
    if(e.type==="quest-done"){if(active)questReceipts.notify(e);else notice(`${QUEST_BY_ID[e.quest]?.title??"Quest"} complete · rewards received`);}
    else if(e.type==="friend-level")notice(`${FOLK_BY_ID[e.who]?.short??e.who} · ${M.friendshipWith(state(),e.who)?.title??"Friendship grew"}`);
    else if(e.type==="almanac-page")notice(`Almanac page complete · keepsakes added to your collection`);
    else if(e.type==="duty")notice(`Almanac task complete · +${money(e.coins)}`);
    else if(e.type==="quest-step"){
      const step=QUEST_BY_ID[e.quest]?.steps[e.step];if(step?.kind!=="build")return false;
      notice(`${BLUEPRINTS.find(b=>b.id===step.blueprint)?.name??"Your neighbour's home"} restored`);
    }else return false;
    return true;
  }
  function changed(events=[]){expansionCachedAt=-1;save();view.sync();render();for(const e of events??[])onEvent(e);}
  function conversation(id,lines,done,headingText,options={}){
    cancelGather();releaseInput();closePanel();const f=FOLK_BY_ID[id]??HOST_BY_ID[id];dialogueDone=done;chat=null;greeting=null;view.folk.mood(id,"talk");
    dialogueChoices=new Set([...(Array.isArray(lines)?lines:[lines]).flatMap(line=>line?.choices??[]),...(options.choices??[])]);
    const neighbour=neighbourFeet(id);if(neighbour&&Math.hypot(neighbour.x-pos.x,neighbour.z-pos.z)<9)view.dialogueCamera?.begin({...pos,y:actor?.position.y},neighbour);
    dialogueCameraOwned=!!view.dialogueCamera?.active;
    dialogue.open({id,name:f?.name??id,role:f?.role??"",lines,friendship:M.friendshipWith(state(),id),heading:headingText,...options});
    updateOwnerView(false,true);
  }
  // Selection names a destination; only standing beside a neighbour starts a
  // conversation or spends quest items. Roaming residents use their live post.
  function neighbourPoint(id){
    const hall=INSIDES[view.inside];
    if(hall?.host===id){const p=view.hallPoint(...hall.hall.host);return{x:p.x,z:-p.z,inside:view.inside};}
    if(!view.inside){const spot=(view.expansionTargets??[]).find(t=>t.type==="village-folk"&&t.id===id);if(spot)return{...spot,folkId:id};if(["elowen","rowan"].includes(id))return{...view.folk.talkSpot(id),folkId:id};}
    const entry=Object.entries(INSIDES).find(([,plan])=>plan.host===id);
    if(!entry)return null;const[hallId,plan]=entry,[nx,nz]=DOOR_NORMAL[plan.door.facing];
    return{x:(plan.door.x+nx*3.2)*K,z:(plan.door.z+nz*3.2)*K,hallId};
  }
  // A talk destination is a clear place to stand, often across a counter.
  // Cinematic subjects instead use the resident's actual feet in this realm.
  function neighbourFeet(id){
    const hall=INSIDES[view.inside];
    if(hall?.host===id){const p=view.hallPoint(hall.hall.host[0],hall.hall.host[1],.12);return{x:p.x,y:p.y,z:-p.z,inside:view.inside};}
    const point=view.folk.spotOf?.(id);return point&&Number.isFinite(point.x)&&Number.isFinite(point.z)?{...point,y:Number.isFinite(point.y)?point.y:view.groundAt(point.x,point.z),folkId:id}:null;
  }
  function besideNeighbour(id){
    if(!active||view.director.active||state().paused||decorate.active)return false;
    const point=neighbourPoint(id),name=(FOLK_BY_ID[id]??HOST_BY_ID[id])?.short??id;
    const samePlace=point&&(view.inside?point.inside===view.inside:!point.hallId);
    if(samePlace&&Math.hypot(point.x-pos.x,point.z-pos.z)<(view.inside?HALL_TALK_REACH:TALK_REACH))return true;
    closePanel();releaseInput();offered=null;
    if(!point){notice("This neighbour's story opens with a later district.");return false;}
    guide(point,point.hallId?`${name} · ${INSIDES[point.hallId].name}`:name);centre();
    notice(view.inside?`Walk over to ${name}, or return to Hollow Green to find them.`:point.hallId?`Find ${name} inside ${INSIDES[point.hallId].name}.`:`Walk to ${name}, then choose Talk beside them.`);
    return false;
  }
  function meet(id){
    if(!active||returnPrompt.active||dialogue.active||view.director.active||state().paused||!besideNeighbour(id))return;const s=state(),host=HOST_BY_ID[id];
    if(host){conversation(id,[host.greet[s.village.visits%host.greet.length]],null);return;}
    if(!s.village.friends[id]){notice("This neighbour's story opens with a later district.");return;}
    const firstMeeting=markExpansionNeighbourMet(s,id);if(firstMeeting.changed){save();view.sync();}
    const talk=M.talkStep(s,id);if(talk){conversation(id,talk.lines,()=>{if(besideNeighbour(id))changed(M.finishTalk(state(),talk.quest,id));},QUEST_BY_ID[talk.quest].title);return;}
    greetNeighbour(id);
  }
  function greetNeighbour(id){
    const s=state(),f=FOLK_BY_ID[id],choices=[],actions=[];
    const add=(choice,run)=>{choices.push({...choice,text:choice.label});actions.push(run);};
    const wait=Math.max(0,Math.ceil(s.village.friends[id]?.chatIn??0)),chatReady=M.canChat(s,id)&&!!M.nextChat(s,id);
    add({id:"chat",intent:"chat",label:"Have a chat",disabled:!chatReady,description:chatReady?"A little catch-up":wait?`Ready in ${wait>=60?`${Math.floor(wait/60)}m `:""}${wait%60}s`:"No new chat just now"},()=>startTalk(id));
    const delivery=M.handOver(s,id);
    if(delivery?.ok)add({id:`quest:deliver:${delivery.quest}`,intent:"quest",label:"I brought what you need",description:QUEST_BY_ID[delivery.quest].title},()=>handOverTo(id,delivery.quest));
    for(const q of M.offeredBy(s,id))add({id:`quest:start:${q.id}`,intent:"quest",label:q.title,description:"I'd like to help"},()=>takeQuest(q.id));
    for(const chapter of expansionRecords().filter(c=>c.giver===id&&["available","active"].includes(c.status))){const next=chapter.next;add({id:`expansion:${chapter.id}`,intent:"quest",label:chapter.title,description:next?.name??next?.text??"A story waiting to unfold"},()=>{if(next){followExpansion(chapter.id);showPanel("expansion",next.id);}else showPanel("journal");});}
    if(["rowan","tansy","opal","cinder","granny"].includes(id))add({id:"farm-gifts",intent:"workshop",label:id==="cinder"?"Restaurant orders":"Bring a discovery home",description:"Useful recipes, equipment and commissions"},()=>{if(besideNeighbour(id))showPanel("farm-gifts",id);});
    const companion=companionInfo(s,id,currentArea(),{areaOpen:area=>!!M.expansionAreaInfo?.(s,area)?.open});
    add({id:"companion",intent:"companion",label:companion.selected?"Explore on my own":"Come exploring with me",disabled:!companion.selected&&!companion.canSelect,description:companion.reason},()=>{if(!besideNeighbour(id))return;const result=selectVillageCompanion(state(),companion.selected?null:id,currentArea(),{areaOpen:area=>!!M.expansionAreaInfo?.(state(),area)?.open});if(result.ok){changed(result.events);view.setExpansionCompanion?.(companion.selected?null:id);notice(companion.selected?"See you soon.":`${f.short??f.name} is exploring with you.`);}else notice(result.reason);});
    const presents=M.giftsLeft(s,id),hasGift=M.giftable(s).length>0;
    add({id:"gift",intent:"gift",label:"Give a present",disabled:presents<=0||!hasGift,description:presents<=0?"More presents after a little rest":hasGift?`${presents} present${presents===1?"":"s"} left`:"Find a little something for your satchel"},()=>{
      if(!besideNeighbour(id))return;showPanel("resident",id);
      const gifts=$("vg-panel-body").querySelector(`[data-vg-details-key="gifts:${id}"]`);if(gifts){gifts.open=true;gifts.scrollIntoView?.({block:"nearest"});gifts.querySelector("button:not(:disabled)")?.focus({preventScroll:true});panelTrail.remember(panelView());}
    });
    add({id:"about",intent:"about",label:`More about ${f.short??f.name}`,description:"Friendship, stories and favourites"},()=>{if(besideNeighbour(id))showPanel("resident",id);});
    add({id:"leave",intent:"leave",label:"See you soon"},()=>{});
    conversation(id,[{text:f.greet[s.village.visits%f.greet.length],choices}],null,undefined,{intent:"greeting"});
    greeting={who:id,choices,actions};
  }
  function takeQuest(id){
    const q=QUEST_BY_ID[id];if(!q||!besideNeighbour(q.giver)||M.questStatus(state(),id)!=="offered")return false;
    changed(M.startQuest(state(),id));conversation(q.giver,q.intro??[q.blurb],()=>showPanel("journal"),q.title,{intent:"quest"});return true;
  }
  function handOverTo(id,questId,fromJournal=false){
    if(!besideNeighbour(id))return false;const result=M.doHandOver(state(),id,questId);if(!result)return false;
    changed(result);if(fromJournal)drawPanel();else meet(id);return true;
  }
  function startTalk(id){
    if(!besideNeighbour(id))return;const s=state(),c=M.nextChat(s,id);if(!M.canChat(s,id)||!c){conversation(id,FOLK_BY_ID[id].greet,null);return;}
    conversation(id,[...c.lines,{choices:c.choices}],null,undefined,{intent:"chat"});chat={who:id,id:c.id,choices:c.choices};
  }
  // Keep the player's place by logical page/fold/action, even when live counts
  // redraw a menu. Closing a linked map should not discard the quest beneath it.
  const foldKey=(d,i)=>d.dataset.vgDetailsKey||d.id||`fold:${i}`;
  const focusKey=el=>!el?null:{id:el.id||null,tag:el.tagName,data:Object.entries(el.dataset??{}).filter(([k])=>k.startsWith("vg")||k==="quest"||k==="who"),text:el.textContent?.trim().slice(0,80)};
  const matchesFocus=(el,key)=>key&&(key.id?el.id===key.id:el.tagName===key.tag&&(key.data.length?key.data.every(([k,v])=>el.dataset[k]===v):el.textContent?.trim().slice(0,80)===key.text));
  const usable=el=>el&&!el.disabled&&!el.closest('[hidden],[inert]')&&el.getClientRects().length;
  function panelView(){const body=$("vg-panel-body"),focused=document.activeElement;return{scroll:body.scrollTop||0,folds:[...body.querySelectorAll("details")].map((d,i)=>[foldKey(d,i),!!d.open]),focus:focused?.closest?.("#vg-panel-body")===body?focusKey(focused):null};}
  function restorePanel(view,focus=false){
    const body=$("vg-panel-body"),folds=new Map(view?.folds??[]);
    [...body.querySelectorAll("details")].forEach((d,i)=>{const key=foldKey(d,i);d.querySelector("summary")?.setAttribute("data-vg-fold",key);if(folds.has(key))d.open=folds.get(key);});
    if(focus){const choices=[...body.querySelectorAll("button,summary")].filter(usable);const target=choices.find(b=>matchesFocus(b,view?.focus))??choices.find(b=>b.hasAttribute?.("data-pad-default"))??choices[0]??$("vg-panel-close");target?.focus({preventScroll:true});}
    body.scrollTop=view?.scroll??0;
  }
  function closePanel(restoreFocus=false){
    if(page){panelTrail.remember(panelView());releaseInput();}panelTrail.dismiss();page=null;panelSignature="";$("vg-panel").hidden=true;root.classList.remove("has-panel");delete root.dataset.panel;
    if(restoreFocus&&panelOpener?.isConnected)panelOpener.focus({preventScroll:true});
  }
  function showPanel(kind,id,{root:topLevel=false}={}){
    if(!active||returnPrompt.active||view.director.active||dialogue.active)return;
    if(!page||topLevel)panelOpener=document.activeElement;const viewState=page?panelView():null;
    cancelGather();decorate.close();releaseInput();page=panelTrail.open(kind,id,{root:topLevel,replace:page?.kind===kind&&page.id!=null&&id!=null,view:viewState});
    $("vg-panel").hidden=false;root.classList.add("has-panel");root.dataset.panel=kind;panelSignature="";drawPanel(true);
  }
  function panelBack(){const previous=panelTrail.back(panelView());if(!previous){closePanel(true);return;}releaseInput();page=previous;root.dataset.panel=page.kind;panelSignature="";drawPanel(true);}
  function dockPage(kind){if(page?.kind===kind&&!page.id){closePanel(true);return;}showPanel(kind,undefined,{root:true});}
  function requestReturn(reason="button"){
    if(!active||returnPrompt.active)return false;
    const opener=document.activeElement;
    if(reason==="path")returnPathArmed=false;
    cancelGather();dialogue.close(false);decorate.close();closePanel();releaseInput();offered=null;
    returnPrompt.open({source:controls.source,pad:latestPad,opener});return true;
  }
  const button=(label,attrs,disabled=false)=>`<button ${attrs} ${disabled?"disabled":""}>${label}</button>`;
  function drawPanel(initial=false){
    if(!page)return;const s=state(),{kind,id}=page,body=$("vg-panel-body"),scroll=body.scrollTop,focused=document.activeElement;
    const savedView=initial?panelTrail.view():panelView(),restoreFocus=initial||focused?.closest?.("#vg-panel-body")===body;
    let title="",tag="Hollow Green",html="";
    if(kind==="people") {
      title="Your neighbours";tag="People of Hollow Green";
      html='<p class="vg-menu-lead">Choose a neighbour to talk nearby, or mark the way to them.</p>'+[...Object.keys(state().village.friends),"vesper"].filter(id=>FOLK_BY_ID[id]||HOST_BY_ID[id]).map(id=>{
        const f=FOLK_BY_ID[id]??HOST_BY_ID[id],bond=M.friendshipWith(s,id),image=portrait(id),point=neighbourPoint(id),distance=point?Math.hypot(point.x-pos.x,point.z-pos.z):null;
        const nearby=point&&(view.inside?point.inside===view.inside:!point.hallId)&&distance<(view.inside?HALL_TALK_REACH:TALK_REACH),offers=M.offeredBy(s,id);
        const place=point?.hallId?INSIDES[point.hallId].name:point?.inside?INSIDES[point.inside].name:"Hollow Green";
        return `<button class="vg-neighbour" data-vg-meet="${id}" data-pad-label="${nearby?"Talk to":"Find"} ${escape(f.short??f.name)}">${image?`<img src="${image}" alt="">`:""}<span><b>${escape(f.name)}</b><small>${escape(bond?.met?`Friendship ${bond.level} · ${bond.title}`:f.role)}</small><span class="vg-neighbour-place">${escape(place)}${distance!=null?` · ${Math.round(distance)} m`:""}${offers.length?' · New story':""}</span></span><em>${nearby?"Talk":"Find"}<span aria-hidden="true"> ›</span></em></button>`;
      }).join("");
    }
    if(kind==="resident"){
      const f=FOLK_BY_ID[id],bond=M.friendshipWith(s,id),delivery=M.handOver(s,id),offers=M.offeredBy(s,id),fav=M.favourOf(s,id),priority=delivery?.ok?"delivery":offers.length?"quest":"chat",image=portrait(id);title=f.name;tag=`Friendship ${bond.level} · ${bond.title}`;
      html=`<div class="vg-resident-summary">${image?`<img src="${image}" alt="">`:""}<div><b>${escape(f.role)}</b><small>${escape(bond.title)}</small><meter value="${bond.progress??0}" min="0" max="1" aria-label="Friendship progress"></meter></div></div><div class="vg-resident-actions"><button class="vg-ch-action${priority==="chat"?" vg-ch-primary":""}" data-vg-chat="${id}"${priority==="chat"?" data-pad-default":""}>${M.canChat(s,id)?"Have a chat":"Say hello"}</button></div>`;
      if(delivery)html+=`<article class="vg-resident-task"><small>${escape(QUEST_BY_ID[delivery.quest].title)}</small><h3>${escape(delivery.step.text)}</h3>${delivery.ok?`<button class="vg-ch-action vg-ch-primary" data-vg-handover="${id}" data-pad-default>Hand over</button>`:`<p>Gather the remaining supplies, then bring them back here.</p><button class="vg-ch-action" data-vg-page="materials">Check your satchel</button>`}</article>`;
      html+=offers.map((q,i)=>`<article class="vg-resident-task"><small>New story</small><h3>${escape(q.title)}</h3><p>${escape(q.blurb)}</p><button class="vg-ch-action vg-ch-primary" data-vg-start="${q.id}"${priority==="quest"&&!i?" data-pad-default":""}>I'd like to help</button></article>`).join("");
      if(fav)html+=`<article class="vg-resident-task"><small>A little favour</small><h3>${escape(fav.text??fav.title??`${fav.n} ${M.villageItemName(fav.item,fav.n)}`)}</h3><p>${fav.n} ${escape(M.villageItemName(fav.item,fav.n))} · ${money(fav.pay)}</p>${button("Deliver",`data-vg-favour="${id}"`,M.villageItemCount(s,fav.item)<fav.n)}</article>`;
      const gifts=M.giftable(s);html+=`<details data-vg-details-key="gifts:${id}"><summary>Give a present · ${M.giftsLeft(s,id)} left</summary><p class="vg-menu-lead">A small gift helps your friendship grow.</p><div class="vg-choice-list">${gifts.map(g=>button(escape(M.villageItemName(g.item)),`data-vg-gift="${escape(g.item)}" data-who="${id}"`,M.giftsLeft(s,id)<=0)).join("")||"Gather a little something for your satchel first."}</div></details><details data-vg-details-key="about:${id}"><summary>About ${escape(f.short??f.name)}</summary><p>${escape(f.about)}</p></details>`;
    }
    if(kind==="navigation"){title="Mothlight Village";tag="Choose where to look";html=`<div class="vg-navigation-hub">${navigationMarkup(true)}</div>`;}
    const chapter=renderVillageChapter({kind,id,state:s,portrait,trackedQuestId:prefs.villageTrackedQuest,itemArt,position:pos});
    if(chapter)({title,tag,html}=chapter);
    if(kind==="journal")html=expansionJournalMarkup(expansionRecords(),trackedExpansion()?.id??prefs.villageTrackedQuest)+html;
    if(kind==="map"){const selected=id?M.expansionAreaInfo?.(s,id):null;html=(selected?`<article class="vgx-chapter"><div class="vgx-chapter-body"><h3>${escape(selected.name)}</h3><p>${escape(selected.reason)}</p><button class="vgx-action" data-vgx-way-area="${escape(selected.id)}"${selected.open?"":" disabled"}>Show the walking route</button></div></article>`:"")+expansionMapMarkup(Expansion.EXPANSION_AREAS.map(a=>({...a,...M.expansionAreaInfo?.(s,a.id)})),currentArea())+html;}
    if(kind==="materials"||kind==="stall"){const gems=state().village.expansion?.gems??{};html+=`<section class="vgx-journal"><header class="vgx-section-head">${expansionIcon('gemcraft',36)}<div><small>Discoveries from below</small><h3>Your rare gems</h3><p>Story crystals are kept separately and cannot be sold.</p></div></header><div class="vgx-gems">${Expansion.EXPANSION_GEMS.map(g=>`<article>${expansionIcon(g.id,44)}<span><b>${escape(g.name)}</b><small>${gems[g.id]??0} in your satchel · ${money(g.price)} each</small></span>${kind==="stall"?`<button class="vgx-action" data-vgx-sell-gem="${escape(g.id)}"${(gems[g.id]??0)>0?"":" disabled"}>Sell one</button>`:""}</article>`).join('')}</div></section>`;}
    if(kind==="farm-gifts"){title="Bring Mothlight home";tag=FOLK_BY_ID[id]?.name??"Village discoveries";html=renderVillageExpansionEconomy(s,{who:id});}
    if(kind==="expansion"){const activity=expansionInfo(id);({title,tag,html}=expansionActivityMarkup(activity,{nearby:nearActivity(activity),slot:expansionSlot}));}

    const signature=kind+":"+id+":"+html;
    if(!initial&&signature===panelSignature)return;panelSignature=signature;
    $("vg-panel-title").textContent=title;$("vg-panel-tag").textContent=tag;$("vg-panel-body").innerHTML=html;
    const on=(sel,fn)=>$("vg-panel-body").querySelectorAll(sel).forEach(b=>b.onclick=()=>fn(b));
    bindVillageExpansionEconomy(body,(key,action)=>{const command=key.slice(8),owner=command==='cold-store'?'opal':command.startsWith('cinder-')?'cinder':command.startsWith('granny-')?'granny':'tansy';if(!besideNeighbour(owner))return;const result=M.actVillageExpansion?.(state(),key,{...action,context:expansionContext()});if(result?.ok){changed(result.events);notice(result.message??"Your village discovery is ready.");drawPanel();}else notice(result?.reason??"Gather the supplies shown first.");});
    on('[data-vgx-sell-gem]',b=>{if(view.inside||view.activeExpansionArea||Math.hypot(pos.x-FIXTURES.stall.x,pos.z-FIXTURES.stall.z)>TALK_REACH){closePanel();guide(FIXTURES.stall,"Rowan’s stall");notice("Bring your spare gems to Rowan’s stall.");return;}const result=M.sellExpansionGem?.(state(),b.dataset.vgxSellGem,1);if(result?.ok){changed(result.events);notice(result.reason);drawPanel();}else notice(result?.reason??"Choose an unreserved gem.");});
    on('[data-vgx-track]',b=>{followExpansion(b.dataset.vgxTrack);render();drawPanel();});
    on('[data-vgx-guide]',b=>{const q=expansionRecords().find(c=>c.id===b.dataset.vgxGuide);if(q?.next)guideExpansion(q.next);});
    on('[data-vgx-area]',b=>showPanel("map",b.dataset.vgxArea));
    on('[data-vgx-way-area]',b=>{const a=Expansion.EXPANSION_AREA_BY_ID[b.dataset.vgxWayArea],info=M.expansionAreaInfo?.(s,a.id);if(!info?.open){notice(info?.reason??`Opens at level ${a.level}.`);return;}const portal=(view.expansionTargets??[]).find(t=>t.type==="expansion-portal"&&(t.targetArea===a.id||t.to===a.id||t.id===a.id));if(portal)guideExpansion(portal);else guideExpansion({...a.spawn,name:a.name,area:a.id});});
    on('[data-vgx-find-activity]',b=>guideExpansion(expansionInfo(b.dataset.vgxFindActivity)));
    on('[data-vgx-act]',b=>runExpansion(b.dataset.vgxAct));
    on('[data-vgx-style]',b=>runExpansion(b.dataset.vgxActivity,{styleChoice:b.dataset.vgxStyle}));
    on('[data-vgx-choice]',b=>runExpansion(b.dataset.vgxActivity,{choice:b.dataset.vgxChoice,...(b.dataset.vgxTargetSlot||expansionSlot?{slot:b.dataset.vgxTargetSlot??expansionSlot}:{})}));
    on('[data-vgx-solve]',b=>runExpansion(b.dataset.vgxSolve,{solve:true}));
    on('[data-vgx-rotate]',b=>runExpansion(b.dataset.vgxActivity,{rotate:b.dataset.vgxRotate}));
    on('[data-vgx-submit]',b=>runExpansion(b.dataset.vgxSubmit,{submit:true}));
    on('[data-vgx-reset]',b=>runExpansion(b.dataset.vgxReset,{reset:true}));
    on('[data-vgx-slot]',b=>{expansionSlot=b.dataset.vgxSlot;drawPanel(true);});
    on('[data-vg-meet]',b=>meet(b.dataset.vgMeet));on('[data-vg-chat]',b=>startTalk(b.dataset.vgChat));
    on('[data-vg-start]',b=>takeQuest(b.dataset.vgStart));
    on('[data-vg-handover]',b=>handOverTo(b.dataset.vgHandover,b.dataset.quest,kind==="journal"));
    on('[data-vg-favour]',b=>{if(!besideNeighbour(b.dataset.vgFavour))return;const r=M.doFavour(s,b.dataset.vgFavour);if(r){changed(r.events);notice(`Thank you · ${money(r.pay)}`);drawPanel();}});
    on('[data-vg-gift]',b=>{if(!besideNeighbour(b.dataset.who))return;const r=M.giveGift(s,b.dataset.who,b.dataset.vgGift);if(r){changed(r.events);conversation(b.dataset.who,[r.line],null);}});
    on('[data-vg-tour]',()=>tour());on('[data-vg-buy]',b=>{if(M.buyFromStall(s,b.dataset.vgBuy)){changed();drawPanel();}});on('[data-vg-focus]',b=>focus(b.dataset.vgFocus));
    on('[data-vg-page]',b=>showPanel(b.dataset.vgPage));
    on('[data-vg-map-district]',b=>showPanel("map",b.dataset.vgMapDistrict||undefined));
    on('[data-vg-track]',b=>{prefs.villageTrackedQuest=b.dataset.vgTrack;savePrefs();render();drawPanel();});
    on('[data-vg-decorate]',()=>openDecorate());
    on('[data-vg-upgrade]',b=>{if(M.buyVillageUpgrade(s,b.dataset.vgUpgrade)){changed();notice("Rowan's improvement is ready.");drawPanel();}});
    on('[data-vg-home]',()=>requestReturn("menu"));
    on('[data-vg-object]',b=>{const object=M.storyObjectsHere(s,"village").find(o=>o.id===b.dataset.vgObject);if(object){closePanel();surveying=true;view.cameraActions.focus(object.x,object.z,18);}});
    on('[data-vg-gather]',b=>{
      const spots=NODES.filter(n=>n.district===(b.dataset.vgDistrict??"green")&&n.material===b.dataset.vgGather&&M.nodeReady(s,n.id)).map(n=>({...n,...villageNodePosition(s,n)})).filter(n=>n.kind!=="blight"||Array.from({length:9},(_,i)=>i?{x:n.x+Math.cos((i-1)*Math.PI/4)*1.4,z:n.z+Math.sin((i-1)*Math.PI/4)*1.4}:n).some(p=>villageCellFree(s,p.x,p.z)));
      const node=spots.sort((a,b)=>Number(M.nodeReady(s,b.id))-Number(M.nodeReady(s,a.id))||Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z))[0];
      if(node){closePanel();guideResource(node);centre();notice(node.kind==="blight"?"Follow the marker, then root out the cursed fungus by hand.":"Follow the direction marker, then use your tool beside the resource.");}else notice("These resources are returning. Explore another clearing or check the satchel timer.");
    });
    const parent=panelTrail.parent,back=$("vg-panel-back");back.hidden=!parent;back.setAttribute("aria-label",parent?`Back to ${{journal:"quests",materials:"satchel",people:"neighbours",map:"map",upgrades:"workshop",navigation:"village menus"}[parent.kind]??"previous page"}`:"Back to previous page");
    restorePanel(savedView,restoreFocus);panelTrail.remember(panelView());

  }
  function focus(id){
    if(view.activeExpansionArea){guideExpansion({area:"green",name:"Village above",x:ARRIVAL.spawn[0],z:ARRIVAL.spawn[1]});return;}
    closePanel();const area=FORAGE_AREAS.find(a=>`forage:${a.id}`===id);if(area){guide(area,area.name);surveying=true;view.cameraActions.focus(area.x,area.z,26);return;}
    const points={arrival:ARRIVAL.spawn,tree:[FIXTURES.tree.x,FIXTURES.tree.z],stall:[FIXTURES.stall.x,FIXTURES.stall.z]};
    const p=points[id];if(p){guide({x:p[0],z:p[1]},({arrival:"Farm path",tree:"Moth Tree",stall:"Rowan’s stall"})[id]);surveying=true;if(id==="tree")view.cameraActions.focus(...p,34,6);else view.cameraActions.focus(...p);return;}
    if(INSIDES[id]){const door=INSIDES[id].door,[nx,nz]=DOOR_NORMAL[door.facing];guide({x:(door.x+nx*3.2)*K,z:(door.z+nz*3.2)*K},INSIDES[id].name);surveying=true;const d=INSIDES[id].door;view.cameraActions.focus(d.x*K,d.z*K,26);}
  }
  function guideExpansion(info){
    if(!info)return;if(info.chapter)followExpansion(info.chapter);closePanel();const here=currentArea(),destination=info.targetArea??info.to??info.area,caves=Expansion.EXPANSION_AREAS.filter(a=>a.layer==="cave").map(a=>a.id),from=caves.indexOf(here),to=caves.indexOf(destination);
    if(here!==destination&&(from>=0||to>=0)){
      const next=from<0?caves[0]:to>from?caves[from+1]:"surface",portal=(view.expansionTargets??[]).find(t=>t.type==="expansion-portal"&&(t.targetArea??t.to??t.id)===next);
      if(portal){guide(portal,next==="surface"?"Stairs to the previous landing":Expansion.EXPANSION_AREA_BY_ID[next]?.name??"Cave entrance");centre();notice("Follow the stair marker to the next part of your route.");return;}
      notice("Return to the cave stairs to continue this route.");return;
    }
    if(!Number.isFinite(info.x)||!Number.isFinite(info.z))return;guide(info,info.name??info.title??"Your next discovery");centre();notice("Follow the marker, then interact beside the discovery.");
  }
  function enterExpansion(id){if(!active||busy())return false;const check=M.expansionAreaInfo?.(state(),id);if(check&&!check.open){notice(check.reason);return false;}const sceneResult=view.enterExpansionArea?.(id);if(!sceneResult){notice("This route is not ready yet.");return false;}const result=M.enterVillageExpansionArea?.(state(),id);if(result&&!result.ok){view.leaveExpansionArea?.();notice(result.reason);return false;}cancelGather();releaseInput();closePanel();offered=null;waypoint=null;pos.x=sceneResult.spawn.x;pos.z=sceneResult.spawn.z;placeActor();if(actor)view.play.reset(actor.position);changed(result?.events??[]);return true;}
  function leaveExpansion(){
    cancelGather();const previous=Expansion.EXPANSION_AREA_BY_ID[view.activeExpansionArea],result=view.leaveExpansionArea?.();if(!result)return false;releaseInput();closePanel();offered=null;waypoint=null;
    const backArea=previous?.returnArea,backScene=backArea?.startsWith("cave")?view.enterExpansionArea?.(backArea):null,spawn=backScene?(previous.returnPoint??backScene.spawn):result.spawn;
    pos.x=spawn.x;pos.z=spawn.z;const area=view.activeExpansionArea??backArea??"copse";M.enterVillageExpansionArea?.(state(),area);placeActor();if(actor)view.play.reset(actor.position);changed();return true;
  }
  function afterExpansionActivity(info){
    const chapter=expansionRecords().find(c=>c.id===info.chapter);closePanel();releaseInput();
    if(info.order===0&&chapter?.intro?.length)conversation(info.who??chapter.who??"elowen",chapter.intro,null,chapter.title,{intent:"quest"});
    else if(info.type==="reveal")conversation(info.who??"elowen",chapter?.done?.length?chapter.done:[{text:info.description??info.text??info.name}],null,chapter?.title??info.name,{intent:"quest"});
  }
  function runExpansion(id,action={}){const info=expansionInfo(id);if(!nearActivity(info)){guideExpansion(info);return false;}if((info.type==="vein"||info.type==="story-vein")&&!action.solve&&!gather)return beginExpansionMine(info);const result=M.actVillageExpansion?.(state(),id,{...action,context:expansionContext()});if(!result?.ok){notice(result?.reason??"Look around for another clue.");drawPanel();return false;}changed(result.events);if(expansionInfo(id)?.done)afterExpansionActivity(info);else drawPanel();return true;}
  function beginExpansionMine(info){if(gather||!actor||info.canAct===false){if(info.reason)notice(info.reason);return false;}closePanel();releaseInput();gather={id:info.id,expansion:true,kind:"vein",material:"stone",target:{x:info.x,z:info.z},elapsed:0,strikes:0,job:++gatherSerial,duration:1.15};root.classList.add("is-gathering");$("vg-gather").hidden=false;$("vg-gather-art").innerHTML=expansionIcon(info.gem??"gemcraft",36);$("vg-gather-label").textContent="Mining the ringing stone";$("vg-gather-fill").style.width="0%";view.gatherTool?.({actor,material:"stone",target:gather.target,progress:0,active:true});gatherSound(gather,"start");return true;}
  function pick(hit){if(!active)return;if(decorate.active){decorate.pick(hit);return;}if(busy())return;if(hit.type==="expansion-portal"){const portal=(view.expansionTargets??[]).find(t=>t.type===hit.type&&t.id===hit.id);if(!portal||!Number.isFinite(portal.x)||!Number.isFinite(portal.z)){notice("Walk to the marked entrance first.");return;}if(Math.hypot(portal.x-pos.x,portal.z-pos.z)>TALK_REACH){guideExpansion(portal);return;}const to=portal.targetArea??portal.to??portal.id;if(to==="exit"||to==="surface")leaveExpansion();else enterExpansion(to);return;}if(hit.type==="expansion-activity"){const info=expansionInfo(hit.id);if(!nearActivity(info)){guideExpansion(info);return;}if(["vein","story-vein"].includes(info.type))beginExpansionMine(info);else{expansionSlot=null;showPanel("expansion",hit.id);}return;}if(hit.type==="village-folk")meet(hit.id);else if(hit.type==="village-door")enterHall(hit.id);else if(hit.type==="village-carriage")requestReturn("carriage");else if(hit.type==="village-noticeboard")showPanel("journal");else if(hit.type==="village-stall")showPanel("stall");else if(hit.type==="village-node"){beginGather(hit.id);}else if(hit.type==="village-page"){const e=M.findObject(state(),hit.id);if(e){changed(e);notice("A page of Elowen's letter");}}}
  // A chosen destination stays relative to the walking camera, rather than taking it away.
  function guide(point,label){waypoint={x:point.x,z:point.z,label,...(point.material&&point.id?{nodeId:point.id}:{}),...(point.folkId?{folkId:point.folkId}:{})};render();}
  function guideResource(node){const area=FORAGE_AREAS.find(a=>node.x>=a.x0&&node.x<=a.x1&&node.z>=a.z0&&node.z<=a.z1);guide(node,`${node.kind==="blight"?"Cursed fungus":MATERIALS.find(m=>m.id===node.material)?.name??node.material} · ${area?.name??"Hollow Green"}`);}
  function gatherTool(material){return ["logs","hardwood"].includes(material)?"axe":["stone","iron","moonstone","clay"].includes(material)?"pickaxe":"hands";}
  function gatherSound(work,phase){try{onGatherSound({id:work.id,material:work.material,phase,job:work.job});}catch{/* Sound must never prevent a transaction or input release. */}}
  function cancelGather({silent=false}={}){controls.setContext?.(null);if(!gather)return;const work=gather;gather=null;if(!silent)gatherSound(work,"cancel");releaseInput();view.gatherTool?.({active:false});root.classList.remove("is-gathering");$("vg-gather").hidden=true;placeActor();}
  function beginGather(id){
    const raw=NODES.find(n=>n.id===id),s=state(),node=raw?{...raw,...villageNodePosition(s,raw)}:null;if(!node||gather||!actor)return false;
    if(!M.canGather(s)){notice("Meet Rowan and Elowen to receive your gathering tools.");return false;}
    if(!M.nodeReady(s,id)){notice("Let this gathering spot return first.");return false;}
    if(node.kind!=="blight"&&(s.village.materials[node.material]??0)>=M.villageMaterialCapacity(s)){notice("Your satchel is full for this material.");return false;}
    guideResource(node);
    if(Math.hypot(node.x-pos.x,node.z-pos.z)>GATHER_REACH){centre();notice("Walk to the marked resource to use your tool.");return false;}
    releaseInput();offered=null;animateSprite(actor,clock,false,0,who==="shane"?1.7:0);actor?.userData.playerAnimate?.({who,outfit:s.wardrobe.equipped[who],facing:"front",angle:0,phase:0,walking:false,time:clock,age:clock,dx:0,controlled:true});gather={id,kind:node.kind,material:node.material,target:{x:node.x,z:node.z},elapsed:0,strikes:0,job:++gatherSerial,duration:node.kind==="blight"?2:gatherTool(node.material)==="hands"?.55:.95};
    root.classList.add("is-gathering");$("vg-gather").hidden=false;$("vg-gather-art").innerHTML=villageItemIcon(node.material);$("vg-gather-label").textContent=node.kind==="blight"?"Rooting out cursed fungus":gatherTool(node.material)==="axe"?"Chopping timber":gatherTool(node.material)==="pickaxe"?"Breaking stone":"Gathering by hand";$("vg-gather-fill").style.width="0%";
    view.gatherTool?.({actor,material:node.material,target:{x:node.x,z:node.z},progress:0,active:true});gatherSound(gather,"start");return true;
  }
  function tickGather(dt){
    if(!gather)return;if(state().paused){cancelGather();return;}const work=gather;work.elapsed=Math.min(work.duration,work.elapsed+Math.max(0,dt));const progress=work.elapsed/work.duration;
    while(work.strikes<GATHER_CONTACTS.length&&GATHER_CONTACTS[work.strikes]<work.duration&&work.elapsed>=GATHER_CONTACTS[work.strikes]){work.strikes++;gatherSound(work,"strike");}
    $("vg-gather-fill").style.width=`${progress*100}%`;view.gatherTool?.({actor,material:work.material,target:work.target,progress,active:true});
    if(progress<1)return;cancelGather({silent:true});if(work.expansion){const info=expansionInfo(work.id);if(!nearActivity(info)){gatherSound(work,"cancel");return;}const result=M.actVillageExpansion?.(state(),work.id,{context:expansionContext()});if(result?.ok){gatherSound(work,"complete");changed(result.events);notice(result.message??"A discovery for your satchel.");}else{gatherSound(work,"cancel");notice(result?.reason??"This vein needs a little more time.");}return;}const raw=NODES.find(n=>n.id===work.id),node=raw?{...raw,...villageNodePosition(state(),raw)}:null;
    if(!node||Math.hypot(node.x-pos.x,node.z-pos.z)>GATHER_REACH+.1){gatherSound(work,"cancel");return;}
    const result=M.gatherNode(state(),work.id);if(result?.full){gatherSound(work,"cancel");notice("Your satchel is full for this material.");}else if(result){gatherSound(work,"complete");waypoint=null;changed(result.events);notice(result.cleared?(result.overflow?"Cursed fungus cleared · sample satchel full":"Cursed fungus cleared · spore sample collected"):`Gathered ${result.amount} ${MATERIALS.find(m=>m.id===result.material)?.name.toLowerCase()??result.material}`);}else gatherSound(work,"cancel");
  }
  function placeActor(){if(!actor)return;actor.position.set(pos.x,view.inside ? .2 : (view.expansionGroundAt?.(pos.x,pos.z)??view.groundAt(pos.x,pos.z))+.04,-pos.z);}
  function updateOwnerView(moving=false,front=false){
    if(!actor)return;
    const dxCam=view.camera.position.x-actor.position.x,dzCam=view.camera.position.z-actor.position.z;actor.rotation.y=Math.atan2(dxCam,dzCam);const lean=actor.children[0];if(lean){lean.rotation.x=-LEAN;const pitch=Math.atan2(view.camera.position.y-actor.position.y-1.2,Math.hypot(dxCam,dzCam));lean.scale.y=Math.min(1.6,1/Math.cos(Math.max(0,pitch-LEAN)));}
    spriteRight.set(1,0,0).applyQuaternion(view.camera.quaternion);spriteRight.y=0;spriteRight.normalize();view.camera.getWorldDirection(spriteForward);spriteForward.y=0;spriteForward.normalize();
    const across=heading.x*spriteRight.x+heading.z*spriteRight.z,away=heading.x*spriteForward.x+heading.z*spriteForward.z,baseView=state().wardrobe.equipped[who]===who+"-base",facing=front?"front":idle>1.2&&!baseView?"front":Math.abs(across)>Math.abs(away)*.75?"side":away>0?"back":"front";
    animateSprite(actor,moving?walkingAge:clock,moving,moving?across:0,who==="shane"?1.7:0);actor.userData.playerAnimate?.({who,outfit:state().wardrobe.equipped[who],facing,angle:front?0:Math.atan2(across,-away),phase:gaitPhase(walkingAge*2.3,BASE_OWNER_STRIDE),keepFacingOnIdle:!front&&baseView,walking:moving,time:clock,age:moving?walkingAge:clock,dx:moving?across:0,controlled:true});
  }
  function makeActor(){surveying=false;if(actor){view.scene.remove(actor);actor.userData.dispose?.();}actor=scene.villageCharacter(who);if(actor){view.scene.add(actor);actor.visible=!view.director.active;placeActor();if(!view.director.active)view.play.reset(actor.position);}}
  function enterHall(id){const plan=INSIDES[id];if(!active||busy()||!plan)return false;if(plan.area){const gate=M.expansionAreaInfo?.(state(),plan.area);if(!gate?.open){notice(gate?.reason??"Restore the path to this home first.");return false;}const[nx,nz]=DOOR_NORMAL[plan.door.facing],door={x:(plan.door.x+nx*1.4)*K,z:(plan.door.z+nz*1.4)*K,area:plan.area,name:plan.name};if(view.activeExpansionArea||view.inside||Math.hypot(pos.x-door.x,pos.z-door.z)>TALK_REACH){guideExpansion(door);return false;}}narration?.stop();surveying=false;releaseInput();offered=null;closePanel();if(view.goInside(id)===false)return false;const p=view.hallPoint(...plan.hall.spawn);pos.x=p.x;pos.z=-p.z;placeActor();if(actor)view.play.reset(actor.position);render();}
  function leaveHall(){const plan=INSIDES[view.inside];if(!plan)return;narration?.stop();surveying=false;releaseInput();offered=null;const [nx,nz]=DOOR_NORMAL[plan.door.facing];view.goOutside();pos.x=(plan.door.x+nx*3.2)*K;pos.z=(plan.door.z+nz*3.2)*K;placeActor();if(actor)view.play.reset(actor.position);render();}
  function tour(){if(!active||dialogue.active)return;view.dialogueCamera?.end({immediate:true});proximity.hide();cancelGather();waypoint=null;narration?.stop();surveying=false;releaseInput();offered=null;closePanel();if(view.inside)leaveHall();while(view.activeExpansionArea)leaveExpansion();if(actor)actor.visible=false;$("vg-tour").hidden=false;$("vg-tour-skip").focus({preventScroll:true});view.director.start(k=>{$("vg-tour b").textContent=k.title;$("vg-tour span").textContent=k.sub;tourLine={speaker:"narrator",text:tourVoiceText(k)};narration?.play(tourLine.speaker,tourLine.text);tourVoices.refresh();},()=>{narration?.stop();tourLine=null;$("vg-tour").hidden=true;changed(M.finishTour(state()));if(actor){actor.visible=true;view.play.reset(actor.position);}}, {hold:()=>!!narration?.enabled&&["loading","playing"].includes(narration.current?.status)});}
  function open(){
    const s=state();if(active)return true;if(M.patchLevel(s).level<M.VILLAGE_LEVEL){notice(`Mothlight opens at level ${M.VILLAGE_LEVEL}.`);return false;}if(s.paused){notice("Resume the farm before travelling.");return false;}
    narration?.stop();oldPlayer=scene.player.state();closeMenus();who=oldPlayer.who??who;scene.player.setEnabled(false);releaseInput();controls.reset();if(!M.villageOpen(s))M.inviteToVillage(s);M.arriveInVillage(s);save();farmReminder.reset();reminder.hidden=true;returnPathArmed=true;wasPaused=!!s.paused;active=true;root.hidden=false;document.body.classList.add("in-village");scene.enter("village");if(view.inside)view.goOutside();if(view.activeExpansionArea)view.leaveExpansionArea?.();M.enterVillageExpansionArea?.(s,"green");pos.x=ARRIVAL.spawn[0];pos.z=ARRIVAL.spawn[1];makeActor();view.setExpansionCompanion?.(s.village.expansion?.companions?.selected??null);render();onRender();if(!s.village.toured)tour();return true;
  }
  function close(){if(!active)return;returnPrompt.close({restoreFocus:false});questReceipts.clear();farmReminder.reset();reminder.hidden=true;wanderers.clear();proximity.hide();cancelGather();waypoint=null;narration?.stop();tourLine=null;dialogueDone=null;chat=null;greeting=null;dialogue.close();view.dialogueCamera?.end({immediate:true});decorate.close();closePanel();panelTrail.reset();active=false;surveying=false;questExpanded=false;root.hidden=true;$("vg-tour").hidden=true;document.body.classList.remove("in-village");releaseInput();controls.reset();offered=null;latestPad=null;dialogueCameraOwned=false;if(view.inside)view.goOutside();if(view.activeExpansionArea)view.leaveExpansionArea?.();if(actor){view.scene.remove(actor);actor.userData.dispose?.();actor=null;}save();scene.leavePlace();if(oldPlayer?.enabled)scene.player.setEnabled(true,oldPlayer.who);onLeave();}
  const setText=(id,text)=>{const el=$(id);if(el.textContent!==text)el.textContent=text;};
  function render(){
    invitation.hidden=active||!!scene.place||!M.villageDue(state());if(!active)return;setText("vg-coins",money(state().coins));setText("vg-place",INSIDES[view.inside]?.name??Expansion.EXPANSION_AREA_BY_ID[currentArea()]?.name??"Hollow Green");setText("vg-person",who==="shane"?"Shane":"Natalie");
    const rate=typeof M.villageFarmRate==="function"?M.villageFarmRate(state()):.025;setText("vg-rate",`${+(rate*100).toFixed(1)}%`);$("vg-farm-rate").setAttribute("aria-label",`Farm production while exploring: ${+(rate*100).toFixed(1)}%. Open workshop to improve it.`);$("vg-farm-rate").title=`Farm growth and trade run at ${+(rate*100).toFixed(1)}% while you explore. Improve this at Rowan’s workshop.`;$("vg-farm-rate").hidden=!!view.director.active||decorate.active;
    const extra=trackedExpansion(),q=extra??M.activeQuests(state()).find(q=>q.id===prefs.villageTrackedQuest)??M.trackedQuest(state()),text=extra?`${Expansion.EXPANSION_AREA_BY_ID[extra.area]?.name??"Mothlight"} · ${extra.status==="done"?"Complete · Open Quests to choose your next story":extra.next?.name??extra.next?.text??extra.nextText??"Follow the story marker"}`:q?M.questStepText(state(),q.id):"Meet your neighbours",rows=extra?[]:q?M.questRequirementRows(state(),q.id):[];
    const objective=$("vg-objective");objective.hidden=!!view.director.active;setText("vg-task",text);setText("vg-quest-title",q?.title??"Hollow Green");$("vg-quest-title").title=q?.title??"Hollow Green";
    const count=$("vg-quest-counts");count.hidden=!extra&&!rows.length;setText("vg-quest-counts",extra?`${extra.completed??0}/${extra.need??1}`:rows.length===1?`${rows[0].key==="coins"?money(Math.min(rows[0].have,rows[0].need)):Math.min(rows[0].have,rows[0].need)}/${rows[0].key==="coins"?money(rows[0].need):rows[0].need}`:rows.length?`${rows.filter(r=>r.complete).length}/${rows.length} ready`:"");
    const toggle=$("vg-quest-toggle");toggle.setAttribute("aria-expanded",String(questExpanded));toggle.setAttribute("aria-label",`${questExpanded?"Collapse":"Expand"} followed quest details`);root.classList.toggle("quest-expanded",questExpanded);$("vg-quest-details").hidden=!questExpanded;
    const hint=extra?(extra.status==="done"?"Chapter complete. Open Quests to choose your next story.":extra.next?.hint??extra.reason??"Use the journal to mark your next discovery."):q?M.questStepHint(state(),q.id):"Meet Elowen and Rowan to discover the village’s stories.",questPortrait=q?portrait(q.giver):null,signature=JSON.stringify([q?.id,rows,hint,questPortrait]);
    if(signature!==questHudSignature){questHudSignature=signature;$("vg-quest-portrait").innerHTML=trackerPortraitMarkup(q,questPortrait);$("vg-quest-details").innerHTML=trackerDetailsMarkup(rows,hint);$("vg-quest-journal").onclick=()=>showPanel("journal");}
    if(waypoint?.folkId&&!view.inside)Object.assign(waypoint,view.folk.talkSpot(waypoint.folkId));
    if(waypoint?.nodeId){if(!M.nodeReady(state(),waypoint.nodeId))waypoint=null;else Object.assign(waypoint,villageNodePosition(state(),waypoint.nodeId));}
    const finder=$("vg-wayfinding");finder.hidden=!waypoint||!!view.inside;
    if(waypoint&&!view.inside){const dx=waypoint.x-pos.x,dz=-(waypoint.z-pos.z),right=new THREE.Vector3(1,0,0).applyQuaternion(view.camera.quaternion),forward=view.camera.getWorldDirection(new THREE.Vector3());right.y=forward.y=0;right.normalize();forward.normalize();const a=Math.atan2(dx*right.x+dz*right.z,dx*forward.x+dz*forward.z),arrows=["↑","↗","→","↘","↓","↙","←","↖"],arrow=arrows[(Math.round(a/(Math.PI/4))+8)%8],distance=Math.hypot(dx,dz);setText("vg-wayfinding",`${distance<(waypoint.nodeId?GATHER_REACH:3)?"●":arrow} ${waypoint.label} · ${Math.round(distance)} m`);}
    root.querySelectorAll('.vg-dock [data-vg-page]').forEach(b=>b.setAttribute("aria-current",villagePanelSection(page?.kind)===b.dataset.vgPage?"page":"false"));
  }
  function tick(dt){
    if(!active)return;clock+=dt;if(!busy()&&!decorate.active)expansionReceiptRemaining=Math.max(0,expansionReceiptRemaining-dt);expansionReceipt.hidden=expansionReceiptRemaining<=0||busy()||decorate.active;reminder.hidden=!farmReminder.tick(dt,{paused:state().paused,blocked:busy()||decorate.active});wanderers.tick(dt,view.camera,{paused:state().paused,hidden:!!view.inside||!!view.activeExpansionArea||view.director.active||decorate.active});render();if(!actor)makeActor();if(!actor)return;
    const paused=!!state().paused;if(paused!==wasPaused){if(paused&&gather)cancelGather();else releaseInput();wasPaused=paused;}
    questReceipts.tick({blocked:busy()||decorate.active});
    const cameraOwns=!!view.dialogueCamera?.active;
    // A new hold during the return is still a camera gesture. Require neutral
    // at the exact hand-back, not just when the conversation first opened.
    if(dialogueCameraOwned&&!cameraOwns)releaseInput();dialogueCameraOwned=cameraOwns;
    const input=controls.poll(),pad=input.pad;latestPad=pad?.g??null;dialogue.setInput?.(input.source,pad?.g);
    if(dialogue.active||cameraOwns)updateOwnerView(false,true);
    if(returnPrompt.active){returnPrompt.setInput(input.source,pad?.g);if(pad?.pressed(1)){returnPrompt.cancel();return;}if(pad?.pressed(0)){returnPrompt.confirm();return;}return;}
    if(decorate.active){decorate.tick(dt,pad);return;}
    if(pad?.pressed(1)){back();return;}if(pad?.pressed(9)&&!dialogue.active&&!view.director.active){page?closePanel():showPanel("navigation");return;}
    if(gather){controls.setContext?.({type:"village-node",material:gather.material,...(gather.kind==="blight"?{label:"Root out",target:"Cursed fungus",tool:"Hands"}:{}),progress:gather.elapsed/gather.duration,gathering:true});tickGather(dt);return;}
    if(page||dialogue.active||view.director.active){
      panelAge+=dt;if(page&&panelAge>.8){panelAge=0;drawPanel();}
      controls.handleMenu(dialogue.active?document.getElementById("village-dialogue"):page?$("vg-panel"):$("vg-tour"),pad);return;
    }
    if(busy())return;
    if(pad?.pressed(12))toggleQuest();
    // Interacting can remove the owner or switch scenes; finish this frame here.
    if(pad?.pressed(0)){interact();return;}if(pad?.pressed(2))showPanel("map");if(pad?.pressed(3))showPanel("people");if(busy())return;if(pad?.pressed(11))centre();if(pad?.pressed(4))view.play.zoom(1);if(pad?.pressed(5))view.play.zoom(-1);
    const k=key=>keys.has(key)?1:0;let ix=input.move.x+k("d")+k("arrowright")-k("a")-k("arrowleft"),iy=input.move.y+k("s")+k("arrowdown")-k("w")-k("arrowup");const n=Math.hypot(ix,iy);if(n>1){ix/=n;iy/=n;}
    const right=new THREE.Vector3(1,0,0).applyQuaternion(view.camera.quaternion);right.y=0;right.normalize();const forward=new THREE.Vector3();view.camera.getWorldDirection(forward);forward.y=0;forward.normalize();const dx=right.x*ix-forward.x*iy,dz=right.z*ix-forward.z*iy,wantsMove=Math.hypot(dx,dz)>.05,speed=3.3*(keys.has("shift")||input.sprint?1.6:1),before={...pos};
    if(wantsMove){if(surveying)centre();if(view.inside){const plan=INSIDES[view.inside],origin=view.hallPoint(0,0),from={x:(pos.x-origin.x)/K,z:(-pos.z-origin.z)/K},next=moveVillageHallWalker(plan,from,dx*speed*dt/K,dz*speed*dt/K);if(next.z>0){leaveHall();return;}pos.x=origin.x+next.x*K;pos.z=-origin.z-next.z*K;}else Object.assign(pos,view.moveExpansionWalker?.(pos,dx*speed*dt,-dz*speed*dt)??moveVillageWalker(state(),pos,dx*speed*dt,-dz*speed*dt));}
    // A canceled walk-through cannot reopen until the owner leaves this exit.
    if(!view.inside&&!view.activeExpansionArea&&(pos.z>ARRIVAL.back[1]+1.2||Math.abs(pos.x-ARRIVAL.back[0])>3.2))returnPathArmed=true;
    if(!view.inside && !view.activeExpansionArea && returnPathArmed && wantsMove && pos.z <= ARRIVAL.back[1]+.3 && before.z > ARRIVAL.back[1]+.3 && Math.abs(pos.x-ARRIVAL.back[0])<2){placeActor();updateOwnerView(false);requestReturn("path");return;}
    // Footfalls follow travelled ground, including slow sticks and wall slides.
    const travelled=Math.hypot(pos.x-before.x,pos.z-before.z),moving=travelled>.0005;
    if(moving){heading.x=(pos.x-before.x)/travelled;heading.z=-(pos.z-before.z)/travelled;walkingAge+=travelled/2.3;idle=0;}else idle+=dt;
    placeActor();const look=villageCameraLook({x:input.look.x+k("r")-k("q"),y:input.look.y});view.play.look(look.x,look.y,dt);if(!surveying)view.play.follow(actor.position,dt,{heading,moving});
    updateOwnerView(moving);
    const targets=view.inside?[{type:"village-folk",id:INSIDES[view.inside].host,x:view.hallPoint(...INSIDES[view.inside].hall.host).x,z:-view.hallPoint(...INSIDES[view.inside].hall.host).z}]:[...["elowen","rowan"].map(id=>({type:"village-folk",id,...view.folk.talkSpot(id)})),...NODES.filter(n=>M.nodeReady(state(),n.id)).map(n=>({type:"village-node",id:n.id,...villageNodePosition(state(),n)})),...M.storyObjectsHere(state(),"village").map(o=>({type:"village-page",...o})),{type:"village-noticeboard",x:FIXTURES.noticeboard.x,z:FIXTURES.noticeboard.z},{type:"village-stall",x:FIXTURES.stall.x,z:FIXTURES.stall.z},{type:"village-carriage",x:ARRIVAL.back[0],z:ARRIVAL.back[1]},...Object.entries(INSIDES).map(([id,p])=>{const [nx,nz]=DOOR_NORMAL[p.door.facing];return{type:"village-door",id,x:(p.door.x+nx*1.4)*K,z:(p.door.z+nz*1.4)*K};})];
    const allTargets=view.activeExpansionArea?[...(view.expansionTargets??[])]:[...targets,...(view.expansionTargets??[])];
    const interactionTargets=allTargets.filter(t=>t.type!=="expansion-activity"||(()=>{const a=expansionInfo(t.id);return a?.available&&!a.done;})());
    const near=interactionTargets.map(t=>({...t,d:Math.hypot(t.x-pos.x,t.z-pos.z)})).filter(t=>t.d<(view.inside?HALL_TALK_REACH:t.type==="village-node"?GATHER_REACH:TALK_REACH)).sort((a,b)=>a.d-b.d)[0];offered=near??null;
    const nearNode=near?.type==="village-node"?NODES.find(n=>n.id===near.id):null,material=nearNode?.material,blight=nearNode?.kind==="blight";
    const context=near?{...near,material,...(blight?{label:"Root out",tool:"Hands"}:{}),target:near.type?.startsWith("expansion-")?(near.name??expansionInfo(near.id)?.name??"Discovery"):blight?"Cursed fungus":near.type==="village-carriage"?"Farm":near.type==="village-page"?"Letter page":near.type==="village-folk"?(FOLK_BY_ID[near.id]??HOST_BY_ID[near.id])?.name:near.type==="village-door"?INSIDES[near.id]?.name:undefined,available:!material||M.canGather(state()),reason:material&&!M.canGather(state())?"Meet Rowan and Elowen first":undefined}:null;
    if(controls.setContext)controls.setContext(context);else{$("vg-interact").hidden=!near;$("vg-interact").textContent=near?.type==="village-carriage"?"Farm":near?.type==="village-folk"?"Talk":blight?"Root out":"Gather";}
    proximity.update({position:pos,inside:!!view.inside,time:clock,reducedMotion:!!prefs.reducedMotion,visible:!surveying,targets:allTargets.filter(t=>["village-node","village-page","expansion-activity"].includes(t.type)).map(t=>({...t,quest:t.type==="village-page"}))});
  }
  function toggleQuest(){if(!active||dialogue.active||view.director.active||state().paused||gather)return false;questExpanded=!questExpanded;render();return true;}
  function interact(){if(offered)pick(offered);}
  function centre(){surveying=false;if(actor){if(view.play.recenter)view.play.recenter(actor.position,heading);else view.play.reset(actor.position);}}
  function back(){if(returnPrompt.active){returnPrompt.cancel();return;}if(gather){cancelGather();return;}if(decorate.active){decorate.back();return;}if(view.director.active){view.director.skip();return;}if(dialogue.active){dialogue.close();return;}if(page){panelBack();return;}if(view.activeExpansionArea){leaveExpansion();return;}if(view.inside){leaveHall();return;}requestReturn("back");}
  $("vg-farm-rate").onclick=()=>showPanel("upgrades");$("vg-fullscreen").onclick=onFullscreen;$("vg-decorate").onclick=()=>openDecorate();$("vg-home").onclick=()=>requestReturn("header");$("vg-panel-close").onclick=()=>closePanel(true);$("vg-panel-back").onclick=panelBack;$("vg-quest-toggle").onclick=toggleQuest;$("vg-person").onclick=()=>{if(busy()||decorate.active)return;who=who==="shane"?"natalie":"shane";makeActor();render();};$("vg-tour-skip").onclick=()=>view.director.skip();$("vg-look").onclick=()=>!busy()&&!decorate.active&&centre();$("vg-interact").onclick=interact;
  root.querySelectorAll('.vg-dock [data-vg-page]').forEach(b=>b.onclick=()=>dockPage(b.dataset.vgPage));
  function releaseInput(){keys.clear();controls.release();}
  const keydown=e=>{if(!active||decorate.active)return;if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)back();return;}if(["INPUT","TEXTAREA","SELECT"].includes(e.target?.tagName))return;const key=e.key.toLowerCase();if(busy())return;if(key==="c"){e.preventDefault();centre();return;}if(key==="t"&&!e.repeat){e.preventDefault();toggleQuest();return;}if([" ","enter"].includes(key)&&e.target?.closest?.("button,summary"))return;if(key!=="e")keys.add(key);if([" ","enter","f","x","e"].includes(key)&&!e.repeat){e.preventDefault();interact();}else if(key.startsWith("arrow"))e.preventDefault();};const keyup=e=>keys.delete(e.key.toLowerCase());addEventListener("keydown",keydown,{capture:true});addEventListener("keyup",keyup);addEventListener("blur",releaseInput);
  return {open,close,requestReturn,enterExpansion,leaveExpansion,tick,render,onEvent,pick,meet,showPanel,openDecorate,decorate,enterHall,leaveHall,back,dispose(){close();returnPrompt.destroy();questReceipts.destroy();proximity.dispose();controls.dispose();decorate.dispose();dialogue.dispose?.();tourVoices.dispose();removeEventListener("keydown",keydown,{capture:true});removeEventListener("keyup",keyup);removeEventListener("blur",releaseInput);root.remove();invitation.remove();},get active(){return active;},get blocked(){return busy();},get decorating(){return decorate.active;},get gesture(){return decorate.gesture;},get status(){return{area:currentArea(),expansionTracked:trackedExpansion(),returnPrompt:returnPrompt.active,returnPathArmed,panelDepth:panelTrail.depth,panelParent:panelTrail.parent?.kind??null,proximity:proximity.status,wanderers:wanderers.status,active,inside:view.inside,who,position:{...pos},panel:page?.kind??null,panelId:page?.id??null,touring:view.director.active,surveying,decorating:decorate.active,input:root.dataset.input,questExpanded,trackedQuest:trackedExpansion()?.id??(M.activeQuests(state()).find(q=>q.id===prefs.villageTrackedQuest)??M.trackedQuest(state()))?.id??null,waypoint:waypoint?{...waypoint}:null,gathering:gather?{id:gather.id,material:gather.material,progress:gather.elapsed/gather.duration,tool:gatherTool(gather.material)}:null};}};
}
