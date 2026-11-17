import { LEAN } from "./world.js";
import { gardenDoorstep } from "./play-ways.js";

// Play mode in the garden: the owner being played, as a figure in the garden's
// own scene, turned to its camera the way faceCast (scene.js) turns the cast on
// the farm. The garden's camera is a perspective one that moves about, so each
// frame the figure faces the camera itself, and its lean stretches by the
// camera's pitch just as the farm's does.
export function createGardenPlay({ view, state, character }) {
  let figure = null, owner = "", outfit = "";
  const sprite = (g) => { const lean = g.children[0]; return !!lean?.isGroup && lean.children.some((m) => m.isMesh && m.geometry?.type === "PlaneGeometry" && m.customDepthMaterial); };
  function release() {
    if (!figure) return;
    view.scene.remove(figure); figure.userData.dispose?.(); figure = null; owner = outfit = "";
  }
  function actor(who) {
    const wearing = state.wardrobe?.equipped?.[who] ?? "";
    if (figure && owner === who && outfit === wearing) return figure;
    const was = figure?.position.clone(); release();
    const next = character(who); if (!next) return null;
    const spot = was ?? gardenDoorstep(state);
    next.position.set(spot.x, .04, spot.z); next.userData.gardenSprite = sprite(next);
    view.scene.add(next); figure = next; owner = who; outfit = wearing;
    return figure;
  }
  function tick() {
    if (!figure) return;
    const camera = view.camera, dx = camera.position.x - figure.position.x, dz = camera.position.z - figure.position.z;
    figure.rotation.y = Math.atan2(dx, dz);
    const lean = figure.children[0];
    if (!figure.userData.gardenSprite || !lean) return;
    const pitch = Math.atan2(camera.position.y - figure.position.y - 1.2, Math.hypot(dx, dz));
    lean.rotation.x = -LEAN; lean.scale.y = Math.min(1.6, 1 / Math.cos(Math.max(0, pitch - LEAN)));
  }
  return { actor, release, tick, figure: () => figure, get scene() { return view.scene; } };
}
