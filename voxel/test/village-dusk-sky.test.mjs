import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildHorizon, SKY } from "../src/village-world.js";
import { dressVillageDuskSky, VILLAGE_DUSK_SKY, VILLAGE_DUSK_CLOUDS, VILLAGE_DUSK_COLOURS, villageDuskCloudCoverage, villageDuskArtUv, VILLAGE_DUSK_ART, VILLAGE_SKY_HIGHLIGHTS, villageSkyHighlightScale } from "../src/village-dusk-sky.js";
import { createFollowCameraRig, followCameraPose } from "../src/follow-camera.js";
import { outsideLookLift, OUTSIDE_VIEW } from "../src/village-camera.js";

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
  assert.equal((fragment.match(/\bsin\(/g) ?? []).length, 7, "three distant profiles use seven bounded harmonics");
  assert.doesNotMatch(fragment, /gl_FragCoord|for\s*\(/, "no screen-space grain, raymarch or variable work");
  assert.equal((fragment.match(/texture2D\(/g) ?? []).length, 2, "one optional panorama and its fixed rear-seam sample");
  assert.match(fragment, /if \(villageDuskArtReady > \.5\)/, "no panorama sampling in the procedural fallback");
  assert.match(fragment, /float star = duskHash\(starCell\)/); assert.match(fragment, /star > \.9982/); assert.match(fragment, /\(1\. - cloud\)/, "clouds hide stars");
  assert.match(fragment, /if \(y < \.08\)/, "distant profiles are restricted to the low horizon");
  assert.match(fragment, /clamp\(colour, vec3\(0\.\), vec3\(0\.68\)\)/, "new sky light remains below the existing .9 bloom threshold");
  assert.match(fragment, /uniform vec3 top, middle, horizon, low, moon/); assert.match(fragment, /varying vec3 vDir/);
  assert.match(mesh.material.customProgramCacheKey(), /village-dusk-sky-v5/);
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
  const layer = dressVillageDuskSky(mesh); assert.equal(material.customProgramCacheKey(), "authored-dome|village-dusk-sky-v5");
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

test("the wide entry camera exposes the lower layered cloud banks instead of only the horizon tint", () => {
  const rig = createFollowCameraRig({ minPitch: -.3, maxPitch: 1.1 }); rig.reset({ x: 87, y: 0, z: 7.5 }, { yaw: 0, pitch: .30, distance: 13 });
  const pose = followCameraPose(rig.state), camera = new THREE.PerspectiveCamera(48, 1280 / 720, .2, 900); camera.position.set(pose.position.x, pose.position.y, pose.position.z); camera.lookAt(pose.target.x, pose.target.y + outsideLookLift(.30), pose.target.z); camera.updateMatrixWorld(true);
  const elevations = [], coverage = [];
  for (const y of [0, 20, 40, 60, 80]) for (const x of [-.75, -.4, 0, .4, .75]) {
    const ray = new THREE.Vector3(x, 1 - y / 360, .5).unproject(camera).sub(camera.position).normalize(); elevations.push(ray.y);
    // These independent density fixtures include the low .30–.49 range found
    // in the rejected actual frame, not only conveniently dense cloud noise.
    for (const noise of [.30, .36, .42, .49]) coverage.push(villageDuskCloudCoverage(ray.y, noise, noise + .03, noise - .04, noise + .06));
  }
  assert.ok(Math.min(...elevations) > .09 && Math.max(...elevations) < .20);
  assert.ok(VILLAGE_DUSK_CLOUDS.lowerElevation >= .09 && VILLAGE_DUSK_CLOUDS.upperElevation < .25);
  assert.ok(coverage.filter(value => value > .3).length / coverage.length > .6, "most exposed entry sky retains a definite bank even at the observed sparse densities");
  assert.ok(Math.max(...coverage) - Math.min(...coverage) > .35, "separate bodies and open sky retain real variation");
});

test("cloud bodies stay darker than the exposed cool-plum sky and warm rims cannot flatten their contrast", () => {
  const luminance = c => c[0] * .2126 + c[1] * .7152 + c[2] * .0722, colours = VILLAGE_DUSK_COLOURS;
  assert.ok(colours.upper[2] > colours.upper[0] * 2 && colours.upper[1] > colours.upper[0] * .65, "upper dusk is cool plum with a restrained magenta component");
  assert.ok(luminance(colours.cloudShadow) < luminance(colours.upper) * .55); assert.ok(luminance(colours.cloudBody) < luminance(colours.horizon) * .65);
  const mesh = skyFixture(), layer = dressVillageDuskSky(mesh);
  assert.match(mesh.material.fragmentShader, /colour = mix\(colour, body, cloud \* \.96\)/);
  assert.match(mesh.material.fragmentShader, /colour = mix\(colour, rim, litEdge \* \.10\)/);
  assert.doesNotMatch(mesh.material.fragmentShader, /colour \+= rim \* edge/, "rim brightness cannot cancel the body across a broad noise threshold");
  assert.match(mesh.material.fragmentShader, /smoothstep\(\.004, \.065, abs\(y \+ \.002\)\)/, "rose warmth stays in a narrow true-horizon strip"); layer.dispose(); release(mesh);
});

test("the actual entrance's exposed sky probes retain strong cloud bodies and clear gaps", () => {
  // Evenly spaced rays from the1,594 exposed-sky samples in the rejected entry
  // screenshot, with their time0 float32 noise probes. Keeping the same mask
  // avoids accidentally dropping corrected dark clouds from a colour filter.
  // Rows: direction.y, broad, billows, folds, fine. This is a CPU coverage
  // regression; normal GPU screenshots remain the visual acceptance check.
  const probes = [
    [.17336612, .19083402, .47125879, .85589116, .11427799], [.19126648, .16696950, .88865201, .58029991, .52774313],
    [.19419785, .35144012, .67786906, .77193988, .44756248], [.17530023, .43945296, .37806276, .78213255, .72735906],
    [.16582782, .23871133, .53794660, .57938061, .22206525], [.18503952, .14372517, .82320497, .38836590, .40101931],
    [.19155590, .29494963, .66595686, .27744546, .42013864], [.17499144, .45106299, .40183058, .58728100, .69567715],
    [.15736071, .30769984, .61990224, .43713167, .54683649], [.18020668, .13304998, .78466613, .30351125, .21011241],
    [.18732781, .29753028, .67614526, .35407655, .40651271], [.17064038, .45047927, .41733022, .54608865, .68351872],
    [.16145566, .20218532, .53424898, .72567791, .26314340], [.17894275, .14846809, .89077776, .23159208, .41477056],
    [.18018756, .37247379, .60842955, .96198683, .45171413], [.16176501, .43900011, .43493543, .73932603, .57689880],
    [.17474604, .14167183, .88703121, .12699153, .28888532], [.17117987, .40057339, .55058061, .21831458, .53864173],
    [.17301243, .16873350, .86733113, .67927803, .82990601], [.16020938, .10242296, .62872916, .27423522, .71667363],
    [.16347948, .38393068, .55685863, .28241159, .50087142], [.16581885, .18259474, .74201574, .72567343, .62263634],
    [.15922333, .34911479, .58162623, .96645333, .89010751], [.15002958, .34965907, .55731861, .81247641, .24052277],
  ];
  const coverage = probes.map(p => villageDuskCloudCoverage(...p)).sort((a, b) => a - b);
  assert.ok(coverage[11] > .3, "the rejected .235-height bank had a median of only .051 here");
  assert.ok(coverage.filter(value => value < .1).length >= 3, "layered clouds retain open sky instead of becoming a flat overcast sheet");
});

test("painted sky projection tiles longitude twice per world turn and keeps the entry on rich near-horizon art", () => {
  for (const [direction, expected] of [[{ x: 0, y: 0, z: -1 }, [.5, .5]], [{ x: 1, y: 0, z: 0 }, [0, .5]], [{ x: 0, y: 0, z: 1 }, [.5, .5]], [{ x: -1, y: 0, z: 0 }, [0, .5]], [{ x: 0, y: 1, z: 0 }, [.5, 1]], [{ x: 0, y: -1, z: 0 }, [.5, 0]]]) assert.deepEqual(villageDuskArtUv(direction), expected);
  for (let yaw = -Math.PI; yaw <= Math.PI; yaw += .07) for (const y of [-.8, -.1, .099, .196, .8]) {
    const horizontal = Math.sqrt(1 - y * y), direction = { x: Math.sin(yaw) * horizontal, y, z: -Math.cos(yaw) * horizontal }, uv = villageDuskArtUv(direction);
    const azimuth = (uv[0] - .5) * Math.PI * 2, elevation = (uv[1] - .5) * Math.PI;
    assert.ok(Math.abs(Math.sin(azimuth) - Math.sin(yaw * 2)) < 1e-12);
    assert.ok(Math.abs(Math.cos(azimuth) - Math.cos(yaw * 2)) < 1e-12, "world longitude tiles twice without camera-relative distortion");
    assert.ok(Math.abs(Math.sin(elevation) - y) < 1e-12, "latitude is unchanged by the longitude calibration");
    assert.deepEqual(villageDuskArtUv({ x: direction.x * 37, y: y * 37, z: direction.z * 37 }).map(v => v.toFixed(10)), uv.map(v => v.toFixed(10)), "distance cannot change the panorama");
  }
  for (const y of [.099, .196]) {
    const uv = villageDuskArtUv({ x: 0, y, z: -Math.sqrt(1 - y * y) }), imageRow = (1 - uv[1]) * 512;
    assert.ok(imageRow > 223 && imageRow < 241, "the actual exposed entrance rays sample painted billows, not an unrelated zenith strip");
  }
  const cycle = 1 / VILLAGE_DUSK_ART.driftTurnsPerSecond;
  assert.ok(Math.abs(villageDuskArtUv({ x: 0, y: .1, z: -1 }, cycle)[0] - .5) < 1e-12);
  assert.equal(VILLAGE_DUSK_ART.longitudeRepeats, 2); assert.equal(VILLAGE_DUSK_SKY.artLongitudeRepeats, 2);
  for (const angle of [-Math.PI, -Math.PI / 2, Math.PI / 2, Math.PI]) {
    const before = villageDuskArtUv({ x: Math.sin(angle - 1e-7), y: .1, z: -Math.cos(angle - 1e-7) })[0], after = villageDuskArtUv({ x: Math.sin(angle + 1e-7), y: .1, z: -Math.cos(angle + 1e-7) })[0];
    const distance = Math.abs(before - after); assert.ok(Math.min(distance, 1 - distance) < 1e-6, "both tiled seams and the original world seam close modulo one");
  }
  for (const bad of [{ x: 0, y: 0, z: 0 }, { x: NaN, y: 1, z: 0 }]) assert.throws(() => villageDuskArtUv(bad), /finite direction/);
});

test("the actual close reference camera uses twice the source columns while keeping its latitude and centre cloud composition", () => {
  const rig = createFollowCameraRig(); rig.reset({ x: 87, y: 0, z: 16.5 }, { yaw: 0, pitch: OUTSIDE_VIEW.pitch, distance: OUTSIDE_VIEW.distance });
  const pose = followCameraPose(rig.state), camera = new THREE.PerspectiveCamera(48, 1280 / 720, .2, 900); camera.position.set(pose.position.x, pose.position.y, pose.position.z); camera.lookAt(pose.target.x, pose.target.y + outsideLookLift(OUTSIDE_VIEW.pitch), pose.target.z); camera.updateMatrixWorld(true);
  const ray = (x, y) => new THREE.Vector3(x / 640 - 1, 1 - y / 360, .5).unproject(camera).sub(camera.position).normalize();
  const left = villageDuskArtUv(ray(0, 40)), right = villageDuskArtUv(ray(1280, 40)), centre = villageDuskArtUv(ray(640, 40));
  assert.ok(Math.abs(centre[0] - .5) < 1e-12, "the same painted billow stays above the gateway centre");
  const sourceColumns = (right[0] - left[0]) * 1024;
  assert.ok(sourceColumns > 417 && sourceColumns < 419, "the full 1280px frame now spans 418 source columns rather than 209");
  assert.ok(left[0] > .29 && right[0] < .71, "the entrance never encounters a tiled seam");
  const upperRow = (1 - villageDuskArtUv(ray(640, 0))[1]) * 512, lowerRow = (1 - villageDuskArtUv(ray(640, 120))[1]) * 512;
  assert.ok(upperRow > 222 && upperRow < 223 && lowerRow > 243 && lowerRow < 245, "latitude detail remains unchanged; doubling longitude cannot claim extra vertical resolution");
  const mesh = skyFixture(), layer = dressVillageDuskSky(mesh); assert.match(mesh.material.fragmentShader, /artAngle \/ 6\.28318530718 \* 2\./); layer.dispose(); release(mesh);
});

test("optional art becomes ready without recompiling, owns no borrowed texture and restores prior uniform objects exactly", () => {
  const mesh = skyFixture(), oldSampler = { value: "authored" }, oldReady = { value: .3 };
  Object.assign(mesh.material.uniforms, { villageDuskArt: oldSampler, villageDuskArtReady: oldReady });
  const layer = dressVillageDuskSky(mesh), texture = new THREE.Texture({ width: 1024, height: 512 }); let disposals = 0;
  texture.addEventListener("dispose", () => disposals++); const version = mesh.material.version;
  layer.tick(.12); const phase = layer.stats.time;
  assert.equal(layer.stats.artReady, false); assert.equal(mesh.material.uniforms.villageDuskArtReady.value, 0);
  assert.equal(layer.setArt(texture, { width: 1024, height: 512, textureBytes: 2796204, encodedBytes: 34878 }), true);
  assert.equal(mesh.material.uniforms.villageDuskArt.value, texture); assert.equal(mesh.material.uniforms.villageDuskArtReady.value, 1);
  assert.equal(layer.stats.addedTextures, 1); assert.equal(layer.stats.artReady, true); assert.equal(layer.stats.artWidth, 1024); assert.equal(layer.stats.artHeight, 512); assert.equal(layer.stats.textureBytes, 2796204); assert.equal(layer.stats.artEncodedBytes, 34878);
  layer.tick(.2, { paused: true }); layer.tick(.2, { reducedMotion: true });
  assert.equal(layer.stats.time, phase); assert.equal(mesh.material.version, version, "loading is a uniform update rather than a program change");
  assert.throws(() => layer.setArt(new THREE.Texture({ width: 2048, height: 1024 })), /1024/); assert.equal(mesh.material.uniforms.villageDuskArt.value, texture);
  layer.clearArt(); assert.equal(layer.stats.artReady, false); assert.equal(layer.stats.addedTextures, 0); assert.equal(layer.stats.time, phase); assert.equal(disposals, 0);
  layer.setArt(texture); layer.dispose(); layer.dispose(); assert.equal(disposals, 0, "only the resource lease may dispose the borrowed image");
  assert.equal(mesh.material.uniforms.villageDuskArt, oldSampler); assert.equal(mesh.material.uniforms.villageDuskArtReady, oldReady); assert.equal(layer.setArt(texture), false);
  texture.dispose(); release(mesh);
});

test("the optional panorama has bounded seamless tiled joins and one linear colour decode", () => {
  const mesh = skyFixture(), layer = dressVillageDuskSky(mesh), shader = mesh.material.fragmentShader;
  assert.equal((shader.match(/texture2D\(/g) ?? []).length, 2); assert.equal(layer.stats.artSamples, 2);
  assert.match(shader, /fract\(artU \+ \.5\)/); assert.match(shader, /min\(artU, 1\. - artU\)/); assert.match(shader, /dot\(d\.xz, d\.xz\) > \.00000001/, "poles cannot feed atan(0,0)");
  assert.doesNotMatch(shader, /pow\(painted|sRGBTransferEOTF|LinearTosRGB/, "sRGB image upload already decodes into linear light");
  // A deliberately mismatched ramp has a jump at wrap. The second sample
  // crosses its centre continuously and the first is fully masked at wrap.
  const fract = value => value - Math.floor(value), sample = u => u, smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const joined = u => { u = fract(u); const primary = smooth(Math.min(u, 1 - u) / VILLAGE_DUSK_ART.seamWidth); return sample(fract(u + .5)) * (1 - primary) + sample(u) * primary; };
  assert.ok(Math.abs(joined(-1e-6) - joined(1e-6)) < 3e-6); assert.equal(joined(.5), .5); assert.equal(joined(.25), .25);
  layer.dispose(); release(mesh);
});


test("sky highlights retain cloud colour and dark detail without a bright full-sky wash", () => {
  for (const peak of [0, .001, .018, .04, .12]) assert.equal(villageSkyHighlightScale(peak), 1);
  let previous = 0;
  for (let peak = .001; peak < 2; peak += .001) {
    const scale = villageSkyHighlightScale(peak), mapped = peak * scale;
    assert.ok(scale > 0 && scale <= 1);
    assert.ok(mapped > previous, "highlight detail is compressed, never clipped flat");
    assert.ok(mapped < VILLAGE_SKY_HIGHLIGHTS.knee + VILLAGE_SKY_HIGHLIGHTS.shoulder);
    previous = mapped;
  }
  const violet = [.31, .16, .54], scale = villageSkyHighlightScale(Math.max(...violet));
  assert.ok(Math.abs(violet[0] * scale / (violet[2] * scale) - violet[0] / violet[2]) < 1e-12);
  const horizon = actualHorizon(), halo = horizon.getObjectByName("village-moon-halo");
  assert.equal(halo.scale.x, 88); assert.equal(halo.material.opacity, .34);
  assert.equal(halo.material.blending, THREE.AdditiveBlending);
  releaseHorizon(horizon);
});
