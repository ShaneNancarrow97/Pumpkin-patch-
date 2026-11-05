// The guests' carving stand on the farm (rules/carving-stand.js): a covered
// stall between the west lane and the big pumpkin, an orange-and-plum awning
// over a long bench, a jack-o'-lantern on each bench that a guest is carving
// (dark at first, lit as it's finished), and a rack of finished lanterns.
// Hidden until built; rebuilt only when the benches change.
import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { DROP } from "./content/farm-layout.js";

export const STAND_SITE = Object.freeze({ x: 1.2, z: 17 + DROP, w: 5.4, d: 2.6 });
const BENCH_SPOTS = (n) => Array.from({ length: n }, (_, i) => STAND_SITE.x - STAND_SITE.w / 2 + .6 + (i + .5) * ((STAND_SITE.w - 1.2) / n));

export function createCarvingStandWorld({ scene, state, signBoard, postSign, pickables }) {
  const root = new THREE.Group(); root.name = "The Carving Stand"; root.visible = false; scene.add(root);
  let built = "", body = null, lanterns = [];
  const hit = new THREE.Mesh(new THREE.BoxGeometry(STAND_SITE.w, 3, STAND_SITE.d), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(STAND_SITE.x, 1.5, STAND_SITE.z); hit.userData = { type: "carving-stand" }; root.add(hit); pickables.push(hit);
  const sign = postSign(signBoard("The Carving Stand", "carve your own lantern", 3), 3.1);
  sign.position.set(STAND_SITE.x, 3.1, STAND_SITE.z - STAND_SITE.d / 2 - .05); sign.userData = { type: "carving-stand" }; root.add(sign);
  const pumpkinGeo = new THREE.BoxGeometry(.42, .34, .42), faceGeo = new THREE.PlaneGeometry(.3, .18);
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9661f, roughness: .8 });

  // The stall itself: posts, a striped awning, a long bench and stools, and a rack of finished lanterns.
  function build(benches) {
    if (body) { root.remove(body); body.traverse((o) => o.geometry?.dispose?.()); }
    const v = new Voxels(), r = seeded(4471), { x, z, w, d } = STAND_SITE, x0 = x - w / 2, z0 = z - d / 2;
    for (const px of [x0 + .1, x0 + w - .25]) for (const pz of [z0 + .1, z0 + d - .25]) v.box(px, 0, pz, .15, 2.7, .15, 0x3a2618);
    for (let i = 0; i < 9; i++) v.box(x0 - .1 + i * (w + .2) / 9, 2.65, z0 - .2, (w + .2) / 9, .14, d + .45, i % 2 ? 0x4a2a5c : 0xd8742a);
    for (let i = 0; i < 9; i++) v.box(x0 - .1 + i * (w + .2) / 9, 2.45, z0 + d + .2, (w + .2) / 9, .22, .06, i % 2 ? 0x4a2a5c : 0xd8742a);
    v.box(x0 + .3, .78, z + .05, w - .6, .1, .7, 0x6b4428); v.box(x0 + .35, 0, z + .1, .12, .78, .6, 0x3a2618); v.box(x0 + w - .47, 0, z + .1, .12, .78, .6, 0x3a2618);
    for (const bx of BENCH_SPOTS(benches)) { v.box(bx - .17, 0, z + .95, .34, .42, .3, vary(0x5a3a24, .1, r)); for (let k = 0; k < 3; k++) v.box(bx - .3 + r() * .5, .88, z + .1 + r() * .5, .05, .05, .05, 0xf2b25a); }
    v.box(x0 + .15, 0, z0 + .2, .9, 1.9, .35, 0x4a3020); for (const y of [.55, 1.15, 1.75]) v.box(x0 + .12, y, z0 + .15, .96, .06, .45, 0x6b4428);
    body = v.build({ detailShadows: false }); root.add(body);
    lanterns.forEach((l) => root.remove(l)); lanterns = [];
    // A pumpkin on each bench, and three finished ones on the rack.
    for (const bx of BENCH_SPOTS(benches)) lanterns.push(lantern(bx, .83 + .17, z + .4));
    for (const [i, y] of [[0, .58], [1, 1.18], [2, 1.78]]) { const l = lantern(x0 + .6, y + .17, z0 + .38); l.userData.rack = i; lanterns.push(l); }
  }
  function lantern(x, y, z) {
    const g = new THREE.Group(), p = new THREE.Mesh(pumpkinGeo, skin), face = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ color: 0xffd36b, toneMapped: false, transparent: true }));
    p.castShadow = true; face.position.set(0, 0, .215); g.add(p, face); g.position.set(x, y, z); root.add(g); g.userData.face = face; return g;
  }
  return {
    sync(time) {
      const c = state.carvingStand;
      root.visible = !!c?.built;
      if (!c?.built) return;
      const benches = [1, 2, 3, 4, 6][c.benches] ?? 1, key = String(benches);
      if (key !== built) { built = key; build(benches); }
      // Bench lanterns show only while a guest carves there, and light up as the carving nears its end.
      lanterns.forEach((l, i) => {
        if (l.userData.rack !== undefined) { l.userData.face.material.opacity = .75 + Math.sin(time * 3 + i) * .15; l.visible = c.carved > l.userData.rack; return; }
        const k = c.carvers.find((x) => x.bench === i), done = k ? 1 - k.left / k.length : 0;
        l.visible = !!k; l.userData.face.material.opacity = done < .45 ? 0 : Math.min(1, (done - .45) * 2.2) * (.85 + Math.sin(time * 9 + i) * .1);
      });
    },
  };
}
