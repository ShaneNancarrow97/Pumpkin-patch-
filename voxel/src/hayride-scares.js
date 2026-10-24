import * as THREE from "three";
import { HAYRIDE_STOPS, HAYRIDE_ROUTE_LENGTH, hayrideRouteSample, hayrideSpan as u } from "./content/hayride-layout.js";
import { HAYRIDE_SCARE_BY_ID } from "./content/hayride.js";
import { createMazeScareActor, animateMazeScareActor, disposeMazeScareActor } from "./maze-ride-actors.js";

// These are the original, detailed generated cast sheets already used indoors.
// Only this off-map scene owns the instances; atlas geometry/textures stay shared.
const CAST = [
  { stop: "scarecrows", actor: "scarecrow", effect: "turning-scarecrows", offset: 4.1 },
  { stop: "bride", actor: "haunted-girl", effect: "bride-procession", offset: 6.1 },
  { stop: "pursuit", actor: "wraith", effect: "spectral-burst", offset: 4.1 },
  { stop: "bus", actor: "ghoul", effect: "bus-breakout", offset: 5.4 },
];
const clamp = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };

// A gradual glimpse precedes the quick approach. The seated lane stays clear.
// Windows are in units of lane (hayrideSpan), so the pace holds on any route.
export function hayrideScarePose(spec, progress, upgraded = false, gentle = false) {
  const delta = (Number.isFinite(progress) ? progress : 0) - spec.at;
  const width = u(upgraded ? 6.8 : 5.4);
  const reveal = smooth((delta + u(4.5)) / u(2.3)) * (1 - smooth((delta - u(2.6)) / (width - u(2.6))));
  const lunge = gentle ? 0 : smooth((delta + u(.5)) / u(1.7)) * (1 - smooth((delta - u(2.5)) / u(2.5)));
  const near = upgraded ? 2.6 : 3.15;
  const offset = spec.offset - (spec.offset - near) * lunge;
  return { visible: reveal > .008, reveal, lunge, offset, delta };
}

export function createHayrideScares({ state } = {}) {
  const group = new THREE.Group(); group.name = "Hollow Hayride detailed scare cast";
  const entries = CAST.map(spec => {
    const stop = HAYRIDE_STOPS.find(stop => stop.id === spec.stop), frame = hayrideRouteSample(stop.at * HAYRIDE_ROUTE_LENGTH);
    const actor = createMazeScareActor(spec.actor); actor.name = `Hayride scare: ${spec.stop}`; actor.visible = false;
    group.add(actor);
    return { ...spec, at: stop.at, frame, actor, pose: null };
  });
  let disposed = false;
  const cameraPoint = new THREE.Vector3(), actorHead = new THREE.Vector3();
  const cameraProxy = { getWorldPosition(target) { return target.copy(cameraPoint); } };
  const upgraded = effect => {
    const h = state?.hayride, item = HAYRIDE_SCARE_BY_ID[effect];
    return !!(item && h?.tier >= item.tier && h.haunts?.owned?.includes(effect) && h.haunts?.active?.includes(effect));
  };
  function tick({ progress = 0, time = 0, gentle = false, camera = null } = {}) {
    if (disposed) return;
    if (camera?.getWorldPosition) camera.getWorldPosition(cameraPoint);
    else if (camera && Number.isFinite(camera.x) && Number.isFinite(camera.z)) cameraPoint.set(camera.x, camera.y ?? 2, camera.z);
    else { const frame = hayrideRouteSample(clamp(progress) * HAYRIDE_ROUTE_LENGTH); cameraPoint.set(frame.x, 2, frame.z); }
    for (const entry of entries) {
      const pose = hayrideScarePose(entry, progress, upgraded(entry.effect), !!gentle), { actor, frame } = entry;
      entry.pose = pose; actor.visible = pose.visible;
      // The spectral figure floats above its native investigators, keeping the
      // detailed face clear of their heads when seen from the wagon bench.
      actor.position.set(frame.x + frame.dz * pose.offset, entry.stop === "pursuit" ? .68 : .06, frame.z - frame.dx * pose.offset);
      // Native branches/sets hide each entrance; the whole art never crosses the lane.
      actor.scale.setScalar(1 + (upgraded(entry.effect) ? .06 : 0));
      if (!pose.visible) continue;
      animateMazeScareActor(actor, { pose: pose.lunge > .1 ? "scare" : "lurking", reveal: pose.reveal,
        lunging: pose.lunge, time: gentle ? 0 : (Number.isFinite(time) ? time : 0), camera: cameraProxy });
      const material = actor.userData.visual?.children[0]?.material;
      if (actor.userData.ready && material) material.emissiveIntensity = .07 + pose.reveal * .1 + pose.lunge * .04;
    }
    group.updateMatrixWorld(true);
  }
  return {
    group, tick,
    focusTarget(progress) {
      if (disposed) return null;
      const entry = entries.filter(entry => entry.pose?.visible).sort((a, b) => Math.abs(progress - a.at) - Math.abs(progress - b.at))[0];
      if (!entry) return null;
      entry.actor.getWorldPosition(actorHead); actorHead.y += 1.72;
      return actorHead.clone();
    },
    get diagnostics() { return { actors: entries.length, visible: entries.filter(entry => entry.actor.visible).length,
      disposed, cast: entries.map(entry => ({ stop: entry.stop, actor: entry.actor.userData.mazeScareActor,
        ready: !!entry.actor.userData.ready, visible: entry.actor.visible, lunge: entry.pose?.lunge ?? 0, offset: entry.pose?.offset ?? entry.offset })) }; },
    dispose() {
      if (disposed) return; disposed = true;
      for (const entry of entries) disposeMazeScareActor(entry.actor);
      group.clear(); group.removeFromParent();
    },
  };
}
