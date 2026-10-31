import test from "node:test";
import assert from "node:assert/strict";
import { RENDER_QUALITIES, renderSizing, validRenderQuality } from "../src/render-quality.js";

test("Fold's high-density scene keeps full detail with glow on",()=>{
 const q=renderSizing(874,787,2);
 assert.equal(q.quality,"sharp");assert.equal(q.pixelRatio,2);assert.equal(q.postprocessRatio,q.pixelRatio);
 assert.equal(q.bufferWidth,1748);assert.equal(q.bufferHeight,1574);
});
test("quality choices bound the actual pixel budget on large screens",()=>{
 for(const q of RENDER_QUALITIES){
  const s=renderSizing(3840,2160,3,q.id);
  assert.ok(s.pixelRatio<=q.maxDpr);assert.ok(s.bufferWidth*s.bufferHeight<=q.maxPixels);
  assert.equal(s.postprocessRatio,s.pixelRatio);
 }
 const sharp=renderSizing(874,787,2,"sharp"),balanced=renderSizing(874,787,2,"balanced"),performance=renderSizing(874,787,2,"performance");
 assert.ok(sharp.bufferWidth>balanced.bufferWidth);assert.ok(balanced.bufferWidth>performance.bufferWidth);
});
test("unfolding recalculates density and stale or invalid preferences default safely",()=>{
 const folded=renderSizing(390,844,3,"sharp"),unfolded=renderSizing(874,787,3,"sharp");
 assert.equal(folded.pixelRatio,2);assert.equal(unfolded.pixelRatio,2);assert.notEqual(folded.bufferWidth,unfolded.bufferWidth);
 assert.equal(validRenderQuality("old-value"),"sharp");
 for(const bad of [undefined,NaN,Infinity,-1,0]){const s=renderSizing(bad,bad,bad);assert.ok(Number.isFinite(s.pixelRatio)&&s.bufferWidth>0&&s.bufferHeight>0);}
});
