import { createIdleBreakClock, idlePadInUse } from '../idle-break.js';

// A quiet countdown over every scene. No idle state is stored in the save.
export function createIdleBreak({ state, onPause, onResume, now, target = window, doc = document, getPads = () => navigator.getGamepads?.() ?? [] }) {
  const clock = createIdleBreakClock(now), element = doc.getElementById('idle-break');
  const title = doc.getElementById('idle-break-title'), timer = doc.getElementById('idle-break-time'), copy = doc.getElementById('idle-break-copy'), resume = doc.getElementById('idle-break-resume'), announcement = doc.getElementById('idle-break-announcement');
  const pointers = new Set(), keys = new Set(), listeners = [];
  let signature = '';
  function draw() {
    const { phase, remaining } = clock.status, next = phase + (phase === 'warning' ? remaining : '');
    if (signature === next) return;
    const changed = element.dataset.phase !== phase;
    signature = next; element.hidden = phase === 'active'; element.dataset.phase = phase;
    if (element.hidden) return;
    const paused = phase === 'paused';
    timer.hidden = paused; timer.textContent = `0:${String(remaining).padStart(2, '0')}`;
    if (changed) {
      title.textContent = paused ? 'Tea break' : 'Pausing in';
      announcement.textContent = paused ? 'Game paused.' : 'The game will pause in 30 seconds.';
      copy.textContent = paused ? 'Paused after 3½ minutes away. Tap or press a button to resume.' : 'Tap or press a button to keep playing.';
    }
    resume.hidden = !paused;
  }
  function activity() {
    if (clock.activity(state().paused)) { state().paused = false; onResume?.(); }
    draw();
  }
  const listen = (type, handler) => { target.addEventListener(type, handler, { capture: true, passive: true }); listeners.push([type, handler]); };
  listen('pointerdown', e => { pointers.add(e.pointerId); activity(); });
  listen('pointerup', e => { pointers.delete(e.pointerId); activity(); });
  listen('pointercancel', e => pointers.delete(e.pointerId));
  listen('pointermove', activity); listen('wheel', activity); listen('click', activity);
  listen('keydown', e => { keys.add(e.code ?? e.key); activity(); });
  listen('keyup', e => { keys.delete(e.code ?? e.key); activity(); });
  const clearHeld = () => { pointers.clear(); keys.clear(); };
  listen('blur', clearHeld);
  const visibility = () => { if (doc.hidden) clearHeld(); };
  doc.addEventListener('visibilitychange', visibility);
  resume.addEventListener('click', activity);
  draw();
  return {
    get status() { return clock.status; },
    tick() {
      const busy = !doc.hidden && (pointers.size > 0 || keys.size > 0 || idlePadInUse(getPads()));
      const result = clock.tick(state().paused, busy);
      if (result.resume) { state().paused = false; onResume?.(); }
      if (result.pause) { state().paused = true; onPause?.(); }
      draw();
    },
    dispose() {
      for (const [type, handler] of listeners) target.removeEventListener(type, handler, true);
      doc.removeEventListener('visibilitychange', visibility); resume.removeEventListener('click', activity);
      clearHeld(); element.hidden = true;
    },
  };
}
