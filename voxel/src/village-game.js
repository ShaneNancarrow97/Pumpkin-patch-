// Mothlight's first saved visit. The scene owns the picture; this controller
// owns input and calls the village's existing rules for every transaction.
import * as THREE from "three";
import * as M from "./model.js";
import { PLAN_SCALE as K, ARRIVAL, FIXTURES, NODES, MATERIALS } from "./content/village.js";
import { FOLK_BY_ID, HOST_BY_ID } from "./content/village-folk.js";
import { QUEST_BY_ID, BLUEPRINTS } from "./content/village-quests.js";
import { INSIDES, DOOR_NORMAL } from "./village-view.js";
import { moveVillageWalker, moveVillageHallWalker } from "./rules/village-navigation.js";
import { animateSprite } from "./sprite-voxels.js";
import { LEAN } from "./world.js";
import { gaitPhase } from "./directional-sprite-math.js";
import { createVillageConversation } from "./ui/village-conversation.js";
import { villageSpritePortrait } from "./village-sprite-actors.js";
import { tourVoiceText } from "./content/village-tour.js";
import { createNarrationControls } from "./ui/narration-controls.js";
import { createVillageControls } from "./ui/village-controls.js";
import { createVillageDecorate } from "./ui/village-decorate.js";
import { renderVillageChapter } from "./ui/village-chapters.js";
import { gardenSpriteIcon } from "./ui/garden-icons.js";
import { villageItemIcon } from "./ui/village-item-markup.js";
import { installVillageItemArt } from "./ui/village-item-art.js";
import { decorIcon } from "./ui/kit.js";

const escape = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"£"+Math.round(n).toLocaleString("en-GB");
export function createVillageGame({ state, scene, save, notice, closeMenus = () => {}, onLeave = () => {}, onRender = () => {}, conversationView = createVillageConversation, portrait = villageSpritePortrait, narration, savePrefs = () => {}, prefs = {}, onFullscreen = () => {}, controlsView = createVillageControls, decorateView = createVillageDecorate, itemArt = item => item.kind === "home" ? decorIcon(item.id, 56) : gardenSpriteIcon(item.id) || villageItemIcon(item.id) }) {
  installVillageItemArt();
  const root=document.createElement("section");root.id="village-game";root.hidden=true;root.setAttribute("aria-label","Mothlight Village");
  root.innerHTML=`<header class="vg-heading"><button id="vg-home" aria-label="Return to the farm">‹ <span>Farm</span></button><div><small>Mothlight Village</small><b id="vg-place">Hollow Green</b></div><span id="vg-coins" aria-label="Coins"></span><button id="vg-person" aria-label="Switch playable character">Shane</button><button id="vg-fullscreen" aria-label="Toggle fullscreen" title="Fullscreen">⛶</button></header><button id="vg-objective" class="vg-objective" hidden></button><div id="vg-tour" class="vg-tour" hidden><b></b><span></span><button id="vg-tour-skip">Skip tour</button></div><nav class="vg-dock" aria-label="Village actions"><button data-vg-page="map">Map</button><button data-vg-page="people" aria-label="Neighbours">People</button><button data-vg-page="journal">Journal</button><button data-vg-page="materials">Satchel</button><button id="vg-decorate">Decorate</button></nav><aside id="vg-panel" hidden role="dialog" aria-modal="false" aria-labelledby="vg-panel-title"><header><div><small id="vg-panel-tag"></small><h2 id="vg-panel-title"></h2></div><button id="vg-panel-close" aria-label="Close village panel">×</button></header><div id="vg-panel-body"></div></aside><div id="vg-stick-zone" aria-label="Movement thumbstick"><div id="vg-stick" hidden><i></i></div></div><button id="vg-interact" class="vg-interact" hidden>Talk</button><button id="vg-look" class="vg-look" aria-label="Centre the camera">◎</button>`;
  document.body.append(root);
  const invitation=document.createElement("button");invitation.id="village-invitation";invitation.hidden=true;invitation.textContent="A letter from Elowen  ›";invitation.onclick=()=>open();document.body.append(invitation);
  const $=id=>root.querySelector("#"+id),view=scene.villageView;
  let surveying=false,active=false,who="shane",actor=null,walkingAge=0,clock=0,idle=0,page=null,offered=null,oldPlayer=null,dialogueDone=null,chat=null,tourLine=null;
  const tourVoices=createNarrationControls({mount:$("vg-tour"),narration,savePrefs,line:()=>view.director.active?tourLine:null});
  if(narration){$("vg-tour-skip").setAttribute("data-voice-skip","");tourVoices.element.append($("vg-tour-skip"));}
  const pos={x:ARRIVAL.spawn[0],z:ARRIVAL.spawn[1]},heading={x:0,z:-1},keys=new Set();
  const dialogue=conversationView({portrait,narration,savePrefs,onChoice(index){
    if(!chat)return undefined;const result=M.answerChat(state(),chat.who,chat.id,index);if(!result)return false;changed(result.events);chat=null;return result.reply;
  },onContinue({finished}){if(!finished)return;const done=dialogueDone;dialogueDone=null;dialogue.close();done?.();},onClose(id){if(id)view.folk.mood(id,"idle");dialogueDone=null;chat=null;}});
  const busy=()=>!!page||dialogue.active||view.director.active||state().paused;
  const controls=controlsView({root,blocked:()=>busy()||decorate.active,onRelease:()=>keys.clear()});
  const decorate=decorateView({state,view,root,notice,onMenuInput:(surface,pad)=>controls.handleMenu(surface,pad),onInputReset:()=>controls.release(),onChanged:events=>changed(events),actorPosition:()=>({...pos}),onClose(){releaseInput();centre();render();},onShop:()=>showPanel("stall")});
  let panelSignature="",panelAge=0;
  function openDecorate(options={}) {
    if(!active||view.director.active||dialogue.active||state().paused)return false;
    if(view.inside)leaveHall();closePanel();releaseInput();surveying=true;view.play.pause?.();
    return decorate.open(options);
  }
  function onEvent(e){
    if(e.type==="quest-done")notice(`${QUEST_BY_ID[e.quest]?.title??"Quest"} complete · rewards received`);
    else if(e.type==="friend-level")notice(`${FOLK_BY_ID[e.who]?.short??e.who} · ${M.friendshipWith(state(),e.who)?.title??"Friendship grew"}`);
    else if(e.type==="almanac-page")notice(`Almanac page complete · keepsakes added to your collection`);
    else if(e.type==="duty")notice(`Almanac task complete · +${money(e.coins)}`);
    else if(e.type==="quest-step"){
      const step=QUEST_BY_ID[e.quest]?.steps[e.step];if(step?.kind!=="build")return false;
      notice(`${BLUEPRINTS.find(b=>b.id===step.blueprint)?.name??"Your neighbour's home"} restored`);
    }else return false;
    return true;
  }
  function changed(events=[]){save();view.sync();render();for(const e of events??[])onEvent(e);}
  function conversation(id,lines,done,headingText){
    releaseInput();closePanel();const f=FOLK_BY_ID[id]??HOST_BY_ID[id];dialogueDone=done;chat=null;view.folk.mood(id,"talk");
    dialogue.open({id,name:f?.name??id,role:f?.role??"",lines,friendship:M.friendshipWith(state(),id),heading:headingText});
  }
  function meet(id){
    if(!active||dialogue.active||view.director.active||state().paused)return;const s=state(),host=HOST_BY_ID[id];
    if(host){conversation(id,[host.greet[s.village.visits%host.greet.length]],null);return;}
    if(!s.village.friends[id]){notice("This neighbour's story opens with a later district.");return;}
    const talk=M.talkStep(s,id);if(talk){conversation(id,talk.lines,()=>changed(M.finishTalk(s,talk.quest,id)),QUEST_BY_ID[talk.quest].title);return;}
    showPanel("resident",id);
  }
  function startTalk(id){
    const s=state(),c=M.nextChat(s,id);if(!M.canChat(s,id)||!c){conversation(id,FOLK_BY_ID[id].greet,null);return;}
    conversation(id,[...c.lines,{choices:c.choices}],null);chat={who:id,id:c.id};
  }
  function closePanel(){if(page)releaseInput();page=null;panelSignature="";$("vg-panel").hidden=true;root.classList.remove("has-panel");}
  function showPanel(kind,id){if(!active||view.director.active||dialogue.active)return;decorate.close();releaseInput();page={kind,id};$("vg-panel").hidden=false;root.classList.add("has-panel");drawPanel(true);}
  const button=(label,attrs,disabled=false)=>`<button ${attrs} ${disabled?"disabled":""}>${label}</button>`;
  function drawPanel(initial=false){
    if(!page)return;const s=state(),{kind,id}=page,body=$("vg-panel-body"),scroll=body.scrollTop,focused=document.activeElement;
    const focusData=focused?.dataset?Object.entries(focused.dataset).filter(([k])=>k.startsWith("vg")||k==="quest"||k==="who"):[];
    const focusIndex=[...body.querySelectorAll("button,summary")].indexOf(focused);
    const opened=[...body.querySelectorAll("details")].map((d,i)=>d.open?i:-1).filter(i=>i>=0);
    let title="",tag="Hollow Green",html="";
    if(kind==="people") {title="Your neighbours";html=["elowen","rowan","vesper"].map(id=>{const f=FOLK_BY_ID[id]??HOST_BY_ID[id],bond=M.friendshipWith(s,id),image=portrait(id);return `<button class="vg-neighbour" data-vg-meet="${id}">${image?`<img src="${image}" alt="">`:""}<span><b>${f.name}</b><small>${bond?.met?bond.title:f.role}</small></span><i>›</i></button>`;}).join("");}
    if(kind==="resident"){
      const f=FOLK_BY_ID[id],bond=M.friendshipWith(s,id),delivery=M.handOver(s,id),offers=M.offeredBy(s,id),fav=M.favourOf(s,id);title=f.name;tag=bond.met?`${bond.title} · Level ${bond.level}`:f.role;
      html=`<p>${escape(f.about)}</p>${button(M.canChat(s,id)?"Have a chat":"Say hello",`data-vg-chat="${id}"`)}${offers.map(q=>`<article><small>New quest</small><h3>${q.title}</h3><p>${escape(q.blurb)}</p>${button("I'd like to help",`data-vg-start="${q.id}"`)}</article>`).join("")}`;
      if(delivery)html+=`<article><small>${QUEST_BY_ID[delivery.quest].title}</small><h3>${escape(delivery.step.text)}</h3>${button(delivery.ok?"Hand over":"Gather what's needed",`data-vg-handover="${id}"`,!delivery.ok)}</article>`;
      if(fav)html+=`<article><small>A little favour</small><h3>${escape(fav.text??fav.title??`${fav.n} ${M.villageItemName(fav.item,fav.n)}`)}</h3><p>${fav.n} ${escape(M.villageItemName(fav.item,fav.n))} · ${money(fav.pay)}</p>${button("Deliver",`data-vg-favour="${id}"`,M.villageItemCount(s,fav.item)<fav.n)}</article>`;
      const gifts=M.giftable(s);html+=`<details><summary>Give a present · ${M.giftsLeft(s,id)} left</summary><div class="vg-choice-list">${gifts.map(g=>button(escape(M.villageItemName(g.item)),`data-vg-gift="${escape(g.item)}" data-who="${id}"`,M.giftsLeft(s,id)<=0)).join("")||"Your satchel is empty."}</div></details>`;
    }
    const chapter=renderVillageChapter({kind,id,state:s,portrait,trackedQuestId:prefs.villageTrackedQuest,itemArt});
    if(chapter)({title,tag,html}=chapter);
    const signature=kind+":"+id+":"+html;
    if(!initial&&signature===panelSignature)return;panelSignature=signature;
    $("vg-panel-title").textContent=title;$("vg-panel-tag").textContent=tag;$("vg-panel-body").innerHTML=html;
    const on=(sel,fn)=>$("vg-panel-body").querySelectorAll(sel).forEach(b=>b.onclick=()=>fn(b));
    on('[data-vg-meet]',b=>meet(b.dataset.vgMeet));on('[data-vg-chat]',b=>startTalk(b.dataset.vgChat));
    on('[data-vg-start]',b=>{const q=QUEST_BY_ID[b.dataset.vgStart];changed(M.startQuest(s,q.id));conversation(q.giver,q.intro??[q.blurb],()=>showPanel("journal"),q.title);});
    on('[data-vg-handover]',b=>{const result=M.doHandOver(s,b.dataset.vgHandover,b.dataset.quest);if(result){changed(result);if(kind==="journal")drawPanel();else meet(b.dataset.vgHandover);}});
    on('[data-vg-favour]',b=>{const r=M.doFavour(s,b.dataset.vgFavour);if(r){changed(r.events);notice(`Thank you · ${money(r.pay)}`);drawPanel();}});
    on('[data-vg-gift]',b=>{const r=M.giveGift(s,b.dataset.who,b.dataset.vgGift);if(r){changed(r.events);conversation(b.dataset.who,[r.line],null);}});
    on('[data-vg-tour]',()=>tour());on('[data-vg-buy]',b=>{if(M.buyFromStall(s,b.dataset.vgBuy)){changed();drawPanel();}});on('[data-vg-focus]',b=>focus(b.dataset.vgFocus));
    on('[data-vg-page]',b=>showPanel(b.dataset.vgPage));
    on('[data-vg-track]',b=>{prefs.villageTrackedQuest=b.dataset.vgTrack;savePrefs();render();drawPanel();});
    on('[data-vg-decorate]',()=>openDecorate());
    on('[data-vg-upgrade]',b=>{if(M.buyVillageUpgrade(s,b.dataset.vgUpgrade)){changed();notice("Rowan's improvement is ready.");drawPanel();}});
    on('[data-vg-home]',close);
    on('[data-vg-object]',b=>{const object=M.storyObjectsHere(s,"village").find(o=>o.id===b.dataset.vgObject);if(object){closePanel();surveying=true;view.cameraActions.focus(object.x,object.z,18);}});
    on('[data-vg-gather]',b=>{
      const spots=NODES.filter(n=>n.district==="green"&&n.material===b.dataset.vgGather);
      const node=spots.sort((a,b)=>Number(M.nodeReady(s,b.id))-Number(M.nodeReady(s,a.id))||Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z))[0];
      if(node){closePanel();surveying=true;view.cameraActions.focus(node.x,node.z,18);notice(M.nodeReady(s,node.id)?"A gathering spot is ready. Walk over to collect it.":"This gathering spot is growing back.");}
    });
    if(initial){body.scrollTop=0;$("vg-panel-close").focus({preventScroll:true});}
    else {[...body.querySelectorAll("details")].forEach((d,i)=>d.open=opened.includes(i));
      const choices=[...body.querySelectorAll("button,summary")],next=focusData.length?choices.find(b=>!b.disabled&&focusData.every(([k,v])=>b.dataset[k]===v)):choices[focusIndex];
      if(next&&!next.disabled)next.focus({preventScroll:true});body.scrollTop=scroll;}

  }
  function focus(id){
    closePanel();const points={arrival:ARRIVAL.spawn,tree:[FIXTURES.tree.x,FIXTURES.tree.z],stall:[FIXTURES.stall.x,FIXTURES.stall.z]};
    const p=points[id];if(p){surveying=true;if(id==="tree")view.cameraActions.focus(...p,34,6);else view.cameraActions.focus(...p);return;}
    if(INSIDES[id]){surveying=true;const d=INSIDES[id].door;view.cameraActions.focus(d.x*K,d.z*K,26);}
  }
  function pick(hit){if(!active)return;if(decorate.active){decorate.pick(hit);return;}if(busy())return;if(hit.type==="village-folk")meet(hit.id);else if(hit.type==="village-door")enterHall(hit.id);else if(hit.type==="village-carriage")close();else if(hit.type==="village-noticeboard")showPanel("journal");else if(hit.type==="village-stall")showPanel("stall");else if(hit.type==="village-node"){const r=M.gatherNode(state(),hit.id);if(r?.full){notice("Your satchel is full for this material.");}else if(r){changed(r.events);notice(`Gathered ${r.amount} ${MATERIALS.find(m=>m.id===r.material)?.name.toLowerCase()??r.material}`);}else notice(M.canGather(state())?"Let this gathering spot grow back first.":"Meet Rowan and Elowen to receive your gathering tools.");}else if(hit.type==="village-page"){const e=M.findObject(state(),hit.id);if(e){changed(e);notice("A page of Elowen's letter");}}}
  function placeActor(){if(!actor)return;actor.position.set(pos.x,view.inside ? .2 : view.groundAt(pos.x,pos.z)+.04,-pos.z);}
  function makeActor(){surveying=false;if(actor){view.scene.remove(actor);actor.userData.dispose?.();}actor=scene.villageCharacter(who);if(actor){view.scene.add(actor);actor.visible=!view.director.active;placeActor();if(!view.director.active)view.play.reset(actor.position);}}
  function enterHall(id){const plan=INSIDES[id];if(!active||busy()||!plan)return;narration?.stop();surveying=false;releaseInput();offered=null;closePanel();view.goInside(id);const p=view.hallPoint(...plan.hall.spawn);pos.x=p.x;pos.z=-p.z;placeActor();if(actor)view.play.reset(actor.position);render();}
  function leaveHall(){const plan=INSIDES[view.inside];if(!plan)return;narration?.stop();surveying=false;releaseInput();offered=null;const [nx,nz]=DOOR_NORMAL[plan.door.facing];view.goOutside();pos.x=(plan.door.x+nx*3.2)*K;pos.z=(plan.door.z+nz*3.2)*K;placeActor();if(actor)view.play.reset(actor.position);render();}
  function tour(){if(!active||dialogue.active)return;narration?.stop();surveying=false;releaseInput();offered=null;closePanel();if(view.inside)leaveHall();if(actor)actor.visible=false;$("vg-tour").hidden=false;$("vg-tour-skip").focus({preventScroll:true});view.director.start(k=>{$("vg-tour b").textContent=k.title;$("vg-tour span").textContent=k.sub;tourLine={speaker:"narrator",text:tourVoiceText(k)};narration?.play(tourLine.speaker,tourLine.text);tourVoices.refresh();},()=>{narration?.stop();tourLine=null;$("vg-tour").hidden=true;changed(M.finishTour(state()));if(actor){actor.visible=true;view.play.reset(actor.position);}}, {hold:()=>!!narration?.enabled&&["loading","playing"].includes(narration.current?.status)});}
  function open(){
    const s=state();if(active)return true;if(M.patchLevel(s).level<M.VILLAGE_LEVEL){notice(`Mothlight opens at level ${M.VILLAGE_LEVEL}.`);return false;}if(s.paused){notice("Resume the farm before travelling.");return false;}
    narration?.stop();closeMenus();oldPlayer=scene.player.state();who=oldPlayer.who??who;scene.player.setEnabled(false);releaseInput();controls.reset();if(!M.villageOpen(s))M.inviteToVillage(s);M.arriveInVillage(s);save();active=true;root.hidden=false;document.body.classList.add("in-village");scene.enter("village");if(view.inside)view.goOutside();pos.x=ARRIVAL.spawn[0];pos.z=ARRIVAL.spawn[1];makeActor();render();onRender();if(!s.village.toured)tour();return true;
  }
  function close(){if(!active)return;narration?.stop();tourLine=null;dialogueDone=null;chat=null;dialogue.close();decorate.close();closePanel();active=false;surveying=false;root.hidden=true;$("vg-tour").hidden=true;document.body.classList.remove("in-village");releaseInput();controls.reset();offered=null;if(view.inside)view.goOutside();if(actor){view.scene.remove(actor);actor.userData.dispose?.();actor=null;}save();scene.leavePlace();onLeave();if(oldPlayer?.enabled)scene.player.setEnabled(true,oldPlayer.who);}
  const setText=(id,text)=>{const el=$(id);if(el.textContent!==text)el.textContent=text;};
  function render(){
    invitation.hidden=active||!!scene.place||!M.villageDue(state());if(!active)return;setText("vg-coins",money(state().coins));setText("vg-place",INSIDES[view.inside]?.name??"Hollow Green");setText("vg-person",who==="shane"?"Shane":"Natalie");
    const q=M.activeQuests(state()).find(q=>q.id===prefs.villageTrackedQuest)??M.trackedQuest(state()),text=q?M.questStepText(state(),q.id):"Meet your neighbours";const objective=$("vg-objective");objective.hidden=!!view.director.active||decorate.active;if(objective.textContent!==text)objective.textContent=text;
  }
  function tick(dt){
    if(!active)return;clock+=dt;render();if(!actor)makeActor();if(!actor)return;
    const input=controls.poll(),pad=input.pad;
    if(decorate.active){decorate.tick(dt,pad);return;}
    if(pad?.pressed(1)){back();return;}if(pad?.pressed(9)&&!dialogue.active&&!view.director.active){page?closePanel():showPanel("journal");return;}
    if(page||dialogue.active||view.director.active){
      panelAge+=dt;if(page&&panelAge>.8){panelAge=0;drawPanel();}
      controls.handleMenu(dialogue.active?document.getElementById("village-dialogue"):page?$("vg-panel"):$("vg-tour"),pad);return;
    }
    if(busy())return;
    if(pad?.pressed(0))interact();if(pad?.pressed(2))showPanel("map");if(pad?.pressed(3))showPanel("people");if(busy())return;if(pad?.pressed(11))centre();if(pad?.pressed(4))view.play.zoom(1);if(pad?.pressed(5))view.play.zoom(-1);
    const k=key=>keys.has(key)?1:0;let ix=input.move.x+k("d")+k("arrowright")-k("a")-k("arrowleft"),iy=input.move.y+k("s")+k("arrowdown")-k("w")-k("arrowup");const n=Math.hypot(ix,iy);if(n>1){ix/=n;iy/=n;}
    const right=new THREE.Vector3(1,0,0).applyQuaternion(view.camera.quaternion);right.y=0;right.normalize();const forward=new THREE.Vector3();view.camera.getWorldDirection(forward);forward.y=0;forward.normalize();const dx=right.x*ix-forward.x*iy,dz=right.z*ix-forward.z*iy,wantsMove=Math.hypot(dx,dz)>.05,speed=3.3*(keys.has("shift")||input.sprint?1.6:1),before={...pos};
    if(wantsMove){if(surveying)centre();if(view.inside){const plan=INSIDES[view.inside],origin=view.hallPoint(0,0),from={x:(pos.x-origin.x)/K,z:(-pos.z-origin.z)/K},next=moveVillageHallWalker(plan,from,dx*speed*dt/K,dz*speed*dt/K);if(next.z>0){leaveHall();return;}pos.x=origin.x+next.x*K;pos.z=-origin.z-next.z*K;}else Object.assign(pos,moveVillageWalker(state(),pos,dx*speed*dt,-dz*speed*dt));}
    // Footfalls follow travelled ground, including slow sticks and wall slides.
    const travelled=Math.hypot(pos.x-before.x,pos.z-before.z),moving=travelled>.0005;
    if(moving){heading.x=(pos.x-before.x)/travelled;heading.z=-(pos.z-before.z)/travelled;walkingAge+=travelled/2.3;idle=0;}else idle+=dt;
    placeActor();view.play.look(input.look.x+k("e")-k("q"),input.look.y,dt);if(!surveying)view.play.follow(actor.position,dt);
    const dxCam=view.camera.position.x-actor.position.x,dzCam=view.camera.position.z-actor.position.z;actor.rotation.y=Math.atan2(dxCam,dzCam);const lean=actor.children[0];if(lean){lean.rotation.x=-LEAN;const pitch=Math.atan2(view.camera.position.y-actor.position.y-1.2,Math.hypot(dxCam,dzCam));lean.scale.y=Math.min(1.6,1/Math.cos(Math.max(0,pitch-LEAN)));}
    right.set(1,0,0).applyQuaternion(view.camera.quaternion);right.y=0;right.normalize();view.camera.getWorldDirection(forward);forward.y=0;forward.normalize();
    const across=heading.x*right.x+heading.z*right.z,away=heading.x*forward.x+heading.z*forward.z,facing=idle>1.2?"front":Math.abs(across)>Math.abs(away)*.75?"side":away>0?"back":"front";
    animateSprite(actor,moving?walkingAge:clock,moving,moving?across:0,who==="shane"?1.7:0);actor.userData.playerAnimate?.({who,outfit:state().wardrobe.equipped[who],facing,angle:Math.atan2(across,-away),phase:gaitPhase(walkingAge*2.3,1.8),walking:moving,time:clock,age:moving?walkingAge:clock,dx:moving?across:0,controlled:true});
    const targets=view.inside?[{type:"village-folk",id:INSIDES[view.inside].host,x:view.hallPoint(...INSIDES[view.inside].hall.host).x,z:-view.hallPoint(...INSIDES[view.inside].hall.host).z}]:[...["elowen","rowan"].map(id=>({type:"village-folk",id,...view.folk.talkSpot(id)})),...NODES.filter(n=>n.district==="green"&&M.nodeReady(state(),n.id)).map(n=>({type:"village-node",id:n.id,x:n.x,z:n.z})),...M.storyObjectsHere(state(),"village").map(o=>({type:"village-page",...o})),{type:"village-noticeboard",x:FIXTURES.noticeboard.x,z:FIXTURES.noticeboard.z},{type:"village-stall",x:FIXTURES.stall.x,z:FIXTURES.stall.z},{type:"village-carriage",x:ARRIVAL.back[0],z:ARRIVAL.back[1]},...Object.entries(INSIDES).map(([id,p])=>{const [nx,nz]=DOOR_NORMAL[p.door.facing];return{type:"village-door",id,x:(p.door.x+nx*1.4)*K,z:(p.door.z+nz*1.4)*K};})];
    const near=targets.map(t=>({...t,d:Math.hypot(t.x-pos.x,t.z-pos.z)})).filter(t=>t.d<(view.inside?3.3:3)).sort((a,b)=>a.d-b.d)[0];offered=near??null;$("vg-interact").hidden=!near;$("vg-interact").textContent=near?.type==="village-door"?"Enter":near?.type==="village-folk"?"Talk":near?.type==="village-stall"?"Shop":near?.type==="village-noticeboard"?"Journal":near?.type==="village-carriage"?"Farm":near?.type==="village-page"?"Collect":"Gather";
  }
  function interact(){if(offered)pick(offered);}
  function centre(){surveying=false;if(actor)view.play.reset(actor.position);}
  function back(){if(decorate.active){decorate.back();return;}if(view.director.active){view.director.skip();return;}if(dialogue.active){dialogue.close();return;}if(page){closePanel();return;}if(view.inside){leaveHall();return;}close();}
  $("vg-fullscreen").onclick=onFullscreen;$("vg-decorate").onclick=()=>openDecorate();$("vg-home").onclick=close;$("vg-panel-close").onclick=closePanel;$("vg-objective").onclick=()=>showPanel("journal");$("vg-person").onclick=()=>{if(busy()||decorate.active)return;who=who==="shane"?"natalie":"shane";makeActor();render();};$("vg-tour-skip").onclick=()=>view.director.skip();$("vg-look").onclick=()=>!busy()&&!decorate.active&&centre();$("vg-interact").onclick=interact;
  root.querySelectorAll('[data-vg-page]').forEach(b=>b.onclick=()=>showPanel(b.dataset.vgPage));
  function releaseInput(){keys.clear();controls.release();}
  const keydown=e=>{if(!active||decorate.active)return;if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();back();return;}if(["INPUT","TEXTAREA","SELECT"].includes(e.target?.tagName))return;const key=e.key.toLowerCase();if(busy())return;if([" ","enter"].includes(key)&&e.target?.closest?.("button,summary"))return;keys.add(key);if([" ","enter","f","x"].includes(key)&&!e.repeat){e.preventDefault();interact();}else if(key.startsWith("arrow"))e.preventDefault();};const keyup=e=>keys.delete(e.key.toLowerCase());addEventListener("keydown",keydown,{capture:true});addEventListener("keyup",keyup);addEventListener("blur",releaseInput);
  return {open,close,tick,render,onEvent,pick,meet,showPanel,openDecorate,decorate,enterHall,leaveHall,back,dispose(){close();controls.dispose();decorate.dispose();dialogue.dispose?.();tourVoices.dispose();removeEventListener("keydown",keydown,{capture:true});removeEventListener("keyup",keyup);removeEventListener("blur",releaseInput);root.remove();invitation.remove();},get active(){return active;},get blocked(){return busy();},get decorating(){return decorate.active;},get gesture(){return decorate.gesture;},get status(){return{active,inside:view.inside,who,position:{...pos},panel:page?.kind??null,touring:view.director.active,surveying,decorating:decorate.active,input:root.dataset.input};}};
}
