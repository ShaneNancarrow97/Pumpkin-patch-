// Offline sounds for the off-map hayride: no speech synthesis, samples or network. Each
// run consumes encounter ids once, including cues skipped while muted/paused.
import { distortionCurve, screamRig, stingerRig } from "./scare-voices.js";
const MAX_VOICES = 22;
const clamp = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : fallback;
// Who screams at each set: the thing in the woods first, then someone on the
// wagon. The voices are the maze's (scare-voices.js).
const SCREAMERS = { scarecrows: ["scarecrow", "victim"], spiders: ["victim", "haunted-girl"], bride: ["haunted-girl", "victim"], pursuit: ["wraith", "victim"], bus: ["ghoul", "victim"], graveyard: ["wraith", "haunted-girl"], thicket: ["scarecrow", "victim"] };
// The woods between the sets: seconds between each sound, as [shortest, longest].
const WOODS = { owl: [11, 19], crow: [14, 24], twig: [3.5, 7], creak: [8, 14], wolf: [38, 60], scream: [26, 42] };

export function createHayrideAudio(prefs = {}) {
  let ctx = null, master = null, scareBus = null, curve = null, noise = null, active = false, paused = false, muted = prefs.hayrideSound === false, volume = clamp((prefs.hayrideVolume ?? prefs.mazeVolume), .45), gentle = false, timer = null, beat = 0, seed = 4711;
  const voices = new Set(), cues = new Set(), next = {};
  const level = () => active && !paused && !muted ? volume * (gentle ? .65 : 1) * .42 : 0;
  // Screams go through their own louder bus with a hard limiter, as in the
  // maze, so a scream can be loud without lifting the woods.
  const loud = () => active && !paused && !muted ? volume * (gentle ? .5 : 1) * .7 : 0;
  // The woods' timing is seeded, so a ride sounds alike each time.
  const rand = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const between = ([a, b]) => a + rand() * (b - a);
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
      curve = distortionCurve();
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
  // pan places a sound to one side, -1 left to 1 right, where panning exists.
  function voice({ frequency = 80, endFrequency = frequency, duration = .5, amp = .1, type = "sine", filter = "lowpass", cutoff = 1200, delay = 0, noise: useNoise = false, loop = false, pan = 0, vibrato = 0 } = {}) {
    if (!ctx || !active || paused || muted || voices.size >= MAX_VOICES) return;
    const source = useNoise ? ctx.createBufferSource() : ctx.createOscillator(), gain = ctx.createGain(), tone = ctx.createBiquadFilter(), when = ctx.currentTime + delay, parts = [tone, gain], sources = [source];
    if (useNoise) { source.buffer = noise; source.loop = loop; }
    else { source.type = type; source.frequency.setValueAtTime(frequency, when); source.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), when + duration); }
    if (vibrato && !useNoise) { const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 5.5; depth.gain.value = vibrato; lfo.connect(depth).connect(source.frequency); sources.push(lfo); parts.push(depth); }
    tone.type = filter; tone.frequency.value = cutoff; tone.Q.value = .7;
    gain.gain.setValueAtTime(.0001, when); gain.gain.linearRampToValueAtTime(Math.min(.22, amp), when + Math.min(.08, duration * .2));
    if (!loop) gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    let tail = gain;
    if (pan && ctx.createStereoPanner) { const side = ctx.createStereoPanner(); side.pan.value = Math.max(-1, Math.min(1, pan)); gain.connect(side); tail = side; parts.push(side); }
    source.connect(tone).connect(gain); tail.connect(master);
    const entry = { source, gain, sources }; voices.add(entry);
    source.onended = () => { voices.delete(entry); for (const node of [...sources, ...parts]) { try { node.disconnect(); } catch {} } };
    for (const s of sources) s.start(when);
    if (!loop) for (const s of sources) s.stop(when + duration + .025);
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
  const scream = (kind, { delay = 0, amp = .8, out = scareBus, muffle = 0 } = {}) => { if (!ctx) return null; const { length, build } = screamRig(ctx, { noise, curve }, kind, { amp, muffle }); return rig(length, delay, build, out); };
  const stinger = (amp, delay = 0) => { if (!ctx) return null; const { length, build } = stingerRig(ctx, noise, amp); return rig(length, delay, build); };
  // Wind in the trees: noise through a band that drifts slowly up and down, in
  // gusts. It runs until the ride pauses or ends.
  function wind() {
    rig(900, 0, (when, gain, sources, parts) => {
      gain.gain.setValueAtTime(.0001, when); gain.gain.linearRampToValueAtTime(.05, when + 2.5);
      const air = ctx.createBufferSource(), band = ctx.createBiquadFilter(), swell = ctx.createGain(); air.buffer = noise; air.loop = true;
      band.type = "bandpass"; band.frequency.value = 430; band.Q.value = .8; swell.gain.value = .65;
      const drift = ctx.createOscillator(), driftDepth = ctx.createGain(); drift.frequency.value = .06; driftDepth.gain.value = 240; drift.connect(driftDepth).connect(band.frequency);
      const gust = ctx.createOscillator(), gustDepth = ctx.createGain(); gust.frequency.value = .13; gustDepth.gain.value = .35; gust.connect(gustDepth).connect(swell.gain);
      air.connect(band).connect(swell).connect(gain); sources.push(air, drift, gust); parts.push(band, swell, driftDepth, gustDepth);
    }, master);
  }
  // The woods between the sets, each kind on its own clock (WOODS).
  const woods = {
    owl() { const pan = rand() * 1.6 - .8; for (const [at, len] of [[0, .42], [.62, .22], [.92, .5]]) voice({ frequency: 395, endFrequency: 352, duration: len, delay: at, amp: .055, cutoff: 900, pan, vibrato: 4 }); },
    crow() { const pan = rand() * 1.8 - .9, caws = 2 + Math.floor(rand() * 2); for (let i = 0; i < caws; i++) voice({ frequency: 720, endFrequency: 520, type: "sawtooth", duration: .24, delay: i * .38, amp: .03, filter: "bandpass", cutoff: 1250, pan }); },
    twig() { voice({ noise: true, filter: "highpass", cutoff: 2600, duration: .045, amp: .07, pan: rand() * 2 - 1 }); if (rand() < .4) voice({ noise: true, filter: "highpass", cutoff: 2200, duration: .04, delay: .09, amp: .05, pan: rand() * 2 - 1 }); },
    creak() { voice({ frequency: 118, endFrequency: 82, type: "triangle", duration: 1.5, amp: .035, cutoff: 420, pan: rand() * 1.4 - .7, vibrato: 9 }); },
    wolf() { const pan = rand() < .5 ? -.7 : .7; voice({ frequency: 330, endFrequency: 590, duration: 1.1, amp: .03, cutoff: 1500, pan, vibrato: 7 }); voice({ frequency: 590, endFrequency: 430, duration: 2.2, delay: 1.05, amp: .03, cutoff: 1500, pan, vibrato: 9 }); },
    scream() { if (!gentle) scream("victim", { amp: .14, out: master, muffle: 800 }); },
  };
  // Resume begins ambience only. Encounter cues never live in a deferred queue.
  function ambience() {
    if (!active || paused || muted || document.hidden || !ensure()) return;
    mix(); beat = 0;
    voice({ frequency: 39, endFrequency: 39, amp: .035, cutoff: 140, loop: true, duration: 2 });
    voice({ noise: true, amp: .018, cutoff: 260, loop: true, duration: 2 });
    wind();
    for (const kind of Object.keys(WOODS)) next[kind] ??= between(WOODS[kind]) * .6;
    timer = setInterval(() => {
      if (!active || paused || muted || document.hidden) return;
      // Quiet wheel rattle and timber creak sit below the encounter sounds.
      voice({ noise: true, cutoff: 180, duration: .24, amp: .022 });
      voice({ frequency: 43, endFrequency: 36, duration: .27, amp: .026 });
      if (++beat % 5 === 0) voice({ frequency: 143, endFrequency: 98, type: "triangle", duration: .7, amp: .022, cutoff: 320 });
      for (const [kind, range] of Object.entries(WOODS)) if ((next[kind] -= .9) <= 0) { next[kind] = between(range); woods[kind](); }
    }, 900);
  }
  const view = {
    start(options = {}) {
      clearVoices(); cues.clear(); active = true; paused = false; seed = 4711; for (const kind of Object.keys(next)) delete next[kind];
      muted = options.sound === undefined ? prefs.hayrideSound === false : !options.sound; volume = clamp(options.volume ?? (prefs.hayrideVolume ?? prefs.mazeVolume), .45); gentle = !!options.gentle;
      if (document.hidden) paused = true;
      ambience(); mix(); return view.status;
    },
    cue(event) {
      if (!active || !event) return false;
      const name = typeof event === "string" ? event : event.cue ?? event.sound ?? event.soundCue ?? event.type ?? "creak", id = String(typeof event === "string" ? event : event.id ?? name);
      if (cues.has(id)) return false; cues.add(id);
      if (paused || muted || document.hidden || !ctx) return false;
      const intensity = clamp(typeof event === "object" ? event.intensity : .5, .5), amp = .07 + intensity * .09;
      if (name === "whisper" || name === "whispers") {
        voice({ noise: true, filter: "bandpass", cutoff: 880, duration: 1.1, amp: amp * .52 });
        voice({ noise: true, filter: "bandpass", cutoff: 1700, duration: .6, delay: .19, amp: amp * .25 });
      } else if (name === "thunder" || name === "storm") {
        voice({ noise: true, cutoff: 430, duration: 1.8, amp: amp * .8 });
        voice({ frequency: 62, endFrequency: 23, duration: 1.4, amp: amp * .7 });
      } else if (name === "sting") {
        voice({ frequency: 185, endFrequency: 59, type: "triangle", duration: .8, amp: amp * .65 });
        voice({ frequency: 197, endFrequency: 72, type: "sine", duration: .75, amp: amp * .4 });
        voice({ noise: true, filter: "bandpass", cutoff: 1800, duration: .35, amp: amp * .33 });
      } else if (name === "bump") {
        // A wheel over a root: a dull thud through the boards, a knock, a creak.
        voice({ frequency: 74, endFrequency: 38, duration: .2, amp: amp * .9, cutoff: 260 });
        voice({ noise: true, cutoff: 420, duration: .1, amp: amp * .55 });
        voice({ frequency: 158, endFrequency: 112, type: "triangle", duration: .5, delay: .08, amp: amp * .28, cutoff: 480, vibrato: 7, pan: rand() * 1.2 - .6 });
      } else if (name === "tunnel") {
        // Into the hill: the rumble of the wheels closes in, a low drone, and
        // water dripping somewhere in the dark.
        for (let i = 0; i < 3; i++) voice({ noise: true, cutoff: 150 + i * 40, duration: 2.6 - i * .3, delay: i * .45, amp: amp * (.5 + i * .12) });
        voice({ frequency: 44, endFrequency: 36, duration: 3.2, amp: amp * .45, cutoff: 160 });
        for (let i = 0; i < 4; i++) voice({ frequency: 1300 + rand() * 700, endFrequency: 820, duration: .14, delay: 1 + i * .75 + rand() * .3, amp: amp * .14, cutoff: 3000, pan: rand() * 1.6 - .8 });
      } else if (name === "sputter") {
        // The tractor's lamps failing: the engine coughs, the bulb fizzes, then a clunk.
        for (let i = 0; i < 4; i++) voice({ frequency: 62 - i * 4, endFrequency: 44, type: "sawtooth", duration: .16, delay: i * .27 + rand() * .06, amp: amp * .32, filter: "bandpass", cutoff: 220 });
        for (let i = 0; i < 6; i++) voice({ noise: true, filter: "highpass", cutoff: 3200, duration: .05, delay: .1 + i * .19 + rand() * .05, amp: amp * .16 });
        voice({ frequency: 120, endFrequency: 48, duration: .14, delay: 1.25, amp: amp * .5, cutoff: 400 });
      } else if (name === "whoosh") voice({ noise: true, filter: "bandpass", cutoff: 650, duration: .85, amp: amp * .65 });
      else if (name === "chains" || name === "skitter") {
        for (let i = 0; i < 4; i++) voice({ noise: true, filter: "highpass", cutoff: name === "chains" ? 2400 : 1400, duration: .11, delay: i * .12, amp: amp * .24 });
      } else if (name === "knock") {
        for (let i = 0; i < 3; i++) voice({ frequency: 94, endFrequency: 38, duration: .12, delay: i * .22, amp: amp * .6 });
      } else voice({ frequency: 150, endFrequency: 57, type: "triangle", duration: .95, amp: amp * .6, cutoff: 560 });
      // A set's scare: the hit, the thing in the woods screaming, then someone
      // on the wagon. Gentle mode keeps the screams, softer, without the hit.
      const screamers = typeof event === "object" && SCREAMERS[event.stop];
      if (screamers) {
        const force = .55 + intensity * .35;
        if (!gentle) stinger(force * .7, .05);
        scream(screamers[0], { delay: .08, amp: force });
        scream(screamers[1], { delay: .55, amp: force * .8 });
      }
      return true;
    },
    pause(on = true) { if (!active) return; const next = !!on || !!document.hidden; if (next === paused) return; paused = next; clearVoices(); mix(); if (!paused) ambience(); },
    setMuted(on) { muted = !!on; prefs.hayrideSound = !muted; clearVoices(); mix(); if (!muted && active && !paused) ambience(); },
    setVolume(value) { volume = clamp(value, .45); prefs.hayrideVolume = volume; mix(); },
    setGentle(on) { gentle = !!on; mix(); },
    stop() { active = false; paused = false; clearVoices(); mix(); },
    get status() { return { active, paused, muted, volume, profile: "hayride", voices: voices.size, context: ctx?.state ?? "waiting", cues: cues.size }; },
  };
  document.addEventListener("visibilitychange", () => { if (active && document.hidden) view.pause(true); });
  return view;
}
