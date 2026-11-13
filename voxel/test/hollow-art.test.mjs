import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { freshState, FOYER_DECOR } from "../src/model.js";
import { buildHollowExterior, buildHollowFoyer, buildFoyerDecor } from "../src/hollow-house-world.js";
import { createMortimer } from "../src/mortimer.js";
function inspect(group){let boxes=0;const m=new THREE.Matrix4();group.traverse(o=>{if(!o.isInstancedMesh)return;boxes+=o.count;for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);assert.ok(m.elements.every(Number.isFinite));assert.ok(m.determinant()>0);}});assert.ok(boxes>0);return boxes;}
test("all restoration appearances and five detailed foyer tiers contain finite positive native voxels",()=>{for(const status of["derelict","restoring","ready"])inspect(buildHollowExterior(status,1));const s=freshState(),counts=[];for(let tier=1;tier<=5;tier++){s.hollowHouse.tier=tier;counts.push(inspect(buildHollowFoyer(s)));}assert.ok(counts[4]>counts[0]);for(const d of FOYER_DECOR)inspect(buildFoyerDecor(d.id));});
test("Mortimer has one consistent model with every animated activity remaining finite",()=>{const m=createMortimer();inspect(m.group);for(const mode of["idle","welcome","bow","selling","gesture","counting","dusting","frightened","vanish"]){m.tick(9.1,mode);m.group.updateMatrixWorld(true);m.group.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));assert.equal(m.group.userData.activity,mode==="idle"?"idle":mode);}});
