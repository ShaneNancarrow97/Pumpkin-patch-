import test from "node:test";
import assert from "node:assert/strict";
import { buildMazeRideConfig, sampleMazeRail } from "../src/rules/maze-ride.js";
import { MAZE_PREFABS } from "../src/content/hollow-house.js";
import { buildMazeRideWorld, isMazeRideWalkable, mazeEncounterStage } from "../src/maze-ride-world.js";

const configFor = (tier, installed = false) => buildMazeRideConfig({ hollowHouse: { purchased: true, status: "ready", tier, haunts: { owned: installed ? MAZE_PREFABS.map(p => p.id) : [], active: installed ? MAZE_PREFABS.map(p => p.id) : [] } } });
const intersectsEye = (box, p, clearance = .18) => Math.abs(box[0] - p.x) < box[3] / 2 + clearance && Math.abs(box[2] - p.z) < box[5] / 2 + clearance && p.y > box[1] - box[4] / 2 && p.y < box[1] + box[4] / 2;

test("all five native maze shells have finite positive boxes and bounded batches", () => {
  let previousCells = 0;
  for (let tier = 1; tier <= 5; tier++) {
    const world = buildMazeRideWorld(configFor(tier, true));
    assert.ok(world.diagnostics.floorCells > previousCells); previousCells = world.diagnostics.floorCells;
    assert.ok(world.diagnostics.batches >= 3 && world.diagnostics.batches <= 6);
    assert.ok(world.boxes.length > 1000 && world.boxes.length < 40000);
    for (const box of world.boxes) {
      assert.ok(box.every(Number.isFinite), `finite box at tier ${tier}`);
      assert.ok(box[3] > 0 && box[4] > 0 && box[5] > 0, `positive box at tier ${tier}`);
    }
    world.dispose();
  }
});

test("the sampled eye route has body clearance and never intersects a wall or prop", () => {
  for (let tier = 1; tier <= 5; tier++) {
    const config = configFor(tier, true), world = buildMazeRideWorld(config);
    for (let i = 0; i <= 450; i++) {
      const p = sampleMazeRail(config, i / 450);
      assert.ok(isMazeRideWalkable(config, p.x, p.z, .3), `walkable tier ${tier}, sample ${i}`);
      assert.equal(p.y, 1.65);
      assert.equal(world.boxes.some(box => intersectsEye(box, p)), false, `clear eye at tier ${tier}, sample ${i}`);
      assert.ok(world.cells.some(cell => Math.abs(cell.x - p.x) <= .251 && Math.abs(cell.z - p.z) <= .251), `floor at tier ${tier}, sample ${i}`);
    }
    world.dispose();
  }
  assert.equal(isMazeRideWalkable(configFor(1), NaN, 0), false);
  assert.equal(isMazeRideWalkable(configFor(1), 20, 20), false);
});

test("scare stages occupy physical side recesses and installed haunts add native detail", () => {
  const baseline = configFor(5), installed = configFor(5, true), a = buildMazeRideWorld(baseline), b = buildMazeRideWorld(installed);
  assert.ok(b.boxes.length > a.boxes.length);
  assert.equal(b.stages.length, installed.encounters.length);
  for (const encounter of installed.encounters) {
    const stage = mazeEncounterStage(installed, encounter), { home, recess } = stage;
    assert.ok(home.x >= recess.x0 && home.x <= recess.x1 && home.z >= recess.z0 && home.z <= recess.z1);
    assert.ok(stage.distance >= .2);
    assert.ok(Math.hypot(stage.nx, stage.nz) > .99);
    assert.ok(b.cells.some(cell => Math.abs(cell.x - home.x) <= .4 && Math.abs(cell.z - home.z) <= .4));
  }
  a.dispose(); b.dispose();
});

test("repeated world disposal releases instances and preserves the shared voxel cube", () => {
  const config = configFor(2), first = buildMazeRideWorld(config), cube = first.group.children.find(m => m.isInstancedMesh).geometry;
  let disposedCube = 0, disposedMaterial = 0, disposedInstances = 0;
  cube.addEventListener("dispose", () => disposedCube++);
  for (const child of first.group.children.filter(m => m.isInstancedMesh)) { child.addEventListener("dispose", () => disposedInstances++); child.material.addEventListener("dispose", () => disposedMaterial++); }
  first.dispose(); first.dispose();
  assert.equal(disposedCube, 0); assert.equal(disposedInstances, 2); assert.equal(disposedMaterial, 2);
  const next = buildMazeRideWorld(config);
  assert.equal(next.group.children.find(m => m.isInstancedMesh).geometry, cube);
  assert.ok(cube.attributes.position.count > 0); next.dispose(); assert.equal(disposedCube, 0);
});
