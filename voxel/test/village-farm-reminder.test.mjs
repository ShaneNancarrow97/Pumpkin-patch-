import test from 'node:test';
import assert from 'node:assert/strict';
import {createVillageFarmReminder} from '../src/ui/village-farm-reminder.js';

test('farm reminder appears every ten active village minutes and fades without changing gameplay',()=>{
  const clock=createVillageFarmReminder();assert.equal(clock.tick(599),false);assert.equal(clock.tick(30,{paused:true}),false);
  assert.equal(clock.tick(1),true);assert.equal(clock.tick(2.5),true);assert.equal(clock.tick(.11),false);
  assert.equal(clock.tick(597.39),true);clock.reset();assert.equal(clock.tick(1),false);assert.equal(clock.state.next,600);
});
test('dialogue defers one reminder and long gaps never queue a stack',()=>{
  const clock=createVillageFarmReminder();assert.equal(clock.tick(600,{blocked:true}),false);assert.equal(clock.state.pending,true);
  assert.equal(clock.tick(10,{blocked:true}),false);assert.equal(clock.tick(0),true);assert.equal(clock.tick(3),false);
  assert.equal(clock.tick(2400,{blocked:true}),false);assert.equal(clock.tick(0),true);assert.equal(clock.tick(3),false);assert.equal(clock.tick(0),false);
});
