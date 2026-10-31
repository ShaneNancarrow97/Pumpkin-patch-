import * as THREE from "three";
import { buildMazeRideWorld, MAZE_RIDE_FINISH } from "./maze-ride-world.js";
import { createMazeRide, advanceMazeRide, pauseMazeRide, sampleMazeRail } from "./rules/maze-ride.js";
import { createMazeScareActor, animateMazeScareActor, disposeMazeScareActor } from "./maze-ride-actors.js";

const YAW_LIMIT = Math.PI / 4, PITCH_LIMIT = Math.PI / 9;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smooth = x => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
// A jump scare (full motion only): the figure rushes at you, holds right in
// your face, shaking and lit from the front, then is gone.
export const MAZE_JUMP = Object.freeze({ rush: .18, hold: .55, distance: .74, face: .74 });
const lens = new THREE.Vector3();

// A presentation scene shares the game's renderer; it owns no economy or canvas.
export function createMazeRideView(canvas, state, hooks = {}) {
  // Each chamber tints the fog and the faint fill light; the nearest lamps light the room.
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0912); scene.fog = new THREE.FogExp2(0x0b0912, .075);
  const fill = new THREE.HemisphereLight(0x8a6f86, 0x3a2a30, 1.3); scene.add(fill);
  const moon = new THREE.DirectionalLight(0x8f92b5, .08); moon.position.set(-3, 7, 5); scene.add(moon);
  // The pool stays fixed for the lifetime of the view, including every scare:
  // a carried glow, four for the nearest lamps, and one for a reveal or the exit.
  const pool = Array.from({ length: 6 }, () => new THREE.PointLight(0xffbd80, 0, 7, 1.35)); pool.forEach(light => scene.add(light));
  const fogTarget = new THREE.Color(0x0b0912), fillTarget = new THREE.Color(0x8a6f86), focus = new THREE.Vector3();
  const camera = new THREE.PerspectiveCamera(67, 1, .055, 75); camera.rotation.order = "YXZ";
  let active = false, run = null, config = null, world = null, actors = [], lastCue = null, completeSent = false, notifiedZone = "";
  let yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0, railYaw = 0, firstFrame = true, pointer = null, disposed = false, glance = 0, glanceDown = 0, jolt = 0, baseFov = 67;
  let options = { gentle: typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches };
  const inputActive = () => active && run && !run.paused && !run.completed && !hooks.blocked?.();
  const resize = () => {
    camera.aspect = Math.max(1, canvas.clientWidth || canvas.width || 1) / Math.max(1, canvas.clientHeight || canvas.height || 1);
    baseFov = camera.aspect < .75 ? 74 : 67; camera.fov = baseFov + jolt * 5; camera.updateProjectionMatrix();
  };
  function snapshot() {
    let geometries = 0, textures = 0; const seenGeometry = new Set(), seenTexture = new Set();
    scene.traverse(m => { if (m.geometry && !seenGeometry.has(m.geometry)) { seenGeometry.add(m.geometry); geometries++; } const materials = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []; for (const material of materials) if (material.map && !seenTexture.has(material.map)) { seenTexture.add(material.map); textures++; } });
    return {
      active, id: run?.id ?? null, status: run?.status ?? "idle", tier: config?.tier ?? 0, title: config?.title ?? "The Hollow House",
      elapsed: run?.elapsed ?? 0, duration: config?.duration ?? 0, progress: run?.progress ?? 0, paused: !!run?.paused, completed: !!run?.completed,
      zone: run?.zone ?? null, zoneName: run?.zoneName ?? "", chambers: (config?.zones ?? []).map(z => ({ id: z.id, name: z.name })),
      eventsFired: [...(run?.eventsFired ?? [])], encounters: config?.encounters.length ?? 0, activeHaunts: [...(config?.activePrefabs ?? [])], terror: run?.terror ?? 0,
      lookYaw: yaw, lookPitch: pitch, lookBounds: { yaw: YAW_LIMIT, pitch: PITCH_LIMIT }, inputActive: !!inputActive(), gentle: !!options.gentle,
      camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: camera.rotation.y, pitch: camera.rotation.x },
      rail: config ? sampleMazeRail(config, run?.progress ?? 0) : null, geometryCount: geometries, textureCount: textures, lightCount: pool.length + 2,
      batches: world?.diagnostics.batches ?? 0, boxes: world?.diagnostics.boxes ?? 0, floorCells: world?.diagnostics.floorCells ?? 0,
      actors: actors.map(a => ({ id: a.encounter.id, actor: a.encounter.actor, visible: a.object.visible, x: a.object.position.x, y: a.object.position.y, z: a.object.position.z, pose: a.pose })),
      currentCue: lastCue && run && run.elapsed <= lastCue.at + (lastCue.duration ?? 0) ? { id: lastCue.encounterId ?? lastCue.id, at: lastCue.at, actor: lastCue.actor, prefab: lastCue.prefab, sound: lastCue.sound } : null,
    };
  }
  const notify = () => hooks.onState?.(snapshot());
  function clearGestures() { const previous = pointer; pointer = null; if (previous) { try { canvas.releasePointerCapture?.(previous.id); } catch {} } }
  function clearActors() { for (const actor of actors) { scene.remove(actor.object); disposeMazeScareActor(actor.object); } actors = []; }
  function buildActors() {
    clearActors();
    actors = config.encounters.map((encounter, index) => {
      const object = createMazeScareActor(encounter.actor), stage = world.stages[index];
      object.position.set(stage.home.x, .04, stage.home.z); object.visible = false; object.name = "Maze reveal: " + encounter.id; scene.add(object);
      return { encounter, object, stage, pose: "lurking" };
    });
  }
  function poseCamera(dt, snap = false) {
    if (!run || !config) return;
    const p = sampleMazeRail(config, run.progress), ahead = sampleMazeRail(config, Math.min(1, run.progress + .007));
    const dx = ahead.x - p.x, dz = ahead.z - p.z, heading = Math.atan2(-(Math.hypot(dx, dz) > .01 ? dx : p.dx), -(Math.hypot(dx, dz) > .01 ? dz : p.dz));
    const blend = snap || firstFrame ? 1 : run.paused || run.completed ? 0 : 1 - Math.exp(-Math.max(0, dt) * 7);
    railYaw += angleDelta(railYaw, heading) * blend;
    yaw = clamp(yaw + (targetYaw - yaw) * blend, -YAW_LIMIT, YAW_LIMIT);
    pitch = clamp(pitch + (targetPitch - pitch) * blend, -PITCH_LIMIT, PITCH_LIMIT);
    // Like a guide's hand on your shoulder, the house turns you a little towards
    // each chamber's centrepiece as you pass it, but never while a scare is near.
    let want = 0, down = 0;
    for (const zone of config.zones) {
      const { x, z } = zone.center, inside = Math.abs(p.x - x) < 4 && Math.abs(p.z - z) < 5;
      if (!inside) continue;
      const sx = x - zone.side, sz = z - 1.4, toward = Math.atan2(-(sx - p.x), -(sz - p.z)), delta = angleDelta(heading, toward);
      const weight = smooth((1.75 - Math.abs(delta)) / .45) * smooth((p.z - (z - 4.5)) / 1.5);
      want = clamp(delta, -.7, .7) * weight; down = -.12 * weight;
    }
    const scare = Math.max(0, ...config.encounters.map(e => smooth((run.elapsed - (e.at - 1.6)) / .6) * (1 - smooth((run.elapsed - (e.at + e.duration)) / .8))));
    want *= 1 - scare; down *= 1 - scare;
    glance += (want - glance) * blend * .6; glanceDown += (down - glanceDown) * blend * .6;
    // Position follows the validated rail exactly, so smoothing cannot cut a bend.
    if (!run.paused) jolt = Math.max(0, jolt - Math.max(0, dt) * 2.4);
    const shake = options.gentle ? 0 : Math.min(1.4, jolt) ** 2 * .03, wobble = run.elapsed * 47;
    camera.position.set(p.x + Math.sin(wobble) * shake, p.y + (!options.gentle ? Math.sin(run.elapsed * 6.8) * .008 : 0) + Math.cos(wobble * 1.3) * shake, p.z);
    camera.rotation.set(pitch + glanceDown, railYaw + yaw + glance, Math.sin(wobble * .7) * shake * .4, "YXZ");
    const fov = baseFov + (options.gentle ? 0 : jolt * 5); if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld(); firstFrame = false;
  }
  function poseActors() {
    if (!run) return;
    for (const actor of actors) {
      const { encounter, object, stage } = actor, age = run.elapsed - encounter.at, duration = encounter.duration;
      if (!options.gentle && age >= 0) {
        // The leap: from where it waited to just in front of the lens, its face at eye level.
        const end = MAZE_JUMP.rush + MAZE_JUMP.hold; object.visible = age < end; actor.pose = "scare";
        if (!object.visible) continue;
        const start = actor.from ??= { x: object.position.x, z: object.position.z };
        camera.getWorldDirection(lens); lens.y = 0; lens.normalize();
        const t = Math.min(1, age / MAZE_JUMP.rush), rush = t * t * t, face = (object.userData.height ?? 2.1) * MAZE_JUMP.face;
        const shake = age > MAZE_JUMP.rush ? Math.sin(age * 63) * .035 : 0, sx = -lens.z, sz = lens.x;
        const tx = camera.position.x + lens.x * MAZE_JUMP.distance + sx * shake, tz = camera.position.z + lens.z * MAZE_JUMP.distance + sz * shake;
        object.position.set(start.x + (tx - start.x) * rush, .04 + (camera.position.y - face - .04) * rush, start.z + (tz - start.z) * rush);
        object.scale.setScalar(1 + (age > MAZE_JUMP.rush ? Math.sin(age * 31) * .035 : 0));
        if (age >= MAZE_JUMP.rush && !actor.hit) { actor.hit = true; jolt = 1.4; }
        animateMazeScareActor(object, { pose: "scare", reveal: 1, lunging: 1, glare: rush, time: run.elapsed, camera });
        continue;
      }
      actor.from = null; actor.hit = false; object.scale.setScalar(1);
      object.visible = age >= -.7 && age <= duration;
      if (!object.visible) continue;
      const reveal = smooth((age + .7) / .85), retreat = 1 - smooth((age - duration * .42) / (duration * .44));
      const lunge = smooth(age / (options.gentle ? .8 : .42)) * retreat;
      const approach = Math.min(1.25, Math.max(0, stage.forwardDistance - .9));
      const near = Math.min(stage.distance * .5, (stage.forwardDistance - approach) * (options.gentle ? .2 : .11));
      const distance = (stage.distance + .45) + (near - stage.distance - .45) * lunge;
      object.position.set(stage.rail.x + stage.nx * distance - stage.rail.dx * approach * lunge, .04, stage.rail.z + stage.nz * distance - stage.rail.dz * approach * lunge);
      actor.pose = age >= 0 && age < duration * .72 ? "scare" : "lurking";
      animateMazeScareActor(object, { pose: actor.pose, reveal: reveal * retreat, lunging: options.gentle ? lunge * .35 : lunge, time: options.gentle ? 0 : run.elapsed, camera });
    }
  }
  // A flame flickers, glass glows steadily with a slow pulse, an arc crackles.
  function lampLevel(lamp, i, time) {
    if (lamp.kind === "flame") return lamp.power * (options.gentle ? .95 : .82 + .12 * Math.sin(time * 11 + i * 1.7) * Math.sin(time * 6.3 + i));
    if (lamp.kind === "arc") return lamp.power * (Math.sin(time * 3.1 + i) + Math.sin(time * 7.7 + i * 2) > (options.gentle ? 1.6 : .9) ? 1.6 : .5);
    return lamp.power * (.9 + .1 * Math.sin(time * 1.4 + i));
  }
  function poseLights() {
    if (!run || !world) return;
    const time = run.elapsed, p = sampleMazeRail(config, run.progress), ahead = sampleMazeRail(config, Math.min(1, run.progress + .02));
    const zone = Math.max(0, config.zones.findIndex(z => z.id === run.zone)), finish = MAZE_RIDE_FINISH[zone] ?? MAZE_RIDE_FINISH[0];
    fogTarget.setHex(finish.fog); fillTarget.setHex(finish.tint);
    scene.fog.color.lerp(fogTarget, .04); scene.background.copy(scene.fog.color); fill.color.lerp(fillTarget, .04);
    // A small glow carried with you, so the floor ahead never goes black.
    pool[0].position.set(p.x + p.dx * .4, 1.2, p.z + p.dz * .4); pool[0].color.setHex(0xffc48d); pool[0].intensity = .7; pool[0].distance = 4.2;
    // The four lamps nearest a point just ahead of you.
    focus.set(p.x * .4 + ahead.x * .6, 0, p.z * .4 + ahead.z * .6);
    const near = world.lamps.map((lamp, i) => ({ lamp, i, d: Math.hypot(lamp.x - focus.x, lamp.z - focus.z) })).filter(e => e.lamp.kind !== "door").sort((a, b) => a.d - b.d);
    for (let k = 1; k <= 4; k++) {
      const e = near[k - 1], light = pool[k];
      if (!e) { light.intensity = 0; continue; }
      light.position.set(e.lamp.x, e.lamp.y, e.lamp.z); light.color.setHex(e.lamp.colour);
      light.intensity = 4.6 * lampLevel(e.lamp, e.i, time) * Math.max(0, 1 - Math.max(0, e.d - 6) / 3); light.distance = 7.5;
    }
    // A reveal gets a brief rim; near the end, the foyer's light spills through the opening doors.
    const current = actors.find(a => run.elapsed >= a.encounter.at - .2 && run.elapsed < a.encounter.at + a.encounter.duration * .72);
    const leaping = !options.gentle && actors.find(a => a.object.visible && run.elapsed >= a.encounter.at && run.elapsed < a.encounter.at + MAZE_JUMP.rush + MAZE_JUMP.hold);
    if (leaping) { camera.getWorldDirection(lens); pool[5].position.copy(camera.position).addScaledVector(lens, .25); pool[5].color.setHex(0xd8c4ff); pool[5].intensity = 1.6; pool[5].distance = 2; return; }
    const exit = world.lamps.find(l => l.kind === "door"), opening = smooth((run.elapsed - (config.duration - 1.3)) / 1.1);
    if (current) { pool[5].position.set(current.object.position.x, 2.2, current.object.position.z); pool[5].color.setHex(0xc8b3ff); pool[5].intensity = 4; pool[5].distance = 3.2; }
    else if (exit && opening > 0) { pool[5].position.set(exit.x, exit.y, exit.z + .6); pool[5].color.setHex(exit.colour); pool[5].intensity = 14 * opening; pool[5].distance = 9; }
    else { pool[5].position.set(ahead.x, 2.5, ahead.z); pool[5].color.setHex(finish.tint); pool[5].intensity = options.gentle ? .6 : .45 + .25 * Math.sin(time * .45 + zone); pool[5].distance = 5; }
  }
  function renderPose(dt = 0, snap = false) { poseCamera(dt, snap); poseActors(); poseLights(); world?.tick(run?.elapsed ?? 0, options.gentle, { elapsed: run?.elapsed ?? 0, duration: config?.duration ?? Infinity }); }
  function advance(seconds, snap = false) {
    if (!active || !run) return [];
    const before = run.elapsed;
    const cues = advanceMazeRide(run, seconds);
    for (const cue of cues) if (cue.type === "encounter") { lastCue = cue; jolt = options.gentle ? 1 : .45; hooks.onCue?.(cue); }
    const advanced = run.elapsed !== before;
    renderPose(advanced ? seconds : 0, advanced && (snap || run.completed && !completeSent));
    if (run.zone !== notifiedZone) { notifiedZone = run.zone; notify(); }
    if (run.completed && !completeSent) { completeSent = true; clearGestures(); hooks.onComplete?.(snapshot()); }
    return cues;
  }
  const down = event => {
    if (!inputActive() || event.button !== 0 || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.setPointerCapture?.(event.pointerId); event.preventDefault();
  };
  const move = event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (!inputActive()) { clearGestures(); return; }
    targetYaw = clamp(targetYaw - (event.clientX - pointer.x) * .004, -YAW_LIMIT, YAW_LIMIT);
    targetPitch = clamp(targetPitch - (event.clientY - pointer.y) * .003, -PITCH_LIMIT, PITCH_LIMIT);
    pointer.x = event.clientX; pointer.y = event.clientY; event.preventDefault();
  };
  const up = event => { if (pointer?.id === event.pointerId) clearGestures(); };
  canvas.addEventListener?.("pointerdown", down); canvas.addEventListener?.("pointermove", move); canvas.addEventListener?.("pointerup", up); canvas.addEventListener?.("pointercancel", up); canvas.addEventListener?.("lostpointercapture", up);
  const api = {
    scene, camera, resize,
    get active() { return active; }, get run() { return run; }, get config() { return config; }, get status() { return snapshot(); },
    enter(nextConfig, nextOptions = {}) {
      if (disposed || !nextConfig) return false;
      const nextRun = createMazeRide(nextConfig); if (!nextRun) return false;
      clearGestures(); const rebuild = !world || config?.key !== nextConfig.key;
      if (rebuild) { clearActors(); world?.dispose(); world = buildMazeRideWorld(nextConfig); scene.add(world.group); }
      config = nextConfig; run = nextRun; active = true; options = { ...options, ...nextOptions }; completeSent = false; lastCue = null; notifiedZone = run.zone;
      yaw = pitch = targetYaw = targetPitch = glance = glanceDown = jolt = 0; firstFrame = true;
      if (nextOptions.paused) pauseMazeRide(run, true);
      buildActors(); resize(); renderPose(0, true); notify(); return true;
    },
    leave() { active = false; clearGestures(); clearActors(); world?.dispose(); world = null; run = config = lastCue = null; pool.forEach(light => { light.intensity = 0; }); notify(); },
    tick(dt) { if (active) advance(Number.isFinite(dt) && dt > 0 ? dt : 0); },
    setPaused(paused = true) { if (!run) return false; const changed = pauseMazeRide(run, !!paused); clearGestures(); renderPose(0); if (changed) notify(); return changed; },
    pause(paused = true) { return api.setPaused(paused); },
    setOptions(next = {}) { options = { ...options, ...next }; if (typeof next.reducedMotion === "boolean" && typeof next.gentle !== "boolean") options.gentle = next.reducedMotion; renderPose(0); notify(); },
    restart(nextOptions = {}) { return config ? api.enter(config, { ...options, paused: false, ...nextOptions }) : false; },
    advanceForTest(seconds) { const cues = advance(Number.isFinite(seconds) && seconds > 0 ? seconds : 0, true); return { ...snapshot(), cues }; },
    setLook(nextYaw = 0, nextPitch = 0) { if (!inputActive()) return false; targetYaw = clamp(Number(nextYaw) || 0, -YAW_LIMIT, YAW_LIMIT); targetPitch = clamp(Number(nextPitch) || 0, -PITCH_LIMIT, PITCH_LIMIT); renderPose(0, true); return true; },
    dispose() { if (disposed) return; api.leave(); disposed = true; for (const [name, fn] of [["pointerdown", down], ["pointermove", move], ["pointerup", up], ["pointercancel", up], ["lostpointercapture", up]]) canvas.removeEventListener?.(name, fn); },
  };
  resize(); return api;
}
