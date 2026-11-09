import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { BLIGHT_NODES, MATERIALS, MATERIAL_BY_ID, NODES } from '../src/content/village.js';
import { QUEST_BY_ID } from '../src/content/village-quests.js';

const FIRST = 'blight-first-signs', REMEDY = 'blight-root-and-remedy', WARD = 'blight-lantern-ward';
const SPORES = 'cursed-spores';
const green = BLIGHT_NODES.filter(n => n.district === 'green');
const reload = s => M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
// Stage an already-earned level; complete the invitation through its real rules.
function farm(level = 8, invite = true) {
  const s = M.freshState();
  s.earned = M.LEVELS[level-1].at;
  s.progression.claimed = M.LEVELS.slice(0,level).map(l => l.level); s.progression.pending = [];
  if (invite) {
    M.inviteToVillage(s); M.finishTour(s);
    M.finishTalk(s, 'invitation', 'rowan'); M.finishTalk(s, 'invitation', 'elowen');
  }
  return s;
}
function clear(s, n) {
  const events = [];
  for (let i=0;i<n;i++) {
    const node = green.find(node => M.nodeReady(s,node.id));
    assert.ok(node, 'the Green has a fresh patch without a forced respawn wait');
    const result = M.gatherNode(s,node.id);
    assert.equal(result?.cleared,true,node.id); events.push(...result.events);
  }
  return events;
}
function gather(s, material, n) {
  while ((s.village.materials[material] ?? 0)<n) {
    const node = NODES.find(node => node.district==='green' && node.material===material && M.nodeReady(s,node.id));
    assert.ok(node, material+' can be gathered from actual ready nodes');
    assert.ok(M.gatherNode(s,node.id)?.amount>0);
  }
}
function harvest(s, n) {
  const before = s.harvested;
  while (s.harvested-before<n) {
    s.plots[0] = { phase:'ready', progress:1, variety:0, ripe:s.time };
    assert.ok(M.harvest(s,0)>0, 'a real harvest adds pumpkins to farm stock');
    M.advanceQuests(s);
  }
}
function finish(s,id) {
  assert.equal(M.questStatus(s,id),'offered',id+' is offered at this stage');
  const events = [...M.startQuest(s,id)];
  for (let guard=0;guard<10 && M.questStatus(s,id)!=='done';guard++) {
    const step = M.questStep(s,id); assert.ok(step,id+' has a current step');
    if (step.kind==='root-out') events.push(...clear(s,step.n));
    else if (step.kind==='talk') events.push(...M.finishTalk(s,id,step.who));
    else if (step.kind==='deliver') {
      for (const [material,n] of Object.entries(step.cost)) gather(s,material,n);
      assert.equal(M.handOver(s,step.who,id)?.ok,true);
      const before = {...s.village.materials}, result = M.doHandOver(s,step.who,id);
      assert.ok(result); events.push(...result);
      for (const [material,n] of Object.entries(step.cost)) assert.equal(s.village.materials[material],before[material]-n,'hand-over consumes '+material);
    } else if (step.kind==='harvest') harvest(s,step.n);
    else assert.fail('Unexpected blight step '+step.kind);
  }
  assert.equal(M.questStatus(s,id),'done');
  return events;
}

test('version-18 villages acquire blight defaults without reopening old completed stories', () => {
  assert.equal(M.STATE_VERSION,18);
  assert.equal(green.length,32); assert.equal(new Set(BLIGHT_NODES.map(n => n.id)).size,BLIGHT_NODES.length);
  assert.ok(green.every(n => n.material===SPORES && n.kind==='blight' && n.action==='Root out'));
  const raw = M.saveData(farm()); raw.version = 18;
  delete raw.village.materials[SPORES]; delete raw.village.gatherCycles;
  for (const node of BLIGHT_NODES) delete raw.village.nodes[node.id];
  raw.village.quests['rowan-1'] = {step:QUEST_BY_ID['rowan-1'].steps.length,base:null,done:true};
  raw.village.claims['quest:rowan-1'] = true;
  const s = M.restoreState(raw);
  assert.equal(s.village.materials[SPORES],0); assert.deepEqual(s.village.gatherCycles,{});
  for (const node of BLIGHT_NODES) assert.equal(s.village.nodes[node.id],0,node.id+' starts ready when its district opens');
  assert.deepEqual(s.village.quests['rowan-1'],raw.village.quests['rowan-1']);
  assert.equal(s.village.claims['quest:rowan-1'],true);
  assert.equal(M.questStatus(s,FIRST),'offered'); assert.equal(s.village.quests[FIRST],undefined,'new stories await player acceptance');
});

test('blight respects invitation, gathering, pause, cooldown and future-district gates', () => {
  const s = farm(20,false), id = green[0].id;
  assert.equal(M.gatherNode(s,id),null);
  M.inviteToVillage(s); assert.equal(M.gatherNode(s,id),null,'finish the gathering introduction first');
  M.finishTour(s); M.finishTalk(s,'invitation','rowan'); M.finishTalk(s,'invitation','elowen');
  s.paused = true; assert.equal(M.gatherNode(s,id),null); assert.equal(M.blightClearCount(s,'green'),0);
  s.paused = false; const result = M.gatherNode(s,id);
  assert.equal(result.material,SPORES); assert.equal(result.amount,1); assert.equal(result.cleared,true);
  assert.equal(M.gatherNode(s,id),null); assert.equal(M.blightClearCount(s,'green'),1);
  const wait = s.village.nodes[id]; assert.ok(wait>0);
  s.paused = true; M.updateVillage(s,wait+1); assert.equal(s.village.nodes[id],wait,'pause preserves the cooldown');
  s.paused = false; M.updateVillage(s,wait-1); assert.equal(M.nodeReady(s,id),false);
  const ready = M.updateVillage(s,1); assert.equal(ready.filter(e => e.type==='village-resource-ready' && e.id===id).length,1);
  assert.equal(M.nodeReady(s,id),true); assert.equal(M.blightClearCount(s,'green'),1,'regrowth alone never counts as clearing');
  s.village.quests['two-doorbells'] = {done:true,step:QUEST_BY_ID['two-doorbells'].steps.length,base:null};
  for (const district of ['copse','quarry']) {
    const future = BLIGHT_NODES.filter(n => n.district===district); assert.ok(future.length>0);
    for (const node of future) { assert.equal(M.nodeReady(s,node.id),false); assert.equal(M.gatherNode(s,node.id),null); }
    assert.equal(M.blightClearCount(s,district),0,'unimplemented district stays closed even at level 20');
  }
});

test('a full satchel can clear hazards once but cannot consume ordinary resource piles', () => {
  const s = farm(); M.startQuest(s,FIRST);
  const capacity = M.villageMaterialCapacity(s);
  for (const m of MATERIALS) s.village.materials[m.id] = capacity;
  const before = s.village.stats.gathered;
  const result = M.gatherNode(s,green[0].id);
  assert.equal(result.amount,0); assert.equal(result.cleared,true); assert.equal(result.overflow,true);
  assert.equal(s.village.materials[SPORES],capacity); assert.equal(s.village.stats.gathered,before);
  assert.equal(M.blightClearCount(s,'green'),1); assert.equal(M.stepProgress(s,FIRST).have,1);
  assert.equal(M.nodeReady(s,green[0].id),false); assert.equal(M.gatherNode(s,green[0].id),null);
  const ordinary = NODES.find(n => n.kind!=='blight' && n.district==='green' && n.material==='logs');
  assert.equal(M.gatherNode(s,ordinary.id).full,true);
  assert.equal(M.nodeReady(s,ordinary.id),true); assert.equal(s.village.gatherCycles[ordinary.id],undefined);
  clear(s,2); assert.equal(M.questStep(s,FIRST).kind,'deliver','zero-loot fresh clears still satisfy the task');
  assert.equal(M.blightClearCount(s,'green'),3); assert.equal(s.village.materials[SPORES],capacity);
});

test('fresh-clearing snapshots, stored samples and cooldowns survive a normal save round trip', () => {
  let s = farm(); clear(s,2); M.startQuest(s,FIRST);
  assert.equal(s.village.quests[FIRST].base,2); assert.deepEqual(M.stepProgress(s,FIRST),{have:0,need:3});
  clear(s,1); assert.deepEqual(M.stepProgress(s,FIRST),{have:1,need:3});
  const before = JSON.parse(JSON.stringify(s.village)); s = reload(s);
  assert.equal(s.version,18); assert.equal(s.village.quests[FIRST].base,2);
  assert.deepEqual(s.village.nodes,before.nodes); assert.deepEqual(s.village.gatherCycles,before.gatherCycles);
  assert.deepEqual(s.village.materials,before.materials); assert.deepEqual(s.village.claims,before.claims);
  assert.deepEqual(M.stepProgress(s,FIRST),{have:1,need:3});
  const rows = M.questRequirementRows(s,FIRST);
  assert.equal(rows.length,1); assert.equal(rows[0].have,1); assert.equal(rows[0].need,3); assert.equal(rows[0].complete,false);
  assert.match(M.questStepText(s,FIRST),/1\/3/); assert.match(M.questStepHint(s,FIRST),/fresh/i);
  clear(s,2); assert.equal(M.questStep(s,FIRST).kind,'deliver');
  assert.equal(M.blightClearCount(s,'green'),5,'earlier clears were retained but did not fulfil the new step');
});

test('new chapters require their level and previous story without unlocking northern districts', () => {
  const low = farm(2,false); assert.equal(M.questStatus(low,FIRST),'locked');
  const s = farm(4); assert.equal(M.questStatus(s,REMEDY),'locked'); assert.deepEqual(M.startQuest(s,REMEDY),[]);
  finish(s,FIRST); assert.equal(M.questStatus(s,REMEDY),'locked','first story alone does not skip level 5');
  s.earned = M.LEVELS[4].at+s.progression.bonusEarned; s.progression.claimed = [1,2,3,4,5];
  assert.equal(M.questStatus(s,REMEDY),'offered'); assert.equal(M.questStatus(s,WARD),'locked');
  finish(s,REMEDY); assert.equal(M.questStatus(s,WARD),'locked','second story alone does not skip level 8');
  s.earned = M.LEVELS[7].at+s.progression.bonusEarned; s.progression.claimed = [1,2,3,4,5,6,7,8];
  assert.equal(M.questStatus(s,WARD),'offered'); assert.equal(M.districtOpen(s,'copse'),false); assert.equal(M.districtOpen(s,'quarry'),false);
});

test('the complete three-chapter loop uses eight fresh patches, real deliveries and new farm harvests', () => {
  let s = farm(); s.harvested = 100;
  const earned = M.levelEarnings(s), level = M.patchLevel(s).level;
  assert.equal(s.kitchen.recipes.includes('garden-skillet'),false);
  const events = [...finish(s,FIRST),...finish(s,REMEDY),...finish(s,WARD)];
  assert.equal(M.blightClearCount(s,'green'),8); assert.equal(s.harvested,130,'the farm supplied twelve then eighteen fresh pumpkins');
  assert.equal(s.village.materials[SPORES],3,'three samples went to Elowen and two to Rowan');
  assert.ok(s.kitchen.recipes.includes('garden-skillet')); assert.ok(s.house.owned.includes('gothic-spice-cabinet'));
  assert.ok(s.village.decor.owned['toadstool-lamp']>=1); assert.ok(s.village.decor.owned['coffin-planter']>=1);
  for (const id of [FIRST,REMEDY,WARD]) {
    assert.equal(events.filter(e => e.type==='quest-done' && e.quest===id).length,1,id+' finishes once');
    assert.equal(s.village.claims['quest:'+id],true);
  }
  assert.equal(M.levelEarnings(s),earned,'story and friendship gifts cannot fund the next level');
  assert.equal(M.patchLevel(s).level,level);
  s = reload(s); const settled = JSON.stringify(M.saveData(s));
  for (const id of [FIRST,REMEDY,WARD]) { assert.deepEqual(M.startQuest(s,id),[]); assert.deepEqual(M.finishTalk(s,id,QUEST_BY_ID[id].steps.at(-1).who),[]); }
  assert.deepEqual(M.advanceQuests(s),[]); assert.equal(JSON.stringify(M.saveData(s)),settled,'reopening or reloading finished stories grants nothing twice');
});

test('an already-known recipe becomes bonus coins and claim keys block reward replay', () => {
  const s = farm(); s.kitchen.recipes.push('garden-skillet'); finish(s,FIRST);
  const earned = M.levelEarnings(s), coins = s.coins, events = finish(s,REMEDY);
  const reward = events.find(e => e.type==='quest-done' && e.quest===REMEDY)?.rewards.find(r => r.kind==='recipe');
  assert.equal(reward?.id,'garden-skillet'); assert.equal(reward?.duplicate,true);
  assert.equal(s.kitchen.recipes.filter(id => id==='garden-skillet').length,1);
  assert.ok(s.coins>=coins+80); assert.equal(M.levelEarnings(s),earned);
  const settled = JSON.stringify(M.saveData(s));
  // Even an old record with a lost done flag cannot claim the reward again.
  s.village.quests[REMEDY].done = false;
  assert.equal(M.advanceQuests(s).find(e => e.type==='quest-done' && e.quest===REMEDY)?.rewards.length,0);
  assert.equal(JSON.stringify(M.saveData(s)),settled);
});

test('clear totals count only valid blight node cycles in the requested district', () => {
  const raw = M.saveData(farm()), copse = BLIGHT_NODES.find(n => n.district==='copse');
  raw.village.gatherCycles = { [green[0].id]:2,[green[1].id]:1,[green[2].id]:-1,[green[3].id]:1.5,[copse.id]:4,'logs-01':50,unknown:99 };
  const s = M.restoreState(raw);
  assert.equal(M.blightClearCount(s,'green'),3); assert.equal(M.blightClearCount(s,'copse'),4);
  assert.equal(M.blightClearCount(s,'quarry'),0); assert.equal(M.blightClearCount(s),7);
  assert.equal(s.village.gatherCycles[green[2].id],undefined); assert.equal(s.village.gatherCycles[green[3].id],undefined);
  assert.equal(MATERIAL_BY_ID[SPORES].yield,1);
});

test('legacy furniture survives new fungus sockets without consuming or duplicating either item', () => {
  const node = green[0], raw = M.saveData(farm());
  const piece = { instance:'v-legacy-blight', id:'stool', x:node.x, z:node.z, rotation:0 };
  raw.village.decor.placed.push(piece); raw.village.decor.owned.stool = 0;
  raw.village.gatherCycles[node.id] = 2;
  let s = M.restoreState(raw);
  assert.deepEqual(s.village.decor.placed.find(p => p.instance===piece.instance),piece,'a previously valid piece keeps its position');
  assert.equal(s.village.decor.owned.stool,0,'migration does not return another copy to storage');
  const count = M.blightClearCount(s,'green');
  assert.equal(M.nodeReady(s,node.id),false); assert.equal(M.gatherNode(s,node.id),null);
  assert.equal(s.village.nodes[node.id],0); assert.equal(M.blightClearCount(s,'green'),count);
  s = reload(s);
  assert.deepEqual(s.village.decor.placed.find(p => p.instance===piece.instance),piece);
  assert.equal(M.nodeReady(s,node.id),false,'another load keeps the covered socket dormant');
  const snapshot = JSON.parse(JSON.stringify(s.village.decor));
  assert.equal(M.moveVillageDecor(s,piece.instance,21,24,0),true);
  assert.equal(M.nodeReady(s,node.id),true); assert.equal(s.village.gatherCycles[node.id],2,'moving furniture does not count as clearing');
  assert.equal(M.restoreVillageDecor(s,snapshot),true,'Undo can restore the grandfathered layout');
  assert.equal(M.nodeReady(s,node.id),false); assert.equal(M.blightClearCount(s,'green'),count);
  assert.equal(M.moveVillageDecor(s,piece.instance,21,24,0),true);
  const result = M.gatherNode(s,node.id);
  assert.equal(result.amount,1); assert.equal(result.cleared,true); assert.equal(s.village.gatherCycles[node.id],3);
  assert.equal(M.blightClearCount(s,'green'),count+1); assert.equal(M.gatherNode(s,node.id),null);
  assert.equal(s.village.decor.owned.stool,0); assert.equal(s.village.decor.placed.filter(p => p.id==='stool').length,1);
  const fresh = farm(); fresh.village.decor.owned.stool = 1;
  assert.equal(M.villageDecorFits(fresh,'stool',node.x,node.z),false,'new pieces still reserve the fungus socket');
  assert.equal(M.placeVillageDecor(fresh,'stool',node.x,node.z),null);
  assert.equal(fresh.village.decor.owned.stool,1); assert.equal(M.nodeReady(fresh,node.id),true);
});
