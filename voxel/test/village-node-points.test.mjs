import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

globalThis.self ??= globalThis;
const GPU = await import("three/webgpu");
const TSL = await import("three/tsl");
const { createVillagePointsDescriptor } = await import("../src/rendering/village-node-points.js");

function points(smoke = false, count = 3) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(Array.from({ length: count * 3 }, (_, i) => i + 1), 3));
  let material;
  if (smoke) {
    geometry.setAttribute("size", new THREE.Float32BufferAttribute(Array.from({ length: count }, (_, i) => i + .6), 1));
    geometry.setAttribute("alpha", new THREE.Float32BufferAttribute(Array.from({ length: count }, (_, i) => .2 + i * .1), 1));
    material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { tint: { value: new THREE.Color(0x9a90b8) } },
      vertexShader: "attribute float size; attribute float alpha; varying float vA; void main() { vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = size * 320. / -mv.z; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform vec3 tint; varying float vA; void main() { float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(tint, vA * (1. - d * 2.) * (1. - d * 2.)); }",
    });
  } else material = new THREE.PointsMaterial({ color: new THREE.Color(1.6, 1.9, .9), size: .16, transparent: true, opacity: .9, depthWrite: false, toneMapped: false });
  return new THREE.Points(geometry, material);
}
function compile(descriptor, withFog = false) {
  const renderer = new GPU.WebGPURenderer({ canvas: { width: 1, height: 1, style: {}, addEventListener() {}, removeEventListener() {} } });
  renderer.hasFeature = () => false;
  const builder = renderer.backend.createNodeBuilder(new GPU.Mesh(descriptor.geometry, descriptor.material), renderer);
  builder.camera = new GPU.PerspectiveCamera(); builder.scene = new GPU.Scene();
  if (withFog) builder.fogNode = TSL.fog(TSL.color(0x556677), TSL.positionView.z.negate().div(100).clamp(0, 1));
  builder.build();
  return builder;
}
const uniformValues = builder => [...builder.uniforms.vertex, ...builder.uniforms.fragment].map(uniform => uniform.node.value);

test("known point families become one four-vertex instanced draw without mutating or borrowing owned attributes", () => {
  for (const smoke of [true, false]) {
    const source = points(smoke), before = source.geometry.toJSON(), originalMaterial = source.material;
    let bound;
    const d = createVillagePointsDescriptor(source, ref => { bound = ref; return TSL.uniform(ref.value); });
    assert.equal(d.kind, "instanced-quads"); assert.equal(d.count, 3);
    assert.equal(d.geometry.instanceCount, 3); assert.equal(d.geometry.attributes.position.count, 4); assert.equal(d.geometry.index.count, 6);
    assert.ok(d.geometry.isInstancedBufferGeometry); assert.ok(d.geometry.attributes.pointPosition.isInstancedBufferAttribute);
    assert.deepEqual(Array.from(d.geometry.attributes.pointPosition.array), Array.from(source.geometry.attributes.position.array));
    assert.notEqual(d.geometry.attributes.pointPosition.array, source.geometry.attributes.position.array);
    assert.equal(source.material, originalMaterial); assert.deepEqual(source.geometry.toJSON(), before);
    assert.equal(d.material.depthWrite, false); assert.equal(d.material.transparent, true); assert.equal(d.material.fog, source.material.fog);
    assert.equal(d.material.userData.villageNodePoints.rawOutput, smoke);
    if (smoke) assert.equal(bound, source.material.uniforms.tint);
    let sourceDisposals = 0; source.geometry.addEventListener("dispose", () => sourceDisposals++); source.material.addEventListener("dispose", () => sourceDisposals++);
    d.geometry.dispose(); d.material.dispose(); assert.equal(sourceDisposals, 0);
  }
});

test("sync follows attribute versions, replacements, indexed draw ranges and bounded point counts", () => {
  const source = points(true), d = createVillagePointsDescriptor(source), mirror = {};
  const original = d.geometry.attributes.pointPosition;
  d.sync(mirror); assert.equal(original.version, 1, "unchanged buffers are not uploaded again");
  source.geometry.attributes.position.setX(1, 77); source.geometry.attributes.position.needsUpdate = true;
  source.geometry.attributes.alpha.setX(1, .8); source.geometry.attributes.alpha.needsUpdate = true;
  d.sync(mirror); assert.equal(d.geometry.attributes.pointPosition.getX(1), 77); assert.ok(Math.abs(d.geometry.attributes.pointAlpha.getX(1) - .8) < 1e-6);
  source.geometry.setIndex([2, 0, 1]); source.geometry.setDrawRange(1, 1); d.sync(mirror);
  assert.equal(d.count, 1); assert.equal(mirror.count, 1); assert.equal(d.geometry.instanceCount, 1);
  assert.deepEqual(Array.from(d.geometry.attributes.pointPosition.array), [1, 2, 3]);
  source.geometry.setIndex(null); source.geometry.setAttribute("position", new THREE.Float32BufferAttribute([8, 9, 10, 11, 12, 13], 3));
  source.geometry.setDrawRange(0, Infinity); d.sync(mirror); assert.equal(d.count, 2);
  assert.deepEqual(Array.from(d.geometry.attributes.pointPosition.array), [8, 9, 10, 11, 12, 13]);
  source.geometry.setDrawRange(9, Infinity); d.sync(mirror); assert.equal(d.count, 0); assert.equal(d.geometry.instanceCount, 0);
});

test("both node graphs generate WGSL with exact pixel expansion, original smoke falloff and square fireflies", () => {
  const smoke = compile(createVillagePointsDescriptor(points(true)));
  assert.match(smoke.vertexShader, /320\.0/); assert.match(smoke.vertexShader, /pointSize/);
  assert.match(smoke.vertexShader, /positionLocal = pointPosition/);
  assert.match(smoke.vertexShader, /cameraProjectionMatrix/); assert.match(smoke.vertexShader, /nodeVar\d+\.w/);
  assert.match(smoke.fragmentShader, /discard/); assert.match(smoke.fragmentShader, /length/); assert.match(smoke.vertexShader, /pointAlpha/);
  const flies = compile(createVillagePointsDescriptor(points()));
  assert.doesNotMatch(flies.fragmentShader, /discard|length\(/);
  assert.match(flies.vertexShader, /== -1\.0/, "orthographic cameras bypass size attenuation");
  assert.equal(flies.attributes.filter(a => a.name === "pointPosition").length, 1);
  assert.doesNotMatch(flies.vertexShader + flies.fragmentShader, /textureSample|sampler/);
  const fogged = compile(createVillagePointsDescriptor(points()), true);
  assert.match(fogged.vertexShader, /v_positionView/);
  assert.ok(fogged.vertexShader.indexOf("positionLocal = pointPosition") < fogged.vertexShader.lastIndexOf("v_positionView ="), "final fog varying follows the centre assignment");
  assert.match(fogged.vertexShader, /varyings\.v_positionView = nodeVar\d+\.xyz/, "view varying is explicitly replaced with the transformed particle centre");
});

test("viewport, live material size, opacity and HDR colour track renderer DPR without doubling CSS scale", () => {
  const source = points(); let ratio = 2, width = 2560, height = 1440;
  const renderer = { getDrawingBufferSize(out) { return out.set(width, height); }, getPixelRatio() { return ratio; } };
  const d = createVillagePointsDescriptor(source, null, { renderer });
  let values = uniformValues(compile(d));
  assert.ok(values.some(v => v?.isVector2 && v.x === 2560 && v.y === 1440));
  assert.ok(values.includes(.32)); assert.ok(values.includes(360));
  assert.ok(values.some(v => v?.isColor && v.r === 1.6 && v.g === 1.9 && v.b === .9));
  source.material.size = .24; source.material.opacity = .43; source.material.color.setRGB(2, 1, .5);
  ratio = 1; width = 1280; height = 720; d.sync(); values = uniformValues(compile(d));
  assert.ok(values.includes(.24)); assert.ok(values.includes(.43)); assert.ok(values.includes(360));
  assert.ok(values.some(v => v?.isColor && v.r === 2 && v.g === 1 && v.b === .5));
});

test("unknown or unsupported point shaders stay explicit rather than losing their effects", () => {
  const source = points(true); source.material.vertexShader = "void main() { gl_Position=vec4(0.); }";
  assert.equal(createVillagePointsDescriptor(source), null);
  const mapped = points(); mapped.material.map = new THREE.Texture(); assert.equal(createVillagePointsDescriptor(mapped), null);
  assert.equal(createVillagePointsDescriptor(new THREE.Mesh()), null);
});
