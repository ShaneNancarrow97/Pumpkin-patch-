import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVillageShopMarkers,SHOP_MARKER_HEIGHT,SHOP_MARKER_REACH,VILLAGE_SHOP_MARKER_LIMIT} from '../src/village-shop-markers.js';
import {FIXTURES} from '../src/content/village.js';
import {VILLAGE_UI_GRID,VILLAGE_UI_ICONS} from '../src/content/village-ui-icon-meta.js';

const state=(open=false)=>({village:{unlocks:open?['stall']:[]}});
const near=new THREE.Vector3(FIXTURES.stall.x,2,-FIXTURES.stall.z+8);
function canvasHarness(){
 const contexts=[],textures=[];let reads=0;const image={};
 const canvasFactory=()=>{const c={draws:[],arcs:[],clearRect(){},beginPath(){},fill(){},stroke(){},moveTo(){},lineTo(){},closePath(){},createRadialGradient(){return{addColorStop(){}};},arc(...args){this.arcs.push(args);},drawImage(...args){this.draws.push(args);}};contexts.push(c);return{getContext:()=>c};};
 const doc={documentElement:{},defaultView:{getComputedStyle(){reads++;return{getPropertyValue:()=> 'url("data:image/webp;base64,c2hvcA==")'};}}};
 return{contexts,textures,image,options:{document:doc,canvasFactory,imageFactory:()=>image,textureFactory:c=>{const t=new THREE.Texture(c);textures.push(t);return t;}},get reads(){return reads;}};
}

test('only the unlocked real stall receives one correctly placed shop interaction emblem',()=>{
 const m=createVillageShopMarkers({document:null,groundAt:()=>.25});m.sync(state());m.tick(.1,near);assert.equal(m.stats.visible,false);
 m.sync(state(true));m.tick(.1,near);assert.equal(m.stats.count,VILLAGE_SHOP_MARKER_LIMIT);assert.equal(m.stats.visible,true);assert.equal(m.group.children.length,2);
 assert.equal(m.group.position.x,FIXTURES.stall.x);assert.equal(m.group.position.z,-FIXTURES.stall.z);assert.ok(m.group.position.y>=SHOP_MARKER_HEIGHT+.25-.07);
 assert.equal(m.pickables.length,1);assert.equal(m.pickables[0].userData.type,'village-stall');assert.equal(m.pickables[0].userData.shopMarker,true);assert.equal(m.pickables[0].scale.x,1.3);
 let lights=0;m.group.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,0);assert.equal(m.stats.addedLights,0);
 m.sync(state());m.tick(.1,near);assert.equal(m.stats.count,0);assert.equal(m.pickables[0].visible,false);m.dispose();
});

test('the rim turns slowly while the icon stays upright, and hidden/reduced-motion states remain quiet',()=>{
 let groundReads=0;const m=createVillageShopMarkers({document:null,groundAt:()=>{groundReads++;return .4;}});m.sync(state(true));const sprites=[...m.group.children],base=SHOP_MARKER_HEIGHT+.4;
 for(let i=0;i<200;i++){m.tick(.05,near);assert.ok(Math.abs(m.group.position.y-base)<=.070001);assert.equal(m.pickables[0].material.rotation,0);assert.ok(m.stats.rotation>=0&&m.stats.rotation<Math.PI*2);assert.deepEqual(m.group.children,sprites);}
 assert.equal(groundReads,1,'world height is sampled on sync, never every frame');assert.ok(m.stats.rotation<1.21,'ten seconds turn only about1.2 radians');
 m.tick(.1,near,true,true);assert.equal(m.group.position.y,base);assert.equal(m.stats.rotation,0);
 m.tick(.1,new THREE.Vector3(FIXTURES.stall.x+SHOP_MARKER_REACH+1,2,-FIXTURES.stall.z));assert.equal(m.stats.visible,false);assert.equal(m.pickables[0].visible,false);
 m.tick(.1,near,false);assert.equal(m.stats.visible,false);m.tick(.1,near);assert.equal(m.stats.visible,true);m.hide();assert.equal(m.stats.visible,false);m.dispose();
});

test('the painted icon crops the installed shared atlas once, without per-frame style or image work',()=>{
 const h=canvasHarness(),m=createVillageShopMarkers(h.options);assert.equal(h.reads,1);assert.ok(h.image.src.startsWith('data:image/webp'));
 const before=h.textures[0].version;h.image.onload();assert.equal(m.stats.iconLoaded,true);assert.ok(h.textures[0].version>before);
 const art=VILLAGE_UI_ICONS.workshop,cell=VILLAGE_UI_GRID.cell,draw=h.contexts[0].draws[0];assert.equal(draw[0],h.image);assert.deepEqual(draw.slice(1,5),[art.column*cell,art.row*cell,cell,cell]);
 m.sync(state(true));for(let i=0;i<100;i++)m.tick(.016,near);assert.equal(h.reads,1);assert.equal(h.contexts[0].draws.length,1);assert.equal(h.contexts.length,2);m.dispose();
});

test('disposing the marker releases owned maps/materials once and ignores a late atlas load',()=>{
 const h=canvasHarness(),m=createVillageShopMarkers(h.options),late=h.image.onload;let maps=0,materials=0,sharedGeometry=0;
 for(const t of h.textures)t.addEventListener('dispose',()=>maps++);
 for(const s of m.group.children)s.material.addEventListener('dispose',()=>materials++);
 m.pickables[0].geometry.addEventListener('dispose',()=>sharedGeometry++);
 m.sync(state(true));m.tick(.1,near);m.dispose();m.dispose();late();m.sync(state(true));m.tick(.1,near);
 assert.equal(maps,2);assert.equal(materials,2);assert.equal(sharedGeometry,0,'the shared Three Sprite quad remains available to other markers');assert.equal(m.group.children.length,0);assert.equal(m.stats.visible,false);assert.equal(m.stats.disposed,true);assert.equal(h.contexts[0].draws.length,0);
});
