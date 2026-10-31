import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { ESTATE_DEFAULT_FINISHES, ESTATE_FINISH_BY_ID, ESTATE_EXPANSIONS, ESTATE_DECOR_BY_ID, ESTATE_SKIN_BY_ID, ESTATE_HOUSE_SIZES, ESTATE_KITCHEN_WING } from "./content/house-estate.js";

const STONE = [0x777281, 0x99919b, 0x5a5666], WOOD = 0x392b2b, GOLD = 0xcaa269, LEAVES = [0x7b3141, 0xab4f37, 0xd5823e, 0x62404d], GREEN = [0x35483c, 0x4c6250, 0x6a7654];
const colour = (finishes, key) => ESTATE_FINISH_BY_ID[finishes?.[key]] ?? ESTATE_FINISH_BY_ID[ESTATE_DEFAULT_FINISHES[key]];
const stone = (v, r, x, y, z, w, h, d) => v.block(x, y, z, w, h, d, vary(STONE[(r() * STONE.length) | 0], .07, r));

// A small real lantern: frame, warm glass, cap, handle and feet.
function lantern(v, x, y, z, size = 1, metal = 0x342c35) {
  v.block(x, y, z, .36 * size, .08 * size, .36 * size, metal);
  v.block(x, y + .08 * size, z, .25 * size, .34 * size, .25 * size, 0xffbd65, true);
  for (const dx of [-.14, .14]) for (const dz of [-.14, .14]) v.block(x + dx * size, y + .06 * size, z + dz * size, .035 * size, .4 * size, .035 * size, metal);
  v.block(x, y + .43 * size, z, .4 * size, .075 * size, .4 * size, metal);
  v.block(x, y + .51 * size, z, .24 * size, .07 * size, .24 * size, GOLD);
  v.block(x, y + .58 * size, z, .08 * size, .1 * size, .08 * size, metal);
}

// Rounded, ribbed voxel pumpkins with little illuminated faces.
function pumpkin(v, x, y, z, radius, seed = 0, face = true) {
  const r = seeded(seed + 23), step = radius / 3;
  for (let yy = 0; yy < 6; yy++) for (let xx = -3; xx <= 3; xx++) for (let zz = -3; zz <= 3; zz++) {
    const q = (xx / 3.15) ** 2 + ((yy - 2.4) / 2.9) ** 2 + (zz / 3.15) ** 2;
    if (q <= 1) v.block(x + xx * step, y + yy * step * .83, z + zz * step, step * .98, step * .83, step * .98, vary(xx % 2 ? 0xc55f24 : 0xf28c31, .08, r));
  }
  v.block(x, y + radius * 1.56, z, radius * .22, radius * .42, radius * .22, 0x4c5935);
  if (face) {
    for (const dx of [-.31, .31]) v.block(x + dx * radius, y + radius * .76, z + radius * .92, radius * .2, radius * .23, radius * .12, 0xffd080, true);
    v.block(x, y + radius * .4, z + radius * .95, radius * .55, radius * .13, radius * .1, 0xffc77b, true);
  }
}

// Flowers have separate stems, leaves, petals and a tiny warm centre.
function flower(v, x, y, z, scale = 1, shade = 0x9b5d83) {
  v.block(x, y, z, .045 * scale, .38 * scale, .045 * scale, 0x456047);
  v.block(x - .08 * scale, y + .15 * scale, z, .16 * scale, .05 * scale, .1 * scale, 0x77846a);
  for (const [dx, dz] of [[-.075, 0], [.075, 0], [0, -.075], [0, .075]]) v.block(x + dx * scale, y + .34 * scale, z + dz * scale, .12 * scale, .08 * scale, .12 * scale, shade);
  v.block(x, y + .4 * scale, z, .075 * scale, .05 * scale, .075 * scale, 0xe4c48d);
}

// Skin ornaments are facade-mounted voxel reliefs, finished on all four sides.
// They join the house's existing batches and never add individual draw calls.
function skinDetails(v, panel, skin, { w, d, h }) {
  const accent = skin.accent, glow = skin.windowGlow, ivory = 0xe4d9bf, ink = 0x24212d;
  const crest = (face, centre, base, scale = 1) => {
    const p = (x, y, width, height, colour, lit = false, out = .38) => panel(face, centre + x * scale, base + y * scale, out, width * scale, height * scale, .11, colour, lit);
    const eye = (x, y, width = .13, height = .16) => p(x, y, width, height, glow, true, .51);
    if (skin.id === "harvest-haunt" || skin.id === "pumpkin-palace") {
      // A ribbed jack-o'-lantern escutcheon; the palace version wears a crown.
      for (const [x, y, width, height, colour] of [[0,.13,.78,.55,0xd97328],[0,0,.48,.83,0xe58a32],[-.38,.23,.2,.39,0xba5527],[.38,.23,.2,.39,0xba5527]]) p(x,y,width,height,colour);
      p(0,.83,.12,.21,0x67724a); p(-.2,.2,.035,.45,0xf1a143,false,.47); p(.2,.2,.035,.45,0xf1a143,false,.47);
      eye(-.2,.48); eye(.2,.48); eye(0,.21,.47,.1);
      if (skin.id === "pumpkin-palace") {
        p(0,.92,1.02,.13,accent); for (const x of [-.4,0,.4]) { p(x,1,.16,.22,accent); p(x,1.22,.11,.09,glow,true,.44); }
      }
    } else if (skin.id === "moonlit-cottage") {
      p(0,.15,.77,.59,0xcddcd7); p(0,.72,.54,.14,ivory); p(0,.86,.27,.09,ivory);
      for (const x of [-.28,0,.28]) p(x,0,.19,.23,ivory);
      p(-.18,.52,.12,.16,ink,false,.51); p(.18,.52,.12,.16,ink,false,.51); p(0,.28,.13,.15,ink,false,.51);
      for (const x of [-.56,.56]) { p(x,.6,.055,.22,glow,true); p(x,.68,.2,.055,glow,true); }
    } else if (skin.id === "witchwood") {
      // Crooked hat, a silver buckle and hanging moss.
      p(0,.16,1.22,.12,0x292c39); p(-.04,.28,.79,.2,0x343743); p(-.09,.48,.57,.19,0x3e414e); p(-.2,.67,.39,.18,0x434653); p(-.36,.85,.35,.13,0x434653);
      p(-.02,.3,.8,.1,accent,false,.49); p(.08,.29,.15,.15,ivory,false,.55); p(.08,.33,.065,.07,ink,false,.61);
      for (const x of [-.48,0,.42]) p(x,-.13,.07,.23,accent);
    } else if (skin.id === "candy-coven") {
      // An orange-and-plum peppermint seal, with a tiny glowing centre.
      const widths = [.38,.69,.87,.97,.87,.69,.38];
      widths.forEach((width, i) => p(0,i*.13,width,.13,ivory));
      for (const [x,y] of [[-.2,.13],[-.33,.39],[0,.65],[.29,.52],[.2,.13]]) p(x,y,.18,.18,accent,false,.5);
      eye(0,.34,.17,.2);
      p(-.56,.34,.25,.18,0x8d4778); p(.56,.34,.25,.18,0x8d4778);
    } else if (skin.id === "vampire-manor") {
      // Wide bat wings with pointed ears and two ivory fangs.
      p(0,.2,.37,.55,accent); p(-.11,.73,.1,.16,ink); p(.11,.73,.1,.16,ink);
      for (const side of [-1,1]) for (let i=0;i<4;i++) { p(side*(.27+i*.17),.45+i*.07,.22,.28-i*.035,ink); p(side*(.32+i*.17),.26+i*.1,.13,.16,ink); }
      eye(-.09,.58,.065,.09); eye(.09,.58,.065,.09);
      p(-.09,.13,.06,.17,ivory,false,.51); p(.09,.13,.06,.17,ivory,false,.51);
    } else if (skin.id === "storm-laboratory") {
      p(0,.03,1.13,.94,0x414c58); p(0,.12,.89,.73,0x26333f,false,.45);
      for (const [x,y] of [[.19,.74],[.08,.6],[-.03,.46],[.09,.35],[-.03,.2],[-.16,.05]]) p(x,y,.27,.15,glow,true,.54);
      for (const x of [-.45,.45]) for (const y of [.13,.79]) p(x,y,.08,.08,ivory,false,.53);
    } else if (skin.id === "midnight-crypt") {
      p(0,.28,.86,.58,ivory); p(0,.82,.56,.12,ivory); p(0,.08,.57,.2,ivory);
      p(-.22,.56,.22,.2,ink,false,.51); p(.22,.56,.22,.2,ink,false,.51); p(0,.35,.12,.14,ink,false,.51);
      for (const x of [-.18,0,.18]) p(x,.05,.035,.2,ink,false,.51);
      for (const side of [-1,1]) { p(side*.66,.15,.13,.68,accent); p(side*.66,.37,.4,.1,accent); }
    }
  };
  for (const face of ["front","back","left","right"]) {
    const length = face === "front" || face === "back" ? w : d;
    const palace = skin.id === "pumpkin-palace";
    crest(face,0,h-(palace?1.47:1.2),palace ? .85 : .92);
    if (skin.id === "harvest-haunt" || palace) {
      // A garland of gilded leaves sits below the eaves on every facade.
      for (let u=-length/2+.5, i=0;u<length/2-.3;u+=.48,i++) { panel(face,u,h-.38,.31,.25,.17,.1,i%2?accent:0xc06b2d); if(i%3===0)panel(face,u,h-.49,.32,.075,.13,.1,glow,true); }
    } else if (skin.id === "moonlit-cottage") {
      for (const u of [-length/2+.46,length/2-.46]) { panel(face,u,h-1.15,.32,.1,.62,.1,ivory); panel(face,u,h-.73,.36,.32,.1,.1,glow,true); }
    } else if (skin.id === "witchwood") {
      for(let u=-length/2+.3,i=0;u<length/2-.2;u+=.32,i++) panel(face,u,h-.25-(i%3)*.12,.3,.17,.2+(i%3)*.12,.12,accent);
      for (const u of [-length/2+.57,length/2-.57]) { panel(face,u,.18,.4,.12,.39,.15,ivory); panel(face,u,.57,.4,.52,.16,.36,accent); panel(face,u,.73,.4,.29,.1,.23,glow,true); }
    } else if (skin.id === "candy-coven") {
      panel(face,0,h-.2,.3,length+.17,.14,.16,ivory);
      for(const u of [-length/2+.13,length/2-.13]) for(let y=.75,i=0;y<h-.25;y+=.24,i++) panel(face,u,y,.3,.2,.22,.13,i%2?accent:ivory);
    } else if (skin.id === "vampire-manor") {
      for(const u of [-length/2+.38,length/2-.38]) { panel(face,u,h-.85,.28,.29,.65,.16,accent); panel(face,u,h-.98,.32,.12,.23,.11,ivory); }
    } else if (skin.id === "storm-laboratory") {
      for(const u of [-length/2+.4,length/2-.4]) {
        panel(face,u,.7,.3,.095,h-1,.1,0x687b85);
        for(const y of [1.1,2.5,h-.65]) { panel(face,u,y,.38,.4,.1,.23,accent); panel(face,u,y+.12,.39,.24,.09,.16,glow,true); }
      }
    } else if (skin.id === "midnight-crypt") {
      for(let u=-length/2+.38;u<length/2;u+=.72) { panel(face,u,h-.3,.28,.32,.18,.19,ivory); panel(face,u,h-.41,.3,.11,.14,.13,ivory); }
    }
  }
  // The gable faces are exposed in side/rear orbit views as well as the facade.
  for (const face of ["left","right"]) crest(face,0,h+1.58,.5);
}

// A full 360-degree house. Sealed wall skins, individual masonry, slates and
// exterior joinery are batched into only solid and emissive instance buffers.
export function buildEstateHouse(level = 0, finishes = {}) {
  level = Math.max(0, Math.min(3, Math.trunc(level) || 0));
  const v = new Voxels(), r = seeded(2077 + level), wall = colour(finishes, "walls"), roof = colour(finishes, "roof"), trim = colour(finishes, "trim"), door = colour(finishes, "door");
  const { w, d, h } = ESTATE_HOUSE_SIZES[level], dx = w / 2, dz = d / 2, roofRise = [2.5, 2.8, 3.1, 3.4][level];
  const skin = ESTATE_SKIN_BY_ID[wall.skinId] ?? null;
  const rows = level ? [1.3, 4.1] : [1.3], glass = skin?.windowGlow ?? (level === 3 ? 0xe2b18e : 0xffbb69);
  // Transform a horizontal wall coordinate onto any of the four facades.
  const panel = (face, u, y, out, pw, ph, pd, c, glow = false) => {
    if (face === "front") v.block(u, y, dz + out, pw, ph, pd, c, glow);
    else if (face === "back") v.block(-u, y, -dz - out, pw, ph, pd, c, glow);
    else if (face === "right") v.block(dx + out, y, -u, pd, ph, pw, c, glow);
    else v.block(-dx - out, y, u, pd, ph, pw, c, glow);
  };
  const windowCentres = face => (face === "front" || face === "back" ? [-dx + 1.3, dx - 1.3] : [-dz + 1.15, dz - 1.15]);
  const opening = (face, u, y) => {
    if ((face === "front" || face === "back") && Math.abs(u) < .74 && y < 2.6) return true;
    return rows.some(wy => y > wy - .06 && y < wy + 1.55 && windowCentres(face).some(wx => Math.abs(u - wx) < .67));
  };
  for (const face of ["front", "back", "left", "right"]) {
    const length = face === "front" || face === "back" ? w : d;
    // A thin closed skin stops daylight leaking through mortar and joinery.
    // Rooms use a separate scene; exterior windows keep their inset depth.
    panel(face, 0, .08, -.1, length, h, .14, wall.palette[2]);
    // Staggered masonry and inset window frames sit in front of the skin.
    for (let y = .16, course = 0; y < h; y += .26, course++) for (let u = -length / 2 + .22 - (course % 2) * .2; u < length / 2; u += .44) {
      if (Math.abs(u) > length / 2 - .08 || opening(face, u, y)) continue;
      panel(face, u, y, 0, .42, .245, .25, y < .7 ? vary(STONE[(r() * 3) | 0], .07, r) : vary(wall.palette[(r() * 3) | 0], .07, r));
    }
    // Stone quoin blocks, timber uprights and cornices finish every side.
    for (const u of [-length / 2 + .08, length / 2 - .08]) {
      for (let y = .1; y < h; y += .4) panel(face, u, y, .075, .28, .36, .32, y < .8 ? STONE[1] : WOOD);
    }
    for (const y of level ? [.65, 3.35, h - .12] : [.65, h - .12]) {
      panel(face, 0, y, .06, length + .15, .14, .28, WOOD);
      panel(face, 0, y + .14, .08, length + .2, .055, .3, trim.palette[0]);
    }
    if (level) for (const u of [-length / 2 + .7, 0, length / 2 - .7]) panel(face, u, 3.5, .09, .13, h - 3.55, .3, WOOD);
    for (const wy of rows) for (const wx of windowCentres(face)) {
      panel(face, wx, wy - .04, .07, 1.34, 1.62, .2, WOOD);
      panel(face, wx, wy + .1, .19, 1.04, 1.34, .1, glass, true);
      panel(face, wx, wy + .1, .28, .07, 1.36, .07, trim.palette[0]);
      panel(face, wx, wy + .72, .28, 1.06, .08, .07, trim.palette[0]);
      for (const edge of [-.61, .61]) {
        panel(face, wx + edge, wy + .02, .25, .13, 1.53, .18, trim.palette[0]);
        panel(face, wx + edge * 1.25, wy + .06, .12, .18, 1.35, .08, door.palette[0]);
        for (let yy = wy + .2; yy < wy + 1.35; yy += .19) panel(face, wx + edge * 1.25, yy, .18, .17, .055, .06, door.palette[2]);
      }
      panel(face, wx, wy + 1.54, .23, 1.4, .13, .24, trim.palette[1]);
      panel(face, wx, wy - .18, .29, 1.53, .2, .55, STONE[1]);
      if (wy < 2) {
        panel(face, wx, wy - .4, .31, 1.27, .2, .44, door.palette[2]);
        for (let f = -2; f <= 2; f++) panel(face, wx + f * .22, wy - .18, .4, .18, .18, .23, [0x8d4771, 0xb66e67, 0xb99ac5][(f + 2) % 3]);
      }
    }
    // Fully built back entrance, not a blank face when the player orbits.
    if (face === "front" || face === "back") {
      panel(face, 0, .3, .13, 1.48, 2.4, .23, trim.palette[0]);
      panel(face, 0, .35, .28, 1.2, 2.22, .15, door.palette[0]);
      for (const u of [-.45, -.22, 0, .22, .45]) panel(face, u, .42, .38, .025, 2.05, .035, door.palette[2]);
      panel(face, .39, 1.28, .41, .1, .14, .06, GOLD);
      panel(face, 0, 2.58, .18, 1.23, .23, .25, trim.palette[1]);
      panel(face, 0, 2.25, .4, .57, .24, .04, glass, true);
      panel(face, 0, 2.22, .45, .065, .3, .04, WOOD);
    }
  }
  // The foundation has stone steps and a wraparound plinth.
  v.block(0, -.02, 0, w + .4, .2, d + .4, STONE[2]);
  for (let i = 0; i < 3; i++) stone(v, r, 0, .02 + i * .11, dz + 1.25 - i * .3, 2.65 - i * .25, .12, .62);
  for (let i = 0; i < 2; i++) stone(v, r, 0, i * .13, -dz - .7 + i * .24, 1.8 - i * .25, .14, .6);
  // Slate courses slope down both sides of the roof; no filled interior volume.
  const roofDepth = dz + .48;
  for (let z = -roofDepth; z <= roofDepth; z += .29) {
    const y = h + roofRise * (1 - Math.abs(z) / roofDepth), course = Math.round((z + roofDepth) / .29);
    // Overlapping under-courses close the vertical gaps between sloped slates.
    const rise = roofRise / roofDepth * .29 + .18;
    v.block(0, y - rise + .1, z, w + .78, rise, .33, roof.palette[2]);
    for (let x = -dx - .42 - (course % 2) * .19; x < dx + .42; x += .39) {
      if (x < -dx - .48) continue;
      v.block(x, y, z, .382, .16, .31, vary(roof.palette[(r() * 3) | 0], .08, r));
      if ((course + Math.round(x * 4)) % 5 === 0) v.block(x, y + .165, z + .1, .28, .035, .045, roof.palette[2]);
    }
  }
  for (let x = -dx - .45; x <= dx + .4; x += .36) v.block(x, h + roofRise + .13, 0, .355, .16, .35, trim.palette[0]);
  for (const side of [-1, 1]) {
    // Gables close the two triangular ends and receive small attic windows.
    for (let y = h; y < h + roofRise; y += .2) {
      const half = roofDepth * (1 - (y - h) / roofRise);
      v.block(side * dx, y, 0, .22, .2, Math.max(.04, half * 2), vary(wall.palette[0], .07, r));
    }
    v.block(side * (dx + .14), h + .4, 0, .08, 1.05, .86, glass, true);
    v.block(side * (dx + .2), h + .36, 0, .07, 1.12, .065, trim.palette[0]);
    v.block(side * (dx + .2), h + .88, 0, .07, .075, .94, trim.palette[0]);
    for (let t = -roofDepth; t <= roofDepth; t += .18) v.block(side * (dx + .18), h + roofRise * (1 - Math.abs(t) / roofDepth) + .08, t, .14, .18, .22, trim.palette[0]);
  }
  // Gutters, drainpipes, four exterior lamps and rain barrels at the back.
  for (const z of [-roofDepth, roofDepth]) v.block(0, h - .08, z, w + .75, .1, .11, trim.palette[2]);
  for (const side of [-1, 1]) {
    v.block(side * (dx + .19), .25, -dz - .2, .09, h - .3, .09, trim.palette[2]);
    lantern(v, side * 1.1, 1.85, dz + .33, .72, WOOD);
    lantern(v, side * 1.05, 1.8, -dz - .32, .65, WOOD);
    for (let y = 0; y < .95; y += .16) v.block(side * (dx - .38), y, -dz - .62, .68, .15, .7, y === 0 || y > .75 ? 0x32313c : vary(0x6a4e37, .05, r));
    v.block(side * (dx - .38), .95, -dz - .62, .59, .04, .61, 0x534f69);
  }
  // A front porch shelters the doorway, with cut brackets and a tiled canopy.
  for (const side of [-1, 1]) {
    v.block(side * 1.23, .26, dz + 1.03, .17, 2.45, .17, WOOD);
    v.block(side * 1.23, .26, dz + 1.03, .28, .14, .28, STONE[1]);
    for (let i = 0; i < 4; i++) v.block(side * (1.23 - i * .07), 2.36 + i * .09, dz + 1.03, .15 + i * .09, .1, .17, trim.palette[0]);
  }
  for (let z = dz - .15; z < dz + 1.5; z += .24) for (let x = -1.48; x <= 1.48; x += .28) v.block(x, 2.85 + (1.6 - (z - dz)) * .16, z, .27, .1, .25, roof.palette[Math.abs(Math.round(x * 10)) % 3]);
  // Dormer windows look into the garden on both roof slopes.
  if (level > 0) for (const side of [-1, 1]) for (const x of level > 1 ? [-2.1, 2.1] : [0]) {
    const z = side * (dz * .59), base = h + roofRise * .38;
    v.block(x, base, z, 1.35, 1.36, .95, wall.palette[1]);
    v.block(x, base + .2, z + side * .5, .84, .95, .08, glass, true);
    v.block(x, base + .2, z + side * .56, .065, 1.03, .07, trim.palette[0]);
    v.block(x, base + .65, z + side * .56, .95, .065, .07, trim.palette[0]);
    for (let i = 0; i < 5; i++) v.block(x, base + 1.34 + i * .15, z, 1.58 - i * .28, .15, 1.18, roof.palette[i % 3]);
  }
  // Individually laid chimney bricks, open pots and a copper weather vane.
  const cx = dx - 1.08, cz = -dz * .46, chimneyBase = h + roofRise * .7;
  for (let y = chimneyBase; y < h + roofRise + 1.55; y += .22) for (let i = 0; i < 3; i++) stone(v, r, cx - .26 + i * .26, y, cz, .25, .21, .75);
  v.block(cx, h + roofRise + 1.55, cz, 1.05, .15, 1, STONE[2]);
  for (const x of [-.23, .23]) { v.block(cx + x, h + roofRise + 1.7, cz, .29, .5, .29, 0x9a694c); v.block(cx + x, h + roofRise + 2.2, cz, .35, .08, .35, 0x3b2c31); }
  v.block(-dx + .6, h + roofRise + .2, 0, .055, .95, .055, trim.palette[0]);
  v.block(-dx + .6, h + roofRise + .9, 0, .75, .07, .07, trim.palette[0]);
  v.block(-dx + .9, h + roofRise + .93, 0, .22, .19, .07, trim.palette[1]);
  // A separate kitchen wing gives the manor a visibly new footprint.
  if (level >= ESTATE_KITCHEN_WING.level) {
    const wx = -dx - ESTATE_KITCHEN_WING.out, wz = ESTATE_KITCHEN_WING.z;
    v.block(wx, .1, wz, 2.2, .35, 3.6, STONE[2]);
    for (const side of [-1, 1]) v.block(wx + side * .96, .36, wz, .16, 2.74, 3.6, wall.palette[2]);
    for (let yy = .45; yy < 3; yy += .25) for (let z = wz - 1.65; z < wz + 1.7; z += .45) v.block(wx - 1.02, yy, z, .25, .23, .43, vary(wall.palette[0], .08, r));
    for (const z of [wz - 1.75, wz + 1.75]) {
      v.block(wx, .45, z, 2.1, 2.5, .25, wall.palette[0]);
      v.block(wx, 1.3, z + Math.sign(z - wz) * .15, .9, 1.1, .08, glass, true);
      v.block(wx, 1.28, z + Math.sign(z - wz) * .22, .07, 1.18, .05, trim.palette[0]);
    }
    for (let x = wx - 1.2; x < wx + 1.2; x += .28) {
      const y = 3.1 + (1.2 - Math.abs(x - wx)) * .4;
      v.block(x, y - .18, wz, .31, .29, 3.92, roof.palette[2]);
    }
    for (const z of [wz - 1.75, wz + 1.75]) for (let y = 2.94; y < 3.58; y += .12) {
      const width = Math.max(.08, 2.4 * (1 - (y - 3.1) / .48));
      v.block(wx, y, z, Math.min(2.4, width), .14, .18, wall.palette[2]);
    }
    for (let x = wx - 1.2; x < wx + 1.2; x += .28) for (let z = wz - 1.95; z < wz + 1.95; z += .3) v.block(x, 3.1 + (1.2 - Math.abs(x - wx)) * .4, z, .27, .14, .3, vary(roof.palette[0], .08, r));
  }
  // The haven gains an octagonal-looking tower, windows on all four sides,
  // a stepped spire, balcony rail, and a tiny crescent finial.
  if (level === 3) {
    const tx = dx - .4, tz = -1.2, th = h + 2.1;
    v.block(tx, .02, tz, 2.34, .31, 2.34, STONE[2]);
    // Two merged cores back the tower’s decorative masonry courses.
    v.block(tx, .3, tz, 2.12, th - .3, 1.77, wall.palette[2]);
    v.block(tx, .3, tz, 1.77, th - .3, 2.12, wall.palette[2]);
    for (let y = .3; y < th; y += .28) {
      const c = vary(y < .8 ? STONE[1] : wall.palette[0], .05, r);
      v.block(tx, y, tz, 2.15, .265, 1.8, c); v.block(tx, y, tz, 1.8, .265, 2.15, c);
    }
    for (const y of [1.6, 4.8, 8]) for (const side of [-1, 1]) {
      v.block(tx + side * 1.09, y, tz, .06, 1.14, .64, glass, true);
      v.block(tx, y, tz + side * 1.09, .64, 1.14, .06, glass, true);
      v.block(tx + side * 1.13, y + .5, tz, .045, .07, .7, trim.palette[0]);
      v.block(tx, y + .5, tz + side * 1.13, .7, .07, .045, trim.palette[0]);
    }
    for (let i = 0; i < 13; i++) { const s = 2.6 * (1 - i / 14); v.block(tx, th + i * .22, tz, s, .22, s, roof.palette[i % 3]); }
    v.block(tx, th + 2.86, tz, .08, .6, .08, trim.palette[0]);
    for (let i = 0; i < 7; i++) { const a = -.6 * Math.PI + i * Math.PI / 5; v.block(tx + Math.cos(a) * .2, th + 3.35 + Math.sin(a) * .22, tz, .11, .1, .1, trim.palette[1]); }
    v.block(0, 3.88, dz + .6, 3.8, .13, 1.3, STONE[1]);
    for (let x = -1.8; x < 1.9; x += .22) v.block(x, 4, dz + 1.18, .055, .65, .055, trim.palette[2]);
    v.block(0, 4.67, dz + 1.18, 3.8, .08, .1, trim.palette[0]);
  }
  // Creeper winds around corners; all fixed planting stays within the reserve.
  for (const side of [-1, 1]) for (let i = 0; i < 42 + level * 8; i++) {
    const yy = .4 + r() * (h - .6), xx = side * (dx - .1 - r() * .5), zz = dz + .18;
    v.block(xx, yy, zz, .16 + r() * .1, .13, .12, GREEN[(r() * 3) | 0]);
  }
  for (const side of [-1, 1]) pumpkin(v, side * 1.72, .02, dz + .75, .28, 11 + side, true);
  const beforeSkin = v.solid.length + v.glow.length;
  if (skin) skinDetails(v, panel, skin, { w, d, h });
  const group = v.build(); group.name = "Detailed estate house"; group.userData.level = level;
  group.userData.skin = skin?.id ?? null; group.userData.skinDetailCount = v.solid.length + v.glow.length - beforeSkin; group.userData.windowGlow = glass;
  group.userData.door = { x: 0, y: 1.4, z: dz + .43 };
  group.userData.bounds = { x0: -8, x1: 8, z0: -6, z1: 6, height: level === 3 ? h + 5.8 : h + roofRise + 2.3 };
  group.userData.palette = { walls: wall.id, roof: roof.id, trim: trim.id, door: door.id };
  return group;
}

// An ornamental fence with a genuine walk-through opening and turned pillars.
function estateFence(v, r, width, depth, finish) {
  const iron = finish.color, pale = finish.palette[1], timber = finish.id.includes("picket") || finish.id === "bone-fence";
  const run = (x0, z0, x1, z1, gap = false) => {
    const length = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    for (let i = 0; i <= length; i += .34) {
      const x = x0 + (x1 - x0) * i / length, z = z0 + (z1 - z0) * i / length;
      if (gap && Math.abs(x) < 1.8) continue;
      v.block(x, .15, z, timber ? .13 : .045, timber ? 1.1 : 1.5, timber ? .13 : .045, iron);
      v.block(x, timber ? 1.25 : 1.66, z, timber ? .09 : .07, .12, timber ? .09 : .07, pale);
      for (const y of [.38, 1.1]) v.block(x, y, z, alongX ? .35 : .07, .075, alongX ? .07 : .35, iron);
    }
    for (let i = 0; i <= length; i += 2.4) {
      const x = x0 + (x1 - x0) * i / length, z = z0 + (z1 - z0) * i / length;
      if (gap && Math.abs(x) < 2.1) continue;
      stone(v, r, x, .03, z, .28, 1.7, .28); v.block(x, 1.73, z, .36, .12, .36, pale);
    }
  };
  const x = width / 2, z = depth / 2;
  for (const side of [-1, 1]) { run(-x, side * z, x, side * z, side === 1); run(side * x, -z, side * x, z); }
  for (const side of [-1, 1]) {
    for (let y = .02; y < 2.4; y += .26) stone(v, r, side * 1.95, y, z, .62, .24, .64);
    v.block(side * 1.95, 2.43, z, .85, .16, .85, STONE[1]);
    lantern(v, side * 1.95, 2.6, z, 1.1, iron);
    // Open leaves run back along the gate's cheeks, never across the path.
    for (let i = 0; i < 6; i++) { const xx = side * (1.75 + i * .1), zz = z - i * .21; v.block(xx, .25, zz, .055, 1.45 - i * .035, .055, iron); v.block(xx, 1.45 - i * .035, zz, .16, .075, .24, pale); }
  }
}

// A detailed but bounded native-voxel garden: turf runs, a stone entrance
// walk, a service ring, planted borders and complete perimeter fencing.
export function buildEstateGarden(s) {
  const expansion = Math.max(0, Math.min(3, Math.trunc(s.estate?.expansion) || 0)), land = ESTATE_EXPANSIONS[expansion], v = new Voxels(), r = seeded(883);
  const halfW = land.width / 2, halfD = land.depth / 2, fence = colour(s.estate?.finishes, "fence");
  v.block(0, -.35, 0, land.width + .3, .35, land.depth + .3, 0x302730);
  // Large shallow turf runs keep the broad lawn economical in all four tiers.
  for (let z = -halfD; z < halfD; z += .6) for (let x = -halfW; x < halfW; x += .6) {
    if (x > -7.6 && x < 7.6 && z > -5.6 && z < 5.6) continue;
    const shade = 0x313c2c + (Math.floor(r() * 3) << 16);
    v.box(x, -.008, z, Math.min(.598, halfW - x), .025, Math.min(.598, halfD - z), vary(shade, .09, r));
  }
  // A small, orderly cobbled terrace sits around the house; the main garden
  // path continues all the way to the entrance gate, including after expansion.
  const path = (x, z) => (Math.abs(x) <= 1.43 && z >= 5.4) || (Math.abs(x) < 8 && Math.abs(z) < 6 && (Math.abs(x) > 6.8 || Math.abs(z) > 4.8));
  for (let z = -5.8, row = 0; z < halfD; z += .32, row++) for (let x = -7.9; x < 8; x += .44) {
    const xx = x + (row % 2) * .22;
    if (path(xx, z)) v.block(xx, .01, z, .422, .065 + r() * .015, .302, vary(STONE[(r() * 3) | 0], .08, r));
  }
  // The foundation terrace under the house is intentionally plain and hidden.
  v.block(0, -.01, 0, 16, .02, 12, 0x3d363b);
  estateFence(v, r, land.width, land.depth, fence);
  for (const side of [-1, 1]) for (let i = 0; i < 24; i++) {
    const x = side * (halfW + .45 + r() * .7), z = -halfD + r() * land.depth;
    v.block(x, -.03, z, .3 + r() * .3, .2 + r() * .3, .3 + r() * .2, GREEN[(r() * 3) | 0]);
    if (i % 3 === 0) flower(v, x, .15, z, .8, LEAVES[i % LEAVES.length]);
  }
  // Fixed trees stand beyond the buildable boundary, so no bought item clips.
  for (const [x, z, scale] of [[-halfW - 1.4, -halfD + 2, 1], [halfW + 1.6, -halfD + 1, 1.15], [-halfW - 1.8, halfD - 3, .8], [halfW + 1.8, halfD - 2, .9]]) tree(v, r, x, z, scale);
  const group = v.build(); group.name = "Estate garden " + expansion;
  group.userData.bounds = { width: land.width, depth: land.depth, x0: -halfW, x1: halfW, z0: -halfD, z1: halfD };
  group.userData.gate = { x: 0, y: 1.4, z: halfD };
  group.userData.expansion = expansion;
  return group;
}

function tree(v, r, x, z, scale = 1) {
  for (let i = 0; i < 9; i++) v.block(x + Math.sin(i * .8) * .18 * scale, i * .38 * scale, z, (.42 - i * .022) * scale, .4 * scale, (.42 - i * .022) * scale, vary(0x614633, .1, r));
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) v.block(x + side * i * .17 * scale, (2 + i * .18) * scale, z + side * i * .07 * scale, .17 * scale, .23 * scale, .17 * scale, 0x533c30);
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 1.18 * scale, y = (2.75 + r() * 1.35) * scale;
    v.block(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, (.3 + r() * .2) * scale, (.2 + r() * .22) * scale, (.3 + r() * .2) * scale, LEAVES[(r() * 4) | 0]);
  }
}

// Each catalogue item is a true free-standing prop with detail on every side.
// Its pivot is the centre of its footprint, resting on the garden's y=0 plane.
// A bed of soil in a timber frame, w by d, with its boards rising `edge` high.
function bed(v, r, w, d, edge = .22, soil = 0x3b2a25) {
  for (const side of [-1, 1]) { v.block(0, .02, side * (d / 2 - .06), w, edge, .12, vary(0x6e4a39, .06, r)); v.block(side * (w / 2 - .06), .02, 0, .12, edge, d - .24, vary(0x6e4a39, .06, r)); }
  v.block(0, .02, 0, w - .24, edge - .04, d - .24, soil);
  for (let x = -w / 2 + .3; x < w / 2 - .2; x += .28) v.block(x, edge - .02, 0, .14, .03, d - .36, scaleHex(soil, 1.18));
}
const scaleHex = (hex, k) => { const c = new THREE.Color(hex).multiplyScalar(k); return c.getHex(); };
// The garden's newer pieces: crop beds (drawn at their growing stage), the
// carving bench and the decoration added with them (content/house-estate.js).
function gardenExtra(v, r, id, stage) {
  const grown = { empty: 0, sprout: 1, growing: 2, ready: 3 }[stage] ?? 3;
  if (id === "berry-patch") {
    bed(v, r, 2.36, 1.24);
    v.block(-.95, .2, .5, .05, .5, .05, 0x5a4030); v.block(-.95, .52, .52, .34, .2, .04, 0xd8c39a);
    for (let i = 0; i < 4; i++) {
      const x = -.72 + i * .48;
      if (grown === 1) { for (const dz of [-.12, .1]) v.block(x + dz * .5, .2, dz, .05, .16, .05, 0x5f8a45); continue; }
      if (!grown) continue;
      // Arching canes, then leaves; ripe canes hang with clusters of berries.
      for (let k = 0; k < 6; k++) { const a = k / 5, h = .2 + Math.sin(a * Math.PI) * .62 * (grown > 2 ? 1 : .8); v.block(x - .2 + a * .4, h, -.18 + (k % 2) * .3, .07, .1, .07, k % 2 ? 0x5b2f3d : 0x4a3a2c); }
      for (let k = 0; k < 7; k++) v.block(x - .22 + (k % 4) * .15, .45 + (k % 3) * .14, -.3 + (k % 2) * .5, .17, .1, .17, vary(GREEN[k % 3], .08, r));
      if (grown > 2) for (let k = 0; k < 6; k++) { const bx = x - .2 + (k % 3) * .2, by = .42 + (k % 2) * .22, bz = -.34 + (k % 2) * .62; v.block(bx, by, bz, .09, .09, .09, k % 4 ? 0x2a1238 : 0x8e2238); v.block(bx + .05, by - .05, bz, .07, .07, .07, 0x3a1a46); }
    }
  } else if (id === "herb-planter") {
    for (const x of [-.78, .78]) for (const z of [-.33, .33]) v.block(x, .02, z, .1, .45, .1, 0x5a4030);
    bed(v, r, 1.76, .86, .46, 0x3a2924);
    const herbs = [[-.55, 0x7a8c78, 0xb9b4c9], [-.15, 0x56704a, 0xe8d9f0], [.25, 0x4c6448, 0x9c6bb8], [.6, 0x6d8d64, 0xf0d58a]];
    for (const [x, leaf, bloom] of herbs) {
      if (grown === 1) { v.block(x, .45, 0, .06, .1, .06, 0x6a9a4c); continue; }
      if (!grown) continue;
      for (let k = 0; k < 5; k++) v.block(x + (k % 2 ? .07 : -.07), .45 + k * .06, (k % 3 - 1) * .09, .16 - k * .015, .08, .16 - k * .015, vary(leaf, .07, r));
      if (grown > 2) for (const dz of [-.1, .1]) v.block(x, .78 + (dz > 0 ? .04 : 0), dz, .06, .06, .06, bloom);
    }
  } else if (id === "vegetable-bed") {
    bed(v, r, 2.56, 1.56, .18);
    for (let i = 0; i < 5; i++) {
      const x = -1 + i * .5;
      if (grown === 1) { for (const z of [-.4, 0, .4]) v.block(x, .16, z, .05, .1, .05, 0x67954b); continue; }
      if (!grown) continue;
      // Carrots' feathers and shoulders, leeks standing tall, squash at the end.
      for (const z of [-.42, .42]) { v.block(x, .16, z, .1, .2 + grown * .07, .04, 0x5f8f42); v.block(x + .04, .2, z, .04, .16 + grown * .05, .1, 0x76a04f); if (grown > 2) v.block(x, .14, z, .11, .07, .11, 0xe0782c); }
      v.block(x, .16, 0, .09, .28 + grown * .1, .09, 0xd9e2c4); v.block(x, .36 + grown * .1, 0, .14, .12, .06, 0x4d7a3c);
      if (grown > 2 && i % 2 === 0 && i < 4) { v.block(x + .22, .16, .2, .2, .16, .2, 0xe9a23b); v.block(x + .22, .32, .2, .05, .05, .05, 0x5b6a33); }
    }
  } else if (id === "apple-tree") {
    stone(v, r, 0, 0, 0, .9, .1, .9);
    for (let y = .1, x = 0, k = 0; y < 2.2; y += .2, k++) { x += [0, .03, -.04, .02, .05, -.02, 0, .03, -.03, .02, 0][k] ?? 0; v.block(x, y, 0, .3 - k * .008, .22, .3 - k * .008, vary(0x4b3426, .06, r)); }
    for (const [dx, dz] of [[-.45, .2], [.42, -.15], [.1, .45]]) for (let k = 0; k < 4; k++) v.block(dx * (k + 1) / 4, 2 + k * .13, dz * (k + 1) / 4, .13, .13, .13, 0x4b3426);
    const leaves = grown ? 1 : .55;
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 1.1, y = 2.25 + r() * 1.7;
      if (r() > leaves) continue;
      const x = Math.cos(a) * rad * (1 - (y - 2.25) / 4.2), z = Math.sin(a) * rad * (1 - (y - 2.25) / 4.2);
      v.block(x, y, z, .34, .3, .34, vary(GREEN[(r() * 3) | 0], .08, r));
      if (grown === 1 && i % 3 === 0) v.block(x + .12, y + .26, z + .12, .1, .08, .1, 0xf3d8e4);
      if (grown >= 2 && i % 4 === 0) v.block(x, y - .12, z + .17, .13, .13, .13, grown > 2 ? 0xc0392f : 0x8fa64a);
    }
    if (grown > 2) for (const [x, z] of [[-.7, .6], [.62, .55], [.2, -.75]]) v.block(x, .01, z, .14, .13, .14, 0xa93229);
  } else if (id === "carving-bench") {
    for (const x of [-.95, .95]) for (const z of [-.45, .45]) v.block(x, .02, z, .12, .78, .12, 0x5c4031);
    v.block(0, .3, 0, 1.98, .06, .98, 0x4a3529);
    v.block(0, .8, 0, 2.18, .1, 1.16, 0x8c654a); for (let x = -.95; x < 1; x += .32) v.block(x, .9, 0, .02, .005, 1.14, 0x6d4c39);
    // Newspaper, the pumpkin half carved with its lid off, and its tools.
    v.block(.05, .9, .05, .9, .012, .7, 0xd9d2c0); for (let z = -.2; z < .35; z += .1) v.block(-.12, .913, z, .45, .006, .02, 0x8a8478);
    pumpkin(v, .05, .91, .02, .26, 41, true);
    v.block(-.55, .91, .2, .26, .05, .24, 0xe48b33); v.block(-.55, .96, .2, .05, .08, .05, 0x5a6a35);
    v.block(.62, .91, .22, .32, .025, .05, 0xc9ccd6); v.block(.86, .91, .22, .16, .04, .06, 0x3d2c22);
    v.block(.6, .91, -.2, .1, .04, .3, 0x9c9fa8); v.block(.6, .95, -.32, .16, .04, .1, 0x9c9fa8);
    v.block(-.62, .91, -.25, .4, .01, .3, 0xefe3c6); for (const [x, z] of [[-.7, -.3], [-.55, -.3], [-.62, -.2]]) v.block(x, .92, z, .06, .006, .05, 0x2c2430);
    for (let i = 0; i < 6; i++) v.block(-.1 + (i % 3) * .07, .915, .32 + (i > 2 ? .05 : 0), .04, .02, .025, 0xf2e3b5);
    v.block(.7, .3, 0, .36, .28, .36, 0x6c6f7a); v.block(.7, .58, 0, .3, .03, .3, 0xd8742c);
    lantern(v, -.88, .9, -.38, .7);
  } else if (id === "hay-bales") {
    const bale = (x, y, z, w, h, d) => { v.block(x, y, z, w, h, d, vary(0xc9a65a, .06, r)); for (const dx of [-w / 4, w / 4]) v.block(x + dx, y - .005, z, .05, h + .01, d + .01, 0x9c7a3b); for (let i = 0; i < 4; i++) v.block(x - w / 2 + .1 + r() * (w - .2), y + h - .02, z - d / 2 + .1 + r() * (d - .2), .18, .04, .04, 0xe2c27a); };
    bale(-.5, .02, -.2, 1.05, .5, .62); bale(.52, .02, .15, 1.05, .5, .62); bale(0, .52, -.05, 1.05, .48, .62);
    pumpkin(v, .25, 1, 0, .15, 8, false); v.block(-.25, 1, .05, .2, .16, .18, 0xe9e2c8); v.block(-.25, 1.16, .05, .04, .06, .04, 0x5f6c3a);
    v.block(-.75, .52, .3, .22, .17, .2, 0x7f9a4a); v.block(.85, .52, -.3, .18, .2, .18, 0xd7c26a);
  } else if (id === "gravestones") {
    v.block(0, .01, 0, 2.5, .05, 1.1, 0x3e4a3b);
    for (const [x, kind, h] of [[-.85, 0, 1], [0, 1, 1.3], [.85, 2, .9]]) {
      const tilt = (r() - .5) * .12;
      if (kind === 1) { stone(v, r, x, .05, -.1, .16, 1.2, .14); stone(v, r, x, .7, -.1, .62, .15, .14); }
      else { stone(v, r, x + tilt, .05, -.1, .6, h - .2, .16); stone(v, r, x + tilt, h - .15, -.1, kind ? .3 : .48, .12, .16); if (!kind) stone(v, r, x + tilt, h - .05, -.1, .3, .07, .16); }
      if (kind !== 1) for (let i = 0; i < 3; i++) v.block(x + tilt, .38 + i * .14, -.015, .32 - i * .06, .03, .01, 0x403a46);
      v.block(x - .2, .05, .15, .2, .06, .2, vary(0x52713f, .08, r)); v.block(x + .22, .05, .2, .12, .12, .04, 0xe8d6a0); v.block(x + .22, .17, .2, .04, .05, .04, 0xffc767, true);
    }
  } else if (id === "owl-perch") {
    stone(v, r, 0, 0, 0, .5, .12, .5);
    for (let y = .12, x = 0, k = 0; y < 2; y += .22, k++) { x += [0, .03, .02, -.03, -.02, .02, .03, 0, -.02][k] ?? 0; v.block(x, y, 0, .16, .22, .16, vary(0x4c3a2e, .05, r)); }
    v.block(.02, 1.96, 0, .7, .08, .1, 0x4c3a2e);
    v.block(.02, 2.04, 0, .3, .3, .26, 0xc8a06a); v.block(.02, 2.34, 0, .3, .2, .26, 0xd6b07a);
    v.block(.02, 2.3, .13, .22, .2, .02, 0xf2ead8);
    for (const dx of [-.06, .06]) { v.block(.02 + dx, 2.4, .145, .06, .06, .01, 0x16121a); v.block(.02 + dx, 2.42, .155, .02, .02, .005, 0xffe3a0, true); }
    v.block(.02, 2.34, .15, .03, .05, .02, 0xd9a24a); v.block(.02, 2.54, 0, .22, .04, .2, 0xc39a64);
    for (const s of [-1, 1]) v.block(.02 + s * .17, 2.06, 0, .05, .22, .2, 0xb08656);
  } else if (id === "witch-cauldron") {
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; stone(v, r, Math.cos(a) * .6, .02, Math.sin(a) * .6, .22, .12, .22); }
    for (let i = 0; i < 5; i++) v.block(-.2 + i * .1, .1, 0, .08, .14 + (i % 2) * .1, .2, i % 2 ? 0xffa64e : 0xffcf6e, true);
    for (const a of [0, 2.1, 4.2]) v.block(Math.cos(a) * .42, .1, Math.sin(a) * .42, .08, .32, .08, 0x1d1a20);
    for (let k = 0; k < 6; k++) { const y = .3 + k * .13, w = 1.1 - Math.abs(k - 2.4) * .12; v.block(0, y, 0, w, .14, w, k % 2 ? 0x2a2630 : 0x232029); }
    v.block(0, 1.06, 0, .95, .07, .95, 0x34303a); v.block(0, 1.08, 0, .8, .05, .8, 0x59e07a, true);
    for (const [x, z, s] of [[-.2, .1, .12], [.18, -.15, .09], [.05, .25, .07]]) v.block(x, 1.12, z, s, s, s, 0x8ef59c, true);
    v.block(.3, 1.1, -.1, .05, .26, .05, 0x7a5a3c); v.block(.3, 1.34, -.1, .12, .04, .04, 0x7a5a3c);
  } else if (id === "picnic-table") {
    for (const x of [-1.05, 1.05]) { v.block(x, .02, 0, .12, .7, .12, 0x5c4031); v.block(x, .02, 0, .1, .06, 1.7, 0x5c4031); }
    for (let z = -.36; z <= .36; z += .18) v.block(0, .72, z, 2.5, .07, .16, vary(0x8c654a, .05, r));
    for (const side of [-1, 1]) for (let k = 0; k < 2; k++) v.block(0, .42, side * (.66 + k * .14), 2.3, .06, .13, vary(0x7a563f, .05, r));
    for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) v.block(-.55 + i * .22, .79, -.33 + k * .22, .22, .012, .22, (i + k) % 2 ? 0xf1ece4 : 0xb8423c);
    v.block(.55, .8, .05, .42, .26, .28, 0x8f6b3e); v.block(.55, 1.06, .05, .05, .02, .3, 0x6d4c2c); v.block(.55, .8, -.14, .44, .08, .02, 0xb8423c);
    for (const x of [-.35, -.1]) { v.block(x, .8, .1, .1, .12, .1, 0xe6dccb); v.block(x, .91, .1, .07, .015, .07, 0x5a3424); }
  } else if (id === "lantern-garland") {
    for (const side of [-1, 1]) { stone(v, r, side * 1.55, 0, 0, .28, .1, .28); for (let y = .1, k = 0; y < 2.3; y += .22, k++) v.block(side * 1.55 + (k % 3 - 1) * .02, y, 0, .12, .22, .12, 0x3f3033); v.block(side * 1.55, 2.3, 0, .16, .1, .16, GOLD); }
    for (let i = 0; i <= 24; i++) { const t = i / 24, x = -1.55 + t * 3.1, y = 2.3 - Math.sin(t * Math.PI) * .45; v.block(x, y, 0, .14, .02, .02, 0x2a2228); }
    const shades = [0xff9a5a, 0xcba2ed, 0xffd28b, 0x8fd7c0, 0xff7f6a];
    for (let i = 0; i < 5; i++) { const t = (i + 1) / 6, x = -1.55 + t * 3.1, y = 2.3 - Math.sin(t * Math.PI) * .45; v.block(x, y - .08, 0, .015, .08, .015, 0x2a2228); v.block(x, y - .38, 0, .24, .3, .24, shades[i], true); v.block(x, y - .41, 0, .16, .03, .16, 0x3a2e2e); v.block(x, y - .09, 0, .16, .03, .16, 0x3a2e2e); }
  } else if (id === "lily-pond") {
    for (let i = 0; i < 26; i++) { const a = i * Math.PI * 2 / 26; stone(v, r, Math.cos(a) * 1.42, 0, Math.sin(a) * 1.02, .3, .16 + (i % 3) * .03, .3); }
    v.block(0, .02, 0, 2.6, .05, 1.8, 0x1d2b3d); v.block(0, .07, 0, 2.46, .02, 1.7, 0x31507a, true);
    for (const [x, z, s] of [[-.6, -.3, .4], [.3, .35, .34], [.75, -.2, .28], [-.2, .4, .3]]) { v.block(x, .09, z, s, .02, s * .9, 0x4f7f42); v.block(x + s * .25, .09, z + s * .25, s * .3, .021, s * .3, 0x1d2b3d); }
    v.block(.3, .11, .35, .1, .08, .1, 0xf2b5cf); v.block(.3, .19, .35, .05, .03, .05, 0xffe6a0);
    v.block(-.6, .11, -.3, .16, .1, .2, 0x5d8a3e); for (const dx of [-.05, .05]) v.block(-.6 + dx, .2, -.24, .05, .05, .05, 0x2d3b20);
    for (let i = 0; i < 6; i++) v.block(1.05 + (i % 2) * .09, .05, .4 - i * .12, .04, .35 + (i % 3) * .1, .04, 0x5f7a3a);
    v.block(1.08, .4, .2, .05, .12, .05, 0x5a3a2a);
  } else return false;
  return true;
}
export function buildEstateDecor(id, stage = "ready") {
  const v = new Voxels(), r = seeded(379 + [...String(id)].reduce((n, c) => n + c.charCodeAt(0), 0));
  const meta = ESTATE_DECOR_BY_ID[id];
  if (!meta) { const empty = new THREE.Group(); empty.userData.id = id; return empty; }
  if (gardenExtra(v, r, id, stage)) {}
  else if (id === "lantern-post") {
    stone(v, r, 0, 0, 0, .5, .18, .5); v.block(0, .18, 0, .13, 1.73, .13, 0x3d3037); v.block(0, 1.72, 0, .5, .09, .3, GOLD); lantern(v, 0, 1.92, 0, 1.18);
  } else if (id === "rose-bed") {
    v.block(0, .02, 0, 2.32, .17, 1.12, 0x6e4a39); v.block(0, .19, 0, 2.12, .05, .9, 0x34262b);
    for (const z of [-.24, .24]) for (let x = -.88; x < 1; x += .35) flower(v, x, .23, z, 1.25, [0x874166, 0xad6686, 0x725687][Math.floor(r() * 3)]);
  } else if (id === "pumpkin-pile") {
    pumpkin(v, -.28, .02, .14, .32, 5); pumpkin(v, .29, .02, -.19, .28, 6); pumpkin(v, .04, .32, .13, .24, 7);
  } else if (id === "stone-urn") {
    stone(v, r, 0, 0, 0, .66, .12, .66); stone(v, r, 0, .12, 0, .34, .5, .34);
    for (let i = 0; i < 4; i++) stone(v, r, 0, .61 + i * .1, 0, .52 + i * .1, .1, .52 + i * .1);
    stone(v, r, 0, 1.01, 0, .92, .13, .92);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; flower(v, Math.cos(a) * .25, 1.06, Math.sin(a) * .25, .8, 0xbb9abd); }
  } else if (id === "garden-bench") {
    for (const x of [-.91, .91]) for (const z of [-.34, .34]) { v.block(x, .02, z, .1, .51, .11, 0x352e3b); v.block(x + Math.sign(x) * .07, .02, z, .22, .07, .16, 0x5f5366); }
    for (let z = -.37; z <= .42; z += .17) v.block(0, .53, z, 2.22, .09, .15, 0x8c654a);
    for (const x of [-1.04, 1.04]) { v.block(x, .58, .02, .09, .4, .85, 0x352e3b); v.block(x, .98, -.02, .18, .07, .93, GOLD); }
    for (const y of [.75, .98, 1.21]) v.block(0, y, -.42, 2.2, .13, .1, 0x76513e);
    for (let x = -.83; x < .9; x += .28) v.block(x, .64, -.43, .055, .68, .065, 0x352e3b);
  } else if (id === "bird-bath") {
    stone(v, r, 0, 0, 0, .73, .12, .73); stone(v, r, 0, .12, 0, .26, .75, .26);
    v.block(0, .87, 0, 1.19, .15, 1.19, STONE[1]); v.block(0, 1.02, 0, .99, .035, .99, 0x605d85, true);
    for (const side of [-1, 1]) { v.block(side * .63, .98, 0, .12, .14, 1.35, STONE[0]); v.block(0, .98, side * .63, 1.15, .14, .12, STONE[0]); }
    v.block(.4, 1.13, .34, .24, .18, .32, 0x292430); v.block(.4, 1.31, .39, .2, .15, .2, 0x221e28); v.block(.4, 1.34, .53, .1, .06, .12, GOLD); v.block(.4, 1.15, .11, .17, .06, .18, 0x292430);
  } else if (id === "gargoyle") {
    stone(v, r, 0, 0, 0, 1.05, .17, 1.05); stone(v, r, 0, .17, 0, .76, .26, .76);
    v.block(0, .43, 0, .49, .78, .51, STONE[0]); v.block(0, 1.21, .08, .55, .43, .5, STONE[1]);
    for (const side of [-1, 1]) { v.block(side * .18, 1.59, .05, .13, .23, .14, STONE[0]); v.block(side * .14, 1.47, .35, .08, .065, .04, 0xc1ad87); v.block(side * .43, .74, -.12, .3, .52, .14, STONE[2]); v.block(side * .53, 1.04, -.12, .12, .28, .14, STONE[0]); v.block(side * .25, .44, .3, .23, .18, .35, STONE[1]); }
    v.block(0, 1.24, .37, .36, .12, .23, STONE[0]);
  } else if (id === "crooked-tree") {
    tree(v, r, 0, 0, 1.05);
    for (const side of [-1, 1]) { v.block(side * .58, 3.25, .38, .22, .13, .1, 0x26202c); v.block(side * .58 + .22, 3.25, .38, .3, .05, .1, 0x26202c); v.block(side * .58 - .22, 3.25, .38, .3, .05, .1, 0x26202c); }
  } else if (id === "moon-fountain") {
    for (let x = -1.4; x <= 1.4; x += .28) for (let z = -1.4; z <= 1.4; z += .28) if (Math.hypot(x, z) < 1.45) { v.block(x, .02, z, .275, .25, .275, STONE[2]); if (Math.hypot(x, z) > 1.1) v.block(x, .27, z, .275, .18, .275, STONE[1]); else v.block(x, .28, z, .275, .04, .275, 0x7a759a, true); }
    stone(v, r, 0, .28, 0, .4, 1.3, .4); v.block(0, 1.58, 0, 1.24, .14, 1.24, STONE[1]); v.block(0, 1.72, 0, .99, .035, .99, 0xa29ac2, true);
    for (let i = 0; i < 16; i++) { const a = -.65 * Math.PI + i * Math.PI * 1.3 / 15; v.block(Math.cos(a) * .48, 2.12 + Math.sin(a) * .5, 0, .16, .16, .14, 0xf2cfa4, true); }
    for (const side of [-1, 1]) v.block(side * .39, .43, .1, .045, 1.23, .045, 0xc9bfd9, true);
  } else if (id === "coffin-planter") {
    for (let z = -.86; z < .9; z += .19) { const width = z < -.48 ? .75 : z > .48 ? .72 : 1.08; v.block(0, .06, z, width, .44, .18, 0x5a3841); v.block(0, .5, z, width - .15, .025, .18, 0x30272b); for (const side of [-1, 1]) v.block(side * (width / 2 - .045), .4, z, .065, .16, .19, GOLD); }
    for (let i = 0; i < 9; i++) { const z = -.7 + i * .17; flower(v, (i % 2 ? -.2 : .2), .47, z, .7, 0x8d678e); }
  } else if (id === "rose-arch") {
    for (const side of [-1, 1]) { stone(v, r, side * 1.13, 0, 0, .32, .16, .8); v.block(side * 1.13, .16, 0, .12, 2.03, .12, 0x342d3b); for (let y = .5; y < 2.2; y += .32) flower(v, side * 1.13, y, .07, .8, 0x994977); }
    for (let i = 0; i <= 18; i++) { const a = i * Math.PI / 18, x = Math.cos(a) * 1.13, y = 2.12 + Math.sin(a) * 1.03; v.block(x, y, 0, .17, .17, .14, 0x342d3b); if (i % 3 === 0) flower(v, x, y - .16, .07, .7, 0xb36389); }
  } else if (id === "wishing-well") {
    for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10; stone(v, r, Math.cos(a) * .72, .05, Math.sin(a) * .72, .3, .82, .3); }
    v.block(0, .35, 0, 1.13, .03, 1.13, 0x252533); v.block(0, .38, 0, .9, .02, .9, 0x514d73, true);
    for (const side of [-1, 1]) v.block(side * .88, .75, 0, .13, 1.6, .14, 0x714d39);
    v.block(0, 1.8, 0, 1.95, .1, .13, 0x533b30); v.block(0, .97, .03, .035, .9, .035, 0xbb9e72); v.block(0, .88, .03, .35, .3, .35, 0x99714b);
    for (let x = -.96; x <= .97; x += .24) for (let z = -.8; z <= .8; z += .25) v.block(x, 2.32 + (.9 - Math.abs(z)) * .45, z, .24, .14, .24, Math.round(x * 4) % 2 ? 0x594154 : 0x725269);
  } else if (id === "bat-hedge") {
    v.block(0, .05, 0, 1.84, .24, .82, 0x5e4939); v.block(0, .29, 0, .58, 1.03, .59, 0x4a5b43);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) v.block(side * (.35 + i * .15), .66 + i % 2 * .1, 0, .21, .6 - i * .08, .4, GREEN[i % 3]);
    for (const side of [-1, 1]) { v.block(side * .18, 1.31, 0, .14, .2, .17, 0x4c5f45); v.block(side * .13, 1.21, .31, .065, .055, .025, 0xe7c084); }
  } else if (id === "mushroom-patch") {
    for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7, x = Math.cos(a) * .42, z = Math.sin(a) * .42, h = .22 + (i % 3) * .1; v.block(x, .04, z, .09, h, .09, 0xddc9b0); v.block(x, h + .04, z, .32, .1, .32, i % 2 ? 0xc4a7df : 0x9276b5, true); v.block(x, h + .14, z, .23, .07, .23, 0xb6a0c7); v.block(x + .06, h + .215, z, .065, .02, .065, 0xf5e7cc); }
  } else if (id === "fire-pit") {
    for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9; stone(v, r, Math.cos(a) * .76, .04, Math.sin(a) * .76, .3, .31, .3); }
    v.block(0, .15, 0, 1.22, .21, 1.22, 0x674333); v.block(0, .38, 0, 1.08, .05, 1.08, 0x332932);
    for (const z of [-.24, .24]) v.block(0, .4, z, .88, .12, .14, 0x613b2d);
    for (let i = 0; i < 6; i++) { const x = -.35 + i * .14; v.block(x, .51, 0, .12, .2 + (i % 3) * .13, .24, 0xffa65a, true); v.block(x, .51, .16, .1, .15 + (i % 2) * .23, .14, 0xffca72, true); }
  } else if (id === "ghost-scarecrow") {
    v.block(0, .02, 0, .1, 1.9, .1, 0x75513b); v.block(0, 1.18, 0, 1.18, .1, .1, 0x75513b);
    v.block(0, 1.16, 0, .6, .77, .45, 0xe3d9ce); v.block(0, 1.93, 0, .49, .22, .39, 0xf0e5d5);
    for (const side of [-1, 1]) { v.block(side * .46, 1.15, 0, .35, .18, .35, 0xd5cbd0); v.block(side * .12, 1.79, .25, .09, .12, .03, 0x302733); }
    for (let i = -2; i <= 2; i++) v.block(i * .13, .99 - (i % 2) * .08, 0, .12, .3, .4, 0xd4cbd1);
    lantern(v, .57, .6, .02, .55);
  }
  const group = v.build(); group.name = meta.name; group.userData.id = id; group.userData.stage = stage; group.userData.footprint = { w: meta.w, d: meta.d, height: meta.height };
  return group;
}

// The farm keeps a recognisable, open invitation to the separate house plot.
export function buildFarmEstateGate() {
  const v = new Voxels(), r = seeded(1404);
  for (const side of [-1, 1]) {
    for (let y = .04; y < 2.65; y += .26) stone(v, r, side * 2, y, 0, .68, .24, .7);
    v.block(side * 2, 2.7, 0, .9, .18, .9, STONE[1]); lantern(v, side * 2, 2.94, 0, 1.08);
    for (let i = 0; i < 9; i++) { const x = side * (2.1 + i * .1), z = -.2 - i * .08; v.block(x, .12, z, .055, 1.65, .055, 0x332a38); v.block(x, 1.46, z, .16, .07, .16, GOLD); }
  }
  for (let z = -.9; z <= 1.2; z += .3) for (let x = -1.65; x <= 1.65; x += .36) v.block(x, .015, z, .34, .07, .28, vary(STONE[(r() * 3) | 0], .08, r));
  const group = v.build(); group.name = "Gate to our haunted home"; group.userData.gate = true; return group;
}

// Instanced meshes own their GPU instance buffers and materials, but share the
// voxel module's cube geometry. Never dispose that shared cube on a rebuild.
export function disposeEstateObject(group) {
  group.traverse(object => {
    if (object.isInstancedMesh) object.dispose();
    else object.geometry?.dispose?.();
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
      if (material.userData?.sharedEstate) continue;
      material.map?.dispose?.(); material.dispose();
    }
  });
}
