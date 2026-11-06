// The hayride's tractor: a four-cylinder diesel, synthesised in the browser
// from a recording of a real one ("Tractor engine", freesound_community on
// Pixabay). The recording was measured once and is kept here as numbers; no
// sample ships with the game.
// One engine cycle is two turns of the crank and four firings: about 7.8
// cycles a second at the recording's steady running. HARMONICS is the
// strength of each of the cycle's first 160 harmonics, loudest 1. Every
// fourth is a harmonic of the firings themselves (the 4th is the firing rate,
// 31 a second); the ones between are the cylinders' small differences, the
// diesel's lumpy beat.
export const HARMONICS = Object.freeze([
  .10, .08, .20, 1, .07, .04, .06, .27, .11, .07, .10, .68, .18, .17, .45, .55, .26, .17, .18, .17, .21, .18, .21, .93, .65, .31, .28, .37, .23, .19, .20, .19,
  .26, .27, .28, .23, .21, .19, .14, .13, .11, .12, .16, .19, .19, .18, .20, .22, .16, .13, .11, .11, .11, .11, .12, .12, .15, .15, .13, .12, .13, .18, .18, .13,
  .11, .13, .13, .11, .10, .10, .10, .07, .08, .08, .08, .09, .09, .12, .12, .08, .08, .09, .09, .12, .13, .13, .09, .07, .08, .10, .10, .10, .09, .09, .09, .07,
  .09, .09, .14, .16, .16, .17, .17, .17, .12, .12, .12, .12, .09, .09, .09, .08, .11, .11, .11, .10, .10, .18, .18, .18, .18, .10, .10, .15, .15, .15, .17, .17,
  .18, .18, .18, .17, .17, .16, .11, .10, .10, .09, .08, .09, .09, .09, .09, .09, .09, .09, .09, .10, .10, .10, .10, .09, .11, .12, .14, .15, .19, .19, .19, .19,
]);
// How loud the engine sits in the ride's mix at level 1 (the woods' sounds
// are .03 to .06; a scare's are louder).
const LOUDNESS = .26, KNOCK = .13;

// One engine cycle as a wave. The firings' harmonics start in step, so each
// firing is a knock, as the recording's are; the rest take a fixed scatter
// of phases. (All in step, it buzzes; all scattered, it hisses.) Above the
// 96th the measurement is mostly the recording's hiss, so those are played
// softer and the noise bands carry the rest.
export function engineWave(ctx) {
  const real = new Float32Array(HARMONICS.length + 1), imag = new Float32Array(HARMONICS.length + 1);
  let seed = 2741;
  HARMONICS.forEach((measured, i) => {
    const k = i + 1, a = k > 96 ? measured * .55 : measured; seed = seed * 16807 % 2147483647;
    const phase = k % 4 === 0 ? 0 : seed / 2147483647 * Math.PI * 2;
    real[k] = a * Math.cos(phase); imag[k] = a * Math.sin(phase);
  });
  return ctx.createPeriodicWave(real, imag);
}

// The engine as one long-running sound into out: the cycle's wave and two
// bands of noise pulsing with the firings (the exhaust's breath and the
// valves' tick), through the bonnet's muffling, and over them the diesel's
// high clatter, a knock at each firing. drive() sets what it does
// at a moment: { fire: firings a second, level: 0 to about 1.4, rough: the
// share of firings that miss }. A miss drops a firing, and the next one,
// with the unburnt fuel, comes harder. sources and nodes are for the caller
// to start, stop and disconnect.
export function createTractorEngine(ctx, noise, out) {
  const body = ctx.createOscillator(), tone = ctx.createGain(); body.setPeriodicWave(engineWave(ctx)); body.frequency.value = 27 / 4; tone.gain.value = .62;
  // A governor never holds quite steady: the speed hunts a little.
  const hunt = ctx.createOscillator(), huntDepth = ctx.createGain(); hunt.frequency.value = .63; huntDepth.gain.value = .08;
  const air = ctx.createBufferSource(); air.buffer = noise; air.loop = true;
  const exhaust = ctx.createBiquadFilter(), valves = ctx.createBiquadFilter(), breath = ctx.createGain(), clatter = ctx.createGain();
  exhaust.type = "bandpass"; exhaust.frequency.value = 190; exhaust.Q.value = 1.1; valves.type = "bandpass"; valves.frequency.value = 900; valves.Q.value = .9;
  breath.gain.value = .65; clatter.gain.value = .32;
  const pulse = ctx.createOscillator(), pulseDepth = ctx.createGain(), puff = ctx.createGain(); pulse.frequency.value = 27; pulseDepth.gain.value = .25; puff.gain.value = .5;
  const knock = ctx.createBiquadFilter(), knockTop = ctx.createBiquadFilter(), rattle = ctx.createGain(), knockDepth = ctx.createGain(), knocks = ctx.createGain();
  knock.type = "highpass"; knock.frequency.value = 1300; knock.Q.value = .5; knockTop.type = "lowpass"; knockTop.frequency.value = 6000; knockTop.Q.value = .5;
  rattle.gain.value = KNOCK; knockDepth.gain.value = .3; knocks.gain.value = .55;
  const miss = ctx.createGain(), bonnet = ctx.createBiquadFilter(), level = ctx.createGain();
  bonnet.type = "lowpass"; bonnet.frequency.value = 1800; bonnet.Q.value = .5; level.gain.value = 0;
  hunt.connect(huntDepth).connect(body.frequency); pulse.connect(pulseDepth).connect(puff.gain); pulse.connect(knockDepth).connect(knocks.gain);
  body.connect(tone).connect(bonnet);
  air.connect(exhaust).connect(breath).connect(puff); air.connect(valves).connect(clatter).connect(puff); puff.connect(bonnet);
  // The clatter has its own noise (the same, played a little slower), or it and the bonnet's band would cancel where they meet.
  const grit = ctx.createBufferSource(); grit.buffer = noise; grit.loop = true; grit.playbackRate.value = .93;
  grit.connect(knock).connect(knockTop).connect(rattle).connect(knocks);
  bonnet.connect(miss); knocks.connect(miss); miss.connect(level).connect(out);
  let seed = 977, nextFire = -1;
  const rand = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  return {
    sources: [body, hunt, air, pulse, grit], nodes: [tone, huntDepth, exhaust, valves, breath, clatter, pulseDepth, puff, knock, knockTop, rattle, knockDepth, knocks, miss, bonnet, level],
    drive({ fire = 0, level: amount = 0, rough = 0 } = {}, when = ctx.currentTime) {
      const f = Math.max(0, fire);
      body.frequency.setTargetAtTime(f / 4, when, .06); pulse.frequency.setTargetAtTime(f, when, .06);
      huntDepth.gain.setTargetAtTime(f / 4 * .012, when, .3);
      level.gain.setTargetAtTime(Math.max(0, amount) * LOUDNESS, when, .05);
      // Misses are set a little ahead, one firing at a time.
      if (!(nextFire > when - .25)) nextFire = when;
      if (f < 2) return;
      while (nextFire < when + .12) {
        const period = 1 / f;
        if (rough > 0 && rand() < rough) { miss.gain.setValueAtTime(.12, nextFire); miss.gain.setValueAtTime(1.4, nextFire + period); miss.gain.setValueAtTime(1, nextFire + period * 2); nextFire += period * 2; }
        else nextFire += period;
      }
    },
  };
}
