// Saved Green decorating: only a confirmed placement changes the farm state.
import * as M from "../model.js";
import { VILLAGE_DECOR, VILLAGE_DECOR_BY_ID } from "../content/village-decor.js";
import { ARRIVAL } from "../content/village.js";
import { villageDecorWalkClear } from "../rules/village-navigation.js";
import { gardenSpriteIcon } from "./garden-icons.js";
import { premiumIcon } from "./premium-icon-markup.js";
import { villageItemIcon } from "./village-item-markup.js";
import { ps5Icon } from "./dualsense-icons.js";

const CATEGORIES = [["all","All"],["light","Lights"],["seat","Seats"],["books","Books"],["plant","Plants"],["other","Keepsakes"]];
const angle = value => ((Math.round(value / 15) * 15 % 360) + 360) % 360;
const snap = value => Math.round(value * 20) / 20;
const escape = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const category = def => def.tags.find(tag => CATEGORIES.some(([id]) => id === tag)) ?? "other";
const art = def => def.estate ? gardenSpriteIcon(def.id) : villageItemIcon(def.id) || premiumIcon({light:"attractions",seat:"home",books:"journal",plant:"garden",other:"build"}[category(def)]);
// The pad legend names only actions this phase actually handles.
const padHint = (keys, text, extra = "") => `<span class="vd-build-hint" ${extra}>${keys.map(key=>ps5Icon(key,24)).join("")}<span>${text}</span></span>`;
const catalogueHints = () => `<div class="vd-pad-help vd-build-legend" aria-hidden="true">${padHint(["ls","dpad"],"Browse")}${padHint(["l1","r1"],"Category")}${padHint(["cross"],"Choose",'data-vd-hint="choose"')}${padHint(["circle"],"Done")}</div>`;
const placementHints = () => `<div class="vd-pad-help vd-build-legend" aria-hidden="true">${padHint(["cross"],"Place",'data-vd-hint="confirm"')}${padHint(["ls","dpad"],"Move")}${padHint(["l1","r1"],"Rotate")}${padHint(["circle"],"Cancel")}${padHint(["square"],"Store",'data-vd-hint="store"')}</div>`;
const snapshot = state => ({owned:{...state.village.decor.owned},placed:state.village.decor.placed.map(piece=>({...piece}))});

export function createVillageDecorate({state,view,save=()=>{},onChanged=()=>{},notice=()=>{},onClose=()=>{},onShop=()=>{},actorPosition=()=>null,onMenuInput=null,onInputReset=()=>{},root}={}) {
  const host=document.createElement("aside");host.id="village-decorate";host.hidden=true;host.setAttribute("aria-label","Decorate Hollow Green");
  (root??document.getElementById("village-game")??document.body).append(host);
  host.innerHTML=`<section class="vd-catalogue" aria-labelledby="vd-title"><header><div><small>HOLLOW GREEN</small><h2 id="vd-title">Build the Green</h2></div><button type="button" data-vd-action="done">Done</button></header><nav class="vd-collections" aria-label="Decoration collection"><button type="button" data-vd-collection="stored">Your pieces</button><button type="button" data-vd-collection="placed">On the Green</button></nav><nav class="vd-categories" aria-label="Decoration categories">${CATEGORIES.map(([id,label])=>`<button type="button" data-vd-category="${id}">${label}</button>`).join("")}</nav><p class="vd-intro">Choose a piece to place, or tap one on the Green to move it.</p><div class="vd-list"></div><footer><button type="button" data-vd-action="shop">Rowan’s stall <span aria-hidden="true">›</span></button><button type="button" data-vd-action="undo">Undo</button></footer>${catalogueHints()}</section><section class="vd-placement" aria-label="Place decoration" hidden><header><div><small class="vd-piece-phase">PLACE A PIECE</small><h2 class="vd-piece-name"></h2></div><button type="button" class="vd-close" data-vd-action="done" aria-label="Close Build mode" title="Close Build mode">×</button></header><p class="vd-placement-status" role="status" aria-live="polite"></p><div class="vd-placement-tools"><button type="button" data-vd-action="left" aria-label="Rotate left 15 degrees">↶ <span>15°</span></button><span class="vd-angle" aria-label="Rotation"></span><button type="button" data-vd-action="right" aria-label="Rotate right 15 degrees"><span>15°</span> ↷</button><button type="button" data-vd-action="confirm" class="vd-primary">Place</button></div><div class="vd-placement-secondary"><button type="button" data-vd-action="store">Store</button><button type="button" data-vd-action="cancel">Cancel</button><button type="button" data-vd-action="undo">Undo</button></div><small class="vd-touch-help">Tap the ground or drag your piece. Place to keep it.</small><small class="vd-key-help">Arrows move · Q/E turn · Enter place · Esc cancel</small>${placementHints()}</section>`;
  const $=selector=>host.querySelector(selector),all=selector=>[...host.querySelectorAll(selector)];
  let active=false,selected=null,collection="stored",filter="all",history=[],dragging=false,dragStart=null,turnAmount=0,lastList="",lastStatus="",repeat=0,lastPadDirection="",tickAge=0,returnFocus=null,lastState=null;
  const s=()=>typeof state==="function"?state():state;
  const current=()=>selected&&{...selected};
  function peopleClear(piece) {
    if(!villageDecorWalkClear(s(),piece,actorPosition()))return false;
    return ["elowen","rowan"].every(id=>{const at=view.folk?.spotOf?.(id);return villageDecorWalkClear(s(),piece,at?{...at,radius:.6}:null);});
  }
  function fits(piece) {return !!piece&&M.villageDecorFits(s(),piece.id,piece.x,piece.z,piece.rotation,piece.instance??null)&&peopleClear(piece);}
  function syncPreview() {if(selected)selected.valid=fits(selected);view.preview(selected);view.sync?.();renderPlacement();}
  function changed(events=[]) {save();view.sync?.();onChanged(events);lastList="";render();}
  // Search nearby clear ground for the first preview. Nothing is granted or spent here.
  function findSpot(id,at) {
    const p={id,x:snap(at.x),z:snap(at.z),rotation:0,pending:true};if(fits(p))return p;
    for(let radius=.5;radius<=12;radius+=.5)for(let i=0,n=Math.ceil(radius*12);i<n;i++){const a=i/n*Math.PI*2,q={...p,x:snap(at.x+Math.cos(a)*radius),z:snap(at.z+Math.sin(a)*radius)};if(fits(q))return q;}
    return p;
  }
  function seedPoint() {
    const quest=M.activeQuests(s()).find(q=>M.questStep(s(),q.id)?.kind==="place"),step=quest&&M.questStep(s(),quest.id);
    if(step?.near){const door=M.doorOf(step.near);return{x:door.x+3,z:door.z+3};}
    const p=actorPosition();return p?{x:p.x+3,z:p.z+2}:{x:ARRIVAL.spawn[0]+6,z:ARRIVAL.spawn[1]+6};
  }
  function choose(id,instance=null,at=null) {
    cancel(false);const piece=instance&&s().village.decor.placed.find(p=>p.instance===instance);
    if(instance&&!piece||!instance&&!(s().village.decor.owned[id]>0))return false;
    selected=piece?{...piece,pending:false}:findSpot(id,at??seedPoint());
    onInputReset();repeat=0;lastPadDirection="";
    host.classList.add("has-selection");syncPreview();view.cameraActions?.focus(selected.x,selected.z,18);
    $(".vd-placement [data-vd-action='confirm']").focus({preventScroll:true});return true;
  }
  function cancel(focus=true) {
    const hadSelection=!!selected;selected=null;dragging=false;dragStart=null;view.preview(null);view.sync?.();host.classList.remove("has-selection");render();if(hadSelection)onInputReset();
    if(focus)$(".vd-list button:not(:disabled)")?.focus({preventScroll:true});
  }
  function confirm() {
    if(!selected)return false;selected.valid=fits(selected);if(!selected.valid){renderPlacement();notice(peopleClear(selected)?"Choose clear ground away from paths, doors and gathering spots.":"Leave a little room around your neighbours and yourself.");return false;}
    const before=snapshot(s()),p=current(),result=p.pending?M.placeVillageDecor(s(),p.id,p.x,p.z,p.rotation):M.moveVillageDecor(s(),p.instance,p.x,p.z,p.rotation);
    if(!result){syncPreview();return false;}history.push(before);if(history.length>30)history.shift();cancel(false);changed(result.events??[]);notice(`${VILLAGE_DECOR_BY_ID[p.id].name} placed.`);return true;
  }
  function storePiece() {
    if(!selected)return false;if(selected.pending){cancel();return true;}
    const before=snapshot(s()),name=VILLAGE_DECOR_BY_ID[selected.id].name;if(!M.storeVillageDecor(s(),selected.instance))return false;
    history.push(before);if(history.length>30)history.shift();cancel(false);changed();notice(`${name} returned to your pieces.`);return true;
  }
  function undo() {
    if(!history.length)return false;cancel(false);const before=history[history.length-1];
    if(!before.placed.every(peopleClear)||!M.restoreVillageDecor(s(),before)){notice("Leave room for everyone before restoring that arrangement.");return false;}
    history.pop();changed();notice("Last decoration change undone.");return true;
  }
  function rotate(direction) {if(selected){selected.rotation=angle(selected.rotation+direction*15);syncPreview();}}
  function moveTo(x,z) {if(selected&&Number.isFinite(x)&&Number.isFinite(z)){selected.x=snap(x);selected.z=snap(z);syncPreview();}}
  // Screen-relative movement follows the camera's ground axes in realm coordinates.
  function nudge(x,y,amount=.4) {
    if(!selected)return;const e=view.camera?.matrixWorld?.elements,right=e?{x:e[0],z:-e[2]}:{x:1,z:0},length=Math.hypot(right.x,right.z)||1;right.x/=length;right.z/=length;
    moveTo(selected.x+(right.x*x+right.z*y)*amount,selected.z+(right.z*x-right.x*y)*amount);
  }
  function renderPlacement() {
    $(".vd-placement").hidden=!selected;$(".vd-catalogue").hidden=!!selected;if(!selected)return;
    const def=VILLAGE_DECOR_BY_ID[selected.id],message=selected.valid?"Clear spot — ready to place.":peopleClear(selected)?"Keep paths, doors and gathering spots clear.":"Leave room for everyone to walk.";
    $(".vd-piece-name").textContent=def.name;$(".vd-piece-phase").textContent=selected.pending?"PLACE A PIECE":"MOVE A PIECE";$(".vd-angle").textContent=`${selected.rotation}°`;
    if(lastStatus!==message){$(".vd-placement-status").textContent=message;lastStatus=message;}
    $(".vd-placement-status").classList.toggle("is-invalid",!selected.valid);$(".vd-placement [data-vd-action='confirm']").disabled=!selected.valid;
    $(".vd-placement [data-vd-action='store']").hidden=selected.pending;
    const confirmButton=$(".vd-placement [data-vd-action='confirm']"),confirmHint=$("[data-vd-hint='confirm']");
    confirmButton.textContent=selected.pending?"Place here":"Keep here";
    confirmHint.classList.toggle("is-ready",selected.valid);confirmHint.querySelector("span:last-child").textContent=selected.pending?"Place":"Keep here";
    $("[data-vd-hint='store']").hidden=selected.pending;
    all("[data-vd-action='undo']").forEach(b=>b.disabled=!history.length);
  }
  function render() {
    if(!active)return;renderPlacement();all("[data-vd-action='undo']").forEach(b=>b.disabled=!history.length);
    if(selected)return;all("[data-vd-category]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.vdCategory===filter)));all("[data-vd-collection]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.vdCollection===collection)));
    const decor=s().village.decor,key=JSON.stringify([decor.owned,decor.placed,collection,filter]);if(key===lastList)return;lastList=key;
    const list=$(".vd-list"),scroll=list.scrollTop,focused=document.activeElement?.dataset?.vdItem;
    const match=def=>filter==="all"||category(def)===filter;
    const cards=collection==="placed"?decor.placed.filter(p=>match(VILLAGE_DECOR_BY_ID[p.id])).map(p=>({def:VILLAGE_DECOR_BY_ID[p.id],instance:p.instance,count:1})):VILLAGE_DECOR.filter(match).filter(def=>decor.owned[def.id]>0).map(def=>({def,count:decor.owned[def.id]}));
    list.innerHTML=cards.length?cards.map(({def,instance,count},i)=>`<button type="button" class="vd-piece" ${i?"":"data-pad-default"} data-vd-item="${instance??def.id}" data-vd-id="${def.id}"${instance?` data-vd-instance="${instance}"`:""}><span class="vd-art" aria-hidden="true">${art(def)}</span><span><b>${escape(def.name)}</b><small>${instance?"Placed on the Green":`${count} stored`}</small></span><span class="vd-piece-arrow" aria-hidden="true">${instance?"›":"+"}</span></button>`).join(""):`<div class="vd-empty">${premiumIcon("garden")}<b>${collection==="placed"?"A little room for something lovely":"Your next little treasure"}</b><p>${collection==="placed"?"Place a piece from your collection, then find it here whenever you want to move it.":"Earn pieces by helping your neighbours, or visit Rowan’s stall."}</p></div>`;
    $("[data-vd-action='shop']").toggleAttribute("data-pad-default",!cards.length);
    list.scrollTop=scroll;if(focused)all("[data-vd-item]").find(b=>b.dataset.vdItem===focused)?.focus({preventScroll:true});
  }
  function open(options={}) {
    if(view.inside){notice("Decorate outside on Hollow Green.");return false;}if(lastState!==s()){history=[];lastState=s();}if(!active){active=true;returnFocus=document.activeElement;host.hidden=false;document.body.classList.add("village-decorating");}
    render();if(options.instance)choose(null,options.instance);else if(options.id)choose(options.id,null,options.at);else $(".vd-list button:not(:disabled),[data-vd-action='shop']")?.focus({preventScroll:true});return true;
  }
  function close() {if(!active)return;cancel(false);active=false;host.hidden=true;document.body.classList.remove("village-decorating");onClose();returnFocus?.focus?.({preventScroll:true});}
  function back() {if(!active)return false;selected?cancel():close();return true;}
  function pick(hit) {
    if(!active)return false;if(hit.type==="village-decor"&&!selected){choose(null,hit.instance);return true;}
    if(selected&&hit.point)moveTo(hit.point.x,hit.point.z);return true;
  }
  host.addEventListener("click",event=>{const b=event.target.closest("button");if(!b||b.disabled)return;
    if(b.dataset.vdId){choose(b.dataset.vdId,b.dataset.vdInstance);return;}
    if(b.dataset.vdCategory){filter=b.dataset.vdCategory;render();return;}
    if(b.dataset.vdCollection){collection=b.dataset.vdCollection;render();return;}
    ({done:close,confirm,cancel,store:storePiece,undo,left:()=>rotate(-1),right:()=>rotate(1),shop:()=>{close();onShop();}}[b.dataset.vdAction])?.();
  });
  function keydown(event) {
    if(!active||["INPUT","TEXTAREA","SELECT"].includes(event.target?.tagName))return;const key=event.key.toLowerCase();let action=null;
    if(key==="escape")action=back;else if((event.ctrlKey||event.metaKey)&&key==="z")action=undo;
    else if(selected){action={arrowup:()=>nudge(0,-1),arrowdown:()=>nudge(0,1),arrowleft:()=>nudge(-1,0),arrowright:()=>nudge(1,0),q:()=>rotate(-1),e:()=>rotate(1),delete:storePiece,backspace:storePiece,enter:confirm}[key];}
    if(action){event.preventDefault();event.stopImmediatePropagation();action();}
  }
  addEventListener("keydown",keydown,{capture:true});
  function handlePad(pad,dt=1/60) {
    if(!active||!pad)return;const {g,pressed}=pad;if(pressed(1)){back();return;}if(pressed(9)){close();return;}
    if(selected){if(pressed(0)){confirm();return;}if(pressed(2)){storePiece();return;}if(pressed(3)){cancel();return;}if(pressed(4))rotate(-1);if(pressed(5))rotate(1);
      const dead=n=>Math.abs(n??0)>.2?n:0,move=pad.move??{x:dead(g.axes?.[0]),y:dead(g.axes?.[1])},down=pad.down??g.buttons.map(b=>b.pressed),{x,y}=move;if(x||y)nudge(x,y,Math.max(.05,Math.min(.05,dt)*5));
      const dx=(down[15]?1:0)-(down[14]?1:0),dy=(down[13]?1:0)-(down[12]?1:0),direction=`${dx},${dy}`;
      repeat-=dt;if(dx||dy){if(direction!==lastPadDirection||repeat<=0){nudge(dx,dy);repeat=direction!==lastPadDirection ? .3 : .12;}}else repeat=0;lastPadDirection=direction;return;
    }
    if(onMenuInput)onMenuInput($(".vd-catalogue"),pad);
    else {const buttons=all("button:not(:disabled)").filter(b=>b.getClientRects().length),index=buttons.indexOf(document.activeElement),move=pressed(13)||pressed(15)?1:pressed(12)||pressed(14)?-1:0;
      if(move&&buttons.length)buttons[(index+move+buttons.length)%buttons.length].focus({preventScroll:false});if(pressed(0))(buttons[index]??buttons[0])?.click();}
    if(pressed(4)||pressed(5)){filter=CATEGORIES[(CATEGORIES.findIndex(([id])=>id===filter)+(pressed(5)?1:-1)+CATEGORIES.length)%CATEGORIES.length][0];render();}
  }
  const gesture={pose:()=>active?current():null,busy:()=>dragging,begin(){if(!active||!selected)return false;dragging=true;dragStart=current();turnAmount=selected.rotation;return true;},drag:moveTo,turn(degrees){if(!selected)return;turnAmount+=degrees;selected.rotation=angle(turnAmount);syncPreview();},end(cancelled){if(cancelled&&dragStart)selected=dragStart;dragging=false;dragStart=null;syncPreview();}};
  return {open,close,back,pick,render,confirm,cancel,undo,store:storePiece,rotate,moveTo,choose,gesture,handlePad,tick(dt,pad){if(!active)return;handlePad(pad,dt);tickAge+=dt;if(tickAge>.25){tickAge=0;if(selected){const valid=fits(selected);if(valid!==selected.valid){selected.valid=valid;syncPreview();}}else render();}},dispose(){close();removeEventListener("keydown",keydown,{capture:true});host.remove();},get active(){return active;},get blocked(){return false;},get status(){return{active,selection:current(),collection,category:filter,undo:history.length};}};
}
