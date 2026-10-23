import * as THREE from "three";
import atlasUrl from "../assets/maze-scare-actors.png";
import girlAtlasUrl from "../assets/maze-haunted-girl.png";
import { MAZE_RIDE_ACTORS, mazeScareActorMetadata, mazeHauntedGirlMetadata } from "./maze-ride-actor-meta.js";

// The atlas and frame geometry belong to the module, while instances own only
// their materials. Replays can discard actors without damaging the next tour.
const cube = new THREE.BoxGeometry(1, 1, 1);
const cameraPoint = new THREE.Vector3(), actorPoint = new THREE.Vector3();
const atlases = {
  cast: { url: atlasUrl, metadata: mazeScareActorMetadata, pending: new Set(), value: null, state: "loading" },
  girl: { url: girlAtlasUrl, metadata: mazeHauntedGirlMetadata, pending: new Set(), value: null, state: "loading" },
};

// Whole cells preserve fingers, hats and trailing cloth outside the torso.
function frameGeometry(meta, frame) {
  const geometry = new THREE.PlaneGeometry(frame.w * frame.unit, frame.h * frame.unit);
  geometry.translate((frame.w / 2 - frame.ax) * frame.unit, (frame.ay - frame.h / 2) * frame.unit, 0);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (frame.x + uv.getX(i) * frame.w) / meta.w, 1 - (frame.y + (1 - uv.getY(i)) * frame.h) / meta.h);
  return geometry;
}

// Independent sheets attach as soon as decoded; a missing extra actor never
// holds back the original cast. Failed decoding leaves native figures usable.
function loadAtlas(sheet) {
  return new Promise(resolve => {
    const fail = () => { sheet.state = "failed"; for (const entry of sheet.pending) entry.failed(); sheet.pending.clear(); resolve(false); };
    if (typeof Image === "undefined" || typeof document === "undefined") { fail(); return; }
    const image = new Image();
    image.onload = () => {
      let texture = null, frames = {};
      try {
        const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) { fail(); return; }
        context.drawImage(image, 0, 0);
        const meta = sheet.metadata(image.width, image.height, context.getImageData(0, 0, image.width, image.height).data);
        texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        frames = Object.fromEntries(Object.entries(meta.actors).map(([id, actor]) => [id, Object.fromEntries(actor.frames.map(frame => [frame.pose, frameGeometry(meta, frame)]))]));
        sheet.value = { texture, meta, frames }; sheet.state = "ready";
        for (const entry of sheet.pending) entry.attach();
        sheet.pending.clear(); resolve(true);
      } catch (error) {
        texture?.dispose(); for (const poses of Object.values(frames)) for (const geometry of Object.values(poses)) geometry.dispose();
        sheet.value = null; console.warn("Maze scare actor art could not be prepared", error); fail();
      }
    };
    image.onerror = fail; image.src = sheet.url;
  });
}
export const mazeMainScareActorsReady = loadAtlas(atlases.cast);
export const mazeHauntedGirlReady = loadAtlas(atlases.girl);
export const mazeScareActorsReady = Promise.all([mazeMainScareActorsReady, mazeHauntedGirlReady]).then(results => results.every(Boolean));

// A short-lived native model also keeps damaged offline downloads playable.
function waitingFigure(id, height) {
  const colours = {
    ghoul: [0x473345, 0x91a087], clown: [0x642b49, 0xdbd2c4],
    scarecrow: [0x69513d, 0xb9a26d], wraith: [0x3d304f, 0xa9a0c8], "haunted-girl": [0xbcb5c4, 0x96939b],
  }[id];
  const group = new THREE.Group(), materials = colours.map(color => new THREE.MeshStandardMaterial({ color, roughness: 1, emissive: 0x302139, emissiveIntensity: .25 }));
  const eye = new THREE.MeshStandardMaterial({ color: 0xf8c879, emissive: 0xf8ba66, emissiveIntensity: .75, roughness: 1 });
  materials.push(eye);
  const addBox = (parent, x, y, z, w, h, d, material) => {
    const mesh = new THREE.Mesh(cube, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; parent.add(mesh); return mesh;
  };
  const unit = height / 2.3, arms = [];
  group.scale.setScalar(unit);
  addBox(group, 0, 1.11, 0, .57, 1.04, .34, materials[0]);
  addBox(group, 0, 1.93, 0, .48, .54, .37, materials[1]);
  for (const side of [-1, 1]) {
    addBox(group, side * .15, .31, .025, .21, .62, .3, materials[0]);
    addBox(group, side * .115, 2.01, .2, .065, .06, .025, eye);
    const pivot = new THREE.Group(); pivot.position.set(side * .34, 1.56, 0); group.add(pivot);
    addBox(pivot, 0, -.34, 0, .18, .68, .24, materials[0]);
    addBox(pivot, 0, -.72, .025, .2, .16, .25, materials[1]); arms.push({ side, pivot });
  }
  if (id === "scarecrow") {
    addBox(group, 0, 2.18, -.015, .84, .1, .48, materials[0]);
    addBox(group, 0, 2.29, -.015, .43, .17, .36, materials[0]);
  } else if (id === "clown") {
    for (const side of [-1, 1]) addBox(group, side * .31, 1.98, -.03, .2, .31, .3, materials[0]);
    addBox(group, 0, 1.95, .24, .12, .12, .1, materials[0]);
  } else if (id === "wraith") {
    addBox(group, 0, 1.94, -.07, .66, .69, .38, materials[0]);
    addBox(group, 0, 1.96, .16, .42, .43, .08, materials[1]);
    for (const side of [-1, 1]) addBox(group, side * .115, 2.01, .215, .065, .06, .025, eye);
  } else if (id === "haunted-girl") {
    const hair = new THREE.MeshStandardMaterial({ color: 0x17131d, roughness: .85 }); materials.push(hair);
    addBox(group, 0, .68, 0, .72, 1.18, .38, materials[0]);
    addBox(group, 0, 2.21, -.01, .53, .13, .4, hair);
    for (const side of [-1, 1]) addBox(group, side * .23, 1.87, .06, .16, .68, .35, hair);
  }
  return { group, materials, setPose(pose) { for (const { side, pivot } of arms) pivot.rotation.z = side * (pose === "scare" ? 2.2 : .08); }, dispose() { for (const material of materials) material.dispose(); } };
}

// Upright first-person cut-outs have no farm camera lean or vertical stretch.
export function createMazeScareActor(id = "ghoul") {
  const spec = MAZE_RIDE_ACTORS.find(actor => actor.id === id) ?? MAZE_RIDE_ACTORS[0]; id = spec.id;
  const sheet = id === "haunted-girl" ? atlases.girl : atlases.cast;
  const group = new THREE.Group(), visual = new THREE.Group(); group.add(visual);
  group.name = `Maze scare: ${id}`; visual.name = "Maze scare art";
  let disposed = false, fallback = null, front = null, owned = [];
  const release = () => { fallback?.dispose(); fallback = null; for (const material of owned) material.dispose(); owned = []; front = null; visual.clear(); };
  const setPose = pose => {
    if (disposed) return;
    pose = pose === "scare" ? "scare" : "lurking"; group.userData.pose = pose;
    if (front) { front.geometry = sheet.value.frames[id][pose]; group.userData.shown = front.geometry; }
    fallback?.setPose(pose);
  };
  const entry = {
    attach() {
      const atlas = sheet.value;
      if (disposed || !atlas) return; release();
      const material = new THREE.MeshStandardMaterial({ map: atlas.texture, color: 0xf9edf3, alphaTest: .4, side: THREE.DoubleSide, roughness: .95, metalness: 0, emissive: 0xdec4ec, emissiveMap: atlas.texture, emissiveIntensity: .38 });
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: atlas.texture, alphaTest: .4, side: THREE.DoubleSide });
      const distance = new THREE.MeshDistanceMaterial({ map: atlas.texture, alphaTest: .4, side: THREE.DoubleSide });
      owned = [material, depth, distance]; front = new THREE.Mesh(atlas.frames[id].lurking, material);
      front.castShadow = true; front.customDepthMaterial = depth; front.customDistanceMaterial = distance; visual.add(front);
      Object.assign(group.userData, { ready: true, loading: false, failed: false, fallback: false, frames: atlas.frames[id], height: atlas.meta.actors[id].height });
      setPose(group.userData.pose);
    },
    failed() { if (!disposed) Object.assign(group.userData, { loading: false, failed: true }); },
  };
  Object.assign(group.userData, {
    mazeScareActor: id, sprite: true, ready: false, loading: sheet.state === "loading", failed: sheet.state === "failed", fallback: true,
    height: spec.height, pose: "lurking", frames: null, shown: null, disposed: false, setPose, visual,
    dispose() {
      if (disposed) return; disposed = true; sheet.pending.delete(entry); release();
      Object.assign(group.userData, { disposed: true, ready: false, loading: false, shown: null, frames: null });
    },
  });
  if (sheet.value) entry.attach();
  else { fallback = waitingFigure(id, spec.height); visual.add(fallback.group); fallback.setPose("lurking"); if (sheet.state === "loading") sheet.pending.add(entry); }
  return group;
}

// The view owns translation and reveal visibility; animation never moves the
// caller's ground anchor. A camera only turns the figure around its upright Y.
export function animateMazeScareActor(group, options = {}, camera = null) {
  const data = group?.userData; if (!data?.mazeScareActor || data.disposed) return group;
  if (typeof options === "string") options = { pose: options, camera };
  options ||= {};
  const reveal = THREE.MathUtils.clamp(Number.isFinite(options.reveal) ? options.reveal : 1, 0, 1);
  const lunging = THREE.MathUtils.clamp(Number.isFinite(options.lunging) ? options.lunging : 0, 0, 1);
  const time = Number.isFinite(options.time) ? options.time : 0;
  data.setPose(options.pose ?? (lunging > .05 ? "scare" : data.pose));
  data.visual.scale.y = 1 + Math.sin(time * 1.8) * .002 * reveal;
  const material = data.visual.children[0]?.material;
  if (data.ready && material) material.emissiveIntensity = .24 + reveal * .14 + lunging * .08;
  camera = options.camera ?? camera;
  if (camera?.getWorldPosition) {
    camera.getWorldPosition(cameraPoint); group.getWorldPosition(actorPoint);
    if (cameraPoint.distanceToSquared(actorPoint) > .000001) {
      if (group.parent) group.parent.worldToLocal(cameraPoint);
      group.rotation.y = Math.atan2(cameraPoint.x - group.position.x, cameraPoint.z - group.position.z);
    }
  }
  Object.assign(data, { reveal, lunging, time }); return group;
}

// Group materials go away here; the atlas and its cached geometry remain shared.
export function disposeMazeScareActor(group) { group?.userData?.dispose?.(); }
