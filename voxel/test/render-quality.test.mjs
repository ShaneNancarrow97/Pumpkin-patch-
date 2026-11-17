import test from "node:test";
import assert from "node:assert/strict";
import { RENDER_QUALITIES, TV_CAST, renderSizing, tvPixelRatio, validRenderQuality } from "../src/render-quality.js";

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
test("TV mode draws what a 1080p cast shows: no more, and no softer",()=>{
 // A folded Fold in landscape: the cast shows 2.2 pixels a CSS pixel across, more than Sharp's 2, so nothing is lost.
 const folded=renderSizing(882,344,2.625,"sharp",false,true);
 assert.equal(folded.pixelRatio,renderSizing(882,344,2.625,"sharp").pixelRatio);
 // Unfolded: 1080 rows reach the TV, so 1500 would be wasted.
 const unfolded=renderSizing(832,750,2.625,"sharp",false,true);
 assert.equal(unfolded.bufferHeight,TV_CAST.height);assert.ok(unfolded.bufferWidth<=TV_CAST.width);
 assert.ok(unfolded.bufferWidth*unfolded.bufferHeight<renderSizing(832,750,2.625).bufferWidth*renderSizing(832,750,2.625).bufferHeight*.55);
 // Never more than the cast, never below one pixel a CSS pixel, and never above the chosen quality.
 for(const [w,h,d] of [[390,844,3],[844,390,3],[1280,800,2],[1920,1080,1],[3840,2160,2]]) for(const q of RENDER_QUALITIES){
  const s=renderSizing(w,h,d,q.id,false,true);
  assert.ok(s.bufferWidth<=Math.max(TV_CAST.width,w)&&s.bufferHeight<=Math.max(TV_CAST.height,h),`${w}x${h} ${q.id}`);
  assert.ok(s.pixelRatio<=q.maxDpr&&s.pixelRatio<=renderSizing(w,h,d,q.id).pixelRatio);
 }
 assert.equal(tvPixelRatio(1920,1080),1);assert.equal(tvPixelRatio(3840,2160),1);
});
