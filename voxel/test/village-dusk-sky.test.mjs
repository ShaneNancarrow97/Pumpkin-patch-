import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildHorizon, SKY } from "../src/village-world.js";
import { dressVillageDuskSky, VILLAGE_DUSK_SKY } from "../src/village-dusk-sky.js";

function skyFixture() {
  return new THREE.Mesh(new THREE.SphereGeometry(600, 8, 4), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(SKY.top) }, middle: { value: new THREE.Color(SKY.middle) }, horizon: { value: new THREE.Color(SKY.horizon) }, low: { value: new THREE.Color(SKY.low) }, moon: { value: new THREE.Vector3(.36, .42, -.83).normalize() } },
    vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: "uniform vec3 top; varying vec3 vDir; void main() { gl_FragColor = vec4(top, 1.); }",
  }));
}
const release = mesh => { mesh.geometry.dispose(); mesh.material.dispose(); };
function actualHorizon() {
  const before = globalThis.document, gradient = { addColorStop() {} };
  const context = new Proxy({ createRadialGradient: () => gradient }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  try { return buildHorizon(); }
  finally { if (before === undefined) delete globalThis.document; else globalThis.document = before; }
}
function releaseHorizon(group) {
  const materials = new Set(), geometries = new Set(), textures = new Set();
  group.traverse(mesh => {
    if (mesh.isInstancedMesh) mesh.dispose();
    else if (mesh.isMesh) geometries.add(mesh.geometry);
    for (const material of [].concat(mesh.material ?? [])) { materials.add(material); if (material.map) textures.add(material.map); }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}

test("the actual horizon gains a dusk treatment without changing a mesh, vertex, uniform colour or render flag", () => {
  const horizon = actualHorizon(), sky = horizon.userData.sky, geometry = sky.geometry, material = sky.material;
  const before = { children: [...horizon.children], index: Array.from(geometry.index.array), position: Array.from(geometry.attributes.position.array), normal: Array.from(geometry.attributes.normal.array), uv: Array.from(geometry.attributes.uv.array), vertex: material.vertexShader, uniforms: material.uniforms,
    colours: Object.fromEntries(["top", "middle", "horizon", "low", "moon"].map(key => [key, { uniform: material.uniforms[key], value: material.uniforms[key].value, channels: material.uniforms[key].value.toArray() }])), positionOfSky: sky.position.toArray(), order: sky.renderOrder, culled: sky.frustumCulled };
  let draws = 0, lights = 0; horizon.traverse(object => { if (object.isMesh || object.isSprite) draws++; if (object.isLight) lights++; });
  const layer = dressVillageDuskSky(sky);
  assert.equal(sky.geometry, geometry); assert.equal(sky.material, material); assert.equal(geometry.parameters.radius, 600);
  assert.deepEqual(horizon.children, before.children); assert.deepEqual(Array.from(geometry.index.array), before.index);
  assert.deepEqual(Array.from(geometry.attributes.position.array), before.position); assert.deepEqual(Array.from(geometry.attributes.normal.array), before.normal); assert.deepEqual(Array.from(geometry.attributes.uv.array), before.uv);
  assert.equal(material.vertexShader, before.vertex); assert.equal(material.uniforms, before.uniforms);
  for (const [key, previous] of Object.entries(before.colours)) {
    assert.equal(material.uniforms[key], previous.uniform); assert.equal(material.uniforms[key].value, previous.value); assert.deepEqual(material.uniforms[key].value.toArray(), previous.channels);
  }
  assert.equal(material.side, THREE.BackSide); assert.equal(material.depthWrite, false); assert.equal(material.fog, false); assert.equal(material.transparent, false);
  assert.deepEqual(sky.position.toArray(), before.positionOfSky); assert.equal(sky.renderOrder, before.order); assert.equal(sky.frustumCulled, before.culled);
  let afterDraws = 0; horizon.traverse(object => { if (object.isMesh || object.isSprite) afterDraws++; }); assert.equal(afterDraws, draws); assert.equal(lights, 0);
  for (const key of ["addedMeshes", "addedDrawCalls", "addedLights", "addedTextures", "addedPasses"]) assert.equal(layer.stats[key], 0);
  layer.dispose(); releaseHorizon(horizon);
});

test("fixed clouds, sparse stars and three distant bands stay bounded in the existing fragment draw", () => {
  const mesh = skyFixture(), layer = dressVillageDuskSky(mesh), fragment = mesh.material.fragmentShader;
  assert.equal(layer.stats.cloudOctaves, 4); assert.equal(layer.stats.cloudWarpSamples, 1); assert.equal(layer.stats.cloudHashes, 20); assert.equal(layer.stats.silhouetteLayers, 3);
  assert.equal((fragment.match(/duskNoise\(/g) ?? []).length - 1, 5, "one warp and four explicit fixed samples");
  assert.equal((fragment.match(/sin\(/g) ?? []).length, 7, "three distant profiles use seven bounded harmonics");
  assert.doesNotMatch(fragment, /sampler|texture2D|texture\(|gl_FragCoord|for\s*\(/, "no texture, screen-space grain, raymarch or variable work");
  assert.match(fragment, /float star = duskHash\(starCell\)/); assert.match(fragment, /star > \.9982/); assert.match(fragment, /\(1\. - cloud\)/, "clouds hide stars");
  assert.match(fragment, /if \(y < \.08\)/, "distant profiles are restricted to the low horizon");
  assert.match(fragment, /clamp\(colour, vec3\(0\.\), vec3\(0\.68\)\)/, "new sky light remains below the existing .9 bloom threshold");
  assert.match(fragment, /uniform vec3 top, middle, horizon, low, moon/); assert.match(fragment, /varying vec3 vDir/);
  assert.match(mesh.material.customProgramCacheKey(), /village-dusk-sky-v1/);
  assert.ok(VILLAGE_DUSK_SKY.maxLinearChannel < .9);
  layer.dispose(); release(mesh);
});

test("dressing is deterministic, idempotent and preserves independently controlled authored colours", () => {
  const a = skyFixture(), b = skyFixture(), first = dressVillageDuskSky(a), second = dressVillageDuskSky(b), version = a.material.version;
  assert.equal(dressVillageDuskSky(a), first); assert.equal(a.material.version, version, "repeated setup does not trigger another program");
  assert.equal(a.material.fragmentShader, b.material.fragmentShader); assert.equal(a.material.customProgramCacheKey(), b.material.customProgramCacheKey());
  assert.notEqual(a.material.uniforms.villageDuskTime, b.material.uniforms.villageDuskTime);
  first.tick(.1); assert.equal(a.material.uniforms.villageDuskTime.value, .1); assert.equal(b.material.uniforms.villageDuskTime.value, 0);
  const uniform = a.material.uniforms.horizon; uniform.value.setHex(0x55305b);
  assert.equal(a.material.uniforms.horizon, uniform); assert.equal(a.material.uniforms.horizon.value.getHex(), 0x55305b);
  assert.equal(b.material.uniforms.horizon.value.getHex(), SKY.horizon);
  first.dispose(); second.dispose(); release(a); release(b);
});

test("pause, reduced motion and hidden-time catch-up hold and resume the same phase", () => {
  const mesh = skyFixture(), layer = dressVillageDuskSky(mesh), time = mesh.material.uniforms.villageDuskTime;
  layer.tick(.1); assert.equal(time.value, .1);
  for (let frame = 0; frame < 10; frame++) { layer.tick(.25, { paused: true }); layer.tick(.25, { reducedMotion: true }); }
  assert.equal(time.value, .1); assert.equal(layer.stats.time, .1);
  for (const invalid of [NaN, Infinity, -10, 0]) layer.tick(invalid);
  assert.equal(time.value, .1);
  layer.tick(90); assert.equal(time.value, .35, "resuming cannot skip through a long hidden interval");
  layer.tick(.05); assert.ok(Math.abs(time.value - .4) < 1e-12); assert.equal(layer.stats.time, time.value);
  layer.dispose(); const held = time.value; layer.tick(.2); assert.equal(time.value, held, "a retired layer cannot keep moving"); release(mesh);
});

test("cloud speed depends on elapsed active time and never recompiles the sky while ticking", () => {
  const a = skyFixture(), b = skyFixture(), thirty = dressVillageDuskSky(a), sixty = dressVillageDuskSky(b), version = a.material.version, fragment = a.material.fragmentShader;
  for (let i = 0; i < 30; i++) thirty.tick(1 / 30);
  for (let i = 0; i < 60; i++) sixty.tick(1 / 60);
  assert.ok(Math.abs(thirty.stats.time - sixty.stats.time) < 1e-12);
  assert.equal(a.material.version, version); assert.equal(a.material.fragmentShader, fragment);
  assert.equal(a.geometry.parameters.radius, 600);
  thirty.dispose(); sixty.dispose(); release(a); release(b);
});

test("disposal restores the exact prior shader contract without disposing the dome or its material", () => {
  const mesh = skyFixture(), material = mesh.material, original = material.fragmentShader, oldKey = () => "authored-dome", oldTime = { value: 17 }, oldData = { authored: true };
  material.customProgramCacheKey = oldKey; material.uniforms.villageDuskTime = oldTime; mesh.userData.villageDuskSky = oldData;
  let geometryDisposals = 0, materialDisposals = 0;
  mesh.geometry.addEventListener("dispose", () => geometryDisposals++); material.addEventListener("dispose", () => materialDisposals++);
  const layer = dressVillageDuskSky(mesh); assert.equal(material.customProgramCacheKey(), "authored-dome|village-dusk-sky-v1");
  layer.tick(.1); layer.dispose(); layer.dispose();
  assert.equal(material.fragmentShader, original); assert.equal(material.customProgramCacheKey, oldKey); assert.equal(material.uniforms.villageDuskTime, oldTime); assert.equal(mesh.userData.villageDuskSky, oldData);
  assert.deepEqual([geometryDisposals, materialDisposals], [0, 0]);
  const redressed = dressVillageDuskSky(mesh); assert.notEqual(redressed, layer); assert.equal(redressed.stats.time, 0); redressed.dispose(); release(mesh);
});

test("invalid targets fail before changing unrelated meshes or materials", () => {
  const ordinary = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()), material = ordinary.material;
  for (const target of [undefined, null, ordinary, new THREE.Group()]) assert.throws(() => dressVillageDuskSky(target), /existing horizon sky/);
  assert.equal(ordinary.material, material); assert.equal(ordinary.userData.villageDuskSky, undefined); release(ordinary);
});
