// Offline sounds for the off-map hayride: no speech synthesis, samples or network. Each
// run consumes encounter ids once, including cues skipped while muted/paused.
import { distortionCurve, screamRig, stingerRig } from "./scare-voices.js";
import { createTractorEngine } from "./tractor-engine.js";
import { JINGLE, JINGLE_LENGTH } from "../content/hayride-jingle.js";
const MAX_VOICES = 22;
const clamp = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : fallback;
// Who screams at each set: the thing in the woods first, then someone on the
// wagon. The voices are the maze's (scare-voices.js).
const SCREAMERS = { hollow: ["ghoul", "victim"], scarecrows: ["scarecrow", "victim"], spiders: ["victim", "haunted-girl"], bride: ["haunted-girl", "victim"], pursuit: ["wraith", "victim"], bus: ["ghoul", "victim"], graveyard: ["wraith", "haunted-girl"], thicket: ["scarecrow", "victim"] };
// The woods between the sets: seconds between each sound, as [shortest, longest].
const WOODS = { owl: [11, 19], crow: [14, 24], twig: [3.5, 7], creak: [8, 14], wolf: [38, 60], scream: [26, 42] };

export function createHayrideAudio(prefs = {}) {
  let ctx = null, master = null, scareBus = null, curve = null, noise = null, active = false, paused = false, muted = prefs.hayrideSound === false, volume = clamp((prefs.hayrideVolume ?? prefs.mazeVolume), .45), gentle = false, timer = null, beat = 0, seed = 4711;
  const voices = new Set(), cues = new Set(), next = {};
  // The heartbeat follows the ride's tension, and pounds in the breakdown's dark (heart).
  let tension = 0, heart = 0, nextBeat = 0;
  // The tractor (tractor-engine.js) runs as one long voice while the ride plays, and the wheels' rumble with it;
  // the ride says every frame what the engine's doing and how fast the wagon's going (setEngine), and the lamps'
  // sputter makes it cough for a moment. The wheels rattle only while the wagon rolls.
  let engine = null, wheels = null, running = null, pace = 1, coughUntil = 0;
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
    clearInterval(timer); timer = null; engine = wheels = null;
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
  // Many short sounds of one kind as one of the ride's voices (so a long run of them is never cut short by the
  // voice limit): one source whose loudness, and pitch, are struck at each time, panned where each one is.
  function pulses({ times, pans = null, frequency = 60, endFrequency = frequency, duration = .1, amp = .1, type = "sine", filter = "lowpass", cutoff = 400, noise: useNoise = false }) {
    return rig(Math.max(...times) + duration + .05, 0, (when, gain, sources, parts) => {
      const source = useNoise ? ctx.createBufferSource() : ctx.createOscillator(), tone = ctx.createBiquadFilter(), env = ctx.createGain();
      if (useNoise) { source.buffer = noise; source.loop = true; } else source.type = type;
      tone.type = filter; tone.frequency.value = cutoff; env.gain.value = 0; source.connect(tone).connect(env); sources.push(source); parts.push(tone, env);
      let out = env;
      if (pans && ctx.createStereoPanner) { const side = ctx.createStereoPanner(); env.connect(side); out = side; parts.push(side); times.forEach((t, i) => side.pan.setValueAtTime(Math.max(-1, Math.min(1, pans[i] ?? 0)), when + t)); }
      out.connect(gain);
      for (const t of times) {
        const at = when + t;
        if (!useNoise) { source.frequency.setValueAtTime(frequency, at); source.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), at + duration); }
        env.gain.setValueAtTime(0, at); env.gain.linearRampToValueAtTime(amp, at + .006); env.gain.exponentialRampToValueAtTime(.0001, at + duration);
      }
    }, master);
  }
  // A music box somewhere in the dark (content/hayride-jingle.js): thin steel tines, an echo off the trees, a
  // little out of tune and running down as it plays, until it stops dead. Two voices take the notes in turn,
  // so each rings on under the next; all in one voice of the ride's.
  function musicBox(amp) {
    rig(JINGLE_LENGTH, 0, (when, gain, sources, parts) => {
      const tone = ctx.createBiquadFilter(), echo = ctx.createDelay(1), back = ctx.createGain();
      tone.type = "lowpass"; tone.frequency.value = 3600; echo.delayTime.value = .23; back.gain.value = .34; gain.gain.value = amp;
      tone.connect(gain); tone.connect(echo).connect(back).connect(echo); back.connect(gain); parts.push(tone, echo, back);
      for (let v = 0; v < 2; v++) {
        const env = ctx.createGain(); env.gain.value = 0; env.connect(tone); parts.push(env);
        const tines = [[1, 1], [2.76, .26], [5.4, .08]].map(([ratio, level]) => { const o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = level; o.connect(g).connect(env); sources.push(o); parts.push(g); return { o, ratio }; });
        JINGLE.forEach((n, i) => {
          if (i % 2 !== v) return;
          const at = when + n.t, f = 440 * 2 ** ((n.note - 69 - n.slow * .45) / 12) * (1 + ((i * 37) % 7 - 3) * .0012);
          for (const { o, ratio } of tines) o.frequency.setValueAtTime(f * ratio, at);
          env.gain.setValueAtTime(0, at); env.gain.linearRampToValueAtTime(1, at + .004); env.gain.setTargetAtTime(0, at + .004, .32 + n.slow * .25);
        });
      }
    }, master);
  }
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
  function startEngine() {
    let motor = null;
    const entry = rig(3600, 0, (when, gain, sources, parts) => { motor = createTractorEngine(ctx, noise, gain); sources.push(...motor.sources); parts.push(...motor.nodes); }, master);
    engine = entry && { entry, drive: motor.drive };
    engine?.drive(running ?? { fire: 27, level: .75 });
    let roll = null;
    const road = rig(3600, 0, (when, gain, sources, parts) => {
      const air = ctx.createBufferSource(), tone = ctx.createBiquadFilter(); roll = ctx.createGain(); air.buffer = noise; air.loop = true;
      tone.type = "lowpass"; tone.frequency.value = 260; roll.gain.value = rumble();
      air.connect(tone).connect(roll).connect(gain); sources.push(air); parts.push(tone, roll);
    }, master);
    wheels = road && { entry: road, roll };
  }
  const rumble = () => .018 * Math.min(1.3, pace);
  // Resume begins ambience only. Encounter cues never live in a deferred queue.
  function ambience() {
    if (!active || paused || muted || document.hidden || !ensure()) return;
    mix(); beat = 0;
    startEngine();
    wind();
    for (const kind of Object.keys(WOODS)) next[kind] ??= between(WOODS[kind]) * .6;
    timer = setInterval(() => {
      if (!active || paused || muted || document.hidden) return;
      // Quiet wheel rattle and timber creak sit below the encounter sounds, while the wagon rolls.
      if (pace > .15) {
        voice({ noise: true, cutoff: 180, duration: .24, amp: .022 });
        voice({ frequency: 43, endFrequency: 36, duration: .27, amp: .026 });
        if (++beat % 5 === 0) voice({ frequency: 143, endFrequency: 98, type: "triangle", duration: .7, amp: .022, cutoff: 320 });
      }
      for (const [kind, range] of Object.entries(WOODS)) if ((next[kind] -= .9) <= 0) { next[kind] = between(range); woods[kind](); }
    }, 900);
  }
  const view = {
    start(options = {}) {
      clearVoices(); cues.clear(); active = true; paused = false; seed = 4711; tension = 0; nextBeat = 0; running = null; pace = 1; coughUntil = 0; for (const kind of Object.keys(next)) delete next[kind];
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
        // The tractor's lamps failing: the engine coughs (setEngine), the bulb fizzes, then a clunk.
        coughUntil = ctx.currentTime + 1.6;
        for (let i = 0; i < 6; i++) voice({ noise: true, filter: "highpass", cutoff: 3200, duration: .05, delay: .1 + i * .19 + rand() * .05, amp: amp * .16 });
        voice({ frequency: 120, endFrequency: 48, duration: .14, delay: 1.25, amp: amp * .5, cutoff: 400 });
      } else if (name === "stall") {
        // The breakdown (hayride-stall.js): the engine chugs down and dies (setEngine), with a hiss and a clunk.
        voice({ noise: true, cutoff: 900, duration: .6, delay: 2, amp: amp * .12 });
        voice({ frequency: 90, endFrequency: 40, duration: .2, delay: 2.1, amp: amp * .45, cutoff: 300 });
      } else if (name === "steps") {
        // Footsteps in the leaves, circling the wagon from behind on one side to ahead on the other, and a twig snapping.
        const times = Array.from({ length: 9 }, (_, i) => i * .47 + (i % 2) * .05), pans = times.map((_, i) => -.9 + i * .225);
        pulses({ times, pans, noise: true, filter: "bandpass", cutoff: 1250, duration: .16, amp: amp * .34 });
        pulses({ times, pans, frequency: 70, endFrequency: 48, duration: .12, amp: amp * .24, cutoff: 200 });
        voice({ noise: true, filter: "highpass", cutoff: 2800, duration: .05, delay: 2.6, amp: amp * .42, pan: .6 });
      } else if (name === "breath") {
        // Slow, heavy breathing, close behind you.
        for (let i = 0; i < 3; i++) { const at = i * 1.15; voice({ noise: true, filter: "bandpass", cutoff: 520, duration: .55, delay: at, amp: amp * .28, pan: -.2 }); voice({ noise: true, filter: "bandpass", cutoff: 360, duration: .7, delay: at + .55, amp: amp * .34, pan: -.15 }); voice({ frequency: 82, endFrequency: 70, type: "sawtooth", duration: .6, delay: at + .55, amp: amp * .07, cutoff: 260 }); }
      } else if (name === "ignition" || name === "crank") {
        // The starter: the solenoid's clack, then its motor whining and labouring with each compression as it
        // turns the engine over (setEngine), and won't catch; the last time it turns until the engine roars.
        const length = name === "crank" ? 1 : .7, from = name === "crank" ? .2 : .25;
        for (let i = 0; i < 2; i++) voice({ noise: true, filter: "highpass", cutoff: 2600, duration: .035, delay: i * .1, amp: amp * .4 });
        voice({ frequency: 92, endFrequency: 70, duration: .1, amp: amp * .4, cutoff: 300 });
        voice({ frequency: 150, endFrequency: 134, type: "sawtooth", duration: length, delay: from, amp: amp * .2, filter: "bandpass", cutoff: 640, vibrato: 16 });
        voice({ noise: true, filter: "bandpass", cutoff: 2300, duration: length, delay: from, amp: amp * .07 });
      } else if (name === "jingle") {
        musicBox(Math.min(.2, amp * 1.3));
      } else if (name === "climb") {
        // He drops onto the tractor's roof: a thud, the canopy's steel groaning under him, his fingers scraping.
        voice({ frequency: 72, endFrequency: 38, duration: .32, amp: amp * .9, cutoff: 260 });
        voice({ frequency: 190, endFrequency: 128, type: "triangle", duration: 1.3, delay: .18, amp: amp * .28, filter: "bandpass", cutoff: 700, vibrato: 12 });
        for (let i = 0; i < 3; i++) voice({ noise: true, filter: "bandpass", cutoff: 2600, duration: .18, delay: .5 + i * .22, amp: amp * .18 });
      } else if (name === "stretch") {
        // His joints crack one after another as he stretches, a sinew groans, and he breathes, closer and closer.
        pulses({ times: Array.from({ length: 8 }, (_, i) => i * .14 + ((i * 53) % 9) * .012), noise: true, filter: "highpass", cutoff: 2400, duration: .03, amp: amp * .5 });
        voice({ frequency: 92, endFrequency: 54, type: "sawtooth", duration: 1.2, amp: amp * .3, cutoff: 420, vibrato: 9 });
        voice({ frequency: 38, endFrequency: 62, duration: 1.2, amp: amp * .55, cutoff: 160 });
        for (let i = 0; i < 2; i++) voice({ noise: true, filter: "bandpass", cutoff: 420, duration: .55, delay: .1 + i * .6, amp: amp * (.3 + i * .15) });
      } else if (name === "hollow") {
        // His face catches light: the whump of the flame taking inside the pumpkin and its crackle, and a deep,
        // torn roar under the screams.
        voice({ noise: true, filter: "lowpass", cutoff: 380, duration: .75, amp: amp * 1.2 });
        for (let i = 0; i < 6; i++) voice({ noise: true, filter: "highpass", cutoff: 2600, duration: .03, delay: .12 + i * .16 + rand() * .07, amp: amp * .3 });
        voice({ frequency: 96, endFrequency: 52, type: "sawtooth", duration: 1.3, delay: .1, amp: amp * 1.1, cutoff: 900, vibrato: 11 });
        voice({ frequency: 980, endFrequency: 310, type: "sawtooth", duration: .7, delay: .05, amp: amp * .45, filter: "bandpass", cutoff: 1500, vibrato: 30 });
        // ...and his face splits open: a wet tearing, and a guttural rattle from the maw.
        voice({ noise: true, filter: "bandpass", cutoff: 520, duration: .45, delay: .22, amp: amp * .9 });
        voice({ frequency: 58, endFrequency: 44, type: "sawtooth", duration: 1.1, delay: .3, amp: amp * .5, cutoff: 380, vibrato: 22 });
        voice({ noise: true, filter: "bandpass", cutoff: 620, duration: 1.1, delay: .1, amp: amp * .6 });
      } else if (name === "roar") {
        // The engine catches and roars (setEngine) with a bang from the exhaust.
        voice({ noise: true, cutoff: 900, duration: .22, amp: amp * .7 });
        voice({ frequency: 84, endFrequency: 34, duration: .34, amp: amp * .8, cutoff: 300 });
        for (let i = 0; i < 3; i++) voice({ noise: true, filter: "bandpass", cutoff: 1500, duration: .05, delay: .25 + i * .13 + rand() * .05, amp: amp * .25 });
      } else if (name === "chase") {
        // Frantic: a scrambling gallop on hands and feet behind the wagon, claws raking the lane, snarls.
        const times = Array.from({ length: 22 }, (_, i) => i * .19 + ((i * 29) % 7) * .012), pans = times.map((_, i) => Math.sin(i * 1.7) * .5);
        pulses({ times, pans, frequency: 66, endFrequency: 38, duration: .09, amp: amp * .5, cutoff: 220 });
        pulses({ times: times.filter((_, i) => i % 3 === 1).map((t) => t + .05), pans: pans.filter((_, i) => i % 3 === 1), noise: true, filter: "highpass", cutoff: 3000, duration: .07, amp: amp * .2 });
        for (const at of [.4, 1.7, 3.1]) voice({ frequency: 150, endFrequency: 74, type: "sawtooth", duration: .75, delay: at, amp: amp * .32, cutoff: 900, vibrato: 18 });
      } else if (name === "howl") {
        // Left behind in the dark, he howls after you.
        voice({ frequency: 230, endFrequency: 118, type: "sawtooth", duration: 2.4, amp: amp * .42, cutoff: 1100, vibrato: 8 });
        voice({ noise: true, filter: "bandpass", cutoff: 700, duration: 2, amp: amp * .2 });
      } else if (name === "jump") {
        // A figure springs at the wagon from across the lane (hayride-scares.js): a hit and its shriek.
        if (!gentle) stinger(.5, .02);
        scream(SCREAMERS[event.stop]?.[0] ?? "ghoul", { delay: .05, amp: .72 });
      } else if (name === "whoosh") voice({ noise: true, filter: "bandpass", cutoff: 650, duration: .85, amp: amp * .65 });
      else if (name === "chains" || name === "skitter") {
        for (let i = 0; i < 4; i++) voice({ noise: true, filter: "highpass", cutoff: name === "chains" ? 2400 : 1400, duration: .11, delay: i * .12, amp: amp * .24 });
      } else if (name === "knock") {
        for (let i = 0; i < 3; i++) voice({ frequency: 94, endFrequency: 38, duration: .12, delay: i * .22, amp: amp * .6 });
      } else voice({ frequency: 150, endFrequency: 57, type: "triangle", duration: .95, amp: amp * .6, cutoff: 560 });
      // A set's scare: the hit, the thing in the woods screaming, then someone
      // on the wagon. Gentle mode keeps the screams, softer, without the hit.
      const screamers = typeof event === "object" && event.type !== "jump" && SCREAMERS[event.stop];
      if (screamers) {
        const force = .55 + intensity * .35;
        if (!gentle) stinger(force * .7, .05);
        scream(screamers[0], { delay: .08, amp: force });
        scream(screamers[1], { delay: .55, amp: force * .8 });
      }
      return true;
    },
    // What the tractor's engine is doing and the wagon's pace (hayride-view.js's status.engine and .pace), every frame.
    setEngine(state, wagonPace = pace) {
      running = state && typeof state === "object" ? state : null; pace = Math.max(0, Number(wagonPace) || 0);
      if (wheels && voices.has(wheels.entry)) wheels.roll.gain.setTargetAtTime(rumble(), ctx.currentTime, .25);
      if (!engine || !voices.has(engine.entry) || !running) return;
      const cough = Math.max(0, Math.min(1, (coughUntil - ctx.currentTime) / 1.6)) * .5;
      engine.drive({ ...running, rough: Math.max(running.rough ?? 0, cough) });
    },
    // The ride's tension (hayride-view.js), 0 to 1, every frame: from a third up, a heartbeat that quickens with
    // it; and heart (0 to 1), how hard it pounds in the breakdown's dark, louder and deeper.
    setTension(value, pounding = 0) {
      tension = clamp(value, 0); heart = clamp(pounding, 0);
      if (!ctx || !active || paused || muted || gentle || document.hidden || tension < .33) { nextBeat = 0; return; }
      const now = ctx.currentTime; if (nextBeat < now) nextBeat = now + .05;
      while (nextBeat < now + .25) {
        const delay = nextBeat - now, a = (.05 + .1 * tension) * (1 + 1.1 * heart), low = 1 - .12 * heart;
        voice({ frequency: 58 * low, endFrequency: 40 * low, duration: .14 + .04 * heart, delay, amp: a, cutoff: 140 });
        voice({ frequency: 54 * low, endFrequency: 38 * low, duration: .16 + .04 * heart, delay: delay + .17, amp: a * .7, cutoff: 130 });
        nextBeat += 60 / (56 + 72 * tension);
      }
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
