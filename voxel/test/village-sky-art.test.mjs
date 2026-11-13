import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createVillageSkyArtCache, attachVillageSkyArt, villageSkyTextureBytes, VILLAGE_SKY_ART } from "../src/village-sky-art.js";
import { dressVillageDuskSky } from "../src/village-dusk-sky.js";

function loaderFixture() {
  const requests = [];
  const loader = { load(url, onLoad, progress, onError) {
    const texture = new THREE.Texture(); let disposals = 0; texture.addEventListener("dispose", () => disposals++);
    const request = { url, texture, ready(width = 1024, height = 512) { texture.image = { width, height }; onLoad(texture); }, fail() { onError(new Error("missing panorama")); }, get disposals() { return disposals; } };
    requests.push(request); return texture;
  } };
  return { cache: createVillageSkyArtCache({ loader }), requests };
}
function skyFixture() {
  return new THREE.Mesh(new THREE.SphereGeometry(600, 4, 3), new THREE.ShaderMaterial({ uniforms: Object.fromEntries(["top", "middle", "horizon", "low", "moon"].map(key => [key, { value: new THREE.Vector3(.1, .05, .2) }])), vertexShader: "varying vec3 vDir; void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}", fragmentShader: "void main(){gl_FragColor=vec4(1.);}" }));
}

test("live views share one sRGB mipmapped panorama and only the last lease disposes it", () => {
  const { cache, requests } = loaderFixture(), ready = [];
  const a = cache.acquire("dusk.webp", { encodedBytes: 34878, onReady: (texture, info) => ready.push({ texture, info }) });
  const b = cache.acquire("dusk.webp", { onReady: (texture, info) => ready.push({ texture, info }) });
  assert.equal(requests.length, 1); assert.equal(cache.size, 1); assert.equal(a.status, "loading");
  requests[0].ready(); const texture = requests[0].texture;
  assert.equal(ready.length, 2); assert.equal(ready[0].texture, ready[1].texture); assert.equal(ready[0].info, ready[1].info);
  assert.deepEqual(ready[0].info, { width: 1024, height: 512, textureBytes: 2796204, encodedBytes: 34878 });
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace); assert.equal(texture.wrapS, THREE.RepeatWrapping); assert.equal(texture.wrapT, THREE.ClampToEdgeWrapping); assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter); assert.equal(texture.magFilter, THREE.LinearFilter); assert.equal(texture.generateMipmaps, true); assert.equal(texture.flipY, true); assert.equal(texture.anisotropy, 1);
  a.release(); a.release(); assert.equal(a.status, "released"); assert.equal(requests[0].disposals, 0); assert.equal(b.status, "ready");
  const c = cache.acquire("dusk.webp", { onReady: texture => ready.push({ texture }) }); assert.equal(c.status, "ready"); assert.equal(requests.length, 1); assert.equal(ready[2].texture, texture);
  b.release(); assert.equal(requests[0].disposals, 0); c.release(); c.release(); assert.equal(requests[0].disposals, 1); assert.equal(cache.size, 0);
});

test("oversized, non-panorama and missing images retain the procedural fallback and dispose their own texture", () => {
  for (const dimensions of [[2048, 1024], [512, 512], [1024, 0], [1023, 512]]) {
    const { cache, requests } = loaderFixture(); let ready = 0, errors = 0;
    const lease = cache.acquire("bad.webp", { onReady: () => ready++, onError: error => { assert.match(error.message, /2:1 panorama/); errors++; } });
    requests[0].ready(...dimensions); assert.equal(ready, 0); assert.equal(errors, 1); assert.equal(lease.status, "failed"); assert.equal(requests[0].disposals, 1);
    lease.release(); assert.equal(requests[0].disposals, 1); assert.equal(cache.size, 0);
  }
  const { cache, requests } = loaderFixture(); let errors = 0;
  const lease = cache.acquire("missing.webp", { onError: () => errors++ }); requests[0].fail(); assert.equal(errors, 1); assert.equal(lease.status, "failed"); lease.release(); assert.equal(requests[0].disposals, 1);
});

test("retired in-flight loads cannot update a replacement view or dispose its texture", () => {
  const { cache, requests } = loaderFixture(); let obsoleteReady = 0, currentReady = 0;
  const old = cache.acquire("dusk.webp", { onReady: () => obsoleteReady++ }); old.release(); assert.equal(cache.size, 0);
  const current = cache.acquire("dusk.webp", { onReady: () => currentReady++ }); assert.equal(requests.length, 2);
  requests[0].ready(); assert.equal(obsoleteReady, 0); assert.equal(currentReady, 0); assert.equal(requests[0].disposals, 1); assert.equal(cache.size, 1);
  requests[1].ready(); assert.equal(currentReady, 1); assert.equal(requests[1].disposals, 0); current.release(); assert.equal(requests[1].disposals, 1); assert.equal(requests[0].disposals, 1);
});

test("material retirement restores the sky contract and releases one shared image without destroying geometry", () => {
  const { cache, requests } = loaderFixture(), mesh = skyFixture(), original = mesh.material.fragmentShader, uniforms = { ...mesh.material.uniforms }, layer = dressVillageDuskSky(mesh);
  let geometryDisposals = 0; mesh.geometry.addEventListener("dispose", () => geometryDisposals++);
  const attachment = attachVillageSkyArt(mesh.material, layer, "dusk.webp", { resourceCache: cache, encodedBytes: 34878 });
  layer.tick(.1); requests[0].ready(); assert.equal(layer.stats.artReady, true); assert.equal(layer.stats.time, .1); assert.equal(attachment.status, "ready");
  mesh.material.dispose(); mesh.material.dispose(); attachment.release();
  assert.equal(attachment.status, "released"); assert.equal(layer.stats.artReady, false); assert.equal(requests[0].disposals, 1); assert.equal(geometryDisposals, 0);
  assert.equal(mesh.material.fragmentShader, original); assert.deepEqual(mesh.material.uniforms, uniforms); assert.equal(mesh.userData.villageDuskSky, undefined); mesh.geometry.dispose();
});

test("explicit release leaves held procedural clouds usable and blocks late ready or failure callbacks", () => {
  for (const result of ["ready", "fail"]) {
    const { cache, requests } = loaderFixture(), mesh = skyFixture(), layer = dressVillageDuskSky(mesh);
    const attachment = attachVillageSkyArt(mesh.material, layer, "dusk.webp", { resourceCache: cache }); layer.tick(.15); attachment.release();
    requests[0][result](); assert.equal(layer.stats.artReady, false); assert.equal(layer.stats.addedTextures, 0); assert.equal(layer.stats.time, .15); assert.equal(requests[0].disposals, 1);
    layer.tick(.1); assert.equal(layer.stats.time, .25); layer.dispose(); mesh.material.dispose(); mesh.geometry.dispose(); assert.equal(requests[0].disposals, 1);
  }
});

test("a loader failure keeps the attached layer active without resetting or recompiling its clock", () => {
  const { cache, requests } = loaderFixture(), mesh = skyFixture(), layer = dressVillageDuskSky(mesh), version = mesh.material.version;
  const attachment = attachVillageSkyArt(mesh.material, layer, "dusk.webp", { resourceCache: cache }); layer.tick(.15); requests[0].fail();
  assert.equal(attachment.status, "failed"); assert.equal(layer.stats.artReady, false); assert.equal(layer.stats.time, .15); assert.equal(mesh.material.version, version);
  attachment.release(); layer.dispose(); mesh.material.dispose(); mesh.geometry.dispose();
});

test("the cache enforces one live panorama, retries after release and reports exact mip storage", () => {
  const { cache, requests } = loaderFixture(); assert.equal(VILLAGE_SKY_ART.maxTextures, 1); assert.equal(VILLAGE_SKY_ART.maxLongSide, 1024);
  assert.throws(() => cache.acquire(""), /panorama URL/); const first = cache.acquire("first.webp");
  assert.throws(() => cache.acquire("second.webp"), /one shared panorama/); first.release(); requests[0].fail();
  const retry = cache.acquire("second.webp"); assert.equal(requests.length, 2); retry.release(); requests[1].ready(); assert.equal(requests[1].disposals, 1);
  assert.equal(villageSkyTextureBytes(1024, 512), 2796204); assert.equal(villageSkyTextureBytes(2, 1), 12); assert.equal(villageSkyTextureBytes(1, 1), 4);
  for (const size of [[0, 1], [NaN, 2], [2.5, 3]]) assert.throws(() => villageSkyTextureBytes(...size), /positive integers/);
});

test("synchronous loader failure and thrown loading errors still release their own allocations once", () => {
  const texture = new THREE.Texture(); let disposals = 0; texture.addEventListener("dispose", () => disposals++);
  const cache = createVillageSkyArtCache({ loader: { load(url, ready, progress, fail) { fail(new Error("synchronous missing image")); return texture; } } });
  const lease = cache.acquire("missing.webp"); assert.equal(lease.status, "failed"); lease.release(); assert.equal(disposals, 1);
  const thrown = createVillageSkyArtCache({ loader: { load() { throw new Error("loader unavailable"); } } });
  const failure = thrown.acquire("missing.webp"); assert.equal(failure.status, "failed"); failure.release(); assert.equal(thrown.size, 0);
});
