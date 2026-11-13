// Small controls shared by the introduction, conversations and the village tour.
// Reading and replaying a line never calls a story or transaction callback.
import { normalizeVoiceText } from "./voice-key.js";

export function createNarrationControls({ mount, narration, savePrefs = () => {}, line = () => null, className = "" }) {
  const controls = document.createElement("div");
  controls.className = `narration-controls ${className}`.trim();
  controls.setAttribute("role", "group"); controls.setAttribute("aria-label", "Voice controls");
  controls.hidden = !narration;
  controls.innerHTML = '<button type="button" data-voice-toggle aria-label="Turn voices off" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path class="narration-waves" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="narration-muted" d="m15 9 6 6m0-6-6 6"/></svg></button><button type="button" data-voice-replay aria-label="Replay this line"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/></svg></button>';
  mount.append(controls);
  const toggle = controls.querySelector("[data-voice-toggle]"), replay = controls.querySelector("[data-voice-replay]");
  const hint = document.createElement("span"); hint.className = "narration-status"; hint.setAttribute("role", "status"); hint.hidden = true; controls.append(hint);
  function refresh() {
    if (!narration) return;
    const enabled = narration.enabled, current = line(), sameLine = !!current && narration.current?.speaker === current.speaker && narration.current?.text === normalizeVoiceText(current.text);
    const status = sameLine ? narration.current?.status : null, missing = sameLine && narration.current?.available === false;
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.setAttribute("aria-label", enabled ? "Turn voices off" : "Turn voices on");
    toggle.title = enabled ? "Voices on" : "Voices off";
    controls.classList.toggle("is-muted", !enabled);
    controls.classList.toggle("is-playing", !!current && narration.playing);
    replay.disabled = !current || missing;
    replay.setAttribute("aria-label", missing ? "No recording for this line" : status === "blocked" ? "Play this line" : "Replay this line");
    replay.title = !current ? "Choose a reply to continue" : missing ? "No recording for this line" : status === "blocked" ? "Play this line" : "Replay this line";
    hint.hidden = !current || !enabled || status !== "blocked";
    hint.textContent = "Tap replay to hear voices.";
  }
  function playCurrent() {
    const current = line(); if (!narration || !current) return;
    if (!narration.enabled) { narration.setEnabled(true); savePrefs(); }
    if (narration.current?.speaker === current.speaker && narration.current?.text === current.text) narration.replay();
    else narration.play(current.speaker, current.text);
  }
  toggle.addEventListener("click", event => {
    event.stopPropagation(); if (!narration) return;
    narration.setEnabled(!narration.enabled); savePrefs();
    if (narration.enabled) { const current = line(); if (current) narration.play(current.speaker, current.text); }
    refresh();
  });
  replay.addEventListener("click", event => { event.stopPropagation(); playCurrent(); });
  const unsubscribe = narration?.subscribe(refresh); refresh();
  return { element: controls, refresh, dispose() { unsubscribe?.(); controls.remove(); } };
}
