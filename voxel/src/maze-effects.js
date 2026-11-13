import * as THREE from "three";
import { Voxels } from "./voxels.js";

const BONE = 0xd5ced8, IRON = 0x302936, BRASS = 0xaa7950, PLUM = 0x765184, TEAL = 0x92cfc9;
const SILK = 0xd9dbe6, SPECTRE = 0xa9dfe6, GILT = 0xc9a15e, COPPER = 0xb8693a, ROBE = [0x4b3a60, 0x5d4876, 0x3a2c4c];
const ID_LIST = ["cobweb-canopy", "whispering-portraits", "spectral-parade", "thunder-chamber", "phantom-finale"];

// Small blocks laid along a straight line, for silk, chains and arcs.
function strand(put, a, b, step = .085) {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
  for (let i = 0; i <= n; i++) { const t = i / n; put(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, i); }
}
// A spider: rounded abdomen with a red hourglass, eight jointed legs, and
// four small glowing eyes.
function spider(v) {
  v.block(0, 0, -.06, .26, .2, .24, IRON); v.block(0, .03, -.06, .2, .26, .18, 0x241e29); v.block(0, .21, -.06, .07, .05, .03, 0x9b2a2a); v.block(0, .26, -.06, .04, .03, .03, 0x9b2a2a);
  v.block(0, .03, .11, .17, .13, .13, 0x3a3140);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { const z = .14 - i * .07; v.block(side * .16, .1, z, .13, .03, .03, IRON); v.block(side * .25, .1, z, .03, .09, .03, IRON); v.block(side * .3, .0 - i * .01, z + (i - 1.5) * .02, .09, .03, .03, IRON); }
  for (const x of [-.045, .045]) { v.block(x, .1, .18, .03, .03, .02, 0xff5a5a, true); v.block(x * .6, .07, .18, .022, .022, .02, 0xff8a6a, true); }
}
// A spectre: a rounded hood and sheet that frays into a wavy hem, arms
// reaching forward, hollow eyes and an open mouth. A top hat or a bonnet
// tells the visitors apart. Bodies glow; faces and hats are solid.
function spectre(v, { hat = false, bonnet = false, scale = 1 } = {}) {
  const k = scale, g = (x, y, z, w, h, d, c = SPECTRE) => v.block(x * k, y * k, z * k, w * k, h * k, d * k, c, true), dark = (x, y, z, w, h, d, c = 0x1a1626) => v.block(x * k, y * k, z * k, w * k, h * k, d * k, c);
  const fade = y => new THREE.Color(0x3a7c8c).lerp(new THREE.Color(0x9ad8e2), Math.min(1, Math.max(0, y / .8))).getHex();
  for (const [y, w, d] of [[.94, .28, .24], [.86, .42, .34], [.78, .48, .38], [.7, .5, .4], [.62, .52, .38], [.54, .56, .36], [.46, .6, .34], [.38, .64, .32], [.3, .68, .3], [.22, .7, .28]]) g(0, y, 0, w, .085, d, fade(y));
  [[-.28, .2], [-.14, .12], [0, .22], [.14, .1], [.28, .17]].forEach(([x, h], i) => g(x, .22 - h, (i % 2) * .04 - .02, .13, h, .2, fade(.05)));
  for (const side of [-1, 1]) { g(side * .35, .5, .08, .14, .12, .2, fade(.5)); g(side * .4, .47, .22, .12, .1, .16, fade(.5)); g(side * .42, .45, .33, .1, .09, .08, 0xb8e8ee); for (const f of [-.03, .03]) g(side * .42 + f, .41, .38, .025, .05, .04, 0xb8e8ee); }
  for (const side of [-1, 1]) { dark(side * .1, .77, .2, .1, .12, .03); g(side * .1, .8, .215, .03, .03, .02, 0xe9fbff); }
  dark(0, .64, .2, .1, .09, .03);
  if (hat) { dark(0, 1.02, 0, .46, .04, .38, 0x2a2234); dark(0, 1.06, 0, .28, .24, .24, 0x2a2234); dark(0, 1.08, 0, .29, .05, .25, PLUM); }
  if (bonnet) { dark(0, .97, -.02, .5, .08, .4, 0x8a6aa0); for (const side of [-1, 1]) dark(side * .25, .7, .06, .06, .3, .3, 0x8a6aa0); dark(0, .58, .2, .05, .1, .03, 0xc9a7d8); }
}
// An ornate gilt portrait whose eyes wake: crest, corner rosettes, a bust
// on a dark ground and a brass name plate. `kind` picks the sitter.
function portrait(v, kind, w = .8, h = 1.02) {
  const ground = [0x22302a, 0x3a1f2a, 0x1e2236][kind];
  v.block(0, 0, 0, w + .16, h + .16, .1, GILT); v.block(0, .05, .03, w + .02, h + .06, .09, BRASS); v.block(0, .08, .08, w - .06, h, .04, ground);
  for (const x of [-1, 1]) for (const y of [0, 1]) v.block(x * (w / 2 + .05), y * (h + .06) - .02, .07, .12, .12, .08, 0xe8c98a);
  for (let i = 0; i < 3; i++) v.block(0, h + .14 + i * .07, .02, .34 - i * .11, .08, .1, GILT); v.block(0, h + .35, .02, .06, .06, .06, 0xe8c98a);
  v.block(0, .1, .1, w * .7, h * .32, .03, [0x2c2430, 0x4b2a3a, 0x2d3348][kind]);
  v.block(0, .1 + h * .3, .11, w * .14, h * .08, .03, 0xc7b39a);
  const face = .1 + h * .38; v.block(0, face, .11, w * .32, h * .3, .03, 0xc7b39a);
  v.block(0, face + h * .26, .12, w * .38, h * .1, .03, [0x3b2a22, 0x1d1714, 0x6b5a48][kind]);
  if (kind === 0) for (const side of [-1, 1]) v.block(side * w * .17, face + h * .08, .12, w * .06, h * .2, .03, 0x3b2a22);
  if (kind === 1) v.block(0, face + h * .06, .125, w * .16, h * .025, .02, 0x1d1714);
  if (kind === 2) { v.block(0, face + h * .36, .12, w * .3, h * .12, .03, 0x15121a); v.block(0, face + h * .34, .12, w * .44, h * .03, .03, 0x15121a); }
  if (kind === 0) for (let i = -2; i <= 2; i++) v.block(i * w * .05, .1 + h * .3, .13, .025, .025, .02, 0xeee6dc);
  for (const side of [-1, 1]) { v.block(side * w * .07, face + h * .17, .125, w * .07, h * .045, .02, 0x110d14); v.block(side * w * .07, face + h * .17, .135, w * .035, h * .03, .015, 0xf2d27a, true); }
  v.block(0, -.02, .08, w * .34, .07, .04, 0xd8b078);
}

// All prefabs mount above the guest lanes. Fixed instances are batched; only
// a handful of whole props move, so toggling a haunt never adds point lights.
// Each one keeps clear of the foyer's fixed pieces: the maze door and its
// sign, the stair landing, the windows, the painting and the chandelier.
export function buildMazePrefab(id, layout) {
  const group = new THREE.Group(); group.name = id; group.userData.prefabId = id;
  const movers = [], W = layout.w / 2, D = layout.d / 2, door = layout.mazeDoor?.x ?? W - 2, stairs = layout.stairs ?? { x: -W + 1.15, z: -D + 1.5, w: 1.8, d: 2.6 };
  const piece = (name, x, y, z, fill, motion = null) => {
    const voxels = new Voxels(); fill(voxels);
    const object = voxels.build({ shadows: false }); object.traverse(m=>{if(m.material?.isMeshBasicMaterial)m.material.color.multiplyScalar(1.35);}); object.name = name; object.position.set(x,y,z); group.add(object);
    if(motion)movers.push({ object, motion, x, y, z }); return object;
  };
  if(id === "cobweb-canopy") {
    // Two corner webs strung across the back corners, spokes and rings with a
    // few dew drops catching the light, and a spider dropping from each.
    piece("Corner webs", 0, 0, 0, v => {
      const silk = (x, y, z) => v.block(x, y, z, .035, .035, .035, SILK);
      for (const side of [-1, 1]) {
        const top = 4.72, at = (a, rho) => [side * (W - rho * Math.cos(a) * .72), top - rho * Math.sin(a), -D + .04 + rho * Math.cos(a) * .72];
        const spokes = [0, .3, .6, .9, 1.2, Math.PI / 2];
        for (const a of spokes) strand(silk, at(a, .1), at(a, 1.22));
        for (const rho of [.3, .52, .74, .96, 1.18]) for (let i = 1; i < spokes.length; i++) strand(silk, at(spokes[i - 1], rho * (i % 2 ? 1 : .94)), at(spokes[i], rho * (i % 2 ? .94 : 1)), .09);
        for (const [a, rho] of [[.3, .52], [.9, .74], [.6, .96], [1.2, .3], [0, 1.18]]) { const [x, y, z] = at(a, rho); v.block(x, y - .04, z, .045, .06, .045, 0xe8f4ff, true); }
        strand(silk, at(.6, .74), [side * (W - .55), 3.62, -D + .6], .1);
      }
    });
    for (const side of [-1, 1]) piece("Dangling spider", side * (W - .55), 3.32, -D + .6, v => { v.block(0, .24, 0, .018, .28, .018, SILK); spider(v); }, "spider");
  } else if(id === "whispering-portraits") {
    // Two sitters climb the staircase wall and a third watches from beside
    // the landing; all three tilt as if listening.
    const climb = z => (stairs.z + stairs.d / 2 - z) / (stairs.d / 10) * .27;
    [[-D + .72, 0], [-D + 1.6, 1]].forEach(([z, kind]) => { const p = piece("Whispering portrait", -W + .1, Math.max(2.5, climb(z) + 1), z, v => portrait(v, kind, .7, .9), "portrait"); p.rotation.y = Math.PI / 2; });
    piece("Whispering portrait", (stairs.x + stairs.w / 2 + .1 + -2.11) / 2, 2.62, -D + .2, v => portrait(v, 2, .8, 1.02), "portrait");
  } else if(id === "spectral-parade") {
    // A lady, a gentleman and a child drift out of the maze door towards the
    // stairs, with wisps trailing behind them.
    [[door - 1.3, 2.6, -D + 1.5, { bonnet: true }], [door - 3.2, 2.85, -D + 2.2, { hat: true }], [door - 4.9, 3.1, -D + 2.7, { scale: .72 }]].forEach(([x, y, z, look]) => piece("Parading spirit", Math.max(-W + .6, x), y, z, v => spectre(v, look), "ghost"));
    for (const [x, y, z] of [[door - .7, 3.1, -D + 1.1], [door - 2.3, 3.45, -D + 1.9]]) piece("Parade wisp", x, y, z, v => { v.block(0, 0, 0, .16, .16, .16, 0xc6f0f5, true); v.block(0, .03, 0, .24, .1, .1, SPECTRE, true); v.block(.12, -.04, 0, .1, .06, .06, 0x8fcbd4, true); }, "ghost");
  } else if(id === "thunder-chamber") {
    // Two brass Tesla coils between the painting and the maze door, an arc
    // crackling between their crowns and three runes glowing on the wall.
    const centre = (.75 + door - 1.4) / 2, gap = .72;
    piece("Storm coils", centre, 2.62, -D + .3, v => {
      for (const side of [-1, 1]) {
        const x = side * gap;
        v.block(x, 0, -.08, .5, .1, .36, BRASS); v.block(x, .1, 0, .34, .16, .34, IRON);
        for (let y = .28; y < 1; y += .07) { v.block(x, y, 0, .3, .045, .3, COPPER); v.block(x, y + .045, 0, .22, .025, .22, 0x3b2a22); }
        v.block(x, .26, 0, .06, .76, .06, TEAL, true);
        v.block(x, 1, 0, .14, .12, .14, 0x9fb8c0); v.block(x, 1.12, 0, .2, .04, .2, BRASS);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; v.block(x + Math.cos(a) * .24, 1.2, Math.sin(a) * .24, .12, .1, .12, 0xc0bcc8); }
        v.block(x, 1.2, 0, .14, .14, .14, 0xd9fbff, true);
      }
      const rune = (x, y, rows) => rows.forEach((row, j) => [...row].forEach((bit, i) => bit === "1" && v.block(x + (i - 2) * .05, y - j * .05, -.12, .045, .045, .02, TEAL, true)));
      rune(-.38, .62, ["00100", "01000", "11110", "00100", "01000"]); rune(0, .66, ["01110", "10001", "10101", "10001", "01110"]); rune(.38, .62, ["00100", "01010", "10001", "11111", "00000"]);
    });
    piece("Quiet lightning", centre, 3.83, -D + .3, v => {
      let y = 0;
      for (let i = 0; i <= 14; i++) { const x = -gap + .2 + i * (2 * gap - .4) / 14, next = i === 14 ? 0 : Math.sin(i * 2.7) * .1 + Math.cos(i * 1.3) * .05; v.block(x, Math.min(y, next) - .01, 0, .11, Math.abs(next - y) + .05, .04, 0xeaffff, true); v.block(x, Math.min(y, next) - .03, -.02, .15, Math.abs(next - y) + .09, .03, TEAL, true); y = next; }
    }, "electric");
  } else if(id === "phantom-finale") {
    // A hooded phantom rises from the dark landing at the top of the stairs
    // under a violet arch. It is jointed: the robe sways as it rises and
    // sinks, the skull looks about, each bony arm reaches on its own rhythm,
    // the ragged hem flutters, and its eyes and chest glow pulse.
    piece("Finale arch", stairs.x, 2.55, -D + .3, v => {
      const half = stairs.w / 2 + .22;
      for (const side of [-1, 1]) v.block(side * half, 0, 0, .07, 1.62, .05, 0xb48ae8, true);
      for (let i = 0; i < 9; i++) { const x = half * (1 - i / 9); for (const side of [-1, 1]) v.block(side * x, 1.62 + .5 * (1 - (x / half) ** 1.5), 0, .1, .08, .05, 0xb48ae8, true); }
      for (const [x, y] of [[-.7, 1.2], [.75, .9], [-.4, .35], [.5, 1.45], [-.85, .6], [.2, 1.75]]) v.block(x, y, .35, .06, .1, .06, 0xd9a8ff, true);
    });
    const robe = (v, x, y, z, w, h, d, i) => v.block(x, y, z, w, h, d, ROBE[i % 2]);
    const body = piece("The final phantom", stairs.x, 2.72, -D + .78, v => {
      [[.14, 1.02, .42], [.28, .96, .42], [.42, .9, .44], [.56, .84, .44], [.7, .8, .46], [.84, .82, .46]].forEach(([y, w, d], i) => robe(v, 0, y, 0, w, .15, d, i));
      v.block(0, .97, 0, .92, .12, .5, ROBE[2]); for (const side of [-1, 1]) v.block(side * .4, .93, .05, .14, .1, .3, ROBE[2]);
      for (const [x, h] of [[-.34, .62], [-.17, .7], [.17, .66], [.34, .58]]) v.block(x, .15, .22, .045, h, .02, ROBE[2]);
      v.block(0, .6, .23, .84, .05, .03, 0x8a6a3e); v.block(.12, .44, .24, .04, .16, .03, 0x8a6a3e); v.block(.12, .41, .24, .07, .05, .04, 0x8a6a3e);
      v.block(0, .74, .23, .14, .16, .03, 0x120c18); v.block(0, .78, .245, .07, .08, .02, 0xd9a8ff, true);
      [[.84, .82], [.56, .84], [.28, .96]].forEach(([y, w]) => { for (const side of [-1, 1]) v.block(side * (w / 2 + .01), y, .1, .03, .15, .2, 0x9d6fd8, true); });
    }, "phantom-body");
    const head = piece("Phantom hood", 0, 1.08, 0, v => {
      [[.02, .52, .5], [.14, .6, .54], [.28, .62, .56], [.42, .56, .52], [.54, .44, .46], [.64, .26, .34]].forEach(([y, w, d], i) => robe(v, 0, y, -.02, w, .13, d, i));
      v.block(0, .72, -.08, .12, .1, .18, ROBE[1]);
      v.block(0, .05, .2, .42, .46, .1, 0x07050a);
      v.block(0, .12, .25, .26, .3, .06, BONE); for (const side of [-1, 1]) v.block(side * .12, .22, .26, .06, .07, .05, 0xc9bda6);
      v.block(0, .06, .26, .18, .08, .06, 0xb9ae9c); for (let i = -2; i <= 2; i++) v.block(i * .03, .07, .295, .018, .04, .02, 0x2a2230);
      v.block(0, .17, .29, .04, .05, .02, 0x2a2230);
      for (const side of [-1, 1]) { v.block(side * .065, .27, .28, .08, .07, .03, 0x120c18); v.block(side * .065, .28, .295, .045, .04, .02, 0xd9a8ff, true); v.block(side * .065, .29, .305, .018, .018, .01, 0xffffff, true); }
      v.block(0, .4, .25, .46, .05, .06, ROBE[2]);
    }, "phantom-head");
    body.add(head);
    for (const side of [-1, 1]) {
      const arm = piece("Phantom arm", side * .4, .96, 0, v => {
        [[.08, .05, .26, .24, .3], [.2, .18, .26, .24, .3], [.3, .32, .24, .22, .28], [.38, .46, .24, .22, .26]].forEach(([x, y, w, h, d], i) => robe(v, side * x, y, 0, w, h, d, i));
        v.block(side * .44, .56, 0, .3, .2, .3, ROBE[2]); for (const [x, h] of [[.36, .12], [.46, .18], [.54, .1]]) v.block(side * x, .56 - h, .1, .06, h, .06, ROBE[2]);
        v.block(side * .48, .7, .02, .08, .12, .08, BONE); v.block(side * .5, .8, .03, .13, .1, .1, BONE);
        for (let i = 0; i < 4; i++) { const x = side * (.455 + i * .03); v.block(x, .89, .04, .022, .1, .022, BONE); v.block(x + side * .006, .98, .055, .02, .06, .02, 0xc9bda6); }
        v.block(side * .43, .82, .06, .022, .08, .022, BONE);
      }, "phantom-arm");
      arm.userData.side = side; movers.at(-1).side = side; body.add(arm);
    }
    const hem = piece("Phantom hem", 0, .14, 0, v => {
      [[-.45, .17], [-.33, .1], [-.21, .2], [-.09, .12], [.03, .22], [.15, .09], [.27, .18], [.39, .11], [.48, .15]].forEach(([x, h], i) => v.block(x, -h, .02 * (i % 3), .12, h, .38, ROBE[i % 3]));
    }, "phantom-hem");
    body.add(hem);
  }
  group.userData.movers=movers;group.userData.knownPrefab=ID_LIST.includes(id);return group;
}

// Slow, continuous motion is deliberate: atmosphere rather than flashing effects.
export function animateMazePrefab(group, time, reducedMotion=false) {
  for(const [i,p] of (group.userData.movers??[]).entries()) {
    const t=reducedMotion?0:time;
    if(p.motion==="spider") {p.object.position.y=p.y-Math.sin(t*.62+i)*.16;p.object.rotation.z=Math.sin(t*.8+i)*.035;}
    if(p.motion==="portrait")p.object.rotation.z=Math.sin(t*.48+i*2)*.045;
    if(p.motion==="ghost") {p.object.position.set(p.x+Math.sin(t*.47+i*1.8)*.26,p.y+Math.sin(t*.78+i)*.16,p.z);p.object.rotation.y=Math.sin(t*.36+i)*.2;}
    if(p.motion==="electric") {p.object.scale.y=.78+Math.sin(t*.65)*.14;p.object.position.y=p.y+Math.sin(t*.45)*.04;}
    if(p.motion==="finale") {p.object.position.y=p.y+Math.sin(t*.46)*.16;p.object.rotation.y=Math.sin(t*.33)*.12;}
    // The phantom: the robe rises, sinks and sways and carries its parts.
    if(p.motion==="phantom-body") {p.object.position.y=p.y+Math.sin(t*.46)*.16;p.object.rotation.y=Math.sin(t*.33)*.12;p.object.rotation.z=Math.sin(t*.7)*.03;}
    if(p.motion==="phantom-head") {p.object.rotation.y=Math.sin(t*.52)*.38;p.object.rotation.x=Math.sin(t*.81)*.07-.04;}
    if(p.motion==="phantom-arm") {p.object.rotation.z=p.side*(Math.sin(t*.9+(p.side>0?0:1.7))*.26-.06);p.object.rotation.x=Math.sin(t*.6+p.side)*.12;}
    if(p.motion==="phantom-hem") {p.object.rotation.y=Math.sin(t*1.3)*.07;p.object.scale.x=1+Math.sin(t*2.1)*.05;}
    if(p.motion?.startsWith("phantom-")&&p.motion!=="phantom-arm"&&p.motion!=="phantom-hem") p.object.traverse(m=>{if(m.material?.isMeshBasicMaterial){m.userData.base??=m.material.color.clone();m.material.color.copy(m.userData.base).multiplyScalar(.72+.28*Math.sin(t*2.3+(p.motion==="phantom-head"?0:1)));}});
  }
}
