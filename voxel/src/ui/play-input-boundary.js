// A travel/mode boundary must wait for a held control to be released. The
// gamepad API keeps reporting it even while another scene owns the input.
const finite = n => Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
const held = button => !!button?.pressed || (button?.value ?? 0) > .5;
const neutral = (axes, start) => Math.hypot(finite(axes?.[start]), finite(axes?.[start + 1])) <= .18;
export function createPlayPadBoundary() {
  let identity = null, last = null, previous = [], suppressed = new Set(), moveBlocked = false, lookBlocked = false;
  function release(pad = last) {
    const down = Array.from(pad?.buttons ?? [], held);
    suppressed = new Set(down.flatMap((value, i) => value ? [i] : [])); previous = down.map(() => false);
    moveBlocked = lookBlocked = true;
  }
  return {
    release,
    sample(raw) {
      if (!raw || raw.connected === false) { identity = null; last = null; previous = []; suppressed.clear(); moveBlocked = lookBlocked = false; return { pad: null, down: [], pressed: () => false }; }
      const key = `${raw.index ?? 0}:${raw.id ?? "pad"}`; last = raw;
      if (identity !== key) { identity = key; release(raw); }
      const rawDown = Array.from(raw.buttons ?? [], held);
      for (const i of suppressed) if (!rawDown[i]) suppressed.delete(i);
      const down = rawDown.map((value, i) => value && !suppressed.has(i)), edges = down.map((value, i) => value && !previous[i]); previous = down.slice();
      if (neutral(raw.axes, 0)) moveBlocked = false;
      if (neutral(raw.axes, 2)) lookBlocked = false;
      const axes = Array.from({ length: 4 }, (_, i) => (i < 2 ? moveBlocked : lookBlocked) ? 0 : finite(raw.axes?.[i]));
      const pad = { id: raw.id, index: raw.index, connected: raw.connected, mapping: raw.mapping, axes,
        buttons: Array.from(raw.buttons ?? [], (button, i) => ({ pressed: down[i], touched: !!button.touched, value: down[i] ? button.value ?? 1 : 0 })), vibrationActuator: raw.vibrationActuator };
      return { pad, down, pressed: i => !!edges[i] };
    },
    get state() { return { moveBlocked, lookBlocked, suppressed: [...suppressed], connected: identity !== null }; },
  };
}

// Camera inspection is a pad owner of its own: its exit press cannot also
// interact, go back, move an owner or bring up the thumbstick cursor.
export function createFarmCameraMode() {
  let active = false;
  return {
    get active() { return active; },
    reset() { const was = active; active = false; return was; },
    toggle() { active = !active; return active; },
    update({ eligible = false, pressed = () => false } = {}) {
      const was = active;
      if (!eligible) active = false;
      else if (pressed(11) || active && pressed(1)) active = !active;
      return { active, changed: active !== was, consumed: was || active };
    },
  };
}
