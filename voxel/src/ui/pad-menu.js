// Controller menus. Every menu plays on a pad the way the carving bench does:
// a gold ring marks the choice and the D-pad or left stick moves it to the
// nearest choice that way; ✕ chooses (held on a price, ui/hold-to-buy.js),
// ○ goes back, L1/R1 turn the menu's tabs (or a book's pages), and the right
// stick or L2/R2 scroll. Options brings the ring down to the dock, the farm's
// buttons and the HUD (the hub), so a pad reaches every part of the game.
import { glyphHTML } from "./glyphs.js";
import { buyButton } from "./hold-to-buy.js";

const FOCUSABLE = 'button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]:not([tabindex="-1"])';
// Menus that sit over everything else, then the hub while Options has the
// ring there, then the panels.
const MODALS = [".house-goal-modal:not([hidden])", "#level-celebration:not([hidden])", "#intro:not([hidden])"];
const PANELS = ["#hayride-ride-ui:not([hidden]) .hayride-ride-panel", "#stock-popover:not([hidden])", "#upgrade-menu:not([hidden])", "#sheet:not([hidden])"];
const HUB = ["#dock", "#actions", "#hud", "#place-bar", ".home-journey-chip"];
const FIRST_REPEAT = 380, REPEAT = 140, STICK = .5;

// The nearest choice from `from` in the direction (dx, dy), as an index into
// `rects`, or -1. A choice must lie that way; one in line with the move beats
// one off to the side, then the closer wins.
export function nearestInDirection(from, rects, dx, dy) {
  const fx = (from.left + from.right) / 2, fy = (from.top + from.bottom) / 2;
  let best = -1, bestScore = Infinity;
  rects.forEach((r, i) => {
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    let along, gap, off;
    if (dy) {
      if ((cy - fy) * dy <= 2) return;
      along = dy > 0 ? r.top - from.bottom : from.top - r.bottom;
      gap = Math.max(0, r.left - from.right, from.left - r.right); off = Math.abs(cx - fx);
    } else {
      if ((cx - fx) * dx <= 2) return;
      along = dx > 0 ? r.left - from.right : from.left - r.right;
      gap = Math.max(0, r.top - from.bottom, from.top - r.bottom); off = Math.abs(cy - fy);
    }
    const score = Math.max(0, along) + gap * 3 + off * .1;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  return best;
}
// The choice nearest a spot, for when the one under the ring goes (bought, or redrawn away).
export function nearestTo(spot, rects) {
  let best = -1, bestDistance = Infinity;
  rects.forEach((r, i) => { const d = Math.hypot((r.left + r.right) / 2 - spot.x, (r.top + r.bottom) / 2 - spot.y); if (d < bestDistance) { bestDistance = d; best = i; } });
  return best;
}
// The same choice after a menu redraws its HTML: by id, then by its data, then by its words.
export function choiceKey(el) {
  if (!el) return null;
  if (el.id) return { id: el.id };
  const data = [...el.attributes].filter((a) => a.name.startsWith("data-") && a.name !== "data-pad-focus").map((a) => [a.name, a.value]);
  return { tag: el.tagName, data, text: data.length ? "" : el.textContent.trim().slice(0, 60) };
}
const matchesKey = (el, key) => key && (key.id ? el.id === key.id : el.tagName === key.tag && (key.data.length ? key.data.every(([k, v]) => el.getAttribute(k) === v) : el.textContent.trim().slice(0, 60) === key.text));
const textField = (el) => !!el?.matches?.('textarea,input:not([type]),input[type="text"],input[type="search"],input[type="number"]');
const slider = (el) => !!el?.matches?.('input[type="range"],select');
const closer = (el) => !!el?.matches?.('.close,[data-intro-skip],[aria-label^="Close"],[data-later]');
const query = (selectors) => { for (const s of selectors) { const el = document.querySelector(s); if (el) return el; } return null; };
const surfaceName = (el) => !el ? "" : el.id === "sheet" ? "sheet:" + (el.dataset.section ?? "") : el.id || el.className;
const centre = (r) => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });

export function createPadMenu({ feel = () => {}, back = () => {}, hold = null, hubAllowed = () => true } = {}) {
  let using = false, hubOn = false, hubFrom = "", hubKey = null, lastKey = null, lastSpot = null, lastSurface = "", ringOn = null;
  let dir = "", nextAt = 0, then = performance.now(), crossHeld = false, hintKey = "";
  const hints = document.createElement("div"); hints.className = "pad-hints"; hints.hidden = true; hints.setAttribute("aria-hidden", "true");
  document.body.append(hints);
  function quiet() { ring(null); hints.hidden = true; document.body.classList.remove("pad-menus"); }
  // Touch, the mouse or a key hands the menus back: the ring and the prompts go.
  const handBack = () => { if (using) { using = false; quiet(); } };
  addEventListener("pointerdown", handBack, true); addEventListener("keydown", handBack, true); addEventListener("wheel", handBack, { capture: true, passive: true });

  function surface() {
    const modal = query(MODALS); if (modal) return { el: modal, roots: [modal], name: surfaceName(modal), modal: true };
    if (hubOn) return { el: document.getElementById("dock"), roots: HUB.map((s) => document.querySelector(s)).filter(Boolean), name: "hub", hub: true };
    const panel = query(PANELS); return panel ? { el: panel, roots: [panel], name: surfaceName(panel) } : null;
  }
  const inside = (sf, el) => !!el && sf.roots.some((r) => r.contains(el));
  const usable = (el) => el.matches(FOCUSABLE) && !el.closest("[hidden]") && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const choices = (sf) => sf.roots.flatMap((r) => [r, ...r.querySelectorAll(FOCUSABLE)]).filter(usable);
  const bodyOf = (sf) => sf.el.id === "sheet" ? document.getElementById("sheet-body") : sf.el;
  // Where the ring starts in a menu: a marked choice, the open tab, the first
  // choice; never the way out.
  function firstChoice(sf, list) {
    if (sf.hub) return document.querySelector("#dock .tab.active") ?? document.querySelector('#dock .tab[data-tab="shop"]');
    return list.find((el) => el.matches("[data-pad-default]")) ?? list.find((el) => el.matches('.segmented [aria-pressed="true"]')) ?? list.find((el) => !closer(el)) ?? list[0] ?? null;
  }
  function ring(el) {
    if (ringOn === el) return;
    ringOn?.removeAttribute("data-pad-focus"); ringOn = el;
    el?.setAttribute("data-pad-focus", "");
  }
  // The menu's scrolling list, if the choice is in one.
  function scroller(sf, el) {
    if (sf.el.id === "sheet") return document.getElementById("sheet-body");
    for (let n = el?.parentElement; n && inside(sf, n); n = n.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 2) return n;
    }
    return null;
  }
  // Scroll just enough to show a choice, clear of a sticky row of tabs; a choice in that row is always in view.
  function reveal(sf, el) {
    const box = scroller(sf, el); if (!box) return;
    for (let n = el; n && n !== box; n = n.parentElement) if (getComputedStyle(n).position === "sticky") return;
    const r = el.getBoundingClientRect(), v = box.getBoundingClientRect(), top = Math.min(parseFloat(getComputedStyle(box).scrollPaddingTop) || 0, v.height / 3) + 10;
    const by = r.top < v.top + top ? r.top - v.top - top : r.bottom > v.bottom - 10 ? r.bottom - v.bottom + 10 : 0;
    if (by) box.scrollTo({ top: box.scrollTop + by, behavior: "smooth" });
  }
  function focus(sf, el, scroll = true) {
    if (!el) return;
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    if (scroll) reveal(sf, el);
    lastKey = choiceKey(el); lastSpot = centre(el.getBoundingClientRect()); ring(using ? el : null);
  }
  const inView = (el, box) => { if (!box) return true; const r = el.getBoundingClientRect(), v = box.getBoundingClientRect(); return r.bottom > v.top + 4 && r.top < v.bottom - 4; };

  function move(sf, current, dx, dy) {
    const list = choices(sf), box = current ? scroller(sf, current) : null;
    if (!current) { focus(sf, firstChoice(sf, list)); return; }
    // After a scroll the ring may be out of sight: start from what's in view.
    if (!inView(current, box)) {
      const v = box.getBoundingClientRect(), visible = list.filter((el) => inView(el, box));
      const i = nearestTo({ x: (v.left + v.right) / 2, y: dy < 0 ? v.bottom : v.top }, visible.map((el) => el.getBoundingClientRect()));
      if (i >= 0) { focus(sf, visible[i]); feel("tick"); return; }
    }
    const others = list.filter((el) => el !== current), i = nearestInDirection(current.getBoundingClientRect(), others.map((el) => el.getBoundingClientRect()), dx, dy);
    if (i >= 0) { focus(sf, others[i]); feel("tick"); }
  }
  // Left and right change a slider or a list in place, the way a console's settings do.
  function nudge(el, step) {
    if (el.tagName === "SELECT") {
      let next = el.selectedIndex; do { next += step; } while (el.options[next]?.disabled);
      if (!el.options[next]) return false;
      el.selectedIndex = next; el.dispatchEvent(new Event("change", { bubbles: true })); feel("tick"); return true;
    }
    try { step > 0 ? el.stepUp() : el.stepDown(); } catch { return false; }
    el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); feel("tick"); return true;
  }
  function choose(sf, el) {
    if (!el) return;
    if (buyButton(el) && hold?.press(el, "pad")) { crossHeld = true; return; }
    if (el.tagName === "SELECT") { if (!nudge(el, 1)) { el.selectedIndex = 0; el.dispatchEvent(new Event("change", { bubbles: true })); } return; }
    if (textField(el)) return;
    const fromDock = sf.hub && el.closest("#dock");
    el.click();
    // A dock choice opens its part of the game, and the ring goes with it.
    if (fromDock) toggleHub(false);
  }
  // L1 / R1: the menu's first row of tabs, or a book's pages.
  function turn(sf, step) {
    const root = bodyOf(sf), row = root.querySelector(".segmented");
    const tabs = row ? [...row.querySelectorAll("button:not(:disabled)")].filter((b) => b.getClientRects().length) : [];
    if (tabs.length > 1) {
      const at = Math.max(0, tabs.findIndex((b) => b.getAttribute("aria-pressed") === "true")), next = tabs[(at + step + tabs.length) % tabs.length];
      focus(sf, next, false); next.click(); feel("tick"); return;
    }
    const pages = [...root.querySelectorAll(".pager [data-page]")], page = step > 0 ? pages.at(-1) : pages[0];
    if (page && !page.disabled) { focus(sf, page, false); page.click(); feel("tick"); }
  }
  function toggleHub(on) {
    if (on === hubOn) return;
    // Play mode hides the dock; the hub shows it again (ui/menus.css).
    document.body.classList.toggle("pad-hub", on);
    if (on) { hubFrom = surfaceName(query(PANELS)); hubKey = choiceKey(document.activeElement); hubOn = true; lastSurface = ""; feel("open"); return; }
    hubOn = false; lastSurface = "";
    // Back to the menu the ring came down from, on the same choice.
    const sf = surface(); if (!sf) { ring(null); if (document.activeElement && document.getElementById("dock").contains(document.activeElement)) document.activeElement.blur(); return; }
    const list = choices(sf), el = sf.name === hubFrom ? list.find((x) => matchesKey(x, hubKey)) : null;
    focus(sf, el ?? firstChoice(sf, list));
  }

  function prompts(sf, current, box, mode) {
    const G = (id) => glyphHTML(id, mode), items = [];
    if (sf.hub) items.push([G("confirm"), "Choose"], [G("back"), "Close"]);
    else {
      const root = bodyOf(sf), panel = ["sheet", "upgrade-menu", "stock-popover"].includes(sf.el.id);
      items.push(hold && buyButton(current) ? [`Hold ${G("confirm")}`, "Buy"] : [G("confirm"), "Select"]);
      if (slider(current)) items.push([G("dpad"), "Change"]);
      items.push([G("back"), panel ? "Close" : "Back"]);
      if (root.querySelector(".segmented")) items.push([G("lb") + G("rb"), "Tabs"]);
      else if (root.querySelector(".pager [data-page]")) items.push([G("lb") + G("rb"), "Pages"]);
      if (box && box.scrollHeight > box.clientHeight + 4) items.push([G("rstick"), "Scroll"]);
      if (hubAllowed()) items.push([G("start"), "Menu"]);
    }
    const key = mode + "|" + items.map((i) => i[1]).join();
    if (key !== hintKey) { hintKey = key; hints.innerHTML = items.map(([g, t]) => `<span>${g}<b>${t}</b></span>`).join(""); }
    hints.classList.toggle("hub", !!sf.hub);
  }

  return {
    get hubOn() { return hubOn; },
    get using() { return using; },
    // Called by play mode every frame a pad is connected. Returns true while a
    // menu (or the hub, or anything else holding the screen) has the pad, so
    // play mode leaves the buttons alone.
    tick({ pad, down, pressed, mode, blocked }) {
      const now = performance.now(), dt = Math.min(.1, (now - then) / 1000); then = now;
      const lx = pad.axes[0] ?? 0, ly = pad.axes[1] ?? 0, ry = pad.axes[3] ?? 0;
      // ✕ let go of after a hold-to-buy press.
      if (crossHeld && !down[0] && !down[2]) { crossHeld = false; hold?.release("pad"); }
      const sf = surface(), menuPress = pressed(9) || pressed(17);
      if (!sf) {
        quiet(); lastSurface = "";
        // Options (or the DualSense's touchpad) brings the ring to the hub.
        if (menuPress && hubAllowed()) { using = true; toggleHub(true); return true; }
        // Something else has the screen (the carving bench, a ride): ○ still means back.
        if (blocked && pressed(1)) back();
        return blocked;
      }
      const moved = [12, 13, 14, 15].some((i) => down[i]) || Math.hypot(lx, ly) > STICK || Math.abs(ry) > .3;
      const active = moved || menuPress || [0, 1, 2, 4, 5, 6, 7].some((i) => pressed(i));
      const wasUsing = using; if (active) using = true;
      // The prompts take the dock's place while a pad works a panel (hidden first, so nothing is focused in it).
      document.body.classList.toggle("pad-menus", using && !sf.modal && !sf.hub);
      const isChoice = (el) => inside(sf, el) && usable(el);
      let current = isChoice(document.activeElement) ? document.activeElement : null;
      if (sf.name !== lastSurface) {
        // A new menu: the ring starts on its first choice, not its way out.
        lastSurface = sf.name;
        if (!current || closer(current) || sf.hub) current = firstChoice(sf, choices(sf));
        if (using) focus(sf, current); else { lastKey = choiceKey(current); lastSpot = null; }
      } else if (!current && using) {
        // The choice went in a redraw (or was bought): the same one again, or the nearest to where it was.
        const list = choices(sf), same = list.find((el) => matchesKey(el, lastKey));
        const near = same ?? (lastSpot ? list[nearestTo(lastSpot, list.map((el) => el.getBoundingClientRect()))] : null);
        current = near ?? firstChoice(sf, list); focus(sf, current, false);
      }
      if (sf.hub && query(PANELS) && surfaceName(query(PANELS)) !== hubFrom) { toggleHub(false); return true; }
      ring(using ? current : null);
      if (!using) return true;
      const box = current ? scroller(sf, current) : null;
      prompts(sf, current, box, mode); hints.hidden = !!sf.modal;
      const stickDir = Math.hypot(lx, ly) > STICK ? (Math.abs(lx) > Math.abs(ly) ? (lx > 0 ? "r" : "l") : (ly > 0 ? "d" : "u")) : "";
      const want = down[12] ? "u" : down[13] ? "d" : down[14] ? "l" : down[15] ? "r" : stickDir;
      // The first press after touch or keys only shows the ring (○ and Options still act).
      if (!wasUsing && !pressed(1) && !menuPress) { if (!current || closer(current)) focus(sf, firstChoice(sf, choices(sf))); dir = want; nextAt = now + FIRST_REPEAT; return true; }

      // Moving: the D-pad or the left stick, repeating while held.
      if (want && (want !== dir || now >= nextAt)) {
        nextAt = now + (want !== dir ? FIRST_REPEAT : REPEAT); dir = want;
        if (crossHeld) { crossHeld = false; hold?.cancel(); }
        const dx = want === "l" ? -1 : want === "r" ? 1 : 0, dy = want === "u" ? -1 : want === "d" ? 1 : 0;
        if (dx && slider(current)) nudge(current, dx); else move(sf, current, dx, dy);
        current = isChoice(document.activeElement) ? document.activeElement : current;
      } else if (!want) dir = "";
      if (pressed(0) || pressed(2)) choose(sf, current);
      if (pressed(1)) { if (sf.hub) toggleHub(false); else back(); return true; }
      if (menuPress) { if (sf.hub) toggleHub(false); else if (!sf.modal && hubAllowed()) toggleHub(true); return true; }
      if (!sf.hub && (pressed(4) || pressed(5))) turn(sf, pressed(5) ? 1 : -1);
      // Scrolling: a page at a time on L2 / R2, smoothly on the right stick.
      if (box) {
        if (pressed(6) || pressed(7)) box.scrollBy({ top: (pressed(7) ? 1 : -1) * box.clientHeight * .8, behavior: "smooth" });
        if (Math.abs(ry) > .3) box.scrollTop += Math.sign(ry) * (Math.abs(ry) - .3) / .7 * 1300 * dt;
      }
      return true;
    },
    // Arrow keys move through a menu the same way (Tab still works as it always has).
    handleKey(e) {
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d || e.altKey || e.ctrlKey || e.metaKey) return false;
      const sf = surface(), el = document.activeElement;
      if (!sf || sf.hub || sf.el.id === "upgrade-menu" || !inside(sf, el) || textField(el) || slider(el)) return false;
      e.preventDefault(); move(sf, el, d[0], d[1]); ring(null); return true;
    },
    leaveHub() { toggleHub(false); },
  };
}
