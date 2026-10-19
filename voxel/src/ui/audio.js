// A small offline MIDI synthesiser with bounded polyphony. It pauses when the
// page is hidden and starts only after a gesture. No network or audio library.
import { createMusicQueue } from "./music-queue.js";
import { decodeMidi } from "./midi.js";
import { MUSIC_TRACKS } from "./music-tracks.js";
export { MUSIC_TRACKS };

export function createAudio(prefs) {
  let ctx = null, master = null, noise = null, touched = false, timer = null, clip = null, start = 0, cursor = 0, selected = null, duckUntil = 0;
  const voices = new Set(), cache = new Map(), queue = createMusicQueue(MUSIC_TRACKS.map((t) => t.id));
  const current = () => MUSIC_TRACKS.find((t) => t.id === prefs.musicTrack) ?? MUSIC_TRACKS[0];
  function ensure() {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (!master) {
      master = ctx.createGain(); const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -18; limiter.knee.value = 12; limiter.ratio.value = 5;
      master.connect(limiter).connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const data = noise.getChannelData(0);
      let seed = 37; for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741823.5 - 1; }
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  }
  const level = () => Math.max(0, Math.min(1, Number(prefs.musicVolume) || 0)) * .22;
  function stop() {
    clearInterval(timer); timer = null;
    for (const voice of [...voices]) { try { voice.stop(); } catch {} }
    voices.clear();
    if (master && ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(0, ctx.currentTime); }
  }
  function playNote(n, when) {
    if (voices.size >= 64 || n.velocity < .015) return;
    const gain = ctx.createGain(), filter = ctx.createBiquadFilter(), drum = n.ch === 9;
    const source = drum && n.pitch !== 35 && n.pitch !== 36 ? ctx.createBufferSource() : ctx.createOscillator();
    const duration = Math.max(.04, Math.min(n.duration, 6)), amp = n.velocity * (drum ? .2 : .13);
    if (source.buffer !== undefined) { source.buffer = noise; filter.type = "highpass"; filter.frequency.value = n.pitch >= 42 ? 6200 : 1600; }
    else {
      const family = Math.floor(n.program / 8);
      source.type = drum ? "sine" : [4, 5, 10].includes(family) ? "triangle" : [2, 3, 8, 11].includes(family) ? "sawtooth" : "sine";
      const f = drum ? 110 : 440 * 2 ** ((n.pitch - 69) / 12);
      source.frequency.setValueAtTime(f, when);
      if (drum) source.frequency.exponentialRampToValueAtTime(42, when + .12);
      filter.type = "lowpass"; filter.frequency.value = family === 4 ? 850 : family === 10 ? 2400 : 3200;
    }
    const release = drum ? n.pitch >= 42 ? .065 : .17 : duration + .12;
    gain.gain.setValueAtTime(.0001, when); gain.gain.linearRampToValueAtTime(amp, when + .008); gain.gain.exponentialRampToValueAtTime(.0001, when + release);
    source.connect(filter).connect(gain).connect(master); voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(when); source.stop(when + release + .02);
  }
  function schedule() {
    if (!clip || !ctx || document.hidden) return;
    const now = ctx.currentTime;
    while (cursor < clip.notes.length && start + clip.notes[cursor].time < now + .15) {
      const n = clip.notes[cursor++], when = start + n.time;
      if (when >= now - .035) playNote(n, Math.max(now, when));
    }
    if (now >= start + clip.duration + .12) {
      if (prefs.musicShuffle !== false) { prefs.musicTrack = queue.next(selected); sync(); }
      else { start += clip.duration + .15; cursor = 0; }
    }
  }
  function sync() {
    if (!touched) return;
    if (!prefs.music || document.hidden) { stop(); return; }
    try {
      ensure(); const track = current();
      if (timer && selected === track.id) { master.gain.setTargetAtTime(level(), ctx.currentTime, .04); return; }
      stop(); selected = track.id;
      if (!cache.has(track.id)) cache.set(track.id, decodeMidi(track.bytes));
      clip = cache.get(track.id); cursor = 0; start = ctx.currentTime + .06;
      master.gain.setTargetAtTime(level(), ctx.currentTime, .05);
      timer = setInterval(schedule, 50); schedule();
    } catch { stop(); }
  }
  addEventListener("pointerdown", () => { if (!touched) { touched = true; sync(); } else if (ctx?.state === "suspended") ctx.resume().catch(() => {}); }, { capture: true, passive: true });
  addEventListener("keydown", () => { if (!touched) { touched = true; sync(); } }, { capture: true });
  document.addEventListener("visibilitychange", sync);
  function blip(freq, when, duration, amp, type = "sine") {
    const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(.0001, when); gain.gain.linearRampToValueAtTime(amp, when + .01); gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    osc.connect(gain).connect(ctx.destination); osc.onended = () => { osc.disconnect(); gain.disconnect(); }; osc.start(when); osc.stop(when + duration + .02);
  }
  return {
    sync,
    tone(freq = 520) { if (!prefs.sound || !touched) return; try { ensure(); blip(freq, ctx.currentTime, .18, .035); } catch {} },
    levelUp() {
      if ((!prefs.sound && !prefs.music) || !touched) return;
      try {
        ensure(); const start = ctx.currentTime;
        if (timer) { master.gain.cancelScheduledValues(start); master.gain.setTargetAtTime(level() * .22, start, .03); master.gain.setTargetAtTime(level(), start + 1, .16); duckUntil = start + 1; }
        [69, 72, 76, 81, 79, 81].forEach((note, i) => blip(440 * 2 ** ((note - 69) / 12), start + i * .105, .36, Math.min(.05, prefs.musicVolume * .14 + (prefs.sound ? .015 : 0)), "triangle"));
      } catch {}
    },
    setTrack(id) { if (!MUSIC_TRACKS.some((t) => t.id === id)) return; prefs.musicTrack = id; queue.reset(); sync(); },
    setShuffle(on) { prefs.musicShuffle = !!on; queue.reset(); },
    nextTrack() { prefs.musicTrack = queue.next(prefs.musicTrack ?? current().id, prefs.musicShuffle !== false); sync(); },
    setVolume(v) { prefs.musicVolume = Math.max(0, Math.min(1, Number(v) || 0)); if (master && ctx) master.gain.setTargetAtTime(level() * (ctx.currentTime < duckUntil ? .22 : 1), ctx.currentTime, .04); },
    get status() { return { track: selected, playing: !!timer, voices: voices.size, duration: clip?.duration ?? 0, context: ctx?.state ?? "waiting", shuffle: prefs.musicShuffle !== false }; },
  };
}
