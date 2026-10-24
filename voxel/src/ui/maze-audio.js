// Offline sounds for the house: no speech synthesis, samples or network. Each
// run consumes encounter ids once, including cues skipped while muted/paused.
const MAX_VOICES = 14;
const clamp = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : fallback;

export function createMazeAudio(prefs = {}) {
  let ctx = null, master = null, noise = null, active = false, paused = false, muted = prefs.mazeSound === false, volume = clamp(prefs.mazeVolume, .45), gentle = false, timer = null, beat = 0;
  const voices = new Set(), cues = new Set();
  const level = () => active && !paused && !muted ? volume * (gentle ? .65 : 1) * .42 : 0;
  // One short seeded noise buffer is shared by whispers, breath and creaks.
  function ensure() {
    if (!ctx) {
      const AudioContext = globalThis.window?.AudioContext || globalThis.window?.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext(); master = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -22; limiter.knee.value = 18; limiter.ratio.value = 8; limiter.attack.value = .008; limiter.release.value = .25;
      master.gain.value = 0; master.connect(limiter).connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const data = noise.getChannelData(0); let seed = 821;
      for (let i = 0; i < data.length; i++) { seed = seed * 16807 % 2147483647; data[i] = seed / 1073741823.5 - 1; }
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return true;
  }
  function mix() { if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(level(), ctx.currentTime, .025); } }
  // Remove each stopped voice immediately; its tiny release still prevents clicks.
  function clearVoices() {
    clearInterval(timer); timer = null;
    for (const voice of voices) {
      try { const now = ctx.currentTime; voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setTargetAtTime(.0001, now, .008); voice.source.stop(now + .035); } catch {}
    }
    voices.clear();
  }
  function voice({ frequency = 80, endFrequency = frequency, duration = .5, amp = .1, type = "sine", filter = "lowpass", cutoff = 1200, delay = 0, noise: useNoise = false, loop = false } = {}) {
    if (!ctx || !active || paused || muted || voices.size >= MAX_VOICES) return;
    const source = useNoise ? ctx.createBufferSource() : ctx.createOscillator(), gain = ctx.createGain(), tone = ctx.createBiquadFilter(), when = ctx.currentTime + delay;
    if (useNoise) { source.buffer = noise; source.loop = loop; }
    else { source.type = type; source.frequency.setValueAtTime(frequency, when); source.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), when + duration); }
    tone.type = filter; tone.frequency.value = cutoff; tone.Q.value = .7;
    gain.gain.setValueAtTime(.0001, when); gain.gain.linearRampToValueAtTime(Math.min(.22, amp), when + Math.min(.08, duration * .2));
    if (!loop) gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    source.connect(tone).connect(gain).connect(master);
    const entry = { source, gain }; voices.add(entry);
    source.onended = () => { voices.delete(entry); source.disconnect(); tone.disconnect(); gain.disconnect(); };
    source.start(when); if (!loop) source.stop(when + duration + .025);
  }
  function footstep() { voice({ noise: true, cutoff: 280, duration: .14, amp: .05 }); voice({ frequency: 56, endFrequency: 37, duration: .16, amp: .045 }); }
  // Resume begins ambience only. Encounter cues never live in a deferred queue.
  function ambience() {
    if (!active || paused || muted || document.hidden || !ensure()) return;
    mix(); beat = 0;
    voice({ frequency: 48, endFrequency: 48, amp: .028, cutoff: 140, loop: true, duration: 2 });
    voice({ noise: true, amp: .018, cutoff: 260, loop: true, duration: 2 });
    timer = setInterval(() => { if (!active || paused || muted || document.hidden) return; footstep(); if (++beat % 7 === 0) voice({ frequency: 120, endFrequency: 67, type: "triangle", duration: .9, amp: .045, cutoff: 600 }); }, 680);
  }
  const view = {
    start(options = {}) {
      clearVoices(); cues.clear(); active = true; paused = false;
      muted = options.sound === undefined ? prefs.mazeSound === false : !options.sound; volume = clamp(options.volume ?? prefs.mazeVolume, .45); gentle = !!options.gentle;
      if (document.hidden) paused = true;
      ambience(); mix(); return view.status;
    },
    cue(event) {
      if (!active || !event) return false;
      const name = typeof event === "string" ? event : event.cue ?? event.sound ?? event.soundCue ?? event.type ?? "creak", id = String(typeof event === "string" ? event : event.id ?? name);
      if (cues.has(id)) return false; cues.add(id);
      if (paused || muted || document.hidden || !ctx) return false;
      const intensity = clamp(typeof event === "object" ? event.intensity : .5, .5), amp = .07 + intensity * .09;
      if (name === "footstep") footstep();
      else if (name === "whisper" || name === "whispers") {
        voice({ noise: true, filter: "bandpass", cutoff: 880, duration: 1.1, amp: amp * .52 });
        voice({ noise: true, filter: "bandpass", cutoff: 1700, duration: .6, delay: .19, amp: amp * .25 });
      } else if (name === "thunder" || name === "storm") {
        voice({ noise: true, cutoff: 430, duration: 1.8, amp: amp * .8 });
        voice({ frequency: 62, endFrequency: 23, duration: 1.4, amp: amp * .7 });
      } else if (name === "sting") {
        voice({ frequency: 185, endFrequency: 59, type: "triangle", duration: .8, amp: amp * .65 });
        voice({ frequency: 197, endFrequency: 72, type: "sine", duration: .75, amp: amp * .4 });
        voice({ noise: true, filter: "bandpass", cutoff: 1800, duration: .35, amp: amp * .33 });
      } else if (name === "whoosh") voice({ noise: true, filter: "bandpass", cutoff: 650, duration: .85, amp: amp * .65 });
      else if (name === "chains" || name === "skitter") {
        for (let i = 0; i < 4; i++) voice({ noise: true, filter: "highpass", cutoff: name === "chains" ? 2400 : 1400, duration: .11, delay: i * .12, amp: amp * .24 });
      } else if (name === "knock") {
        for (let i = 0; i < 3; i++) voice({ frequency: 94, endFrequency: 38, duration: .12, delay: i * .22, amp: amp * .6 });
      } else voice({ frequency: 150, endFrequency: 57, type: "triangle", duration: .95, amp: amp * .6, cutoff: 560 });
      return true;
    },
    pause(on = true) { if (!active) return; const next = !!on || !!document.hidden; if (next === paused) return; paused = next; clearVoices(); mix(); if (!paused) ambience(); },
    setMuted(on) { muted = !!on; prefs.mazeSound = !muted; clearVoices(); mix(); if (!muted && active && !paused) ambience(); },
    setVolume(value) { volume = clamp(value, .45); prefs.mazeVolume = volume; mix(); },
    setGentle(on) { gentle = !!on; mix(); },
    stop() { active = false; paused = false; clearVoices(); mix(); },
    get status() { return { active, paused, muted, volume, voices: voices.size, context: ctx?.state ?? "waiting", cues: cues.size }; },
  };
  document.addEventListener("visibilitychange", () => { if (active && document.hidden) view.pause(true); });
  return view;
}
