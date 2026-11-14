// Pace ordinary shadow requests by submitted pictures, not simulation ticks.
// Camera jumps and changes to the room or shadow target always refresh at once.
export function createVillageShadowBudget({ interval = 2, maxShift = .35 } = {}) {
  const records = new Map(), shiftSquared = maxShift * maxShift;
  let frame = 0, revision = 0;
  const stats = { frames: 0, requests: 0, refreshes: 0, deferred: 0, forced: 0, invalidations: 0 };
  const changed = (a, b) => !a || a.length !== b.length || a.some((value, i) => value !== b[i]);
  const moved = (a, b) => !a || (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 > shiftSquared;
  return {
    stats,
    beginFrame() { stats.frames = ++frame; },
    invalidate() { revision++; stats.invalidations++; },
    select(id, { requested, rendererPending = false, force = false, context = null, shape, position, target }) {
      let record = records.get(id);
      if (!record) { record = { frame: -Infinity, pending: false }; records.set(id, record); }
      if (requested) stats.requests++;
      record.pending ||= !!requested;
      const immediate = force || rendererPending || record.revision !== revision || record.context !== context || changed(record.shape, shape) || moved(record.position, position) || moved(record.target, target);
      const refresh = immediate || record.pending && frame - record.frame >= interval;
      if (refresh) {
        stats.refreshes++; if (immediate) stats.forced++;
        Object.assign(record, { frame, revision, context, shape: [...shape], position: [...position], target: [...target], pending: false });
      } else if (record.pending) stats.deferred++;
      return refresh;
    },
    clear() { records.clear(); },
  };
}
