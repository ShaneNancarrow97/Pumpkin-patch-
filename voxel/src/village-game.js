// Mothlight's first saved visit. The scene owns the picture; this controller
// owns input and calls the village's existing rules for every transaction.
import * as THREE from "three";
import * as M from "./model.js";
import { PLAN_SCALE as K, ARRIVAL, FIXTURES, NODES, MATERIALS } from "./content/village.js";
import { FOLK_BY_ID, HOST_BY_ID } from "./content/village-folk.js";
import { QUEST_BY_ID } from "./content/village-quests.js";
import { INSIDES, DOOR_NORMAL } from "./village-view.js";
import { moveVillageWalker, moveVillageHallWalker } from "./rules/village-navigation.js";
import { animateSprite } from "./sprite-voxels.js";
import { LEAN } from "./world.js";
import { createVillageConversation } from "./ui/village-conversation.js";
import { villageSpritePortrait } from "./village-sprite-actors.js";

const escape = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"£"+Math.round(n).toLocaleString("en-GB");
export function createVillageGame({ state, scene, save, notice, closeMenus = () => {}, onLeave = () => {}, onRender = () => {}, conversationView = createVillageConversation, portrait = villageSpritePortrait }) {
  const root=document.createElement("section");root.id="village-game";root.hidden=true;root.setAttribute("aria-label","Mothlight Village");
  root.innerHTML=`<header class="vg-heading"><button id="vg-home" aria-label="Return to the farm">‹ <span>Farm</span></button><div><small>Mothlight Village</small><b id="vg-place">Hollow Green</b></div><span id="vg-coins" aria-label="Coins"></span><button id="vg-person" aria-label="Switch playable character">Shane</button></header><button id="vg-objective" class="vg-objective" hidden></button><div id="vg-tour" class="vg-tour" hidden><b></b><span></span><button id="vg-tour-skip">Skip tour</button></div><nav class="vg-dock" aria-label="Village actions"><button data-vg-page="map">Map</button><button data-vg-page="people">Neighbours</button><button data-vg-page="journal">Journal</button><button data-vg-page="materials">Satchel</button></nav><aside id="vg-panel" hidden role="dialog" aria-modal="false" aria-labelledby="vg-panel-title"><header><div><small id="vg-panel-tag"></small><h2 id="vg-panel-title"></h2></div><button id="vg-panel-close" aria-label="Close village panel">×</button></header><div id="vg-panel-body"></div></aside><div id="vg-stick-zone" aria-label="Movement thumbstick"><div id="vg-stick" hidden><i></i></div></div><button id="vg-interact" class="vg-interact" hidden>Talk</button><button id="vg-look" class="vg-look" aria-label="Centre the camera">◎</button>`;
  document.body.append(root);
  const invitation=document.createElement("button");invitation.id="village-invitation";invitation.hidden=true;invitation.textContent="A letter from Elowen  ›";invitation.onclick=()=>open();document.body.append(invitation);
  const $=id=>root.querySelector("#"+id),view=scene.villageView;
  let surveying=false,active=false,who="shane",actor=null,walkingAge=0,clock=0,idle=0,page=null,offered=null,oldPlayer=null,dialogueDone=null,chat=null;
  const pos={x:ARRIVAL.spawn[0],z:ARRIVAL.spawn[1]},heading={x:0,z:-1},keys=new Set(),stick={x:0,y:0,id:null,cx:0,cy:0};
  const previousButtons=new Set();
  const dialogue=conversationView({portrait,onChoice(index){
    if(!chat)return undefined;const result=M.answerChat(state(),chat.who,chat.id,index);if(!result)return false;changed(result.events);chat=null;return result.reply;
  },onContinue({finished}){if(!finished)return;const done=dialogueDone;dialogueDone=null;dialogue.close();done?.();},onClose(id){if(id)view.folk.mood(id,"idle");dialogueDone=null;chat=null;}});
  const busy=()=>!!page||dialogue.active||view.director.active||state().paused;
  function changed(events=[]){save();view.sync();render();for(const e of events??[])if(e.type==="quest-done")notice(`${QUEST_BY_ID[e.quest]?.title??"Quest"} complete`);else if(e.type==="friend-level")notice(`${FOLK_BY_ID[e.who]?.short??e.who} · ${M.friendshipWith(state(),e.who)?.title??"Friendship grew"}`);}
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
  function closePanel(){page=null;$("vg-panel").hidden=true;root.classList.remove("has-panel");}
  function showPanel(kind,id){if(!active||view.director.active||dialogue.active)return;releaseInput();page={kind,id};$("vg-panel").hidden=false;root.classList.add("has-panel");drawPanel();}
  const button=(label,attrs,disabled=false)=>`<button ${attrs} ${disabled?"disabled":""}>${label}</button>`;
  function drawPanel(){
    if(!page)return;const s=state(),{kind,id}=page;let title="",tag="Hollow Green",html="";
    if(kind==="people") {title="Your neighbours";html=["elowen","rowan","vesper"].map(id=>{const f=FOLK_BY_ID[id]??HOST_BY_ID[id],bond=M.friendshipWith(s,id),image=portrait(id);return `<button class="vg-neighbour" data-vg-meet="${id}">${image?`<img src="${image}" alt="">`:""}<span><b>${f.name}</b><small>${bond?.met?bond.title:f.role}</small></span><i>›</i></button>`;}).join("");}
    if(kind==="resident"){
      const f=FOLK_BY_ID[id],bond=M.friendshipWith(s,id),delivery=M.handOver(s,id),offers=M.offeredBy(s,id),fav=M.favourOf(s,id);title=f.name;tag=bond.met?`${bond.title} · Level ${bond.level}`:f.role;
      html=`<p>${escape(f.about)}</p>${button(M.canChat(s,id)?"Have a chat":"Say hello",`data-vg-chat="${id}"`)}${offers.map(q=>`<article><small>New quest</small><h3>${q.title}</h3><p>${escape(q.blurb)}</p>${button("I'd like to help",`data-vg-start="${q.id}"`)}</article>`).join("")}`;
      if(delivery)html+=`<article><small>${QUEST_BY_ID[delivery.quest].title}</small><h3>${escape(delivery.step.text)}</h3>${button(delivery.ok?"Hand over":"Gather what's needed",`data-vg-handover="${id}"`,!delivery.ok)}</article>`;
      if(fav)html+=`<article><small>A little favour</small><h3>${escape(fav.text??fav.title??`${fav.n} ${M.villageItemName(fav.item,fav.n)}`)}</h3><p>${fav.n} ${escape(M.villageItemName(fav.item,fav.n))} · ${money(fav.pay)}</p>${button("Deliver",`data-vg-favour="${id}"`,M.villageItemCount(s,fav.item)<fav.n)}</article>`;
      const gifts=M.giftable(s);html+=`<details><summary>Give a present · ${M.giftsLeft(s,id)} left</summary><div class="vg-choice-list">${gifts.map(g=>button(escape(M.villageItemName(g.item)),`data-vg-gift="${escape(g.item)}" data-who="${id}"`,M.giftsLeft(s,id)<=0)).join("")||"Your satchel is empty."}</div></details>`;
    }
    if(kind==="journal"){
      title="Village journal";const quests=M.activeQuests(s);html=quests.map(q=>{const p=M.stepProgress(s,q.id);return `<article><small>${q.kind==="story"?"Village story":"Friendship"}</small><h3>${q.title}</h3><p>${escape(M.questStepText(s,q.id))}</p>${p?`<meter min="0" max="${p.need}" value="${p.have}"></meter><small>${p.have} / ${p.need}</small>`:""}</article>`;}).join("")||"<p>Meet Elowen and Rowan to find your next story.</p>";
      html+=button(s.village.toured?"Take the tour again":"Take Elowen's tour",'data-vg-tour');
    }
    if(kind==="map") {title="The Green";html="<p>Your first neighbourhood. The woods beyond will open as Mothlight's story grows.</p><p>Choose a view. Move or centre the camera to return.</p><div class=\"vg-map-grid\">"+[["arrival","Carriage"],["tree","Moth Tree"],["elowen-library","Elowen's library"],["rowan-workshop","Rowan's workshop"],["velvet-bat","The Velvet Bat"],["stall","Rowan's stall"]].map(([key,label])=>button(label,`data-vg-focus="${key}"`)).join("")+"</div>";}
    if(kind==="materials") {title="Your satchel";html=`<div class="vg-materials">${MATERIALS.map(m=>`<div><span>${m.name}</span><b>${s.village.materials[m.id]} / 40</b></div>`).join("")}</div><p>Fallen wood, loose stone, herbs and fibre grow back during active play. Gather on the Green after meeting both neighbours.</p>`;}
    if(kind==="stall") {title="Rattlewood's stall";html=M.stallOpen(s)?M.stallStock(s).map(item=>`<article><h3>${escape(item.name)}</h3><small>${item.kind==="home"?"For your farmhouse":"For the village"}${item.staple?"":` · ${item.left} left`}</small>${button(money(item.price),`data-vg-buy="${item.key}"`,!item.left||s.coins<item.price)}</article>`).join(""):"<p>Help Rowan repair the bench and his awning to open the stall.</p>";}
    $("vg-panel-title").textContent=title;$("vg-panel-tag").textContent=tag;$("vg-panel-body").innerHTML=html;
    const on=(sel,fn)=>$("vg-panel-body").querySelectorAll(sel).forEach(b=>b.onclick=()=>fn(b));
    on('[data-vg-meet]',b=>meet(b.dataset.vgMeet));on('[data-vg-chat]',b=>startTalk(b.dataset.vgChat));
    on('[data-vg-start]',b=>{const q=QUEST_BY_ID[b.dataset.vgStart];changed(M.startQuest(s,q.id));conversation(q.giver,q.intro??[q.blurb],()=>showPanel("journal"),q.title);});
    on('[data-vg-handover]',b=>{const result=M.doHandOver(s,b.dataset.vgHandover);if(result){changed(result);meet(b.dataset.vgHandover);}});
    on('[data-vg-favour]',b=>{const r=M.doFavour(s,b.dataset.vgFavour);if(r){changed(r.events);notice(`Thank you · ${money(r.pay)}`);drawPanel();}});
    on('[data-vg-gift]',b=>{const r=M.giveGift(s,b.dataset.who,b.dataset.vgGift);if(r){changed(r.events);conversation(b.dataset.who,[r.line],null);}});
    on('[data-vg-tour]',()=>tour());on('[data-vg-buy]',b=>{if(M.buyFromStall(s,b.dataset.vgBuy)){changed();drawPanel();}});on('[data-vg-focus]',b=>focus(b.dataset.vgFocus));
    $("vg-panel-close").focus({preventScroll:true});
  }
  function focus(id){
    closePanel();const points={arrival:ARRIVAL.spawn,tree:[FIXTURES.tree.x,FIXTURES.tree.z],stall:[FIXTURES.stall.x,FIXTURES.stall.z]};
    const p=points[id];if(p){surveying=true;view.cameraActions.focus(...p);return;}
    if(INSIDES[id]){surveying=true;const d=INSIDES[id].door;view.cameraActions.focus(d.x*K,d.z*K,26);}
  }
  function pick(hit){if(!active||busy())return;if(hit.type==="village-folk")meet(hit.id);else if(hit.type==="village-door")enterHall(hit.id);else if(hit.type==="village-carriage")close();else if(hit.type==="village-noticeboard")showPanel("journal");else if(hit.type==="village-stall")showPanel("stall");else if(hit.type==="village-node"){const r=M.gatherNode(state(),hit.id);if(r?.full){notice("Your satchel is full for this material.");}else if(r){changed(r.events);notice(`Gathered ${r.amount} ${MATERIALS.find(m=>m.id===r.material)?.name.toLowerCase()??r.material}`);}else notice(M.canGather(state())?"Let this gathering spot grow back first.":"Meet Rowan and Elowen to receive your gathering tools.");}else if(hit.type==="village-page"){const e=M.findObject(state(),hit.id);if(e){changed(e);notice("A page of Elowen's letter");}}}
  function placeActor(){if(!actor)return;actor.position.set(pos.x,view.inside ? .2 : view.groundAt(pos.x,pos.z)+.04,-pos.z);}
  function makeActor(){surveying=false;if(actor){view.scene.remove(actor);actor.userData.dispose?.();}actor=scene.villageCharacter(who);if(actor){view.scene.add(actor);actor.visible=!view.director.active;placeActor();if(!view.director.active)view.play.reset(actor.position);}}
  function enterHall(id){const plan=INSIDES[id];if(!active||busy()||!plan)return;surveying=false;releaseInput();offered=null;closePanel();view.goInside(id);const p=view.hallPoint(...plan.hall.spawn);pos.x=p.x;pos.z=-p.z;placeActor();if(actor)view.play.reset(actor.position);render();}
  function leaveHall(){const plan=INSIDES[view.inside];if(!plan)return;surveying=false;releaseInput();offered=null;const [nx,nz]=DOOR_NORMAL[plan.door.facing];view.goOutside();pos.x=(plan.door.x+nx*3.2)*K;pos.z=(plan.door.z+nz*3.2)*K;placeActor();if(actor)view.play.reset(actor.position);render();}
  function tour(){if(!active||dialogue.active)return;surveying=false;releaseInput();offered=null;closePanel();if(view.inside)leaveHall();if(actor)actor.visible=false;$("vg-tour").hidden=false;view.director.start(k=>{$("vg-tour b").textContent=k.title;$("vg-tour span").textContent=k.sub;},()=>{$("vg-tour").hidden=true;changed(M.finishTour(state()));if(actor){actor.visible=true;view.play.reset(actor.position);}});}
  function open(){
    const s=state();if(active)return true;if(M.patchLevel(s).level<M.VILLAGE_LEVEL){notice(`Mothlight opens at level ${M.VILLAGE_LEVEL}.`);return false;}if(s.paused){notice("Resume the farm before travelling.");return false;}
    closeMenus();oldPlayer=scene.player.state();who=oldPlayer.who??who;scene.player.setEnabled(false);releaseInput();previousButtons.clear();if(!M.villageOpen(s))M.inviteToVillage(s);M.arriveInVillage(s);save();active=true;root.hidden=false;document.body.classList.add("in-village");scene.enter("village");if(view.inside)view.goOutside();pos.x=ARRIVAL.spawn[0];pos.z=ARRIVAL.spawn[1];makeActor();render();onRender();if(!s.village.toured)tour();return true;
  }
  function close(){if(!active)return;dialogueDone=null;chat=null;dialogue.close();closePanel();active=false;surveying=false;root.hidden=true;$("vg-tour").hidden=true;document.body.classList.remove("in-village");releaseInput();previousButtons.clear();offered=null;if(view.inside)view.goOutside();if(actor){view.scene.remove(actor);actor.userData.dispose?.();actor=null;}save();scene.leavePlace();onLeave();if(oldPlayer?.enabled)scene.player.setEnabled(true,oldPlayer.who);}
  function render(){
    invitation.hidden=active||!!scene.place||!M.villageDue(state());if(!active)return;$("vg-coins").textContent=money(state().coins);$("vg-place").textContent=INSIDES[view.inside]?.name??"Hollow Green";$("vg-person").textContent=who==="shane"?"Shane":"Natalie";
    const q=M.trackedQuest(state()),text=q?M.questStepText(state(),q.id):"Meet your neighbours";const objective=$("vg-objective");objective.hidden=!!view.director.active;objective.textContent=text;
  }
  function padInput(){const g=[...(navigator.getGamepads?.()??[])].find(g=>g?.connected);if(!g){previousButtons.clear();return null;}const pressed=i=>!!g.buttons[i]?.pressed&&!previousButtons.has(i);const down=new Set(g.buttons.map((b,i)=>b.pressed?i:-1).filter(i=>i>=0)),out={g,pressed};out.pressedSet=new Set([...down].filter(i=>!previousButtons.has(i)));previousButtons.clear();down.forEach(i=>previousButtons.add(i));out.pressed=i=>out.pressedSet.has(i);return out;}
  function tick(dt){
    if(!active)return;clock+=dt;render();if(!actor)makeActor();if(!actor)return;
    const pad=padInput();if(pad?.pressed(1)){back();return;}if(pad?.pressed(9)&&!dialogue.active&&!view.director.active){page?closePanel():showPanel("journal");return;}
    if(page||dialogue.active){releaseInput();if(pad){const buttons=[...(dialogue.active?document.getElementById("village-dialogue"):$("vg-panel")).querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);const focus=document.activeElement,i=buttons.indexOf(focus);const move=pad.pressed(13)||pad.pressed(15)?1:pad.pressed(12)||pad.pressed(14)?-1:0;if(move&&buttons.length)buttons[(i+move+buttons.length)%buttons.length].focus({preventScroll:false});if(pad.pressed(0))(buttons[i]??buttons[0])?.click();}return;}
    if(busy()){releaseInput();return;}const g=pad?.g,dead=x=>Math.abs(x??0)>.17?x:0;
    if(pad?.pressed(0))interact();if(pad?.pressed(2))showPanel("map");if(pad?.pressed(3))showPanel("people");if(busy())return;if(pad?.pressed(11))centre();if(g?.buttons[4]?.pressed)view.play.zoom(1);if(g?.buttons[5]?.pressed)view.play.zoom(-1);
    const k=key=>keys.has(key)?1:0;let ix=stick.x+k("d")+k("arrowright")-k("a")-k("arrowleft")+dead(g?.axes[0]),iy=stick.y+k("s")+k("arrowdown")-k("w")-k("arrowup")+dead(g?.axes[1]);const n=Math.hypot(ix,iy);if(n>1){ix/=n;iy/=n;}
    const right=new THREE.Vector3(1,0,0).applyQuaternion(view.camera.quaternion);right.y=0;right.normalize();const forward=new THREE.Vector3();view.camera.getWorldDirection(forward);forward.y=0;forward.normalize();const dx=right.x*ix-forward.x*iy,dz=right.z*ix-forward.z*iy,moving=Math.hypot(dx,dz)>.05,speed=3.3*(keys.has("shift")||g?.buttons[7]?.pressed?1.6:1);
    if(moving){if(surveying)centre();if(view.inside){const plan=INSIDES[view.inside],origin=view.hallPoint(0,0),from={x:(pos.x-origin.x)/K,z:(-pos.z-origin.z)/K},next=moveVillageHallWalker(plan,from,dx*speed*dt/K,dz*speed*dt/K);if(next.z>0){leaveHall();return;}pos.x=origin.x+next.x*K;pos.z=-origin.z-next.z*K;}else Object.assign(pos,moveVillageWalker(state(),pos,dx*speed*dt,-dz*speed*dt));heading.x=dx;heading.z=dz;walkingAge+=speed*dt/2.3;idle=0;}else idle+=dt;
    placeActor();view.play.look(dead(g?.axes[2])+k("e")-k("q"),dead(g?.axes[3]),dt);if(!surveying)view.play.follow(actor.position,dt);
    const dxCam=view.camera.position.x-actor.position.x,dzCam=view.camera.position.z-actor.position.z;actor.rotation.y=Math.atan2(dxCam,dzCam);const lean=actor.children[0];if(lean){lean.rotation.x=-LEAN;const pitch=Math.atan2(view.camera.position.y-actor.position.y-1.2,Math.hypot(dxCam,dzCam));lean.scale.y=Math.min(1.6,1/Math.cos(Math.max(0,pitch-LEAN)));}
    const across=heading.x*right.x+heading.z*right.z,away=heading.x*forward.x+heading.z*forward.z,facing=idle>1.2?"front":Math.abs(across)>Math.abs(away)*.75?"side":away>0?"back":"front";
    animateSprite(actor,moving?walkingAge:clock,moving,moving?across:0,who==="shane"?1.7:0);actor.userData.playerAnimate?.({who,outfit:state().wardrobe.equipped[who],facing,walking:moving,time:clock,age:moving?walkingAge:clock,dx:moving?across:0,controlled:true});
    const targets=view.inside?[{type:"village-folk",id:INSIDES[view.inside].host,x:view.hallPoint(...INSIDES[view.inside].hall.host).x,z:-view.hallPoint(...INSIDES[view.inside].hall.host).z}]:[...["elowen","rowan"].map(id=>({type:"village-folk",id,...view.folk.talkSpot(id)})),...NODES.filter(n=>n.district==="green"&&M.nodeReady(state(),n.id)).map(n=>({type:"village-node",id:n.id,x:n.x,z:n.z})),...M.storyObjectsHere(state(),"village").map(o=>({type:"village-page",...o})),{type:"village-noticeboard",x:FIXTURES.noticeboard.x,z:FIXTURES.noticeboard.z},{type:"village-stall",x:FIXTURES.stall.x,z:FIXTURES.stall.z},{type:"village-carriage",x:ARRIVAL.back[0],z:ARRIVAL.back[1]},...Object.entries(INSIDES).map(([id,p])=>{const [nx,nz]=DOOR_NORMAL[p.door.facing];return{type:"village-door",id,x:(p.door.x+nx*1.4)*K,z:(p.door.z+nz*1.4)*K};})];
    const near=targets.map(t=>({...t,d:Math.hypot(t.x-pos.x,t.z-pos.z)})).filter(t=>t.d<(view.inside?3.3:3)).sort((a,b)=>a.d-b.d)[0];offered=near??null;$("vg-interact").hidden=!near;$("vg-interact").textContent=near?.type==="village-door"?"Enter":near?.type==="village-folk"?"Talk":near?.type==="village-stall"?"Shop":near?.type==="village-noticeboard"?"Journal":near?.type==="village-carriage"?"Farm":near?.type==="village-page"?"Collect":"Gather";
  }
  function interact(){if(offered)pick(offered);}
  function centre(){surveying=false;if(actor)view.play.reset(actor.position);}
  function back(){if(view.director.active){view.director.skip();return;}if(dialogue.active){dialogue.close();return;}if(page){closePanel();return;}if(view.inside){leaveHall();return;}close();}
  $("vg-home").onclick=close;$("vg-panel-close").onclick=closePanel;$("vg-objective").onclick=()=>showPanel("journal");$("vg-person").onclick=()=>{if(busy())return;who=who==="shane"?"natalie":"shane";makeActor();render();};$("vg-tour-skip").onclick=()=>view.director.skip();$("vg-look").onclick=()=>!busy()&&centre();$("vg-interact").onclick=interact;
  root.querySelectorAll('[data-vg-page]').forEach(b=>b.onclick=()=>showPanel(b.dataset.vgPage));
  const zone=$("vg-stick-zone"),disc=$("vg-stick"),knob=disc.querySelector("i");zone.onpointerdown=e=>{if(busy())return;stick.id=e.pointerId;stick.cx=e.clientX;stick.cy=e.clientY;zone.setPointerCapture(e.pointerId);disc.hidden=false;disc.style.left=`${e.clientX}px`;disc.style.top=`${e.clientY}px`;};zone.onpointermove=e=>{if(e.pointerId!==stick.id)return;let x=e.clientX-stick.cx,y=e.clientY-stick.cy;const n=Math.hypot(x,y);if(n>42){x*=42/n;y*=42/n;}stick.x=x/42;stick.y=y/42;knob.style.transform=`translate(${x}px,${y}px)`;};function release(){stick.id=null;stick.x=stick.y=0;disc.hidden=true;knob.style.transform="";}function releaseInput(){keys.clear();release();}zone.onpointerup=release;zone.onpointercancel=release;zone.onlostpointercapture=release;
  const keydown=e=>{if(!active)return;if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();back();return;}if(["INPUT","TEXTAREA","SELECT"].includes(e.target?.tagName))return;const key=e.key.toLowerCase();if(busy())return;if([" ","enter"].includes(key)&&e.target?.closest?.("button,summary"))return;keys.add(key);if([" ","enter","f","x"].includes(key)&&!e.repeat){e.preventDefault();interact();}else if(key.startsWith("arrow"))e.preventDefault();};const keyup=e=>keys.delete(e.key.toLowerCase());addEventListener("keydown",keydown,{capture:true});addEventListener("keyup",keyup);addEventListener("blur",releaseInput);
  return {open,close,tick,render,pick,meet,showPanel,enterHall,leaveHall,back,dispose(){close();dialogue.dispose?.();removeEventListener("keydown",keydown,{capture:true});removeEventListener("keyup",keyup);removeEventListener("blur",releaseInput);root.remove();invitation.remove();},get active(){return active;},get blocked(){return busy();},get status(){return{active,inside:view.inside,who,position:{...pos},panel:page?.kind??null,touring:view.director.active,surveying};}};
}
