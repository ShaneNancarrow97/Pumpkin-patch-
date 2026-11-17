// Physical menu items, built in the same batched voxel kit as the whole farm.
import { Voxels } from "./voxels.js";
const templates = new Map();
export function cocoaProp(id = "cocoa") {
  if (!templates.has(id)) {
    const v = new Voxels();
    if (id === "smores-platter") {
      v.block(0, 0, 0, .94, .035, .72, 0x8c633e);v.block(0, .035, 0, .86, .02, .65, 0xe6d2aa);
      for(const [x,z]of [[-.28,-.11],[0,-.13],[.28,-.1]]){
        v.block(x,.055,z,.24,.045,.27,0xc38f53);v.block(x,.1,z,.22,.045,.25,0x4c2923);
        v.block(x,.145,z,.2,.1,.23,0xf2ddbb);v.block(x,.245,z,.24,.045,.27,0xdba966);
        for(const dx of [-.055,.055])v.block(x+dx,.29,z,.025,.01,.035,0xa1703b);
      }
      v.block(.1,.055,.2,.23,.11,.18,0xa87c45);v.block(.1,.165,.2,.18,.015,.13,0x8b482b);
      for(const x of [-.32,-.23,-.13])v.block(x,.06,.2,.045,.03,.09,0x5f3627);
    } else if (id === "smores") {
      v.block(0, 0, 0, .55, .035, .44, 0xb47b45);
      v.block(0, .035, 0, .44, .09, .34, 0xdca563);
      v.block(0, .125, 0, .46, .06, .36, 0x4b2921);
      v.block(0, .185, 0, .37, .15, .31, 0xf5dcb3);
      v.block(0, .32, 0, .44, .09, .34, 0xe7b975);
      for (const x of [-.14, 0, .14]) for (const z of [-.1, .03, .12]) v.block(x, .41, z, .035, .008, .025, 0xb77d40);
      for (const x of [-.075, .075]) v.block(x, .255, .16, .03, .04, .012, 0x48302a);
      v.block(0, .205, .16, .03, .04, .012, 0x48302a);
    } else {
      const deluxe = ["deluxe", "midnight", "ghost-wafer", "caramel-flake"].includes(id), purple = id === "midnight" ? 0x30203d : id === "ghost-wafer" ? 0x74608e : id === "caramel-flake" ? 0x8b4e32 : id === "flake" ? 0x986148 : 0x583345;
      v.block(0, 0, 0, .29, .035, .29, 0x352736);
      v.block(0, .035, 0, .33, .31, .33, purple);
      v.block(0, .34, 0, .36, .035, .36, 0xc29568);
      v.block(0, .375, 0, .28, .02, .28, 0x4a2920);
      for (const y of [.1, .29]) v.block(.24, y, 0, .15, .045, .07, purple);
      v.block(.3, .1, 0, .045, .23, .07, purple);
      v.block(0, .11, .172, .15, .16, .012, 0xe5d7be);
      v.block(0, .25, .172, .11, .035, .012, 0xe5d7be);
      for (const x of [-.035, .035]) v.block(x, .205, .18, .023, .03, .01, 0x3e2b30);
      v.block(0, .145, .18, .024, .035, .01, 0x3e2b30);
      if (id === "flake") { v.block(-.05, .395, 0, .2, .07, .2, 0xffe6c4); for (let i=0;i<3;i++) v.block(-.07+i*.045,.46,0,.025,.27,.06,0x583124); }
      if (id === "midnight") { for (let i=0;i<4;i++) { v.block(-.1+i*.06,.37,-.18,.035,.08+(i%2)*.07,.025,0xd48b39); v.block(.18,.25+i*.035,.05,.025,.025,.09,0xd48b39); } }
      if (deluxe) {
        for (const [size,y] of [[.29,.395],[.23,.46],[.16,.52],[.08,.58]]) v.block(0, y, 0, size, .065, size, 0xffe6c4);
        for (const x of [-.115,.1]) { v.block(x, .41, .08, .12, .12, .12, 0xf1d6ae); v.block(x, .53, .08, .08, .04, .1, 0xf1d6ae); v.block(x-.025,.475,.145,.018,.025,.012,0x49302c); v.block(x+.025,.475,.145,.018,.025,.012,0x49302c); }
        v.block(-.1,.6,-.06,.05,.23,.06,0x5a3024);
        for (const y of [.43,.51,.59]) v.block(.025,y,.12,.1,.02,.015,0xc07836);
      }
      if(id === "ghost-wafer"){
        v.block(.095,.51,-.07,.14,.41,.045,0xcda265);
        for(let i=0;i<5;i++)v.block(.095,.54+i*.073,-.044,.11,.012,.008,0x9f7547);
        v.block(.095,.54,-.043,.012,.33,.01,0x9f7547);
        v.block(-.04,.65,.02,.1,.13,.1,0xf6e6c7);v.block(-.04,.78,.02,.065,.035,.09,0xf6e6c7);
        for(const x of [-.062,-.02])v.block(x,.72,.075,.016,.023,.009,0x40302d);
      }
      if(id === "caramel-flake"){
        for(const x of [-.09,.04])for(let i=0;i<3;i++)v.block(x+i*.018,.62,-.06,.016,.29,.045,0x5d3026);
        for(const y of [.45,.52,.59]){v.block(.06,y,.14,.13,.018,.015,0xcd8b3f);v.block(-.13,y,-.01,.018,.04,.13,0xcd8b3f);}
        v.block(0,.045,0,.41,.035,.4,0xc49153);
      }
    }
    const model = v.build(); model.traverse(m => { if (m.material) m.material.userData.sharedCocoa = true; });
    templates.set(id, model);
  }
  return templates.get(id).clone();
}

// A takeaway cup, as guests carry it and Sandy stacks it, built from fine
// voxels a little over a centimetre across so it stays detailed at its small
// size: round layers of white paper narrowing to the base, a sleeve in the
// drink's colour with Sandy's orange badge and a seam, and a black lid with a
// stepped rim, a low dome and a sip spout at the front.
const SLEEVES = { cocoa: 0xa8794a, flake: 0x7a4a32, deluxe: 0x6a3a7a, midnight: 0x2e2238, "ghost-wafer": 0x74608e, "caramel-flake": 0x8b4e32 };
const U = .0125;
// A round layer as rows of boxes, `r` units across the middle.
function disc(v, y, r, h, colour) {
  for (let dz = -Math.floor(r); dz <= Math.floor(r); dz++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dz * dz)));
    if (half > 0) v.block(0, y, dz * U, half * 2 * U, h, U, colour);
  }
}
export function takeawayCup(kind = "cocoa") {
  const id = "takeaway:" + (SLEEVES[kind] ? kind : "cocoa");
  if (!templates.has(id)) {
    const v = new Voxels(), sleeve = SLEEVES[id.slice(9)], dark = sleeve === 0xa8794a ? 0x8e6238 : 0x1e1820, layers = 15;
    for (let i = 0; i < layers; i++) {
      const r = 4.4 + 1.7 * i / (layers - 1), y = i * U, band = i >= 5 && i <= 10;
      disc(v, y, band ? r + .55 : r, U, band ? sleeve : [0xe4ddd0, 0xebe5da, 0xf1ece3, 0xf6f2ea, 0xfaf7f1][Math.min(4, i >> 2)]);
      if (i === 0) disc(v, y - U * .4, r - .6, U * .4, 0xd2c9bb);
    }
    // The sleeve's seam, and Sandy's badge on the front: an orange roundel with a dark pumpkin face.
    for (let i = 5; i <= 10; i++) v.block(-(4.4 + 1.7 * i / 14 + .3) * U * .72, i * U, -(4.4 + 1.7 * i / 14 + .3) * U * .72, U, U, U, dark);
    const front = 5.8 * U;                                                       // on the sleeve's front row
    for (const [x, y, c] of [[-1, 6, 0xf08a28], [0, 6, 0xf08a28], [1, 6, 0xf08a28], [-1, 7, 0xf08a28], [0, 7, 0x2a1a22], [1, 7, 0xf08a28], [-1, 8, 0x2a1a22], [0, 8, 0xf08a28], [1, 8, 0x2a1a22], [-1, 9, 0xf08a28], [0, 9, 0xf08a28], [1, 9, 0xf08a28], [0, 10, 0x4f7a3a]]) v.block(x * U, y * U, front, U, U, U * .6, c);
    if (id.endsWith("midnight")) disc(v, 10.6 * U, 6.1 + .2, U * .4, 0xd8a94a);
    // The lid.
    const top = layers * U;
    disc(v, top, 6.6, U, 0x1c1a1e); disc(v, top + U, 6.1, U * .6, 0x2a272e); disc(v, top + U * 1.6, 5.2, U * .8, 0x232026);
    for (const [x, z, h, c] of [[0, 4, 1.4, 0x1c1a1e], [-1, 4, 1.2, 0x1c1a1e], [1, 4, 1.2, 0x1c1a1e], [0, 3, 1.2, 0x1c1a1e], [0, 4, .2, 0x070607]]) v.block(x * U, top + U * (h === .2 ? 3.8 : 2.4), z * U, U, U * h, U, c);
    const model = v.build(); model.traverse(m => { if (m.material) m.material.userData.sharedCocoa = true; });
    templates.set(id, model);
  }
  return templates.get(id).clone();
}
