import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCookingWorld } from '../src/cooking-world.js';
import { COOKING_SITE, COOKING_SERVICE_ROUTE } from '../src/content/cooking-layout.js';
import { DINING_TABLES, DINING_SEATS, diningRoute, diningExitRoute, diningGuestPose } from '../src/content/cooking-dining.js';
import { TRUCK_QUEUE_CAPACITY, TRUCK_EXIT_ROUTE, TRUCK_HATCH, truckQueuePlace, truckHatchRoute, truckGuestPose } from '../src/content/cooking-visits.js';
import { villageGateway } from '../src/content/village-gateway.js';
import { buildWorld, SHOP } from '../src/world.js';
import { ROUTE_IN, ROUTE_OUT } from '../src/content/farm-layout.js';

const EPS = 1e-5, FEET = .25;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < EPS, `${actual} versus ${expected}`);
function boxes(root) {
  root.updateMatrixWorld(true);
  const result = [], instance = new THREE.Matrix4(), combined = new THREE.Matrix4();
  root.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, instance); combined.multiplyMatrices(mesh.matrixWorld, instance);
      assert.ok(combined.elements.every(Number.isFinite), 'real world instances have finite geometry');
      result.push(new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5), new THREE.Vector3(.5,.5,.5)).applyMatrix4(combined));
    }
  });
  return result;
}
function cookingWorld(t) {
  const scene = new THREE.Scene(), state = { time: 0, kitchen: { purchased: true, orders: [], upgrades: { chef: 0 }, jobs: { truck: null } } };
  const world = createCookingWorld({ scene, state, signBoard: () => new THREE.Group() });
  t.after(() => world.dispose());
  return world;
}
function touches(point, box, radius = FEET) {
  const dx = Math.max(box.min.x - point.x, 0, point.x - box.max.x), dz = Math.max(box.min.z - point.z, 0, point.z - box.max.z);
  return dx * dx + dz * dz < radius * radius - EPS;
}
function sample(route, check, spacing = .1) {
  for (let i = 1; i < route.length; i++) {
    const [ax, az] = route[i - 1], [bx, bz] = route[i], count = Math.max(1, Math.ceil(Math.hypot(bx-ax,bz-az)/spacing));
    for (let j = 0; j <= count; j++) check({ x: ax+(bx-ax)*j/count, z: az+(bz-az)*j/count });
  }
}

test('spaced dining islands match their real tabletops and support every seated guest', t => {
  const world = cookingWorld(t), furniture = world.root.getObjectByName('Midnight Kitchen outdoor dining tables');
  assert.ok(furniture, 'the real patio build is present');
  const solids = boxes(furniture), tops = solids.filter(b => Math.abs(b.min.y-.96)<EPS && Math.abs(b.max.y-1.07)<EPS && b.max.x-b.min.x>1);
  assert.equal(tops.length, 2);
  assert.deepEqual(DINING_SEATS.map(s => s.id), ['a-left','a-right','b-left','b-right'], 'existing dining reservations keep their IDs');
  for (const table of DINING_TABLES) {
    const top = tops.find(b => Math.abs((b.min.x+b.max.x)/2-table.x)<EPS);
    assert.ok(top, table.id+' has its own visible tabletop');
    close((top.min.z+top.max.z)/2, table.z); close(top.max.x-top.min.x, table.w); close(top.max.z-top.min.z, table.d);
    const bench = solids.find(b => Math.abs(b.min.y-.5)<EPS && Math.abs((b.min.x+b.max.x)/2-table.x)<EPS);
    assert.ok(bench, table.id+' has an aligned real bench');
    for (const seat of DINING_SEATS.filter(s => s.id.startsWith(table.id+'-'))) {
      const pose = diningGuestPose({ seat: seat.id, phase: 'eating', distance: 0 });
      close(pose.x, seat.x); close(pose.z, seat.z); assert.equal(pose.seated, true);
      assert.ok(pose.x-FEET>=bench.min.x-EPS && pose.x+FEET<=bench.max.x+EPS, seat.id+' sits on its bench');
      assert.ok(pose.z-FEET>=bench.min.z-EPS && pose.z+FEET<=bench.max.z+EPS, seat.id+' sits at the bench depth');
      assert.equal(touches(pose, top), false, seat.id+' does not clip into the table');
    }
  }
  const ordered = tops.slice().sort((a,b) => a.min.x-b.min.x);
  assert.ok(ordered[1].min.x-ordered[0].max.x>=1.25, 'the islands have a usable aisle, not a row of touching tables');
  assert.ok(solids.every(b => b.max.y<1.7), 'low table lanterns replace the overhead wire and post');
});

test('dining walks avoid the truck and delivery lane, then leave directly along the shared east road', t => {
  const world = cookingWorld(t), truck = boxes(world.root.getObjectByName('The Midnight Kitchen · food truck'));
  const exit = villageGateway({ kitchen: { purchased: true } });
  for (const seat of DINING_SEATS) {
    const incoming = diningRoute(seat.id), outgoing = diningExitRoute(seat.id);
    assert.deepEqual(incoming.at(-1), [seat.x,seat.z]);
    assert.deepEqual(outgoing[0], [seat.x,seat.z]);
    assert.deepEqual(outgoing.at(-1), [exit.x,exit.z]);
    const road = outgoing.findIndex(p => Math.abs(p[1]-exit.z)<EPS);
    assert.ok(road>0, seat.id+' reaches the public road before leaving');
    for (let i=road+1;i<outgoing.length;i++) assert.ok(outgoing[i][0]>=outgoing[i-1][0], seat.id+' does not double back towards Skyla');
    for (const route of [incoming,outgoing]) sample(route, point => {
      assert.ok(truck.every(b => !touches(point,b)), seat.id+' stays outside the actual truck');
      assert.ok(!(point.x+FEET>COOKING_SERVICE_ROUTE.bounds.x0 && point.x-FEET<COOKING_SERVICE_ROUTE.bounds.x1 && point.z+FEET>COOKING_SERVICE_ROUTE.bounds.z0 && point.z-FEET<COOKING_SERVICE_ROUTE.bounds.z1), seat.id+' does not walk through the receiving cart');
    });
  }
});

test('all eight takeaway slots sit off the public road and approach the unchanged hatch without clipping', t => {
  const world = cookingWorld(t), truck = boxes(world.root.getObjectByName('The Midnight Kitchen · food truck'));
  const exit = villageGateway({ kitchen: { purchased: true } });
  assert.equal(TRUCK_QUEUE_CAPACITY, 8); assert.deepEqual(TRUCK_EXIT_ROUTE.at(-1), [exit.x,exit.z]);
  let last = null;
  for (let place=0;place<TRUCK_QUEUE_CAPACITY;place++) {
    const [x,z] = truckQueuePlace(place), waiting = truckGuestPose({ takeaway: { phase: 'queue', place, distance: 0 } });
    close(waiting.x,x);close(waiting.z,z);assert.equal(waiting.waiting,true);
    assert.ok(z+FEET<exit.z-exit.halfWidth, 'the full queue footprint clears the public/village road');
    assert.ok(x-FEET>COOKING_SERVICE_ROUTE.bounds.x1, 'the queue clears deliveries');
    assert.ok(x+FEET<COOKING_SITE.pavingBounds.x1 && z+FEET<COOKING_SITE.pavingBounds.z1, 'waiting stays on the existing purchased apron');
    if(last) assert.ok(Math.hypot(x-last[0],z-last[1])>FEET*2, 'neighbouring queue places do not overlap');last=[x,z];
    const route = truckHatchRoute(place);assert.deepEqual(route.at(-1), [...TRUCK_HATCH]);
    sample(route, point => assert.ok(truck.every(b => !touches(point,b)), 'the hatch approach clears actual truck dressing'));
    const serving = truckGuestPose({ takeaway: { phase: 'serving', place, distance: 0 } });
    close(serving.x,TRUCK_HATCH[0]);close(serving.z,TRUCK_HATCH[1]);
  }
});

test('perimeter planting leaves the food-service frontage open', t => {
  const world = cookingWorld(t), pad = world.root.getObjectByName('Midnight Kitchen continuous farm cobbles');
  assert.ok(pad);
  const raised = boxes(pad).filter(b => b.max.y>.15);
  assert.ok(raised.length>0, 'the apron still has planted detail');
  const frontage = new THREE.Box3(new THREE.Vector3(40,0,4.8),new THREE.Vector3(47.4,2,5.6));
  assert.ok(raised.every(b => !b.intersectsBox(frontage)), 'planting is at the perimeter rather than against the serving line');
});

test('Skyla’s actual incoming lane and exit curve retain a clear walking strip beside the detailed shop', () => {
  const world = buildWorld(), solids = boxes(world.group);
  const walkingHeight = solids.filter(b => b.max.y>.15 && b.min.y<2.2);
  assert.ok(solids.length>2500, 'the full dressed farm remains present');
  for (const [name,route] of [['incoming lane',ROUTE_IN],['exit curve',ROUTE_OUT]]) sample(route, point => {
    const obstruction = walkingHeight.find(b => touches(point,b,.9));
    assert.equal(obstruction, undefined, `${name}: 1.8m clear strip at ${point.x.toFixed(2)},${point.z.toFixed(2)}; obstruction ${obstruction ? JSON.stringify({min:obstruction.min,max:obstruction.max}) : ''}`);
  }, .08);
  const shop = solids.filter(b => b.max.x>SHOP.x-4.5 && b.min.x<SHOP.x+4.5 && b.max.z>SHOP.z-2.5 && b.min.z<SHOP.counterZ+.1);
  assert.ok(shop.length>300, 'the shop keeps its walls, shelves and detailed displays');
  assert.ok(shop.some(b => b.max.y>6), 'the shop retains its high gable and roof');
  assert.ok(shop.some(b => b.max.y>1 && b.min.y<2.2 && b.max.z>SHOP.counterZ-.3 && b.max.x-b.min.x>5), 'the broad serving counter remains');
});
