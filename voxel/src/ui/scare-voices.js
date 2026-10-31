// Synthesised screams, roars and the scare hit, shared by the maze
// (maze-audio.js) and the hayride (hayride-audio.js). Each returns a rig: a
// length, and a build that adds its sources and nodes for the caller to start,
// stop and route.
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
// The waveshaper's curve that roughens a scream.
export function distortionCurve() { const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; curve[i] = Math.tanh(x * 3.2); } return curve; }
export const envelope = (param, when, peak, attack, length, release = length * .35) => { param.setValueAtTime(.0001, when); param.linearRampToValueAtTime(peak, when + attack); param.setValueAtTime(peak, when + length - release); param.exponentialRampToValueAtTime(.0001, when + length); };
export function screamRig(ctx, { noise, curve }, kind = "ghoul", { amp = .85, muffle = 0 } = {}) {
  const p = SCREAMS[kind] ?? SCREAMS.ghoul;
  return { length: p.length, build: (when, gain, sources, parts) => {
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
  } };
}
// Roars: a monster's throat, not a person's. Two rough vocal folds an octave
// apart (the lower one, a little off, is what makes it guttural) whose pitch
// wanders, with gargling throat noise, driven hard; then chopped by a rattle
// many times a second, like vocal fry; then a throat whose formants open with
// the mouth, over a chest of low end. pitch is [fraction of length, Hz]; open
// is [fraction of length, 0 shut to 1 wide]; rattle is how many times a second
// the throat rattles and depth how hard; jitter, in cents, how far the pitch
// wanders.
export const ROARS = Object.freeze({
  // The Hollow Man's face splits open in yours.
  hollow: { length: 2, attack: .12, release: .6, pitch: [[0, 80], [.16, 140], [.5, 122], [.8, 96], [1, 64]], open: [[0, .1], [.22, 1], [.65, .8], [1, .15]], rattle: 31, depth: .7, jitter: 70, breath: .5, drive: 3, chest: .4 },
  // A snarl at each lunge of the chase: shorter, higher, snapping open.
  lunge: { length: .9, attack: .05, release: .32, pitch: [[0, 100], [.22, 165], [1, 88]], open: [[0, .3], [.2, 1], [1, .25]], rattle: 36, depth: .6, jitter: 90, breath: .55, drive: 2.6, chest: .3 },
  // Building as he stretches toward you: low, the mouth shut, all rattle.
  growl: { length: 1.4, attack: .5, release: .4, pitch: [[0, 60], [.6, 82], [1, 70]], open: [[0, 0], [1, .3]], rattle: 26, depth: .85, jitter: 50, breath: .4, drive: 2.2, chest: .55 },
  // Left behind: a long, open-throated howl into the dark, its rattle fading.
  howl: { length: 2.6, attack: .3, release: 1, pitch: [[0, 110], [.3, 190], [.75, 160], [1, 96]], open: [[0, .4], [.3, 1], [1, .5]], rattle: 22, depth: .35, jitter: 60, breath: .45, drive: 1.8, chest: .2 },
});
// The throat's formants: [Hz shut, Hz wide, Q, gain].
const THROAT = [[280, 620, 3.5, 1], [800, 1200, 4, .7], [2100, 2700, 3, .4]];
export function roarRig(ctx, { noise, curve }, kind = "hollow", { amp = .8, muffle = 0 } = {}) {
  const p = ROARS[kind] ?? ROARS.hollow, L = p.length;
  return { length: L, build: (when, gain, sources, parts) => {
    envelope(gain.gain, when, amp, p.attack, L, p.release);
    const drive = ctx.createGain(), rough = ctx.createWaveShaper ? ctx.createWaveShaper() : ctx.createGain(); drive.gain.value = p.drive; if (ctx.createWaveShaper) rough.curve = curve;
    drive.connect(rough); parts.push(drive, rough);
    // The folds, the lower an octave down and a little off...
    const folds = [[1, 0, 1], [.5, 18, .55]].map(([ratio, detune, level]) => {
      const osc = ctx.createOscillator(), share = ctx.createGain(); osc.type = "sawtooth"; osc.detune.value = detune; share.gain.value = level;
      p.pitch.forEach(([t, hz], i) => i ? osc.frequency.exponentialRampToValueAtTime(hz * ratio, when + t * L) : osc.frequency.setValueAtTime(hz * ratio, when));
      osc.connect(share); share.connect(drive); sources.push(osc); parts.push(share); return osc;
    });
    // ...and throat noise, driven hard together.
    const breath = ctx.createBufferSource(), wet = ctx.createBiquadFilter(), air = ctx.createGain();
    breath.buffer = noise; breath.loop = true; wet.type = "bandpass"; wet.frequency.value = 1100; wet.Q.value = .6; air.gain.value = p.breath;
    breath.connect(wet); wet.connect(air); air.connect(drive); sources.push(breath); parts.push(wet, air);
    // The rattle chops what comes out (after the drive, which would flatten it).
    const fry = ctx.createGain(), rattle = ctx.createOscillator(), chop = ctx.createGain();
    fry.gain.value = 1 - p.depth / 2; rattle.type = "sawtooth"; rattle.frequency.value = p.rattle; chop.gain.value = p.depth / 2;
    rattle.connect(chop); chop.connect(fry.gain); rough.connect(fry); sources.push(rattle); parts.push(fry, chop);
    // The pitch wanders, on two slow wobbles that never line up, and the rattle with it.
    for (const [hz, share] of [[5.3, .6], [11.7, .4]]) {
      const wobble = ctx.createOscillator(), cents = ctx.createGain(); wobble.frequency.value = hz; cents.gain.value = p.jitter * share;
      wobble.connect(cents); for (const osc of [...folds, rattle]) cents.connect(osc.detune); sources.push(wobble); parts.push(cents);
    }
    let tail = gain;
    if (muffle) { const wall = ctx.createBiquadFilter(); wall.type = "lowpass"; wall.frequency.value = muffle; wall.connect(tail); tail = wall; parts.push(wall); }
    // Through a throat that opens with the mouth...
    for (const [shut, wide, q, g] of THROAT) {
      const formant = ctx.createBiquadFilter(), level = ctx.createGain(); formant.type = "bandpass"; formant.Q.value = q; level.gain.value = g * 3.2;
      p.open.forEach(([t, o], i) => { const hz = shut + (wide - shut) * o; if (i) formant.frequency.linearRampToValueAtTime(hz, when + t * L); else formant.frequency.setValueAtTime(hz, when); });
      fry.connect(formant); formant.connect(level); level.connect(tail); parts.push(formant, level);
    }
    // ...over a chest of low end.
    const chest = ctx.createBiquadFilter(), body = ctx.createGain(); chest.type = "lowpass"; chest.frequency.value = 250; body.gain.value = p.chest;
    fry.connect(chest); chest.connect(body); body.connect(tail); parts.push(chest, body);
  } };
}
// The hit: a dissonant brass cluster that sweeps shut, a sub boom and a crash.
export function stingerRig(ctx, noise, amp = .9) {
  return { length: 1.4, build: (when, gain, sources, parts) => {
    envelope(gain.gain, when, amp, .012, 1.4, 1.1);
    const sweep = ctx.createBiquadFilter(); sweep.type = "lowpass"; sweep.frequency.setValueAtTime(4200, when); sweep.frequency.exponentialRampToValueAtTime(380, when + 1.2); sweep.Q.value = 2; sweep.connect(gain); parts.push(sweep);
    for (const hz of [116.5, 123.5, 174.6, 185, 233, 247]) { const osc = ctx.createOscillator(), level = ctx.createGain(); osc.type = "sawtooth"; osc.frequency.value = hz; level.gain.value = .22; osc.connect(level).connect(sweep); sources.push(osc); parts.push(level); }
    const boom = ctx.createOscillator(), thump = ctx.createGain(); boom.frequency.setValueAtTime(78, when); boom.frequency.exponentialRampToValueAtTime(26, when + 1); thump.gain.setValueAtTime(1.4, when); thump.gain.exponentialRampToValueAtTime(.001, when + 1.1); boom.connect(thump).connect(gain); sources.push(boom); parts.push(thump);
    const crash = ctx.createBufferSource(), bright = ctx.createBiquadFilter(), hiss = ctx.createGain(); crash.buffer = noise; bright.type = "highpass"; bright.frequency.value = 1600; hiss.gain.setValueAtTime(.9, when); hiss.gain.exponentialRampToValueAtTime(.001, when + .7); crash.connect(bright).connect(hiss).connect(gain); sources.push(crash); parts.push(bright, hiss);
  } };
}
