import { HAYRIDE_STOPS } from "../content/hayride-layout.js";
import { HAYRIDE_PROPERTY } from "../content/hayride.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
// "About 2½ minutes", or seconds for a short ride.
const lasting = s => s < 90 ? `About ${Math.round(s)} seconds` : `About ${String(Math.round(s / 30) / 2).replace(".5", "½")} minutes`;
const rideIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({exit:'<path d="m10 5-7 7 7 7M3 12h18"/>',pause:'<path d="M8 5v14M16 5v14"/>',sound:'<path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',muted:'<path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6M21 9l-5 6"/>',fullscreen:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>'})[name] ?? ''}</svg>`;

// The free owner's ride only: callbacks own camera/audio; this surface never
// calls a purchase action or touches the simulation's guests and tickets.
export function createHayrideRideUI({ prefs = {}, savePrefs = () => {}, onStart, onPause, onExit, onReplay, onSound, onGentle, onLightning, onFullscreen } = {}) {
  const host = document.createElement("section"); host.id = "hayride-ride-ui"; host.className = "hayride-ride-ui";
  host.hidden = true; host.setAttribute("aria-label", "The Hollow Hayride owner experience"); document.body.append(host);
  let active = false, stage = "brief", config = {}, status = {}, returnFocus = null, idleTimer = 0, cueTimer = 0, lastCue = "", hiddenPause = false;
  const options = () => ({
    gentle: prefs.hayrideGentle ?? prefs.mazeGentle ?? !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    lightning: prefs.hayrideLightning !== false,
    sound: prefs.hayrideSound !== false, volume: Number.isFinite(Number(prefs.mazeVolume)) ? clamp(prefs.mazeVolume) : .45,
  });
  const scope = () => host.querySelector(".hayride-ride-panel") ?? host.querySelector(".hayride-ride-hud") ?? host;
  const wake = () => { if (!active) return; clearTimeout(idleTimer); host.classList.remove("idle"); if (stage === "running") idleTimer = setTimeout(() => host.classList.add("idle"), 3200); };
  function render(focus = false) {
    const o = options(), brief = stage === "brief", paused = stage === "pause", result = stage === "result";
    let panel = "";
    const settings = `<div class="hayride-ride-settings"><button data-hayride-ride="gentle" aria-pressed="${o.gentle}">Gentle mode <b>${o.gentle ? "On" : "Off"}</b></button><button data-hayride-ride="sound" aria-pressed="${o.sound}">Ride sound <b>${o.sound ? "On" : "Off"}</b></button><button data-hayride-ride="lightning" aria-pressed="${o.lightning && !o.gentle}" ${o.gentle ? "disabled" : ""}>Lightning <b>${o.gentle ? "Off in gentle mode" : o.lightning ? "On" : "Off"}</b></button></div>`;
    if (brief) panel = `<p class="hayride-ride-eyebrow">Free owner ride · No ticket charged</p><h2 id="hayride-ride-title">Beyond the farm gate</h2><p>Board the wagon for a journey deep into the haunted woods. Tall trees hide five scare scenes beyond the edge of the farm.</p><p class="hayride-ride-muted">${lasting(HAYRIDE_PROPERTY.rideAlongSeconds)}. Drag to look around; leave whenever you like. Gentle mode keeps the camera steady and disables lightning.</p>${settings}<div class="hayride-ride-buttons"><button class="is-primary" data-hayride-ride="start">Ride along</button><button data-hayride-ride="exit">Return to farm</button></div>`;
    else if (paused) panel = `<p class="hayride-ride-eyebrow">Owner ride paused</p><h2 id="hayride-ride-title">The woods can wait</h2><p>${hiddenPause ? "Your wagon waited while this page was out of view." : "Take a moment. Your place on the route is kept."}</p>${settings}<div class="hayride-ride-buttons"><button class="is-primary" data-hayride-ride="resume">Resume ride</button><button data-hayride-ride="exit">Return to farm</button></div>`;
    else if (result) panel = `<p class="hayride-ride-eyebrow">Back at the station</p><h2 id="hayride-ride-title">All aboard… again?</h2><p>You made it through the woods.</p><div class="hayride-ride-summary"><span><b>${status.eventsFired?.length ?? HAYRIDE_STOPS.length}</b>scare scenes</span><span><b>${Math.round(status.rideDuration ?? 90)}s</b>woodland circuit</span></div><div class="hayride-ride-buttons"><button class="is-primary" data-hayride-ride="replay">Ride again</button><button data-hayride-ride="exit">Return to farm</button></div>`;
    host.dataset.stage = stage;
    host.innerHTML = `<div class="hayride-ride-vignette" aria-hidden="true"></div><div class="hayride-ride-progress" role="progressbar" aria-label="Hayride progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(clamp(status.progress) * 100)}"><i style="transform:scaleX(${clamp(status.progress)})"></i></div><nav class="hayride-ride-hud" aria-label="Ride controls" ${panel ? 'inert aria-hidden="true"' : ""}><button data-hayride-ride="exit" aria-label="Exit hayride">${rideIcon("exit")} <span>Exit</span></button><span class="hayride-ride-place">${escape(status.zoneName ?? "The Hollow Hayride")}</span><button data-hayride-ride="pause" aria-label="Pause hayride">${rideIcon("pause")} <span>Pause</span></button><button data-hayride-ride="sound" aria-label="Ride sound ${o.sound ? "on" : "off"}" aria-pressed="${o.sound}">${rideIcon(o.sound ? "sound" : "muted")}<span>Sound</span></button>${onFullscreen ? '<button class="hayride-ride-fullscreen" data-hayride-ride="fullscreen" aria-label="Toggle fullscreen">' + rideIcon("fullscreen") + '</button>' : ""}</nav><p class="hayride-ride-hint" ${stage !== "running" ? "hidden" : ""}>Drag to look around</p><p class="hayride-ride-cue" aria-live="polite"></p>${panel ? `<div class="hayride-ride-shade"><section class="hayride-ride-panel" role="dialog" aria-modal="true" aria-labelledby="hayride-ride-title">${panel}</section></div>` : ""}`;
    if (focus) scope().querySelector(".is-primary, button")?.focus({ preventScroll: true });
  }
  function pause(on) {
    if (!active || !["running", "pause"].includes(stage)) return;
    stage = on ? "pause" : "running"; if (!on) hiddenPause = false;
    render(true); onPause?.(on); wake();
  }
  const close = () => {
    if (!active) return;
    active = false; host.hidden = true; host.replaceChildren(); document.body.classList.remove("hayride-ride-active");
    clearTimeout(idleTimer); clearTimeout(cueTimer);
    if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  };
  const exit = () => { if (active) { close(); onExit?.(); } };
  const click = event => {
    const action = event.target.closest("[data-hayride-ride]")?.dataset.hayrideRide;
    if (!active || !action) return; event.stopPropagation();
    if (action === "exit") return exit();
    if (action === "start" || action === "replay") { stage = "running"; hiddenPause = false; status = {}; lastCue = ""; render(true); wake(); (action === "start" ? onStart : onReplay)?.(options()); }
    else if (action === "pause" || action === "resume") pause(stage !== "pause");
    else if (action === "sound") { prefs.hayrideSound = !options().sound; savePrefs(); onSound?.(prefs.hayrideSound); render(); wake(); }
    else if (action === "gentle") { prefs.hayrideGentle = !options().gentle; savePrefs(); onGentle?.(prefs.hayrideGentle); render(); }
    else if (action === "lightning") { prefs.hayrideLightning = !options().lightning; savePrefs(); onLightning?.(prefs.hayrideLightning); render(); }
    else if (action === "fullscreen") onFullscreen?.();
  };
  const key = event => {
    if (!active) return;
    if (event.key === "Escape" || event.key.toLowerCase() === "p") {
      event.preventDefault(); event.stopImmediatePropagation();
      if (["brief", "result"].includes(stage)) exit(); else pause(stage !== "pause");
    } else if (event.key === "Tab") {
      const controlScope = scope(), nodes = [...controlScope.querySelectorAll("button:not([disabled])")].filter(node => node.getClientRects().length && !node.closest("[inert]"));
      const first = nodes[0], last = nodes.at(-1);
      if (!first) event.preventDefault();
      else if (event.shiftKey && (document.activeElement === first || !controlScope.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !controlScope.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  };
  const visibility = () => { if (active && document.hidden && stage === "running") { hiddenPause = true; pause(true); } };
  host.addEventListener("click", click); document.addEventListener("keydown", key, true); document.addEventListener("visibilitychange", visibility);
  for (const name of ["pointerdown", "pointermove", "keydown"]) document.addEventListener(name, wake, { passive: true, capture: true });
  return {
    open(nextConfig = {}) { if (active) return false; config = nextConfig; status = {}; stage = "brief"; active = true; hiddenPause = false; lastCue = ""; returnFocus = document.activeElement; host.hidden = false; document.body.classList.add("hayride-ride-active"); render(true); return true; },
    update(next = {}) {
      if (!active) return; status = next;
      const nextStage = stage === "brief" ? "brief" : next.completed ? "result" : next.paused ? "pause" : "running";
      if (stage !== nextStage) { stage = nextStage; render(true); wake(); }
      const place = host.querySelector(".hayride-ride-place"); if (place) place.textContent = next.zoneName ?? "The Hollow Hayride";
      const bar = host.querySelector(".hayride-ride-progress");
      if (bar) { bar.setAttribute("aria-valuenow", String(Math.round(clamp(next.progress) * 100))); bar.firstElementChild.style.transform = `scaleX(${clamp(next.progress)})`; }
      if (next.currentCue && next.currentCue.id !== lastCue) {
        lastCue = next.currentCue.id; const cue = host.querySelector(".hayride-ride-cue");
        if (cue) { cue.textContent = next.currentCue.name ?? ""; cue.classList.add("show"); clearTimeout(cueTimer); cueTimer = setTimeout(() => cue.classList.remove("show"), 2400); }
      }
    },
    close, get active() { return active; }, get options() { return options(); }, get stage() { return stage; },
    dispose() { close(); host.remove(); document.removeEventListener("keydown", key, true); document.removeEventListener("visibilitychange", visibility); for (const name of ["pointerdown", "pointermove", "keydown"]) document.removeEventListener(name, wake, true); },
  };
}
