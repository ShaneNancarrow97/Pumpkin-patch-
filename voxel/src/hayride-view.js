import * as THREE from "three";
import { HAYRIDE_PROPERTY, HAYRIDE_TIERS } from "./content/hayride.js";
import { HAYRIDE_STOPS, hayrideStops, hayrideRouteLength, HAYRIDE_ROUTE_LENGTH } from "./content/hayride-layout.js";
import { HAYRIDE_LIGHTNING_TIMES, hayrideLightning } from "./content/hayride-weather.js";

const INTRO = 2.5, YAW_LIMIT = Math.PI * .48, PITCH_LIMIT = Math.PI / 7;
// Roots cross the lane this far apart (buildRideLand lays them; the camera jolts over them).
export const RUT_GAP = 13.3;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
const sounds = { scarecrows: "knock", spiders: "skitter", bride: "whisper", pursuit: "whoosh", bus: "chains", graveyard: "whisper", thicket: "knock" };
const finite = n => Number.isFinite(n) ? n : 0;

// A free owner camera in a separate off-map scene, using the existing renderer.
// Autonomous guests, wallets and receipts keep their authoritative farm rules.
export function createHayrideView(canvas, state, hooks = {}) {
  const camera = new THREE.PerspectiveCamera(68, 1, .045, 48); camera.rotation.order = "YXZ";   // the fog hides all beyond 40 units, so nothing further is drawn
  let active = false, run = null, pointer = null, disposed = false, yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0;
  let options = { gentle: !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches, lightning: true }, fogSave = null, backgroundSave = null;
  // The ride's motion: a jolt and a punch-in when a scare fires, a lean into bends.
  let shake = 0, kick = 0, roll = 0, lastHeading = null, baseFov = 68;
  const point = new THREE.Vector3(), target = new THREE.Vector3(), base = new THREE.Euler(0, 0, 0, "YXZ");
  const world = () => typeof hooks.world === "function" ? hooks.world() : hooks.world;
  const inputActive = () => active && run && !run.paused && !run.completed && !hooks.blocked?.();
  const status = () => ({
    active, title: "The Hollow Hayride", tier: run?.tier ?? 0, elapsed: run?.elapsed ?? 0, duration: run?.duration ?? 0,
    rideDuration: run?.rideDuration ?? HAYRIDE_PROPERTY.rideAlongSeconds, progress: run?.progress ?? 0, paused: !!run?.paused, completed: !!run?.completed,
    zoneName: !run ? "The Hollow Hayride" : run.elapsed < INTRO ? "Rear boarding" : [...(run.stops??HAYRIDE_STOPS)].reverse().find(stop => run.progress >= stop.at - .06)?.name ?? "Into the woods",
    eventsFired: [...(run?.fired ?? [])], currentCue: run?.cue && run.elapsed - run.cue.at < 2.7 ? { ...run.cue } : null,
    gentle: !!options.gentle, lightning: options.lightning !== false, lightningIntensity: run ? hayrideLightning(run.elapsed, { ...options, paused: run.paused || run.completed }) : 0,
    lookYaw: yaw, lookPitch: pitch, lookBounds: { yaw: YAW_LIMIT, pitch: PITCH_LIMIT }, inputActive: !!inputActive(),
    camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: camera.rotation.y, pitch: camera.rotation.x },
  });
  const notify = () => hooks.onState?.(status());
  const clearPointer = () => { const old = pointer; pointer = null; if (old) try { canvas.releasePointerCapture?.(old.id); } catch {} };
  const resize = () => {
    camera.aspect = Math.max(1, canvas.clientWidth || canvas.width || 1) / Math.max(1, canvas.clientHeight || canvas.height || 1);
    baseFov = camera.aspect < .8 ? 76 : 68; camera.fov = baseFov; camera.updateProjectionMatrix();
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
    // A wagon on a forest track: the wheels find ruts and roots (a jolt every
    // 13.3 units, where buildRideLand lays a root across the lane), the bench
    // rocks, and the whole wagon leans into each bend. Gentle mode rides smooth.
    const moving = !options.gentle && run.elapsed >= INTRO && !run.paused, d = run.progress * (run.length ?? HAYRIDE_ROUTE_LENGTH);
    let nod = 0, drift = 0, sx = 0, sy = 0;
    if (moving) {
      const root = ((d % RUT_GAP) + RUT_GAP) % RUT_GAP, jolt = root < .45 ? Math.sin(root / .45 * Math.PI) : 0;
      point.y += Math.sin(d * 2.3) * .014 + Math.sin(d * 5.7 + 1) * .007 + jolt * .06;
      nod = Math.sin(d * 2.3 + .6) * .006 - jolt * .02;
      if (dt > 0 && lastHeading !== null) { const turn = Math.atan2(Math.sin(heading - lastHeading), Math.cos(heading - lastHeading)) / Math.max(1e-3, dt); roll += (clamp(-turn * .05, -.06, .06) + Math.sin(d * 1.7) * .006 - roll) * (1 - Math.exp(-dt * 3)); }
      // Nobody stares dead ahead in a dark wood: the eyes wander a little.
      if (Math.abs(targetYaw) < .06 && Math.abs(targetPitch) < .06) drift = Math.sin(run.elapsed * .23) * .02 + Math.sin(run.elapsed * .11 + 1) * .012;
      shake *= Math.exp(-Math.max(0, dt) * 2.6); kick *= Math.exp(-Math.max(0, dt) * 3.2);
      sx = (Math.sin(run.elapsed * 37) + Math.sin(run.elapsed * 23 + 2)) * .012 * shake; sy = (Math.sin(run.elapsed * 31 + 1) + Math.sin(run.elapsed * 19)) * .014 * shake;
    } else { roll *= .8; shake = kick = 0; }
    lastHeading = heading;
    const fov = baseFov - kick * 7;
    if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
    const blend = snap ? 1 : 1 - Math.exp(-Math.max(0, dt) * 9);
    yaw += (targetYaw - yaw) * blend; pitch += (targetPitch - pitch) * blend;
    camera.position.copy(point); camera.lookAt(target); base.setFromQuaternion(camera.quaternion, "YXZ");
    camera.rotation.set(base.x + pitch + nod + sx, base.y + yaw + drift + sy, roll, "YXZ"); camera.updateMatrixWorld(true);
  }
  function advance(seconds) {
    if (!active || !run || run.paused || run.completed) return [];
    run.elapsed = Math.min(run.duration, run.elapsed + Math.max(0, finite(seconds)));
    run.progress = clamp((run.elapsed - INTRO) / run.rideDuration, 0, 1);
    const cues = [];
    for (const stop of run.stops??HAYRIDE_STOPS) {
      if (run.progress < stop.at || run.fired.has(stop.id)) continue;
      run.fired.add(stop.id);
      const cue = { type: "encounter", id: `hayride-${stop.id}`, stop: stop.id, name: stop.name, sound: sounds[stop.id], at: INTRO + stop.at * run.rideDuration, intensity: options.gentle ? .25 : .45 };
      run.cue = cue; cues.push(cue); hooks.onCue?.(cue);
      if (!options.gentle) { shake = 1; kick = 1; }
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
      const rideDuration=HAYRIDE_PROPERTY.rideAlongSeconds*hayrideRouteLength(state)/HAYRIDE_ROUTE_LENGTH;
      shake = kick = roll = 0; lastHeading = null;
      run = { length: hayrideRouteLength(state), stops:hayrideStops(state), tier: tier.level, elapsed: 0, duration: INTRO + rideDuration, rideDuration, progress: 0, paused: !!nextOptions.paused, completed: false, fired: new Set(), thunder: new Set(), cue: null };
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
