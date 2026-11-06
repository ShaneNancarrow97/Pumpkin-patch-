import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,plant} from '../src/model.js';
import {waterPlot,wateringStatus,WATER} from '../src/rules/hands-on.js';
test('watering helps one growing plot, has a cooldown, and creates no money',()=>{const s=freshState();plant(s,0);plant(s,1);const coins=s.coins;assert.equal(waterPlot(s,0),true);assert.equal(s.plots[0].progress,WATER.progress);assert.equal(s.plots[1].progress,0);assert.equal(s.coins,coins);assert.equal(waterPlot(s,0),false);s.time+=12;assert.equal(waterPlot(s,0),true);});
test('watering rejects empty, closed and paused plots, and safely ripens a crop',()=>{const s=freshState();assert.equal(waterPlot(s,-1),false);assert.equal(waterPlot(s,0),false);plant(s,0);s.paused=true;assert.equal(waterPlot(s,0),false);s.paused=false;s.plots[0].progress=.95;assert.equal(waterPlot(s,0),true);assert.equal(s.plots[0].phase,'ready');assert.equal(wateringStatus(s,0).available,false);});
