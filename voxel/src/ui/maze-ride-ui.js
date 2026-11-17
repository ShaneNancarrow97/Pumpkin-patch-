// A small, self-contained surface for the owner’s walkthrough. Timeline and
// camera work stay with the caller; no farm actions are available in this view.
import iconAtlas from "../../assets/maze-ride-icons.png";

const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clamp = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : fallback;
const iconURL = (() => { try { return iconAtlas.startsWith("data:") ? URL.createObjectURL(new Blob([Uint8Array.from(atob(iconAtlas.split(",")[1]), c => c.charCodeAt(0))], { type: "image/png" })) : iconAtlas; } catch { return iconAtlas; } })();
const icon = slot => `<span class="maze-ride-icon" aria-hidden="true" style="background-image:url(${iconURL});background-position:${slot % 3 * 50}% ${Math.floor(slot / 3) * 100}%"></span>`;
const timeText = seconds => `${Math.max(1, Math.round(Number(seconds) || 1))} seconds`;
const ROMAN = ["I", "II", "III", "IV", "V"];
// How the walk felt, from the run's terror (0..100).
export const frightName = terror => terror >= 75 ? "Utterly terrified" : terror >= 50 ? "Heart racing" : terror >= 25 ? "Goosebumps" : "Barely a shiver";

// Callbacks are synchronous gesture handlers, allowing Start/Resume to unlock
// Web Audio before the browser’s user activation ends.
export function createMazeRideUI({ prefs = {}, savePrefs = () => {}, onStart, onPause, onExit, onReplay, onSound, onGentle, onVolume, onFullscreen } = {}) {
  const host = document.createElement("section");
  host.id = "maze-ride-ui"; host.className = "maze-ride-ui"; host.hidden = true; host.setAttribute("aria-label", "Hollow House experience"); document.body.append(host);
  let active = false, stage = "brief", config = {}, status = {}, returnFocus = null, hiddenPause = false, chapterShown = "", chapterTimer = 0, lastCue = "", idleTimer = 0;
  // The top bar fades while you watch; a touch, a pointer or a key brings it back.
  const wake = () => { if (!active) return; host.classList.remove("idle"); clearTimeout(idleTimer); if (stage === "running") idleTimer = setTimeout(() => host.classList.add("idle"), 2800); };
  for (const name of ["pointermove", "pointerdown", "keydown"]) document.addEventListener(name, wake, { passive: true });
  // As you step into a chamber its number and name rise and fade.
  function chapter(next) {
    const card = host.querySelector(".maze-ride-chapter"), zones = config.zones ?? [], index = zones.findIndex(z => z.id === next.zone);
    if (!card || index < 0 || next.zone === chapterShown) return;
    chapterShown = next.zone; card.innerHTML = `<small>${ROMAN[index] ?? index + 1}</small>${escape(zones[index].name ?? next.zoneName ?? "")}`;
    card.classList.remove("show"); void card.offsetWidth; card.classList.add("show");
    clearTimeout(chapterTimer); chapterTimer = setTimeout(() => card.classList.remove("show"), 2600);
  }
  // The veil: a vignette that tightens on a scare and turns to warm light at the end.
  function veil(next) {
    const el = host.querySelector(".maze-ride-veil"); if (!el) return;
    const cue = next.currentCue?.id ?? "";
    if (cue && cue !== lastCue && !options().gentle) { el.classList.remove("jolt"); void el.offsetWidth; el.classList.add("jolt"); }
    lastCue = cue;
    const left = Number(next.duration) - Number(next.elapsed), dawn = Number.isFinite(left) ? Math.max(0, Math.min(1, (1.25 - left) / 1.1)) : 0;
    el.style.setProperty("--dawn", String(stage === "result" ? .38 : dawn));
    el.style.setProperty("--dusk", String(Math.max(0, Math.min(1, 1 - (Number(next.elapsed) || 0) / .9))));
  }
  const options = () => ({ sound: prefs.mazeSound !== false, volume: clamp(prefs.mazeVolume, .45), gentle: prefs.mazeGentle ?? !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches });
  const roomNames = () => (config.zones ?? []).map(zone => typeof zone === "string" ? zone : zone.name ?? zone.title ?? zone.id).filter(Boolean);
  const controlScope = () => host.querySelector(".maze-ride-panel") ?? host.querySelector(".maze-ride-hud") ?? host;
  const settingControls = () => { const o = options(); return `<div class="maze-ride-settings"><button class="maze-ride-setting" data-maze-action="sound" aria-pressed="${o.sound}">${icon(4)}<span>Maze sound <b>${o.sound ? "On" : "Off"}</b></span></button><button class="maze-ride-setting" data-maze-action="gentle" aria-pressed="${o.gentle}">${icon(5)}<span>Gentle motion <b>${o.gentle ? "On" : "Off"}</b></span></button><label class="maze-ride-volume"><span>Maze volume</span><input data-maze-volume type="range" min="0" max="1" step=".05" value="${o.volume}" aria-label="Maze volume"></label></div>`; };
  function render(focus = false) {
    const o = options(), rooms = roomNames(), paused = stage === "pause", result = stage === "result", brief = stage === "brief";
    const title = result ? "Back in the candlelight" : paused ? "A moment to breathe" : config.title ?? "The Hollow House";
    let panel = "";
    if (brief) panel = `<p class="maze-ride-eyebrow">Owner walkthrough · Foyer level ${escape(config.tier ?? 1)}</p><h2 id="maze-ride-title">${escape(title)}</h2><p class="maze-ride-route">${escape(rooms.join(" · ") || "Forgotten passage")}</p><p class="maze-ride-description">About ${timeText(config.duration)}. Drag to look around as the house guides you. This free owner visit uses no ticket.</p>${settingControls()}<div class="maze-ride-panel-actions"><button class="maze-ride-button gold" data-maze-action="start">${icon(0)}Start experience</button><button class="maze-ride-button" data-maze-action="exit">Return to foyer</button></div>`;
    if (paused) panel = `<p class="maze-ride-eyebrow">Experience paused</p><h2 id="maze-ride-title">${title}</h2><p class="maze-ride-description">${hiddenPause ? "The house waited while you were away. Resume when you’re ready." : "Your place in the house is saved."}</p>${settingControls()}<div class="maze-ride-panel-actions"><button class="maze-ride-button gold" data-maze-action="resume">${icon(2)}Resume</button><button class="maze-ride-button" data-maze-action="exit">Return to foyer</button></div>`;
    if (result) {
      const count = Array.isArray(status.eventsFired) ? status.eventsFired.length : status.eventsFired?.size ?? Number(status.eventsFired ?? 0), chambers = rooms.length || config.tier || 1, terror = Math.round(Number(status.terror) || 0);
      panel = `<p class="maze-ride-eyebrow">Walkthrough complete</p><h2 id="maze-ride-title">${title}</h2><dl class="maze-ride-stats"><div><dt>Chambers</dt><dd>${chambers}</dd></div><div><dt>Scares</dt><dd>${count}</dd></div><div><dt>Time</dt><dd>${Math.round(Number(status.elapsed ?? config.duration) || 0)}s</dd></div></dl><div class="maze-ride-fright" role="meter" aria-label="Fright" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${terror}"><span>Fright</span><i><b style="width:${terror}%"></b></i><strong>${frightName(terror)}</strong></div><div class="maze-ride-panel-actions"><button class="maze-ride-button gold" data-maze-action="replay">${icon(2)}Replay</button><button class="maze-ride-button" data-maze-action="exit">Return to foyer</button></div>`;
    }
    host.innerHTML = `<div class="maze-ride-veil" aria-hidden="true"><i class="maze-ride-flash"></i></div><p class="maze-ride-chapter" aria-live="polite"></p><header class="maze-ride-hud" ${brief ? "hidden" : ""} ${panel ? 'inert aria-hidden="true"' : ""}><button class="maze-ride-control maze-ride-exit" data-maze-action="exit" aria-label="Exit experience">${icon(3)}<span>Exit</span></button><div class="maze-ride-room"><span data-maze-room>${escape(status.zoneName ?? rooms[0] ?? "The Hollow House")}</span><small data-maze-chamber>Foyer level ${escape(config.tier ?? 1)}</small></div><button class="maze-ride-control" data-maze-action="pause" aria-label="${paused ? "Resume" : "Pause"} experience" ${result ? "hidden" : ""}>${icon(paused ? 2 : 1)}<span>${paused ? "Resume" : "Pause"}</span></button><button class="maze-ride-control" data-maze-action="sound" aria-label="Maze sound ${o.sound ? "on" : "off"}" aria-pressed="${o.sound}">${icon(4)}<span>Sound ${o.sound ? "on" : "off"}</span></button>${onFullscreen ? `<button class="maze-ride-control maze-ride-fullscreen" data-maze-action="fullscreen" aria-label="Toggle fullscreen">⛶</button>` : ""}</header><div class="maze-ride-progress" role="progressbar" aria-label="Walkthrough progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(clamp(status.progress) * 100)}" ${brief ? "hidden" : ""}><i style="transform:scaleX(${clamp(status.progress)})"></i>${(config.zones ?? []).slice(1).map(z => `<span class="maze-ride-tick" style="left:${clamp(z.start) * 100}%"></span>`).join("")}</div>${panel ? `<div class="maze-ride-shade"><section class="maze-ride-panel" role="dialog" aria-modal="true" aria-labelledby="maze-ride-title">${panel}</section></div>` : ""}`;
    host.dataset.stage = stage;
    if (focus) controlScope().querySelector(".gold, [data-maze-action='pause']")?.focus({ preventScroll: true });
  }
  function pause(on) {
    if (!active || !["running", "pause"].includes(stage)) return;
    stage = on ? "pause" : "running"; if (!on) hiddenPause = false;
    render(true); onPause?.(on);
  }
  function exit() { if (!active) return; view.close(); onExit?.(); }
  const view = {
    open(nextConfig = {}) { if (active) return false; returnFocus = document.activeElement; config = nextConfig; status = {}; stage = "brief"; hiddenPause = false; active = true; host.hidden = false; document.body.classList.add("maze-ride-active"); render(true); return true; },
    update(nextStatus = {}) {
      if (!active) return;
      status = nextStatus;
      const nextStage = stage === "brief" ? "brief" : nextStatus.completed ? "result" : nextStatus.paused ? "pause" : "running";
      if (nextStage !== stage) { stage = nextStage; render(true); veil(nextStatus); if (stage === "running") wake(); else { host.classList.remove("idle"); clearTimeout(idleTimer); } return; }
      const room = host.querySelector("[data-maze-room]"); if (room) room.textContent = nextStatus.zoneName ?? roomNames()[0] ?? "The Hollow House";
      if (stage === "running") chapter(nextStatus);
      veil(nextStatus);
      const bar = host.querySelector(".maze-ride-progress"), progress = clamp(nextStatus.progress);
      if (bar) { bar.setAttribute("aria-valuenow", String(Math.round(progress * 100))); bar.firstElementChild.style.transform = `scaleX(${progress})`; }
    },
    close() { if (!active) return; active = false; clearTimeout(idleTimer); clearTimeout(chapterTimer); host.classList.remove("idle"); host.hidden = true; host.replaceChildren(); document.body.classList.remove("maze-ride-active"); if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll: true }); returnFocus = null; },
    get active() { return active; }, get options() { return options(); }, get stage() { return stage; }, get phase() { return ({ brief: "briefing", running: "running", pause: "paused", result: "complete" })[stage]; },
  };
  host.addEventListener("click", event => {
    const action = event.target.closest("[data-maze-action]")?.dataset.mazeAction; if (!action || !active) return;
    event.stopPropagation();
    if (action === "exit") exit();
    else if (action === "start" || action === "replay") { stage = "running"; status = {}; hiddenPause = false; lastCue = ""; chapterShown = ""; render(true); wake(); (action === "start" ? onStart : onReplay)?.(options()); }
    else if (action === "pause" || action === "resume") pause(stage !== "pause");
    else if (action === "sound") { prefs.mazeSound = !options().sound; savePrefs(); onSound?.(prefs.mazeSound); render(); controlScope().querySelector(`[data-maze-action="sound"]`)?.focus({ preventScroll: true }); }
    else if (action === "gentle") { prefs.mazeGentle = !options().gentle; savePrefs(); onGentle?.(prefs.mazeGentle); render(); controlScope().querySelector('[data-maze-action="gentle"]')?.focus({ preventScroll: true }); }
    else if (action === "fullscreen") onFullscreen?.();
  });
  host.addEventListener("input", event => { if (!event.target.matches("[data-maze-volume]")) return; prefs.mazeVolume = clamp(event.target.value, .45); savePrefs(); onVolume?.(prefs.mazeVolume); });
  document.addEventListener("keydown", event => {
    if (!active) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); if (["brief", "result"].includes(stage)) exit(); else pause(stage !== "pause"); }
    else if (event.key === "Tab") {
      const scope = controlScope(), nodes = [...scope.querySelectorAll("button:not([disabled]):not([hidden]), input:not([disabled])")].filter(node => node.getClientRects().length && !node.closest("[inert]")), first = nodes[0], last = nodes.at(-1);
      if (!nodes.length) event.preventDefault();
      else if (event.shiftKey && (document.activeElement === first || !scope.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !scope.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  }, true);
  document.addEventListener("visibilitychange", () => { if (active && document.hidden && stage === "running") { hiddenPause = true; pause(true); } });
  return view;
}
