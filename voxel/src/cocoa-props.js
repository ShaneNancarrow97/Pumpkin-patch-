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
