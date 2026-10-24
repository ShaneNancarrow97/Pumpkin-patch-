import * as THREE from "three";
import { Voxels } from "./voxels.js";

// Shared vehicle mounts and conservative clearance in native game units.
// Forward is -Z; tractor origin is its rear axle on the ground.
export const HAYRIDE_VEHICLE = Object.freeze({
  forward: "-Z", tractorRearHitch: [0, .65, .88], wagonFrontHitch: [0, .65, -2.92],
  straightWagonOffset: 3.8,
  tractorEnvelope: { x: [-1.35, 1.35], y: [0, 3.22], z: [-3.22, .94] },
  wagonEnvelope: { x: [-1.47, 1.47], y: [0, 2.05], z: [-2.96, 3.18] },
  // The four passengers face into the central aisle; Y is the seat cushion.
  rearEntry: [0, 1.0, 2.03], rearCamera: [0, 2.13, 1.65],
});

const C = { green: 0x244937, greenHi: 0x3e6345, greenDark: 0x193528,
  iron: 0x28222a, rubber: 0x211e23, tread: 0x35303a, burgundy: 0x692f37,
  hubHi: 0x9e4a45, brass: 0xb59655, brassDark: 0x77603b, cream: 0xd8c49a,
  wood: 0x70492e, woodHi: 0x91623b, woodDark: 0x442e24,
  straw: 0xb29a4c, strawHi: 0xd0b664, orange: 0xc76a28, amber: 0xffc47a };

// Seats remain within the same physical benches at all three paid capacities.
export function hayrideSeatAnchors(capacity = 4) {
  const count = capacity === 8 ? 4 : capacity === 6 ? 3 : 2;
  const zs = count === 2 ? [-.75, .75] : count === 3 ? [-1.08, 0, 1.08] : [-1.17, -.39, .39, 1.17];
  return zs.flatMap((z, row) => [-1, 1].map(side => ({
    id: `${side < 0 ? "left" : "right"}-${row}`, position: [side * .87, 1.2, z], yaw: side < 0 ? -Math.PI / 2 : Math.PI / 2,
  })));
}

// Named box groups keep independently moving parts in cached native batches.
export function hayrideVehicleGeometry({ capacity = 4 } = {}) {
  const parts = [], part = (name, origin = [0, 0, 0], extra = {}) => {
    const p = { name, origin, boxes: [], ...extra }; parts.push(p); return p;
  };
  const box = (p, x, y, z, w, h, d, c, glow = false) => p.boxes.push([x, y, z, w, h, d, c, glow]);
  const b = part("tractor-body");
  box(b, -.72, .55, -2.9, 1.44, .27, 3.5, C.iron);
  box(b, -.61, .81, -2.86, 1.22, .87, 1.8, C.green);
  box(b, -.52, 1.68, -2.79, 1.04, .13, 1.65, C.greenHi);
  box(b, -.57, 1.07, -2.95, 1.14, .6, .1, C.brassDark);
  box(b, -.49, 1.12, -3.01, .98, .49, .07, C.iron);
  for (let i = 0; i < 9; i++) box(b, -.45 + i * .105, 1.13, -3.03, .045, .46, .055, C.brass);
  box(b, -.91, .7, -3.18, 1.82, .18, .22, C.iron);
  for (const s of [-1, 1]) {
    box(b, s < 0 ? -.79 : .61, 1.28, -2.78, .18, .3, .27, C.brassDark);
    box(b, s < 0 ? -.765 : .635, 1.33, -2.815, .13, .19, .05, C.amber, true);
    box(b, s < 0 ? -.64 : .61, 1.01, -2.53, .03, .04, .74, C.greenHi);
    for (let i = 0; i < 4; i++) box(b, s < 0 ? -.65 : .61, 1.27, -2.47 + i * .15, .04, .2, .065, C.greenDark);
    box(b, s < 0 ? -.8 : .54, .77, -.95, .26, .12, 1.5, C.greenDark);
    box(b, s < 0 ? -1.15 : .76, .53, -.6, .39, .09, .6, C.iron);
    box(b, s < 0 ? -1.27 : .86, 1.25, -.38, .41, .13, .85, C.green);
    box(b, s < 0 ? -1.24 : .89, 1.38, -.33, .35, .06, .74, C.greenHi);
    box(b, s < 0 ? -.84 : .78, 1.73, -.1, .06, 1.25, .06, C.iron);
    box(b, s < 0 ? -.84 : .78, 1.41, -1.17, .06, 1.57, .06, C.iron);
    box(b, s < 0 ? -.84 : .78, 2.98, -1.17, .06, .07, 1.13, C.brassDark);
    box(b, s < 0 ? -1.02 : .87, 1.8, -.84, .15, .18, .08, C.brass);
  }
  // A stepped open canopy, not an opaque truck cab.
  box(b, -.98, 3.03, -1.43, 1.96, .1, 1.65, C.greenDark);
  box(b, -.88, 3.13, -1.36, 1.76, .06, 1.5, C.green);
  box(b, -.73, 3.19, -1.28, 1.46, .03, 1.33, C.greenHi);
  // The premium convoy gains plum-and-brass trim without changing clearance.
  if (capacity >= 8) {
    box(b, -.98, 3.05, -1.43, 1.96, .045, .06, C.burgundy);
    box(b, -.98, 3.05, .16, 1.96, .045, .06, C.burgundy);
    for (const x of [-.98, .92]) box(b, x, 3.05, -1.37, .06, .045, 1.53, C.burgundy);
    for (const x of [-.87, .83]) box(b, x, 3.04, -1.45, .04, .08, .025, C.brass);
  }
  box(b, -.35, 1.03, -.5, .7, .22, .68, C.iron);
  box(b, -.37, 1.25, -.58, .74, .1, .59, C.burgundy);
  box(b, -.37, 1.35, -.02, .74, .47, .12, C.burgundy);
  box(b, -.41, 1.47, -1.12, .82, .18, .18, C.greenDark);
  box(b, -.04, 1.58, -1.03, .08, .34, .08, C.iron);
  box(b, -.25, 1.88, -1.15, .5, .055, .055, C.iron);
  box(b, -.25, 1.88, -.78, .5, .055, .055, C.iron);
  box(b, -.25, 1.88, -1.1, .055, .055, .32, C.iron);
  box(b, .195, 1.88, -1.1, .055, .055, .32, C.iron);
  box(b, .38, 1.1, -.61, .055, .47, .055, C.brass);
  box(b, .35, 1.55, -.64, .11, .1, .11, C.burgundy);
  // The bent exhaust and little pumpkin bonnet badge are solid geometry.
  box(b, -.44, 1.8, -2.2, .14, .85, .14, C.iron);
  box(b, -.44, 2.55, -2.26, .14, .14, .2, C.iron);
  box(b, -.44, 2.59, -2.4, .14, .1, .14, C.brassDark);
  box(b, -.17, 1.76, -2.78, .34, .21, .18, C.orange);
  box(b, -.1, 1.97, -2.75, .06, .08, .06, C.greenHi);
  box(b, -.1, 1.83, -2.815, .045, .045, .04, C.iron);
  box(b, .055, 1.83, -2.815, .045, .045, .04, C.iron);
  box(b, -.07, 1.77, -2.815, .14, .035, .04, C.iron);
  box(b, -.16, .59, .55, .32, .12, .39, C.brassDark);
  box(b, -.07, .71, .77, .14, .08, .14, C.iron);

  const w = part("wagon-body", [0, 0, HAYRIDE_VEHICLE.straightWagonOffset]);
  box(w, -.93, .61, -1.94, 1.86, .18, 3.86, C.iron);
  box(w, -.12, .57, -2.94, .24, .14, 1.1, C.brassDark);
  for (let i = 0; i < 11; i++) box(w, -1.24 + i * .226, .84, -1.96, .216, .16, 3.96, i % 3 ? C.wood : C.woodHi);
  for (const s of [-1, 1]) {
    const x = s < 0 ? -1.32 : 1.23;
    for (let y = 0; y < 3; y++) {
      box(w, x, 1.05 + y * .25, -1.98, .09, .18, 4.03, y % 2 ? C.woodHi : C.wood);
      for (const z of [-1.83, -.2, 1.82]) box(w, x - .008, 1.1 + y * .25, z, .106, .04, .04, C.brassDark);
    }
    for (const z of [-1.95, -.3, 1.95]) box(w, x - .025, .95, z, .14, 1.05, .13, C.woodDark);
    // Two inward-facing bench positions per side; central aisle stays clear.
    box(w, s < 0 ? -1.2 : .62, 1.0, -1.42, .58, .12, 2.9, C.woodDark);
    for (let i = 0; i < 16; i++) box(w, s < 0 ? -1.18 : .64, 1.12, -1.4 + i * .18, .54, .08, .16, i % 3 ? C.straw : C.strawHi);
    if (capacity >= 6) {
      const face = s < 0 ? -1.348 : 1.32;
      box(w, face, 1.28, -.72, .025, .26, 1.44, C.brassDark);
      for (const z of [-.48, 0, .48]) {
        box(w, face + (s < 0 ? -.01 : .01), 1.34, z - .1, .025, .14, .2, C.brass);
      }
    }
    for (const z of [-1.7, 1.65]) {
      const lx = s * 1.14;
      if (capacity >= 8) {
        box(w, lx - .11, 1.75, z - .11, .22, .21, .22, C.orange);
        box(w, lx - .14, 1.8, z - .075, .28, .12, .15, C.orange);
        box(w, lx - .03, 1.96, z - .03, .06, .09, .06, C.greenHi);
        const face = z + (z < 0 ? -.125 : .11);
        for (const eye of [-.065, .03]) box(w, lx + eye, 1.86, face, .035, .035, .015, C.amber, true);
        box(w, lx - .06, 1.8, face, .12, .025, .015, C.amber, true);
      } else {
        box(w, lx - .08, 1.72, z - .08, .16, .29, .16, C.iron);
        box(w, lx - .055, 1.78, z - .055, .11, .15, .11, C.amber, true);
        box(w, lx - .11, 2.0, z - .11, .22, .05, .22, C.brassDark);
      }
    }
  }
  for (let i = 0; i < 3; i++) box(w, -1.23, 1.05 + i * .25, -2.03, 2.46, .18, .1, i % 2 ? C.woodHi : C.wood);
  // Brass cushion tags show the extra places without enlarging the wagon.
  for (const seat of hayrideSeatAnchors(capacity)) {
    const [x, y, z] = seat.position;
    box(w, x - .045, y + .005, z - .045, .09, .025, .09, C.brassDark);
  }
  // Rear corner rails leave a genuine 1.1-unit opening, not a solid back wall.
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) box(w, s < 0 ? -1.23 : .56, 1.05 + i * .25, 1.96, .67, .18, .1, C.wood);
  const gate = part("rear-gate", [-.55, 1, 2.04], { parent: "wagon-body", axis: "y" });
  for (let i = 0; i < 3; i++) box(gate, 0, .05 + i * .25, -.04, 1.1, .16, .08, C.woodHi);
  box(gate, .04, 0, -.06, .1, .91, .12, C.woodDark);
  box(gate, .96, 0, -.06, .1, .91, .12, C.woodDark);
  box(gate, .9, .51, -.085, .16, .07, .17, C.brass);
  const steps = part("boarding-steps", [0, 0, 0], { parent: "wagon-body" });
  box(steps, -.55, .25, 2.55, 1.1, .13, .45, C.wood);
  box(steps, -.55, .55, 2.17, 1.1, .13, .42, C.woodHi);
  for (const s of [-1, 1]) box(steps, s < 0 ? -.55 : .48, .04, 2.18, .07, .58, .72, C.iron);

  // Voxel wheels are centred on the axle so all eight can roll independently.
  const wheel = (name, parent, x, y, z, radius, width) => {
    const p = part(name, [x, y, z], { parent, axis: "x", radius });
    const cell = .09, n = Math.ceil(radius / cell), inner = radius * .48;
    for (let iy = -n; iy < n; iy++) for (let iz = -n; iz < n; iz++) {
      const yy = (iy + .5) * cell, zz = (iz + .5) * cell, r = Math.hypot(yy, zz);
      if (r > radius) continue;
      const c = r < inner ? C.burgundy : r > radius - cell * 1.6 && (iy + iz) % 3 === 0 ? C.tread : C.rubber;
      const y0 = Math.max(-radius, yy - cell / 2), z0 = Math.max(-radius, zz - cell / 2);
      box(p, -width / 2, y0, z0, width, Math.min(radius, yy + cell / 2) - y0, Math.min(radius, zz + cell / 2) - z0, c);
    }
    for (const side of [-1, 1]) {
      box(p, side * width / 2 - .025, -.14, -.14, .05, .28, .28, C.hubHi);
      box(p, side * width / 2 - .04, -.065, -.065, .08, .13, .13, C.brass);
    }
  };
  for (const s of [-1, 1]) {
    wheel(`tractor-rear-${s}`, "tractor-body", s * 1.08, .72, 0, .72, .43);
    part(`front-steer-${s}`, [s * .84, .43, -2.48], { parent: "tractor-body", axis: "y" });
    wheel(`tractor-front-${s}`, `front-steer-${s}`, 0, 0, 0, .43, .29);
    wheel(`wagon-front-${s}`, "wagon-body", s * 1.2, .49, -1.12, .49, .38);
    wheel(`wagon-rear-${s}`, "wagon-body", s * 1.2, .49, 1.12, .49, .38);
  }
  return parts;
}

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const pose = (group, value = {}) => {
  value = value && typeof value === "object" ? value : {};
  group.position.set(finite(value.x, group.position.x), finite(value.y, group.position.y), finite(value.z, group.position.z));
  group.rotation.y = finite(value.yaw, group.rotation.y);
};

// A render adapter only: positions, boarding state and wheel distance come from
// the attraction rules. No guest, ticket, dispatch or save data lives here.
export function buildHayrideVehicle({ capacity = 4, shadows = true } = {}) {
  const group = new THREE.Group(), groups = new Map(), wheels = [], steering = [];
  group.name = "hollow-hayride-convoy";
  const boxes = hayrideVehicleGeometry({ capacity });
  for (const part of boxes) {
    const voxels = new Voxels(); part.boxes.forEach(box => voxels.box(...box));
    const object = voxels.build({ shadows }); object.name = part.name;
    object.position.set(...part.origin); groups.set(part.name, object);
    (part.parent ? groups.get(part.parent) : group).add(object);
    if (part.radius) wheels.push({ group: object, radius: part.radius });
    if (part.name.startsWith("front-steer-")) steering.push(object);
  }
  const tractor = groups.get("tractor-body"), wagon = groups.get("wagon-body");
  const tractorHitch = new THREE.Vector3(...HAYRIDE_VEHICLE.tractorRearHitch);
  const wagonHitch = new THREE.Vector3(...HAYRIDE_VEHICLE.wagonFrontHitch);
  const scratch = new THREE.Vector3(), correction = new THREE.Vector3();
  let disposed = false, rollDistance = 0;
  const api = { group, root: group, tractor, wagon, groups, wheelGroups: wheels,
    seatAnchors: hayrideSeatAnchors(capacity), rearEntry: [...HAYRIDE_VEHICLE.rearEntry], cameraAnchor: [...HAYRIDE_VEHICLE.rearCamera],
    // The gate swings out of the central aisle; deployed steps require a stop.
    setBoarding(open) {
      groups.get("rear-gate").rotation.y = open ? -Math.PI / 2 : 0;
      groups.get("boarding-steps").visible = !!open;
    },
    setRollDistance(distance) {
      rollDistance = finite(distance, rollDistance);
      for (const { group: object, radius } of wheels) object.rotation.x = -rollDistance / radius;
    },
    setSteering(angle) { for (const object of steering) object.rotation.y = THREE.MathUtils.clamp(finite(angle), -.5, .5); },
    // Separate arc samples supply tractor/wagon headings. Position the trailer
    // about its hitch to keep the drawbar joined through broad route bends.
    // With alignHitch:false the caller owns both sampled positions explicitly.
    setPose(value = {}) {
      const { tractor: tractorPose, wagon: wagonPose, alignHitch = true } = value || {};
      pose(tractor, tractorPose); pose(wagon, wagonPose);
      if (alignHitch) {
        scratch.copy(tractorHitch).applyEuler(tractor.rotation).add(tractor.position);
        correction.copy(wagonHitch).applyEuler(wagon.rotation);
        wagon.position.copy(scratch).sub(correction);
      }
      group.updateMatrixWorld(true);
    },
    // Preserve Voxels' globally shared cube, including on repeated removal.
    dispose() {
      if (disposed) return; disposed = true;
      group.removeFromParent();
      const materials = new Set();
      group.traverse(object => {
        if (object.isInstancedMesh) object.dispose();
        if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      });
      for (const material of materials) material.dispose();
    },
    diagnostics: { boxes: boxes.reduce((n, part) => n + part.boxes.length, 0), parts: boxes.length, wheels: wheels.length, seats: hayrideSeatAnchors(capacity).length },
  };
  api.setBoarding(false); api.setPose();
  return api;
}
