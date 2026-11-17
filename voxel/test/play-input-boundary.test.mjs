import test from "node:test";
import assert from "node:assert/strict";
import { createPlayPadBoundary, createFarmCameraMode } from "../src/ui/play-input-boundary.js";

const pad = () => ({ id: "DualSense Wireless Controller", index: 0, connected: true, mapping: "standard", axes: [0,0,0,0], buttons: Array.from({length:18},()=>({pressed:false,value:0})) });
const hold = (p,i,on=true) => {p.buttons[i]={pressed:on,value:on?1:0};};

test("a travel handoff cannot inherit Cross or a still-held walking stick", () => {
  const boundary=createPlayPadBoundary(),p=pad();boundary.sample(p);hold(p,0);p.axes[1]=-1;
  let got=boundary.sample(p);assert.equal(got.pressed(0),true);assert.equal(got.pad.axes[1],-1);
  boundary.release(p);got=boundary.sample(p);assert.equal(got.down[0],false);assert.equal(got.pressed(0),false);assert.deepEqual(got.pad.axes,[0,0,0,0]);
  hold(p,0,false);p.axes.fill(0);boundary.sample(p);hold(p,0);p.axes[1]=-.6;got=boundary.sample(p);assert.equal(got.pressed(0),true);assert.equal(got.pad.axes[1],-.6);
});

test("look and movement each need neutral once without suppressing a new button", () => {
  const boundary=createPlayPadBoundary(),p=pad();boundary.sample(p);p.axes=[1,0,0,1];boundary.release(p);boundary.sample(p);
  p.axes[0]=0;boundary.sample(p);p.axes[0]=.7;hold(p,3);const got=boundary.sample(p);
  assert.equal(got.pad.axes[0],.7);assert.equal(got.pad.axes[3],0);assert.equal(got.pressed(3),true);
  p.axes[3]=0;boundary.sample(p);p.axes[3]=-.8;assert.equal(boundary.sample(p).pad.axes[3],-.8);
});

test("disconnect, replacement and malformed axes never manufacture controls", () => {
  const boundary=createPlayPadBoundary(),p=pad();boundary.sample(p);hold(p,11);assert.equal(boundary.sample(p).pressed(11),true);
  assert.equal(boundary.sample(null).pad,null);let got=boundary.sample(p);assert.equal(got.pressed(11),false);
  p.axes=[NaN,Infinity,-Infinity,undefined];hold(p,11,false);got=boundary.sample(p);assert.deepEqual(got.pad.axes,[0,0,0,0]);
  p.id="Different controller";hold(p,0);got=boundary.sample(p);assert.equal(got.pressed(0),false);
});

test("camera ownership consumes R3/Circle exits and never leaks them into play", () => {
  const mode=createFarmCameraMode();let got=mode.update({eligible:true,pressed:i=>i===11});assert.deepEqual(got,{active:true,changed:true,consumed:true});
  got=mode.update({eligible:true});assert.deepEqual(got,{active:true,changed:false,consumed:true});
  got=mode.update({eligible:true,pressed:i=>i===1});assert.deepEqual(got,{active:false,changed:true,consumed:true});
  assert.equal(mode.update({eligible:true}).consumed,false);
  mode.update({eligible:true,pressed:i=>i===11});assert.equal(mode.update({eligible:true,pressed:i=>i===11}).active,false);
});

test("a menu or non-farm scene ends camera ownership without opening it there", () => {
  const mode=createFarmCameraMode();assert.equal(mode.update({eligible:false,pressed:i=>i===11}).active,false);
  mode.update({eligible:true,pressed:i=>i===11});const left=mode.update({eligible:false});assert.deepEqual(left,{active:false,changed:true,consumed:true});
  assert.equal(mode.update({eligible:false,pressed:i=>i===1}).consumed,false);
});
