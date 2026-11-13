import { directionalAngle, gaitPhase, BASE_OWNER_STRIDE } from "./directional-sprite-math.js";

// Transient movement history only. The same travelled distance drives the
// owners' autonomous and controlled gait; a wait never advances their feet.
export function ownerWalkMotion(previous, { dx = 0, dz = 0, moving = false, towardCamera = { x: 0, z: 1 } } = {}) {
  const distance = moving && Number.isFinite(dx) && Number.isFinite(dz) ? Math.hypot(dx, dz) : 0;
  const heading = distance > 1e-6 ? { x: dx / distance, z: dz / distance } : previous?.heading ?? { x: 0, z: 1 };
  const travelled = (Number.isFinite(previous?.distance) ? previous.distance : 0) + distance, angle = directionalAngle(heading, towardCamera, previous?.angle ?? 0);
  const across = Math.sin(angle), away = -Math.cos(angle), facing = Math.abs(across) > Math.abs(away) * .75 ? "side" : away > 0 ? "back" : "front";
  return { heading, distance: travelled, angle, phase: gaitPhase(travelled, BASE_OWNER_STRIDE), across, facing, moving: distance > 1e-6 };
}

// The caller excludes controlled/resting actors. Release the atlas just once
// at a stop, so subsequent idle or furniture poses keep their own textures.
export function animateAutonomousOwner(data, { time = 0, ...options } = {}) {
  if (data?.kind !== "person" || typeof data.playerAnimate !== "function") return false;
  const motion = ownerWalkMotion(data.autonomousWalk, options); data.autonomousWalk = motion;
  if (motion.moving) {
    data.playerAnimate({ walking: true, moving: true, facing: motion.facing, angle: motion.angle, phase: motion.phase, dx: motion.across, age: motion.distance / 2.3, time });
    data.autonomousDirectionActive = true; return true;
  }
  if (data.autonomousDirectionActive) {
    data.playerAnimate({ walking: false, facing: "front", release: true, time, age: time }); data.autonomousDirectionActive = false;
  }
  return false;
}
