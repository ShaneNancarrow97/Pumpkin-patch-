// The stick cursor: click either thumbstick and a pointer comes up that the left stick steers, for anything
// the menus' ring can't reach and for tapping straight onto the farm. It's there off play mode, and over any
// menu in play mode, where a stick click otherwise jogs or centres the camera.
// - Steering: it speeds up the longer the stick is held over, settles onto a button it comes to rest near,
//   and names what ✕ will do.
// - ✕ clicks: a button, a tile, a plot or a guest.
// - ○ goes back, and puts the pointer away when there's nothing to go back from.
// - The D-pad nudges it a step, the right stick scrolls what's under it, and a stick click puts it away.
// - L1/R1 and Options still turn the menus' tabs and open the hub. A finger or the mouse puts it away.
// It is drawn at the screen's own pixels, above everything, and grows in TV mode.
const CLICKABLE = 'button:not(:disabled), a[href], [role="button"], [role="tab"], input:not([type="hidden"]):not(:disabled), select:not(:disabled), summary, label, [data-pad-box], [tabindex]:not([tabindex="-1"])';
const TIP = `<svg class="pad-cursor-tip" viewBox="0 0 34 40" aria-hidden="true"><defs><linearGradient id="pad-cursor-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7b0"/><stop offset=".5" stop-color="#ffb84d"/><stop offset="1" stop-color="#e47a26"/></linearGradient></defs>
  <path d="M3 3.2v26.6c0 1.6 1.4 2.3 2.6 1.3l5.6-5 4.3 9.3c.6 1.3 1.9 1.8 3.2 1.2l2.4-1.1c1.3-.6 1.8-1.9 1.2-3.2l-4.2-9.1h7.4c1.7 0 2.4-1.7 1.2-2.9L6 1.8C4.8.6 3 1.4 3 3.2Z" fill="url(#pad-cursor-fill)" stroke="#2a1430" stroke-width="2.1" stroke-linejoin="round"/>
  <path d="M6.2 7.6v15.2" stroke="#fff6de" stroke-width="1.7" stroke-linecap="round" opacity=".75"/>
  <path d="M15.4 21.6c1.6-1.3 3.2-1.5 4.6-.6-1.2.2-2.2.8-3 1.8M15.4 21.6c-.2-1.9.5-3.3 2-4.2-.4 1.1-.4 2.2 0 3.4" fill="none" stroke="#6a2f58" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>
</svg>`;

export function createPadCursor({ scene, back = () => {}, feel = () => {} } = {}) {
  const el = document.createElement("div"); el.className = "pad-cursor"; el.hidden = true; el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<i class="pad-cursor-halo"></i>${TIP}<span class="pad-cursor-label"><b>✕</b><em></em></span>`;
  document.body.append(el);
  const labelText = el.querySelector(".pad-cursor-label em");
  let on = false, x = innerWidth / 2, y = innerHeight * .45, ramp = 0, lastMove = 0, hoverAt = 0, over = null, shown = "", nudgeAt = 0, nudgeDir = "", then = performance.now(), size = 1, steering = false, settleTarget = null, settleUntil = 0;
  // Near the screen's bottom or right edge, the label flips above or to the left of the pointer.
  function place() { el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${size})`; el.classList.toggle("flip-y", y > innerHeight - 76 * size); el.classList.toggle("flip-x", x > innerWidth - 220 * size); }
  const clearSettle = () => { steering = false; settleTarget = null; settleUntil = 0; };
  const clampPoint = () => { x = Math.max(2, Math.min(innerWidth - 2, x)); y = Math.max(2, Math.min(innerHeight - 2, y)); };
  function show(v) {
    clearSettle(); on = v; el.hidden = !v; document.body.classList.toggle("pad-cursor-on", v);
    if (v) { size = document.body.classList.contains("tv-mode") ? 1.45 : 1; lastMove = performance.now(); el.classList.remove("idle"); place(); hover(target()); } else hover(null);
  }
  // A finger or the mouse takes over from the pad.
  addEventListener("pointerdown", (e) => { if (on && e.isTrusted) show(false); }, true);
  addEventListener("resize", () => { clearSettle(); clampPoint(); if (on) { place(); hover(target()); } });
  // What's under the pointer: something to click, the world's canvas, or nothing.
  function target() {
    const hit = document.elementFromPoint(x, y);
    if (!hit || el.contains(hit)) return null;
    if (hit.tagName === "CANVAS") return { canvas: hit };
    const c = hit.closest(CLICKABLE); return c ? { el: c } : null;
  }
  // What ✕ will do there, from the thing's own label.
  function nameOf(t) {
    if (!t) return ""; if (t.canvas) return "Tap";
    const e = t.el, said = e.dataset.padLabel || e.getAttribute("aria-label") || e.title || e.textContent || e.value || "";
    const words = said.replace(/\s+/g, " ").trim(); return words.length > 26 ? words.slice(0, 25).trimEnd() + "…" : words || "Select";
  }
  function hover(t) {
    const next = t?.el ?? null;
    if (over?.el !== next) { over?.el?.removeAttribute("data-pad-hover"); next?.setAttribute("data-pad-hover", ""); }
    over = t; const name = nameOf(t); el.classList.toggle("over", !!t); if (name !== shown) { shown = name; labelText.textContent = name; el.classList.toggle("named", !!name); }
  }
  function click() {
    el.classList.remove("press"); void el.offsetWidth; el.classList.add("press"); feel("select");
    // A purchase may replace the whole menu. Keep the pointer where it was
    // pressed; a detached button's zero-sized rectangle must never steer it.
    const t = target(); clearSettle(); hover(null);
    if (t?.el) { t.el.focus?.({ preventScroll: true }); t.el.click(); }
    else if (t?.canvas) scene?.tapAt?.(x, y);
    hover(target()); setTimeout(() => { if (on) hover(target()); }, 60);
  }
  // The nearest thing under the pointer that scrolls, scrolled.
  function scrollUnder(dx, dy) {
    for (let n = document.elementFromPoint(x, y); n && n !== document.documentElement; n = n.parentElement) {
      if (el.contains(n)) continue; const st = getComputedStyle(n);
      const canY = /(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 2, canX = /(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth + 2;
      if ((dy && canY) || (dx && canX)) { n.scrollBy(canX ? dx : 0, canY ? dy : 0); return; }
    }
  }
  return {
    get on() { return on; },
    get at() { return { x, y, label: shown }; },
    hide() { if (on) show(false); },
    // Puts the pointer at a screen point (for tests, and anything that wants to offer it somewhere).
    moveTo(px, py) { clearSettle(); if (Number.isFinite(px)) x = px; if (Number.isFinite(py)) y = py; clampPoint(); lastMove = performance.now(); if (on) { place(); hover(target()); } },
    // Each frame a pad is connected. Returns true while the pointer has the pad, so nothing else acts on it.
    tick({ pad, down, pressed, canToggle = true, menuOpen = () => false }) {
      const now = performance.now(), dt = Math.max(0, Math.min(.05, (now - then) / 1000)); then = now;
      if ((pressed(10) || pressed(11)) && (on || canToggle)) { show(!on); feel(on ? "open" : "select"); return true; }
      if (!on) return false;
      if (pressed(0) || pressed(1)) clearSettle();
      const scale = Math.min(1.6, Math.max(.75, innerHeight / 900));
      // Steer: curved so small pushes are fine, and quicker the longer it's held right over.
      const axis = i => Number.isFinite(pad?.axes?.[i]) ? Math.max(-1, Math.min(1, pad.axes[i])) : 0;
      const lx = axis(0), ly = axis(1), mag = Math.hypot(lx, ly), dead = .14;
      if (mag > dead) {
        const m = Math.min(1, (mag - dead) / (1 - dead)), speed = (230 + 1150 * ramp) * scale * m ** 1.7;
        ramp = m > .85 ? Math.min(1, ramp + dt / .7) : Math.max(0, ramp - dt * 3);
        x += lx / mag * speed * dt; y += ly / mag * speed * dt; lastMove = now;
        steering = true; settleTarget = null; settleUntil = 0;
      } else {
        ramp = 0;
        // Settle only after real steering, towards the same live target under
        // this point. Reflow, scrolling and new menu markup cancel the pull.
        const fresh = target();
        if (steering) { steering = false; settleTarget = fresh?.el ?? null; settleUntil = now + 350; }
        if (settleTarget && now < settleUntil && settleTarget.isConnected && fresh?.el === settleTarget) {
          const r = settleTarget.getBoundingClientRect(), k = 1 - Math.exp(-dt * 9);
          if (r.width > 0 && r.height > 0 && r.width < 260 && r.height < 160) { x += ((r.left + r.right) / 2 - x) * k; y += ((r.top + r.bottom) / 2 - y) * k; }
        } else { settleTarget = null; settleUntil = 0; }
      }
      // The D-pad nudges a step, repeating while it's held.
      const dir = down[12] ? "u" : down[13] ? "d" : down[14] ? "l" : down[15] ? "r" : "";
      if (dir && (dir !== nudgeDir || now >= nudgeAt)) { clearSettle(); const step = 12 * scale; x += dir === "l" ? -step : dir === "r" ? step : 0; y += dir === "u" ? -step : dir === "d" ? step : 0; nudgeAt = now + (dir !== nudgeDir ? 300 : 55); lastMove = now; }
      nudgeDir = dir;
      clampPoint(); place();
      // The right stick scrolls what's under the pointer.
      const rx = axis(2), ry = axis(3);
      if (Math.abs(rx) > .2 || Math.abs(ry) > .2) { clearSettle(); scrollUnder(Math.abs(rx) > .2 ? rx * 900 * dt : 0, Math.abs(ry) > .2 ? ry * 900 * dt : 0); lastMove = now; }
      if (now - hoverAt > 80) { hoverAt = now; hover(target()); }
      if (down.some((d, i) => d && pressed(i))) lastMove = now;
      if (pressed(0)) click();
      if (pressed(1)) { if (menuOpen()) back(); else show(false); feel("select"); }
      // Left alone a while, it fades until the stick moves or a button is pressed.
      el.classList.toggle("idle", now - lastMove > 12000);
      return true;
    },
  };
}
