// Ambient farm news waits while the player explores. Never defer a direct
// response to a tap, a collectable reward, or the automatic break warning.
export function createDeferredFarmNews({ now = () => performance.now(), maxAge = 45000, capacity = 3 } = {}) {
  const pending = new Map();
  return {
    add(text, kind = "") {
      const key = kind || text;
      pending.delete(key); pending.set(key, { text, kind, at: now() });
      while (pending.size > capacity) pending.delete(pending.keys().next().value);
    },
    take() {
      const at = now(), rows = [...pending.values()].filter(row => at - row.at <= maxAge && at >= row.at);
      pending.clear(); return rows.map(({ text, kind }) => ({ text, kind }));
    },
    clear() { pending.clear(); },
  };
}
