var characterTravel = { speed: 68, stride: 48, frames: 6, workSeconds: 0.65, maxPending: 3 };
var home = (side) => ({ x: side ? 690 : 300, y: 350 });
function createFarmActors() {
  return [0, 1].map((side) => {
    const point = home(side);
    return { ...point, tx: point.x, ty: point.y, side, action: 0, task: null, pending: [], distance: 0, walking: false };
  });
}
function resetFarmActors(actors) {
  for (const [i, fresh3] of createFarmActors().entries()) Object.assign(actors[i], fresh3);
}
function beginTask(actor, task) {
  actor.task = task.plot;
  actor.tx = task.x;
  actor.ty = task.y;
  actor.action = characterTravel.workSeconds;
}
function queueFarmTask(actors, plot, positions) {
  if (!Number.isInteger(plot) || !positions[plot]) return false;
  const actor = actors[plot % 2], position = positions[plot];
  if (actor.task === plot || actor.pending.some((task2) => task2.plot === plot)) return false;
  const task = { plot, x: position.x + (actor.side ? 44 : -44), y: position.y + 24 };
  if (actor.task === null) beginTask(actor, task);
  else if (actor.pending.length < characterTravel.maxPending) actor.pending.push(task);
  else actor.pending[actor.pending.length - 1] = task;
  return true;
}
function advanceFarmActors(actors, dt, paused = false) {
  if (paused || !Number.isFinite(dt) || dt <= 0) return;
  for (const actor of actors) {
    let remaining = dt;
    actor.walking = false;
    for (let guard = 0; guard < 12 && remaining > 1e-9; guard++) {
      const dx = actor.tx - actor.x, dy = actor.ty - actor.y, distance = Math.hypot(dx, dy);
      if (distance > 1e-7) {
        const moved = Math.min(distance, characterTravel.speed * remaining);
        actor.x += dx / distance * moved;
        actor.y += dy / distance * moved;
        actor.distance += moved;
        remaining = Math.max(0, remaining - moved / characterTravel.speed);
        if (moved < distance) {
          actor.walking = true;
          break;
        }
        actor.x = actor.tx;
        actor.y = actor.ty;
      }
      if (actor.task !== null) {
        const held = Math.min(remaining, actor.action);
        actor.action -= held;
        remaining -= held;
        if (actor.action > 1e-9) break;
        const next = actor.pending.shift();
        if (next) beginTask(actor, next);
        else {
          actor.task = null;
          const point = home(actor.side);
          actor.tx = point.x;
          actor.ty = point.y;
        }
      } else break;
    }
  }
}
function characterWalkFrame(actor, reduced = false) {
  return reduced ? 0 : Math.floor(actor.distance % characterTravel.stride / characterTravel.stride * characterTravel.frames);
}

export { advanceFarmActors, characterWalkFrame, createFarmActors, queueFarmTask, resetFarmActors };
