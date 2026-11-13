import test from "node:test";
import assert from "node:assert/strict";
import * as GL from "three";
globalThis.self ??= globalThis;
const { createVillageNodeTextures } = await import("../src/rendering/village-node-textures.js");
test("GPU texture wrappers own separate Texture/Source identities while borrowing decoded pixel storage", () => {
  const source = new GL.DataTexture(new Uint8Array([90, 110, 140, 255]), 1, 1);
  source.colorSpace = GL.SRGBColorSpace;
  source.wrapS = GL.RepeatWrapping;
  source.generateMipmaps = true;
  source.needsUpdate = true;
  const bridge = createVillageNodeTextures(), wrapper = bridge.resolve(source);
  assert.notEqual(wrapper, source);
  assert.notEqual(wrapper.source, source.source);
  assert.equal(wrapper.image, source.image);
  assert.equal(wrapper.image.data, source.image.data);
  assert.equal(wrapper.isDataTexture, true);
  assert.equal(wrapper.colorSpace, source.colorSpace);
  assert.equal(wrapper.wrapS, source.wrapS);
  assert.equal(wrapper.generateMipmaps, true);
  assert.equal(bridge.resolve(source), wrapper);
  let own = 0, borrowed = 0;
  wrapper.addEventListener("dispose", () => own++);
  source.addEventListener("dispose", () => borrowed++);
  bridge.dispose();
  bridge.dispose();
  assert.equal(own, 1);
  assert.equal(borrowed, 0);
  source.dispose();
});
test("source upload changes and UV transforms synchronize without uploading unchanged textures each frame", () => {
  const source = new GL.Texture({ width: 4, height: 2 }), bridge = createVillageNodeTextures(), wrapper = bridge.resolve(source), version = wrapper.version;
  bridge.sync();
  assert.equal(wrapper.version, version);
  source.offset.set(0.2, 0.3);
  source.repeat.set(2, 3);
  source.rotation = 0.2;
  source.updateMatrix();
  bridge.sync();
  assert.deepEqual(wrapper.offset.toArray(), [0.2, 0.3]);
  assert.deepEqual(wrapper.repeat.toArray(), [2, 3]);
  assert.deepEqual(wrapper.matrix.toArray(), source.matrix.toArray());
  assert.equal(wrapper.version, version, "UV uniforms do not reupload decoded pixels");
  source.image = { width: 8, height: 4 };
  source.needsUpdate = true;
  bridge.sync();
  assert.equal(wrapper.image, source.image);
  assert.ok(wrapper.version > version);
  const uploaded = wrapper.version;
  bridge.sync();
  assert.equal(wrapper.version, uploaded);
  source.minFilter = GL.LinearFilter;
  bridge.sync();
  assert.ok(wrapper.version > uploaded);
  bridge.dispose();
  source.dispose();
});
test("empty samplers remain empty and unknown compressed formats fail explicitly", () => {
  const bridge = createVillageNodeTextures();
  assert.equal(bridge.resolve(null), null);
  assert.throws(() => bridge.resolve({}), /source Texture/);
  const source = new GL.CompressedTexture([], 4, 4);
  assert.throws(() => bridge.resolve(source), /explicit format port/);
  bridge.dispose();
  assert.throws(() => bridge.resolve(new GL.Texture()), /disposed/);
  source.dispose();
});

test("pending source textures keep version zero until decoded data is marked ready", () => {
  const source = new GL.Texture(), bridge = createVillageNodeTextures(), wrapper = bridge.resolve(source);
  assert.equal(source.version, 0); assert.equal(wrapper.version, 0);
  bridge.sync(); assert.equal(wrapper.version, 0);
  assert.equal(wrapper.userData.villageTextureSource.ready, false);
  source.image = { width: 32, height: 16, complete: true }; source.needsUpdate = true;
  bridge.sync(); assert.equal(wrapper.version, 1); assert.equal(wrapper.image, source.image);
  assert.deepEqual(wrapper.userData.villageTextureSource, { uuid: source.uuid, name: source.name, type: "Texture", sourceVersion: 1, width: 32, height: 16, ready: true });
  bridge.dispose(); source.dispose();
});

test("pending image replacements preserve the last valid GPU image and reject invalid decoded sizes by name", () => {
  const first = { width: 32, height: 16, complete: true }, source = new GL.Texture(first); source.name = "resident-sheet"; source.needsUpdate = true;
  const bridge = createVillageNodeTextures(), wrapper = bridge.resolve(source), version = wrapper.version;
  source.image = { width: 0, height: 0, complete: false }; source.needsUpdate = true;
  bridge.sync(); assert.equal(wrapper.image, first); assert.equal(wrapper.version, version);
  source.image = { width: 64, height: 32, complete: true }; source.needsUpdate = true;
  bridge.sync(); assert.equal(wrapper.image, source.image); assert.ok(wrapper.version > version);
  source.image = {}; source.needsUpdate = true;
  assert.throws(() => bridge.sync(), /resident-sheet.*invalid decoded dimensions undefinedxundefined/);
  bridge.dispose(); source.dispose();
});

test("shared atlas batches inspect each wrapper once and preserve live changes between submissions", () => {
  const source = new GL.DataTexture(new Uint8Array(16), 2, 2); source.needsUpdate = true;
  const bridge = createVillageNodeTextures(), wrapper = bridge.resolve(source), status = wrapper.userData.villageTextureSource;
  let scans = bridge.stats.synchronizations, uploads = bridge.stats.uploads;
  bridge.batch(() => {
    for (let i = 0; i < 240; i++) assert.equal(bridge.resolve(source), wrapper);
    bridge.batch(() => bridge.resolve(source)); bridge.sync();
  });
  assert.equal(bridge.stats.synchronizations - scans, 1, "all users and the final sweep share one inspection");
  assert.equal(bridge.stats.uploads, uploads, "unchanged bindings never upload their pixels again");
  source.offset.set(.3, .2); source.repeat.set(4, 2); source.center.set(.5, .5); source.rotation = .4; source.updateMatrix();
  source.colorSpace = GL.SRGBColorSpace; source.minFilter = GL.LinearFilter; source.magFilter = GL.NearestFilter;
  source.wrapS = GL.RepeatWrapping; source.wrapT = GL.MirroredRepeatWrapping; source.anisotropy = 2; source.flipY = true;
  scans = bridge.stats.synchronizations;
  bridge.batch(() => { bridge.resolve(source); bridge.sync(); });
  assert.equal(bridge.stats.synchronizations - scans, 1);
  assert.deepEqual(wrapper.offset.toArray(), source.offset.toArray()); assert.deepEqual(wrapper.repeat.toArray(), source.repeat.toArray());
  assert.deepEqual(wrapper.center.toArray(), source.center.toArray()); assert.deepEqual(wrapper.matrix.toArray(), source.matrix.toArray());
  for (const key of ["rotation", "colorSpace", "minFilter", "magFilter", "wrapS", "wrapT", "anisotropy", "flipY"]) assert.equal(wrapper[key], source[key], key);
  assert.equal(bridge.stats.uploads, uploads + 1, "unversioned sampler changes combine into one upload");
  assert.equal(wrapper.userData.villageTextureSource, status, "diagnostic identity is retained");
  source.image = { data: new Uint8Array(64), width: 4, height: 4 }; source.needsUpdate = true;
  bridge.batch(() => { bridge.resolve(source); bridge.sync(); });
  assert.equal(wrapper.image, source.image); assert.equal(status.width, 4); assert.equal(status.sourceVersion, source.version);
  bridge.dispose(); source.dispose();
});

test("new pending leases participate in a batch and decode on the following submission", () => {
  const bridge = createVillageNodeTextures(), first = new GL.Texture(), next = new GL.Texture();
  let a, b;
  bridge.batch(() => { a = bridge.resolve(first); b = bridge.resolve(next); bridge.resolve(first); bridge.resolve(next); bridge.sync(); });
  assert.equal(bridge.stats.synchronizations, 2); assert.equal(bridge.stats.wrappers, 2);
  assert.equal(a.version, 0); assert.equal(b.version, 0);
  next.image = { width: 8, height: 16, complete: true }; next.needsUpdate = true;
  bridge.batch(() => { bridge.resolve(next); bridge.resolve(first); bridge.sync(); });
  assert.equal(bridge.stats.synchronizations, 4); assert.equal(a.version, 0); assert.equal(b.version, 1);
  assert.equal(b.image, next.image); assert.equal(b.userData.villageTextureSource.ready, true);
  bridge.dispose(); first.dispose(); next.dispose();
});

test("failed batches release their snapshot and disposal never touches borrowed textures", () => {
  const source = new GL.Texture({ width: 4, height: 4 }); source.needsUpdate = true;
  const bridge = createVillageNodeTextures(), wrapper = bridge.resolve(source); let sourceDisposed = 0, wrapperDisposed = 0;
  source.addEventListener("dispose", () => sourceDisposed++); wrapper.addEventListener("dispose", () => wrapperDisposed++);
  assert.throws(() => bridge.batch(() => { bridge.resolve(source); throw Error("interrupted material conversion"); }), /interrupted/);
  source.offset.set(.7, .8); bridge.resolve(source);
  assert.deepEqual(wrapper.offset.toArray(), [.7, .8], "standalone resolve is immediate after an error");
  source.image = {}; source.needsUpdate = true;
  assert.throws(() => bridge.batch(() => bridge.resolve(source)), /invalid decoded dimensions/);
  source.image = { width: 16, height: 8 }; source.needsUpdate = true;
  bridge.batch(() => { bridge.resolve(source); bridge.sync(); }); assert.equal(wrapper.image, source.image);
  bridge.dispose(); bridge.dispose(); assert.equal(wrapperDisposed, 1); assert.equal(sourceDisposed, 0);
  assert.throws(() => bridge.batch(() => {}), /disposed/); source.dispose();
});
