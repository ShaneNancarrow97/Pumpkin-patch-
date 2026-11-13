import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { Voxels } from '../src/voxels.js';
import { finishVoxels, isVoxelBatch, setLampNear, softLightsReady, VOXEL_FINISH } from '../src/voxel-finish.js';
import { createLampGlow, LAMP_GLOW } from '../src/village-glow.js';
import { GradeShader, applyGrade, VILLAGE_GRADE } from '../src/picture-grade.js';
import { addMoonRim, addSpriteRim } from '../src/sprite-rim.js';

// Compile a patched material's shader text the way three.js would hand it over.
function compiled(material, base) {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib[base].vertexShader, fragmentShader: THREE.ShaderLib[base].fragmentShader };
  material.onBeforeCompile(shader, null); return shader;
}

test('the finish dresses every voxel batch once, lit and glowing, and nothing else', () => {
  const v = new Voxels(); v.box(0, 0, 0, 4, 3, .4, 0xd8c8b8); v.box(1, 1, .4, 1, 1.2, .05, 0xffd890, true);
  const built = v.build(), other = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshStandardMaterial());
  const root = new THREE.Group(); root.add(built, other);
  assert.equal(built.children.filter(isVoxelBatch).length, 2); assert.equal(isVoxelBatch(other), false);
  assert.equal(finishVoxels(root), 2, 'one lit material and one glowing material');
  assert.equal(finishVoxels(root), 0, 'a second pass finds nothing new');
  assert.equal(other.material.userData.voxelFinish, undefined, 'a plain mesh keeps its plain material');
  const [lit, glow] = built.children.map((m) => m.material);
  assert.notEqual(lit.customProgramCacheKey(), glow.customProgramCacheKey());
  const a = compiled(lit, 'standard'), b = compiled(glow, 'basic');
  for (const s of [a, b]) { assert.match(s.vertexShader, /vFinO = finP/); assert.match(s.fragmentShader, /finHash/); assert.equal(s.uniforms.finPitch.value, VOXEL_FINISH.pitch); }
  assert.match(a.fragmentShader, /finShape/, 'lit faces get relief'); assert.match(b.fragmentShader, /finLead/, 'glowing faces get leaded panes');
});

test('a lamp close to a finished wall is taken as if it stood off, and only out of doors', () => {
  assert.equal(softLightsReady, true, "three's falloff line is the one the finish rewrites");
  const v = new Voxels(); v.box(0, 0, 0, 2, 2, 2, 0x888888); const built = v.build(); finishVoxels(built);
  const shader = compiled(built.children[0].material, 'standard');
  assert.match(shader.fragmentShader, /max\( lightDistance, finNear \)/); assert.doesNotMatch(shader.fragmentShader, /#include <lights_pars_begin>/);
  setLampNear(4); assert.equal(shader.uniforms.finNear.value, 4); setLampNear(-3); assert.equal(shader.uniforms.finNear.value, 0);
});

test('lamp glow is two additive draws for any number of lamps, and adds no light', () => {
  const lamps = Array.from({ length: 40 }, (_, i) => ({ head: new THREE.Vector3(i * 3, 5, 0), ground: new THREE.Vector3(i * 3, 0, 0) }));
  const glow = createLampGlow(lamps); let draws = 0, lights = 0;
  glow.group.traverse((o) => { if (o.isLight) lights++; if (o.isInstancedMesh) { draws++; assert.equal(o.count, 40); assert.equal(o.material.blending, THREE.AdditiveBlending); assert.equal(o.material.depthWrite, false); } });
  assert.equal(draws, 2); assert.equal(lights, 0); assert.ok(LAMP_GLOW.near < LAMP_GLOW.far);
  glow.tick(2.5, { density: .0072 }); glow.tick(9, { still: true }); glow.dispose();
  assert.equal(createLampGlow([]).count, 0);
});

test('the grade is off unless a place asks for it, and the village asks gently', () => {
  const pass = { enabled: true, uniforms: THREE.UniformsUtils.clone(GradeShader.uniforms) };
  applyGrade(pass, null); assert.equal(pass.enabled, false);
  applyGrade(pass, VILLAGE_GRADE); assert.equal(pass.enabled, true); assert.equal(pass.uniforms.vignette.value, VILLAGE_GRADE.vignette);
  assert.ok(VILLAGE_GRADE.saturation <= 1.15 && VILLAGE_GRADE.contrast <= 1.1 && VILLAGE_GRADE.vignette <= .3, 'a touch, not a filter');
  assert.match(GradeShader.fragmentShader, /clamp\(rgb, 0\., 1\.\)/);
});

test("the owner's moon rim sits beside the neighbours' rim and lifts their own colour once", () => {
  const texture = new THREE.Texture(), material = new THREE.MeshStandardMaterial({ map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: .3 });
  addSpriteRim(material, 512, 512);
  const actor = new THREE.Group(); actor.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material));
  assert.equal(addMoonRim(actor, { lift: 1.5 }), 1); assert.equal(addMoonRim(actor, { lift: 1.5 }), 0, 'never patched twice');
  assert.ok(Math.abs(material.emissiveIntensity - .45) < 1e-9);
  const shader = compiled(material, 'standard');
  assert.match(shader.fragmentShader, /paintedRim/, 'the warm inner rim is kept'); assert.match(shader.fragmentShader, /rimUp/); assert.match(material.customProgramCacheKey(), /village-soft-rim-v1\|moon-rim-v1/);
});

test('the fidelity HUD follows the premium foundation and keeps the foundation touch and text contracts', () => {
  const build = fs.readFileSync(new URL('../build.mjs', import.meta.url), 'utf8'), css = fs.readFileSync(new URL('../src/ui/village-premium.css', import.meta.url), 'utf8');
  const order = [...build.matchAll(/"src\/ui\/(village-[a-z-]+\.css)"/g)].map((m) => m[1]);
  assert.equal(order.at(-1), 'village-fidelity.css');
  assert.ok(order.indexOf('village-premium.css') < order.indexOf('village-fidelity.css'));
  assert.doesNotMatch(css, /min-(?:width|height)/, 'touch targets keep the sizes the earlier layers gave them');
  for (const size of css.matchAll(/font(?:-size)?:[^;}]*?(\d+)px/g)) assert.ok(Number(size[1]) >= 12, 'no text under 12px');
});
