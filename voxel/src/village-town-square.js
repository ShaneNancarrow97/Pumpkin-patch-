// Mothlight's town square, drawn straight onto the spread ground (content/village-town-square.js has the plan):
// a round plaza of setts on the Quarry road, the Lantern Fountain at its heart with the Lamplighter raising a
// lantern over the square, the Moonclock gate over the road to the Quarry (its hands keep the player's own time),
// the Moonlit Market's stalls, a bandstand, and lamps strung with festoons. Grid units, x east, z north.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ChunkedVoxels, Voxels, seeded, vary } from "./voxels.js";
import { C, shade, frame, lantern, lampPost, parkBench, roundPlanter, canopyTree, festoon, mothPillar, marketStall, mothBanner, hedge, pumpkin, hayBale } from "./village-models.js";
import { groundHeight as HN } from "./village-terrain.js";
import { TOWN } from "./content/village-town-square.js";
import { createVillageWaterClock, createVillageWaterMaterial } from "./village-water-material.js";

const pick = (list, r) => list[(r() * list.length) | 0];
// Writers on the spread ground: realm coordinates (z north), standing on the ground there.
const ground = (v) => ({ block(x, y, z, w, h, d, c, g) { v.block(x, y + HN(x, z), -z, w, h, d, c, g); return this; } });
const at = (v, x, z, facing = "south") => frame(v, x, z, facing, HN(x, z));
// A filled round, as three overlapping boxes (an octagon), for floors and pools.
const disc = (f, x, y, z, R, h, c) => { f.block(x, y, z, R * 1.84, h, R * .76, c); f.block(x, y, z, R * .76, h, R * 1.84, c); f.block(x, y, z, R * 1.41, h, R * 1.41, c); };
// A ring of blocks of size s round (x, z) at radius R.
const ring = (f, x, y, z, R, n, s, h, colour) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; f.block(x + Math.cos(a) * R, y, z + Math.sin(a) * R, s, h, s, typeof colour === "function" ? colour(i) : colour); } };
const BRONZE = [0x4f7f72, 0x5a8c7e, 0x447064], BRONZE_LIGHT = 0x7fb0a0, WATER_FALL = 0xa8dcf4, SPRAY = [0xd8eef8, 0xbfe3f5, 0xeaf6fb];
// A curtain of falling water round a bowl's lip: fine uneven strands, paler at the top, and foam where it lands.
function curtain(f, x, z, R, top, bottom, n, r) {
  for (let i = 0; i < n; i++) {
    const a = (i + r() * .6) / n * Math.PI * 2, rr = R + (r() - .5) * .08, len = (top - bottom) * (.82 + r() * .18), w = .035 + r() * .03;
    f.block(x + Math.cos(a) * rr, top - len, z + Math.sin(a) * rr, w, len, w, pick(SPRAY, r));
    if (i % 2 === 0) f.block(x + Math.cos(a) * (rr + .06), bottom - .02, z + Math.sin(a) * (rr + .06), .16 + r() * .1, .06, .16 + r() * .1, 0xf2f8fb);
  }
}

// The Lantern Fountain: a round basin, two bowls spilling into each other, and the Lamplighter on top, a hooded
// bronze figure with a moth's folded wings, raising a lantern on a crook over the square.
function lanternFountain(f, F, r) {
  const { x, z } = F, stone = () => vary(pick(C.stone, r), .04, r);
  // The basin: two courses of dressed stone and a pale cap, round a dark pool.
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2, cx = x + Math.cos(a) * F.r, cz = z + Math.sin(a) * F.r;
    f.block(cx, 0, cz, .62, .32, .62, stone()); f.block(cx, .32, cz, .58, .3, .58, stone());
    f.block(x + Math.cos(a) * (F.r + .04), .62, z + Math.sin(a) * (F.r + .04), .8, .12, .8, i % 2 ? C.stone[3] : C.stone[1]);
  }
  disc(f, x, 0, z, F.r - .3, .06, 0x24404c);
  // The pedestal and the great bowl, its lip spilling a curtain of water into the basin.
  ring(f, x, 0, z, 1.25, 20, .5, .9, () => stone()); f.block(x, 0, z, 1.9, .9, 1.9, C.stone[1]);
  for (const [R, y] of [[.9, .9], [1.5, 1.05], [2, 1.2]]) disc(f, x, y, z, R, .16, vary(C.stone[2], .04, r));
  ring(f, x, 1.25, z, 2.35, 40, .4, .3, (i) => i % 2 ? C.stone[3] : C.stone[1]);
  curtain(f, x, z, 2.5, 1.38, .52, 72, r);
  // The column, a brass band, and the small bowl.
  f.block(x, 1.45, z, .8, 1.3, .8, C.stone[1]); f.block(x, 2.0, z, .9, .1, .9, C.brass);
  for (const [R, y] of [[.6, 2.75], [1, 2.88]]) disc(f, x, y, z, R, .12, C.stone[2]);
  ring(f, x, 2.95, z, 1.35, 24, .32, .2, (i) => i % 2 ? C.stone[3] : C.stone[1]);
  curtain(f, x, z, 1.48, 3.0, 1.46, 40, r);
  // Bronze spouts at the pedestal's foot, each pouring an arc into the basin.
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    f.block(x + dx * 1.45, .6, z + dz * 1.45, dx ? .42 : .22, .22, dz ? .42 : .22, BRONZE[0]);
    for (let k = 0; k < 4; k++) f.block(x + dx * (1.75 + k * .22), .62 - k * k * .045, z + dz * (1.75 + k * .22), .1, .1, .1, WATER_FALL);
  }
  // The plinth and the Lamplighter, facing the way in from the Green.
  f.block(x, 3.05, z, 1, .6, 1, C.stone[1]); f.block(x, 3.65, z, 1.2, .1, 1.2, C.stone[3]);
  const b = () => vary(pick(BRONZE, r), .04, r);
  for (const [w, h, d, y] of [[1.1, .3, .92, 3.75], [1, .5, .82, 4.05], [.9, .5, .74, 4.55], [.82, .45, .68, 5.05], [.96, .2, .62, 5.45]]) f.block(x, y, z, w, h, d, b());
  // Folded moth wings down its back, each with an eye.
  for (const s of [-1, 1]) {
    f.block(x + s * .3, 4.25, z + .43, .5, 1.55, .08, BRONZE_LIGHT); f.block(x + s * .52, 4.6, z + .44, .14, 1.1, .08, BRONZE[2]);
    f.block(x + s * .3, 5.35, z + .48, .14, .14, .03, C.gold); f.block(x + s * .3, 4.55, z + .48, .1, .1, .03, C.gold);
  }
  // The hood, its face in shadow, and the arm raising the crook.
  f.block(x, 5.6, z, .62, .55, .6, b()); f.block(x, 5.66, z - .31, .32, .32, .04, 0x1a2420); f.block(x, 6.12, z + .08, .32, .2, .32, b());
  f.block(x + .52, 5.2, z, .22, .95, .22, b()); f.block(x + .58, 6.05, z, .18, .18, .18, BRONZE_LIGHT);
  f.block(x + .6, 4.9, z, .09, 3.5, .09, BRONZE[2]); f.block(x + .82, 8.32, z, .5, .09, .09, BRONZE[2]); f.block(x + 1.05, 8.12, z, .07, .25, .07, C.iron);
  lantern(f, x + 1.05, 7.48, z, 1.15);
  // Small lanterns on the basin's rim, on the diagonals.
  for (let q = 0; q < 4; q++) { const a = (q * 90 + 45) * Math.PI / 180, lx = x + Math.cos(a) * F.r, lz = z + Math.sin(a) * F.r; f.block(lx, .74, lz, .14, .55, .14, C.iron); lantern(f, lx, 1.29, lz, .7); }
}

// The Moonclock: a gatehouse over the Quarry road. Two piers of dressed stone with long-and-short quoins carry an
// arch; above it the tower, a lancet window, a moon-pale clock on both faces, a belfry with its bell, a slate spire
// and a moth weathervane. Drawn in its own frame facing the square (local +z is south).
function moonclockGate(f, G, r) {
  const stone = () => vary(pick(C.stone, r), .05, r), half = G.open / 2, pierW = (G.w - G.open) / 2, D = G.d;
  for (const s of [-1, 1]) {
    const cx = s * (half + pierW / 2);
    f.block(cx, 0, 0, pierW + .3, .35, D + .3, C.stone[2]);
    for (let k = 0; k < 12; k++) {
      const y = .35 + k * .5, long = k % 2 === 0; f.block(cx, y, 0, pierW, .5, D, stone());
      for (const ex of [-1, 1]) for (const ez of [-1, 1]) f.block(cx + ex * (pierW / 2 - (long ? .32 : .22)), y + .02, ez * (D / 2 - (long ? .22 : .32)), long ? .7 : .5, .46, long ? .5 : .7, C.stone[3]);
    }
    // Ivy climbing the outer corner of each pier.
    for (let vine = 0; vine < 3; vine++) {
      let vx = cx + s * (pierW / 2 - .25 - vine * .42); const tall = 2.2 + r() * 3.2;
      for (let y = 0; y < tall; y += .16) {
        vx += (r() - .5) * .12; f.block(vx, y, D / 2 + .03, .05, .17, .04, 0x3d3a22);
        if (r() < .7) { const side = r() < .5 ? -1 : 1, leaf = r() < .08 ? pick(C.crimson, r) : vary(pick(C.hedge, r), .12, r); f.block(vx + side * .12, y + .04, D / 2 + .05, .2, .16, .05, leaf); }
      }
    }
    mothBanner(f, cx, 3.6, D / 2 + .06, 1.25);
    // A lantern on a bracket either side of the arch.
    f.block(s * (half + .35), 3.85, D / 2 + .2, .1, .1, .4, C.iron); lantern(f, s * (half + .35), 3.05, D / 2 + .38, .95);
  }
  // The arch: a flattened round, voussoirs on both faces and a keystone with a gilt moth.
  for (let x = -half + .12; x < half; x += .24) {
    const under = 4.5 + 1.3 * Math.sqrt(Math.max(0, 1 - (x / half) ** 2));
    f.block(x, under, 0, .26, 6.35 - under, D, stone());
    for (const ez of [-1, 1]) f.block(x, under, ez * (D / 2 + .02), .26, .45, .06, Math.round((x + half) / .24) % 2 ? C.stone[3] : C.stone[1]);
  }
  for (const ez of [-1, 1]) { f.block(0, 5.6, ez * (D / 2 + .06), .62, .78, .12, C.stone[3]); f.block(0, 5.9, ez * (D / 2 + .14), .36, .14, .03, C.gold); f.block(0, 5.82, ez * (D / 2 + .14), .1, .3, .03, C.gold); }
  lantern(f, 0, 4.7, 0, .9); f.block(0, 5.3, 0, .06, .6, .06, C.iron);
  // A cornice across the whole gate, with dentils.
  f.block(0, 6.35, 0, G.w + .4, .3, D + .4, C.stone[3]);
  for (let x = -G.w / 2; x <= G.w / 2; x += .5) for (const ez of [-1, 1]) f.block(x, 6.2, ez * (D / 2 + .08), .22, .15, .1, C.stone[1]);
  // Pinnacles at the outer corners of the piers' tops.
  for (const s of [-1, 1]) for (const ez of [-1, 1]) { const px = s * (G.w / 2 - .4), pz = ez * (D / 2 - .4); f.block(px, 6.65, pz, .5, .55, .5, C.stone[1]); f.block(px, 7.2, pz, .32, .5, .32, C.stone[3]); f.block(px, 7.7, pz, .12, .45, .12, C.gold); }
  // The tower: courses with quoins, a lancet window under the clock on both faces.
  const TW = 6.8, TD = 3.6, top = 12.9;
  for (let y = 6.65, k = 0; y < top; y += .5, k++) {
    f.block(0, y, 0, TW, Math.min(.5, top - y), TD, stone());
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) f.block(ex * (TW / 2 - (k % 2 ? .22 : .32)), y + .02, ez * (TD / 2 - (k % 2 ? .32 : .22)), k % 2 ? .5 : .7, Math.min(.46, top - y - .02), k % 2 ? .7 : .5, C.stone[3]);
  }
  for (const ez of [-1, 1]) {
    const fz = ez * (TD / 2 + .02);
    f.block(0, 6.95, fz, 1.2, 1.7, .05, C.stone[3]); f.block(0, 7.05, fz + ez * .02, .82, 1.32, .05, C.window, true);
    f.block(0, 8.37, fz + ez * .02, .52, .2, .05, C.window, true); f.block(0, 8.57, fz + ez * .02, .22, .14, .05, C.window, true); f.block(0, 7.7, fz + ez * .04, .82, .06, .04, C.iron); f.block(0, 7.05, fz + ez * .04, .06, 1.32, .04, C.iron);
    // The clock: a moon-pale face in an iron ring, gilt hours.
    const cy = G.clock, R = 1.95, cz = ez * (TD / 2 + .05);
    for (let yy = -R + .15; yy < R; yy += .3) { const hw = Math.sqrt(R * R - yy * yy); f.block(0, cy + yy - .15, cz, hw * 2, .3, .06, 0x9a8e74, true); }
    for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2; f.block(Math.cos(a) * (R + .1), cy + Math.sin(a) * (R + .1) - .13, cz + ez * .03, .28, .26, .1, C.iron); }
    for (let h = 0; h < 12; h++) { const a = h / 12 * Math.PI * 2, big = h % 3 === 0; f.block(Math.sin(a) * 1.62, cy + Math.cos(a) * 1.62 - .1, cz + ez * .05, big ? .16 : .12, big ? .3 : .16, .04, C.gold, true); }
    f.block(0, cy - .12, cz + ez * .07, .24, .24, .05, C.gold);
  }
  f.block(0, top, 0, TW + .5, .3, TD + .5, C.stone[3]);
  for (const ex of [-1, 1]) for (const ez of [-1, 1]) { const px = ex * (TW / 2 - .35), pz = ez * (TD / 2 - .35); f.block(px, top + .3, pz, .5, .6, .5, C.stone[1]); f.block(px, top + .9, pz, .3, .5, .3, C.stone[3]); f.block(px, top + 1.4, pz, .1, .4, .1, C.gold); }
  // The belfry: corner posts, pointed openings, and the bell on its beam.
  const bf = top + .3, BS = 3.6;
  for (const ex of [-1, 1]) for (const ez of [-1, 1]) f.block(ex * (BS / 2 - .35), bf, ez * (BS / 2 - .35), .7, 2.4, .7, stone());
  for (const ez of [-1, 1]) { f.block(0, bf + 2.1, ez * (BS / 2 - .2), BS, .55, .4, C.stone[3]); f.block(0, bf + 1.85, ez * (BS / 2 - .2), .9, .3, .4, C.stone[1]); }
  for (const ex of [-1, 1]) { f.block(ex * (BS / 2 - .2), bf + 2.1, 0, .4, .55, BS, C.stone[3]); f.block(ex * (BS / 2 - .2), bf + 1.85, 0, .4, .3, .9, C.stone[1]); }
  f.block(0, bf, 0, BS - .2, .12, BS - .2, C.stone[2]); f.block(0, bf + 2.0, 0, BS - .9, .14, .18, C.beam);
  for (const [w, h, y] of [[1, .22, .55], [.86, .3, .77], [.72, .3, 1.07], [.56, .26, 1.37], [.3, .22, 1.63]]) f.block(0, bf + y, 0, w, h, w, C.brass);
  f.block(0, bf + .42, 0, .14, .2, .14, shade(C.brass, .7));
  // The spire, in courses of slate, and the moth on its rod.
  const sp = bf + 2.65;
  for (let i = 0; i < 12; i++) { const s = 4.1 - i * .32; f.block(0, sp + i * .36, 0, s, .38, s, i % 2 ? C.slate[0] : C.slate[1]); }
  const tip = sp + 12 * .36;
  f.block(0, tip, 0, .1, 1.2, .1, C.gold); f.block(0, tip + .35, 0, .28, .28, .28, C.gold);
  f.block(0, tip + 1.15, 0, .12, .12, .55, C.gold); for (const s of [-1, 1]) { f.block(s * .3, tip + 1.16, -.05, .5, .05, .36, C.gold); f.block(s * .22, tip + 1.16, .2, .3, .05, .22, shade(C.gold, .85)); }
}

// The bandstand: an octagon on a stone plinth, iron columns, a railing open towards the fountain, a scalloped
// frieze hung with bulbs, a copper dome with gilt ribs and a lantern on top.
function bandstand(f, B, r) {
  const { x, z } = B, n8 = (k) => (k * 45 + 22.5) * Math.PI / 180;
  ring(f, x, 0, z, B.r - .2, 36, .66, .7, () => vary(pick(C.stone, r), .04, r));
  ring(f, x, .7, z, B.r - .16, 36, .76, .08, C.stone[3]);
  disc(f, x, 0, z, B.r - .45, .7, C.stone[2]);
  for (let k = -3; k <= 3.01; k += .3) { const len = 2 * Math.sqrt(Math.max(0, (B.r - .5) ** 2 - k * k)); if (len > .2) f.block(x, .7, z + k, len, .09, .28, vary(C.woodLight, .06, r)); }
  // Steps down to the fountain's side.
  for (const [dx, h] of [[-4.0, .24], [-3.68, .47], [-3.36, .7]]) f.block(x + dx, 0, z, .36, h, 2.6, vary(C.stone[1], .03, r));
  const posts = Array.from({ length: 8 }, (_, k) => ({ x: x + Math.cos(n8(k)) * (B.r - .5), z: z + Math.sin(n8(k)) * (B.r - .5) }));
  for (const p of posts) { f.block(p.x, .78, p.z, .16, 2.8, .16, C.iron); f.block(p.x, 1.2, p.z, .24, .08, .24, C.gold); f.block(p.x, 3.48, p.z, .32, .12, .32, C.gold); }
  // The railing between the posts, but for the opening towards the steps (west).
  for (let k = 0; k < 8; k++) {
    if (k === 3) continue;
    const a = posts[k], b = posts[(k + 1) % 8], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(len / .14);
    for (let i = 0; i <= n; i++) { const t = i / n, px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t; f.block(px, 1.52, pz, .14, .06, .14, C.iron); f.block(px, .92, pz, .12, .05, .12, C.iron); if (i % 2 === 0) f.block(px, .97, pz, .05, .55, .05, C.iron); }
  }
  // The frieze and its scallops, bulbs under the eaves, then the dome.
  ring(f, x, 3.6, z, B.r - .25, 44, .52, .26, (i) => i % 2 ? C.plum : C.cream);
  for (let i = 0; i < 44; i += 2) { const a = i / 44 * Math.PI * 2; f.block(x + Math.cos(a) * (B.r - .22), 3.46, z + Math.sin(a) * (B.r - .22), .3, .14, .3, C.plum); }
  for (let i = 0; i < 24; i++) { const a = (i + .5) / 24 * Math.PI * 2; f.block(x + Math.cos(a) * (B.r - .3), 3.32, z + Math.sin(a) * (B.r - .3), .11, .13, .11, [0xff9a30, 0xffb84a, 0xd86a2a][i % 3], true); }
  for (let i = 0; i < 10; i++) {
    const t = i / 9, R = (B.r + .15) * (1 - t * t * .72) - t * .5, y = 3.86 + i * .24;
    disc(f, x, y, z, Math.max(.3, R), .25, vary(pick(C.teal, r), .04, r));
    for (let k = 0; k < 8; k++) { const a = n8(k) - Math.PI / 8; f.block(x + Math.cos(a) * Math.max(.2, R - .05), y, z + Math.sin(a) * Math.max(.2, R - .05), .1, .26, .1, C.gold); }
  }
  lantern(f, x, 6.28, z, .9); f.block(x, 6.95, z, .06, .35, .06, C.gold);
  // A gramophone and two music stands, ready for the band.
  f.block(x + 1, .78, z + .9, .5, .36, .44, C.wood); f.block(x + 1, 1.14, z + .9, .36, .04, .36, C.iron); f.block(x + 1.1, 1.18, z + .8, .05, .4, .05, C.brass);
  for (const [w, y, dx] of [[.18, 1.56, .14], [.3, 1.66, .28], [.46, 1.78, .44]]) f.block(x + 1.1 + dx, y, z + .75, .08, w, w, C.brass);
  for (const dz of [-1, .1]) { f.block(x + .2, .78, z + dz, .04, .95, .04, C.iron); f.block(x + .2, 1.7, z + dz, .05, .32, .42, C.iron); f.block(x + .17, 1.74, z + dz, .02, .24, .34, C.cream); }
}

// Fairy lights from lamp to lamp round the plaza and from the diagonal lamps to the Lamplighter: drawn as bulbs
// in the batch and smooth cables in one mesh.
function cables(list) {
  if (!list.length) return null;
  const parts = list.map(({ ax, ay, az, bx, by, bz, sag }) => {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t - Math.sin(t * Math.PI) * sag; pts.push(new THREE.Vector3(x, y + HN(x, z), -z)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .022, 4, false);
  });
  const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0x1e1a24, roughness: .55, metalness: .2 }));
  parts.forEach((g) => g.dispose()); return mesh;
}

// The plaza's setts, laid in rings round the fountain, with rose granite bands, a brass ring and twelve moon
// phases set into it, and a long kerb at the edge.
function plazaTexture() {
  const K = 40, R = TOWN.r, S = Math.round(R * 2 * K), canvas = document.createElement("canvas"); canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d"), r = seeded(4421), c = S / 2;
  ctx.fillStyle = "#5c5862"; ctx.fillRect(0, 0, S, S);
  const tones = ["#a29e9a", "#aeaaa4", "#94908c", "#b8b3ac", "#a09890"], rose = ["#b8958a", "#c4a092", "#ad8a80"];
  let k = 0;
  for (let rad = TOWN.fountain.r + .45; rad < R; rad += .34, k++) {
    const n = Math.max(8, Math.round(Math.PI * 2 * rad / .38)), band = k === 3 || k === 17 || k === 30, start = r();
    for (let i = 0; i < n; i++) {
      const a = (i + start) / n * Math.PI * 2, px = c + Math.cos(a) * rad * K, py = c + Math.sin(a) * rad * K, len = Math.PI * 2 * rad / n * K;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = band ? rose[(r() * 3) | 0] : tones[(r() * tones.length) | 0]; ctx.fillRect(-len / 2 + 1, -.15 * K, len - 2, .3 * K);
      ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(-len / 2 + 2, -.15 * K + 1, len - 4, 2);
      ctx.fillStyle = "rgba(20,15,30,.2)"; ctx.fillRect(-len / 2 + 2, .15 * K - 3, len - 4, 2);
      ctx.restore();
    }
  }
  ctx.save(); ctx.translate(c, c);
  for (const rad of [8.6, 12.4]) { ctx.beginPath(); ctx.arc(0, 0, rad * K, 0, Math.PI * 2); ctx.strokeStyle = "#545568"; ctx.lineWidth = .2 * K; ctx.stroke(); ctx.strokeStyle = "#c8aa6c"; ctx.lineWidth = .05 * K; ctx.stroke(); }
  // Twelve moon phases between the two rings, waxing round the square.
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + Math.PI / 12, mx = Math.cos(a) * 10.5 * K, my = Math.sin(a) * 10.5 * K, mr = .46 * K, phase = i / 12;
    ctx.beginPath(); ctx.arc(mx, my, mr + .1 * K, 0, Math.PI * 2); ctx.fillStyle = "#666578"; ctx.fill(); ctx.strokeStyle = "#c8aa6c"; ctx.lineWidth = .05 * K; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = "#e8dfc6"; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#666578"; ctx.beginPath(); ctx.arc(mx + Math.cos(phase * Math.PI * 2) * mr * 1.9, my, mr * (phase < .5 ? 1 : 1.02), 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildTownSquare({ waterClock = createVillageWaterClock() } = {}) {
  const v = new ChunkedVoxels(32), R = ground(v), r = seeded(4401), list = [], F = TOWN.fountain, G = TOWN.gate;
  lanternFountain(R, F, r);
  moonclockGate(at(v, G.x, G.z, "south"), G, seeded(4407));
  bandstand(R, TOWN.bandstand, seeded(4409));
  // The Moonlit Market: three stalls facing the fountain, crates and pumpkins between them, a cart and a sign.
  const colours = { plum: [C.plum, C.cream], crimson: [C.crimson[0], C.cream], teal: [C.teal[0], C.cream] };
  TOWN.stalls.forEach((s, i) => { const [a, b] = colours[s.colour]; marketStall(at(v, s.x, s.z, "east"), a, b, s.goods, seeded(4411 + i)); });
  for (const z of [47.6, 54.5, 61.5, 68.4]) { R.block(45.2, 0, z, .62, .55, .62, vary(C.wood, .08, r)); R.block(45.2, .55, z, .5, .04, .5, C.timber); pumpkin(R, 45.9, z + .35, .5, r); pumpkin(R, 45.7, z - .45, .38, r, "white"); }
  { const cx = 47.2, cz = 46.4; R.block(cx, .42, cz, 1.6, .45, .9, vary(C.wood, .05, r)); for (const s of [-1, 1]) { R.block(cx + s * .55, 0, cz + .5, .7, .7, .1, C.beam); R.block(cx + s * .55, .3, cz + .5, .14, .14, .14, C.iron); } R.block(cx - 1.1, .62, cz - .2, .8, .07, .07, C.timber); R.block(cx - 1.1, .62, cz + .2, .8, .07, .07, C.timber); for (let i = 0; i < 5; i++) pumpkin(R, cx - .5 + (i % 3) * .5, cz - .15 + (i > 2 ? .3 : 0), .42, r, i % 4 ? "orange" : "white", .87); }
  { const sx = 45.4, sz = 69.6; R.block(sx, 0, sz, .16, 2.6, .16, C.timber); R.block(sx, 2.25, sz + .55, 1.3, .7, .08, C.plumDeep); R.block(sx, 2.3, sz + .55, 1.1, .05, .1, C.gold); R.block(sx, 2.82, sz + .55, 1.1, .05, .1, C.gold); R.block(sx, 2.95, sz, .1, .1, .7, C.iron); for (let i = 0; i < 5; i++) R.block(sx + .02, 2.5, sz + .2 + i * .15, .03, .2, .08, C.cream); }
  // Benches facing the fountain, lamps round the edge, planters on the diagonals, trees beyond.
  for (const b of TOWN.benches) parkBench(at(v, b.x, b.z, b.facing), 0, 0, r);
  for (const l of TOWN.lamps) lampPost(R, l.x, l.z, 3.4, r, 2);
  const autumn = [0xf08a3a, 0xf5d04a, 0xe0403a, 0xd6407a, 0xf6f0f5];
  for (const p of TOWN.planters) roundPlanter(R, p.x, p.z, 1.1, r, autumn, "topiary");
  for (const t of TOWN.trees) canopyTree(R, t.x, t.z, 1.25, r, pick([C.crimson, C.golden, C.violet, C.magenta], r), { cell: .45 });
  // The way in from the Green: moth pillars beside the road, hedges along the lawn either side.
  for (const p of TOWN.pillars) mothPillar(R, p.x, p.z, r);
  for (const [cx, w] of [[41.2, 22.2], [74.8, 22.2]]) hedge(R, cx, 39.4, w, .8, .8, r);
  for (const [x, z] of [[33, 44], [83, 44], [31.5, 72], [84.5, 72]]) { hayBale(R, x, z, r); pumpkin(R, x + .9, z + .4, .55, r); pumpkin(R, x - .7, z - .5, .4, r, "white"); }
  // Fairy lights: round the plaza, lamp to lamp, and from the diagonal lamps to the Lamplighter.
  const lamps = TOWN.lamps;
  for (let i = 0; i < lamps.length; i++) { const a = lamps[i], b = lamps[(i + 1) % lamps.length]; festoon(R, a.x, 3.5, a.z, b.x, 3.5, b.z, 9, .45, undefined, list); }
  for (const l of lamps.filter((l) => (l.deg - 45) % 90 === 0)) { const dx = l.x - F.x, dz = l.z - F.z, d = Math.hypot(dx, dz); festoon(R, l.x, 3.55, l.z, F.x + dx / d * .55, 6.4, F.z + dz / d * .55, 18, .8, undefined, list); }
  const group = v.build({ detailShadows: false, small: .3, glow: 1.6 }), wire = cables(list); if (wire) group.add(wire);
  // The plaza: a disc of setts laid flat on the ground, a long kerb round its edge but where the road comes in.
  const geo = new THREE.CircleGeometry(TOWN.r, 96), uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + TOWN.r) / (TOWN.r * 2), (pos.getY(i) + TOWN.r) / (TOWN.r * 2));
  const plaza = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: plazaTexture(), roughness: .9, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(TOWN.cx, HN(TOWN.cx, TOWN.cz) + .05, -TOWN.cz); plaza.receiveShadow = true; plaza.renderOrder = 2; group.add(plaza);
  const kerb = new Voxels(), K = ground(kerb);
  for (let i = 0; i < 200; i++) { const a = i / 200 * Math.PI * 2, x = TOWN.cx + Math.cos(a) * (TOWN.r - .12), z = TOWN.cz + Math.sin(a) * (TOWN.r - .12); if (Math.abs(x - TOWN.cx) < 3.15) continue; K.block(x, 0, z, .34, .13, .34, vary(pick(C.stone, r), .05, r)); }
  group.add(kerb.build({ detailShadows: false }));
  // Water in the basin and both bowls.
  const water = createVillageWaterMaterial({ clock: waterClock, opacity: .9 });
  for (const [rad, y] of [[F.r - .25, .5], [2.15, 1.42], [1.2, 3.07]]) { const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 48), water); m.rotation.x = -Math.PI / 2; m.position.set(F.x, HN(F.x, F.z) + y, -F.z); group.add(m); }
  // The Moonclock's hands, on both faces, turned to the time each frame by tick().
  const hands = [];
  for (const ez of [1, -1]) for (const [len, w, kind] of [[1.1, .2, "h"], [1.62, .13, "m"]]) {
    const hv = new Voxels(); hv.block(0, -.2, 0, w, len + .2, .05, C.iron); hv.block(0, len - .25, 0, w * .7, .2, .06, C.gold);
    // Just proud of the face: the tower is 3.6 deep, its faces 1.85 either side of the gate's middle.
    const hand = hv.build({ detailShadows: false }); hand.position.set(G.x, HN(G.x, G.z) + G.clock - .12, -G.z + ez * 1.95); hand.userData = { kind, face: ez, voxelAOMovable: true }; group.add(hand); hands.push(hand);
  }
  group.userData.tick = (now = new Date()) => {
    const m = now.getMinutes() + now.getSeconds() / 60, h = (now.getHours() % 12) + m / 60;
    for (const hand of hands) hand.rotation.z = -hand.userData.face * (hand.userData.kind === "m" ? m / 60 : h / 12) * Math.PI * 2;
  };
  group.userData.tick();
  group.userData.visualBudget = { boxes: v.count + kerb.solid.length + 8, addedLights: 0 };
  group.userData.spread = "native"; group.name = "town square";
  return group;
}
