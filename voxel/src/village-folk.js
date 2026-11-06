// Mothlight's residents in voxels (handover 73), after Codex's character boards:
// Elowen the moth witch, Rowan the scarecrow carpenter, and the six met later.
// Each body part is one merged mesh of coloured boxes (a dozen draws a person),
// hung on joints that idle, talk, wave and walk. The six who wait in their
// districts stand posed for the tour. Realm (x, z) → three (x, -z).
import * as THREE from "three";
import { FIXTURES, PLAN_SCALE } from "./content/village.js";
import { doorOf, districtOpen } from "./rules/village.js";
import { RESIDENT_BY_ID } from "./content/village.js";

const FOLK_SCALE = 1.15;
const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: 0 });
const glowing = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
// Many boxes as one mesh with vertex colours; glowing boxes as a second.
export function boxes(list) {
  const group = new THREE.Group();
  for (const lit of [false, true]) {
    const items = list.filter((b) => !!b[7] === lit); if (!items.length) continue;
    const pos = [], nor = [], col = [], idx = [], c = new THREE.Color();
    for (const [x, y, z, w, h, d, colour] of items) {
      c.set(colour); const x0 = x - w / 2, x1 = x + w / 2, y0 = y, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2;
      for (const [n, quad] of [[[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]], [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
        [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]], [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
        [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]], [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]]]) {
        const base = pos.length / 3; for (const p of quad) { pos.push(...p); nor.push(...n); col.push(c.r, c.g, c.b); }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const mesh = new THREE.Mesh(g, lit ? glowing : solid); mesh.castShadow = !lit; mesh.receiveShadow = !lit; group.add(mesh);
  }
  return group;
}

// A face: eyes, brows, a mouth and cheeks on the front of a head at (0, y0) of size s.
function face(L, y0, s, { eye = 0x2a1d2e, mouth = 0x8a3a4a, cheek = 0xe8a5a5, skin } = {}) {
  const z = s / 2 + .005;
  for (const sx of [-1, 1]) { L.push([sx * s * .2, y0 + s * .48, z, s * .13, s * .14, .02, eye]); L.push([sx * s * .2 + sx * .01, y0 + s * .55, z + .003, .025, .025, .01, 0xffffff]); L.push([sx * s * .2, y0 + s * .66, z, s * .17, s * .04, .02, eye]); if (cheek) L.push([sx * s * .3, y0 + s * .32, z, s * .1, s * .07, .015, cheek]); }
  L.push([0, y0 + s * .22, z, s * .2, s * .05, .02, mouth]);
}

// The eight designs: each returns its parts as box lists (in the part's own frame).
const DESIGNS = {
  elowen() {
    const skin = 0xf0d2bf, hair = 0x1f1621, plum = 0x5c2b4a, mauve = 0x8a5a7a, cream = 0xe8dcc6;
    const body = [], head = [], armL = [], armR = [], legs = [];
    // A long layered skirt to the ground, a bodice, a moth-wing shawl and a moth brooch.
    for (let i = 0; i < 6; i++) { const w = .62 - i * .045, y = i * .15; body.push([0, y, 0, w, .15, w * .8, i % 2 ? plum : 0x6a3256]); }
    body.push([0, 0, .05, .5, .12, .3, cream]); body.push([0, .9, 0, .4, .5, .26, plum]); body.push([0, .9, 0, .42, .07, .28, 0x3a2430]);
    for (const sx of [-1, 1]) { body.push([sx * .02, .88, .14, .04, .04, .02, 0xc9a25f]); body.push([sx * .16, .92, .14, .06, .1, .04, 0x5a3d2a]); }
    for (const sx of [-1, 1]) { body.push([sx * .32, .7, -.14, .34, .78, .06, 0xd9c8a2]); body.push([sx * .36, .95, -.16, .1, .12, .03, 0x3a2430]); body.push([sx * .3, .6, -.16, .08, .08, .03, 0x3a2430]); }
    body.push([0, 1.32, .14, .14, .07, .03, 0xd9c8a2]); body.push([0, 1.36, .145, .04, .04, .03, 0xc9a25f]);
    head.push([0, 0, 0, .28, .3, .28, skin]); face(head, 0, .28, { mouth: 0x9a3a55 });
    head.push([0, .25, -.02, .32, .1, .32, hair]); head.push([0, .05, -.13, .32, .28, .08, hair]); for (const sx of [-1, 1]) head.push([sx * .15, -.02, -.01, .05, .3, .26, hair]);
    for (let i = 0; i < 6; i++) head.push([.16, -.08 - i * .1, -.06, .08, .1, .08, hair]);
    head.push([.13, .27, .1, .08, .05, .04, 0xd9c8a2]);
    for (const [list, sx] of [[armL, -1], [armR, 1]]) { list.push([0, -.5, 0, .13, .5, .14, plum]); list.push([0, -.56, 0, .15, .08, .16, cream]); list.push([0, -.64, 0, .09, .08, .09, skin]); }
    armL.push([.04, -.62, .08, .2, .26, .07, 0x3d4a6a]); armL.push([.04, -.62, .12, .14, .18, .01, 0xc9a25f]);
    armR.push([0, -.95, .02, .22, .06, .22, 0x2b2630]); armR.push([0, -.89, .02, .16, .22, .16, 0xffc06a, true]); armR.push([0, -.67, .02, .2, .05, .2, 0x2b2630]); armR.push([0, -.62, .02, .03, .06, .03, 0x2b2630]);
    return { body, head, armL, armR, legs, height: 1.7, dress: true };
  },
  rowan() {
    const sack = 0xc9a86a, straw = 0xe2c25a, coat = 0x5a6a3a, apron = 0x7a4a2a, trousers = 0x5a5560, boot = 0x4a3020;
    const body = [], head = [], armL = [], armR = [], legL = [], legR = [];
    body.push([0, 0, 0, .46, .58, .28, coat]); body.push([0, -.42, 0, .5, .44, .3, coat]);
    body.push([0, -.38, .15, .36, .72, .04, apron]); for (const [x, y] of [[-.1, -.1], [.08, -.18], [.12, .02]]) body.push([x, y, .175, .03, .16, .02, 0x9a9aa2]);
    body.push([0, .5, .08, .34, .1, .2, 0xb83a3a]); body.push([.08, .42, .17, .1, .14, .03, 0xb83a3a]);
    for (const [x, y, c] of [[-.15, .2, 0x7a8a4a], [.17, -.25, 0x8a5a3a], [-.18, -.5, 0x6a5a7a]]) body.push([x, y, .145, .1, .1, .02, c]);
    for (let i = 0; i < 5; i++) body.push([(i - 2) * .1, -.84, .02, .05, .12, .05, straw]);
    head.push([0, 0, 0, .32, .34, .3, sack]);
    for (const sx of [-1, 1]) { head.push([sx * .07, .19, .155, .07, .07, .02, 0x2a1d1b]); head.push([sx * .07, .19, .162, .025, .025, .01, 0x6a5a4a]); }
    for (let i = 0; i < 5; i++) head.push([(i - 2) * .045, .08 - Math.abs(i - 2) * -.012, .155, .035, .02, .02, 0x2a1d1b]);
    for (let i = 0; i < 4; i++) head.push([(i - 1.5) * .05, .1, .158, .01, .05, .01, 0x2a1d1b]);
    for (let i = 0; i < 8; i++) head.push([-.18 + (i % 4) * .12, -.02 + (i >> 2) * .12, .02, .06, .12, .06, straw]);
    head.push([0, .32, 0, .7, .06, .64, 0x5a5a3a]); head.push([0, .38, 0, .36, .2, .34, 0x5a5a3a]); head.push([0, .38, .0, .37, .05, .35, 0x7a3a3a]);
    head.push([.18, .42, .14, .12, .12, .03, 0xe8b02a]); head.push([.18, .45, .155, .05, .05, .02, 0x5a3a1a]);
    for (const [list, sx] of [[armL, -1], [armR, 1]]) { list.push([0, -.52, 0, .14, .54, .14, coat]); list.push([0, -.56, 0, .16, .06, .16, 0x4a5a2a]); for (let i = 0; i < 3; i++) list.push([(i - 1) * .04, -.66, 0, .04, .12, .04, straw]); list.push([0, -.7, 0, .11, .1, .11, 0x8a6a3a]); }
    armR.push([0, -.76, .12, .07, .07, .5, 0x6a4a34]); armR.push([0, -.76, .38, .2, .16, .14, 0x7a5a40]);
    for (const list of [legL, legR]) { list.push([0, -.75, 0, .17, .75, .18, trousers]); list.push([0, -.84, .03, .19, .1, .26, boot]); list.push([.03, -.45, .095, .08, .08, .01, 0x8a7a5a]); }
    return { body, head, armL, armR, legL, legR, height: 1.86, hip: .9 };
  },
  mabel() {
    const skin = 0xf4ece6, hair = 0x14101a, dress = 0x7a1f35, cream = 0xeee2cc;
    const body = [], head = [];
    for (let i = 0; i < 5; i++) { const w = .62 - i * .05; body.push([0, i * .16, 0, w, .16, w * .8, i % 2 ? dress : 0x8a2a40]); }
    body.push([0, .1, .2, .3, .56, .04, cream]); body.push([0, .3, .225, .1, .08, .01, 0x8a5a6a]);
    body.push([0, .82, 0, .36, .5, .24, dress]); for (const sx of [-1, 1]) body.push([sx * .26, 1.18, 0, .18, .16, .18, dress]);
    for (const sx of [-1, 1]) { body.push([sx * .26, .76, 0, .1, .42, .1, skin]); body.push([sx * .26, .98, .052, .1, .015, .005, 0xc8b8b8]); }
    body.push([.3, .78, .1, .04, .16, .02, 0xb9b9c4]);
    head.push([0, 0, 0, .28, .3, .27, skin]); face(head, 0, .28, { cheek: 0xf0a0b0, mouth: 0x9a2a3a });
    head.push([0, .22, -.01, .31, .12, .31, hair]); head.push([0, .02, -.12, .31, .26, .09, hair]); for (const sx of [-1, 1]) head.push([sx * .145, .04, .02, .03, .2, .24, hair]); head.push([0, .21, .135, .3, .05, .03, hair]);
    head.push([.08, .3, .02, .16, .1, .06, 0x8a2a50]); head.push([.18, .32, .02, .1, .14, .05, 0x8a2a50]); head.push([-.02, .32, .02, .1, .14, .05, 0x8a2a50]);
    return { body, head, height: 1.62, posed: true };
  },
  tansy() {
    const skin = 0xe8c0a0, hair = 0x9a4a2a, cloak = 0x4f6a3f, cream = 0xeee0c8;
    const body = [], head = [];
    for (let i = 0; i < 5; i++) { const w = .66 - i * .05; body.push([0, i * .17, 0, w, .17, w * .78, i % 2 ? cloak : 0x5d7a4a]); }
    body.push([0, .85, 0, .38, .5, .25, cream]); body.push([0, .92, .02, .4, .12, .26, 0x6a4a34]);
    for (const sx of [-1, 1]) body.push([sx * .28, .8, -.06, .14, .55, .18, cloak]);
    body.push([.36, .55, .12, .3, .2, .22, 0x9a7a4a]); for (let i = 0; i < 6; i++) body.push([.28 + (i % 3) * .07, .75, .08 + (i >> 1 & 1) * .07, .07, .07, .07, [0xb77ad8, 0xe8c25a, 0x5d8a4a][i % 3]]);
    head.push([0, 0, 0, .28, .3, .27, skin]); face(head, 0, .28, { cheek: 0xe08070, mouth: 0x8a3a3a });
    for (let i = 0; i < 9; i++) head.push([-.16 + (i % 3) * .16, .18 + (i / 3 | 0) * .06, -.04 - (i / 3 | 0) * .05, .14, .12, .14, hair]);
    head.push([0, -.1, -.16, .36, .4, .1, hair]); head.push([0, .3, -.06, .4, .1, .36, cloak]); head.push([0, .05, -.2, .42, .42, .06, cloak]);
    return { body, head, height: 1.66, posed: true };
  },
  opal() {
    const skin = 0xe8e4ec, hair = 0xe8e4f0, shirt = 0x1f1b26, apron = 0x8a7a6a, trousers = 0x2f2a33;
    const body = [], head = [];
    for (const sx of [-1, 1]) { body.push([sx * .1, 0, 0, .16, .82, .17, trousers]); body.push([sx * .1, 0, .03, .18, .12, .24, 0x2a1d1b]); }
    body.push([0, .82, 0, .42, .58, .26, shirt]); body.push([0, .3, .14, .34, .82, .04, apron]); for (const sx of [-1, 1]) body.push([sx * .1, .9, .14, .04, .5, .02, 0x4a3a2a]);
    for (const sx of [-1, 1]) { body.push([sx * .28, .9, 0, .12, .48, .13, shirt]); body.push([sx * .28, .82, 0, .1, .1, .1, skin]); }
    body.push([.3, .5, .06, .06, .34, .06, 0x6a4a34]); body.push([.3, .84, .06, .2, .12, .12, 0x7a7a82]);
    head.push([0, 0, 0, .28, .3, .27, skin]); face(head, 0, .28, { eye: 0xc0202a, cheek: 0, mouth: 0x6a1a2a });
    for (let i = 0; i < 8; i++) head.push([-.14 + (i % 4) * .095, .24 + (i >> 2) * .05, -.02, .1, .08, .3, hair]); head.push([0, .05, -.13, .3, .24, .06, hair]);
    return { body, head, height: 1.74, posed: true };
  },
  cinder() {
    const ghost = 0xc8b8f0, apron = 0xf0e8e0, hat = 0xffffff;
    const body = [], head = [];
    for (let i = 0; i < 6; i++) body.push([Math.sin(i) * .04, .1 + i * .12, 0, .2 + i * .06, .12, .2 + i * .05, ghost, true]);
    body.push([0, .82, 0, .46, .5, .3, ghost, true]); body.push([0, .55, .16, .36, .6, .03, apron]); body.push([0, 1.15, .1, .3, .06, .14, 0x8a2a50]);
    for (const sx of [-1, 1]) body.push([sx * .3, .9, .06, .12, .4, .13, ghost, true]);
    body.push([-.32, .82, .2, .05, .05, .4, 0xa86a3a]); body.push([.32, .86, .16, .26, .1, .26, 0x9a6a3a]); body.push([.32, .95, .16, .2, .04, .2, 0xe8a03a]);
    head.push([0, 0, 0, .3, .3, .28, ghost, true]); face(head, 0, .3, { eye: 0x3a2a5a, cheek: 0xb8a0e0, mouth: 0x5a3a7a });
    head.push([0, .28, 0, .3, .1, .3, hat]); head.push([0, .36, 0, .38, .22, .36, hat]);
    return { body, head, height: 1.7, posed: true, float: true };
  },
  corvus() {
    const feather = 0x16121c, coat = 0x2b2650, red = 0x8a1f35, gold = 0xc9a25f;
    const body = [], head = [];
    for (const sx of [-1, 1]) { body.push([sx * .1, 0, 0, .16, .82, .17, 0x1c1a20]); body.push([sx * .1, 0, .04, .2, .2, .24, 0x1c1a20]); }
    body.push([0, .82, 0, .44, .6, .28, coat]); body.push([0, .5, -.06, .46, .5, .2, coat]); body.push([0, .55, -.16, .4, .6, .02, red]);
    for (let i = 0; i < 4; i++) body.push([.1, 1.25 - i * .12, .145, .04, .04, .02, gold]); body.push([0, 1.32, .13, .2, .12, .04, 0xeee2cc]);
    for (const sx of [-1, 1]) { body.push([sx * .3, .92, 0, .13, .5, .14, coat]); for (let i = 0; i < 3; i++) body.push([sx * .34, .7 - i * .08, -.04, .06, .14, .14, feather]); }
    body.push([.36, 0, .08, .05, 1, .05, 0x1c1a20]); body.push([.36, .98, .08, .08, .06, .08, gold]);
    head.push([0, 0, 0, .3, .32, .3, feather]); head.push([0, .1, .2, .1, .1, .2, 0x2a2a2a]); head.push([0, .12, .32, .06, .06, .1, 0x3a3a3a]);
    for (const sx of [-1, 1]) head.push([sx * .1, .2, .152, .06, .06, .02, 0xe8c25a]);
    head.push([0, .32, 0, .32, .06, .32, 0x1c1a20]); head.push([0, .38, 0, .22, .3, .22, 0x2b2650]); head.push([0, .42, .0, .23, .05, .23, red]); head.push([.08, .6, -.05, .04, .3, .04, 0x8a1f35]);
    return { body, head, height: 1.86, posed: true };
  },
  baron() {
    const skin = 0x8a9a7a, velvet = 0x7a1a2a, gold = 0xc9a25f, trousers = 0x1f1a22;
    const body = [], head = [];
    for (const sx of [-1, 1]) { body.push([sx * .13, 0, 0, .2, .84, .22, trousers]); body.push([sx * .13, 0, .04, .22, .1, .3, 0x111014]); }
    body.push([0, .82, 0, .6, .66, .36, velvet]); body.push([0, .45, -.02, .62, .45, .34, velvet]); body.push([0, .9, .17, .26, .5, .03, 0xc9a25f]);
    for (let i = 0; i < 4; i++) body.push([.2, 1.3 - i * .13, .19, .04, .04, .02, gold]); body.push([0, 1.38, .16, .24, .12, .05, 0xeee2cc]);
    for (const sx of [-1, 1]) { body.push([sx * .4, .9, 0, .18, .6, .2, velvet]); body.push([sx * .4, .82, 0, .14, .12, .14, skin]); }
    body.push([.42, .9, .14, .1, .1, .03, gold]); body.push([.2, 1.05, .18, .1, .02, .02, gold]);
    head.push([0, 0, 0, .36, .36, .34, skin]); face(head, 0, .36, { cheek: 0, mouth: 0x3a2a2a, eye: 0x1a1a1a });
    for (const sx of [-1, 1]) head.push([sx * .2, .12, 0, .06, .08, .06, 0x9a9aa2]);
    head.push([0, .3, -.02, .38, .1, .36, 0x1a1a1a]); head.push([.08, .14, .175, .14, .14, .02, gold]);
    return { body, head, height: 1.98, posed: true };
  },
  // Vesper, host of the Velvet Bat: a tailcoat over a red waistcoat, a jabot with a ruby pin, a red-lined
  // cape with a high collar, slicked hair to a widow's peak, pointed ears, fangs, eyes that glow, a bat
  // on one shoulder and a lit candelabrum held up to see guests in.
  vesper() {
    const skin = 0xe6e0ea, hair = 0x14101a, coat = 0x17121d, lining = 0xa0122c, vest = 0x7a1424, gold = 0xc9a25f, shirt = 0xeee6dc, boot = 0x0e0c12;
    const body = [], head = [];
    for (const sx of [-1, 1]) { body.push([sx * .1, 0, 0, .16, .84, .17, 0x1c1822]); body.push([sx * .1, 0, .05, .17, .1, .3, boot]); body.push([sx * .1, .01, .21, .08, .05, .06, boot]); body.push([sx * .1, .07, .12, .1, .04, .02, gold]); }
    // The tailcoat, its tails behind to the knee, lapels; the waistcoat with gold buttons and a watch chain.
    body.push([0, .84, 0, .44, .62, .27, coat]); for (const sx of [-1, 1]) body.push([sx * .11, .34, -.11, .2, .54, .06, coat]);
    body.push([0, .86, .137, .22, .5, .02, vest]); for (let i = 0; i < 4; i++) body.push([0, 1.24 - i * .11, .15, .035, .035, .02, gold]);
    body.push([-.06, 1.0, .15, .1, .02, .01, gold]); body.push([-.1, .97, .15, .03, .04, .01, gold]);
    for (const sx of [-1, 1]) { body.push([sx * .15, 1.12, .145, .08, .34, .02, 0x2a2232]); body.push([sx * .17, 1.3, .15, .05, .06, .02, 0x2a2232]); }
    body.push([0, 1.3, .152, .14, .16, .04, shirt]); body.push([0, 1.2, .17, .1, .12, .03, shirt]); body.push([0, 1.14, .176, .07, .06, .02, shirt]); body.push([0, 1.31, .178, .04, .04, .02, 0xe01a3a, true]);
    // The cape: red-lined, from the shoulders to the calf, and a high standing collar framing the head.
    body.push([0, .24, -.18, .62, 1.22, .04, coat]); body.push([0, .27, -.152, .56, 1.15, .02, lining]);
    for (const sx of [-1, 1]) { body.push([sx * .31, .28, -.06, .04, 1.16, .24, coat]); body.push([sx * .292, .3, -.05, .02, 1.1, .2, lining]); }
    body.push([0, 1.38, -.17, .52, .44, .05, coat]); body.push([0, 1.4, -.143, .46, .38, .02, lining]);
    for (const sx of [-1, 1]) { body.push([sx * .25, 1.42, -.09, .05, .42, .16, coat]); body.push([sx * .225, 1.44, -.09, .02, .38, .12, lining]); }
    body.push([0, 1.44, .16, .1, .05, .04, gold]); for (const sx of [-1, 1]) body.push([sx * .07, 1.45, .16, .06, .03, .03, gold]);
    // The left arm at the side; the right forearm raised forward with a three-candle candelabrum, flames lit.
    body.push([-.29, .88, 0, .12, .52, .14, coat]); body.push([-.29, .84, 0, .13, .06, .15, shirt]); body.push([-.29, .76, 0, .09, .08, .09, skin]);
    body.push([.29, 1.0, 0, .12, .42, .14, coat]); body.push([.29, .98, .14, .12, .12, .3, coat]); body.push([.29, .98, .3, .13, .13, .05, shirt]); body.push([.29, .97, .36, .09, .1, .08, skin]);
    body.push([.29, .9, .36, .05, .36, .05, gold]); body.push([.29, 1.24, .36, .4, .04, .05, gold]);
    for (const dx of [-.17, 0, .17]) { const y = dx ? 1.27 : 1.3; body.push([.29 + dx, y - .03, .36, .08, .03, .08, gold]); body.push([.29 + dx, y, .36, .045, .17, .045, 0xf4ecdc]); body.push([.29 + dx, y + .17, .36, .035, .07, .035, 0xffb347, true]); body.push([.29 + dx, y + .21, .36, .02, .04, .02, 0xfff0c0, true]); }
    // A bat roosting on the left shoulder, wings folded, eyes lit.
    body.push([-.2, 1.46, -.02, .09, .09, .08, 0x1a1420]); for (const sx of [-1, 1]) { body.push([-.2 + sx * .06, 1.45, -.02, .05, .12, .06, 0x221a2a]); body.push([-.2 + sx * .03, 1.56, -.02, .02, .04, .02, 0x1a1420]); }
    for (const sx of [-1, 1]) body.push([-.2 + sx * .02, 1.51, .025, .015, .015, .01, 0xff3a2a, true]);
    // The head: pale, pointed ears, a widow's peak swept back, red eyes that glow, fine brows and two fangs.
    head.push([0, 0, 0, .28, .3, .27, skin]);
    for (const sx of [-1, 1]) { head.push([sx * .056, .134, .141, .04, .03, .02, 0xe0203a, true]); head.push([sx * .056, .182, .141, .056, .016, .02, hair]); head.push([sx * .15, .12, -.01, .03, .1, .07, skin]); head.push([sx * .165, .2, -.03, .02, .07, .03, skin]); head.push([sx * .02, .044, .143, .012, .024, .01, 0xffffff]); }
    head.push([0, .1, .145, .03, .05, .02, 0xd8d0dc]); head.push([0, .065, .141, .07, .014, .02, 0x5a1020]);
    head.push([0, .26, -.02, .3, .08, .3, hair]); head.push([0, .06, -.135, .3, .26, .07, hair]); for (const sx of [-1, 1]) head.push([sx * .145, .14, -.04, .03, .18, .2, hair]);
    head.push([0, .245, .13, .1, .04, .03, hair]); head.push([0, .225, .142, .05, .03, .02, hair]); for (let i = 0; i < 3; i++) head.push([0, .28 + i * .01, -.06 - i * .07, .26 - i * .04, .03, .08, 0x241c2c]);
    return { body, head, height: 1.96, posed: true };
  },
};
// Hosts keep a place on the Green rather than a home plot: Vesper the Velvet Bat (design grid).
export const HOSTS = Object.freeze({ vesper: Object.freeze({ x: 100.2, z: 26, face: "north" }) });

// A resident's figure: joints for the head, arms and legs (or a skirt), posed by tick().
export function makeResident(id) {
  const d = DESIGNS[id](), root = new THREE.Group(), hip = new THREE.Group(); root.add(hip); root.name = "resident-" + id;
  // Drawn a touch over life size so they stand as tall as Shane and Natalie (2.3 units).
  root.scale.setScalar(FOLK_SCALE);
  const legsTop = d.hip ?? .9;
  if (d.posed) {
    const body = boxes(d.body); hip.add(body);
    const head = new THREE.Group(); head.add(boxes(d.head)); head.position.y = d.height - .32; hip.add(head);
    return { root, hip, head, design: d, id };
  }
  hip.position.y = d.dress ? 0 : legsTop;
  const torso = boxes(d.body); hip.add(torso);
  const head = new THREE.Group(); head.add(boxes(d.head)); head.position.y = d.dress ? 1.4 : .6; hip.add(head);
  const arm = (list, sx) => { const g = new THREE.Group(); g.add(boxes(list)); g.position.set(sx * (d.dress ? .27 : .32), d.dress ? 1.36 : .55, 0); hip.add(g); return g; };
  const armL = arm(d.armL, -1), armR = arm(d.armR, 1);
  let legL = null, legR = null;
  if (d.legL) { const leg = (list, sx) => { const g = new THREE.Group(); g.add(boxes(list)); g.position.set(sx * .11, 0, 0); hip.add(g); return g; }; legL = leg(d.legL, -1); legR = leg(d.legR, 1); }
  return { root, hip, head, armL, armR, legL, legR, design: d, id };
}

// Where each resident stands, by what's been built; the six who wait stand at their own doors.
// reach is how far in front of them to stand to talk (Rowan's is across his counter).
export function residentSpot(state, id) {
  const v = state.village, K = PLAN_SCALE, spot = (x, z, face, reach) => ({ x: x * K, z: z * K, face, ...(reach ? { reach: reach * K } : {}) });
  if (id === "rowan") return v.unlocks.includes("stall") ? spot(66, 24.6, "west", 3.8) : spot(53.8, 20.6, "south");
  if (id === "elowen") return v.built["elowen-conservatory"] ? spot(49.6, 21.6, "east") : spot(53.6, 30.2, "south");
  if (HOSTS[id]) return spot(HOSTS[id].x, HOSTS[id].z, HOSTS[id].face);
  const door = doorOf(id), east = door.x < 60 * K;
  return { x: door.x + (east ? 1.8 : -1.8), z: door.z, face: east ? "east" : "west" };
}
const FACE = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };
// Where to stand to talk to them (realm), a step in front.
export function talkSpot(state, id) { const s = residentSpot(state, id), a = FACE[s.face] ?? 0, d = s.reach ?? 1.8; return { x: s.x + Math.sin(a) * d, z: s.z - Math.cos(a) * d }; }

export function createVillageFolk({ scene, state, pickables, pickMaterial, ground = () => 0, everyone = () => false }) {
  const people = new Map(), moods = new Map();
  function sync() {
    // Residents of districts that aren't open yet wait out of sight until they are.
    const here = ["elowen", "rowan", "mabel", "tansy", "opal", "cinder", "corvus", "baron"].filter((id) => everyone() || districtOpen(state, RESIDENT_BY_ID[id].district)).concat(Object.keys(HOSTS));
    for (const [id, p] of people) if (!here.includes(id)) p.root.visible = false;
    for (const id of here) {
      let p = people.get(id);
      if (!p) {
        p = makeResident(id); scene.add(p.root);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(.9, 2, .9), pickMaterial); hit.userData = { type: "village-folk", id }; p.root.add(hit); hit.position.y = 1; pickables.push(hit);
        people.set(id, p);
      }
      p.root.visible = true; const spot = residentSpot(state, id); p.spot = spot;
      if (!p.walking) { p.root.position.set(spot.x, ground(spot.x, spot.z), -spot.z); p.baseYaw = FACE[spot.face] ?? 0; }
    }
  }
  // Moods: idle, talk (while in a conversation), wave (a greeting), set by the UI.
  function mood(id, m, facing) { moods.set(id, { m, at: performance.now() / 1000, facing }); }
  function tick(dt, time, camera) {
    for (const p of people.values()) {
      const md = moods.get(p.id), t = time + p.id.length, d = p.design;
      let yaw = p.baseYaw ?? 0;
      if (md?.facing) yaw = Math.atan2(md.facing.x - p.root.position.x, -md.facing.z - p.root.position.z);
      const turn = ((yaw - p.root.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      p.root.rotation.y += Math.sign(turn) * Math.min(Math.abs(turn), dt * 4);
      const breathe = Math.sin(t * 1.6) * .012;
      p.hip.scale.y = 1 + breathe; if (d.float) p.hip.position.y = .12 + Math.sin(t * 1.2) * .08;
      p.head.rotation.z = Math.sin(t * .7) * .04; p.head.rotation.x = Math.sin(t * .5) * .03;
      if (!p.armL) continue;
      const talking = md?.m === "talk", waving = md?.m === "wave" && time < (md.at ?? 0) + 2.2;
      p.armL.rotation.x = Math.sin(t * 1.3) * .05 + (talking ? Math.sin(t * 3.1) * .25 - .2 : 0);
      p.armR.rotation.x = Math.sin(t * 1.3 + 1) * .05 + (talking ? Math.sin(t * 2.6 + 1) * .2 - .1 : 0);
      p.armR.rotation.z = waving ? 2.4 + Math.sin(t * 9) * .35 : 0;
      if (talking) p.head.rotation.x = Math.sin(t * 4.2) * .06;
    }
  }
  return { sync, tick, mood, people, spotOf: (id) => residentSpot(state, id), talkSpot: (id) => talkSpot(state, id) };
}
export { DESIGNS };
