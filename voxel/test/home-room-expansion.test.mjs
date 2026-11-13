import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { houseRooms as originalRooms, roomStyles as originalStyles } from "../../src/content/rooms.mjs";
import { BATHROOM_STYLES, PLAIN_ROOM_STYLES, findRoom, findRoomStyle, freshRoomStyles, houseRooms, roomStyles, roomWallOpenings } from "../src/content/home-rooms.js";
import { buyRoomExtension, freshRoomExtensions, restoreRoomExtensions, roomExtensionInfo } from "../src/rules/room-extensions.js";
import { fits, freshHouse, ownedCopies, roomLayout } from "../src/rules/house.js";
import { buildRoom } from "../src/interiors.js";

const state = (level = 8, houseLevel = 2, coins = 4500) => ({ paused: false, earned: [0, 300, 1200, 2800, 6000, 12500, 24000, 42000][level - 1], coins, progression: { claimed: Array.from({ length: level }, (_, i) => i + 1) }, house: { level: houseLevel, extensions: freshRoomExtensions(), roomStyles: { parlour: "parlour-manor", kitchen: "kitchen-base" }, placed: [{ id: "f01", room: "parlour" }] } });
const dispose = group => group.traverse(mesh => { if (mesh.isMesh) { mesh.dispose?.(); mesh.material.dispose(); } });

test("the voxel room catalogue adds an optional bathroom without changing shared room data", () => {
  assert.deepEqual(houseRooms.slice(0, 4), originalRooms);
  assert.equal(originalRooms.length, 4);
  assert.equal(originalStyles.length, 10);
  for (const style of originalStyles) assert.equal(findRoomStyle(style.id), style);
  assert.equal(houseRooms.length, 5);
  assert.equal(findRoom("bathroom").extension, "bathroom");
  assert.equal(freshRoomStyles().bathroom, "bathroom-plum");
  assert.equal(new Set(roomStyles.map(style => style.id)).size, roomStyles.length);
  assert.equal(findRoom("__proto__"), null);
  assert.equal(findRoomStyle("constructor"), null);
});

test("bathroom purchase requires level eight, a manor and the full price exactly once", () => {
  for (const s of [state(7), state(8, 1), state(8, 2, 4499), { ...state(), paused: true }]) {
    const before = structuredClone(s);
    assert.equal(buyRoomExtension(s), false);
    assert.deepEqual(s, before);
  }
  const s = state(), previous = structuredClone(s.house);
  assert.equal(roomExtensionInfo(s).canBuy, true);
  assert.equal(buyRoomExtension(s), true);
  assert.equal(s.coins, 0);
  assert.equal(s.house.extensions.bathroom, true);
  assert.equal(s.house.roomStyles.bathroom, "bathroom-plum");
  assert.equal(s.house.roomStyles.parlour, previous.roomStyles.parlour);
  assert.equal(s.house.roomStyles.kitchen, previous.roomStyles.kitchen);
  assert.deepEqual(s.house.placed, previous.placed);
  s.coins = 10000;
  assert.equal(buyRoomExtension(s), false);
  assert.equal(s.coins, 10000);
  assert.equal(buyRoomExtension(s, "__proto__"), false);
});

test("old and malformed saves cannot invent extension ownership", () => {
  assert.deepEqual(restoreRoomExtensions(), { bathroom: false });
  for (const raw of [null, {}, { bathroom: 1 }, { bathroom: "true" }, { bathroom: [], attic: true }]) assert.deepEqual(restoreRoomExtensions(raw), { bathroom: false });
  assert.deepEqual(restoreRoomExtensions({ bathroom: true, cellar: true }), { bathroom: true });
  const first = freshRoomExtensions(), second = freshRoomExtensions();
  first.bathroom = true;
  assert.equal(second.bathroom, false);
});

test("building the bathroom safely clears its kitchen doorway while conserving furniture", () => {
  const s = state();
  s.house = freshHouse(); s.house.level = 2;
  s.house.placed = [{ instance: "door-stool", id: "f04", room: "kitchen", x: 0, z: 2, rotation: 0, flip: false, books: [] }];
  s.house.owned.push("f04"); s.house.copies.f04 = 1;
  const before = roomLayout(s, "kitchen");
  assert.equal(before.doors.length, 1);
  assert.ok(fits(s, "kitchen", "f04", 0, 2, "door-stool"));
  assert.equal(buyRoomExtension(s), true);
  assert.notEqual(roomLayout(s, "kitchen"), before, "extension ownership invalidates cached layouts");
  assert.equal(roomLayout(s, "kitchen").doors.length, 2);
  assert.equal(roomLayout(s, "bathroom").offset + 6, roomLayout(s, "kitchen").offset);
  assert.equal(ownedCopies(s, "f04"), 1);
  for (const piece of s.house.placed) assert.ok(fits(s, piece.room, piece.id, piece.x, piece.z, piece.instance));
});

test("every existing room has a free bare-wall finish and paid colour choices", () => {
  for (const room of originalRooms) {
    const styles = PLAIN_ROOM_STYLES.filter(style => style.roomId === room.id);
    assert.ok(styles.some(style => style.price === 0));
    assert.ok(styles.some(style => style.price >= 150 && style.price <= 900));
    for (const style of styles) for (const wall of ["back", "left", "right"]) assert.deepEqual(roomWallOpenings(style.id, 10, 6, wall), []);
  }
  for (const style of BATHROOM_STYLES) {
    const window = roomWallOpenings(style.id, 6, 6, "back")[0];
    assert.equal(window.kind, "window");
    assert.ok(window.y > 3 && window.x >= 0 && window.x + window.w <= 6);
    assert.deepEqual(roomWallOpenings(style.id, 6, 6, "left"), []);
  }
});

test("bare paint removes the rendered columns and chair rails, rather than just recolouring them", () => {
  const ray = new THREE.Raycaster(), layout = { w: 10, d: 6, doors: [], stairs: [] };
  const legacy = buildRoom("parlour-warm", null, layout).group;
  const simple = buildRoom("parlour-plain-cream", null, layout).group;
  const hit = (room, x, y) => { room.updateMatrixWorld(true); ray.set(new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1)); return ray.intersectObject(room, true)[0]; };
  assert.ok(hit(legacy, 3, 2.8).point.z > 0.15, "the original column stays unchanged");
  for (const [x, y] of [[3, 2.8], [5, 1.4], [5, 3.8], [0.8, 2.5]]) {
    const surface = hit(simple, x, y);
    assert.ok(surface && surface.point.z <= 0.012, `bare plaster at ${x},${y}`);
  }
  dispose(legacy); dispose(simple);
});

test("bathroom is a real tiled six-by-six shell with a usable kitchen doorway", () => {
  const layout = { w: 6, d: 6, doors: [{ wall: "right", at: 2, width: 2, to: "kitchen" }], stairs: [] };
  const { group, links, lights } = buildRoom("bathroom-tile", null, layout);
  assert.equal(links.length, 1);
  assert.equal(links[0].to, "kitchen");
  group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(5, 1.3, 3), new THREE.Vector3(1, 0, 0));
  const passage = ray.intersectObject(group, true)[0];
  assert.ok(passage && passage.point.x > 6.2 && passage.point.x < 6.6, "the door opens into a shallow lit reveal without an exposed corridor box");
  ray.set(new THREE.Vector3(1.25, 1, 4.25), new THREE.Vector3(0, -1, 0));
  const tile = ray.intersectObject(group, true)[0];
  assert.ok(tile && Math.abs(tile.point.y) < 0.001, "bathroom has a solid level tile floor");
  assert.ok(lights.every(light => Number.isFinite(light.intensity)));
  assert.ok(!group.children.some(child => child.isLight), "lighting uses the existing shared light pool");
  dispose(group);
});

test("all new finishes build finite positive voxel geometry, including bathroom doorways", () => {
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), quaternion = new THREE.Quaternion();
  for (const style of [...PLAIN_ROOM_STYLES, ...BATHROOM_STYLES]) {
    const { group } = buildRoom(style.id, null, { w: 6, d: 6, stairs: [], doors: [{ wall: "right", at: 2, width: 2, to: "kitchen" }] });
    let count = 0;
    group.traverse(mesh => {
      if (!mesh.isInstancedMesh) return;
      for (let index = 0; index < mesh.count; index++) {
        mesh.getMatrixAt(index, matrix);
        assert.ok(matrix.elements.every(Number.isFinite), `${style.id} finite instance ${index}`);
        matrix.decompose(position, quaternion, scale);
        assert.ok(scale.x > 0 && scale.y > 0 && scale.z > 0, `${style.id} nonempty instance ${index}`);
        count++;
      }
    });
    assert.ok(count > 100);
    dispose(group);
  }
});
