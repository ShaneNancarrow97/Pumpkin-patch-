// Hold to buy: a price button spends coins only after a short hold. Press and
// keep pressing (mouse, touch, Enter or Space, or ✕ on a pad) while a fill
// sweeps across it; the purchase goes through when it's full. A quick tap only
// says "Hold to buy", so a stray tap, a scroll or a fast run through a menu on
// a pad never spends anything. Settings can turn it off.
import { glyphHTML } from "./glyphs.js";

export const HOLD_TO_BUY_MS = 450;
// A purchase is a marked button with a price on it (ui/purchase-surfaces.js);
// a marked button without one, such as the kitchen's Cook, stays a tap.
export const buyButton = (el) => { const b = el?.closest?.(".purchase-button"); return b && b.textContent.includes("£") ? b : null; };

export function createHoldToBuy({ enabled = () => true, feel = () => {}, glyphs = () => "keyboard" } = {}) {
  let hold = null, passing = null, quietUntil = 0, hint = null, hintTimer = 0;

  // The sheet redraws its HTML as the farm changes, so a held button can be
  // replaced mid-hold: find its twin by its data attributes.
  function twin(el) {
    if (el.isConnected) return el;
    const data = [...el.attributes].filter((a) => a.name.startsWith("data-")).map((a) => [a.name, a.value]);
    if (!data.length) return null;
    return [...document.querySelectorAll(".purchase-button")].find((b) => data.every(([k, v]) => b.getAttribute(k) === v)) ?? null;
  }
  function clear() {
    if (!hold) return;
    clearTimeout(hold.timer); hold.button.classList.remove("holding"); hold = null;
  }
  function start(button, source, id) {
    if (!enabled() || hold || button.disabled) return false;
    hideHint();
    hold = { button, source, id, at: performance.now(), timer: setTimeout(finish, HOLD_TO_BUY_MS) };
    button.style.setProperty("--hold-ms", HOLD_TO_BUY_MS + "ms");
    button.classList.add("holding"); feel("tick");
    return true;
  }
  function finish() {
    if (!hold) return;
    const button = twin(hold.button); clear();
    if (!button || button.disabled) return;
    quietUntil = performance.now() + 700;
    button.classList.remove("bought"); void button.offsetWidth; button.classList.add("bought");
    setTimeout(() => button.classList.remove("bought"), 420);
    feel("done");
    passing = button; try { button.click(); } finally { passing = null; }
  }
  function release(source, id) {
    if (!hold || hold.source !== source || (id !== undefined && hold.id !== id)) return;
    const button = hold.button; clear(); showHint(button, source);
  }

  // "Hold to buy", floating over the button, with the pad's own button when a pad pressed it.
  function hideHint() { clearTimeout(hintTimer); hint?.remove(); hint = null; }
  function showHint(button, source) {
    if (!button.isConnected) return;
    hideHint();
    const mode = source === "pad" ? glyphs() : "", r = button.getBoundingClientRect();
    hint = document.createElement("div"); hint.className = "hold-hint"; hint.setAttribute("role", "status");
    hint.innerHTML = mode === "dualsense" || mode === "xbox" ? `Hold ${glyphHTML("confirm", mode)} to buy` : "Hold to buy";
    document.body.append(hint);
    const w = hint.offsetWidth, x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)), above = r.top - hint.offsetHeight - 8;
    hint.style.left = x + "px"; hint.style.top = (above > 8 ? above : r.bottom + 8) + "px";
    button.classList.remove("hold-nudge"); void button.offsetWidth; button.classList.add("hold-nudge");
    setTimeout(() => button.classList.remove("hold-nudge"), 400);
    feel("tick");
    hintTimer = setTimeout(hideHint, 1500);
  }

  // Taps and clicks on a price button wait for the hold; the hold's own click passes.
  document.addEventListener("click", (e) => {
    const b = buyButton(e.target);
    if (!b || b === passing || !enabled()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    // The click that ends a finished hold, or one the hold has already answered.
    if (performance.now() < quietUntil || hold || hint) return;
    showHint(b);
  }, true);
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const b = buyButton(e.target); if (b) start(b, "pointer", e.pointerId);
  }, true);
  document.addEventListener("pointermove", (e) => {
    if (hold?.source !== "pointer" || hold.id !== e.pointerId) return;
    const r = hold.button.getBoundingClientRect();
    if (e.clientX < r.left - 12 || e.clientX > r.right + 12 || e.clientY < r.top - 12 || e.clientY > r.bottom + 12) clear();
  }, true);
  document.addEventListener("pointerup", (e) => release("pointer", e.pointerId), true);
  // A scroll that starts on the button takes the pointer: no purchase, no hint.
  document.addEventListener("pointercancel", (e) => { if (hold?.source === "pointer" && hold.id === e.pointerId) clear(); }, true);
  document.addEventListener("contextmenu", (e) => { if (buyButton(e.target)) e.preventDefault(); }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const b = buyButton(e.target); if (!b || !enabled()) return;
    e.preventDefault(); if (!e.repeat) start(b, "key", e.key);
  }, true);
  document.addEventListener("keyup", (e) => { if (hold?.source === "key" && hold.id === e.key) { e.preventDefault(); release("key", e.key); } }, true);
  addEventListener("blur", clear);

  return {
    // The pad holds through these: ✕ down on a focused price button, then up.
    press: (button, source = "pad") => { const b = buyButton(button); return b ? start(b, source) : false; },
    release: (source = "pad") => release(source),
    cancel: clear,
    get active() { return !!hold; },
    get holding() { return hold?.button ?? null; },
  };
}
