// A temporary two-person shot. It never changes the player's follow rig or
// saved position; closing a conversation returns to the original camera pose.
import * as THREE from "three";

const clamp = THREE.MathUtils.clamp;
const finite = value => Number.isFinite(value);
const point = value => value && finite(value.x) && finite(value.z) && (value.y === undefined || finite(value.y))
  ? new THREE.Vector3(value.x, value.y ?? 0, value.z) : null;
const ease = t => t * t * t * (t * (t * 6 - 15) + 10);
const UP = new THREE.Vector3(0, 1, 0);
const FRAME = Object.freeze({ left: -.76, right: .76, top: .83, bottom: -.24 });
// Side-by-side dialogue puts a tall reply column on the right. Keep both
// people to its left; portrait phones stack the UI and retain a centred shot.
const SIDE_FRAME = Object.freeze({ left: -.9, right: .08, top: .83, bottom: -.24 });

// Called on opening/resizing, not every frame. Inputs are Three world feet
// positions: realm north/south conversion belongs to village-view.
export function villageDialoguePose({ player, npc, cameraPosition, cameraTarget, aspect = 1, fov = 45, groundAt = () => 0 } = {}) {
  const a = point(player), b = point(npc), before = point(cameraPosition), previousTarget = point(cameraTarget);
  if (!a || !b || a.distanceTo(b) > 14) return null;
  const ratio = clamp(finite(aspect) && aspect > 0 ? aspect : 1, .32, 3.2);
  const verticalFov = clamp(finite(fov) ? fov : 45, 30, 75);
  const middle = a.clone().add(b).multiplyScalar(.5);
  const axis = b.clone().sub(a); axis.y = 0;
  const oldDirection = before ? before.clone().sub(previousTarget ?? middle) : new THREE.Vector3(0, 0, 1);
  oldDirection.y = 0; if (oldDirection.lengthSq() < 1e-6) oldDirection.set(0, 0, 1); oldDirection.normalize();
  if (axis.lengthSq() < 1e-6) axis.crossVectors(UP, oldDirection); axis.normalize();
  const side = new THREE.Vector3().crossVectors(axis, UP).normalize();
  if (side.dot(oldDirection) < 0) side.negate();
  // A narrower screen uses an over-the-shoulder angle, rather than zooming so
  // far out that both people become tiny. Wider screens get a three-quarter shot.
  const shoulder = THREE.MathUtils.lerp(.84, .24, clamp((ratio - .55) / .6, 0, 1));
  const sign = axis.dot(oldDirection) < 0 ? -1 : 1;
  const direction = side.multiplyScalar(Math.sqrt(1 - shoulder * shoulder)).addScaledVector(axis, shoulder * sign).normalize();
  const baseTarget = middle.clone(); baseTarget.y = (a.y + b.y) * .5 + .44;
  const target = baseTarget.clone(), frame = ratio >= .9 ? SIDE_FRAME : FRAME;
  const screenCentre = (frame.left + frame.right) * .5;
  const camera = new THREE.PerspectiveCamera(verticalFov, ratio, .05, 1000);
  const right = new THREE.Vector3().crossVectors(UP, direction).normalize();
  const samples = [];
  for (const foot of [a, b]) for (const height of [0, 2.35]) for (const width of [-.43, .43]) samples.push(foot.clone().addScaledVector(right, width).addScaledVector(UP, height));
  let distance = 6.1, fitted = false;
  for (let i = 0; i < 28; i++) {
    // Truck camera and look target together. This moves the pair left on
    // screen without distorting the lens or altering the exploration rig.
    const halfWidth = distance * Math.sqrt(1 + .37 * .37) * Math.tan(THREE.MathUtils.degToRad(verticalFov / 2)) * ratio;
    target.copy(baseTarget).addScaledVector(right, -screenCentre * halfWidth);
    camera.position.copy(target).addScaledVector(direction, distance); camera.position.y += distance * .37;
    const floor = groundAt(camera.position.x, -camera.position.z);
    if (finite(floor)) camera.position.y = Math.max(camera.position.y, floor + .8);
    camera.lookAt(target); camera.updateMatrixWorld();
    fitted = samples.every(sample => {
      const projected = sample.clone().project(camera);
      return projected.z > -1 && projected.z < 1 && projected.x >= frame.left && projected.x <= frame.right && projected.y <= frame.top && projected.y >= frame.bottom;
    });
    if (fitted || distance >= 18) break;
    distance = Math.min(18, distance * 1.055);
  }
  return { position: camera.position.clone(), target, distance, aspect: ratio, fitted };
}

export function createVillageDialogueCamera({ camera, controls, reducedMotion = () => false, groundAt = () => 0, inSeconds = .5, outSeconds = .38 } = {}) {
  if (!camera?.position?.copy || !camera?.quaternion?.copy || !controls?.target?.copy) throw new TypeError("A village dialogue camera needs its shared camera and controls target.");
  const from = new THREE.Vector3(), fromTarget = new THREE.Vector3(), to = new THREE.Vector3(), toTarget = new THREE.Vector3();
  let mode = "idle", saved = null, player = null, npc = null, elapsed = 0, duration = .5, fitted = true;
  const reduced = () => typeof reducedMotion === "function" ? !!reducedMotion() : !!reducedMotion;
  function write(t) {
    camera.position.lerpVectors(from, to, t); controls.target.lerpVectors(fromTarget, toTarget, t);
    camera.lookAt(controls.target); camera.updateMatrixWorld();
  }
  function restore() {
    if (saved) { camera.position.copy(saved.position); camera.quaternion.copy(saved.quaternion); controls.target.copy(saved.target); controls.enabled = saved.enabled; camera.updateMatrixWorld(); }
    mode = "idle"; saved = player = npc = null; elapsed = 0;
  }
  function transition(nextMode, seconds) {
    from.copy(camera.position); fromTarget.copy(controls.target); elapsed = 0; duration = Math.max(.001, finite(seconds) ? seconds : .5); mode = nextMode; controls.enabled = false;
    if (reduced()) { write(1); if (mode === "returning") restore(); else mode = "focused"; }
  }
  const plan = (a, b, snapshot = saved) => villageDialoguePose({ player: a, npc: b, cameraPosition: snapshot.position, cameraTarget: snapshot.target, aspect: camera.aspect, fov: camera.fov, groundAt });
  function frame(pose = plan(player, npc)) {
    if (!pose?.fitted) return false;
    to.copy(pose.position); toTarget.copy(pose.target); fitted = pose.fitted; return true;
  }
  return {
    begin(playerFeet, npcFeet) {
      const nextPlayer = point(playerFeet), nextNpc = point(npcFeet);
      if (!nextPlayer || !nextNpc || nextPlayer.distanceTo(nextNpc) > 14) return false;
      // A greeting can close and immediately open a quest/chat. Keep the first
      // exploration snapshot while that brief return is still in flight.
      const snapshot = saved ?? { position: camera.position.clone(), quaternion: camera.quaternion.clone(), target: controls.target.clone(), enabled: controls.enabled };
      const pose = plan(nextPlayer, nextNpc, snapshot);
      if (!pose?.fitted) return false;
      saved = snapshot;
      player = nextPlayer; npc = nextNpc;
      frame(pose);
      transition("entering", inSeconds); return true;
    },
    end({ immediate = false } = {}) {
      if (!saved) return false;
      if (immediate) { restore(); return true; }
      to.copy(saved.position); toTarget.copy(saved.target); transition("returning", outSeconds); return true;
    },
    tick(dt = 0) {
      if (mode === "idle") return false;
      controls.enabled = false;
      if (mode === "focused") { write(1); return true; }
      elapsed += finite(dt) ? Math.max(0, dt) : 0;
      const t = Math.min(1, elapsed / duration); write(reduced() ? 1 : ease(t));
      if (t >= 1 || reduced()) { if (mode === "returning") restore(); else mode = "focused"; }
      return mode !== "idle";
    },
    resize() { if (!saved || mode === "returning") return false; if (!frame()) return false; transition("entering", Math.min(.25, inSeconds)); return true; },
    get active() { return mode !== "idle"; },
    get status() { return { active: mode !== "idle", mode, fitted, distance: camera.position.distanceTo(controls.target), subjects: player && npc ? [{ x: player.x, y: player.y, z: player.z }, { x: npc.x, y: npc.y, z: npc.z }] : [] }; },
    dispose() { restore(); },
  };
}
