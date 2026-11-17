// Native voxel design prototype. Local forward is -Z, ground is Y=0.
// No gameplay or renderer dependencies: the host supplies THREE and Voxels.
export const CONVOY = Object.freeze({
  forward: "-Z", tractorRearHitch: [0, .65, .88], wagonFrontHitch: [0, .65, -2.92],
  straightWagonOffset: 3.8,
  tractorEnvelope: { x: [-1.35, 1.35], y: [0, 3.22], z: [-3.22, .94] },
  wagonEnvelope: { x: [-1.47, 1.47], y: [0, 2.05], z: [-2.96, 3.18] },
  // The four passengers face into the central aisle; Y is the seat cushion.
  seats: [
    { id: "left-front", position: [-.87, 1.2, -.75], yaw: -Math.PI / 2 },
    { id: "right-front", position: [.87, 1.2, -.75], yaw: Math.PI / 2 },
    { id: "left-back", position: [-.87, 1.2, .75], yaw: -Math.PI / 2 },
    { id: "right-back", position: [.87, 1.2, .75], yaw: Math.PI / 2 },
  ],
  rearEntry: [0, 1.0, 2.03], rearCamera: [0, 2.13, 1.65],
});

const C = { green: 0x244937, greenHi: 0x3e6345, greenDark: 0x193528,
  iron: 0x28222a, rubber: 0x211e23, tread: 0x35303a, burgundy: 0x692f37,
  hubHi: 0x9e4a45, brass: 0xb59655, brassDark: 0x77603b, cream: 0xd8c49a,
  wood: 0x70492e, woodHi: 0x91623b, woodDark: 0x442e24,
  straw: 0xb29a4c, strawHi: 0xd0b664, orange: 0xc76a28, amber: 0xffc47a };

// Named box groups let moving parts retain small, independently batched pivots.
export function convoyGeometry() {
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

  const w = part("wagon-body", [0, 0, CONVOY.straightWagonOffset]);
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
    for (const z of [-1.7, 1.65]) {
      const lx = s * 1.14;
      box(w, lx - .08, 1.72, z - .08, .16, .29, .16, C.iron);
      box(w, lx - .055, 1.78, z - .055, .11, .15, .11, C.amber, true);
      box(w, lx - .11, 2.0, z - .11, .22, .05, .22, C.brassDark);
    }
  }
  for (let i = 0; i < 3; i++) box(w, -1.23, 1.05 + i * .25, -2.03, 2.46, .18, .1, i % 2 ? C.woodHi : C.wood);
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
    wheel(`tractor-front-${s}`, "tractor-body", s * .84, .43, -2.48, .43, .29);
    wheel(`wagon-front-${s}`, "wagon-body", s * 1.2, .49, -1.12, .49, .38);
    wheel(`wagon-rear-${s}`, "wagon-body", s * 1.2, .49, 1.12, .49, .38);
  }
  return parts;
}

// Builds the prototype using the host game's existing batching implementation.
export function buildHayrideConvoy(THREE, Voxels, { shadows = true } = {}) {
  const root = new THREE.Group(), groups = new Map(), wheelGroups = [];
  root.name = "hollow-hayride-convoy";
  for (const p of convoyGeometry()) {
    const voxels = new Voxels(); p.boxes.forEach(b => voxels.box(...b));
    const group = voxels.build({ shadows }); group.name = p.name;
    group.position.set(...p.origin); groups.set(p.name, group);
    (p.parent ? groups.get(p.parent) : root).add(group);
    if (p.radius) wheelGroups.push({ group, radius: p.radius });
  }
  return { root, tractor: groups.get("tractor-body"), wagon: groups.get("wagon-body"),
    // State belongs to rules; this helper only changes a visual gate and steps.
    setBoarding(open) { groups.get("rear-gate").rotation.y = open ? -Math.PI / 2 : 0; groups.get("boarding-steps").visible = !!open; },
    setRollDistance(distance) { for (const { group, radius } of wheelGroups) group.rotation.x = -distance / radius; },
    // Host positions tractor and wagon from separate arc-length samples. Never
    // rotate the entire convoy as one rigid body around tight route corners.
    // Native Voxels shares its BoxGeometry across the whole game. Dispose only
    // this model's instance buffers and materials, never that shared geometry.
    dispose() { root.removeFromParent(); root.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.material) o.material.dispose(); }); },
    groups, wheelGroups,
  };
}
