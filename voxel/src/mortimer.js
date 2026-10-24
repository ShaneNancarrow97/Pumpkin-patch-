import * as THREE from "three";
import { Voxels, seeded } from "./voxels.js";

const SUIT = 0x34243f, LAPEL = 0x57415e, LINING = 0x211b2b, WINE = 0x733347, GOLD = 0xc69c55, SKIN = 0xbac7a5, SHADOW = 0x87967d;
const part = (parent, x, y, z, draw) => { const pivot = new THREE.Group(); pivot.position.set(x, y, z); const voxels = new Voxels(); draw(voxels); pivot.add(voxels.build()); parent.add(pivot); return pivot; };

// Mortimer is one consistent model with articulated limbs. His work animation
// reads the visitor simulation's activity; it never sells a ticket itself.
export function createMortimer() {
  const group = new THREE.Group(), figure = new THREE.Group(); group.add(figure);
  const body = part(figure, 0, 1.18, 0, v => {
    v.block(0, 0, 0, .47, 1.2, .34, SUIT); v.block(0, .08, .2, .3, 1.03, .09, WINE);
    v.block(0, 1.05, .17, .24, .18, .11, 0xe2d9bb);
    for (const side of [-1, 1]) {
      v.block(side * .21, .07, .16, .13, 1.05, .17, SUIT);
      for (let i = 0; i < 5; i++) v.block(side * (.17 - i * .024), .68 + i * .09, .25, .13, .105, .035, LAPEL);
      v.block(side * .16, -.22, -.14, .2, .73, .13, SUIT);
      v.block(side * .16, -.25, -.21, .15, .06, .025, WINE);
    }
    for (let y = .16; y < .96; y += .18) v.block(0, y, .265, .045, .05, .025, GOLD);
    for (let i = 0; i < 6; i++) v.block(.07 + i * .023, .32 + Math.sin(i / 5 * Math.PI) * .05, .27, .035, .025, .025, GOLD);
    // An extravagant bow tie, a pocket square and an old watch chain.
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) v.block(side * (.07 + i * .055), 1.05 - i * .035, .3, .065, .12 + i * .065, .07, i % 2 ? WINE : 0x9a4d67);
    v.block(0, 1.04, .32, .1, .12, .08, GOLD); v.block(-.17, .69, .27, .1, .13, .04, 0xc7b9c8);
  });
  const head = part(figure, 0, 2.42, .01, v => {
    v.block(0, 0, 0, .24, .17, .24, SHADOW); v.block(0, .12, 0, .48, .63, .38, SKIN);
    v.block(0, .12, .1, .35, .55, .27, 0xc4cfb0);
    for (const side of [-1, 1]) {
      v.block(side * .27, .32, 0, .09, .19, .1, SHADOW);
      v.block(side * .13, .46, .215, .16, .13, .025, 0x5c635b);
      v.block(side * .13, .48, .235, .085, .065, .025, 0xffbe57, true);
      v.block(side * .13, .59, .22, .18, .045, .045, 0x4c4b47);
      v.block(side * .2, .16, .2, .075, .11, .055, SHADOW);
    }
    v.block(0, .33, .26, .1, .19, .13, SHADOW); v.block(.025, .34, .33, .09, .07, .04, SKIN);
    v.block(0, .23, .225, .25, .045, .035, 0x5e4f56); v.block(.035, .245, .245, .16, .025, .02, 0xf4e7c7);
    v.block(-.17, .16, -.16, .1, .58, .11, 0x5b5760); v.block(.17, .16, -.16, .1, .58, .11, 0x5b5760);
    v.block(0, .71, 0, .67, .08, .58, LINING); v.block(0, .79, -.015, .48, .6, .43, SUIT);
    v.block(0, .8, -.015, .5, .13, .45, WINE); v.block(.12, .84, .224, .1, .1, .025, GOLD);
    v.block(0, 1.39, -.015, .54, .075, .48, LAPEL);
  });
  const arms = [-1, 1].map(side => part(figure, side * .34, 2.19, 0, v => {
    v.block(0, -.7, 0, .19, .77, .23, SUIT); v.block(0, -.72, .025, .22, .11, .25, LAPEL);
    v.block(0, -.79, .015, .21, .1, .23, 0xe1d7ba); v.block(0, -.96, .035, .18, .2, .18, SKIN);
    for (let i = 0; i < 3; i++) v.block(-.065 + i * .065, -1.04, .08, .045, .12, .06, SHADOW);
    v.block(side * .1, -.91, .08, .06, .13, .065, SKIN);
    for (let y = -.6; y < -.3; y += .09) v.block(side * .105, y, -.07, .025, .035, .025, GOLD);
  }));
  const legs = [-1, 1].map(side => part(figure, side * .14, 1.25, 0, v => {
    v.block(0, -1.13, 0, .2, 1.13, .24, LINING); v.block(-.045, -1.1, .13, .025, 1.03, .025, 0x65546f);
    v.block(0, -1.25, .11, .25, .16, .43, 0x181820); v.block(0, -1.12, .26, .2, .04, .11, 0x5b5360);
  }));
  const duster = part(arms[0], 0, -1, .03, v => {
    v.block(0, -.04, .21, .055, .055, .53, 0x8b613f);
    for (let i = 0; i < 5; i++) v.block((i - 2) * .055, -.08 + Math.sin(i) * .02, .46 + i % 2 * .03, .075, .16, .3, [0xb69abf, 0xe4c9d7, 0x805b9b][i % 3]);
  }); duster.visible = false;
  const coins = part(figure, .27, 1.17, .52, v => { for (let i = 0; i < 3; i++) v.block(i * .065, 0, 0, .09, .055 + i * .035, .09, GOLD); }); coins.visible = false;
  const ticket = part(arms[1], 0, -1, .14, v => { v.block(0, 0, .06, .22, .13, .025, 0xe3ca9b); v.block(0, .035, .08, .14, .025, .015, WINE); }); ticket.visible = false;
  const r = seeded(786), smokeBase = new Float32Array(14 * 3), smokePositions = new Float32Array(14 * 3);
  for (let i = 0; i < 14; i++) smokeBase.set([(r() - .5) * 1.1, .15 + r() * 2.8, (r() - .5) * .7], i * 3);
  const smokeGeo = new THREE.BufferGeometry(); smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePositions, 3));
  const smokeMat = new THREE.PointsMaterial({ color: 0xb17bd9, size: .24, transparent: true, opacity: .5, depthWrite: false, toneMapped: false });
  const smoke = new THREE.Points(smokeGeo, smokeMat); smoke.visible = false; group.add(smoke);
  const idleCycle = ["idle", "idle", "dusting", "idle", "counting", "bow", "idle", "gesture"];
  return {
    group,
    tick(time, activity = "idle") {
      let mode = typeof activity === "string" ? activity : activity?.activity ?? "idle";
      if (mode === "idle") mode = idleCycle[Math.floor(time / 7) % idleCycle.length];
      const vanish = mode === "vanish" || time % 67 > 65.9, puff = (time % 1.1) / 1.1;
      figure.visible = !vanish || puff < .18 || puff > .72; smoke.visible = vanish;
      if (vanish) {
        for (let i = 0; i < 14; i++) {
          smokePositions[i*3] = smokeBase[i*3] * (1 + puff * 1.2) + Math.sin(time * 3 + i) * .07;
          smokePositions[i*3+1] = smokeBase[i*3+1] + puff * .7; smokePositions[i*3+2] = smokeBase[i*3+2] * (1 + puff);
        }
        smokeGeo.attributes.position.needsUpdate = true; smokeMat.opacity = Math.sin(Math.PI * puff) * .55;
      }
      const breath = Math.sin(time * 1.8) * .012, wave = Math.sin(time * 3.5);
      body.position.y = 1.18 + breath; head.position.y = 2.42 + breath;
      body.rotation.x = head.rotation.x = 0; head.rotation.y = Math.sin(time * .45) * .07;
      arms.forEach((arm, i) => { arm.rotation.set(.025 + Math.sin(time * 1.6 + i) * .025, 0, (i ? -1 : 1) * .045); });
      legs.forEach(leg => leg.rotation.set(0, 0, 0)); duster.visible = mode === "dusting"; coins.visible = mode === "counting"; ticket.visible = mode === "selling";
      if (mode === "welcome") { arms[1].rotation.x = -1.2; arms[1].rotation.z = -.5 + wave * .16; head.rotation.y = .12; }
      if (mode === "bow") { body.rotation.x = .16 + Math.sin(time * 1.5) * .07; head.rotation.x = .25; arms[1].rotation.x = -.25; }
      if (mode === "selling") { arms[1].rotation.x = -.85 + Math.sin(time * 6) * .08; arms[1].rotation.z = -.13; head.rotation.x = .13; }
      if (mode === "gesture") { arms[0].rotation.z = .8; arms[0].rotation.x = -.55; head.rotation.y = -.3; }
      if (mode === "counting") { arms[0].rotation.x = -.65; arms[1].rotation.x = -.66 + Math.sin(time * 7) * .12; head.rotation.x = .17; }
      if (mode === "dusting") { arms[0].rotation.x = -.9; arms[0].rotation.y = wave * .26; head.rotation.x = .12; }
      if (mode === "frightened") { head.rotation.x = -.13; head.rotation.y = Math.sin(time * 5) * .14; arms[1].rotation.z = -.65; arms[1].rotation.x = -.55; }
      group.userData.activity = mode; group.userData.vanished = !figure.visible;
    },
  };
}
