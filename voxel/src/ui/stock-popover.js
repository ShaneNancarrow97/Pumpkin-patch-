import { VARIETIES, stockCount, barnCapacity, held, COCOA_SPECIALS } from "../model.js";

// A live count inspector, anchored beneath the HUD; the world keeps running.
export function createStockPopover({ state, onOpen }) {
  const trigger = document.getElementById("open-stock"), total = document.getElementById("stock-total");
  const panel = document.createElement("section"); panel.id = "stock-popover"; panel.className = "stock-popover"; panel.hidden = true;
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "false"); panel.setAttribute("aria-labelledby", "stock-popover-title");
  const row = (id, name, colour) => `<div class="stock-row"><span>${colour ? `<i style="--stock-colour:${colour}" aria-hidden="true"></i>` : ""}${name}</span><b data-stock-count="${id}">0</b></div>`;
  panel.innerHTML = `<header><div><h2 id="stock-popover-title">Pumpkin stock</h2><p id="stock-capacity"></p></div><button class="icon-button" aria-label="Close stock counts">×</button></header><div class="stock-popover-body">${VARIETIES.map((v,i)=>row('pumpkin-'+i,v.name,'#'+v.color.toString(16).padStart(6,'0'))).join('')}<p id="stock-reserved" class="stock-note" hidden></p><hr><h3>Cocoa & treats</h3><p id="stock-cocoa-status" class="stock-note"></p>${row('cocoa','Plain hot chocolate')}${COCOA_SPECIALS.map(p=>row(p.id,p.name)).join('')}</div>`;
  document.body.append(panel);
  const number = new Intl.NumberFormat("en-GB"), compact = new Intl.NumberFormat("en-GB", {notation:"compact",maximumFractionDigits:1});
  let open = false, signature = "";
  const put = (selector, text) => { const e = panel.querySelector(selector); if(e.textContent!==text)e.textContent=text; };
  function close(focus = false) { open = false; panel.hidden = true; trigger.setAttribute("aria-expanded", "false"); if(focus)trigger.focus({preventScroll:true}); }
  function refresh() {
    const s = state(), n = stockCount(s), capacity = barnCapacity(s);
    const label = compact.format(n); if(total.textContent!==label)total.textContent=label;
    trigger.setAttribute("aria-label", `Pumpkin stock: ${number.format(n)} of ${number.format(capacity)}. Show pumpkin and cocoa counts`);
    if(!open)return;
    const c = s.festival.cocoa, reserved = VARIETIES.reduce((n,_,i)=>n+held(s,i),0), key = JSON.stringify([s.stock,capacity,reserved,c.level,c.stock,COCOA_SPECIALS.map(p=>c.extras[p.id].stock)]);
    if(key===signature)return;signature=key;
    put('#stock-capacity',`${number.format(n)} / ${number.format(capacity)} barn spaces`);
    s.stock.forEach((n,i)=>put(`[data-stock-count="pumpkin-${i}"]`,number.format(n)));
    const note=panel.querySelector('#stock-reserved');note.hidden=!reserved;note.textContent=`${number.format(reserved)} reserved in customers’ baskets`;
    put('#stock-cocoa-status',c.level ? 'Ready to serve at Sandy’s stand' : 'Build Sandy’s cocoa stand to stock drinks');
    put('[data-stock-count="cocoa"]',number.format(c.stock));
    for(const p of COCOA_SPECIALS)put(`[data-stock-count="${p.id}"]`,number.format(c.extras[p.id].stock));
  }
  trigger.addEventListener('click',()=>{if(open){close();return;}onOpen?.();open=true;panel.hidden=false;signature='';trigger.setAttribute('aria-expanded','true');refresh();});
  panel.querySelector('button').addEventListener('click',()=>close(true));
  document.addEventListener('pointerdown',e=>{if(open&&!panel.contains(e.target)&&!trigger.contains(e.target))close();},true);
  document.addEventListener('keydown',e=>{if(open&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close(true);}},true);
  return {close,tick(blocked=false){if(blocked&&open)close();refresh();}};
}
