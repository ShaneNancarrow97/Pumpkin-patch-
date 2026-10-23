import * as THREE from "three";
import { buildMazeRideWorld } from "./maze-ride-world.js";
import { createMazeRide, advanceMazeRide, pauseMazeRide, sampleMazeRail } from "./rules/maze-ride.js";
import { createMazeScareActor, animateMazeScareActor, disposeMazeScareActor } from "./maze-ride-actors.js";

const YAW_LIMIT = Math.PI / 4, PITCH_LIMIT = Math.PI / 9;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smooth = x => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

// A presentation scene shares the game's renderer; it owns no economy or canvas.
export function createMazeRideView(canvas, state, hooks = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07060b); scene.fog = new THREE.FogExp2(0x0b0912, .155);
  scene.add(new THREE.HemisphereLight(0x79748b, 0x18111c, .065));
  const moon = new THREE.DirectionalLight(0x8f92b5, .055); moon.position.set(-3, 7, 5); scene.add(moon);
  // The pool stays fixed for the lifetime of the view, including every scare.
  const pool = Array.from({ length: 4 }, () => new THREE.PointLight(0xffbd80, 0, 11, 1.6)); pool.forEach(light => scene.add(light));
  const camera = new THREE.PerspectiveCamera(67, 1, .055, 75); camera.rotation.order = "YXZ";
  let active = false, run = null, config = null, world = null, actors = [], lastCue = null, completeSent = false, notifiedZone = "";
  let yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0, railYaw = 0, firstFrame = true, pointer = null, disposed = false;
  let options = { gentle: typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches };
  const inputActive = () => active && run && !run.paused && !run.completed && !hooks.blocked?.();
  const resize = () => {
    camera.aspect = Math.max(1, canvas.clientWidth || canvas.width || 1) / Math.max(1, canvas.clientHeight || canvas.height || 1);
    camera.fov = camera.aspect < .75 ? 74 : 67; camera.updateProjectionMatrix();
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
    // Position follows the validated rail exactly, so smoothing cannot cut a bend.
    camera.position.set(p.x, p.y + (!options.gentle ? Math.sin(run.elapsed * 6.8) * .008 : 0), p.z);
    camera.rotation.set(pitch, railYaw + yaw, 0, "YXZ"); camera.updateMatrixWorld(); firstFrame = false;
  }
  function poseActors() {
    if (!run) return;
    for (const actor of actors) {
      const { encounter, object, stage } = actor, age = run.elapsed - encounter.at, duration = encounter.duration;
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
  function poseLights() {
    if (!run || !world) return;
    const p = sampleMazeRail(config, run.progress), ahead = sampleMazeRail(config, Math.min(1, run.progress + .025));
    // A dim lantern shows the next step; distant walls disappear into the fog.
    pool[0].position.set(p.x - .2, 1.35, p.z + .15); pool[0].color.setHex(0xffc48d); pool[0].intensity = .65; pool[0].distance = 3.8;
    const nearest = [...world.lamps].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    const zone = Math.max(0, config.zones.findIndex(z => z.id === run.zone));
    const colours = [0xffb16e, 0x8baecc, 0xb299c8, 0x7fb9bc, 0xd99b8b];
    for (let i = 1; i <= 2; i++) {
      const lamp = nearest[i - 1] ?? { x: ahead.x, y: 2.4, z: ahead.z, colour: 0xb3a2d3 };
      pool[i].position.set(lamp.x, lamp.y, lamp.z); pool[i].color.setHex(i === 1 ? colours[zone] : 0xffbf83); pool[i].intensity = i === 1 ? 8.5 : 4.5; pool[i].distance = i === 1 ? 5.6 : 4.4;
    }
    // Broad, slow colour pools breathe without flashing; a reveal gets a brief rim.
    const current = actors.find(a => run.elapsed >= a.encounter.at && run.elapsed < a.encounter.at + a.encounter.duration * .72);
    const breathing = options.gentle ? .6 : .4 + .3 * Math.sin(run.elapsed * .45 + zone);
    if (current) pool[3].position.set(current.object.position.x, 2.1, current.object.position.z + .4);
    else pool[3].position.set(ahead.x, 2.55, ahead.z);
    pool[3].color.setHex(colours[(zone + 1) % colours.length]); pool[3].intensity = current ? 2.2 : breathing; pool[3].distance = current ? 3 : 4;
  }
  function renderPose(dt = 0, snap = false) { poseCamera(dt, snap); poseActors(); poseLights(); world?.tick(run?.elapsed ?? 0, options.gentle); }
  function advance(seconds, snap = false) {
    if (!active || !run) return [];
    const before = run.elapsed;
    const cues = advanceMazeRide(run, seconds);
    for (const cue of cues) if (cue.type === "encounter") { lastCue = cue; hooks.onCue?.(cue); }
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
      yaw = pitch = targetYaw = targetPitch = 0; firstFrame = true;
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
