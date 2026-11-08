// Mothlight's input boundary: two fingers can walk and look together, while
// the controller takes over only when it is used. Camera and game actions
// remain with the caller; a connected, idle pad never hides touch controls.
import { nearestInDirection, choiceKey } from "./pad-menu.js";

const ZERO = () => ({ x: 0, y: 0 });
const finite = value => Number.isFinite(value) ? value : 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const CHOICES = 'button:not(:disabled),a[href],summary,select:not(:disabled),input:not(:disabled):not([type="hidden"]),[tabindex]:not([tabindex="-1"])';
const downAt = (g, i) => !!g?.buttons?.[i]?.pressed || (g?.buttons?.[i]?.value ?? 0) > .5;

// A radial dead zone removes stick drift without making diagonals faster.
export function normaliseVillageStick(x, y, dead = .18) {
  x = clamp(finite(x), -1, 1); y = clamp(finite(y), -1, 1);
  const length = Math.hypot(x, y);
  if (length <= dead) return ZERO();
  const strength = Math.min(1, (length - dead) / (1 - dead));
  return { x: x / length * strength, y: y / length * strength };
}

// Pure pad state makes unplugging, a changed controller and held buttons on
// reconnect safe. A released menu cannot inherit an already-held stick.
export function createVillagePadState() {
  let identity = null, previous = [], suppressed = new Set(), stopMove = false, stopLook = false;
  const idOf = g => `${g.index ?? 0}:${g.id ?? "pad"}`;
  const activity = g => Math.hypot(...(g.axes ?? []).slice(0, 2)) > .2 || Math.hypot(...(g.axes ?? []).slice(2, 4)) > .2 || (g.buttons ?? []).some((_, i) => downAt(g, i));
  return {
    sample(gamepads = []) {
      const all = Array.from(gamepads).filter(g => g && g.connected !== false);
      const current = all.find(g => idOf(g) === identity);
      const g = current && activity(current) ? current : all.find(activity) ?? current ?? all[0];
      if (!g) {
        const disconnected = identity !== null;
        identity = null; previous = []; suppressed.clear(); stopMove = stopLook = false;
        return { pad: null, move: ZERO(), look: ZERO(), sprint: false, active: false, disconnected };
      }
      const down = Array.from(g.buttons ?? [], (_, i) => downAt(g, i));
      const changed = idOf(g) !== identity;
      if (changed) {
        identity = idOf(g); previous = down.slice(); suppressed = new Set(down.flatMap((value, i) => value ? [i] : []));
        stopMove = Math.hypot(finite(g.axes?.[0]), finite(g.axes?.[1])) > .18;
        stopLook = Math.hypot(finite(g.axes?.[2]), finite(g.axes?.[3])) > .18;
      }
      for (const i of suppressed) if (!down[i]) suppressed.delete(i);
      const edges = down.map((value, i) => value && !previous[i] && !suppressed.has(i));
      previous = down.slice();
      let move = normaliseVillageStick(g.axes?.[0], g.axes?.[1]), look = normaliseVillageStick(g.axes?.[2], g.axes?.[3]);
      if (!move.x && !move.y) stopMove = false;
      if (!look.x && !look.y) stopLook = false;
      if (stopMove) move = ZERO();
      if (stopLook) look = ZERO();
      const allowed = down.map((value, i) => value && !suppressed.has(i));
      const active = edges.some(Boolean) || Math.hypot(move.x, move.y, look.x, look.y) > 0;
      return { pad: { g, down: allowed, pressed: i => !!edges[i], active, move, look }, move, look, sprint: !!allowed[7], active, disconnected: false };
    },
    release() { stopMove = stopLook = true; previous.forEach((value, i) => { if (value) suppressed.add(i); }); },
    releaseMovement() { stopMove = stopLook = true; },
    reset() { identity = null; previous = []; suppressed.clear(); stopMove = stopLook = false; },
  };
}

// Repeat follows elapsed time rather than rendered frames, including TVs
// drawing fewer frames while a menu is open.
export function createVillageRepeat(first = 360, repeat = 130) {
  let direction = "", next = 0;
  return {
    step(want, now) {
      if (!want) { direction = ""; next = 0; return false; }
      if (want !== direction) { direction = want; next = now + first; return true; }
      if (now < next) return false;
      next = now + repeat; return true;
    },
    clear() { direction = ""; next = 0; },
  };
}

export function createVillageControls({ root, blocked = () => false, onRelease = () => {}, onSourceChange = () => {}, gamepads = () => navigator.getGamepads?.() ?? [], now = () => performance.now() } = {}) {
  if (!root) throw new TypeError("Village controls need their village root.");
  const doc = root.ownerDocument, win = doc.defaultView, cleanup = [], made = [];
  const listen = (target, type, handler, options) => { target.addEventListener(type, handler, options); cleanup.push(() => target.removeEventListener(type, handler, options)); };
  const make = (tag, id, className, parent = root) => { const el = doc.createElement(tag); if (id) el.id = id; el.className = className; parent.append(el); made.push(el); return el; };
  const padState = createVillagePadState(), repeating = createVillageRepeat();
  let source = win.matchMedia?.("(any-pointer: coarse)").matches ? "touch" : "keyboard", suspended = false, forcedBlock = false, wasBlocked = false, sprint = false;
  let menu = null, ring = null, lastKey = null, lastMenuTime = now(), disposed = false;
  const sticks = [];
  const legend = make("div", "vg-pad-legend", "vg-pad-legend");
  legend.setAttribute("aria-label", "Controller controls");
  legend.innerHTML = '<span class="vg-pad-world"><b>LS</b> Walk <b>RS</b> Look</span><span><b>✕</b> <em>Interact</em></span><span><b>○</b> Back</span><span class="vg-pad-world vg-pad-extra"><b>R2</b> Jog</span><span><b>Options</b> Menu</span>';
  legend.hidden = true;
  const jog = make("button", "vg-jog", "vg-jog"); jog.type = "button"; jog.textContent = "Jog"; jog.setAttribute("aria-label", "Toggle jogging"); jog.setAttribute("aria-pressed", "false");
  listen(jog, "click", () => { if (isBlocked()) return; setSource("touch"); sprint = !sprint; jog.setAttribute("aria-pressed", String(sprint)); });

  function setRing(el) { if (ring !== el) { ring?.removeAttribute("data-pad-focus"); ring = el; el?.setAttribute("data-pad-focus", ""); } }
  function setSource(value) {
    if (source !== value) { source = value; onSourceChange(value); }
    root.dataset.input = value; root.classList.toggle("vg-input-pad", value === "pad");
    legend.hidden = value !== "pad";
    if (value !== "pad") setRing(null);
  }
  function isBlocked() { return disposed || suspended || forcedBlock || root.hidden || blocked(); }
  // Only the pointer owning a stick can release it. Releasing the other
  // thumb, or a camera button, must not stop an ongoing walk.
  function releaseStick(stick) {
    const id = stick.id; stick.id = null; stick.value = ZERO(); stick.knob.style.transform = ""; stick.zone.classList.remove("is-held");
    if (id !== null && stick.zone.hasPointerCapture?.(id)) try { stick.zone.releasePointerCapture(id); } catch { /* A cancelled pointer may already have gone. */ }
  }
  function clearTouch() { sticks.forEach(releaseStick); sprint = false; jog.setAttribute("aria-pressed", "false"); }
  function clear() { clearTouch(); repeating.clear(); menu = null; lastKey = null; setRing(null); }
  function release() { clear(); padState.release(); onRelease(); }
  function stickControl(kind) {
    const move = kind === "move", zoneId = move ? "vg-stick-zone" : "vg-look-zone", discId = move ? "vg-stick" : "vg-look-stick";
    const zone = root.querySelector(`#${zoneId}`) ?? make("div", zoneId, "vg-thumb-zone");
    zone.classList.add("vg-thumb-zone", move ? "vg-move-zone" : "vg-look-zone"); zone.setAttribute("role", "group"); zone.setAttribute("aria-label", move ? "Movement thumbstick: drag to walk" : "Camera thumbstick: drag to look");
    const disc = zone.querySelector(`#${discId}`) ?? make("div", discId, "vg-thumb-disc", zone);
    disc.classList.add("vg-thumb-disc"); disc.hidden = false; disc.setAttribute("aria-hidden", "true");
    if (!disc.querySelector("i")) disc.innerHTML = "<i></i>";
    const label = make("span", "", "vg-thumb-label", zone); label.textContent = move ? "Move" : "Look"; label.setAttribute("aria-hidden", "true");
    const stick = { zone, disc, knob: disc.querySelector("i"), id: null, value: ZERO(), cx: 0, cy: 0, radius: 1, scale: 1 };
    sticks.push(stick);
    const update = event => {
      const x = (event.clientX - stick.cx) / stick.radius, y = (event.clientY - stick.cy) / stick.radius;
      const length = Math.max(1, Math.hypot(x, y)), travel = stick.radius / stick.scale;
      stick.value = normaliseVillageStick(x / length, y / length, .05);
      stick.knob.style.transform = `translate(${x / length * travel}px,${y / length * travel}px)`;
    };
    listen(zone, "pointerdown", event => {
      if (isBlocked() || stick.id !== null || event.button > 0) return;
      event.preventDefault(); event.stopPropagation(); setSource("touch"); padState.release();
      const box = disc.getBoundingClientRect(); stick.cx = box.left + box.width / 2; stick.cy = box.top + box.height / 2;
      stick.scale = box.width / (disc.offsetWidth || box.width) || 1; stick.radius = Math.max(1, box.width * .32); stick.id = event.pointerId;
      zone.classList.add("is-held"); try { zone.setPointerCapture(event.pointerId); } catch { /* Synthetic input has no browser capture. */ }
      update(event);
    });
    listen(zone, "pointermove", event => { if (event.pointerId !== stick.id) return; event.preventDefault(); update(event); });
    const up = event => { if (event.pointerId === stick.id) releaseStick(stick); };
    listen(zone, "pointerup", up); listen(zone, "pointercancel", up); listen(zone, "lostpointercapture", up);
    return stick;
  }
  const moveStick = stickControl("move"), lookStick = stickControl("look");
  listen(win, "blur", () => { suspended = true; release(); });
  listen(win, "focus", () => { suspended = false; });
  listen(doc, "visibilitychange", () => { suspended = doc.hidden; if (suspended) release(); });
  listen(win, "resize", release);
  if (win.visualViewport) listen(win.visualViewport, "resize", release);
  listen(win, "gamepaddisconnected", () => { release(); padState.reset(); if (source === "pad") setSource(win.matchMedia?.("(any-pointer: coarse)").matches ? "touch" : "keyboard"); });
  listen(doc, "pointerdown", event => {
    if (root.hidden) return;
    setSource(event.pointerType === "touch" || event.pointerType === "pen" ? "touch" : "pointer"); padState.release();
  }, true);
  listen(win, "keydown", () => { if (!root.hidden) { setSource("keyboard"); padState.release(); } }, true);
  setSource(source);

  // Scroll distances use a surface's own pixels, including TV CSS zoom.
  function scrollBox(surface, choice) {
    for (let el = choice?.parentElement; el && surface.contains(el); el = el.parentElement) if (/(auto|scroll)/.test(win.getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 2) return el;
    return [surface, ...surface.querySelectorAll('#vg-panel-body,.village-dialogue-body,[data-vg-scroll]')].find(el => el.scrollHeight > el.clientHeight + 2) ?? null;
  }
  function reveal(surface, el) {
    const box = scrollBox(surface, el); if (!box) return;
    const b = box.getBoundingClientRect(), r = el.getBoundingClientRect(), scale = b.height / (box.offsetHeight || b.height) || 1;
    const delta = r.top < b.top + 12 ? r.top - b.top - 12 : r.bottom > b.bottom - 12 ? r.bottom - b.bottom + 12 : 0;
    if (delta) box.scrollTop += delta / scale;
  }
  function focus(surface, el, scroll = true) {
    if (!el) return;
    el.focus({ preventScroll: true }); setRing(el); lastKey = JSON.stringify(choiceKey(el)); if (scroll) reveal(surface, el);
  }
  function nudge(el, direction) {
    if (el?.tagName === "SELECT") {
      let i = el.selectedIndex + direction;
      while (el.options[i]?.disabled || el.options[i]?.parentElement?.disabled) i += direction;
      if (!el.options[i]) return false;
      el.selectedIndex = i; el.dispatchEvent(new win.Event("input", { bubbles: true })); el.dispatchEvent(new win.Event("change", { bubbles: true })); return true;
    }
    if (el?.matches('input[type="range"]')) {
      const before = el.value;
      try { direction > 0 ? el.stepUp() : el.stepDown(); } catch { return false; }
      if (el.value !== before) { el.dispatchEvent(new win.Event("input", { bubbles: true })); el.dispatchEvent(new win.Event("change", { bubbles: true })); }
      return true;
    }
    return false;
  }
  function handleMenu(surface, pad) {
    if (!surface || surface.hidden || !pad || suspended) return false;
    if (pad.active) setSource("pad");
    if (source !== "pad") return false;
    const time = now(), dt = Math.min(.1, Math.max(0, (time - lastMenuTime) / 1000)); lastMenuTime = time;
    const usable = el => !el.closest('[hidden],[inert]') && el.getClientRects().length && win.getComputedStyle(el).visibility !== "hidden" && !el.hasAttribute("data-pad-skip");
    const choices = [...surface.querySelectorAll(CHOICES)].filter(usable);
    const first = () => choices.find(el => el.hasAttribute("data-pad-default")) ?? choices.find(el => !el.matches('[aria-label^="Close"],.village-close,[data-voice-toggle],[data-voice-replay]')) ?? choices[0];
    let current = choices.includes(doc.activeElement) ? doc.activeElement : null;
    if (menu !== surface) { menu = surface; repeating.clear(); lastKey = null; current = first(); focus(surface, current); }
    else if (!current) { current = choices.find(el => JSON.stringify(choiceKey(el)) === lastKey) ?? first(); focus(surface, current); }
    else setRing(current);
    const down = pad.down ?? Array.from(pad.g.buttons ?? [], (_, i) => downAt(pad.g, i));
    const move = pad.move ?? normaliseVillageStick(pad.g.axes?.[0], pad.g.axes?.[1]);
    const axis = Math.hypot(move.x, move.y) > .4 ? Math.abs(move.x) > Math.abs(move.y) ? move.x > 0 ? "right" : "left" : move.y > 0 ? "down" : "up" : "";
    const direction = down[12] ? "up" : down[13] ? "down" : down[14] ? "left" : down[15] ? "right" : axis;
    if (repeating.step(direction, time)) {
      const dx = direction === "left" ? -1 : direction === "right" ? 1 : 0, dy = direction === "up" ? -1 : direction === "down" ? 1 : 0;
      if (!dx || !nudge(current, dx)) {
        const others = choices.filter(el => el !== current), index = current ? nearestInDirection(current.getBoundingClientRect(), others.map(el => el.getBoundingClientRect()), dx, dy) : -1;
        const next = others[index], box = scrollBox(surface, current);
        if (next) { focus(surface, next); current = next; }
        else if (dy && box) box.scrollTop += dy * box.clientHeight * .55;
      }
    }
    if (pad.pressed(0) && current) {
      if (current.tagName === "SELECT") nudge(current, 1);
      else if (!current.matches('input[type="range"]')) current.click();
    }
    const box = scrollBox(surface, current), look = pad.look ?? normaliseVillageStick(pad.g.axes?.[2], pad.g.axes?.[3]);
    if (box) {
      if (pad.pressed(6) || pad.pressed(7)) box.scrollTop += (pad.pressed(7) ? 1 : -1) * box.clientHeight * .8;
      if (Math.abs(look.y) > .08) box.scrollTop += look.y * 800 * dt;
    }
    const tabs = [...surface.querySelectorAll('[role="tab"],[data-pad-tabs] button')].filter(usable);
    if (tabs.length && (pad.pressed(4) || pad.pressed(5))) {
      const index = Math.max(0, tabs.findIndex(el => el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-pressed") === "true"));
      const next = tabs[(index + (pad.pressed(5) ? 1 : -1) + tabs.length) % tabs.length]; focus(surface, next); next.click();
    }
    return true;
  }

  return {
    poll() {
      let pads = []; try { pads = gamepads(); } catch { /* Some embedded browsers deny Gamepad access. */ }
      const input = padState.sample(pads), locked = isBlocked();
      if (input.disconnected) { clearTouch(); onRelease(); if (source === "pad") setSource(win.matchMedia?.("(any-pointer: coarse)").matches ? "touch" : "keyboard"); }
      if (locked && !wasBlocked) { clearTouch(); padState.releaseMovement(); }
      wasBlocked = locked; root.classList.toggle("vg-controls-blocked", locked);
      if (input.active && !suspended) { if (source !== "pad") clearTouch(); setSource("pad"); }
      legend.classList.toggle("is-menu", locked);
      const label = locked ? "Select" : root.querySelector("#vg-interact:not([hidden])")?.textContent || "Interact";
      legend.querySelector("em").textContent = label;
      if (suspended || root.hidden) return { pad: null, move: ZERO(), look: ZERO(), sprint: false, source };
      return { ...input, move: locked ? ZERO() : source === "pad" ? input.move : { ...moveStick.value }, look: locked ? ZERO() : source === "pad" ? input.look : { ...lookStick.value }, sprint: !locked && (source === "pad" ? input.sprint : sprint), source };
    },
    handleMenu, clear, release,
    reset() { release(); padState.reset(); },
    setBlocked(value) { forcedBlock = !!value; if (forcedBlock && !wasBlocked) { clearTouch(); padState.releaseMovement(); } },
    get source() { return source; },
    get element() { return root; },
    dispose() { if (disposed) return; disposed = true; release(); cleanup.forEach(fn => fn()); made.forEach(el => el.remove()); root.classList.remove("vg-input-pad", "vg-controls-blocked"); delete root.dataset.input; },
  };
}
