import test from "node:test";
import fs from "node:fs";
import assert from "node:assert/strict";
import * as GL from "three";
import { Voxels } from "../src/voxels.js";
import { finishVoxels, setLampNear } from "../src/voxel-finish.js";
import { createVillageWaterMaterial, createVillageWaterClock } from "../src/village-water-material.js";
import { createGrass } from "../src/village-grass.js";
import { buildVillageNeighbourhoods } from "../src/village-neighbourhoods.js";
import { installVillageNeighbourhoodVisibility } from "../src/village-neighbourhood-visibility.js";
import { crispen } from "../src/crisp-sprites.js";
import { addSpriteRim, addMoonRim } from "../src/sprite-rim.js";
import { applyVoxelPbrAtlas, acquireVoxelPbrAtlas } from "../src/rendering/voxel-pbr-atlas.js";
import { installVoxelAmbientOcclusion } from "../src/rendering/voxel-ao-material.js";
globalThis.self ??= globalThis;
const GPU = await import("three/webgpu");
const { createVillageNodeMaterials, UnsupportedVillageMaterial } = await import("../src/rendering/village-node-materials.js");
function harness() {
  const renderer = new GPU.WebGPURenderer({ canvas: { width: 1280, height: 720 } });
  renderer.hasFeature = () => false;
  return { renderer, bridge: createVillageNodeMaterials({ renderer }) };
}
function generate(h, source) {
  const material = h.bridge.convert(source.material, source), object = source.isInstancedMesh ? new GPU.InstancedMesh(source.geometry, material, source.instanceMatrix.count) : new GPU.Mesh(source.geometry, material);
  if (source.isInstancedMesh) {
    object.count = source.count;
    object.instanceMatrix = source.instanceMatrix;
    object.instanceColor = source.instanceColor;
  }
  const builder = h.renderer.backend.createNodeBuilder(object, h.renderer);
  builder.camera = new GPU.PerspectiveCamera(48, 16 / 9, 0.1, 1e3);
  builder.scene = new GPU.Scene();
  builder.lightsNode = GPU.lights([new GPU.PointLight(16759722, 20, 10)]);
  builder.build();
  assert.match(builder.vertexShader, /@vertex/);
  assert.match(builder.fragmentShader, /@fragment/);
  assert.doesNotMatch(builder.vertexShader + builder.fragmentShader, /#include|gl_FragColor|gl_Position/);
  if (process.env.VILLAGE_NODE_DUMP) {
    fs.mkdirSync(process.env.VILLAGE_NODE_DUMP, { recursive: true });
    const stem = source.material.uuid;
    fs.writeFileSync(`${process.env.VILLAGE_NODE_DUMP}/${stem}.vertex.wgsl`, builder.vertexShader);
    fs.writeFileSync(`${process.env.VILLAGE_NODE_DUMP}/${stem}.fragment.wgsl`, builder.fragmentShader);
  }
  return { material, builder, vertex: builder.vertexShader, fragment: builder.fragmentShader };
}
function boxes() {
  const v = new Voxels();
  v.block(0, 0, 0, 3, 2, 2, 11183259);
  v.block(3, 0, 0, 2, 3, 2, 7491642);
  v.block(0, 1, 1, 1, 1, 0.1, 16763018, true);
  const group = v.build();
  finishVoxels(group);
  return group;
}
function disposeGroup(group) {
  const mats = /* @__PURE__ */ new Set();
  group.traverse((o) => {
    for (const m of [].concat(o.material ?? [])) mats.add(m);
    if (o.isInstancedMesh) o.dispose();
  });
  for (const m of mats) m.dispose();
}
test("finished lit/glass boxes generate WGSL without losing instancing, tone, filtered mortar or lamp clamp", () => {
  const h = harness(), group = boxes();
  try {
    for (const source of group.children) {
      const out = generate(h, source);
      assert.match(out.fragment, /villageFinish/);
      assert.match(out.fragment, /villageFinHash/);
      assert.match(out.fragment, /fwidth/);
      if (source.material.isMeshStandardMaterial) {
        assert.equal(out.material.userData.villageFinished, true);
        assert.match(out.fragment, /max\([^\n]*nodeUniform/, "near lamp clamp is present");
      }
    }
    assert.equal(h.bridge.stats.roles.finish, 2);
    assert.equal(h.bridge.stats.derivedInstanceBytes, 36);
  } finally {
    h.bridge.dispose();
    disposeGroup(group);
  }
});
test("real grass deforms before a single instance placement and keeps player/camera and distance fades", () => {
  const h = harness(), grass = createGrass({ x0: 0, z0: 0, x1: 20, z1: 20, density: 0.04, height: () => 0, grow: () => ({ h: 0.6, colours: [5274687], flowers: false }) });
  try {
    assert.ok(grass.group.children.length);
    const source = grass.group.children[0], out = generate(h, source);
    assert.match(out.vertex, /villageGrassDeform/);
    for (const threshold of [28, 52, 65, 78, 105]) assert.match(out.vertex, new RegExp(`\\b${threshold}\\.0\\b`), "GPU grass uses each shared distance band");
    assert.ok(source.geometry.getAttribute("bladeDetail"), "GPU grass receives authored per-blade detail ranks");
    assert.match(out.fragment, /villageAlphaHash/);
    assert.match(out.fragment, /discard/);
    const body = out.vertex.slice(out.vertex.indexOf("@vertex"));
    assert.ok(body.indexOf("villageGrassDeform(") < body.indexOf("nodeUniform", body.indexOf("villageGrassDeform(")) || body.includes("instance"));
    grass.tick(12, new GL.PerspectiveCamera(), new GL.Vector3());
    h.bridge.sync();
    assert.equal(h.bridge.stats.roles.grass, 1);
  } finally {
    h.bridge.dispose();
    disposeGroup(grass.group);
    for (const g of new Set(grass.group.children.map((m) => m.geometry))) g.dispose();
  }
});
test("water has native ripple normals and a source clock that freezes/resumes without recompilation", () => {
  const h = harness(), clock = createVillageWaterClock(), source = new GL.Mesh(new GL.PlaneGeometry(4, 4), createVillageWaterMaterial({ clock }));
  try {
    const out = generate(h, source);
    assert.match(out.fragment, /villageWaterNormal/);
    assert.match(out.fragment, /cos\(/);
    const version = out.material.version;
    clock.tick(0.1);
    h.bridge.sync();
    assert.equal(clock.uniform.value, 0.1);
    clock.tick(0.2, { reducedMotion: true });
    h.bridge.sync();
    assert.equal(clock.uniform.value, 0.1);
    assert.equal(out.material.version, version);
  } finally {
    h.bridge.dispose();
    source.geometry.dispose();
    source.material.dispose();
  }
});
test("native blocker ids use bounded opacity-array discard while full physical shadows remain separate", () => {
  const h = harness(), group = buildVillageNeighbourhoods([{ id: "gpu-trees", kind: "orchard", x: 0, z: 0, w: 20, d: 10, props: false, trees: [{ x: 0, z: 0, size: 1 }, { x: 12, z: 0, size: 1 }] }]);
  finishVoxels(group);
  installVillageNeighbourhoodVisibility(group);
  try {
    let source;
    group.traverse((m) => {
      if (!source && m.geometry?.hasAttribute("neighbourhoodBlocker")) source = m;
    });
    assert.ok(source);
    const out = generate(h, source);
    assert.match(out.vertex, /neighbourhoodBlocker/);
    assert.match(out.fragment, /villageAlphaHash/);
    assert.equal(out.material.shadowNode, null);
    assert.equal(source.material.alphaHash, true);
  } finally {
    h.bridge.dispose();
    group.userData.dispose?.();
    disposeGroup(group);
  }
});
test("crisp painted cast retain bias, warm rims and alpha-tested node shadows", () => {
  const h = harness(), texture = new GL.DataTexture(new Uint8Array([255, 200, 150, 255]), 1, 1), source = new GL.Mesh(new GL.PlaneGeometry(), crispen(new GL.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: 16777215, emissiveIntensity: 0.16, alphaTest: 0.42, side: GL.DoubleSide })));
  addSpriteRim(source.material, 1024, 512);
  const group = new GL.Group();
  group.add(source);
  addMoonRim(group);
  try {
    const out = generate(h, source);
    assert.match(out.fragment, /textureSampleBias/);
    assert.ok(out.material.shadowNode);
    assert.equal(h.bridge.stats.roles["sprite-rim"], 1);
    assert.equal(h.bridge.stats.roles["moon-rim"], undefined, "expanded legacy emissive hook has no moon outline");
    source.material.emissiveIntensity = 0.4;
    h.bridge.sync();
    assert.equal(out.material.emissiveIntensity, 0.4);
  } finally {
    h.bridge.dispose();
    texture.dispose();
    source.geometry.dispose();
    source.material.dispose();
  }
});
test("owner walking atlases update every sprite node binding without rebuilding the material", () => {
  const h = harness(), idle = new GL.DataTexture(new Uint8Array([255, 200, 150, 255]), 1, 1), walk = new GL.DataTexture(new Uint8Array([180, 90, 60, 255]), 1, 1);
  idle.name = "Natalie idle"; walk.name = "Natalie eight-direction walk";
  idle.needsUpdate = walk.needsUpdate = true;
  const source = new GL.Mesh(new GL.PlaneGeometry(), crispen(new GL.MeshStandardMaterial({ map: idle, emissiveMap: idle, emissive: 0xffffff, alphaTest: .5 })));
  addSpriteRim(source.material, 1024, 512);
  const group = new GL.Group(); group.add(source); addMoonRim(group);
  try {
    const out = generate(h, source), version = out.material.version;
    const sampled = out.builder.nodes.filter(node => node.isTextureNode && node.value.image === idle.image);
    assert.ok(sampled.length >= 6, "colour, emissive and emitted edge treatments sample the owner's atlas");
    const idleWrapper = out.material.map;
    for (const atlas of [walk, idle, walk, idle]) {
      // The shared GL actor swaps maps as its authored facing/action changes.
      source.material.map = source.material.emissiveMap = atlas;
      h.bridge.sync();
      assert.equal(h.bridge.convert(source.material, source), out.material);
      assert.equal(out.material.version, version, "walking never rebuilds a shader");
      assert.equal(out.material.map.image, atlas.image);
      for (const node of sampled) assert.equal(node.value.image, atlas.image, "compiled sprite samplers must follow the displayed frame's atlas");
    }
    assert.equal(out.material.map, idleWrapper, "returning to idle reuses its owned texture wrapper");
    assert.equal(h.bridge.stats.converted, 1);
  } finally {
    h.bridge.dispose(); idle.dispose(); walk.dispose(); source.geometry.dispose(); source.material.dispose();
  }
});
test("moon rims match the emitted legacy shader after sprite hooks compose", () => {
  for (const crisp of [false, true]) {
    const h = harness(), texture = new GL.DataTexture(new Uint8Array([140, 90, 50, 255]), 1, 1);
    const material = new GL.MeshStandardMaterial({ map: texture, emissiveMap: texture, alphaTest: .5 });
    const source = new GL.Mesh(new GL.PlaneGeometry(), crisp ? crispen(material) : material);
    addMoonRim(source);
    const shader = { uniforms: {}, vertexShader: GL.ShaderLib.standard.vertexShader, fragmentShader: GL.ShaderLib.standard.fragmentShader };
    material.onBeforeCompile(shader, h.renderer);
    const emitted = shader.fragmentShader.includes("totalEmissiveRadiance += rimColour * rimStrength");
    // crispen expands the emissive include before the optional rim hook runs.
    assert.equal(emitted, !crisp);
    try {
      generate(h, source);
      assert.equal(!!h.bridge.stats.roles["moon-rim"], emitted, "metadata alone cannot enable a rim absent from the legacy picture");
    } finally { h.bridge.dispose(); texture.dispose(); source.geometry.dispose(); material.dispose(); }
  }
});
test("packed corner AO and real PBR atlas compose with finish without changing source material/geometry ownership", () => {
  const h = harness(), group = boxes(), lease = acquireVoxelPbrAtlas();
  installVoxelAmbientOcclusion(group);
  const source = group.children.find((m) => m.material.isMeshStandardMaterial);
  applyVoxelPbrAtlas(source.material, lease);
  const original = source.material, geometry = source.geometry;
  try {
    const out = generate(h, source);
    assert.match(out.vertex, /villageAoCorner/);
    assert.match(out.vertex, /villagePbrClassify/);
    assert.match(out.fragment, /textureSampleGrad/);
    assert.match(out.fragment, /villagePbrTangentNormal/);
    assert.ok(out.material.aoNode);
    assert.ok(out.material.normalNode);
    assert.equal(source.material, original);
    assert.equal(source.geometry, geometry);
    let disposed = 0;
    lease.albedo.addEventListener("dispose", () => disposed++);
    h.bridge.dispose();
    assert.equal(disposed, 0);
  } finally {
    h.bridge.dispose();
    group.userData.dispose?.();
    lease.release();
    disposeGroup(group);
  }
});
test("registry caches per source object, refuses unknown hooks/shaders and disposes only owned node materials", () => {
  const h = harness(), group = boxes(), source = group.children[0], original = source.material;
  try {
    const a = h.bridge.convert(original, source);
    assert.equal(h.bridge.convert(original, source), a);
    const other = new GL.Mesh(new GL.PlaneGeometry(), new GL.MeshBasicMaterial());
    other.material.onBeforeCompile = (shader) => {
      shader.fragmentShader += "unported";
    };
    assert.throws(() => h.bridge.convert(other.material, other), UnsupportedVillageMaterial);
    const unknown = new GL.ShaderMaterial();
    assert.throws(() => h.bridge.convert(unknown, source), /unknown custom shader/);
    let owned = 0, borrowed = 0;
    a.addEventListener("dispose", () => owned++);
    original.addEventListener("dispose", () => borrowed++);
    h.bridge.dispose();
    h.bridge.dispose();
    assert.equal(owned, 1);
    assert.equal(borrowed, 0);
    other.geometry.dispose();
    other.material.dispose();
    unknown.dispose();
  } finally {
    h.bridge.dispose();
    disposeGroup(group);
    setLampNear(0);
  }
});
test("same-layout directional geometries reuse variants while version changes retire owned materials once", () => {
  const h = harness(), source = new GL.Mesh(new GL.PlaneGeometry(), new GL.MeshStandardMaterial()), geometries = /* @__PURE__ */ new Set([source.geometry]);
  const original = h.bridge.convert(source.material, source);
  let retired = 0;
  original.addEventListener("dispose", () => retired++);
  try {
    for (let i = 0; i < 24; i++) {
      source.geometry = new GL.PlaneGeometry(1 + i / 100, 2);
      geometries.add(source.geometry);
      assert.equal(h.bridge.convert(source.material, source), original);
    }
    source.material.needsUpdate = true;
    const replacement = h.bridge.convert(source.material, source);
    assert.notEqual(replacement, original);
    assert.equal(retired, 1);
    assert.equal(h.bridge.stats.converted, 2);
    h.bridge.sync();
    h.bridge.dispose();
    assert.equal(retired, 1);
  } finally {
    h.bridge.dispose();
    for (const geometry of geometries) geometry.dispose();
    source.material.dispose();
  }
});

test("per-mesh atlas bindings share one texture inspection per sync without freezing live swaps", () => {
  const h = harness(), geometry = new GL.BoxGeometry(), sources = [], targets = [];
  function atlas(value) {
    let reads = 0, pixels = { data: new Uint8Array([value, value, value, 255]), width: 1, height: 1 };
    const texture = new GL.DataTexture(pixels.data, 1, 1); texture.needsUpdate = true;
    Object.defineProperty(texture, "image", { get() { reads++; return pixels; }, set(image) { pixels = image; } });
    return { texture, get reads() { return reads; }, reset() { reads = 0; } };
  }
  const first = atlas(80), next = atlas(160);
  try {
    for (let i = 0; i < 64; i++) {
      const source = new GL.MeshStandardMaterial({ map: i === 0 ? next.texture : first.texture, emissiveMap: first.texture });
      sources.push(source); targets.push(h.bridge.convert(source, new GL.Mesh(geometry, source)));
    }
    first.reset(); next.reset(); h.bridge.sync();
    assert.equal(first.reads, 1, "a shared atlas is inspected once, not once per material slot");
    assert.equal(next.reads, 1);
    const variants = h.bridge.stats.converted, versions = targets.map(target => target.version), oldMap = targets[1].map;
    for (const source of sources) { source.map = next.texture; source.emissiveMap = next.texture; }
    next.texture.offset.set(.25, .5); next.texture.minFilter = GL.LinearFilter; next.texture.colorSpace = GL.SRGBColorSpace;
    first.reset(); next.reset(); h.bridge.sync();
    assert.equal(first.reads, 1); assert.equal(next.reads, 1);
    assert.ok(targets.every(target => target.map === targets[0].map && target.emissiveMap === targets[0].map));
    assert.notEqual(targets[1].map, oldMap); assert.deepEqual(targets[1].map.offset.toArray(), [.25, .5]);
    assert.equal(targets[1].map.colorSpace, GL.SRGBColorSpace); assert.equal(targets[1].map.minFilter, GL.LinearFilter);
    assert.equal(h.bridge.stats.converted, variants); assert.deepEqual(targets.map(target => target.version), versions);
    assert.equal(h.bridge.stats.textureWrappers, 2);
  } finally {
    h.bridge.dispose(); geometry.dispose(); sources.forEach(source => source.dispose()); first.texture.dispose(); next.texture.dispose();
  }
});
