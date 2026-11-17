import { VARIETIES, stockCount, barnCapacity, held, COCOA_SPECIALS, freshCount, wantedVariety, wantedSecondsLeft, FRESH, WANTED, orderSecondsLeft, canFillOrder, STOCK_LIFE, stockCondition, totalDiscarded } from "../model.js";
import { money } from "./kit.js";

// A live count inspector, anchored beneath the HUD; the world keeps running.
// A live count inspector, anchored beneath the HUD; the world keeps running.
// It reads at a glance: how full the barn is, any contracts waiting (they have
// their own menu), each variety as a tile with what's fresh or fading, then
// Sandy's drinks in one line.
export function createStockPopover({ state, onOpen, onManagePumpkins, onManageCocoa, onContracts }) {
  const trigger = document.getElementById("open-stock"), total = document.getElementById("stock-total");
  const panel = document.createElement("section"); panel.id = "stock-popover"; panel.className = "stock-popover"; panel.hidden = true;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "false"); panel.setAttribute("aria-labelledby", "stock-popover-title");
  const tile = (v, i) => `<div class="stock-tile" style="--stock-colour:#${v.color.toString(16).padStart(6, "0")}"><i aria-hidden="true"></i><span>${v.name}</span><b data-stock-count="pumpkin-${i}">0</b><small data-stock-state="${i}"></small></div>`;
  panel.innerHTML = `<header><div><h2 id="stock-popover-title">Pumpkin stock</h2><p id="stock-capacity"></p><div id="stock-meter" class="stock-meter" role="progressbar" aria-label="Barn storage" aria-valuemin="0"><i></i></div></div><button class="icon-button" aria-label="Close stock counts">×</button></header><div class="stock-popover-body"><button class="stock-contracts" data-stock-contracts hidden><span class="ico i-coins" aria-hidden="true"></span><span><b id="stock-contracts-title">Contracts</b><small id="stock-contracts-text"></small></span><i aria-hidden="true">›</i></button><p id="stock-wanted" class="stock-wanted" hidden></p><div class="stock-tiles">${VARIETIES.map(tile).join("")}</div><p id="stock-condition" class="stock-warning" hidden></p><p id="stock-warning" class="stock-warning" hidden>Barn full. Sell pumpkins or add storage.</p><p class="stock-note" id="stock-fine"></p><div class="stock-cocoa"><h3>Sandy’s cocoa</h3><p id="stock-cocoa-status" class="stock-note"></p><div class="stock-cocoa-counts"><span>Hot chocolate <b data-stock-count="cocoa">0</b></span>${COCOA_SPECIALS.map((p) => `<span>${p.name} <b data-stock-count="${p.id}">0</b></span>`).join("")}</div></div></div><footer class="stock-shortcuts"><button class="button" data-stock-manage="pumpkins">Barn upgrades</button><button class="button" data-stock-manage="cocoa">Cocoa stand</button></footer>`;
  document.body.append(panel);
  const number = new Intl.NumberFormat("en-GB"), compact = new Intl.NumberFormat("en-GB", {notation:"compact",maximumFractionDigits:1});
  let open = false, signature = "";
  const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  // Contracts waiting: how many, how many the barn can send now, and the soonest deadline.
  function renderContracts(s) {
    const list = s.orders.list, box = panel.querySelector("[data-stock-contracts]");
    box.hidden = !list.length; if (!list.length) return;
    const ready = list.filter((o) => canFillOrder(s, o)).length, soonest = Math.min(...list.map((o) => orderSecondsLeft(s, o)));
    box.classList.toggle("ready", ready > 0);
    put("#stock-contracts-title", `${list.length} contract${list.length === 1 ? "" : "s"} waiting`);
    put("#stock-contracts-text", `${ready ? `${ready} ready to send` : "Not enough in the barn yet"} · next ends in ${clock(soonest)}`);
  }
  const put = (selector, text) => { const e = panel.querySelector(selector); if(e.textContent!==text)e.textContent=text; };
  function close(focus = false) { open = false; panel.hidden = true; trigger.setAttribute("aria-expanded", "false"); if(focus)trigger.focus({preventScroll:true}); }
  function refresh() {
    const s = state(), n = stockCount(s), capacity = barnCapacity(s);
    trigger.classList.toggle("stock-full",n>=capacity);
    trigger.classList.toggle("has-order",s.orders.list.length>0);trigger.classList.toggle("order-ready",s.orders.list.some(o=>canFillOrder(s,o)));
    const label = compact.format(n); if(total.textContent!==label)total.textContent=label;
    const description=`Pumpkin stock: ${number.format(n)} of ${number.format(capacity)}. Show pumpkin and cocoa counts`;
    if(trigger.getAttribute("aria-label")!==description)trigger.setAttribute("aria-label",description);
    if(!open)return;
    renderContracts(s);
    const c = s.festival.cocoa, reserved = VARIETIES.reduce((n,_,i)=>n+held(s,i),0), fresh = VARIETIES.map((_,i)=>freshCount(s,i)), condition=stockCondition(s), waste=totalDiscarded(s), wanted = wantedVariety(s), left = Math.ceil(wantedSecondsLeft(s)), key = JSON.stringify([s.stock,fresh,condition.fading,Math.ceil(condition.nextDiscardIn),waste,wanted,left,capacity,reserved,c.level,c.open,c.stock,COCOA_SPECIALS.map(p=>c.extras[p.id].stock)]);
    if(key===signature)return;signature=key;
    put('#stock-capacity',`${number.format(n)} / ${number.format(capacity)} · ${number.format(Math.max(0,capacity-n))} free`);
    const meter=panel.querySelector("#stock-meter");meter.setAttribute("aria-valuemax",String(capacity));meter.setAttribute("aria-valuenow",String(Math.min(n,capacity)));meter.setAttribute("aria-valuetext",`${number.format(n)} pumpkins, ${number.format(capacity)} capacity`);meter.style.setProperty("--stock-fill",Math.min(100,n/Math.max(1,capacity)*100)+"%");panel.querySelector("#stock-warning").hidden=n<capacity;
    s.stock.forEach((n,i)=>{const fading=stockCondition(s,i).fading,tag=panel.querySelector(`[data-stock-state="${i}"]`);put(`[data-stock-count="pumpkin-${i}"]`,number.format(n));put(`[data-stock-state="${i}"]`,fading?`${number.format(fading)} fading`:fresh[i]?`${number.format(fresh[i])} fresh`:held(s,i)?`${number.format(held(s,i))} in baskets`:'');tag.className=fading?'fading':fresh[i]?'fresh':'';tag.closest('.stock-tile').classList.toggle('empty',!n);});
    const ageing=panel.querySelector('#stock-condition');ageing.hidden=!condition.fading;
    if(condition.fading)put('#stock-condition',`${number.format(condition.fading)} fading · the oldest spoil in ${clock(Math.max(0,condition.nextDiscardIn))}. Sell, cook or send a contract.`);
    put('#stock-fine',`Fresh for ${FRESH.seconds}s, worth up to ${Math.round(FRESH.bonus*100)}% more · spoil after ${STOCK_LIFE.seconds/60} min${waste?` · ${number.format(waste)} spoiled so far`:''}${reserved?` · ${number.format(reserved)} in baskets`:''}`);
    const want=panel.querySelector('#stock-wanted');want.hidden=wanted===null;if(wanted!==null)put('#stock-wanted',`Wanted now: ${VARIETIES[wanted].name} · up to ${Math.round(WANTED.bonus*100)}% more · ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} left`);
        const drinks=c.stock+COCOA_SPECIALS.filter(p=>!p.snack).reduce((n,p)=>n+c.extras[p.id].stock,0);
    put('#stock-cocoa-status',!c.level ? 'Build Sandy’s cocoa stand to stock drinks' : !c.open ? 'Stand closed · Stock is kept for later' : drinks ? 'Open · Drinks ready to serve' : 'No drinks left · Restock Sandy’s stand');
    panel.querySelector('.stock-cocoa-counts').hidden=!c.level;put('[data-stock-count="cocoa"]',number.format(c.stock));
    for(const p of COCOA_SPECIALS)put(`[data-stock-count="${p.id}"]`,number.format(c.extras[p.id].stock));
  }
  trigger.addEventListener('click',()=>{if(open){close();return;}onOpen?.();trigger.focus({preventScroll:true});open=true;panel.hidden=false;signature='';trigger.setAttribute('aria-expanded','true');refresh();});
  panel.querySelector('button').addEventListener('click',()=>close(true));
  panel.querySelector('[data-stock-contracts]').addEventListener('click',()=>{close();onContracts?.();});
  panel.querySelectorAll('[data-stock-manage]').forEach(button=>button.addEventListener('click',()=>{close();if(button.dataset.stockManage==='cocoa')onManageCocoa?.();else onManagePumpkins?.();}));
  document.addEventListener('pointerdown',e=>{if(open&&!panel.contains(e.target)&&!trigger.contains(e.target))close();},true);
  document.addEventListener('keydown',e=>{if(open&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close(true);}},true);
  return {close,get open(){return open;},tick(blocked=false){if(blocked&&open)close();refresh();}};
}
