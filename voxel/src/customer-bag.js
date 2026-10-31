// One cached voxel prop shared by the farm and indoor customer adapters.
import { Voxels } from "./voxels.js";
let template;
export function customerBag() {
  if (!template) {
    const v = new Voxels();
    v.block(0, 0, 0, .48, .52, .3, 0xa96c3c);
    v.block(0, .08, .157, .4, .36, .025, 0xc18a50);
    v.block(-.23, .03, 0, .03, .44, .27, 0x87542f);
    v.block(.23, .03, 0, .03, .44, .27, 0xd29a5c);
    v.block(0, .5, 0, .5, .035, .32, 0xe2b67a);
    for (const z of [-.1, .1]) {
      for (const x of [-.14, .14]) v.block(x, .53, z, .035, .2, .035, 0x6b3f2c);
      v.block(0, .71, z, .3, .035, .035, 0x6b3f2c);
    }
    v.block(0, .18, .179, .17, .16, .018, 0xf1bd6c);
    v.block(0, .33, .179, .035, .055, .02, 0x66583b);
    template = v.build();
  }
  return template.clone();
}
// Release instance buffers; the cached geometry and materials remain shared.
export function disposeCustomerBag(bag) { bag?.traverse(m => { if (m.isInstancedMesh) m.dispose(); }); }
