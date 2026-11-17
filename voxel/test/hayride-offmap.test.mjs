import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHayrideWorld } from "../src/hayride-world.js";
import { HAYRIDE_SITE, HAYRIDE_RIDE_BOUNDS, hayrideFarmConvoyPose, hayrideGuestPose } from "../src/content/hayride-layout.js";
import { HAYRIDE_VEHICLE, hayrideSeatAnchors } from "../src/hayride-vehicle.js";
import { freshHayride, planHayrideVisit, updateHayride } from "../src/rules/hayride.js";

const close = (a, b, message = "positions differ") => assert.ok(Math.abs(a - b) < 1e-6, `${message}: ${a} != ${b}`);
const ancestor = (node, root) => { for (let p = node; p; p = p.parent) if (p === root) return true; return false; };
const vehiclePose = vehicle => ({ tractor: [...vehicle.tractor.position.toArray(), vehicle.tractor.rotation.y], wagon: [...vehicle.wagon.position.toArray(), vehicle.wagon.rotation.y] });
const transform = (anchor, root) => new THREE.Vector3(...anchor).applyAxisAngle(new THREE.Vector3(0, 1, 0), root.yaw).add(new THREE.Vector3(root.x, root.y, root.z));

function fixture() {
  const state = { hayride: { ...freshHayride(), purchased: true, open: true }, visitors: [], holds: [], upgrades: { plots: 0 }, coins: 1000, earned: 1000, time: 0, paused: false };
  const farmScene = new THREE.Scene(), legacy = new THREE.Group(); farmScene.add(legacy);
  const controller = createHayrideWorld({ scene: farmScene, state, world: { group: legacy }, signBoard: () => new THREE.Group() });
  return { state, farmScene, controller };
}
function addGuests(state) {
  for (let id = 0; id < 4; id++) {
    const visitor = { id, spot: id, budget: 100, originalBudget: 100, basket: [], needs: { happiness: 70 } };
    visitor.hayride = planHayrideVisit(state, visitor, "arrival", { force: true, approachSeconds: .1, returnSeconds: .1 });
    assert.ok(visitor.hayride); state.visitors.push(visitor);
  }
}
function advance(state, seconds) { state.time += seconds; updateHayride(state, seconds); }
function assertCoupled(pose) {
  const tractorHitch = transform(HAYRIDE_VEHICLE.tractorRearHitch, pose.tractor), wagonHitch = transform(HAYRIDE_VEHICLE.wagonFrontHitch, pose.wagon);
  close(tractorHitch.distanceTo(wagonHitch), 0, "drawbar hitches separate");
}

test("the compact farm station and woodland render in separate scenes", () => {
  const { controller, farmScene } = fixture();
  try {
    assert.equal(controller.rideScene.isScene, true);
    assert.equal(controller.scene, controller.rideScene);
    assert.notEqual(controller.rideScene, farmScene);
    assert.equal(controller.root.parent, farmScene);
    assert.equal(ancestor(controller.vehicle.group, farmScene), true);
    assert.equal(ancestor(controller.rideVehicle.group, controller.rideScene), true);
    assert.equal(ancestor(controller.rideVehicle.group, farmScene), false);
    assert.equal(ancestor(controller.root, controller.rideScene), false);
    for (const name of ["The Hollow Hayride off-map woodland", "Hollow Hayride — off-map old-growth forest"]) {
      const woodland = controller.rideScene.getObjectByName(name);
      assert.ok(woodland, `missing owner scenery: ${name}`);
      assert.equal(ancestor(woodland, farmScene), false);
      assert.equal(farmScene.getObjectByName(name), undefined);
    }
    assert.equal(controller.status.rideScene, true);
    assert.deepEqual(controller.status.farmBounds, HAYRIDE_SITE.bounds);
    assert.deepEqual(controller.status.rideBounds, HAYRIDE_RIDE_BOUNDS);
    assert.ok(HAYRIDE_SITE.bounds.x1 - HAYRIDE_SITE.bounds.x0 < HAYRIDE_RIDE_BOUNDS.x1 - HAYRIDE_RIDE_BOUNDS.x0, "the woodland must not enlarge the farm station allocation");
  } finally { controller.dispose(); }
});

test("paid riders stay in simulation while the convoy is away from the farm", () => {
  const { controller, state } = fixture();
  try {
    addGuests(state); advance(state, 14); controller.sync();
    assert.equal(state.hayride.convoy.phase, "circuit");
    assert.equal(state.hayride.ticketsSold, 4); assert.equal(state.hayride.income, 32);
    assert.equal(state.hayride.convoy.manifest.length, 4);
    const paid = JSON.stringify(state);
    controller.tick(14);
    assert.equal(controller.status.farmVisible, false);
    assert.equal(controller.vehicle.group.visible, false);
    assert.equal(hayrideFarmConvoyPose(state).visible, false);
    for (const visitor of state.visitors) {
      assert.equal(visitor.hayride.charged, true); assert.equal(visitor.budget, 92);
      assert.equal(hayrideGuestPose(state, visitor).visible, false);
    }
    assert.equal(JSON.stringify(state), paid, "hiding an off-map convoy must preserve its guests and payment records");
  } finally { controller.dispose(); }
});

test("farm departures and arrivals keep riders seated in the coupled wagon", () => {
  const { controller, state } = fixture();
  try {
    addGuests(state); advance(state, 6.1);
    const rider = state.visitors[0], seat = hayrideSeatAnchors(4)[rider.hayride.seat].position;
    for (const phase of ["departing", "arriving"]) for (const elapsed of [0, .75, 1.5, 2.25, 3]) {
      Object.assign(state.hayride.convoy, { phase, elapsed }); controller.sync();
      const pose = hayrideFarmConvoyPose(state), guest = hayrideGuestPose(state, rider), expectedSeat = transform(seat, pose.wagon);
      const visible=phase==="arriving"?elapsed>=2.25:elapsed<3;
      assert.equal(pose.visible, visible); assert.equal(controller.vehicle.group.visible, visible);
      assert.equal(guest.visible, visible); assert.equal(guest.seated, true); assertCoupled(pose);
      close(guest.x, expectedSeat.x); close(guest.y, expectedSeat.y); close(guest.z, expectedSeat.z);
      close(controller.vehicle.tractor.position.x, pose.tractor.x); close(controller.vehicle.tractor.position.z, pose.tractor.z);
      close(controller.vehicle.wagon.position.x, pose.wagon.x); close(controller.vehicle.wagon.position.z, pose.wagon.z);
    }
    state.hayride.convoy.phase = "loading"; state.hayride.convoy.elapsed = 0;
    const loading = hayrideFarmConvoyPose(state);
    state.hayride.convoy.phase = "departing";
    const departure = hayrideFarmConvoyPose(state);
    assert.deepEqual(departure.tractor, loading.tractor); assert.deepEqual(departure.wagon, loading.wagon);
    Object.assign(state.hayride.convoy, { phase: "arriving", elapsed: 3 });
    const arrival = hayrideFarmConvoyPose(state);
    state.hayride.convoy.phase = "unloading"; state.hayride.convoy.elapsed = 0;
    const unloading = hayrideFarmConvoyPose(state);
    assert.deepEqual(arrival.tractor, unloading.tractor); assert.deepEqual(arrival.wagon, unloading.wagon);
  } finally { controller.dispose(); }
});

test("owner playback cannot move the real farm convoy or overwrite a completed circuit", () => {
  const { controller, state } = fixture();
  try {
    addGuests(state); advance(state, 6.1); controller.sync();
    const farmBefore = vehiclePose(controller.vehicle), before = JSON.stringify(state);
    controller.setPreview(.18); const firstFrame = controller.getPreviewFrame(.18);
    const ownerBefore = vehiclePose(controller.rideVehicle);
    controller.setPreview(.71); const secondFrame = controller.getPreviewFrame(.71); controller.tick(20);
    assert.notDeepEqual(vehiclePose(controller.rideVehicle), ownerBefore, "the owner vehicle traverses its own woodland");
    assert.notDeepEqual(firstFrame.position.toArray(), secondFrame.position.toArray());
    assert.deepEqual(vehiclePose(controller.vehicle), farmBefore, "preview progress must not move the paying wagon");
    assert.equal(JSON.stringify(state), before);

    advance(state, 120); controller.sync();
    assert.equal(state.hayride.completed, 4); assert.equal(state.hayride.convoy.phase, "loading");
    const farmAfter = vehiclePose(controller.vehicle), after = JSON.stringify(state);
    controller.setPreview(.54); controller.getPreviewFrame(.54); controller.tick(140); controller.setPreview(null);
    assert.deepEqual(vehiclePose(controller.vehicle), farmAfter, "leaving preview must retain the current farm convoy pose");
    assert.equal(controller.vehicle.group.visible, true);
    assert.equal(controller.status.farmVisible, true);
    assert.equal(state.hayride.ticketsSold, 4); assert.equal(state.hayride.income, 32);
    assert.equal(JSON.stringify(state), after, "preview exit must not restore an obsolete simulation snapshot");
  } finally { controller.dispose(); }
});
