// Recorded dialogue travels inside the offline build. A new line replaces the
// last one; the text and its replay choice survive denied or failed playback.
import { normalizeVoiceText, voiceKey } from "./voice-key.js";

const volume = (value, fallback = .85) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : fallback;
const localClip = (url) => typeof url === "string" && !!url && url === url.trim() && (/^data:audio\//i.test(url) || /^blob:/i.test(url) || !/^(?:[a-z][a-z\d+.-]*:|[\\/]{2})/i.test(url));

export function createNarration({ prefs = {}, clips = {}, duck = () => {}, audioFactory = (url) => new Audio(url), document: page = globalThis.document, timers = globalThis } = {}) {
  prefs.voiceEnabled = typeof prefs.voiceEnabled === "boolean" ? prefs.voiceEnabled : true;
  prefs.voiceVolume = volume(prefs.voiceVolume ?? .85);
  let active = null, current = null, serial = 0, disposed = false, ducked = false, watchdog = null, cancelPlayback = null;
  const listeners = new Set();
  const snapshot = () => ({ enabled: prefs.voiceEnabled, volume: prefs.voiceVolume, playing: current?.status === "playing", current });
  const emit = () => { const state = snapshot(); for (const fn of listeners) { try { fn(state); } catch {} } };
  const setDuck = (on) => { if (ducked !== on) { ducked = on; duck(on); } };
  const status = (value) => { if (current) current = Object.freeze({ ...current, status: value }); };

  // Detaching handlers and invalidating the request makes late media promises
  // harmless, even after a rapid Next, mute, close or hidden-page event.
  function release(media) {
    if (!media) return;
    media.onended = media.onerror = media.onplaying = media.onpause = null;
    try { media.pause(); } catch {}
    try { media.removeAttribute("src"); media.load(); } catch {}
  }
  function halt(next = "idle") {
    serial++;
    timers.clearTimeout(watchdog); watchdog = null;
    const cancel = cancelPlayback; cancelPlayback = null; cancel?.();
    const media = active; active = null; release(media);
    setDuck(false); status(next);
  }
  function stop() { halt(); emit(); }

  async function play(speaker, text) {
    if (disposed) return false;
    halt();
    const key = voiceKey(speaker, text), clip = Object.hasOwn(clips, key) ? clips[key] : null;
    const matches = (!clip?.speaker || normalizeVoiceText(clip.speaker).toLowerCase() === normalizeVoiceText(speaker).toLowerCase()) && (clip?.text == null || normalizeVoiceText(clip.text) === normalizeVoiceText(text));
    const available = localClip(clip?.url) && matches;
    current = Object.freeze({ key, speaker, text: normalizeVoiceText(text), available, status: available ? "idle" : "missing" });
    if (!available || !prefs.voiceEnabled || prefs.voiceVolume === 0 || page?.hidden) { emit(); return false; }
    const request = serial;
    let media;
    // Each request owns its audio element; an old promise can never stop a new
    // line, and no decoded clip stays alive after the line is dismissed.
    const finish = (state) => { if (request !== serial || media !== active) return; halt(state); emit(); };
    const playing = () => {
      if (request !== serial || media !== active || current?.status === "playing") return;
      timers.clearTimeout(watchdog);
      watchdog = timers.setTimeout(() => finish("error"), Math.max(10000, Math.min(120000, (Number(clip.duration) || 60) * 1000 + 5000)));
      status("playing"); setDuck(true); emit();
    };
    try {
      media = audioFactory(clip.url); active = media;
      media.preload = "auto"; media.volume = prefs.voiceVolume;
      media.onended = () => finish("ended");
      media.onerror = () => finish("error");
      media.onpause = () => finish("idle");
      media.onplaying = playing;
      // A broken decoder must not leave a tour waiting or music ducked forever.
      const cancelled = new Promise((resolve) => { cancelPlayback = resolve; });
      watchdog = timers.setTimeout(() => finish("error"), 12000);
      status("loading"); emit();
      if (request !== serial) return false;
      await Promise.race([media.play(), cancelled]);
      if (request !== serial || media !== active) { release(media); return false; }
      playing(); return request === serial && media === active;
    } catch (error) {
      if (request === serial) { halt(error?.name === "NotAllowedError" ? "blocked" : "error"); emit(); }
      else release(media);
      return false;
    }
  }

  // Returning to the tab never restarts a line the player may have moved past.
  const visibility = () => { if (page?.hidden) stop(); };
  page?.addEventListener("visibilitychange", visibility);
  return {
    play, stop,
    replay() { return current ? play(current.speaker, current.text) : Promise.resolve(false); },
    setEnabled(on) { prefs.voiceEnabled = !!on; if (!prefs.voiceEnabled) halt(); emit(); },
    setVolume(value) { prefs.voiceVolume = volume(value); if (prefs.voiceVolume === 0) halt(); else if (active) active.volume = prefs.voiceVolume; emit(); },
    get enabled() { return prefs.voiceEnabled; },
    get volume() { return prefs.voiceVolume; },
    get playing() { return current?.status === "playing"; },
    get current() { return current; },
    subscribe(fn) { if (disposed) return () => {}; listeners.add(fn); fn(snapshot()); return () => listeners.delete(fn); },
    dispose() { if (disposed) return; stop(); disposed = true; current = null; listeners.clear(); page?.removeEventListener("visibilitychange", visibility); },
  };
}
