// Offline sounds for the house: no speech synthesis, samples or network. Each
// run consumes encounter ids once, including cues skipped while muted/paused.
const MAX_VOICES = 14;
const clamp = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : fallback;
// Screams are synthesised: two rough sawtooth "vocal folds" with a pitch
// contour and vibrato, breath noise, a little distortion, then three formant
// filters for the vowel. pitch is [fraction of length, Hz]; formants are
// [Hz, Q, gain]. gate pulses the voice for a laugh.
const AAH = [[820, 8, 1], [1220, 9, .7], [2800, 10, .42]];
export const SCREAMS = Object.freeze({
  ghoul: { length: 1.4, attack: .04, pitch: [[0, 170], [.15, 255], [.7, 215], [1, 110]], rough: 38, vibrato: 5, depth: 18, breath: .55, formants: [[620, 6, 1], [1000, 7, .8], [2450, 8, .38]], sub: true },
  scarecrow: { length: 1.2, attack: .03, pitch: [[0, 420], [.12, 790], [.6, 700], [1, 360]], rough: 52, vibrato: 9, depth: 40, breath: .95, formants: AAH },
  "haunted-girl": { length: 1.5, attack: .03, pitch: [[0, 720], [.1, 1260], [.55, 1150], [1, 800]], rough: 12, vibrato: 7, depth: 34, breath: .35, formants: [[920, 10, .9], [1650, 10, .8], [3200, 12, .6]] },
  wraith: { length: 2.2, attack: .22, pitch: [[0, 480], [.35, 990], [.7, 900], [1, 400]], rough: 20, vibrato: 5.5, depth: 60, breath: .6, formants: [[700, 8, 1], [1150, 8, .7], [2700, 10, .4]] },
  clown: { length: 1.7, attack: .03, pitch: [[0, 340], [.6, 300], [1, 250]], rough: 30, vibrato: 3, depth: 10, breath: .3, formants: [[760, 8, 1], [1200, 8, .7], [2600, 9, .4]], gate: 5.4 },
  victim: { length: 1.3, attack: .05, pitch: [[0, 600], [.1, 1060], [.7, 980], [1, 700]], rough: 18, vibrato: 6.5, depth: 30, breath: .45, formants: AAH },
});

export function createMazeAudio(prefs = {}) {
  let ctx = null, master = null, scareBus = null, curve = null, noise = null, active = false, paused = false, muted = prefs.mazeSound === false, volume = clamp(prefs.mazeVolume, .45), gentle = false, timer = null, beat = 0;
  const voices = new Set(), cues = new Set();
  const level = () => active && !paused && !muted ? volume * (gentle ? .65 : 1) * .42 : 0;
  // Scares go through their own, much louder bus with a hard limiter, so a
  // scream can be loud without lifting the quiet ambience.
  const loud = () => active && !paused && !muted ? volume * (gentle ? .6 : 1) * .85 : 0;
  // One short seeded noise buffer is shared by whispers, breath and creaks.
  function ensure() {
    if (!ctx) {
      const AudioContext = globalThis.window?.AudioContext || globalThis.window?.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext(); master = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -22; limiter.knee.value = 18; limiter.ratio.value = 8; limiter.attack.value = .008; limiter.release.value = .25;
      master.gain.value = 0; master.connect(limiter).connect(ctx.destination);
      scareBus = ctx.createGain(); const hard = ctx.createDynamicsCompressor(); hard.threshold.value = -6; hard.knee.value = 4; hard.ratio.value = 20; hard.attack.value = .002; hard.release.value = .18;
      scareBus.gain.value = 0; scareBus.connect(hard).connect(ctx.destination);
      curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; curve[i] = Math.tanh(x * 3.2); }
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const data = noise.getChannelData(0); let seed = 821;
      for (let i = 0; i < data.length; i++) { seed = seed * 16807 % 2147483647; data[i] = seed / 1073741823.5 - 1; }
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return true;
  }
  function mix() {
    if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(level(), ctx.currentTime, .025); }
    if (ctx && scareBus) { scareBus.gain.cancelScheduledValues(ctx.currentTime); scareBus.gain.setTargetAtTime(loud(), ctx.currentTime, .01); }
  }
  // Remove each stopped voice immediately; its tiny release still prevents clicks.
  function clearVoices() {
    clearInterval(timer); timer = null;
    for (const voice of voices) {
      try { const now = ctx.currentTime; voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setTargetAtTime(.0001, now, .008); for (const source of voice.sources ?? [voice.source]) source.stop(now + .035); } catch {}
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
  // A rig is one voice built from several sources, all started and stopped
  // together, on the loud scare bus (or the quiet master for distant sounds).
  function rig(duration, delay, build, out = scareBus) {
    if (!ctx || !active || paused || muted || voices.size >= MAX_VOICES) return null;
    const when = ctx.currentTime + delay, gain = ctx.createGain(), sources = [], parts = [];
    build(when, gain, sources, parts); gain.connect(out);
    const entry = { source: sources[0], gain, sources }; voices.add(entry);
    sources[0].onended = () => { voices.delete(entry); for (const node of [...sources, ...parts, gain]) { try { node.disconnect(); } catch {} } };
    for (const source of sources) { source.start(when); source.stop(when + duration + .05); }
    return entry;
  }
  const envelope = (param, when, peak, attack, length, release = length * .35) => { param.setValueAtTime(.0001, when); param.linearRampToValueAtTime(peak, when + attack); param.setValueAtTime(peak, when + length - release); param.exponentialRampToValueAtTime(.0001, when + length); };
  function scream(kind = "ghoul", { delay = 0, amp = .85, out = scareBus, muffle = 0 } = {}) {
    const p = SCREAMS[kind] ?? SCREAMS.ghoul;
    return rig(p.length, delay, (when, gain, sources, parts) => {
      envelope(gain.gain, when, amp, p.attack, p.length);
      const rough = ctx.createWaveShaper ? ctx.createWaveShaper() : ctx.createGain(); if (ctx.createWaveShaper) rough.curve = curve; parts.push(rough);
      const folds = [0, p.rough].map(detune => {
        const osc = ctx.createOscillator(); osc.type = "sawtooth"; osc.detune.value = detune;
        p.pitch.forEach(([t, hz], i) => i ? osc.frequency.exponentialRampToValueAtTime(hz, when + t * p.length) : osc.frequency.setValueAtTime(hz, when));
        osc.connect(rough); sources.push(osc); return osc;
      });
      const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = p.vibrato; depth.gain.value = p.depth; lfo.connect(depth); for (const osc of folds) depth.connect(osc.frequency); sources.push(lfo); parts.push(depth);
      const breath = ctx.createBufferSource(), air = ctx.createGain(); breath.buffer = noise; breath.loop = true; air.gain.value = p.breath; breath.connect(air).connect(rough); sources.push(breath); parts.push(air);
      let tail = gain;
      if (p.gate) { const gate = ctx.createGain(), pulse = ctx.createOscillator(), swing = ctx.createGain(); gate.gain.value = .5; pulse.type = "square"; pulse.frequency.value = p.gate; swing.gain.value = .5; pulse.connect(swing).connect(gate.gain); gate.connect(gain); tail = gate; sources.push(pulse); parts.push(gate, swing); }
      if (muffle) { const wall = ctx.createBiquadFilter(); wall.type = "lowpass"; wall.frequency.value = muffle; wall.connect(tail); tail = wall; parts.push(wall); }
      for (const [hz, q, g] of p.formants) { const band = ctx.createBiquadFilter(), level = ctx.createGain(); band.type = "bandpass"; band.frequency.value = hz; band.Q.value = q; level.gain.value = g * 2.2; rough.connect(band).connect(level).connect(tail); parts.push(band, level); }
      if (p.sub) { const growl = ctx.createOscillator(), low = ctx.createGain(); growl.type = "square"; growl.frequency.setValueAtTime(62, when); growl.frequency.exponentialRampToValueAtTime(40, when + p.length); low.gain.value = .35; growl.connect(low).connect(tail); sources.push(growl); parts.push(low); }
    }, out);
  }
  // The hit: a dissonant brass cluster that sweeps shut, a sub boom and a crash.
  function stinger(amp = .9, delay = 0) {
    return rig(1.4, delay, (when, gain, sources, parts) => {
      envelope(gain.gain, when, amp, .012, 1.4, 1.1);
      const sweep = ctx.createBiquadFilter(); sweep.type = "lowpass"; sweep.frequency.setValueAtTime(4200, when); sweep.frequency.exponentialRampToValueAtTime(380, when + 1.2); sweep.Q.value = 2; sweep.connect(gain); parts.push(sweep);
      for (const hz of [116.5, 123.5, 174.6, 185, 233, 247]) { const osc = ctx.createOscillator(), level = ctx.createGain(); osc.type = "sawtooth"; osc.frequency.value = hz; level.gain.value = .22; osc.connect(level).connect(sweep); sources.push(osc); parts.push(level); }
      const boom = ctx.createOscillator(), thump = ctx.createGain(); boom.frequency.setValueAtTime(78, when); boom.frequency.exponentialRampToValueAtTime(26, when + 1); thump.gain.setValueAtTime(1.4, when); thump.gain.exponentialRampToValueAtTime(.001, when + 1.1); boom.connect(thump).connect(gain); sources.push(boom); parts.push(thump);
      const crash = ctx.createBufferSource(), bright = ctx.createBiquadFilter(), hiss = ctx.createGain(); crash.buffer = noise; bright.type = "highpass"; bright.frequency.value = 1600; hiss.gain.setValueAtTime(.9, when); hiss.gain.exponentialRampToValueAtTime(.001, when + .7); crash.connect(bright).connect(hiss).connect(gain); sources.push(crash); parts.push(bright, hiss);
    });
  }
  // A door or lid slammed hard, and a high metal screech.
  function slam(amp = .9, delay = 0) {
    return rig(.45, delay, (when, gain, sources, parts) => {
      envelope(gain.gain, when, amp, .004, .45, .4);
      const hit = ctx.createBufferSource(), body = ctx.createBiquadFilter(); hit.buffer = noise; body.type = "lowpass"; body.frequency.value = 900; hit.connect(body).connect(gain); sources.push(hit); parts.push(body);
      const knock = ctx.createOscillator(), weight = ctx.createGain(); knock.frequency.setValueAtTime(96, when); knock.frequency.exponentialRampToValueAtTime(38, when + .3); weight.gain.value = 1.2; knock.connect(weight).connect(gain); sources.push(knock); parts.push(weight);
    });
  }
  function screech(amp = .35, delay = 0) {
    return rig(.6, delay, (when, gain, sources, parts) => {
      envelope(gain.gain, when, amp, .02, .6, .3);
      const metal = ctx.createOscillator(), band = ctx.createBiquadFilter(); metal.type = "sawtooth"; metal.frequency.setValueAtTime(2300, when); metal.frequency.exponentialRampToValueAtTime(3600, when + .5);
      band.type = "bandpass"; band.frequency.setValueAtTime(2800, when); band.frequency.exponentialRampToValueAtTime(4200, when + .5); band.Q.value = 6; metal.connect(band).connect(gain); sources.push(metal); parts.push(band);
    });
  }
  // Which scream belongs to whom.
  const VOICE_OF = { ghoul: "ghoul", scarecrow: "scarecrow", "haunted-girl": "haunted-girl", wraith: "wraith", clown: "clown" };
  function footstep() { voice({ noise: true, cutoff: 280, duration: .14, amp: .05 }); voice({ frequency: 56, endFrequency: 37, duration: .16, amp: .045 }); }
  // Resume begins ambience only. Encounter cues never live in a deferred queue.
  function ambience() {
    if (!active || paused || muted || document.hidden || !ensure()) return;
    mix(); beat = 0;
    voice({ frequency: 48, endFrequency: 48, amp: .028, cutoff: 140, loop: true, duration: 2 });
    voice({ noise: true, amp: .018, cutoff: 260, loop: true, duration: 2 });
    // Now and then, another guest screams somewhere deeper in the house.
    timer = setInterval(() => { if (!active || paused || muted || document.hidden) return; footstep(); if (++beat % 7 === 0) voice({ frequency: 120, endFrequency: 67, type: "triangle", duration: .9, amp: .045, cutoff: 600 }); if (beat % 29 === 13) scream("victim", { amp: .16, out: master, muffle: 900 }); }, 680);
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
      // A scare is loud: the hit, the monster's own scream, and a slam or screech.
      if (typeof event === "object" && event.actor) {
        const force = .62 + intensity * .38;
        // The scream starts as it rushes; the hit and slam land as it reaches you.
        scream(VOICE_OF[event.actor] ?? "ghoul", { delay: .02, amp: force }); stinger(force * .95, .16);
        if (event.actor === "ghoul" || event.actor === "scarecrow") slam(force * .9, .16); else screech(force * .4, .2);
      }
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
