import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { VOXEL_PBR, buildVoxelPbrAtlasData, classifyVoxelSurface, voxelSurfaceHeight, voxelPbrAtlasBytes, voxelPbrFace, voxelPbrUv } from "../src/rendering/voxel-pbr-data.js";
import { acquireVoxelPbrAtlas, applyVoxelPbrAtlas, getVoxelPbrDescriptor, installVillagePbr } from "../src/rendering/voxel-pbr-atlas.js";

const data = buildVoxelPbrAtlasData();
const at = (map, x, y, level = 0) => [...data[map][level].data.slice((y * data[map][level].width + x) * 4, (y * data[map][level].width + x) * 4 + 4)];
const hash = maps => createHash("sha256").update(Buffer.concat(Object.values(maps).flatMap(levels => levels.map(l => l.data)))).digest("hex");

test("PBR surface data is deterministic and fits its exact three-map mip budget", () => {
  assert.equal(hash(data), hash(buildVoxelPbrAtlasData()));
  assert.deepEqual(data.albedo.map(l => l.width), [256, 128, 64, 32, 16, 8, 4, 2, 1]);
  const bytes = Object.values(data).flat().reduce((sum, level) => sum + level.data.byteLength, 0);
  assert.equal(bytes, 1048572); assert.equal(bytes, voxelPbrAtlasBytes());
});

test("wrapped gutters match their own opposite edge, not the adjacent material", () => {
  for (const map of Object.keys(data)) for (let tile = 0; tile < 4; tile++) {
    const x = tile % 2 * VOXEL_PBR.tileSize, y = (tile >> 1) * VOXEL_PBR.tileSize;
    for (const k of [0, 3, 7]) {
      assert.deepEqual(at(map, x + k, y + 40), at(map, x + k + VOXEL_PBR.body, y + 40));
      assert.deepEqual(at(map, x + 40, y + k), at(map, x + 40, y + k + VOXEL_PBR.body));
    }
  }
});

test("normal pixels follow the same periodic physical height field", () => {
  const { body, gutter, repeat } = VOXEL_PBR;
  for (let tile = 0; tile < 4; tile++) for (const [x, y] of [[20, 39], [58, 73], [90, 61]]) {
    const u = (x + .5 - gutter) / body, v = (y + .5 - gutter) / body, d = 1 / body;
    const n = [-(voxelSurfaceHeight(tile, u + d, v) - voxelSurfaceHeight(tile, u - d, v)) / (2 * d) * repeat,
      -(voxelSurfaceHeight(tile, u, v + d) - voxelSurfaceHeight(tile, u, v - d)) / (2 * d) * repeat, 1];
    const length = Math.hypot(...n), pixel = at("normal", tile % 2 * 128 + x, (tile >> 1) * 128 + y);
    for (let c = 0; c < 3; c++) assert.ok(Math.abs((pixel[c] / 255 * 2 - 1) - n[c] / length) < .004);
    assert.ok(Math.abs(voxelSurfaceHeight(tile, u, v) - voxelSurfaceHeight(tile, u + 1, v - 1)) < 1e-12);
  }
});

test("ORM has nonconstant roughness and AO, with metal restricted to the metal tile at every separated mip", () => {
  const rough = new Set(), occlusion = new Set();
  for (let i = 0; i < data.orm[0].data.length; i += 4) { rough.add(data.orm[0].data[i + 1]); occlusion.add(data.orm[0].data[i]); }
  assert.ok(rough.size > 20); assert.ok(occlusion.size > 10);
  for (const level of data.orm.slice(0, -1)) {
    const half = level.width / 2;
    for (let tile = 0; tile < 4; tile++) {
      const pixel = ((Math.floor(half / 2) + (tile >> 1) * half) * level.width + Math.floor(half / 2) + tile % 2 * half) * 4;
      assert.equal(level.data[pixel + 2] > 0, tile === 3);
    }
  }
});

test("authored greens and bright pumpkins retain colour, while neutral, wood, slate and brass receive distinct surfaces", () => {
  for (const c of [[.04, .15, .03], [.8, .2, .01], [.8, .05, .02]]) assert.equal(classifyVoxelSurface(...c).weight, 0);
  for (const [c, tile] of [[[.4, .4, .4], 0], [[.3, .12, .04], 1], [[.15, .04, .2], 2], [[.5, .36, .1], 3]]) assert.equal(classifyVoxelSurface(...c).tile, tile);
  assert.deepEqual(voxelPbrFace([2, 3, 4], [0, -1, 0]), [2, 4]);
  assert.deepEqual(voxelPbrFace([2, 3, 4], [-1, 0, 0]), [4, 3]);
  for (let tile = 0; tile < 4; tile++) {
    const uv = voxelPbrUv([-.25, 12.4], tile);
    assert.ok(uv[0] >= tile % 2 / 2 + 8 / 256 && uv[0] <= tile % 2 / 2 + 120 / 256);
    assert.ok(uv[1] >= (tile >> 1) / 2 + 8 / 256 && uv[1] <= (tile >> 1) / 2 + 120 / 256);
  }
});

test("one shared lease uses native mip generation and retires all three maps exactly once", () => {
  const a = acquireVoxelPbrAtlas(), b = acquireVoxelPbrAtlas();
  assert.equal(a.albedo, b.albedo); assert.equal(a.references, 2);
  assert.equal(a.albedo.colorSpace, THREE.SRGBColorSpace);
  assert.equal(a.normal.colorSpace, THREE.NoColorSpace); assert.equal(a.orm.colorSpace, THREE.NoColorSpace);
  assert.equal(a.normal.generateMipmaps, true); assert.equal(a.normal.mipmaps.length, 0);
  let disposed = 0; for (const map of [a.albedo, a.normal, a.orm]) map.addEventListener("dispose", () => disposed++);
  a.release(); a.release(); assert.equal(disposed, 0); assert.equal(b.references, 1);
  b.release(); b.release(); assert.equal(disposed, 3);
});

test("finished solid batches share the atlas through refresh without changing glow or draw count", () => {
  const root = new THREE.Group(), geometry = new THREE.BoxGeometry(1, 1, 1);
  const m = new THREE.MeshStandardMaterial(); m.userData.voxelFinish = true;
  let previous = 0; m.onBeforeCompile = () => previous++; m.customProgramCacheKey = () => "existing-finish-and-AO";
  const mesh = new THREE.InstancedMesh(geometry, m, 2), glow = new THREE.MeshBasicMaterial(); glow.userData.voxelFinish = true;
  root.add(mesh, new THREE.InstancedMesh(geometry, glow, 1));
  const api = installVillagePbr(root);
  assert.equal(api.stats.materialsSeen, 1); assert.equal(api.stats.additionalDraws, 0); assert.equal(root.children.length, 2);
  assert.ok(getVoxelPbrDescriptor(m)); assert.equal(getVoxelPbrDescriptor(glow), null);
  assert.equal(JSON.stringify(m.userData), '{"voxelFinish":true}');
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  m.onBeforeCompile(shader); assert.equal(previous, 1);
  assert.ok(shader.vertexShader.includes("vPbrSurface = pbrClassify"));
  assert.ok(shader.fragmentShader.includes("roughnessFactor = mix"));
  assert.ok(shader.fragmentShader.includes("pbrTangentNormal(pbrMapN, pbrUnwrapped"));
  assert.ok(m.customProgramCacheKey().startsWith("existing-finish-and-AO|"));
  const next = new THREE.MeshStandardMaterial(); next.userData.voxelFinish = true;
  const group = new THREE.Group(); group.add(new THREE.InstancedMesh(geometry, next, 1)); root.add(group);
  api.refresh(group); api.refresh(group);
  assert.equal(api.stats.materialsSeen, 2); assert.equal(getVoxelPbrDescriptor(m).normal, getVoxelPbrDescriptor(next).normal);
  assert.equal(installVillagePbr(root), api); api.dispose(); api.dispose();
  assert.equal(applyVoxelPbrAtlas(glow, null), false);
});
