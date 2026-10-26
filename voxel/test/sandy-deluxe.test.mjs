import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as M from '../src/model.js';
import { cocoaKiosk, createFestivalWorld } from '../src/festival-meadow-world.js';
import { buildWorld } from '../src/world.js';
import { cocoaProp, takeawayCup } from '../src/cocoa-props.js';

const setup = (level = 5) => {
  const s = M.freshState(); s.festival.meadow = true; s.festival.cocoa.level = level; s.coins = 100000;
  return s;
};
const guest = (budget = 100) => ({ id: 1, kind: 0, budget, originalBudget: budget, basketLimit: 1, preferred: [0], needs: { thirst: 100, hunger: 100, happiness: 60, value: 1 } });
const stockMenu = s => { s.festival.cocoa.stock = 20; for (const p of M.COCOA_SPECIALS) s.festival.cocoa.extras[p.id].stock = s.festival.cocoa.level >= p.tier ? 10 : 0; };

test('Sandy’s last two upgrades require levels10/12, cost real coins and increase capacity', () => {
  const s = setup(3); s.earned = 26000; const before = s.coins;
  assert.equal(M.upgradeCocoa(s), false); s.earned = 42000; assert.equal(M.upgradeCocoa(s), true);
  assert.equal(s.festival.cocoa.level, 4); assert.equal(M.cocoaCapacity(s), 160); assert.equal(s.coins, before - 9000);
  assert.equal(M.setCocoaPrice(s, 9), true); assert.equal(M.setCocoaPrice(s, 10), false);
  s.earned = 70000; assert.equal(M.upgradeCocoa(s), false); s.earned = 110000;
  assert.equal(M.upgradeCocoa(s), true); assert.equal(M.cocoaCapacity(s), 240); assert.equal(M.setCocoaPrice(s, 12), true);
  assert.equal(s.coins, before - 25000); assert.equal(s.festival.cocoa.stock, 0); assert.equal(M.upgradeCocoa(s), false);
});

test('three deluxe products unlock at the right tiers with paid unit costs and bounded stock', () => {
  const s = setup(3), before = s.coins;
  assert.equal(M.restockCocoaSpecial(s, 'ghost-wafer'), 0); s.festival.cocoa.level = 4;
  assert.equal(M.restockCocoaSpecial(s, 'ghost-wafer'), 10); assert.equal(s.coins, before - 50);
  assert.equal(M.restockCocoaSpecial(s, 'caramel-flake'), 10); assert.equal(s.coins, before - 110);
  assert.equal(M.specialCapacity(s, 'caramel-flake'), 50); assert.equal(M.restockCocoaSpecial(s, 'smores-platter'), 0);
  s.festival.cocoa.level = 5; assert.equal(M.restockCocoaSpecial(s, 'smores-platter'), 10);
  assert.equal(s.coins, before - 160); assert.equal(s.festival.cocoa.supplies, 160);
  assert.equal(M.specialCapacity(s, 'smores-platter'), 80); assert.equal(M.setCocoaSpecialPrice(s, 'caramel-flake', 24), true);
  assert.equal(M.setCocoaSpecialPrice(s, 'caramel-flake', 25), false);
  s.festival.cocoa.extras['ghost-wafer'].stock = 79; assert.equal(M.restockCocoaSpecial(s, 'ghost-wafer'), 1);
  assert.equal(s.festival.cocoa.extras['ghost-wafer'].stock, 80);
});

test('a deluxe drink and sharing snack charge once from one finite wallet and separate accounts', () => {
  const s = setup(); stockMenu(s); s.stock[0] = 5; const c = s.festival.cocoa, v = guest(), order = M.quoteStandOrder(s, v);
  assert.ok(order.some(l => l.id === 'caramel-flake')); assert.ok(order.some(l => l.id === 'smores-platter'));
  const before = s.coins, total = order.reduce((n, l) => n + l.price, 0);
  assert.equal(total, 27); assert.equal(M.payStandOrder(s, v, order), total); assert.equal(v.budget, 73);
  assert.equal(v.snackKind, 'smores-platter'); assert.equal(v.cocoaKind, 'caramel-flake');
  assert.equal(c.extras['caramel-flake'].stock, 9); assert.equal(c.extras['smores-platter'].stock, 9);
  assert.equal(c.sold, 1); assert.equal(c.gross, 27); assert.equal(s.stall.cocoa, 27); assert.equal(s.shop.income, 0); assert.equal(M.totalTips(s), 0);
  assert.equal(M.payStandOrder(s, v, order), 0); assert.equal(s.coins, before + total);
});

test('Sandy leaves money for the intended pumpkin, wanted variety and a later meal', () => {
  const s = setup(); stockMenu(s); s.stock[0] = 10;
  const wanted = guest(94); wanted.wish = { variety: 3, purse: 70 }; wanted.basketLimit = 2;
  const order = M.quoteStandOrder(s, wanted), total = order.reduce((n, l) => n + l.price, 0);
  assert.ok(total <= 12); M.payStandOrder(s, wanted, order); assert.ok(wanted.budget - 12 >= 70);
  s.kitchen.purchased = true; const diner = guest(60); diner.mealPurse = 40;
  const mealOrder = M.quoteStandOrder(s, diner); assert.ok(mealOrder.reduce((n, l) => n + l.price, 0) <= 8);
  M.payStandOrder(s, diner, mealOrder); assert.ok(diner.budget >= 52);
});

test('ghost barista and courier crate are one-time paid upgrades with no free inventory', () => {
  const s = setup(2), c = s.festival.cocoa;
  assert.equal(M.buyCocoaAutomation(s, 'barista'), false); assert.equal(M.buyCocoaAutomation(s, 'bulkCourier'), false);
  c.level = 3; const before = s.coins, duration = M.cocoaServiceSeconds(s);
  assert.equal(M.buyCocoaAutomation(s, 'barista'), true); assert.ok(Math.abs(M.cocoaServiceSeconds(s) - duration * .65) < 1e-8);
  assert.equal(s.coins, before - 1600); assert.equal(c.stock, 0); assert.equal(M.buyCocoaAutomation(s, 'barista'), false);
  assert.equal(M.hireCocoaCourier(s), true); assert.equal(M.buyCocoaAutomation(s, 'bulkCourier'), true);
  assert.equal(s.coins, before - 4000); assert.equal(c.invested, 4000); assert.equal(M.buyCocoaAutomation(s, 'bulkCourier'), false);
});

test('automatic crates buy selected real supplies once, obey capacity and keep £100 reserve', () => {
  const s = setup(4), c = s.festival.cocoa; c.courier = c.autoSupply = c.bulkCourier = true; s.coins = 200; c.stock = 5;
  M.updateFestival(s); assert.equal(c.stock, 25); assert.equal(s.coins, 160); assert.equal(c.supplies, 40);
  M.updateFestival(s); assert.equal(s.coins, 160);
  assert.equal(M.setCocoaAutoSpecial(s, 'caramel-flake', true), true); M.updateFestival(s);
  assert.equal(c.extras['caramel-flake'].stock, 0); assert.equal(s.coins, 160);
  s.coins = 300; M.updateFestival(s); assert.equal(c.extras['caramel-flake'].stock, 20); assert.equal(s.coins, 180);
  assert.equal(c.extras['caramel-flake'].supplies, 120); assert.equal(c.supplies, 160); assert.equal(c.extras['ghost-wafer'].stock, 0);
  M.updateFestival(s); assert.equal(s.coins, 180); c.stock = 159;
  assert.equal(M.restockCocoa(s), 1); assert.equal(c.stock, 160); assert.equal(s.coins, 178);
});

test('pause stops automatic supplies, helper purchases and direct payments', () => {
  const s = setup(5), c = s.festival.cocoa; stockMenu(s); const v = guest(), order = M.quoteStandOrder(s, v);
  c.courier = c.autoSupply = c.bulkCourier = true; c.stock = 0; s.paused = true; const before = JSON.stringify(s);
  M.updateFestival(s); assert.equal(M.payStandOrder(s, v, order), 0); assert.equal(M.buyCocoaAutomation(s, 'barista'), false);
  assert.equal(M.setCocoaAutoSpecial(s, 'caramel-flake', true), false); assert.equal(JSON.stringify(s), before); assert.equal(v.budget, 100);
});

test('level5 stock, prices and paid automation survive bounded save restoration', () => {
  const s = setup(), c = s.festival.cocoa; stockMenu(s); c.courier = c.autoSupply = c.bulkCourier = c.barista = true; c.autoSpecials = ['ghost-wafer', 'smores-platter'];
  M.setCocoaPrice(s, 12); M.setCocoaSpecialPrice(s, 'caramel-flake', 24);
  const raw = JSON.parse(JSON.stringify(M.saveData(s))), loaded = M.restoreState(raw);
  assert.deepEqual(loaded.festival, s.festival);
  raw.festival.cocoa.level = 100; raw.festival.cocoa.stock = 1e9; raw.festival.cocoa.extras['caramel-flake'].stock = 1e9;
  raw.festival.cocoa.autoSpecials = ['ghost-wafer', 'ghost-wafer', '__proto__'];
  const restored = M.restoreState(raw).festival.cocoa;
  assert.equal(restored.level, 5); assert.equal(restored.stock, 240); assert.equal(restored.extras['caramel-flake'].stock, 80); assert.deepEqual(restored.autoSpecials, ['ghost-wafer']);
});

test('new pavilion tiers grow instead of shrinking and deluxe props have finite native geometry', () => {
  const matrix = new THREE.Matrix4(), widths = [], counts = [];
  for (const level of [3, 4, 5]) {
    const g = cocoaKiosk(level); g.updateMatrixWorld(true); widths.push(new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()).x);
    let count = 0; g.traverse(m => {if(m.isInstancedMesh){count += m.count; for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));assert.ok(matrix.determinant()>0);}}}); counts.push(count);
  }
  assert.ok(widths[2] > widths[1] && widths[1] > widths[0]); assert.ok(counts[2] > counts[1] && counts[1] > counts[0]);
  for(const id of ['ghost-wafer', 'caramel-flake', 'smores-platter']){
    const g = cocoaProp(id); let boxes = 0; g.traverse(m=>{if(m.isInstancedMesh){boxes += m.count;for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));assert.ok(matrix.determinant()>0);}}});assert.ok(boxes>=20);
    assert.equal(cocoaProp(id).children[0].material,g.children[0].material);
  }
  assert.notEqual(takeawayCup('ghost-wafer').children[0].material,takeawayCup('cocoa').children[0].material);
});

test('the real meadow displays the three deluxe products and hired helpers without new lights', () => {
  const s = setup(); stockMenu(s); s.festival.cocoa.barista = s.festival.cocoa.bulkCourier = true;
  const scene = new THREE.Scene(), world = createFestivalWorld({scene,state:s,world:buildWorld(),signBoard:()=>new THREE.Group()});world.tick(1);
  assert.ok(world.status.barista);assert.ok(world.status.bulkCrate);
  assert.ok(['ghost-wafer','caramel-flake','smores-platter'].every(id=>world.status.displayed.includes(id)));
  let lights = 0;scene.traverse(m=>{if(m.isLight)lights++;});assert.equal(lights,0);
});

test('explicit starving and VIP guests may buy eight or six portions, still bounded by cash', () => {
  for(const [flags,budget,expected]of [[{starving:true},100,8],[{vip:true},100,6],[{starving:true},30,2]]){
    const s=M.freshState();s.shop.unlocked=true;s.kitchen.purchased=true;s.kitchen.recipes=['wedges'];s.kitchen.displays=['wedges',null];s.kitchen.food.wedges=20;s.customerCare.bags=1;
    const v={...guest(budget),...flags};const q=M.quoteFoodForCustomer(s,v);assert.equal(q.quantity,expected);const paid=M.commitFoodForCustomer(s,v);assert.equal(paid.amount,11*expected);assert.equal(v.budget,budget-paid.amount);
    const saved=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));assert.equal(saved.kitchen.ledger.receipts[0].quantity,expected);
  }
});
