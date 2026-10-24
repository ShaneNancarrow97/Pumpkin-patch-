import * as THREE from "three";
import { HAYRIDE_PROPERTY, HAYRIDE_TIERS } from "./content/hayride.js";
import { HAYRIDE_STOPS } from "./content/hayride-layout.js";
import { HAYRIDE_LIGHTNING_TIMES, hayrideLightning } from "./content/hayride-weather.js";

const INTRO = 2.5, YAW_LIMIT = Math.PI * .48, PITCH_LIMIT = Math.PI / 7;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
const sounds = { scarecrows: "knock", spiders: "skitter", bride: "whisper", pursuit: "whoosh", bus: "chains" };
const finite = n => Number.isFinite(n) ? n : 0;

// A free owner camera in a separate off-map scene, using the existing renderer.
// Autonomous guests, wallets and receipts keep their authoritative farm rules.
export function createHayrideView(canvas, state, hooks = {}) {
  const camera = new THREE.PerspectiveCamera(68, 1, .045, 48); camera.rotation.order = "YXZ";   // the fog hides all beyond 40 units, so nothing further is drawn
  let active = false, run = null, pointer = null, disposed = false, yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0;
  let options = { gentle: !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches, lightning: true }, fogSave = null, backgroundSave = null;
  const point = new THREE.Vector3(), target = new THREE.Vector3(), base = new THREE.Euler(0, 0, 0, "YXZ");
  const world = () => typeof hooks.world === "function" ? hooks.world() : hooks.world;
  const inputActive = () => active && run && !run.paused && !run.completed && !hooks.blocked?.();
  const status = () => ({
    active, title: "The Hollow Hayride", tier: run?.tier ?? 0, elapsed: run?.elapsed ?? 0, duration: run?.duration ?? 0,
    rideDuration: run?.rideDuration ?? HAYRIDE_PROPERTY.rideAlongSeconds, progress: run?.progress ?? 0, paused: !!run?.paused, completed: !!run?.completed,
    zoneName: !run ? "The Hollow Hayride" : run.elapsed < INTRO ? "Rear boarding" : [...HAYRIDE_STOPS].reverse().find(stop => run.progress >= stop.at - .06)?.name ?? "Into the woods",
    eventsFired: [...(run?.fired ?? [])], currentCue: run?.cue && run.elapsed - run.cue.at < 2.7 ? { ...run.cue } : null,
    gentle: !!options.gentle, lightning: options.lightning !== false, lightningIntensity: run ? hayrideLightning(run.elapsed, { ...options, paused: run.paused || run.completed }) : 0,
    lookYaw: yaw, lookPitch: pitch, lookBounds: { yaw: YAW_LIMIT, pitch: PITCH_LIMIT }, inputActive: !!inputActive(),
    camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: camera.rotation.y, pitch: camera.rotation.x },
  });
  const notify = () => hooks.onState?.(status());
  const clearPointer = () => { const old = pointer; pointer = null; if (old) try { canvas.releasePointerCapture?.(old.id); } catch {} };
  const resize = () => {
    camera.aspect = Math.max(1, canvas.clientWidth || canvas.width || 1) / Math.max(1, canvas.clientHeight || canvas.height || 1);
    camera.fov = camera.aspect < .8 ? 76 : 68; camera.updateProjectionMatrix();
  };
  function pose(dt = 0, snap = false) {
    if (!run) return;
    const site = world(); site?.setPreview?.(run.progress);
    site?.setLightning?.(hayrideLightning(run.elapsed, { ...options, paused: run.paused || run.completed }));
    const frame = site?.getPreviewFrame?.(run.progress); if (!frame) return;
    point.copy(frame.position); target.copy(frame.target);
    // Let each roadside set read before it passes. A deliberate look overrides
    // the director, and gentle mode keeps the forward-facing camera steady.
    if (!options.gentle && Math.abs(targetYaw) < .06 && Math.abs(targetPitch) < .06 && frame.focusTarget && run.elapsed >= INTRO) target.lerp(frame.focusTarget, frame.focusWeight ?? 0);
    const board = 1 - smooth(run.elapsed / INTRO), heading = finite(frame.yaw);
    point.x += Math.sin(heading) * 3.2 * board; point.z += Math.cos(heading) * 3.2 * board; point.y += .7 * board;
    if (!options.gentle && run.elapsed >= INTRO && !run.paused) point.y += Math.sin(run.elapsed * 4.1) * .008;
    const blend = snap ? 1 : 1 - Math.exp(-Math.max(0, dt) * 9);
    yaw += (targetYaw - yaw) * blend; pitch += (targetPitch - pitch) * blend;
    camera.position.copy(point); camera.lookAt(target); base.setFromQuaternion(camera.quaternion, "YXZ");
    camera.rotation.set(base.x + pitch, base.y + yaw, 0, "YXZ"); camera.updateMatrixWorld(true);
  }
  function advance(seconds) {
    if (!active || !run || run.paused || run.completed) return [];
    run.elapsed = Math.min(run.duration, run.elapsed + Math.max(0, finite(seconds)));
    run.progress = clamp((run.elapsed - INTRO) / run.rideDuration, 0, 1);
    const cues = [];
    for (const stop of HAYRIDE_STOPS) {
      if (run.progress < stop.at || run.fired.has(stop.id)) continue;
      run.fired.add(stop.id);
      const cue = { type: "encounter", id: `hayride-${stop.id}`, stop: stop.id, name: stop.name, sound: sounds[stop.id], at: INTRO + stop.at * run.rideDuration, intensity: options.gentle ? .25 : .45 };
      run.cue = cue; cues.push(cue); hooks.onCue?.(cue);
    }
    for (let i = 0; i < HAYRIDE_LIGHTNING_TIMES.length; i++) {
      if (run.elapsed < HAYRIDE_LIGHTNING_TIMES[i] + .8 || run.thunder.has(i)) continue;
      run.thunder.add(i);
      if (!options.gentle && options.lightning !== false) hooks.onCue?.({ type: "weather", id: `hayride-thunder-${i}`, sound: "thunder", intensity: .38 });
    }
    pose(seconds);
    if (run.elapsed >= run.duration) { run.completed = true; clearPointer(); notify(); hooks.onComplete?.(status()); }
    else notify();
    return cues;
  }
  const down = event => {
    if (!inputActive() || event.button !== 0 || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId); event.preventDefault(); event.stopImmediatePropagation?.();
  };
  const move = event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (!inputActive()) { clearPointer(); return; }
    targetYaw = clamp(targetYaw - (event.clientX - pointer.x) * .004, -YAW_LIMIT, YAW_LIMIT);
    targetPitch = clamp(targetPitch - (event.clientY - pointer.y) * .003, -PITCH_LIMIT, PITCH_LIMIT);
    pointer.x = event.clientX; pointer.y = event.clientY;
    event.preventDefault(); event.stopImmediatePropagation?.();
  };
  const up = event => { if (pointer?.id === event.pointerId) { clearPointer(); event.stopImmediatePropagation?.(); } };
  const visibility = () => { if (active && globalThis.document?.hidden) api.setPaused(true); };
  for (const [name, listener] of [["pointerdown", down], ["pointermove", move], ["pointerup", up], ["pointercancel", up], ["lostpointercapture", up]]) canvas.addEventListener?.(name, listener, true);
  globalThis.document?.addEventListener("visibilitychange", visibility);
  const api = { camera, resize,
    get active() { return active; }, get status() { return status(); }, get run() { return run; },
    enter(nextOptions = {}) {
      if (disposed || !state.hayride?.purchased || !world()) return false;
      if (active) api.leave();
      const tier = HAYRIDE_TIERS.find(t => t.level === state.hayride.tier) ?? HAYRIDE_TIERS[0];
      options = { ...options, ...nextOptions };
      run = { tier: tier.level, elapsed: 0, duration: INTRO + HAYRIDE_PROPERTY.rideAlongSeconds, rideDuration: HAYRIDE_PROPERTY.rideAlongSeconds, progress: 0, paused: !!nextOptions.paused, completed: false, fired: new Set(), thunder: new Set(), cue: null };
      active = true; yaw = pitch = targetYaw = targetPitch = 0; clearPointer();
      world().setGentleMotion?.(!!options.gentle);
      const scene = world().scene;
      if (scene) { fogSave = scene.fog; backgroundSave = scene.background; scene.fog = new THREE.FogExp2(0x121828, .052); scene.background = new THREE.Color(0x0b0f19); }   // a thin blue fog: trees read as shapes, the far wood fades
      resize(); pose(0, true); notify(); return true;
    },
    leave() {
      if (!active) return;
      clearPointer(); const site = world(); site?.setPreview?.(null);
      site?.setLightning?.(0);
      site?.setGentleMotion?.(null);
      if (site?.scene) { site.scene.fog = fogSave; site.scene.background = backgroundSave; }
      active = false; run = null; fogSave = backgroundSave = null; notify();
    },
    // Real playback deliberately caps a long frame so the owner sees each set.
    // This clock never limits the authoritative farm's separate background dt.
    tick(dt) { return advance(Math.min(.1, Math.max(0, finite(dt)))); },
    setPaused(on = true) { if (!active || !run || run.completed) return false; const changed = run.paused !== !!on; run.paused = !!on; clearPointer(); pose(0, true); if (changed) notify(); return changed; },
    pause(on = true) { return api.setPaused(on); },
    start(nextOptions = {}) { return active && !run.completed ? api.setPaused(false) : api.enter(nextOptions); },
    restart(nextOptions = {}) { return api.enter({ ...options, paused: false, ...nextOptions }); },
    setOptions(next = {}) { options = { ...options, ...next }; if (active) world()?.setGentleMotion?.(!!options.gentle); pose(0, true); notify(); },
    setLook(nextYaw = 0, nextPitch = 0) { if (!inputActive()) return false; targetYaw = clamp(finite(nextYaw), -YAW_LIMIT, YAW_LIMIT); targetPitch = clamp(finite(nextPitch), -PITCH_LIMIT, PITCH_LIMIT); pose(0, true); return true; },
    advanceForTest(seconds) { const cues = advance(seconds); return { ...status(), cues }; },
    dispose() {
      if (disposed) return; api.leave(); disposed = true;
      for (const [name, listener] of [["pointerdown", down], ["pointermove", move], ["pointerup", up], ["pointercancel", up], ["lostpointercapture", up]]) canvas.removeEventListener?.(name, listener, true);
      globalThis.document?.removeEventListener("visibilitychange", visibility);
    },
  };
  resize(); return api;
}
