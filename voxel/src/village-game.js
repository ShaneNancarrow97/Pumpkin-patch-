import { installFurnitureSetArt } from './ui/furniture-set-icons.js';
import { addMoonRim } from "./sprite-rim.js";
import { installVillageUIArt, villageUIIcon } from './ui/village-ui-icons.js';
import { createVillageProximity } from './village-proximity.js';
import { createVillageWanderers } from './village-wanderers.js';
import { createVillageFarmReminder } from './ui/village-farm-reminder.js';
import { createVillageHudRefresh } from './ui/village-hud-refresh.js';
import * as Expansion from './content/village-expansion.js';
import { expansionIcon } from './ui/village-expansion-icon-markup.js';
import { installVillageExpansionArt } from './ui/village-expansion-art.js';
import { renderVillageExpansionEconomy, bindVillageExpansionEconomy } from './ui/village-expansion-economy.js';
import { companionInfo, selectVillageCompanion, markExpansionNeighbourMet } from './rules/village-expansion-companions.js';
import { expansionActivityMarkup, expansionRewardMarkup } from './ui/village-expansion-pages.js';
import { villageObjectives, villageObjective, residentObjectivePriority } from './village-objectives.js';
import { renderVillageJournal, JOURNAL_TABS, nextJournalTab } from './ui/village-journal.js';
import { fidelityIcon } from './ui/village-fidelity-icon-markup.js';
import { villageNeighbourCards, villagePanelArt } from './ui/village-menu-presentation.js';
import { installVillageFidelityArt } from './ui/village-fidelity-art.js';
import { createVillageGradeSample, villageAtmosphereAt } from './content/village-grade.js';
// Mothlight's first saved visit. The scene owns the picture; this controller
// owns input and calls the village's existing rules for every transaction.
import * as THREE from "three";
import * as M from "./model.js";
import { PLAN_SCALE as K, ARRIVAL, FIXTURES, NODES, MATERIALS, FORAGE_AREAS } from "./content/village.js";
import { villageNodePosition } from "./content/village-node-sites.js";
import { VILLAGE_PLACES, villagePlaceAt, resolveVillagePlaceDestination } from "./content/village-places.js";
import { FOLK_BY_ID, HOST_BY_ID } from "./content/village-folk.js";
import { VILLAGE_DECOR_BY_ID } from "./content/village-decor.js";
import { QUEST_BY_ID, BLUEPRINTS } from "./content/village-quests.js";
import { INSIDES, DOOR_NORMAL } from "./village-view.js";
import { moveVillageWalker, moveVillageHallWalker, villageCellFree, villageWalkObstacles, VILLAGE_WALK_RADIUS } from "./rules/village-navigation.js";
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
import { renderVillageMap } from "./ui/village-map.js";
import { resolveVillageResidentInteraction, resolveNearbyVillageResidentInteraction, villageResidentLocation, RESIDENT_TALK_REACH, withinResidentReach } from "./village-resident-interaction.js";
import { createVillageDecorate } from "./ui/village-decorate.js";
import { renderVillageChapter } from "./ui/village-chapters.js";
import { createVillagePanelTrail, villagePanelSection } from "./ui/village-panel-trail.js";
import { trackerPortraitMarkup, trackerDetailsMarkup, trackerToggleHintMarkup } from "./ui/village-quest-tracker.js";
import { gardenSpriteIcon } from "./ui/garden-icons.js";
import { villageItemIcon } from "./ui/village-item-markup.js";
import { installVillageItemArt } from "./ui/village-item-art.js";
import { decorIcon } from "./ui/kit.js";
import { TOWN } from "./content/village-town-square.js";

const escape = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"£"+Math.round(n).toLocaleString("en-GB");
const GATHER_REACH=2.1, TALK_REACH=RESIDENT_TALK_REACH;
const GATHER_CONTACTS=Object.freeze([.3,.8,1.3]);
const legacyQuest=id=>typeof id==="string"&&Object.hasOwn(QUEST_BY_ID,id)?QUEST_BY_ID[id]:null;
const expansionChapter=id=>typeof id==="string"&&Object.hasOwn(Expansion.EXPANSION_CHAPTER_BY_ID,id)?Expansion.EXPANSION_CHAPTER_BY_ID[id]:null;
const NAVIGATION = [["map","Map","map","Places and routes"],["people","People","people","Find your neighbours"],["journal","Quests","quests","Your next step"],["materials","Satchel","satchel","Materials and supplies"],["upgrades","Workshop","workshop","Useful improvements"],["decorate","Build","build","Make the village yours"]];
function navigationMarkup(hub=false) {
  return NAVIGATION.map(([id,label,icon,hint])=>`<button ${id==="decorate"?(hub?'data-vg-decorate':'id="vg-decorate"'):`data-vg-page="${id}"`} class="${hub?'vg-nav-card':'vg-nav-button'}" aria-label="${label}" title="${label}">${fidelityIcon(id==="journal"?"journal":icon)}<span><b>${label}</b>${hub?`<small>${hint}</small>`:""}</span></button>`).join("");
}
export function createVillageGame({ state, scene, save, notice, closeMenus = () => {}, onLeave = () => {}, onRender = () => {}, onGatherSound = () => {}, conversationView = createVillageConversation, portrait = villageSpritePortrait, narration, savePrefs = () => {}, prefs = {}, onFullscreen = () => {}, now = () => performance.now(), controlsView = createVillageControls, decorateView = createVillageDecorate, returnPromptView = createVillageReturnPrompt, questReceiptView = createVillageQuestReceipt, itemArt = item => item.kind === "home" ? decorIcon(item.id, 56) : gardenSpriteIcon(item.id) || villageItemIcon(item.id) }) {
  installVillageItemArt(); installFurnitureSetArt(); installVillageUIArt(); installVillageExpansionArt(); installVillageFidelityArt();
  const root=document.createElement("section");root.id="village-game";root.hidden=true;root.setAttribute("aria-label","Mothlight Village");
  root.innerHTML=`<header class="vg-heading"><button id="vg-home" aria-label="Return to the farm">${villageUIIcon("farm",24)} <span>Farm</span></button><div id="vg-location" class="vf-location"><span class="vf-place-line">${fidelityIcon("moth")}<b id="vg-place">Hollow Green</b>${fidelityIcon("moth")}</span><small class="vf-clock" aria-label="Active village time" title="Active village time">${fidelityIcon("lantern")}<span id="vg-clock">Night</span></small></div><div id="vg-header-tools" class="vf-header-tools"><span id="vg-coins" aria-label="Coins"></span><button id="vg-person" aria-label="Switch playable character"><span id="vg-person-portrait" class="vf-owner-portrait" aria-hidden="true"></span><span id="vg-person-name">Shane</span></button><button id="vg-fullscreen" aria-label="Toggle fullscreen" title="Fullscreen">⛶</button></div></header><section id="vg-objective" class="vg-objective" aria-label="Followed quest" hidden><button id="vg-quest-toggle" class="vg-quest-toggle" aria-expanded="false" aria-controls="vg-quest-details" aria-keyshortcuts="T" title="Expand quest details · D-pad Up / T"><span id="vg-quest-portrait" class="vg-quest-portrait" aria-hidden="true"></span><span class="vg-quest-copy"><span class="vg-quest-heading"><strong id="vg-quest-title"></strong><small id="vg-quest-counts"></small></span><span id="vg-task"></span></span>${trackerToggleHintMarkup()}</button><div id="vg-quest-details" class="vg-quest-details" hidden></div><small id="vg-wayfinding" hidden></small></section><button id="vg-farm-rate" class="vg-farm-rate" aria-label="Farm production while exploring · open workshop"><span>Farm at work</span><b id="vg-rate">2.5%</b></button><div id="vg-gather" class="vg-gather" role="status" aria-live="polite" hidden><span id="vg-gather-art" aria-hidden="true"></span><div><b id="vg-gather-label"></b><span class="vg-gather-track"><i id="vg-gather-fill"></i></span></div></div><div id="vg-tour" class="vg-tour" hidden><b></b><span></span><button id="vg-tour-skip">Skip tour</button></div><nav class="vg-dock" aria-label="Village actions">${navigationMarkup()}</nav><aside id="vg-panel" hidden role="dialog" aria-modal="false" aria-labelledby="vg-panel-title"><header><button id="vg-panel-back" aria-label="Back to previous page" hidden><span aria-hidden="true">‹</span></button><div class="vg-panel-heading"><small id="vg-panel-tag"></small><div class="vf-panel-title-line"><span class="vf-panel-title-art" aria-hidden="true">${fidelityIcon("moth")}</span><h2 id="vg-panel-title"></h2></div></div><button id="vg-panel-close" aria-label="Close village panel">×</button></header><div id="vg-panel-body"></div></aside><div id="vg-stick-zone" aria-label="Movement thumbstick"><div id="vg-stick" hidden><i></i></div></div><button id="vg-interact" class="vg-interact" hidden>Talk</button><button id="vg-look" class="vg-look" aria-label="Centre the camera">◎</button>`;
  document.body.append(root);
  const farmReminder=createVillageFarmReminder(),reminder=document.createElement("div");reminder.className="vg-farm-reminder";reminder.hidden=true;reminder.setAttribute("role","status");reminder.setAttribute("aria-live","polite");reminder.innerHTML=`${villageUIIcon("farm",28)}<span>A little check on your farm?<small>Your pumpkins are still growing back home.</small></span>`;root.append(reminder);
  const invitation=document.createElement("button");invitation.id="village-invitation";invitation.hidden=true;invitation.textContent="A letter from Elowen  ›";invitation.onclick=()=>open();document.body.append(invitation);
  const $=id=>root.querySelector("#"+id),view=scene.villageView;
  const proximity=createVillageProximity(view.scene,(x,z)=>view.expansionGroundAt?.(x,z)??view.groundAt(x,z));
  const wanderers=createVillageWanderers({scene:view.scene,state,createVisitor:kind=>scene.villageVisitor?.(kind),groundAt:(x,z)=>view.groundAt(x,z)});
  let surveying=false,active=false,who="shane",actor=null,walkingAge=0,clock=0,idle=0,page=null,offered=null,oldPlayer=null,dialogueDone=null,chat=null,greeting=null,dialogueChoices=new Set(),dialogueCameraOwned=false,tourLine=null,waypoint=null,gather=null,gatherSerial=0,questExpanded=false,questHudSignature="",latestPad=null,returnPathArmed=true,wasPaused=!!state().paused,expansionSlot=null,expansionCached=[],expansionCachedAt=-1;
  const tourVoices=createNarrationControls({mount:$("vg-tour"),narration,savePrefs,line:()=>view.director.active?tourLine:null});
  if(narration){$("vg-tour-skip").setAttribute("data-voice-skip","");tourVoices.element.append($("vg-tour-skip"));}
  const pos={x:ARRIVAL.spawn[0],z:ARRIVAL.spawn[1]},heading={x:0,z:-1},keys=new Set();
  const spriteRight=new THREE.Vector3(),spriteForward=new THREE.Vector3();
  let actorAppearance="",ownerMoving=false,ownerFront=false;
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
  const busy=()=>returnPrompt.active||!!page||dialogue.active||!!view.dialogueCamera?.active||view.director.active||state().paused||!!gather;
  const controls=controlsView({root,blocked:()=>busy()||decorate.active,onRelease:()=>keys.clear()});
  const decorate=decorateView({state,view,root,notice,onMenuInput:(surface,pad)=>controls.handleMenu(surface,pad),onInputReset:()=>controls.release(),onChanged:events=>changed(events),actorPosition:()=>({...pos}),onClose(){releaseInput();centre();render();},onShop:()=>showPanel("stall")});
  let panelSignature="",panelAge=0,panelOpener=null,mapSnapshot,mapSnapshotError=false,mapPresentation=null,mapShowResidents=false;
  const panelTrail=createVillagePanelTrail();
  let journalTab="active",ownerPortraitUrl=null;
  const clockGrade=createVillageGradeSample();
  const hudRefresh=createVillageHudRefresh();
  function openDecorate(options={}) {
    if(!active||returnPrompt.active||view.director.active||dialogue.active||state().paused)return false;
    if(view.activeExpansionArea){notice("Decorate the village gardens above ground.");return false;}
    proximity.hide();cancelGather();if(view.inside)leaveHall();closePanel();releaseInput();surveying=true;view.play.pause?.();
    return decorate.open(options);
  }
  function namedExpansionRewards(rows=[]){return rows.map(row=>{const catalog=row.kind==="costume"?M.costumeById:row.kind==="recipe"?M.RECIPE_BY_ID:row.kind==="village-decor"?VILLAGE_DECOR_BY_ID:row.kind==="estate-decor"?M.ESTATE_DECOR_BY_ID:M.decorById;const name=catalog?.[row.id]?.name??M.decorById?.[row.id]?.name??VILLAGE_DECOR_BY_ID[row.id]?.name??M.ESTATE_DECOR_BY_ID?.[row.id]?.name;return name?{...row,name}:row;});}
  function expansionRecords(){if(!M.expansionJournal)return[];if(clock-expansionCachedAt>.2||expansionCachedAt<0){expansionCached=M.expansionJournal(state()).map(chapter=>({...chapter,rewards:namedExpansionRewards(chapter.rewards)}));expansionCachedAt=clock;}return expansionCached;}
  function objectiveRecords(){return villageObjectives(state(),expansionRecords());}
  function followedObjectiveId(){
    for(const id of [prefs.villageTrackedQuest,state().village.expansion?.tracked]){
      if(legacyQuest(id)){if(M.questStatus(state(),id)!=="done")return id;}
      else if(expansionRecords().some(record=>record.id===id&&record.status!=="done"))return id;
    }
    return M.trackedQuest(state())?.id??null;
  }
  function followedObjective(){return villageObjective(state(),followedObjectiveId(),expansionRecords());}
  function trackedExpansion(){const id=followedObjectiveId();return !legacyQuest(id)?expansionRecords().find(record=>record.id===id)??null:null;}
  // Repair both tracking stores from old builds without replacing another
  // story the player followed. Completion belongs in the brief receipt.
  function clearCompletedTracking(){
    const e=state().village.expansion,done=id=>legacyQuest(id)?!!state().village.quests[id]?.done:!!expansionChapter(id)&&!!(e?.chapters?.[id]||e?.receipts?.[id]);let cleared=false;
    if(done(prefs.villageTrackedQuest)){prefs.villageTrackedQuest=null;savePrefs();cleared=true;}
    if(done(e?.tracked)){e.tracked=null;save();cleared=true;}
    if(done(waypoint?.objectiveId??waypoint?.chapter)){waypoint=null;cleared=true;}
    if(cleared){questExpanded=false;questHudSignature="";}
  }
  function followObjective(id){
    const objective=villageObjective(state(),id,expansionRecords());if(!objective||!["active","available"].includes(objective.status))return false;
    const e=state().village.expansion,old=prefs.villageTrackedQuest;let changedSave=false;
    if(objective.source==="expansion"){if(e.tracked!==id){M.actVillageExpansion?.(state(),"track",{chapter:id});changedSave=true;}}
    else if(e.tracked){e.tracked=null;changedSave=true;}
    if(old!==id){prefs.villageTrackedQuest=id;savePrefs();waypoint=null;questHudSignature="";}
    if(changedSave)save();return true;
  }
  function followExpansion(id){return !!expansionChapter(id)&&followObjective(id);}
  function currentArea(){if(view.activeExpansionArea)return view.activeExpansionArea;return Expansion.EXPANSION_AREAS.find(a=>a.layer!=="cave"&&pos.x>=a.bounds[0]&&pos.x<=a.bounds[2]&&pos.z>=a.bounds[1]&&pos.z<=a.bounds[3])?.id??(state().village.expansion?.area&&!state().village.expansion.area.startsWith("cave")?state().village.expansion.area:"green");}
  function expansionContext(){return{area:currentArea(),x:pos.x,z:pos.z};}
  function nearActivity(info){return !!info&&!view.inside&&info.area===currentArea()&&Math.hypot(info.x-pos.x,info.z-pos.z)<=TALK_REACH;}
  function expansionInfo(id){return M.expansionActivityInfo?.(state(),id)??Expansion.EXPANSION_ACTIVITY_BY_ID[id];}
  function onEvent(e){
    if(e.type==="farm-milestone"&&active){questReceipts.notifyMessage({id:e.id,title:e.title,important:true});return true;}
    if(e.type==="expansion-chapter-complete"){
      expansionCachedAt=-1;clearCompletedTracking();const chapter=Expansion.EXPANSION_CHAPTER_BY_ID[e.chapter??e.id],title=e.title??chapter?.title??"Village chapter";
      const main=expansionRecords().filter(c=>!c.optional&&c.status!=="done"),upNext=chapter?.optional?null:main.find(c=>c.status!=="locked")??main[0];
      questReceipts.notifyChapter({id:e.chapter??e.id,title,change:chapter?.change,rewards:[...namedExpansionRewards(e.rewards),...(expansionRecords().find(c=>c.id===chapter?.id)?.rewards??[]).filter(r=>r.kind==="benefit")],next:upNext?{title:upNext.title,open:upNext.status!=="locked",reason:upNext.reason}:null});if(active)render();return true;
    }
    if(e.type?.startsWith("expansion-")){expansionCachedAt=-1;return true;}

    if(e.type==="village-resource-ready"){guidedObjectiveStep=null;if(active)view.sync();render();return true;}
    if(e.type==="quest-done"){clearCompletedTracking();if(active){questReceipts.notify(e);render();}else notice(`${QUEST_BY_ID[e.quest]?.title??"Quest"} complete · rewards received`);}
    else if(e.type==="friend-level")rewardNotice(`friend:${e.who}:${e.level??M.friendshipWith(state(),e.who)?.level}`,`${FOLK_BY_ID[e.who]?.short??e.who} · ${M.friendshipWith(state(),e.who)?.title??"Friendship grew"}`);
    else if(e.type==="almanac-page")rewardNotice(`almanac:${e.page??state().village.almanac.pages}`,`Almanac page complete · keepsakes added to your collection`);
    else if(e.type==="duty")rewardNotice(`duty:${e.duty??e.id}:${state().village.clock}`,`Almanac task complete · +${money(e.coins)}`);
    else if(e.type==="quest-step"){
      const step=QUEST_BY_ID[e.quest]?.steps[e.step];if(step?.kind!=="build")return false;
      rewardNotice(`restored:${step.blueprint}`,`${BLUEPRINTS.find(b=>b.id===step.blueprint)?.name??"Your neighbour's home"} restored`);
    }else return false;
    return true;
  }
  function rewardNotice(id,title){if(active)questReceipts.notifyMessage({id,title});else notice(title);}
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
  function residentInteraction(id,targets){return resolveVillageResidentInteraction({id,state:state(),view,position:pos,insides:INSIDES,doorNormal:DOOR_NORMAL,targets});}
  function residentInteractions(targets=view.expansionTargets??[],nearbyOnly=false){return [...new Set([...Object.keys(state().village.friends),...Object.keys(HOST_BY_ID)])].filter(id=>FOLK_BY_ID[id]||HOST_BY_ID[id]).map(id=>nearbyOnly?resolveNearbyVillageResidentInteraction({id,state:state(),view,position:pos,insides:INSIDES,doorNormal:DOOR_NORMAL,targets}):residentInteraction(id,targets)).filter(Boolean);}
  // A talk destination is a clear place to stand, often across a counter.
  // Cinematic subjects instead use the resident's actual feet in this realm.
  function neighbourFeet(id){const resident=residentInteraction(id);return resident.samePlace?resident.feet:null;}
  function besideNeighbour(id){
    if(!active||view.director.active||state().paused||decorate.active)return false;
    const resident=residentInteraction(id),point=resident.destination,name=resident.short;
    if(resident.nearby)return true;
    closePanel();releaseInput();offered=null;
    if(!point){notice("This neighbour's story opens with a later district.");return false;}
    guide(point,point.hallId?`${name} · ${INSIDES[point.hallId].name}`:name);centre();
    notice(!resident.available?`${resident.location}. ${resident.reason}`:view.inside&&!resident.samePlace?`Leave this room to find ${name}.`:view.activeExpansionArea?`Return to the village above to find ${name}.`:`Walk to ${name}, then choose Talk beside them.`);
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
    const s=state(),f=FOLK_BY_ID[id],choices=[],actions=[],stories=[];
    const add=(choice,run)=>{choices.push({...choice,text:choice.label});actions.push(run);};
    const addStory=(objectiveId,choice,run)=>stories.push({objectiveId,choice,run});
    const wait=Math.max(0,Math.ceil(s.village.friends[id]?.chatIn??0)),chatReady=M.canChat(s,id)&&!!M.nextChat(s,id);
    add({id:"chat",intent:"chat",label:"Have a chat",disabled:!chatReady,description:chatReady?"A little catch-up":wait?`Ready in ${wait>=60?`${Math.floor(wait/60)}m `:""}${wait%60}s`:"No new chat just now"},()=>startTalk(id));
    const deliveries=M.activeQuests(s).map(quest=>M.handOver(s,id,quest.id)).filter(delivery=>delivery?.ok),delivery=deliveries[0];
    for(const ready of deliveries)addStory(ready.quest,{id:`quest:deliver:${ready.quest}`,intent:"quest",label:"I brought what you need",description:QUEST_BY_ID[ready.quest].title},()=>handOverTo(id,ready.quest));
    for(const q of M.offeredBy(s,id))addStory(q.id,{id:`quest:start:${q.id}`,intent:"quest",label:q.title,description:"I'd like to help"},()=>takeQuest(q.id));
    for(const q of M.activeQuests(s).filter(quest=>quest.giver===id&&!stories.some(story=>story.objectiveId===quest.id)))addStory(q.id,{id:`quest:continue:${q.id}`,intent:"quest",label:q.title,description:M.questStepText(s,q.id)},()=>{if(!besideNeighbour(id))return;followObjective(q.id);showPanel("journal",id);});
    for(const chapter of expansionRecords().filter(c=>c.giver===id&&["available","active"].includes(c.status))){addStory(chapter.id,{id:`expansion:${chapter.id}`,intent:"quest",label:chapter.title,description:`${chapter.optional?"":"Village story · "}${chapter.next?.name??"A story waiting to unfold"}`},()=>{if(!besideNeighbour(id))return;const next=expansionRecords().find(c=>c.id===chapter.id)?.next;if(!next){showPanel("journal",id);return;}followExpansion(chapter.id);const go=()=>{if(nearActivity(next)){expansionSlot=null;showPanel("expansion",next.id);}else{guideTracked();render();notice(`Follow the marker: ${next.name}`);}};if(!openingScene(next,go))go();});}
    const priority=residentObjectivePriority(objectiveRecords(),id,{preferredId:followedObjective()?.id,readyDeliveryId:delivery?.ok?delivery.quest:null});
    const primary=stories.find(story=>story.objectiveId===(delivery?.ok?delivery.quest:null))??priority.map(record=>stories.find(story=>story.objectiveId===record.id)).find(Boolean)??stories[0];
    if(primary)add(primary.choice,primary.run);
    if(stories.length>1)add({id:"stories",intent:"stories",label:`Other stories · ${stories.length-1}`,description:`Choose another story with ${f.short??f.name}`},()=>{if(besideNeighbour(id))showPanel("journal",id);});
    if(["rowan","tansy","opal","cinder","granny"].includes(id))add({id:"farm-gifts",intent:"workshop",label:id==="cinder"?"Restaurant orders":"Bring a discovery home",description:"Useful recipes, equipment and commissions"},()=>{if(besideNeighbour(id))showPanel(id==="rowan"?"upgrades":"farm-gifts",id==="rowan"?undefined:id);});
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
    const q=legacyQuest(id);if(!q||!besideNeighbour(q.giver)||M.questStatus(state(),id)!=="offered")return false;
    changed(M.startQuest(state(),id));followObjective(id);conversation(q.giver,q.intro??[q.blurb],()=>showPanel("journal"),q.title,{intent:"quest"});return true;
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
  function panelView(){const body=$("vg-panel-body"),focused=document.activeElement;return{scroll:body.scrollTop||0,journalTab:page?.kind==="journal"?journalTab:null,folds:[...body.querySelectorAll("details")].map((d,i)=>[foldKey(d,i),!!d.open]),focus:focused?.closest?.("#vg-panel-body")===body?focusKey(focused):null};}
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
    const openingMap=kind==="map"&&page?.kind!=="map";
    cancelGather();decorate.close();releaseInput();page=panelTrail.open(kind,id,{root:topLevel,replace:page?.kind===kind&&page.id!=null&&id!=null,view:viewState});
    if(kind==="journal"){
      const remembered=panelTrail.view()?.journalTab,followed=followedObjective();
      const entries=id?objectiveRecords().filter(record=>record.giver===id||record.status==="active"&&record.legacy?.steps[record.completed]?.who===id):objectiveRecords();
      journalTab=JOURNAL_TABS.includes(remembered)?remembered:entries.some(record=>record.status==="active"||record.id===followed?.id)?"active":"discover";
    }
    if(openingMap)captureMapSnapshot();
    $("vg-panel").hidden=false;root.classList.add("has-panel");root.dataset.panel=kind;panelSignature="";drawPanel(true);
  }
  // The scene caches structural changes. Opening a map may capture once;
  // live pin and panel updates only reuse its image and projection.
  function captureMapSnapshot(){
    const followed=followedObjective();
    // Keep the pins with this opening's picture. Their buttons still resolve
    // the resident or story live before choosing a route or talking.
    mapPresentation={position:view.inside?null:{...pos},currentArea:view.activeExpansionArea??"surface",residents:residentInteractions().map(r=>({...r,...r.point,hall:r.inside})),objective:objectiveDestination(followed)};
    mapSnapshot=undefined;mapSnapshotError=false;if(!scene.captureVillageMap)return;try{mapSnapshot=scene.captureVillageMap();mapSnapshotError=!mapSnapshot;}catch{mapSnapshot=null;mapSnapshotError=true;}
  }
  function panelBack(){const previous=panelTrail.back(panelView());if(!previous){closePanel(true);return;}const openingMap=previous.kind==="map"&&page?.kind!=="map";releaseInput();page=previous;if(openingMap)captureMapSnapshot();root.dataset.panel=page.kind;panelSignature="";drawPanel(true);}
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
    if(kind==="journal"&&initial&&JOURNAL_TABS.includes(savedView?.journalTab))journalTab=savedView.journalTab;
    let title="",tag="Hollow Green",html="";
    if(kind==="people") {
      title="Your neighbours";tag="People of Hollow Green";
      html=villageNeighbourCards(residentInteractions().map(resident=>({...resident,person:FOLK_BY_ID[resident.id]??HOST_BY_ID[resident.id],bond:M.friendshipWith(s,resident.id),image:portrait(resident.id),offers:M.offeredBy(s,resident.id)})));
    }
    if(kind==="resident"){
      const f=FOLK_BY_ID[id],bond=M.friendshipWith(s,id),delivery=M.handOver(s,id),offers=M.offeredBy(s,id),fav=M.favourOf(s,id),priority=delivery?.ok?"delivery":offers.length?"quest":"chat",image=portrait(id);title=f.name;tag=`Friendship ${bond.level} · ${bond.title}`;
      html=`<div class="vg-resident-summary">${image?`<img src="${image}" alt="">`:""}<div><b>${escape(f.role)}</b><small>${escape(bond.title)}</small><meter value="${bond.progress??0}" min="0" max="1" aria-label="Friendship progress"></meter></div></div><div class="vg-resident-actions"><button class="vg-ch-action${priority==="chat"?" vg-ch-primary":""}" data-vg-chat="${id}"${priority==="chat"?" data-pad-default":""}>${M.canChat(s,id)?"Have a chat":"Say hello"}</button></div>`;
      if(delivery)html+=`<article class="vg-resident-task"><small>${escape(QUEST_BY_ID[delivery.quest].title)}</small><h3>${escape(delivery.step.text)}</h3>${delivery.ok?`<button class="vg-ch-action vg-ch-primary" data-vg-handover="${id}" data-pad-default>Hand over</button>`:`<p>Gather the remaining supplies, then bring them back here.</p><button class="vg-ch-action" data-vg-page="materials">Check your satchel</button>`}</article>`;
      html+=offers.map((q,i)=>`<article class="vg-resident-task"><small>New story</small><h3>${escape(q.title)}</h3><p>${escape(q.blurb)}</p><button class="vg-ch-action vg-ch-primary" data-vg-start="${q.id}"${priority==="quest"&&!i?" data-pad-default":""}>I'd like to help</button></article>`).join("");
      if(fav)html+=`<article class="vg-resident-task"><small>A little favour</small><h3>${escape(fav.text??fav.title??`${fav.n} ${M.villageItemName(fav.item,fav.n)}`)}</h3><p>${fav.n} ${escape(M.villageItemName(fav.item,fav.n))} · ${money(fav.pay)}</p>${button("Deliver",`data-vg-favour="${id}"`,M.villageItemCount(s,fav.item)<fav.n)}</article>`;
      const gifts=M.giftable(s);html+=`<details data-vg-details-key="gifts:${id}"><summary>Give a present · ${M.giftsLeft(s,id)} left</summary><p class="vg-menu-lead">A small gift helps your friendship grow.</p><div class="vg-choice-list">${gifts.map(g=>button(escape(M.villageItemName(g.item)),`data-vg-gift="${escape(g.item)}" data-who="${id}"`,M.giftsLeft(s,id)<=0)).join("")||"Gather a little something for your satchel first."}</div></details><details data-vg-details-key="about:${id}"><summary>About ${escape(f.short??f.name)}</summary><p>${escape(f.about)}</p></details>`;
    }
    if(kind==="navigation"){title="Mothlight Village";tag="Your village, at a glance";html=`<div class="vc-hub-intro">${fidelityIcon("moth")}<p>Where will the evening take you?</p></div><div class="vg-navigation-hub">${navigationMarkup(true)}</div>`;}
    const chapter=kind==="journal"?renderVillageJournal({state:s,records:objectiveRecords(),followed:followedObjective(),who:id,portrait,tab:journalTab}):kind==="map"?renderVillageMap(s,{...mapPresentation,selectedDistrict:id,portrait,snapshot:mapSnapshot,snapshotError:mapSnapshotError,showResidents:mapShowResidents}):renderVillageChapter({kind,id,state:s,portrait,trackedQuestId:prefs.villageTrackedQuest,itemArt,position:pos});
    if(chapter)({title,tag,html}=chapter);
    if(kind==="materials"||kind==="stall"){const gems=state().village.expansion?.gems??{};html+=`<section class="vgx-journal"><header class="vgx-section-head">${expansionIcon('gemcraft',36)}<div><small>Discoveries from below</small><h3>Your rare gems</h3><p>Story crystals are kept separately and cannot be sold.</p></div></header><div class="vgx-gems">${Expansion.EXPANSION_GEMS.map(g=>`<article>${expansionIcon(g.id,44)}<span><b>${escape(g.name)}</b><small>${gems[g.id]??0} in your satchel · ${money(g.price)} each</small></span>${kind==="stall"?`<button class="vgx-action" data-vgx-sell-gem="${escape(g.id)}"${(gems[g.id]??0)>0?"":" disabled"}>Sell one</button>`:""}</article>`).join('')}</div></section>`;}
    if(kind==="farm-gifts"){title="Bring Mothlight home";tag=FOLK_BY_ID[id]?.name??"Village discoveries";html=renderVillageExpansionEconomy(s,{who:id});}
    if(kind==="expansion"){const activity=expansionInfo(id);({title,tag,html}=expansionActivityMarkup(activity,{nearby:nearActivity(activity),slot:expansionSlot}));}

    const signature=kind+":"+id+":"+html;
    if(!initial&&signature===panelSignature)return;panelSignature=signature;
    root.querySelector(".vf-panel-title-art").innerHTML=villagePanelArt(kind);$("vg-panel-title").textContent=title;$("vg-panel-tag").textContent=tag;$("vg-panel-body").innerHTML=html;
    const on=(sel,fn)=>$("vg-panel-body").querySelectorAll(sel).forEach(b=>b.onclick=()=>fn(b));
    bindVillageExpansionEconomy(body,(key,action)=>{const command=key.slice(8),owner=command==='cold-store'?'opal':command.startsWith('cinder-')?'cinder':command.startsWith('granny-')?'granny':'tansy';if(!besideNeighbour(owner))return;const result=M.actVillageExpansion?.(state(),key,{...action,context:expansionContext()});if(result?.ok){changed(result.events);notice(result.message??"Your village discovery is ready.");drawPanel();}else notice(result?.reason??"Gather the supplies shown first.");});
    on('[data-vgx-sell-gem]',b=>{if(view.inside||view.activeExpansionArea||Math.hypot(pos.x-FIXTURES.stall.x,pos.z-FIXTURES.stall.z)>TALK_REACH){closePanel();guide(FIXTURES.stall,"Rowan’s stall");notice("Bring your spare gems to Rowan’s stall.");return;}const result=M.sellExpansionGem?.(state(),b.dataset.vgxSellGem,1);if(result?.ok){changed(result.events);notice(result.reason);drawPanel();}else notice(result?.reason??"Choose an unreserved gem.");});
    const selectJournalTab=id=>{if(!JOURNAL_TABS.includes(id))return;journalTab=id;body.scrollTop=0;drawPanel();$("vg-panel-body").querySelector(`[data-vg-journal-tab="${id}"]`)?.focus({preventScroll:true});panelTrail.remember(panelView());};
    on('[data-vg-journal-tab]',b=>selectJournalTab(b.dataset.vgJournalTab));
    body.querySelectorAll('[data-vg-journal-tab]').forEach(tab=>{tab.onkeydown=e=>{const next=nextJournalTab(tab.dataset.vgJournalTab,e.key);if(!next)return;e.preventDefault();e.stopPropagation();selectJournalTab(next);};});
    on('[data-vgx-track]',b=>{journalTab="active";followExpansion(b.dataset.vgxTrack);guideTracked();render();drawPanel();});
    on('[data-vgx-guide]',b=>{const q=expansionRecords().find(c=>c.id===b.dataset.vgxGuide);if(q?.next){journalTab="active";guideExpansion(q.next);}});
    on('[data-vg-objective-guide]',b=>{if(followObjective(b.dataset.vgObjectiveGuide)){journalTab="active";closePanel();guideTracked();centre();render();}});
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
    on('[data-vg-map-neighbours]',()=>{mapShowResidents=!mapShowResidents;drawPanel(true);});
    on('[data-vg-track]',b=>{journalTab="active";if(followObjective(b.dataset.vgTrack))guideTracked();render();drawPanel();});
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
  function gardenDestination(id){const s=state(),obstacles=villageWalkObstacles(s);return resolveVillagePlaceDestination(s,id,(x,z)=>villageCellFree(s,x,z,VILLAGE_WALK_RADIUS,obstacles));}
  function focus(id){
    if(view.activeExpansionArea){guideExpansion({area:"green",name:"Village above",x:ARRIVAL.spawn[0],z:ARRIVAL.spawn[1]});return;}
    if(VILLAGE_PLACES.some(place=>place.id===id)){
      closePanel();const place=gardenDestination(id);
      if(!place){notice("This garden approach is occupied. Move a decoration to clear the walk, then choose the route again.");return;}
      guide(place,place.name);centre();notice(view.inside?`Leave this room, then follow the marker to ${place.name}.`:`Follow the marker to ${place.name}.`);return;
    }
    closePanel();const area=FORAGE_AREAS.find(a=>`forage:${a.id}`===id);if(area){guide(area,area.name);surveying=true;view.cameraActions.focus(area.x,area.z,26);return;}
    const points={arrival:ARRIVAL.spawn,tree:[FIXTURES.tree.x,FIXTURES.tree.z],stall:[FIXTURES.stall.x,FIXTURES.stall.z],square:[TOWN.cx*K,(TOWN.cz-9)*K]};
    const p=points[id];if(p){guide({x:p[0],z:p[1]},({arrival:"Farm path",tree:"Moth Tree",stall:"Rowan’s stall",square:"Moonclock Square"})[id]);surveying=true;if(id==="tree")view.cameraActions.focus(...p,34,6);else if(id==="square")view.cameraActions.focus(TOWN.cx*K,TOWN.cz*K,46,8);else view.cameraActions.focus(...p);return;}
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
  function enterExpansion(id){if(!active||busy())return false;const check=M.expansionAreaInfo?.(state(),id);if(check&&!check.open){notice(check.reason);return false;}const sceneResult=view.enterExpansionArea?.(id);if(!sceneResult){notice("This route is not ready yet.");return false;}const result=M.enterVillageExpansionArea?.(state(),id);if(result&&!result.ok){view.leaveExpansionArea?.();notice(result.reason);return false;}cancelGather();releaseInput();closePanel();offered=null;waypoint=null;guidedObjectiveStep=null;pos.x=sceneResult.spawn.x;pos.z=sceneResult.spawn.z;placeActor();if(actor)view.play.reset(actor.position);changed(result?.events??[]);return true;}
  function leaveExpansion(){
    cancelGather();const previous=Expansion.EXPANSION_AREA_BY_ID[view.activeExpansionArea],result=view.leaveExpansionArea?.();if(!result)return false;releaseInput();closePanel();offered=null;waypoint=null;guidedObjectiveStep=null;
    const backArea=previous?.returnArea,backScene=backArea?.startsWith("cave")?view.enterExpansionArea?.(backArea):null,spawn=backScene?(previous.returnPoint??backScene.spawn):result.spawn;
    pos.x=spawn.x;pos.z=spawn.z;const area=view.activeExpansionArea??backArea??"copse";M.enterVillageExpansionArea?.(state(),area);placeActor();if(actor)view.play.reset(actor.position);changed();return true;
  }
  let guidedObjectiveStep=null;
  const objectiveStepKey=record=>record?`${record.source}:${record.id}:${record.status}:${record.completed}`:null;
  function objectiveResource(material,district="green"){
    return NODES.filter(node=>node.district===district&&node.material===material&&M.nodeReady(state(),node.id)).map(node=>({...node,...villageNodePosition(state(),node)})).filter(node=>node.kind!=="blight"||Array.from({length:9},(_,i)=>i?{x:node.x+Math.cos((i-1)*Math.PI/4)*1.4,z:node.z+Math.sin((i-1)*Math.PI/4)*1.4}:node).some(point=>villageCellFree(state(),point.x,point.z))).sort((a,b)=>Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z))[0]??null;
  }
  // Coordinates stay live at the scene boundary; the shared story catalogue
  // cannot mistake a saved home or an old resource position for today's target.
  function objectiveDestination(record){
    if(!record||record.status==="locked"||record.status==="done")return null;
    const metadata={objectiveId:record.id,objectiveStep:objectiveStepKey(record)};
    if(record.chapter){const next=record.chapter.next;return next?{...next,...metadata,chapter:record.id,step:next.id}:null;}
    const step=M.questStep(state(),record.id),residentId=step?.who??record.giver;
    if(!step||["tour","talk","deliver","give","pay"].includes(step.kind)){
      const resident=residentInteraction(residentId),point=resident.destination;
      return point?{...point,...metadata,name:record.task,area:point.area??record.area}:null;
    }
    if(["gather","root-out"].includes(step.kind)){
      const node=objectiveResource(step.kind==="root-out"?"cursed-spores":step.material,step.district??"green");
      return node?{...node,...metadata,nodeId:node.id,name:record.task,area:step.district??"green",realm:"surface"}:null;
    }
    if(step.kind==="find"&&step.item!=="page-3"){
      const object=M.storyObjectsHere(state(),"village").find(item=>item.id===step.item);
      return object?{...object,...metadata,name:record.task,area:"green",realm:"surface"}:null;
    }
    if(step.kind==="place"){
      const plan=Object.values(INSIDES).find(inside=>inside.host===step.near);
      if(!plan)return null;const [nx,nz]=DOOR_NORMAL[plan.door.facing];
      return{x:(plan.door.x+nx*3.2)*K,z:(plan.door.z+nz*3.2)*K,...metadata,name:record.task,area:"green",realm:"surface"};
    }
    if(["carve","cook","harvest","sell","earn","fish"].includes(step.kind)||step.item==="page-3")return{x:ARRIVAL.back[0],z:ARRIVAL.back[1],...metadata,name:"Farm path",area:"green",realm:"surface"};
    return null;
  }
  // Changing a step replaces only its own marker. A manually chosen garden or
  // neighbour route remains in the player's hands until they follow again.
  function guideTracked(){
    const record=followedObjective(),target=objectiveDestination(record);guidedObjectiveStep=objectiveStepKey(record);
    if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z)){if(waypoint?.objectiveId)waypoint=null;return false;}
    const here=currentArea();if(record.chapter&&target.area!==here&&(target.area.startsWith("cave")||here.startsWith("cave"))){waypoint=null;return false;}
    waypoint={...target,label:target.name};return true;
  }
  const introSeen=new Set();
  // A chapter opens with its giver's scene, once, before its first step can be done.
  function openingScene(info,then){const chapter=Expansion.EXPANSION_CHAPTER_BY_ID[info?.chapter],e=state().village.expansion;if(!chapter?.intro?.length||info.order!==0||e?.completed?.[info.id]||introSeen.has(chapter.id))return false;introSeen.add(chapter.id);followExpansion(chapter.id);conversation(chapter.who,chapter.intro,then,chapter.title,{intent:"quest"});return true;}
  // Every step answers: what you found, then the giver's closing scene when it was the last.
  function afterExpansionActivity(info){
    const chapter=Expansion.EXPANSION_CHAPTER_BY_ID[info.chapter],finished=!!state().village.expansion?.chapters?.[info.chapter];closePanel();releaseInput();
    const told=info.type==="reveal"?info.text:info.found,lines=[...(told?[{who:"narrator",text:told}]:[]),...(finished?chapter?.done??[]:[])];
    const onward=()=>{if(finished){if(waypoint?.objectiveId===info.chapter||waypoint?.chapter===info.chapter)waypoint=null;expansionCachedAt=-1;const upNext=!chapter?.optional&&!prefs.villageTrackedQuest&&!state().village.expansion?.tracked?expansionRecords().find(c=>!c.optional&&["available","active"].includes(c.status)):null;if(upNext){followExpansion(upNext.id);guideTracked();}render();return;}if(guideTracked()){const next=trackedExpansion()?.next;if(next)notice(`Next: ${next.name}`);}render();};
    if(lines.length)conversation(chapter?.who??info.who??"elowen",lines,onward,chapter?.title??info.name,{intent:"quest"});else onward();
  }
  function runExpansion(id,action={}){const info=expansionInfo(id);if(!nearActivity(info)){guideExpansion(info);return false;}if((info.type==="vein"||info.type==="story-vein")&&!action.solve&&!gather)return beginExpansionMine(info);const result=M.actVillageExpansion?.(state(),id,{...action,context:expansionContext()});if(!result?.ok){notice(result?.reason??"Look around for another clue.");drawPanel();return false;}changed(result.events);if(expansionInfo(id)?.done)afterExpansionActivity(info);else drawPanel();return true;}
  function beginExpansionMine(info){if(gather||!actor||info.canAct===false){if(info.reason)notice(info.reason);return false;}closePanel();releaseInput();gather={id:info.id,expansion:true,kind:"vein",material:"stone",target:{x:info.x,z:info.z},elapsed:0,strikes:0,job:++gatherSerial,duration:1.15};root.classList.add("is-gathering");$("vg-gather").hidden=false;$("vg-gather-art").innerHTML=expansionIcon(info.gem??"gemcraft",36);$("vg-gather-label").textContent="Mining the ringing stone";$("vg-gather-fill").style.width="0%";view.gatherTool?.({actor,material:"stone",target:gather.target,progress:0,active:true});gatherSound(gather,"start");return true;}
  function pick(hit){if(!active)return;if(decorate.active){decorate.pick(hit);return;}if(busy())return;if(hit.type==="expansion-portal"){const portal=(view.expansionTargets??[]).find(t=>t.type===hit.type&&t.id===hit.id);if(!portal||!Number.isFinite(portal.x)||!Number.isFinite(portal.z)){notice("Walk to the marked entrance first.");return;}if(Math.hypot(portal.x-pos.x,portal.z-pos.z)>TALK_REACH){guideExpansion(portal);return;}const to=portal.targetArea??portal.to??portal.id;if(to==="exit"||to==="surface")leaveExpansion();else enterExpansion(to);return;}if(hit.type==="expansion-activity"){const info=expansionInfo(hit.id);if(!nearActivity(info)){guideExpansion(info);return;}const begin=()=>{if(["vein","story-vein"].includes(info.type))beginExpansionMine(info);else{expansionSlot=null;showPanel("expansion",hit.id);}};if(!openingScene(info,begin))begin();return;}if(hit.type==="village-folk")meet(hit.id);else if(hit.type==="village-door")enterHall(hit.id);else if(hit.type==="village-carriage")requestReturn("carriage");else if(hit.type==="village-noticeboard")showPanel("journal");else if(hit.type==="village-stall")showPanel("stall");else if(hit.type==="village-node"){beginGather(hit.id);}else if(hit.type==="village-page"){const e=M.findObject(state(),hit.id);if(e){changed(e);notice("A page of Elowen's letter");}}}
  // A chosen destination stays relative to the walking camera, rather than taking it away.
  function guide(point,label){waypoint={x:point.x,z:point.z,label,...(point.objectiveId?{objectiveId:point.objectiveId,objectiveStep:point.objectiveStep}:{}),...(point.placeId?{placeId:point.placeId,realm:point.realm}:{}),...(point.chapter?{chapter:point.chapter,objectiveId:point.chapter,objectiveStep:objectiveStepKey(followedObjective()),step:point.id}:{}),...(point.material&&point.id?{nodeId:point.id}:{}),...(point.folkId?{folkId:point.folkId,realm:point.realm,area:point.area,inside:point.inside,hallId:point.hallId}:{})};render();}
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
    const result=M.gatherNode(state(),work.id);if(result?.full){gatherSound(work,"cancel");notice("Your satchel is full for this material.");}else if(result){gatherSound(work,"complete");waypoint=null;guidedObjectiveStep=null;changed(result.events);notice(result.cleared?(result.overflow?"Cursed fungus cleared · sample satchel full":"Cursed fungus cleared · spore sample collected"):`Gathered ${result.amount} ${MATERIALS.find(m=>m.id===result.material)?.name.toLowerCase()??result.material}`);}else gatherSound(work,"cancel");
  }
  function placeActor(){if(!actor)return;actor.position.set(pos.x,view.inside ? .2 : (view.expansionGroundAt?.(pos.x,pos.z)??view.groundAt(pos.x,pos.z))+.04,-pos.z);}
  function updateOwnerView(moving=false,front=false){
    if(!actor)return;
    ownerMoving=moving;ownerFront=front;
    const dxCam=view.camera.position.x-actor.position.x,dzCam=view.camera.position.z-actor.position.z;actor.rotation.y=Math.atan2(dxCam,dzCam);const lean=actor.children[0];if(lean){lean.rotation.x=-LEAN;const pitch=Math.atan2(view.camera.position.y-actor.position.y-1.2,Math.hypot(dxCam,dzCam));lean.scale.y=Math.min(1.6,1/Math.cos(Math.max(0,pitch-LEAN)));}
    spriteRight.set(1,0,0).applyQuaternion(view.camera.quaternion);spriteRight.y=0;spriteRight.normalize();view.camera.getWorldDirection(spriteForward);spriteForward.y=0;spriteForward.normalize();
    const across=heading.x*spriteRight.x+heading.z*spriteRight.z,away=heading.x*spriteForward.x+heading.z*spriteForward.z,baseView=state().wardrobe.equipped[who]===who+"-base",facing=front?"front":idle>1.2&&!baseView?"front":Math.abs(across)>Math.abs(away)*.75?"side":away>0?"back":"front";
    animateSprite(actor,moving?walkingAge:clock,moving,moving?across:0,who==="shane"?1.7:0);actor.userData.playerAnimate?.({who,outfit:state().wardrobe.equipped[who],facing,angle:front?0:Math.atan2(across,-away),phase:gaitPhase(walkingAge*2.3,BASE_OWNER_STRIDE),keepFacingOnIdle:!front&&baseView,walking:moving,time:clock,age:moving?walkingAge:clock,dx:moving?across:0,controlled:true});
  }
  function appearanceKey(){return JSON.stringify([who,state().wardrobe?.equipped?.[who],M.activeLook(state(),who)]);}
  function makeActor(){surveying=false;ownerMoving=ownerFront=false;if(actor){view.scene.remove(actor);actor.userData.dispose?.();}actor=scene.villageCharacter(who);if(actor){actorAppearance=appearanceKey();addMoonRim(actor,{lift:1.5});view.scene.add(actor);actor.visible=!view.director.active;placeActor();if(!view.director.active)view.play.reset(actor.position);}}
  function refreshAppearance(){
    if(!active||!actor||actorAppearance===appearanceKey())return false;
    const replacement=scene.villageCharacter(who);if(!replacement)return false;
    const previous=actor;actor=replacement;actorAppearance=appearanceKey();addMoonRim(actor,{lift:1.5});
    actor.position.copy(previous.position);actor.rotation.copy(previous.rotation);actor.visible=previous.visible;view.scene.add(actor);
    // Reapply the same travelled foot phase to the new outfit. No travel,
    // camera, menu, control or saved-state transition belongs to a recolour.
    updateOwnerView(gather?false:ownerMoving,gather?true:ownerFront);
    if(gather)view.gatherTool?.({actor,material:gather.material,target:gather.target,progress:gather.elapsed/gather.duration,active:true});
    view.scene.remove(previous);previous.userData.dispose?.();render();return true;
  }
  function enterHall(id){const plan=INSIDES[id];if(!active||busy()||!plan)return false;if(plan.area){const gate=M.expansionAreaInfo?.(state(),plan.area);if(!gate?.open){notice(gate?.reason??"Restore the path to this home first.");return false;}const[nx,nz]=DOOR_NORMAL[plan.door.facing],door={x:(plan.door.x+nx*1.4)*K,z:(plan.door.z+nz*1.4)*K,area:plan.area,name:plan.name};if(view.activeExpansionArea||view.inside||Math.hypot(pos.x-door.x,pos.z-door.z)>TALK_REACH){guideExpansion(door);return false;}}narration?.stop();surveying=false;releaseInput();offered=null;closePanel();if(view.goInside(id)===false)return false;const p=view.hallPoint(...plan.hall.spawn);pos.x=p.x;pos.z=-p.z;placeActor();if(actor)view.play.reset(actor.position);render();}
  function leaveHall(){const plan=INSIDES[view.inside];if(!plan)return;narration?.stop();surveying=false;releaseInput();offered=null;const [nx,nz]=DOOR_NORMAL[plan.door.facing];view.goOutside();pos.x=(plan.door.x+nx*3.2)*K;pos.z=(plan.door.z+nz*3.2)*K;placeActor();if(actor)view.play.reset(actor.position);render();}
  function tour(){if(!active||dialogue.active)return;view.dialogueCamera?.end({immediate:true});proximity.hide();cancelGather();waypoint=null;guidedObjectiveStep=null;narration?.stop();surveying=false;releaseInput();offered=null;closePanel();if(view.inside)leaveHall();while(view.activeExpansionArea)leaveExpansion();if(actor)actor.visible=false;$("vg-tour").hidden=false;$("vg-tour-skip").focus({preventScroll:true});view.director.start(k=>{$("vg-tour b").textContent=k.title;$("vg-tour span").textContent=k.sub;tourLine={speaker:"narrator",text:tourVoiceText(k)};narration?.play(tourLine.speaker,tourLine.text);tourVoices.refresh();},()=>{narration?.stop();tourLine=null;$("vg-tour").hidden=true;changed(M.finishTour(state()));if(actor){actor.visible=true;view.play.reset(actor.position);}}, {hold:()=>!!narration?.enabled&&["loading","playing"].includes(narration.current?.status)});}
  function open(){
    const s=state();if(active)return true;if(M.patchLevel(s).level<M.VILLAGE_LEVEL){notice(`Mothlight opens at level ${M.VILLAGE_LEVEL}.`);return false;}if(s.paused){notice("Resume the farm before travelling.");return false;}
    guidedObjectiveStep=null;clearCompletedTracking();
    narration?.stop();oldPlayer=scene.player.state();closeMenus();who=oldPlayer.who??who;scene.player.setEnabled(false);releaseInput();controls.reset();if(!M.villageOpen(s))M.inviteToVillage(s);M.arriveInVillage(s);save();farmReminder.reset();reminder.hidden=true;returnPathArmed=true;wasPaused=!!s.paused;active=true;root.hidden=false;document.body.classList.add("in-village");scene.enter("village");if(view.inside)view.goOutside();if(view.activeExpansionArea)view.leaveExpansionArea?.();M.enterVillageExpansionArea?.(s,"green");pos.x=ARRIVAL.spawn[0];pos.z=ARRIVAL.spawn[1];makeActor();view.setExpansionCompanion?.(s.village.expansion?.companions?.selected??null);render();onRender();if(!s.village.toured)tour();return true;
  }
  function close(){if(!active)return;returnPrompt.close({restoreFocus:false});questReceipts.clear();farmReminder.reset();reminder.hidden=true;wanderers.clear();proximity.hide();cancelGather();waypoint=null;guidedObjectiveStep=null;narration?.stop();tourLine=null;dialogueDone=null;chat=null;greeting=null;dialogue.close();view.dialogueCamera?.end({immediate:true});decorate.close();closePanel();panelTrail.reset();active=false;surveying=false;questExpanded=false;root.hidden=true;$("vg-tour").hidden=true;document.body.classList.remove("in-village");releaseInput();controls.reset();offered=null;latestPad=null;dialogueCameraOwned=false;if(view.inside)view.goOutside();if(view.activeExpansionArea)view.leaveExpansionArea?.();if(actor){view.scene.remove(actor);actor.userData.dispose?.();actor=null;}save();scene.leavePlace();if(oldPlayer?.enabled)scene.player.setEnabled(true,oldPlayer.who);onLeave();}
  const setText=(id,text)=>{const el=$(id);if(el.textContent!==text)el.textContent=text;};
  function render(){
    hudRefresh.rendered(now());
    invitation.hidden=active||!!scene.place||!M.villageDue(state());if(!active)return;const surface=villageResidentLocation(pos),local=["green","square"].includes(surface?.area)?villagePlaceAt(pos.x,pos.z):null;setText("vg-coins",money(state().coins));setText("vg-place",INSIDES[view.inside]?.name??Expansion.EXPANSION_AREA_BY_ID[view.activeExpansionArea]?.name??local?.name??surface?.name??"Hollow Green");setText("vg-person-name",who==="shane"?"Shane":"Natalie");
    const ownerImage=scene.portrait?.(state().wardrobe?.equipped?.[who]??who)??portrait(who)??"";if(ownerImage!==ownerPortraitUrl){ownerPortraitUrl=ownerImage;$("vg-person-portrait").innerHTML=ownerImage?`<img src="${escape(ownerImage)}" alt="">`:"";$("vg-person-portrait").hidden=!ownerImage;}
    const phase=villageAtmosphereAt(null,state().village.clock,clockGrade).phase;setText("vg-clock",phase[0].toUpperCase()+phase.slice(1));
    const rate=typeof M.villageFarmRate==="function"?M.villageFarmRate(state()):.025;setText("vg-rate",`${+(rate*100).toFixed(1)}%`);$("vg-farm-rate").setAttribute("aria-label",`Farm production while exploring: ${+(rate*100).toFixed(1)}%. Open workshop to improve it.`);$("vg-farm-rate").title=`Farm growth and trade run at ${+(rate*100).toFixed(1)}% while you explore. Improve this at Rowan’s workshop.`;$("vg-farm-rate").hidden=!!view.director.active||decorate.active;
    const q=followedObjective(),extra=q?.chapter,text=q?`${extra?`${q.areaName??"Mothlight"} · `:""}${q.task}`:"Meet your neighbours",rows=q?.requirements??[];
    const objective=$("vg-objective");objective.hidden=!!view.director.active||!q;if(!q)questExpanded=false;setText("vg-task",text);setText("vg-quest-title",q?.title??"Hollow Green");$("vg-quest-title").title=q?.title??"Hollow Green";
    const count=$("vg-quest-counts");count.hidden=!extra&&!rows.length;setText("vg-quest-counts",extra?`${extra.completed??0}/${extra.need??1}`:rows.length===1?`${rows[0].key==="coins"?money(Math.min(rows[0].have,rows[0].need)):Math.min(rows[0].have,rows[0].need)}/${rows[0].key==="coins"?money(rows[0].need):rows[0].need}`:rows.length?`${rows.filter(r=>r.complete).length}/${rows.length} ready`:"");
    const toggle=$("vg-quest-toggle");toggle.setAttribute("aria-expanded",String(questExpanded));toggle.setAttribute("aria-label",`${questExpanded?"Collapse":"Expand"} followed quest details`);root.classList.toggle("quest-expanded",questExpanded);$("vg-quest-details").hidden=!questExpanded;
    const hint=q?.hint??"Meet Elowen and Rowan to discover the village’s stories.",questPortrait=q?portrait(q.giver):null,signature=JSON.stringify([q?.id,rows,hint,questPortrait]);
    if(signature!==questHudSignature){questHudSignature=signature;$("vg-quest-portrait").innerHTML=trackerPortraitMarkup(q,questPortrait);$("vg-quest-details").innerHTML=trackerDetailsMarkup(rows,hint);$("vg-quest-journal").onclick=()=>showPanel("journal");}
    const routeKey=objectiveStepKey(q);if(waypoint?.objectiveId&&(waypoint.objectiveId!==q?.id||waypoint.objectiveStep!==routeKey)||!waypoint&&q&&(q.chapter||guidedObjectiveStep!==routeKey))guideTracked();
    if(waypoint?.folkId){const resident=residentInteraction(waypoint.folkId);if(resident.destination)Object.assign(waypoint,resident.destination,{label:resident.destination.hallId?`${resident.short} · ${resident.home.name}`:resident.short});else waypoint=null;}
    if(waypoint?.nodeId){if(!M.nodeReady(state(),waypoint.nodeId)){waypoint=null;guidedObjectiveStep=null;}else Object.assign(waypoint,villageNodePosition(state(),waypoint.nodeId));}
    if(waypoint?.placeId){const place=gardenDestination(waypoint.placeId);if(place)Object.assign(waypoint,place);else waypoint=null;}
    const finder=$("vg-wayfinding");finder.hidden=!waypoint||!!view.inside||waypoint.realm==="surface"&&!!view.activeExpansionArea;
    if(waypoint&&!finder.hidden){const dx=waypoint.x-pos.x,dz=-(waypoint.z-pos.z),right=new THREE.Vector3(1,0,0).applyQuaternion(view.camera.quaternion),forward=view.camera.getWorldDirection(new THREE.Vector3());right.y=forward.y=0;right.normalize();forward.normalize();const a=Math.atan2(dx*right.x+dz*right.z,dx*forward.x+dz*forward.z),arrows=["↑","↗","→","↘","↓","↙","←","↖"],arrow=arrows[(Math.round(a/(Math.PI/4))+8)%8],distance=Math.hypot(dx,dz);setText("vg-wayfinding",`${(waypoint.folkId?residentInteraction(waypoint.folkId).nearby:distance<(waypoint.nodeId?GATHER_REACH:3))?"●":arrow} ${waypoint.label} · ${Math.round(distance)} m`);}
    root.querySelectorAll('.vg-dock [data-vg-page]').forEach(b=>b.setAttribute("aria-current",villagePanelSection(page?.kind)===b.dataset.vgPage?"page":"false"));
  }
  function tick(dt){
    if(!active)return;clock+=dt;questReceipts.tick({blocked:busy()||decorate.active});reminder.hidden=!farmReminder.tick(dt,{paused:state().paused,blocked:busy()||decorate.active||!!questReceipts.active});wanderers.tick(dt,view.camera,{paused:state().paused,hidden:!!view.inside||!!view.activeExpansionArea||view.director.active||decorate.active});if(hudRefresh.due(now()))render();if(!actor)makeActor();if(!actor)return;
    const paused=!!state().paused;if(paused!==wasPaused){if(paused&&gather)cancelGather();else releaseInput();wasPaused=paused;}
    const cameraOwns=!!view.dialogueCamera?.active;
    // A new hold during the return is still a camera gesture. Require neutral
    // at the exact hand-back, not just when the conversation first opened.
    if(dialogueCameraOwned&&!cameraOwns)releaseInput();dialogueCameraOwned=cameraOwns;
    const input=controls.poll(),pad=input.pad;latestPad=pad?.g??null;dialogue.setInput?.(input.source,pad?.g);
    if(dialogue.active||cameraOwns)updateOwnerView(false,true);
    if(returnPrompt.active){returnPrompt.setInput(input.source,pad?.g);if(pad?.pressed(1)){returnPrompt.cancel();return;}if(pad?.pressed(0)){returnPrompt.confirm();return;}return;}
    if(decorate.active){decorate.tick(dt,pad);return;}
    if(pad?.pressed(1)){back();return;}if(pad?.pressed(9)&&!dialogue.active&&!view.director.active){page?closePanel(true):showPanel("navigation");return;}
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
    const liveTargets=view.expansionTargets??[],residentTargets=residentInteractions(liveTargets,true).filter(r=>r.samePlace).map(r=>r.target);
    const targets=view.inside||view.activeExpansionArea?[]:[...NODES.filter(n=>M.nodeReady(state(),n.id)).map(n=>({type:"village-node",id:n.id,...villageNodePosition(state(),n)})),...M.storyObjectsHere(state(),"village").map(o=>({type:"village-page",...o})),{type:"village-noticeboard",x:FIXTURES.noticeboard.x,z:FIXTURES.noticeboard.z},{type:"village-stall",x:FIXTURES.stall.x,z:FIXTURES.stall.z},{type:"village-carriage",x:ARRIVAL.back[0],z:ARRIVAL.back[1]},...Object.entries(INSIDES).map(([id,p])=>{const [nx,nz]=DOOR_NORMAL[p.door.facing];return{type:"village-door",id,x:(p.door.x+nx*1.4)*K,z:(p.door.z+nz*1.4)*K};})];
    const allTargets=[...residentTargets,...targets,...(view.inside?[]:liveTargets.filter(t=>t.type!=="village-folk"))];
    const interactionTargets=allTargets.filter(t=>t.type!=="expansion-activity"||(()=>{const a=expansionInfo(t.id);return a?.available&&!a.done;})());
    const reach=interactionTargets.map(t=>({...t,d:Math.hypot(t.x-pos.x,t.z-pos.z)})).filter(t=>t.type==="village-folk"?withinResidentReach(t.d,t.reach):t.d<(t.type==="village-node"?GATHER_REACH:TALK_REACH)).sort((a,b)=>a.d-b.d),followedStep=trackedExpansion()?.next?.id,near=reach.find(t=>t.type==="expansion-activity"&&t.id===followedStep)??reach.find(t=>t.type==="expansion-activity")??reach[0];offered=near??null;
    const nearNode=near?.type==="village-node"?NODES.find(n=>n.id===near.id):null,material=nearNode?.material,blight=nearNode?.kind==="blight";
    const context=near?{...near,material,...(blight?{label:"Root out",tool:"Hands"}:near.type==="expansion-activity"?{label:expansionInfo(near.id)?.verb??"Look closer"}:near.type==="expansion-portal"?{label:"Enter"}:{}),target:near.type?.startsWith("expansion-")?(near.name??expansionInfo(near.id)?.name??"Discovery"):blight?"Cursed fungus":near.type==="village-carriage"?"Farm":near.type==="village-page"?"Letter page":near.type==="village-folk"?(FOLK_BY_ID[near.id]??HOST_BY_ID[near.id])?.name:near.type==="village-door"?INSIDES[near.id]?.name:undefined,available:!material||M.canGather(state()),reason:material&&!M.canGather(state())?"Meet Rowan and Elowen first":undefined}:null;
    if(controls.setContext)controls.setContext(context);else{$("vg-interact").hidden=!near;$("vg-interact").textContent=near?.type==="village-carriage"?"Farm":near?.type==="village-folk"?"Talk":blight?"Root out":"Gather";}
    proximity.update({position:pos,inside:!!view.inside,time:clock,reducedMotion:!!prefs.reducedMotion,visible:!surveying,targets:allTargets.filter(t=>["village-node","village-page","expansion-activity"].includes(t.type)).map(t=>({...t,quest:t.type==="village-page"}))});
  }
  function toggleQuest(){if(!active||dialogue.active||view.director.active||state().paused||gather||$("vg-objective").hidden)return false;questExpanded=!questExpanded;render();return true;}
  function interact(){if(offered)pick(offered);}
  function centre(){surveying=false;if(actor){if(view.play.recenter)view.play.recenter(actor.position,heading);else view.play.reset(actor.position);}}
  function back(){if(returnPrompt.active){returnPrompt.cancel();return;}if(gather){cancelGather();return;}if(decorate.active){decorate.back();return;}if(view.director.active){view.director.skip();return;}if(dialogue.active){dialogue.close();return;}if(page){panelBack();return;}if(view.activeExpansionArea){leaveExpansion();return;}if(view.inside){leaveHall();return;}requestReturn("back");}
  $("vg-farm-rate").onclick=()=>showPanel("upgrades");$("vg-fullscreen").onclick=onFullscreen;$("vg-decorate").onclick=()=>openDecorate();$("vg-home").onclick=()=>requestReturn("header");$("vg-panel-close").onclick=()=>closePanel(true);$("vg-panel-back").onclick=panelBack;$("vg-quest-toggle").onclick=toggleQuest;$("vg-person").onclick=()=>{if(busy()||decorate.active)return;who=who==="shane"?"natalie":"shane";makeActor();render();};$("vg-tour-skip").onclick=()=>view.director.skip();$("vg-look").onclick=()=>!busy()&&!decorate.active&&centre();$("vg-interact").onclick=interact;
  root.querySelectorAll('.vg-dock [data-vg-page]').forEach(b=>b.onclick=()=>dockPage(b.dataset.vgPage));
  function releaseInput(){keys.clear();controls.release();}
  const keydown=e=>{if(!active||decorate.active)return;if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)back();return;}if(["INPUT","TEXTAREA","SELECT"].includes(e.target?.tagName))return;const key=e.key.toLowerCase();if(busy())return;if(key==="c"){e.preventDefault();centre();return;}if(key==="t"&&!e.repeat){e.preventDefault();toggleQuest();return;}if([" ","enter"].includes(key)&&e.target?.closest?.("button,summary"))return;if(key!=="e")keys.add(key);if([" ","enter","f","x","e"].includes(key)&&!e.repeat){e.preventDefault();interact();}else if(key.startsWith("arrow"))e.preventDefault();};const keyup=e=>keys.delete(e.key.toLowerCase());addEventListener("keydown",keydown,{capture:true});addEventListener("keyup",keyup);addEventListener("blur",releaseInput);
  const unsubscribeLooks=scene.onLooksChanged?.(refreshAppearance);
  return {open,close,requestReturn,enterExpansion,leaveExpansion,tick,render,onEvent,pick,meet,showPanel,openDecorate,decorate,enterHall,leaveHall,back,
    // For checking the village by eye (tools and the console): stand the owner somewhere and look along a bearing.
    place(x,z,look){if(!active)return false;pos.x=x;pos.z=z;if(look){heading.x=look.x;heading.z=look.z;}placeActor();if(actor)view.play.reset(actor.position,look?{heading:{...heading}}:{});render();return true;},
    dispose(){unsubscribeLooks?.();close();returnPrompt.destroy();questReceipts.destroy();proximity.dispose();controls.dispose();decorate.dispose();dialogue.dispose?.();tourVoices.dispose();removeEventListener("keydown",keydown,{capture:true});removeEventListener("keyup",keyup);removeEventListener("blur",releaseInput);root.remove();invitation.remove();},get active(){return active;},get blocked(){return busy();},get decorating(){return decorate.active;},get gesture(){return decorate.gesture;},get status(){return{area:currentArea(),expansionTracked:trackedExpansion(),returnPrompt:returnPrompt.active,returnPathArmed,panelDepth:panelTrail.depth,panelParent:panelTrail.parent?.kind??null,proximity:proximity.status,wanderers:wanderers.status,active,inside:view.inside,who,position:{...pos},panel:page?.kind??null,panelId:page?.id??null,journalTab:page?.kind==="journal"?journalTab:null,touring:view.director.active,surveying,decorating:decorate.active,input:root.dataset.input,questExpanded,trackedQuest:followedObjectiveId(),waypoint:waypoint?{...waypoint}:null,gathering:gather?{id:gather.id,material:gather.material,progress:gather.elapsed/gather.duration,tool:gatherTool(gather.material)}:null};}};
}
