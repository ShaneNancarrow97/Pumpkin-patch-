import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";

// Characters are built in a small voxel grid (V world units per voxel) facing +z
// (towards the camera), feet at y = 0. Each moving part is its own group so it
// can swing. Colours follow docs/GAME-BIBLE.md.
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

export function buildNatalie(look = {}) {
  const sweater = look.sweater ?? C.sweater, root = new THREE.Group();
  const legs = [-1, 1].map((side) => part([side * 1.6, 8, 0], (add) => {
    const x = side < 0 ? -3 : 0.4;
    texture(add, x, 2, -1.3, 2.6, 6, 2.6, C.jeans, 0.12, side + 5);        // faded charcoal jeans
    add(x - 0.2, 0, -1.6, 3, 2.2, 3.6, C.boots);                            // chunky lace-up boots
    add(x - 0.25, 0.2, -1.65, 3.1, 0.35, 3.7, C.stitch);                    // yellow welt stitching
    add(x + 0.6, 1.4, 1.9, 1.4, 0.4, 0.2, 0x3a2e2a);                        // laces
  }));
  const body = part([0, 8, 0], (add) => {
    texture(add, -3.5, 7.2, -1.8, 7, 1.6, 3.6, C.jeans, 0.1, 9);             // hips
    add(-3.6, 8.6, -1.85, 7.2, 0.7, 3.7, C.belt);                             // grommet belt
    for (let i = -3; i <= 3; i += 1.5) add(i, 8.8, 1.85, 0.4, 0.3, 0.1, C.silver);
    add(-0.7, 8.6, 1.86, 1.4, 0.7, 0.12, C.silver);                          // buckle
    add(-4.1, 7.3, -0.5, 0.8, 1.4, 1.2, C.belt);                             // belt pouch
    texture(add, -3.8, 9.2, -2, 7.6, 5.2, 4, sweater, 0.16, 11);             // oversized knit
    add(-2.2, 14.2, -1.4, 4.4, 0.5, 2.8, sweater);                           // crew neck
    add(-0.4, 12.9, 2.02, 0.8, 0.8, 0.1, C.gold);                            // coin pendant
    add(-1.5, 14.2, 2.0, 3, 0.1, 0.05, C.gold);                              // chain
  });
  const arms = [-1, 1].map((side) => part([side * 4.4, 13.8, 0], (add) => {
    const x = side < 0 ? -5.4 : 3.8;
    texture(add, x, 9.8, -1.2, 1.6, 4.2, 2.6, sweater, 0.16, 20 + side);     // bunched sleeve
    add(x + (side < 0 ? 1 : -0.6), 9.6, 1, 1.6, 1.2, 1.6, C.natalieSkin);    // hand towards the pumpkin
    add(x + (side < 0 ? 1.7 : -0.7), 9.8, 2.4, 0.6, 0.5, 0.3, C.nails);      // black nails
    add(x + (side < 0 ? 1.2 : -0.2), 10.4, 2.2, 0.5, 0.2, 0.3, C.gold);      // rings
    if (side > 0) add(x - 0.4, 10.2, 1.6, 1, 0.6, 0.1, C.tattoo);            // hand tattoo
  }));
  const pumpkin = part([0, 9.5, 3.6], (add) => pumpkinVoxels(add, 0, 8.6, 3.6, 2.6, 1.7, C.pumpkin, 3));
  const head = part([0, 14.6, 0], (add) => {
    add(-0.9, 14.4, -0.8, 1.8, 0.8, 1.6, C.natalieSkin);                      // neck
    add(-0.8, 14.5, 0.85, 1.6, 0.6, 0.1, C.tattoo);                          // neck tattoo
    add(-3.4, 15, -3, 6.8, 6.4, 6, C.natalieSkin);                           // round face
    add(-3.0, 16.2, 3.0, 1.4, 0.8, 0.1, C.natalieBlush);                     // cheeks
    add(1.6, 16.2, 3.0, 1.4, 0.8, 0.1, C.natalieBlush);
    add(-1.1, 15.7, 3.0, 2.2, 0.5, 0.12, C.lips);                            // smile
    add(-0.8, 15.9, 3.05, 1.6, 0.25, 0.1, C.white);                          // teeth
    for (const s of [-1, 1]) {
      const ex = s < 0 ? -2.4 : 0.8;
      add(ex, 17.3, 3.0, 1.6, 1.3, 0.1, C.white);                            // eye
      add(ex + 0.4, 17.4, 3.08, 0.9, 1.0, 0.1, C.iris);                      // blue iris
      add(ex + 0.65, 17.6, 3.14, 0.4, 0.5, 0.1, C.dark);                     // pupil
      add(ex - 0.4, 16.9, 3.18, 2.4, 0.25, 0.1, C.gold);                     // glasses: bottom
      add(ex - 0.4, 18.85, 3.18, 2.4, 0.25, 0.1, C.gold);                    // top
      add(ex - 0.4, 16.9, 3.18, 0.25, 2.2, 0.1, C.gold);                     // sides
      add(ex + 1.75, 16.9, 3.18, 0.25, 2.2, 0.1, C.gold);
      add(ex - 0.2, 19.15, 3.05, 2, 0.3, 0.1, C.natalieHair);                // arched brows
      add(s < 0 ? -3.65 : 3.4, 16.0, 0.4, 0.3, 0.7, 0.7, C.gold);            // hoop earrings
    }
    add(-0.4, 17.3, 3.18, 0.8, 0.25, 0.1, C.gold);                           // bridge
    // Long dark hair: crown, sides and down the back past the shoulders.
    add(-3.8, 20.8, -3.4, 7.6, 1.6, 6.6, C.natalieHair);
    add(-4.2, 9.6, -3.6, 1.0, 12, 5.4, C.natalieHair);
    add(3.2, 9.6, -3.6, 1.0, 12, 5.4, C.natalieHair);
    texture(add, -3.8, 8.6, -3.8, 7.6, 12.6, 1, C.natalieHair, 0.25, 31);
    add(-4.3, 13, -1, 0.3, 6, 3, C.natalieHairHi);                           // warm highlight
    // Blunt baby bangs, straight across, well above the brows.
    add(-3.6, 19.6, 2.6, 7.2, 1.3, 0.6, C.natalieHair);
  });
  root.add(...legs, body, ...arms, head, pumpkin);
  root.userData = { legs, arms: [], bob: [body, head, pumpkin, ...arms] };
  return root;
}

export function buildShane(look = {}) {
  const beanie = look.beanie ?? C.beanie, root = new THREE.Group();
  const legs = [-1, 1].map((side) => part([side * 1.8, 8.4, 0], (add) => {
    const x = side < 0 ? -3.6 : 0.5;
    texture(add, x, 2, -1.4, 3, 6.6, 2.8, C.cargo, 0.1, 40 + side);           // cargo trousers
    add(side < 0 ? x - 0.4 : x + 2.6, 4.2, -0.8, 0.8, 2.2, 2, 0x2e2422);     // thigh pocket
    add(x - 0.2, 0, -1.7, 3.4, 0.7, 4, C.sole);                              // cream rubber sole
    add(x - 0.1, 0.7, -1.6, 3.2, 1.5, 3.8, C.shoe);                          // black skate shoe
    add(side < 0 ? x - 0.15 : x + 3.0, 0.9, -0.6, 0.2, 0.5, 2.6, C.stripe);  // side stripe
    add(x + 0.7, 1.9, 2.0, 1.6, 0.3, 0.2, C.white);                          // white laces
  }));
  const body = part([0, 8.4, 0], (add) => {
    texture(add, -4.2, 8.4, -2.1, 8.4, 6, 4.2, C.jacket, 0.14, 51);           // washed black denim jacket
    add(-1.2, 8.4, 2.0, 2.4, 6, 0.3, C.hoodie);                              // hoodie under the open jacket
    add(-0.9, 10.4, 2.25, 1.8, 1.4, 0.15, 0x2a201e);                         // kangaroo pocket
    add(-0.8, 12.2, 2.3, 0.2, 1.8, 0.1, 0x8a8480);                           // drawstrings
    add(0.6, 12.2, 2.3, 0.2, 1.8, 0.1, 0x8a8480);
    for (const s of [-1, 1]) {
      add(s < 0 ? -3.4 : 1.6, 12.1, 2.12, 1.8, 1.3, 0.12, C.jacketHi);       // flap chest pockets
      add(s < 0 ? -2.6 : 2.4, 12.6, 2.26, 0.3, 0.3, 0.1, 0x6b5e58);          // buttons
      add(s < 0 ? -2.6 : 1.2, 14.0, 1.8, 1.4, 0.6, 0.6, C.jacketHi);         // pointed collar
    }
    add(-2, 13.8, -2.4, 4, 1.6, 1.2, C.hoodie);                              // hood behind the neck
  });
  const arms = [-1, 1].map((side) => part([side * 4.8, 14, 0], (add) => {
    const x = side < 0 ? -6.0 : 4.2;
    texture(add, x, 8.8, -1.2, 1.8, 5.4, 2.4, C.jacket, 0.14, 60 + side);
    if (side > 0) {
      add(x + 0.1, 8.2, -0.4, 1.6, 1.2, 1.6, C.shaneSkin);                    // right hand
      add(x + 0.5, 6.6, 0.6, 0.6, 2.2, 0.6, C.trowelWood);                  // trowel handle
      add(x + 0.1, 3.4, 0.2, 1.4, 3.2, 0.3, C.trowelBlade);                 // rusty blade
      add(x + 0.3, 3.8, 0.45, 0.6, 1, 0.1, C.rust);
    }
  }));
  const head = part([0, 14.6, 0], (add) => {
    add(-1, 14.2, -0.8, 2, 0.8, 1.6, C.shaneSkin);                           // neck
    add(-3.4, 14.8, -3, 6.8, 6.6, 6, C.shaneSkin);                           // youthful oval face
    add(-3.0, 16.3, 3.0, 1.3, 0.8, 0.1, C.shaneBlush);                       // ruddy cheeks
    add(1.7, 16.3, 3.0, 1.3, 0.8, 0.1, C.shaneBlush);
    for (const s of [-1, 1]) {
      const ex = s < 0 ? -2.3 : 0.9;
      add(ex, 17.6, 3.0, 1.4, 1.0, 0.1, C.white);
      add(ex + 0.35, 17.6, 3.06, 0.8, 0.9, 0.1, C.eyeBrown);                 // warm brown eyes
      add(ex - 0.2, 18.8, 3.05, 1.8, 0.35, 0.1, C.auburn);                   // auburn brows
    }
    add(-1.5, 16.4, 3.05, 3, 0.45, 0.12, C.goatee);                          // moustache
    add(-1.1, 15.6, 3.02, 2.2, 0.55, 0.12, C.white);                         // big grin
    add(-0.7, 14.6, 3.0, 1.4, 1.0, 0.2, C.goatee);                           // pointed goatee
    add(-0.45, 14.3, 3.05, 0.9, 0.5, 0.2, C.goatee);
    add(-3.6, 17.6, -1.8, 0.4, 2, 3.6, C.auburn);                            // hair at the sides
    add(3.2, 17.6, -1.8, 0.4, 2, 3.6, C.auburn);
    add(-2.6, 19.4, 2.9, 2.2, 0.5, 0.25, C.auburn);                          // a bit of fringe
    texture(add, -3.8, 19.6, -3.4, 7.6, 3.2, 6.6, beanie, 0.14, 71);          // ribbed beanie
    add(-3.9, 19.5, -3.5, 7.8, 1.1, 6.8, beanie);                            // folded cuff
  });
  root.add(...legs, body, ...arms, head);
  root.userData = { legs, arms: [arms[0]], bob: [body, head, ...arms] };
  return root;
}

export function buildSkyla() {
  return part([0, 0, 0], (add) => {
    const W = 0xf4eee6, G = 0xe08a3c, B = 0x2a2220;
    add(-2, 0, -2.5, 4, 4.5, 4.5, W);                                        // sitting body
    add(-2.05, 2.5, -2.6, 2.2, 2, 2.6, G);                                   // ginger patch
    add(0.6, 0.6, -2.6, 1.5, 2.4, 2.4, B);                                   // black patch
    add(-1.6, 0, 1.6, 1.2, 0.8, 1.2, W); add(0.4, 0, 1.6, 1.2, 0.8, 1.2, W); // paws
    add(-2.3, 4.2, -2.2, 4.6, 3.6, 4, W);                                    // head
    add(-2.35, 5.4, -2.3, 2.3, 2.5, 4.2, G);                                 // ginger mask
    add(0.1, 5.4, -2.3, 2.25, 2.5, 4.2, B);                                  // black mask
    add(-0.5, 4.2, 1.85, 1, 3, 0.2, W);                                      // white blaze
    add(-2.2, 7.8, -1, 1.2, 1.4, 1, G); add(1.0, 7.8, -1, 1.2, 1.4, 1, B);   // ears
    add(-1.7, 6.0, 1.86, 0.9, 0.8, 0.12, 0xc2b455, true);                    // yellow-green eyes
    add(0.8, 6.0, 1.86, 0.9, 0.8, 0.12, 0xc2b455, true);
    add(-0.3, 5.0, 1.95, 0.6, 0.4, 0.1, 0xe58a78);                           // pink nose
    add(-2.1, 3.9, -2.2, 4.2, 0.5, 4.3, 0x7a1e36);                           // burgundy collar
    add(-0.35, 3.3, 2.0, 0.7, 0.7, 0.4, 0xed9e25, true);                     // pumpkin bell
    for (let i = 0; i < 6; i++) add(2 + i * 0.6, 0.2 + Math.sin(i) * 0.3, 0.5 - i * 0.5, 0.8, 0.8, 0.8, i % 2 ? B : G); // banded tail
  });
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
