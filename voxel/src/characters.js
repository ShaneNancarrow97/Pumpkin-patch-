import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";

// The visiting neighbours, built by hand in a small voxel grid (V world units
// per voxel) facing +z (towards the camera), feet at y = 0. Shane, Natalie and
// Skyla are voxelised from their sprites instead (sprite-voxels.js).
export const V = 0.13;

const C = {
  natalieSkin: 0xf8b888, natalieBlush: 0xe8965f, natalieHair: 0x16100e, natalieHairHi: 0x2e1d14,
  sweater: 0x604625, jeans: 0x2c2320, boots: 0x1c1412, stitch: 0xd9b54a, belt: 0x231c1a, silver: 0xb8b4ae,
  gold: 0xd9a35a, iris: 0x6f8fb5, lips: 0xb9503f, nails: 0x1a1214, tattoo: 0x6a6266,
  shaneSkin: 0xf9a06e, shaneBlush: 0xee875b, auburn: 0x904829, goatee: 0x974f26, beanie: 0x1a1210,
  hoodie: 0x201716, jacket: 0x392c28, jacketHi: 0x4a3a34, cargo: 0x231a19, shoe: 0x1e1615, sole: 0xe8ccb2,
  stripe: 0xf2ede6, trowelWood: 0xa97b61, trowelBlade: 0x6c5447, rust: 0x8a4a2a, eyeBrown: 0x5a3420,
  white: 0xf7f3ec, dark: 0x120c10, pumpkin: 0xf0821e, stem: 0x5a4a1e,
};

// A part: boxes in voxel units, returned as a group whose origin is the pivot.
function part(pivot, draw) {
  const v = new Voxels(), add = (x, y, z, w, h, d, color, glow) => v.box((x - pivot[0]) * V, (y - pivot[1]) * V, (z - pivot[2]) * V, w * V, h * V, d * V, color, glow);
  draw(add);
  const g = v.build();
  g.position.set(pivot[0] * V, pivot[1] * V, pivot[2] * V);
  return g;
}

// A knit or denim texture: a slab of slightly varied voxels.
function texture(add, x, y, z, w, h, d, color, amount, seed) {
  const r = seeded(seed);
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) add(x + i, y + j, z, 1, 1, d, vary(color, amount, r));
}

function pumpkinVoxels(add, cx, cy, cz, rx, ry, color, seed) {
  const r = seeded(seed);
  for (let x = -rx; x < rx; x++) for (let y = 0; y < ry * 2; y++) for (let z = -rx; z < rx; z++) {
    const nx = (x + 0.5) / rx, ny = (y + 0.5 - ry) / ry, nz = (z + 0.5) / rx;
    if (nx * nx + ny * ny + nz * nz > 1) continue;
    const rib = Math.abs(Math.sin(Math.atan2(nz, nx) * 3)) < 0.25;
    add(cx + x, cy + y, cz + z, 1, 1, 1, vary(rib ? 0xc8641e : color, 0.06, r));
  }
  add(cx - 0.5, cy + ry * 2, cz - 0.5, 1, 1.4, 1, C.stem);
}

// The neighbours. kind: 0 ghost, 1 witch, 2 vampire, 3 skeleton, 4 scarecrow.
export function buildVisitor(kind) {
  const root = new THREE.Group();
  const body = part([0, 0, 0], (add) => {
    if (kind === 0) {
      add(-3.4, 0.6, -3, 6.8, 9, 6, C.white);                                // sheet body
      for (let i = -3; i < 3; i += 2) add(i + 0.2, 0, -2.8, 1.6, 0.8, 5.6, C.white); // wavy hem
      add(-1.6, 6.4, 3.0, 0.8, 1, 0.1, C.dark); add(0.8, 6.4, 3.0, 0.8, 1, 0.1, C.dark);
      add(-0.6, 5.4, 3.0, 1.2, 0.3, 0.1, C.dark);                            // little smile
      add(-3.6, 4.4, -3.2, 7.2, 1.2, 6.4, 0x8a3f22);                         // rust scarf
      add(1.8, 2.2, 3.0, 1.2, 2.4, 0.6, 0x5b2a4a);
      add(-4.6, 9.4, -4, 9.2, 0.6, 8, 0x4a2238);                             // plum witch hat brim
      add(-2.4, 10, -2, 4.8, 2.6, 4, 0x4a2238); add(-1.4, 12.6, -1, 2.8, 2.4, 2, 0x4a2238); add(-0.2, 15, 0, 1.6, 1.2, 1, 0x4a2238);
      add(1.6, 10.2, 2.05, 1, 1, 0.3, C.pumpkin);                            // pumpkin brooch
    } else if (kind === 1) {
      add(-3, 0, -2, 6, 1.4, 4, 0x4a3020);                                   // boots
      add(-3.4, 1.4, -2.4, 6.8, 6.6, 4.8, 0x5b2a4a);                         // plum dress
      add(-3.6, 1.4, -2.5, 7.2, 1, 5, 0xe8dcc8);                             // lace petticoat
      add(-3.6, 8, -2.4, 7.2, 1.4, 4.8, 0xc8641e);                           // orange scarf
      add(-3, 9.4, -2.6, 6, 5.6, 5.2, 0xf6b48c);                             // face
      add(-1.5, 11.8, 2.6, 0.7, 0.7, 0.1, C.dark); add(0.8, 11.8, 2.6, 0.7, 0.7, 0.1, C.dark);
      add(-3.8, 9.6, -3.2, 1.4, 5.2, 5.6, 0xb5552a); add(2.4, 9.6, -3.2, 1.4, 5.2, 5.6, 0xb5552a); // copper curls
      add(-3.4, 14.4, -3.4, 6.8, 1.4, 6, 0xb5552a);
      add(-4.4, 15, -4, 8.8, 0.6, 8, 0x3d5a2a); add(-2.2, 15.6, -1.8, 4.4, 2.6, 3.6, 0x3d5a2a); add(-1.2, 18.2, -0.8, 2.4, 2.2, 1.6, 0x3d5a2a);
      add(1.2, 15.8, 1.8, 1.2, 1.2, 0.3, 0xe8862e);                          // hat flower
    } else if (kind === 2) {
      add(-3, 0, -1.8, 6, 1.6, 3.6, 0x1a1414);                               // riding boots
      add(-2.6, 1.6, -1.4, 5.2, 5, 2.8, 0x241c22);                           // trousers
      add(-3.4, 6.6, -1.8, 6.8, 5.2, 3.6, 0x1c1418);                         // tailcoat
      add(-1.4, 7.2, 1.82, 2.8, 4.2, 0.1, 0x5b2a4a);                         // plum waistcoat
      add(-0.6, 10.6, 1.9, 1.2, 1.2, 0.1, C.white);                          // cravat
      add(-4.2, 2.4, -2.4, 0.8, 9.4, 4.6, 0x7a1e2e); add(3.4, 2.4, -2.4, 0.8, 9.4, 4.6, 0x7a1e2e); // red-lined cape
      add(-4.4, 11.4, -2.6, 8.8, 2.2, 1, 0x1c1418);                          // high collar
      add(-2.8, 11.8, -2.4, 5.6, 5.4, 4.8, 0xe6ddd8);                        // pale face
      add(-1.4, 14, 2.4, 0.7, 0.6, 0.1, 0x7a1e2e); add(0.8, 14, 2.4, 0.7, 0.6, 0.1, 0x7a1e2e);
      add(-3.2, 15.8, -2.8, 6.4, 1.8, 5.4, 0xc9c6cf);                        // swept silver hair
      add(-3.4, 13, -2.8, 0.8, 3.2, 4, 0xc9c6cf);
    } else if (kind === 3) {
      add(-3, 0, -1.8, 6, 1.6, 3.6, 0x4a3020);                               // work boots
      add(-2.6, 1.6, -1.4, 5.2, 4.4, 2.8, 0x5a4030);                         // brown trousers
      add(-3.4, 6, -1.8, 6.8, 5.8, 3.6, 0x3d5a2a);                           // mossy patchwork coat
      add(-2.2, 7.4, 1.82, 1.6, 1.6, 0.1, 0x5a3a26); add(0.8, 9, 1.82, 1.4, 1.4, 0.1, 0x8a3f22);
      add(-3.6, 11, -2, 7.2, 1.6, 4, 0xc8641e);                              // woolly orange scarf
      add(-2.8, 12.4, -2.4, 5.6, 5.2, 4.8, 0xeee7d6);                        // skull
      add(-1.8, 14.2, 2.4, 1.4, 1.4, 0.1, C.dark); add(0.4, 14.2, 2.4, 1.4, 1.4, 0.1, C.dark);
      add(-1.4, 12.8, 2.4, 2.8, 0.5, 0.1, 0x8c8478);
    } else {
      add(-3, 0, -1.8, 6, 1.6, 3.6, 0x4a3020);
      add(-2.6, 1.6, -1.4, 5.2, 4.6, 2.8, 0x6b4a30);                         // patched trousers
      add(-3.4, 6.2, -1.8, 6.8, 5.6, 3.6, 0x3d5a2a);                         // green jacket
      add(-4.2, 6.4, -0.6, 1, 1.4, 1.2, 0xd9b54a); add(3.2, 6.4, -0.6, 1, 1.4, 1.2, 0xd9b54a); // straw tufts
      pumpkinVoxels(add, 0, 11.8, 0, 3.2, 2.8, C.pumpkin, 9);                // jack-o'-lantern head
      add(-1.8, 14.6, 2.6, 1.2, 1, 0.8, 0xffd36a, true); add(0.6, 14.6, 2.6, 1.2, 1, 0.8, 0xffd36a, true);
      add(-1.6, 13, 2.7, 3.2, 0.8, 0.8, 0xffd36a, true);                     // carved grin
      add(-4.8, 17.2, -4.2, 9.6, 0.6, 8.4, 0xc9a65a); add(-2.4, 17.8, -2, 4.8, 2, 4, 0xc9a65a); // straw hat
    }
  });
  root.add(body);
  root.userData = { legs: [], arms: [], bob: [body] };
  return root;
}

// A small walk cycle: legs swing, everything above bobs. t in seconds.
export function animateWalk(model, t, moving) {
  const { legs, arms, bob } = model.userData;
  const swing = moving ? Math.sin(t * 9) * 0.5 : 0, lift = moving ? Math.abs(Math.sin(t * 9)) * 0.05 : Math.sin(t * 2) * 0.01;
  legs.forEach((leg, i) => (leg.rotation.x = i ? -swing : swing));
  arms.forEach((arm) => (arm.rotation.x = -swing * 0.6));
  for (const p of bob) p.position.y = (p.userData.baseY ??= p.position.y) + lift;
}
