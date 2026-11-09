import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../src/model.js';
import { NODES } from '../src/content/village.js';
import { villageNodeCandidates, villageNodePosition } from '../src/content/village-node-sites.js';

const node = NODES.find(n => n.district === 'green' && n.material === 'logs');
const ready = () => { const s=M.freshState();s.village.invited=true;s.village.unlocks.push('gathering');return s; };
const reload = s => M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));

test('version19 retains optional gather cycles while legacy saves keep their authored first site', () => {
  assert.equal(M.STATE_VERSION,19);const s=ready();assert.deepEqual(s.village.gatherCycles,{});
  const raw=M.saveData(s);raw.version=16;delete raw.village.gatherCycles;const old=M.restoreState(raw);
  assert.deepEqual(old.village.gatherCycles,{});assert.deepEqual(villageNodePosition(old,node),{x:node.x,z:node.z});
  assert.ok(fs.existsSync(new URL('./fixtures/save-file-v1-state17.json',import.meta.url)));
  assert.ok(fs.existsSync(new URL('./fixtures/save-file-v1-state16.json',import.meta.url)));
  assert.ok(fs.existsSync(new URL('./fixtures/save-file-v1-state18.json',import.meta.url)));
});

test('successful gathers advance to a different saved site, with no timer or reload jitter', () => {
  let s=ready();const before={...villageNodePosition(s,node)};assert.ok(villageNodeCandidates(node).length>=3);
  const first=M.gatherNode(s,node.id);assert.equal(first.amount,2);assert.equal(s.village.gatherCycles[node.id],1);assert.equal(M.nodeReady(s,node.id),false);
  const next={...villageNodePosition(s,node)};assert.notDeepEqual(next,before);
  const wait=s.village.nodes[node.id];s=reload(s);assert.equal(s.village.gatherCycles[node.id],1);assert.equal(s.village.nodes[node.id],wait);assert.deepEqual(villageNodePosition(s,node),next);
  const early=M.updateVillage(s,wait-1);assert.equal(early.some(e=>e.type==='village-resource-ready'&&e.id===node.id),false);assert.equal(M.nodeReady(s,node.id),false);assert.deepEqual(villageNodePosition(s,node),next);
  const event=M.updateVillage(s,1).filter(e=>e.type==='village-resource-ready'&&e.id===node.id);assert.equal(event.length,1);assert.equal(M.nodeReady(s,node.id),true);assert.equal(s.village.gatherCycles[node.id],1);
  assert.equal(M.updateVillage(s,1).some(e=>e.type==='village-resource-ready'&&e.id===node.id),false,'ready event is one-shot');
  assert.equal(M.gatherNode(s,node.id).amount,2);assert.equal(s.village.gatherCycles[node.id],2);assert.notDeepEqual(villageNodePosition(s,node),next);
  assert.deepEqual(villageNodePosition(reload(s),node),villageNodePosition(s,node));
});

test('full, paused, locked or cooling-down resources do not advance their saved site', () => {
  const s=ready(),first={...villageNodePosition(s,node)};
  s.paused=true;assert.equal(M.gatherNode(s,node.id),null);s.paused=false;
  s.village.materials.logs=M.villageMaterialCapacity(s);assert.equal(M.gatherNode(s,node.id).full,true);assert.deepEqual(s.village.gatherCycles,{});
  s.village.materials.logs=0;s.village.nodes[node.id]=10;assert.equal(M.gatherNode(s,node.id),null);
  s.paused=true;assert.deepEqual(M.updateVillage(s,20),[]);assert.equal(s.village.nodes[node.id],10);assert.equal(s.village.clock,0);
  s.paused=false;for(const dt of [NaN,Infinity,0,-1])assert.deepEqual(M.updateVillage(s,dt),[]);
  s.village.unlocks=[];s.village.nodes[node.id]=0;assert.equal(M.gatherNode(s,node.id),null);assert.equal(M.gatherNode(s,'unknown'),null);
  assert.deepEqual(s.village.gatherCycles,{});assert.deepEqual(villageNodePosition(s,node),first);
});

test('cycle restoration accepts known safe integers only and bounds extreme saved counts', () => {
  const raw=M.saveData(ready());raw.village.gatherCycles={'logs-01':3.5,'logs-02':-1,'logs-03':Infinity,'logs-04':Number.MAX_SAFE_INTEGER,'stone-01':5,unknown:99};
  const s=M.restoreState(raw);assert.equal(s.village.gatherCycles['logs-01'],undefined);assert.equal(s.village.gatherCycles['logs-02'],undefined);assert.equal(s.village.gatherCycles['logs-03'],undefined);
  assert.equal(s.village.gatherCycles['logs-04'],1e9);assert.equal(s.village.gatherCycles['stone-01'],5);assert.equal(s.village.gatherCycles.unknown,undefined);
  assert.deepEqual(reload(s).village.gatherCycles,s.village.gatherCycles);
});

test('all possible resource sites remain reserved from new decorating', () => {
  const s=ready();for(const n of NODES.filter(n=>n.district==='green'))for(const p of villageNodeCandidates(n))assert.equal(M.villageDecorFits(s,'stool',p.x,p.z),false,`${n.id} future site stays clear`);
});
