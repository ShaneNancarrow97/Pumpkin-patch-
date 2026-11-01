import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REWARD_PROPS} from '../models/reward-props.js';
import {decorById} from '../../../../src/model.js';

test('night briefs, authored icons and model IDs agree without registering live rewards',()=>{
 const content=JSON.parse(fs.readFileSync(new URL('../data/festival-themes.json',import.meta.url)));
 const art=JSON.parse(fs.readFileSync(new URL('../art/manifest.json',import.meta.url)));
 const models=REWARD_PROPS.map(p=>p.id).sort();
 assert.equal(content.integrationStatus,'not-installed');
 assert.deepEqual(content.rewards.map(r=>r.id).sort(),models);
 assert.deepEqual(content.themes.map(t=>t.rewardId).sort(),models);
 assert.deepEqual(art.icons.slice(0,3).map(i=>i.id),content.themes.map(t=>t.id));
 assert.deepEqual(art.icons.slice(3).map(i=>i.id).sort(),models);
 for(const id of models)assert.equal(decorById[id],undefined,'reward remains an opt-in asset: '+id);
});
