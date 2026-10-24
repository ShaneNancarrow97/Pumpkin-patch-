// The wilds round the farm: terraced hills under a thick autumn treeline and
// dark pines, rising away from every side but the lake and fading into the
// night, so the farm never ends at an edge of nothing. The roads the guests use
// run on into the hills, and the hayride's track runs into the trees. Rebuilt
// whenever the farm grows (the meadow, the hayride, a new field), always just
// outside it.
import * as THREE from "three";
import { MAP, CANOPY, PITCH } from "./world.js";
import { seeded, vary } from "./voxels.js";
import { fieldWidth } from "./content/festival-meadow.js";
import { fieldDepth } from "./content/farm-layout.js";
import { HAYRIDE_SITE } from "./content/hayride-layout.js";

// How far the wilds reach past the farm's edge, and where they fade: fully
// into the night by FADE[1] units out, so their far edge never shows.
export const WILDS = Object.freeze({ reach: 46, fade: [8, 32], chunk: 26, haze: 0x150f24 });
const FLOOR = [0x2a2a1e, 0x2e3020, 0x26281c, 0x32301f], LITTER = [0x5a2a1e, 0x6a3a1e, 0x4a2a2a, 0x3e2a36], MOSS = [0x323624, 0x2c3322, 0x353828];
const DIRT = [0x4a3b30, 0x54432f, 0x443628], PINE = [0x1c2e2a, 0x22382f, 0x2a4236, 0x203430], BARK = 0x2e1f1a, DEAD = 0x5a5258;
// The farm camera looks north and down at PITCH, so anything standing h tall
// covers the ground up to h * REACH_BACK units north of it on screen.
export const REACH_BACK = 1 / Math.tan(PITCH), CROWN = 1.8;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Where the farm's own ground lies: the rough grass round the first map, the
// yard as it is now, and the hayride station once bought. The wilds start
// beyond all of them.
export function wildsFootprint(state) {
  const rects = [{ x0: -16, x1: MAP.w + 16, z0: -1, z1: MAP.d + 12 }, { x0: -8, x1: fieldWidth(state), z0: -1, z1: fieldDepth(state) + 5 }];
  if (state.hayride?.purchased) { const b = HAYRIDE_SITE.bounds; rects.push({ x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1 }); }
  return rects;
}
// The roads that carry on into the wilds: the visitors' lane and the west lane
// south, the village road east, and the hayride's track north and south.
export function wildsRoads(state) {
  const roads = [{ x: 33, from: 30, axis: "z" }, { x: -3, from: 30, axis: "z" }, { z: 6.6, from: 50, axis: "x" }];
  if (state.hayride?.purchased) roads.push({ x: HAYRIDE_SITE.departurePortal.x, to: HAYRIDE_SITE.bounds.z0, axis: "z" }, { x: HAYRIDE_SITE.returnPortal.x, from: HAYRIDE_SITE.bounds.z1, axis: "z" });
  return roads;
}
const outside = (rects, x, z) => {
  let d = Infinity;
  for (const r of rects) {
    const dx = Math.max(r.x0 - x, x - r.x1, 0), dz = Math.max(r.z0 - z, z - r.z1, 0);
    if (!dx && !dz) return -1;
    d = Math.min(d, Math.hypot(dx, dz));
  }
  return d;
};
const roadDistance = (roads, x, z) => Math.min(...roads.map((r) => r.axis === "z"
  ? (z < (r.from ?? -Infinity) || z > (r.to ?? Infinity) ? Infinity : Math.abs(x - r.x))
  : (x < (r.from ?? -Infinity) ? Infinity : Math.abs(z - r.z))));

// The height of the wilds: flat by the farm, rising in terraces to about seven
// units, rolling, and sloping down to the lake at the north. Roads run level.
export function wildsHeight(d, x, z, road) {
  const roll = Math.sin(x * .21 + z * .07) * 1.2 + Math.sin(z * .17 - x * .05) * 1.0 + Math.sin((x + z) * .11) * .8;
  let h = 7 * smooth(2, 26, d) + roll * smooth(3, 12, d);
  h *= smooth(-1, 8, z) * smooth(1.6, 5, road);
  return Math.max(0, Math.round(h * 2) / 2);
}

// Every material in the wilds fades towards the night by its distance from the
// farm (WILDS.fade), mixed in after lighting so the far edge matches the sky.
function hazy(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform vec4 uHazeRect;\nuniform vec2 uHazeFade;\nvarying float vHaze;")
      .replace("#include <project_vertex>", `#include <project_vertex>
  vec4 hazeWorld = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
  hazeWorld = instanceMatrix * hazeWorld;
  #endif
  hazeWorld = modelMatrix * hazeWorld;
  vHaze = smoothstep( uHazeFade.x, uHazeFade.y, length( max( max( uHazeRect.xy - hazeWorld.xz, hazeWorld.xz - uHazeRect.zw ), 0.0 ) ) );`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uHazeColour;\nvarying float vHaze;")
      .replace("#include <fog_fragment>", "#include <fog_fragment>\n  gl_FragColor.rgb = mix( gl_FragColor.rgb, uHazeColour, vHaze );");
  };
  material.customProgramCacheKey = () => "wilds-haze";
  return material;
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), size = new THREE.Vector3(), quat = new THREE.Quaternion(), colour = new THREE.Color();

export function createWilds(scene, state) {
  const group = new THREE.Group(); group.name = "The wilds round the farm"; scene.add(group);
  const uniforms = { uHazeRect: { value: new THREE.Vector4() }, uHazeFade: { value: new THREE.Vector2(...WILDS.fade) }, uHazeColour: { value: new THREE.Color(WILDS.haze) } };
  const groundMaterial = hazy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 }), uniforms);
  const treeMaterial = hazy(new THREE.MeshStandardMaterial({ roughness: .92, metalness: 0 }), uniforms);
  let key = "", diagnostics = null;

  function clear() {
    for (const child of [...group.children]) { group.remove(child); if (child.isInstancedMesh) child.dispose(); else child.geometry.dispose(); }
  }
  function build() {
    const rects = wildsFootprint(state), roads = wildsRoads(state), r = seeded(9137);
    const fx0 = Math.min(...rects.map((q) => q.x0)), fx1 = Math.max(...rects.map((q) => q.x1)), fz1 = Math.max(...rects.map((q) => q.z1));
    uniforms.uHazeRect.value.set(fx0, -1, fx1, fz1);
    const X0 = Math.floor(fx0 - WILDS.reach), X1 = Math.ceil(fx1 + WILDS.reach), Z0 = -1, Z1 = Math.ceil(fz1 + WILDS.reach);
    const nx = X1 - X0, nz = Z1 - Z0, hgt = new Float32Array(nx * nz).fill(NaN), col = new Uint32Array(nx * nz), dist = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = X0 + i + .5, z = Z0 + j + .5, d = outside(rects, x, z), k = j * nx + i;
      if (d < 0) continue;
      const road = roadDistance(roads, x, z);
      // Never so tall that, seen from the farm camera, it covers the farm.
      let h = wildsHeight(d, x, z, road);
      while (h > 0 && outside(rects, x, z - h * REACH_BACK) < 0) h -= .5;
      hgt[k] = h; dist[k] = d;
      col[k] = road < .9 ? DIRT[(r() * 3) | 0] : r() < .13 ? LITTER[(r() * 4) | 0] : h >= 4 && r() < .5 ? MOSS[(r() * 3) | 0] : FLOOR[(r() * 4) | 0];
    }
    // The ground, in squares so the renderer skips those out of view: tops in
    // runs of equal height and colour, and the south faces, the only sides the
    // farm camera sees.
    const chunks = new Map(), linear = new THREE.Color();
    const chunk = (x, z) => { const id = `${Math.floor(x / WILDS.chunk)},${Math.floor(z / WILDS.chunk)}`; let c = chunks.get(id); if (!c) chunks.set(id, c = { pos: [], nor: [], rgb: [], idx: [] }); return c; };
    const quad = (c, corners, normal, hex) => {
      const n = c.pos.length / 3; linear.setHex(hex, THREE.SRGBColorSpace);
      for (const p of corners) { c.pos.push(...p); c.nor.push(...normal); c.rgb.push(linear.r, linear.g, linear.b); }
      c.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    };
    let tops = 0;
    for (let j = 0; j < nz; j++) {
      const za = Z0 + j, zb = za + 1;
      for (let i = 0; i < nx;) {
        const k = j * nx + i, h = hgt[k];
        if (Number.isNaN(h)) { i++; continue; }
        let e = i + 1;
        while (e < nx && hgt[j * nx + e] === h && col[j * nx + e] === col[k] && Math.floor((X0 + e) / WILDS.chunk) === Math.floor((X0 + i) / WILDS.chunk)) e++;
        quad(chunk(X0 + i, za), [[X0 + i, h, za], [X0 + i, h, zb], [X0 + e, h, zb], [X0 + e, h, za]], [0, 1, 0], col[k]); tops++;
        i = e;
      }
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i, h = hgt[k], below = j + 1 < nz ? hgt[k + nx] : NaN, south = Number.isNaN(below) ? 0 : below;
        if (Number.isNaN(h) || south >= h || (j + 1 >= nz)) continue;
        const xa = X0 + i;
        quad(chunk(xa, za), [[xa, south, zb], [xa + 1, south, zb], [xa + 1, h, zb], [xa, h, zb]], [0, 0, 1], vary(col[k], .05, r) & 0xffffff);
      }
    }
    for (const c of chunks.values()) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(c.pos, 3)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(c.nor, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(c.rgb, 3));
      geo.setIndex(c.idx.length > 65535 ? new THREE.Uint32BufferAttribute(c.idx, 1) : new THREE.Uint16BufferAttribute(c.idx, 1));
      const mesh = new THREE.Mesh(geo, groundMaterial); mesh.receiveShadow = true; mesh.name = "Wilds ground"; group.add(mesh);
    }

    // The treeline: round autumn trees in the first rows, then autumn crowns,
    // dark pines and the odd dead tree over the hills, thinning into the fog.
    const boxes = new Map(), add = (x, y, z, w, h, d, c) => {
      const id = `${Math.floor(x / WILDS.chunk)},${Math.floor(z / WILDS.chunk)}`; let list = boxes.get(id); if (!list) boxes.set(id, list = []);
      list.push([x, y + h / 2, z, w, h, d, c]);
    };
    const ground = (x, z) => { const i = Math.floor(x - X0), j = Math.floor(z - Z0); return i < 0 || j < 0 || i >= nx || j >= nz ? NaN : hgt[j * nx + i]; };
    let trees = 0;
    const crown = (x, y, z, R, pal) => {
      const s = .6;
      for (let a = -R; a <= R; a += s) for (let b = -R; b <= R; b += s) for (let c = -R; c <= R; c += s) {
        const q = Math.hypot(a, b * 1.15, c) / R;
        if (q > 1 - r() * .12 || q < .62) continue;
        const shade = Math.round((b / R * .5 + .5) * 3 + (c / R) * .7 + (r() - .5));
        add(x + a, y + b - s / 2, z + c, s, s, s, vary(pal[Math.max(0, Math.min(4, shade))], .07, r));
      }
    };
    for (let gx = X0; gx < X1; gx += 2.2) for (let gz = Z0; gz < Z1; gz += 2.2) {
      const x = gx + r() * 1.8, z = gz + r() * 1.8, h = ground(x, z), d = outside(rects, x, z), roll = r();
      if (Number.isNaN(h) || d < .8 || d > WILDS.fade[1] - 1 || roadDistance(roads, x, z) < 2.4) continue;
      if (roll > (d < 6 ? .6 : .8 - d / 80)) continue;
      const kind = r(), scale = .85 + r() * .5;
      // Each kind's height, so none is tall enough to hide the farm behind it.
      const type = d < 12 ? (kind < .62 ? "round" : kind < .95 ? "pine" : "dead") : (kind < .55 ? "pine" : kind < .93 ? "crown" : "dead");
      const tall = { round: 5.2, pine: 3.8, crown: 4.2, dead: 3.4 }[type] * scale;
      // CROWN: how far its leaves reach on each side.
      if ([x - CROWN, x, x + CROWN].some((cx) => outside(rects, cx, z - CROWN - (h + tall) * REACH_BACK) < 0)) continue;
      if (type === "round") {                                                        // a round autumn tree, as on the farm
        const trunk = 2.2 * scale; add(x, h, z, .4 * scale, trunk + .6, .4 * scale, BARK);
        crown(x, h + trunk + 1.1 * scale, z, 1.25 * scale, CANOPY[(r() * 3) | 0]);
      } else if (type === "pine") {                                                  // a dark pine in tiers
        add(x, h, z, .3 * scale, 1, .3 * scale, BARK);
        for (let t = 0, w = 2.1 * scale; t < 4; t++, w *= .72) add(x, h + .8 + t * .75 * scale, z, w, .8 * scale, w, vary(PINE[(r() * 4) | 0], .06, r));
      } else if (type === "crown") {                                                 // an autumn crown, simply, far out
        const pal = CANOPY[(r() * 3) | 0], top = h + 1.8 * scale;
        add(x, h, z, .35 * scale, 2 * scale, .35 * scale, BARK);
        add(x, top, z, 2.2 * scale, 1.1 * scale, 2.2 * scale, vary(pal[1], .1, r));
        add(x, top + 1.1 * scale, z, 1.6 * scale, .8 * scale, 1.6 * scale, vary(pal[2], .1, r));
        add(x + .2, top + 1.9 * scale, z - .1, .9 * scale, .5 * scale, .9 * scale, vary(pal[3], .1, r));
      } else {                                                                       // a dead tree, bare and grey
        add(x, h, z, .3 * scale, 3.4 * scale, .3 * scale, DEAD);
        add(x + .45 * scale, h + 2.2 * scale, z, .9 * scale, .16, .16, DEAD); add(x - .35 * scale, h + 2.8 * scale, z, .7 * scale, .14, .14, DEAD);
      }
      trees++;
    }
    let boxCount = 0;
    for (const list of boxes.values()) {
      const mesh = new THREE.InstancedMesh(BOX, treeMaterial, list.length); mesh.name = "Wilds trees";
      list.forEach(([x, y, z, w, h, d, c], i) => { mesh.setMatrixAt(i, matrix.compose(position.set(x, y, z), quat, size.set(w, h, d))); mesh.setColorAt(i, colour.set(c)); });
      mesh.computeBoundingSphere(); group.add(mesh); boxCount += list.length;
    }
    diagnostics = { tops, chunks: chunks.size, trees, boxes: boxCount, bounds: { x0: X0, x1: X1, z0: Z0, z1: Z1 } };
  }
  function sync() {
    const next = wildsFootprint(state).map((q) => `${q.x0},${q.x1},${q.z0},${q.z1}`).join("|") + (state.hayride?.purchased ? "|h" : "");
    if (next === key) return;
    key = next; clear(); build();
  }
  sync();
  return { group, sync, get diagnostics() { return diagnostics; }, uniforms };
}
