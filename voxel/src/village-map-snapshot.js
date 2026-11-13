// A cached photograph of the actual surface, with the same projection for its DOM pins.
import * as THREE from 'three';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GradeShader, applyGrade } from './picture-grade.js';
import { GROUND_REALM } from './village-terrain.js';
import { PLAN_SCALE } from './content/village.js';
import { EXPANSION_AREAS, EXPANSION_ACTIVITIES } from './content/village-expansion.js';
import { expansionAreaInfo, expansionActivityInfo } from './rules/village-expansion.js';

export const VILLAGE_MAP_SNAPSHOT_SIZE = Object.freeze({ width: 1280, height: 800 });
// Include the whole playable surface, including the Acre, without fitting the distant sky dome.
export const VILLAGE_MAP_SURFACE_BOUNDS = Object.freeze({
  x0: GROUND_REALM.x0 * PLAN_SCALE, x1: GROUND_REALM.x1 * PLAN_SCALE,
  z0: GROUND_REALM.z0 * PLAN_SCALE, z1: GROUND_REALM.z1 * PLAN_SCALE,
  y0: -4 * PLAN_SCALE, y1: 28 * PLAN_SCALE,
});
const cache = new WeakMap();
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;

// Timers, inventory, the play camera and moving people do not invalidate a photograph.
export function villageMapSnapshotSignature(state) {
  const v = state.village ?? {}, e = v.expansion ?? {};
  return JSON.stringify(canonical({
    built: v.built, unlocks: [...(v.unlocks ?? [])].sort(), effects: [...(v.effects ?? [])].sort(),
    decor: [...(v.decor?.placed ?? [])].sort((a, b) => String(a.instance).localeCompare(String(b.instance))),
    expansionEffects: [...(e.effects ?? [])].sort(), completed: Object.keys(e.completed ?? {}).filter(id => e.completed[id]).sort(),
    areas: EXPANSION_AREAS.filter(a => a.layer !== 'cave').map(a => [a.id, !!expansionAreaInfo(state, a.id)?.open]),
    activities: EXPANSION_ACTIVITIES.filter(a => !a.area.startsWith('cave-')).map(a => { const i = expansionActivityInfo(state, a.id); return [a.id, i?.visible, i?.available, i?.done, !!(i?.remaining > 0)]; }),
  }));
}

// An orthographic lens keeps roads straight and north up, with enough tilt to show the buildings.
export function createVillageMapCamera(bounds = VILLAGE_MAP_SURFACE_BOUNDS, width = VILLAGE_MAP_SNAPSHOT_SIZE.width, height = VILLAGE_MAP_SNAPSHOT_SIZE.height) {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 2400);
  const centre = new THREE.Vector3((bounds.x0 + bounds.x1) / 2, (bounds.y0 + bounds.y1) / 2, -(bounds.z0 + bounds.z1) / 2);
  const pitch = THREE.MathUtils.degToRad(64), distance = 900;
  camera.position.copy(centre).add(new THREE.Vector3(0, Math.sin(pitch) * distance, Math.cos(pitch) * distance));
  camera.lookAt(centre); camera.updateMatrixWorld(true);
  const frame = new THREE.Box3();
  for (const x of [bounds.x0, bounds.x1]) for (const y of [bounds.y0, bounds.y1]) for (const z of [bounds.z0, bounds.z1]) frame.expandByPoint(new THREE.Vector3(x, y, -z).applyMatrix4(camera.matrixWorldInverse));
  const aspect = width / height, halfWidth = Math.max((frame.max.x - frame.min.x) / 2, (frame.max.y - frame.min.y) / 2 * aspect) * 1.035, halfHeight = halfWidth / aspect;
  const cx = (frame.min.x + frame.max.x) / 2, cy = (frame.min.y + frame.max.y) / 2;
  Object.assign(camera, { left: cx - halfWidth, right: cx + halfWidth, top: cy + halfHeight, bottom: cy - halfHeight });
  camera.updateProjectionMatrix();
  return camera;
}

// Coordinates are image pixels, independent of CSS size and of the moving play camera.
export function projectVillageMapPoint(matrix, width, height, point, groundAt = () => 0) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.z) || point.y != null && !Number.isFinite(point.y)) return { x: 0, y: 0, visible: false };
  const y = point.y ?? groundAt(point.x, point.z), x = point.x, z = -point.z, m = matrix;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  const px = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w, py = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, depth = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return { x: (px + 1) * width / 2, y: (1 - py) * height / 2, visible: w > 0 && Math.abs(px) <= 1 && Math.abs(py) <= 1 && Math.abs(depth) <= 1 };
}

// Only temporary render state is changed; the caller's drawing buffer is never used or cleared.
export function captureVillageMap(renderer, villageView, state, { createCanvas = () => document.createElement('canvas') } = {}) {
  const signature = villageMapSnapshotSignature(state), old = cache.get(villageView);
  if (old?.signature === signature) return old.snapshot;
  villageView.sync();
  const { width, height } = VILLAGE_MAP_SNAPSHOT_SIZE, bounds = { ...(villageView.mapBounds ?? VILLAGE_MAP_SURFACE_BOUNDS) };
  const camera = createVillageMapCamera(bounds, width, height), matrix = Object.freeze(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).toArray());
  const previous = {
    target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), mip: renderer.getActiveMipmapLevel(),
    viewport: renderer.getViewport(new THREE.Vector4()), scissor: renderer.getScissor(new THREE.Vector4()), scissorTest: renderer.getScissorTest(),
    clear: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), autoClear: renderer.autoClear,
    toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace,
    shadowEnabled: renderer.shadowMap.enabled, shadowAuto: renderer.shadowMap.autoUpdate, shadowUpdate: renderer.shadowMap.needsUpdate,
    xrEnabled: renderer.xr.enabled,
  };
  const sceneTarget = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false });
  const imageTarget = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false, stencilBuffer: false });
  const output = new OutputPass();
  Object.assign(output.uniforms, THREE.UniformsUtils.clone(GradeShader.uniforms));
  output.material.fragmentShader = output.material.fragmentShader.replace('void main() {', 'uniform float saturation, contrast, vignette; uniform vec3 shadows, lights;\nvoid main() {').replace(/}\s*$/, `
    vec3 rgb = gl_FragColor.rgb; float l = dot(rgb, vec3(.2126, .7152, .0722));
    rgb = mix(vec3(l), rgb, saturation); rgb = (rgb - .5) * contrast + .5;
    rgb += shadows * (1. - smoothstep(0., .5, l)) + lights * smoothstep(.5, 1., l);
    vec2 p = (vUv - .5) * vec2(1., .92); rgb *= 1. - vignette * smoothstep(.34, .86, length(p));
    gl_FragColor.rgb = clamp(rgb, 0., 1.); }`);
  try {
    const snapshot = villageView.withMapSurface(() => {
      renderer.xr.enabled = false; renderer.shadowMap.enabled = false; renderer.shadowMap.autoUpdate = false;
      renderer.autoClear = true; renderer.setScissorTest(false); renderer.toneMappingExposure = villageView.scene.userData.exposure ?? 1.15;
      // Target viewports are already physical pixels; setViewport would apply the play canvas DPR again.
      renderer.setRenderTarget(sceneTarget); renderer.clear(true, true, true);
      renderer.render(villageView.scene, camera);
      // Match the village's ACES output and display-space grade without touching its live composer.
      applyGrade(output, villageView.scene.userData.grade);
      output.render(renderer, imageTarget, sceneTarget);
      const pixels = new Uint8Array(width * height * 4);
      renderer.readRenderTargetPixels(imageTarget, 0, 0, width, height, pixels);
      const canvas = createCanvas(); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d'); if (!context) throw new Error('The village map image could not be prepared.');
      const data = context.createImageData(width, height), stride = width * 4;
      for (let row = 0; row < height; row++) data.data.set(pixels.subarray((height - row - 1) * stride, (height - row) * stride), row * stride);
      context.putImageData(data, 0, 0);
      return Object.freeze({ url: canvas.toDataURL('image/png'), width, height, matrix, bounds: Object.freeze(bounds),
        camera: Object.freeze({ type: 'orthographic', position: Object.freeze(camera.position.toArray()), projection: Object.freeze(camera.projectionMatrix.toArray()) }),
        projectPoint: point => projectVillageMapPoint(matrix, width, height, point, villageView.groundAt),
      });
    });
    cache.set(villageView, { signature, snapshot }); return snapshot;
  } finally {
    renderer.setViewport(previous.viewport); renderer.setScissor(previous.scissor); renderer.setScissorTest(previous.scissorTest);
    renderer.setRenderTarget(previous.target, previous.face, previous.mip);
    renderer.setClearColor(previous.clear, previous.alpha); renderer.autoClear = previous.autoClear;
    renderer.toneMapping = previous.toneMapping; renderer.toneMappingExposure = previous.exposure; renderer.outputColorSpace = previous.outputColorSpace;
    renderer.shadowMap.enabled = previous.shadowEnabled; renderer.shadowMap.autoUpdate = previous.shadowAuto; renderer.shadowMap.needsUpdate = previous.shadowUpdate;
    renderer.xr.enabled = previous.xrEnabled;
    sceneTarget.dispose(); imageTarget.dispose(); output.dispose();
  }
}
