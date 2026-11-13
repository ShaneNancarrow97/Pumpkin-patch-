// Transient camera motion only: never part of a farm or village save.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
export const wrapFollowAngle = angle => Math.atan2(Math.sin(finite(angle)), Math.cos(finite(angle)));
export function behindHeading(heading, fallback = 0) {
  const x = finite(heading?.x), z = finite(heading?.z);
  return Math.hypot(x, z) > .001 ? Math.atan2(-x, -z) : wrapFollowAngle(fallback);
}

// Integrate a linearly moving subject exactly, avoiding a different trailing
// distance at 30/60/120Hz. A teleport starts a fresh track rather than a flyover.
export function followTargetStep(current, previous, next, dt, rate = 12) {
  const t = clamp(finite(dt), 0, .25), jump = Math.hypot(next.x - previous.x, next.y - previous.y, next.z - previous.z);
  if (jump > 24) return { ...next };
  if (!t) return { ...current };
  rate = Math.max(.1, finite(rate, 12));
  const fade = Math.exp(-rate * t), out = {};
  for (const axis of ["x", "y", "z"]) {
    const velocity = (next[axis] - previous[axis]) / t, lag = velocity / rate;
    out[axis] = next[axis] - lag + (current[axis] - previous[axis] + lag) * fade;
  }
  return out;
}

// Orbit remains centred on the owner. Camera-relative steering must not feed
// back into automatic yaw: holding left/right would otherwise make a spiral.
export function createFollowCameraRig(options = {}) {
  const config = { pitch: .46, distance: 6.8, minDistance: 4.8, maxDistance: 13,
    minPitch: Math.PI * 20 / 180, maxPitch: Math.PI * 62 / 180,
    targetHeight: 1.3, positionRate: 12, orbitRate: 15, yawLimit: Infinity, ...options };
  let ready = false, target = { x: 0, y: config.targetHeight, z: 0 }, previous = { ...target };
  let yaw = 0, pitch = config.pitch, distance = config.distance, wantedYaw = yaw, wantedPitch = pitch, wantedDistance = distance, freeLook = 0;
  const boundYaw = value => Number.isFinite(config.yawLimit) ? clamp(finite(value), -config.yawLimit, config.yawLimit) : wrapFollowAngle(value);
  const goal = pos => ({ x: finite(pos?.x), y: finite(pos?.y) + config.targetHeight, z: finite(pos?.z) });
  const api = {
    reset(pos, { heading, yaw: angle, pitch: elevation = config.pitch, distance: reach = config.distance } = {}) {
      ready = true; target = goal(pos); previous = { ...target };
      yaw = wantedYaw = boundYaw(angle === undefined ? behindHeading(heading) : angle);
      pitch = wantedPitch = clamp(finite(elevation, config.pitch), config.minPitch, config.maxPitch);
      distance = wantedDistance = clamp(finite(reach, config.distance), config.minDistance, config.maxDistance); freeLook = 0;
      return api.state;
    },
    recenter(heading) { wantedYaw = boundYaw(behindHeading(heading, wantedYaw)); wantedPitch = config.pitch; freeLook = 0; },
    orbit(horizontal, vertical) {
      if (!horizontal && !vertical) return;
      wantedYaw = boundYaw(wantedYaw + finite(horizontal));
      wantedPitch = clamp(wantedPitch + finite(vertical), config.minPitch, config.maxPitch); freeLook = .9;
    },
    look(x, y, dt) {
      const t = clamp(finite(dt), 0, .25);
      api.orbit(clamp(finite(x), -1, 1) * t * 1.65, clamp(finite(y), -1, 1) * t * .85);
    },
    zoom(factor) { if (Number.isFinite(factor) && factor > 0) wantedDistance = clamp(wantedDistance / factor, config.minDistance, config.maxDistance); },
    setDistance(value) { wantedDistance = clamp(finite(value, wantedDistance), config.minDistance, config.maxDistance); },
    panTarget(dx, dz) { target.x += finite(dx); target.z += finite(dz); },
    step(pos, dt, { heading, moving = false, worldDirected = false, holdTarget = false } = {}) {
      if (!ready) api.reset(pos, { heading });
      const t = clamp(finite(dt), 0, .25), next = goal(pos); freeLook = Math.max(0, freeLook - t);
      if (moving && worldDirected && !freeLook) wantedYaw = boundYaw(behindHeading(heading, wantedYaw));
      const k = 1 - Math.exp(-t * config.orbitRate);
      yaw = wrapFollowAngle(yaw + wrapFollowAngle(wantedYaw - yaw) * k);
      pitch += (wantedPitch - pitch) * k; distance += (wantedDistance - distance) * k;
      if (!holdTarget) { target = followTargetStep(target, previous, next, t, config.positionRate); previous = next; }
      return api.state;
    },
    get state() { return { ready, target: { ...target }, yaw, pitch, distance, wantedYaw, wantedPitch, wantedDistance, freeLook }; },
  };
  return api;
}

export function followCameraPose({ target, yaw, pitch, distance }) {
  const horizontal = Math.cos(pitch) * distance;
  return { target: { ...target }, position: { x: target.x + Math.sin(yaw) * horizontal,
    y: target.y + Math.sin(pitch) * distance, z: target.z + Math.cos(yaw) * horizontal } };
}
