import test from 'node:test';
import assert from 'node:assert/strict';
import { ps5Icon } from '../src/ui/dualsense-icons.js';

test('all reference controller symbols are pure, named, sharp vector artwork',()=>{
  for(const id of ['cross','circle','square','triangle','dpad','up','down','left','right','ls','rs','l3','r3','l1','r1','l2','r2','options','create','touchpad']){
    const html=ps5Icon(id);assert.ok(html.includes(`data-ps5-icon="${id}"`),id);assert.ok(html.includes('aria-hidden="true"'));assert.ok(html.includes('viewBox="0 0 32 32"'));
    assert.ok(html.includes('non-scaling-stroke'));assert.ok(html.includes('stroke-width="1.5"'));assert.ok(!html.includes('<text'));assert.ok(!html.includes('<image'));assert.ok(!html.includes('http'));
  }
});

test('face colours, neutral strokes and amber override remain independent',()=>{
  for(const [id,col] of Object.entries({cross:'#8b98c4',circle:'#e85858',square:'#d08ab9',triangle:'#00bbb5'}))assert.ok(ps5Icon(id).includes(`var(--ps5-accent,${col})`));
  assert.ok(ps5Icon('options').includes('--ps5-ink,#b7cbd8'));
  assert.ok(ps5Icon('up').includes('var(--ps5-accent,#f2c276)'));
  assert.equal(ps5Icon('L3'),ps5Icon('l3'));
  assert.equal(ps5Icon('lstick'),ps5Icon('ls'));
});

test('unknown controller symbols cannot inject markup; glyph size is bounded',()=>{
  for(const id of ['__proto__','constructor','<script>',undefined,null,{}])assert.equal(ps5Icon(id),'');
  assert.ok(ps5Icon('cross',-4).includes('inline-size:16px'));assert.ok(ps5Icon('cross',Infinity).includes('inline-size:64px'));
  assert.ok(ps5Icon('cross','invalid').includes('inline-size:24px'));
});
