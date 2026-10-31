// Late-game economy fixtures represent a household completed before home milestones.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as M from '../src/model.js';import {offerDiningSeat,updateDining} from '../src/rules/cooking-dining.js';
import {DINING_SEATS,diningRoute,diningGuestPose,routeLength} from '../src/content/cooking-dining.js';
import {VISITOR_KINDS} from '../src/content/visitors.js';
import {HOSPITALITY_META} from '../src/hospitality-cast-meta.js';import {WHEELCHAIR_META} from '../src/natalie-wheelchair-meta.js';
const guest=id=>({id,kind:id%15,food:{status:'paid',recipe:'wedges',quantity:2}});
test('paid diners reserve four unique seats, never debit again, leave through the public apron, and are transient',()=>{
 const s=M.freshState(),cash=s.coins;for(let i=0;i<4;i++)assert.ok(offerDiningSeat(s,guest(i)));assert.equal(offerDiningSeat(s,guest(4)),false);assert.equal(offerDiningSeat(s,{id:7}),false);
 assert.equal(new Set(s.kitchen.diners.map(d=>d.seat)).size,4);assert.equal(s.coins,cash);
 s.paused=true;updateDining(s,100);assert.ok(s.kitchen.diners.every(d=>d.phase==='approach'));s.paused=false;
 for(let t=0;t<40;t++)updateDining(s,.25);assert.ok(s.kitchen.diners.some(d=>d.phase==='eating'));
 assert.deepEqual(M.saveData(s).kitchen.diners,[]);assert.deepEqual(M.restoreState(M.saveData(s)).kitchen.diners,[]);
 for(let t=0;t<240;t++)updateDining(s,.25);assert.equal(s.kitchen.diners.length,0);assert.equal(s.coins,cash);
});
test('dining approaches keep away from the cart lane and seated poses align to the selected bench',()=>{
 for(const seat of DINING_SEATS){const route=diningRoute(seat.id);assert.ok(routeLength(route)>15);const pose=diningGuestPose({seat:seat.id,phase:'eating',distance:0});assert.equal(pose.x,seat.x);assert.equal(pose.z,seat.z);assert.ok(pose.seated);for(const [x,z] of route)assert.ok(!(x>38.08&&x<39.52&&z<4.9));}
});
test('four premium visitors have aligned standing, opposite-step and sitting frames without replacing the old roster',()=>{
 assert.deepEqual(VISITOR_KINDS.slice(11),['duke','countess','plague-noble','spectral-courtier']);
 const sheet=HOSPITALITY_META.court;for(const id of ['duke','countess','plague-noble','spectral-courtier']){assert.equal(sheet[id].length,7);assert.equal(new Set(sheet[id].map(f=>f.x+':'+f.y)).size,7);for(const f of sheet[id]){assert.equal(f.ax,128);assert.equal(f.ay,248);assert.ok(f.x+f.w<=sheet.w&&f.y+f.h<=sheet.h);}}
 assert.equal(Object.values(HOSPITALITY_META.seated).filter(Array.isArray).length,11);
 for(const file of ['hospitality-court.webp','hospitality-seated.webp','maisie.webp','natalie-wheelchair.webp'])assert.ok(fs.statSync(new URL('../assets/'+file,import.meta.url)).size>10000);
});
test('Natalie purple wheelchair is free, wearable and saved, with six rolling frames',()=>{
 const s=M.freshState(),cash=s.coins;assert.ok(s.wardrobe.owned.includes('natalie-wheelchair'));assert.ok(M.wearCostume(s,'natalie-wheelchair'));assert.equal(s.coins,cash);
 const r=M.restoreState(M.saveData(s));assert.equal(r.wardrobe.equipped.natalie,'natalie-wheelchair');assert.equal(WHEELCHAIR_META['natalie-wheelchair'].walk.length,6);
 const old=M.saveData(M.freshState());old.wardrobe.owned=[];assert.ok(M.restoreState(old).wardrobe.owned.includes('natalie-wheelchair'));
});
test('visitor occasions are wired to the model and rich indoor guests use finite money',()=>{
 const s=M.freshState();s.progression.homeLegacyThrough=12;s.coins=1e6;s.earned=M.LEVELS[11].at;s.visitorTimer=s.bigSpender.timer=1e6;assert.ok(M.buyVisitorEventUpgrade(s,'rush'));assert.ok(M.buyVisitorEventUpgrade(s,'vip'));
 const before=M.saveData(s);const r=M.restoreState(before);assert.equal(r.visitorEvents.vip.level,1);assert.equal(r.visitorEvents.rush.remaining,300);
 let events=[];for(let t=0;t<301;t++)events.push(...M.update(s,1));assert.ok(events.some(e=>e.type==='visitor-event'&&e.event==='rush'));assert.ok(s.visitorEvents.ledger.vipGuests>=3);
 s.shop.unlocked=true;s.shop.nextCustomer=0;s.shop.arrivalTimer=0;M.update(s,.1);const c=s.shop.customers[0];assert.ok(c.vip&&c.kind>=11);assert.ok(c.budget>=140&&c.budget<=250);
});
test('first-cook presentation flags survive while malformed recipe IDs are removed',()=>{
 const s=M.freshState();s.kitchen.cookAnimations=['wedges','no-such-food','wedges'];const r=M.restoreState(M.saveData(s));assert.deepEqual(r.kitchen.cookAnimations,['wedges']);
});
