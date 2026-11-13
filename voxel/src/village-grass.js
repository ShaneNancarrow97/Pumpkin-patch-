// Grass on Mothlight's lawns (handover 73): tufts of five slim blades, dark at the root
// and lit at the tip, grown in clumps (taller where the ground runs wild), with the
// odd flower among them, and a breeze that rolls across the lawn in waves, worked
// out on the GPU. No extra textures or blended sorting: a few triangles a tuft, one
// instanced mesh per patch of ground, patches far from the camera hidden, and no
// shadows cast. Drawn on the design grid like the rest of the village.
import * as THREE from "three";
import { seeded } from "./voxels.js";
import { VILLAGE_GRASS_FADE as FADE } from "./village-visibility.js";
import { VILLAGE_DETAIL_DISTANCE as DETAIL, villageGrassDetailLevel } from "./village-distance-detail.js";

const PATCH = 20;
// One tuft: five slim blades fanned round a point, each bent once and drawn out to a tip; base at y 0, tip near y 1.
// Two triangles a blade: root to the bend, then the bend to the tip.
function tuftGeometry() {
  const pos = [], tip = [], detail = [];
  for (let b = 0; b < 5; b++) {
    const a = b / 5 * Math.PI * 2 + (b % 2) * .5, cx = Math.cos(a), cz = Math.sin(a), w = .05 + (b % 3) * .012, px = -cz * w, pz = cx * w, lean = .07 + (b % 3) * .06;
    const ox = cx * .05, oz = cz * .05, mx = ox + cx * lean, mz = oz + cz * lean, kx = ox + cx * lean * 3, kz = oz + cz * lean * 3, mh = .5 + (b % 3) * .07, th = .78 + (b % 4) * .075;
    pos.push(ox - px, 0, oz - pz, ox + px, 0, oz + pz, mx + px * .55, mh, mz + pz * .55, ox - px, 0, oz - pz, mx + px * .55, mh, mz + pz * .55, kx, th, kz);
    tip.push(0, 0, mh, 0, mh, 1);
    for (let vertex = 0; vertex < 6; vertex++) detail.push(b > 2 ? 2 : b > 0 ? 1 : 0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("tip", new THREE.Float32BufferAttribute(tip, 1));
  g.setAttribute("bladeDetail", new THREE.Float32BufferAttribute(detail, 1));
  g.computeVertexNormals(); return g;
}
// A tiny flower head on a stalk, for the odd bloom among the grass.
function flowerGeometry() {
  const g = new THREE.BoxGeometry(.12, .1, .12); g.translate(0, 1.02, 0); const t = new Float32Array(g.attributes.position.count).fill(1.2); g.setAttribute("tip", new THREE.BufferAttribute(t, 1)); g.setAttribute("bladeDetail", new THREE.BufferAttribute(new Float32Array(t.length).fill(2), 1)); return g;
}
const noise = (x, z) => Math.sin(x * .23 + Math.sin(z * .17) * 1.7) * .5 + Math.sin(z * .31 + x * .07) * .5;

// grow(x, z) says whether grass grows there (and what kind), height(x, z) how high the ground is.
export function createGrass({ x0, z0, x1, z1, density = 3.2, grow, height, scale = 1.5 }) {
  const group = new THREE.Group(), r = seeded(1213), uniforms = { uTime: { value: 0 }, uGrassPlayer: { value: new THREE.Vector2(1e6,1e6) }, uGrassCamera: { value: new THREE.Vector2(1e6,1e6) } };
  const material = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, alphaHash: true });
  material.customProgramCacheKey=()=>"village-grass-distance-v4";
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime; uniform vec2 uGrassPlayer; uniform vec2 uGrassCamera; attribute float tip; attribute float bladeDetail; varying float vTip; varying float vGrassVisibility; varying float vGrassDistanceFade;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vTip = tip;
        vec4 root = instanceMatrix * vec4(0., 0., 0., 1.);
        vec4 worldRoot = modelMatrix * root;
        vGrassVisibility=smoothstep(${FADE.playerNear.toFixed(2)},${FADE.playerFar.toFixed(2)},distance(worldRoot.xz,uGrassPlayer)) * smoothstep(${FADE.cameraNear.toFixed(2)},${FADE.cameraFar.toFixed(2)},distance(worldRoot.xz,uGrassCamera));
        float grassDistance = distance(worldRoot.xz,uGrassCamera);
        float bladeFade = bladeDetail > 1.5 ? 1. - smoothstep(${DETAIL.grassNearFrom.toFixed(1)}, ${DETAIL.grassNearTo.toFixed(1)}, grassDistance)
          : bladeDetail > .5 ? 1. - smoothstep(${DETAIL.grassMiddleFrom.toFixed(1)}, ${DETAIL.grassMiddleTo.toFixed(1)}, grassDistance) : 1.;
        vGrassDistanceFade = (1. - smoothstep(${DETAIL.grassFarFrom.toFixed(1)}, ${DETAIL.grassFarTo.toFixed(1)}, grassDistance)) * bladeFade;
        transformed.y *= mix(.08,1.,vGrassVisibility);
        float wave = sin(uTime * 1.3 - (root.x * .9 + root.z * .5) * .35) * .5 + .5;
        float sway = (sin(uTime * 2.1 + root.x * .7 + root.z * .4) * .35 + wave * .9) * tip * tip;
        transformed.x += sway * .22; transformed.z -= sway * .12;`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vTip; varying float vGrassVisibility; varying float vGrassDistanceFade;")
      .replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec4 diffuseColor = vec4( diffuse * (.46 + .8 * min(vTip, 1.) * min(vTip, 1.)) * (vTip > 1.1 ? 1.25 : 1.), opacity * vGrassVisibility * vGrassDistanceFade );");
  };
  const geo = tuftGeometry(), bloom = flowerGeometry(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  // Three fixed wrappers share the exact attribute buffers. Instanced draws
  // submit 30/18/6 vertices instead of processing invisible distant blades.
  const detailGeometry = { 5: geo };
  for (const blades of [3, 1]) {
    const reduced = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(geo.attributes)) reduced.setAttribute(name, attribute);
    reduced.setDrawRange(0, blades * 6); detailGeometry[blades] = reduced;
  }
  const patches = [], petals = [0xf6f0f5, 0xf5d04a, 0xf28fb5, 0x9a6ae0, 0xf08a3a];
  for (let px = x0; px < x1; px += PATCH) for (let pz = z0; pz < z1; pz += PATCH) {
    const spots = [], blooms = [], n = Math.round(PATCH * PATCH * density);
    for (let i = 0; i < n; i++) {
      // Clumps: a seed point and a few tufts close round it.
      const x = px + r() * PATCH, z = pz + r() * PATCH, wild = noise(x, z), kind = grow(x, z);
      if (!kind || r() > .72 + wild * .28) continue;
      spots.push([x, z, kind, wild]);
      for (let k = 0; k < 1; k++) { const a = r() * 6.283, d = .12 + r() * .25, cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d, k2 = grow(cx, cz); if (k2) spots.push([cx, cz, k2, wild]); }
      if (kind.flowers && r() < .07) blooms.push([x + .05, z, kind]);
    }
    if (!spots.length) continue;
    const mesh = new THREE.InstancedMesh(geo, material, spots.length);
    spots.forEach(([x, z, kind, wild], i) => {
      // Mown grass keeps the shape of a blade. Flattening only its height
      // used to leave wide, star-shaped fans across the short park lawn.
      const h = kind.h * (.65 + r() * .5) * (1 + Math.max(0, wild) * .7), w = (.85 + r() * .5) * Math.min(1, Math.max(.16, h * 1.35));
      m.compose(p.set(x, height(x, z) + .01, -z), q.setFromAxisAngle(up, r() * 6.283), s.set(w, h, w)); mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(kind.colours[(r() * kind.colours.length) | 0]).multiplyScalar(.92 + r() * .16));
    });
    mesh.castShadow = false; mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh);
    let flowers = null;
    if (blooms.length) {
      flowers = new THREE.InstancedMesh(bloom, material, blooms.length);
      blooms.forEach(([x, z, kind], i) => { m.compose(p.set(x, height(x, z) + .01, -z), q.identity(), s.set(1, kind.h * 1.3, 1)); flowers.setMatrixAt(i, m); flowers.setColorAt(i, c.set(petals[(r() * petals.length) | 0])); });
      flowers.castShadow = false; flowers.computeBoundingSphere(); group.add(flowers);
    }
    patches.push({ mesh, flowers, x: px + PATCH / 2, z: pz + PATCH / 2, detail: 5 });
  }
  group.userData.proximityFade={...FADE,mode:"gpu-alpha-hash",worldUnits:true};
  const stats = { patches: patches.length, activePatches: 0, fullPatches: 0, middlePatches: 0, farPatches: 0, vertices: 0, fullVertices: 0 };
  group.userData.distanceDetail = stats;
  return {
    group,
    // The breeze, and patches beyond the view's reach hidden (the camera in world units).
    // Player and camera are Three world positions; only shared uniforms change, never blade matrices.
    tick(time, camera, player) {
      uniforms.uTime.value = time;
      uniforms.uGrassPlayer.value.set(Number.isFinite(player?.x)?player.x:1e6,Number.isFinite(player?.z)?player.z:1e6);
      uniforms.uGrassCamera.value.set(Number.isFinite(camera?.position.x)?camera.position.x:1e6,Number.isFinite(camera?.position.z)?camera.position.z:1e6);
      if (!camera) return;
      const cx = camera.position.x / scale, cz = -camera.position.z / scale;
      // The +1 design metre covers clumps which grow just outside their tile.
      const radius = (Math.SQRT2 * PATCH / 2 + 1) * scale;
      stats.activePatches = stats.fullPatches = stats.middlePatches = stats.farPatches = stats.vertices = stats.fullVertices = 0;
      for (const pt of patches) {
        const nearest = Math.max(0, Math.hypot(pt.x - cx, pt.z - cz) * scale - radius);
        const on = nearest < DETAIL.grassFarTo + (pt.mesh.visible ? DETAIL.switchMargin : 0);
        pt.detail = villageGrassDetailLevel(nearest, pt.detail);
        pt.mesh.geometry = detailGeometry[pt.detail]; pt.mesh.visible = on;
        // Flower heads share the close-detail fade and are not submitted once
        // every head in the patch is invisible. No plant or collision is removed.
        if (pt.flowers) pt.flowers.visible = on && nearest < DETAIL.grassNearTo + (pt.flowers.visible ? DETAIL.switchMargin : 0);
        if (on) {
          stats.activePatches++; stats[pt.detail === 5 ? "fullPatches" : pt.detail === 3 ? "middlePatches" : "farPatches"]++;
          stats.vertices += pt.mesh.count * pt.detail * 6; stats.fullVertices += pt.mesh.count * 30;
        }
      }
    },
    stats: () => ({ ...stats }),
  };
}
