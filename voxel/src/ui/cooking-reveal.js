import {RECIPE_BY_ID} from '../content/cooking.js';
import {ingredientIcon,dishIcon} from './kitchen-food-art.js';
export function showFirstCooking(s,recipe,station,onSave){
 if(!s.kitchen||s.kitchen.cookAnimations.includes(recipe)||!RECIPE_BY_ID[recipe])return false;
 s.kitchen.cookAnimations.push(recipe);onSave?.();document.getElementById('cooking-reveal')?.remove();
 const r=RECIPE_BY_ID[recipe],host=document.createElement('aside');host.id='cooking-reveal';host.className='cooking-reveal';host.setAttribute('role','status');host.setAttribute('aria-label','Preparing '+r.name);
 host.innerHTML=`<button aria-label="Skip cooking animation">Skip ×</button><p class="eyebrow">First time in the kitchen</p><h2>${r.name}</h2><div class="cooking-reveal-stage"><div class="reveal-ingredients">${Object.keys(r.ingredients).map((id,i)=>`<span style="--i:${i}">${ingredientIcon(id,40)}</span>`).join('')}</div><div class="reveal-pot">${r.method==='bake'?'▣':'♨'}</div><div class="reveal-dish">${dishIcon(recipe,144)}</div></div><p class="reveal-caption">${r.method==='bake'?'Mix, fold and into the oven…':r.method==='simmer'?'Into the pot. Stir and let it simmer…':'Chop, toss and sizzle…'}</p><p class="small">Cooking continues at ${station==='home'?'home':'the truck'}. Your food will be ready when the timer finishes.</p>`;
 const close=()=>{clearTimeout(timer);host.remove();document.removeEventListener('keydown',key)};const key=e=>{if(e.key==='Escape')close()};host.querySelector('button').onclick=close;document.addEventListener('keydown',key);document.body.append(host);const timer=setTimeout(close,5500);return true;
}
