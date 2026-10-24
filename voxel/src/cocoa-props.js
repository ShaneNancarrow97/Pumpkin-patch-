// Physical menu items, built in the same batched voxel kit as the whole farm.
import { Voxels } from "./voxels.js";
const templates = new Map();
export function cocoaProp(id = "cocoa") {
  if (!templates.has(id)) {
    const v = new Voxels();
    if (id === "smores") {
      v.block(0, 0, 0, .55, .035, .44, 0xb47b45);
      v.block(0, .035, 0, .44, .09, .34, 0xdca563);
      v.block(0, .125, 0, .46, .06, .36, 0x4b2921);
      v.block(0, .185, 0, .37, .15, .31, 0xf5dcb3);
      v.block(0, .32, 0, .44, .09, .34, 0xe7b975);
      for (const x of [-.14, 0, .14]) for (const z of [-.1, .03, .12]) v.block(x, .41, z, .035, .008, .025, 0xb77d40);
      for (const x of [-.075, .075]) v.block(x, .255, .16, .03, .04, .012, 0x48302a);
      v.block(0, .205, .16, .03, .04, .012, 0x48302a);
    } else {
      const deluxe = id === "deluxe" || id === "midnight", purple = id === "midnight" ? 0x30203d : id === "flake" ? 0x986148 : 0x583345;
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
    }
    const model = v.build(); model.traverse(m => { if (m.material) m.material.userData.sharedCocoa = true; });
    templates.set(id, model);
  }
  return templates.get(id).clone();
}

// A takeaway cup, as guests carry it and Sandy stacks it: a white paper cup
// narrower at the base, a sleeve in the drink's colour with Sandy's pumpkin
// badge, and a black lid with a sip spout at the front.
const SLEEVES = { cocoa: 0xa8794a, flake: 0x7a4a32, deluxe: 0x6a3a7a, midnight: 0x2e2238 };
export function takeawayCup(kind = "cocoa") {
  const id = "takeaway:" + (SLEEVES[kind] ? kind : "cocoa");
  if (!templates.has(id)) {
    // Taller than life, since the farm's camera looks down on it.
    const v = new Voxels(), sleeve = SLEEVES[id.slice(9)], paper = [0xe6dfd2, 0xebe5d9, 0xf0ebe1, 0xf4efe6, 0xf7f3eb, 0xf9f6f0, 0xfbf9f4];
    for (let i = 0; i < 7; i++) v.block(0, i * .06, 0, .15 + i * .022, .06, .15 + i * .022, paper[i]);
    v.block(0, 0, 0, .13, .008, .13, 0xd6cdbf);
    // The sleeve round the middle, tapering with the cup, with a badge and a seam.
    v.block(0, .15, 0, .222, .07, .222, sleeve); v.block(0, .22, 0, .262, .08, .262, sleeve);
    if (id.endsWith("midnight")) v.block(0, .295, 0, .266, .01, .266, 0xd8a94a);
    v.block(0, .19, .122, .07, .075, .008, 0xf08a28); v.block(0, .21, .127, .032, .034, .006, 0x2a1a22);
    v.block(-.114, .16, .096, .012, .13, .012, sleeve === 0xa8794a ? 0x8e6238 : 0x1e1820);
    // The lid: a thin rim flush with the lip, a low dome, and the spout with its sip hole.
    v.block(0, .42, 0, .29, .02, .29, 0x1c1a1e); v.block(0, .44, 0, .25, .014, .25, 0x232026);
    v.block(0, .454, .08, .056, .016, .046, 0x1c1a1e); v.block(0, .47, .09, .026, .004, .013, 0x070607);
    // Half the size it's modelled at: a small cup in a guest's hand.
    const model = v.build(); model.scale.setScalar(.5); model.traverse(m => { if (m.material) m.material.userData.sharedCocoa = true; });
    templates.set(id, model);
  }
  return templates.get(id).clone();
}
