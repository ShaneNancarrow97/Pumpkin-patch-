import * as THREE from "three";
import { Voxels } from "./voxels.js";

// Scene-owned visual clocks never spend money or advance attraction visits.
export function createHollowExteriorEffects(sockets = {}, tier = 1) {
  const group = new THREE.Group(), shutters = [], silhouettes = [];
  group.name = "Hollow House exterior hauntings";
  for (const socket of (sockets.shutters ?? []).filter(s => !s.face || s.face === "front")) {
    const pivot = new THREE.Group(), v = new Voxels(), side = socket.side || 1;
    const w = socket.width ?? .46, h = socket.height ?? 1.55;
    v.block(side * w / 2, 0, 0, w, h, .065, 0x382c3b);
    for (let y = .1; y < h; y += .16) v.block(side * w / 2, y, .04, w - .06, .07, .045, 0x5e3d4b);
    for (const y of [.08, h - .14]) v.block(side * w / 2, y, .075, w + .015, .06, .025, 0xa57c49);
    pivot.position.set(socket.x, socket.y, socket.z); pivot.add(v.build()); group.add(pivot);
    shutters.push({ pivot, side });
  }
  for (const [index, socket] of (sockets.windows ?? []).filter(w => w.face === "front").slice(0, tier >= 3 ? 2 : 1).entries()) {
    const v = new Voxels(), h = Math.min(.95, (socket.height ?? 1.35) * .72);
    v.block(0, .05, 0, .28, h * .58, .025, 0x221e32); v.block(0, h * .58, 0, .3, h * .29, .03, 0x201c2c);
    for (const x of [-.075, .075]) v.block(x, h * .74, .025, .035, .025, .015, 0xbac5df, true);
    const actor = v.build({ shadows: false }); actor.position.set(socket.x, socket.y + .15, socket.z + .015); actor.visible = false;
    group.add(actor); silhouettes.push({ actor, x: socket.x, index });
  }
  const ghost = new THREE.Group(), v = new Voxels();
  for (let row = 0; row < 6; row++) v.block(0, row * .09, 0, .5 - row * .045, .095, .1, 0xb5b4cc);
  for (const x of [-.075, .075]) v.block(x, .4, .06, .05, .07, .015, 0x1a1b2b);
  ghost.add(v.build({ shadows: false })); ghost.position.set(sockets.ghost?.x ?? 0, sockets.ghost?.y ?? 3.3, sockets.ghost?.z ?? 2.28);
  ghost.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = 0; o.material.depthWrite = false; } });
  ghost.visible = false; group.add(ghost);
  let reduced = false, lastTime = 0, active = false;
  function tick(time, { ready = true, reducedMotion = false } = {}) {
    time = Number.isFinite(time) ? time : 0; reduced = !!reducedMotion; active = !!ready; lastTime = reduced ? 0 : time; group.visible = active;
    for (const [i, shutter] of shutters.entries()) {
      const phase = (time + i * 3.4) % 19, creak = !reduced && phase > 14 ? Math.sin((phase - 14) / 5 * Math.PI) : 0;
      shutter.pivot.rotation.y = -shutter.side * (.12 + creak * .32);
    }
    for (const { actor, x, index } of silhouettes) {
      const phase = (time + index * 8) % 26; actor.visible = active && (reduced || phase > 15 && phase < 21);
      actor.position.x = x + (reduced ? 0 : Math.sin((phase - 15) * .65) * .12);
    }
    const phase = time % 43, reveal = !reduced && tier >= 2 && phase > 31 && phase < 38 ? Math.sin((phase - 31) / 7 * Math.PI) : 0;
    ghost.visible = active && reveal > .01; ghost.position.y = (sockets.ghost?.y ?? 3.3) + (reduced ? 0 : Math.sin(time * .8) * .08);
    ghost.traverse(o => { if (o.material) o.material.opacity = reveal * .3; });
  }
  return { group, tick, get status() { return { reducedMotion: reduced, active, time: lastTime, shutters: shutters.length, silhouettes: silhouettes.filter(s => s.actor.visible).length, ghost: ghost.visible }; }, dispose() {
    group.removeFromParent(); group.traverse(o => { if (o.isInstancedMesh) o.dispose(); for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) m.dispose(); });
  } };
}
