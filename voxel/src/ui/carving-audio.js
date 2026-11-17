// Sounds at the carving bench, made on the spot (no samples or network): the
// saw's rasp while the knife moves, a pop as a piece pushes out and a thud as
// it lands, the scoop's squelch, the peeler's whisper, a match struck and the
// candle catching, seeds ticking into the bowl, and crickets in the garden.
// Everything follows the sound setting.
export function createCarvingAudio(prefs = {}) {
  let ctx = null, master = null, noise = null, saw = null, crickets = null, chirpAt = 0;
  const on = () => prefs.sound !== false && !document.hidden;
  function ensure() {
    if (!on()) return false;
    if (!ctx) {
      const AudioContext = globalThis.window?.AudioContext || globalThis.window?.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = .55;
      const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -16; limiter.ratio.value = 6;
      master.connect(limiter).connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const data = noise.getChannelData(0); let seed = 4243;
      for (let i = 0; i < data.length; i++) { seed = seed * 16807 % 2147483647; data[i] = seed / 1073741823.5 - 1; }
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return true;
  }
  // A filtered burst of noise, its filter sweeping from f0 to f1.
  function burst({ f0, f1 = f0, q = 1, type = "bandpass", dur = .12, amp = .2, delay = 0 }) {
    const t = ctx.currentTime + delay, src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = noise; src.loopStart = Math.random(); filter.type = type; filter.Q.value = q;
    filter.frequency.setValueAtTime(f0, t); filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    gain.gain.setValueAtTime(.0001, t); gain.gain.linearRampToValueAtTime(amp, t + Math.min(.01, dur / 4)); gain.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(filter).connect(gain).connect(master); src.start(t, Math.random() * 1.5); src.stop(t + dur + .02);
    src.onended = () => { src.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  function tone({ f0, f1 = f0, dur = .15, amp = .15, type = "sine", delay = 0 }) {
    const t = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    gain.gain.setValueAtTime(.0001, t); gain.gain.linearRampToValueAtTime(amp, t + .008); gain.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(gain).connect(master); osc.start(t); osc.stop(t + dur + .02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  // The rasp is one looping noise through a band filter; its level and pitch follow the knife.
  function rasp(level, pitch, q) {
    if (!saw) {
      const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), wobble = ctx.createOscillator(), depth = ctx.createGain();
      src.buffer = noise; src.loop = true; filter.type = "bandpass"; gain.gain.value = 0;
      // The teeth: a quick wobble in level, like a saw's strokes.
      wobble.frequency.value = 13; depth.gain.value = 0; wobble.connect(depth).connect(gain.gain);
      src.connect(filter).connect(gain).connect(master); src.start(); wobble.start();
      saw = { src, filter, gain, depth };
    }
    const t = ctx.currentTime;
    saw.filter.frequency.setTargetAtTime(pitch, t, .03); saw.filter.Q.setTargetAtTime(q, t, .05);
    saw.gain.gain.setTargetAtTime(level, t, .04); saw.depth.gain.setTargetAtTime(level * .6, t, .04);
  }
  return {
    // speed: how fast the knife moves across the rind, 0 upwards.
    scrape(speed, kind = "knife") { if (!ensure()) return; const k = Math.min(1, speed); kind === "peel" ? rasp(k * .09, 5200 + k * 2400, 2.2) : kind === "scoop" ? rasp(k * .12, 520 + k * 300, 1.4) : rasp(k * .14, 1700 + k * 2600, 1.1); },
    rest() { if (saw && ctx) { const t = ctx.currentTime; saw.gain.gain.setTargetAtTime(0, t, .05); saw.depth.gain.setTargetAtTime(0, t, .05); } },
    pop() { if (!ensure()) return; tone({ f0: 150, f1: 58, dur: .2, amp: .3 }); burst({ f0: 900, f1: 240, type: "lowpass", dur: .16, amp: .28 }); burst({ f0: 2400, f1: 1200, q: 3, dur: .07, amp: .1, delay: .02 }); },
    thud() { if (!ensure()) return; tone({ f0: 95, f1: 48, dur: .14, amp: .26 }); burst({ f0: 420, f1: 160, type: "lowpass", dur: .1, amp: .22 }); },
    lid() { if (!ensure()) return; tone({ f0: 210, f1: 90, dur: .22, amp: .2 }); burst({ f0: 700, f1: 300, type: "lowpass", dur: .2, amp: .22 }); burst({ f0: 3200, f1: 1800, q: 4, dur: .06, amp: .07, delay: .04 }); },
    squelch() { if (!ensure()) return; burst({ f0: 700 + Math.random() * 300, f1: 260, q: 2.5, dur: .2, amp: .22 }); tone({ f0: 240 + Math.random() * 60, f1: 120, dur: .14, amp: .08, type: "triangle", delay: .03 }); },
    seed() { if (!ensure()) return; tone({ f0: 1700 + Math.random() * 700, dur: .035, amp: .035, type: "triangle" }); },
    match() { if (!ensure()) return; burst({ f0: 4200, f1: 2600, q: .8, type: "highpass", dur: .09, amp: .28 }); for (let i = 0; i < 7; i++) burst({ f0: 3000 + Math.random() * 3000, q: 5, dur: .02, amp: .07, delay: .08 + i * .045 + Math.random() * .03 }); burst({ f0: 300, f1: 1400, type: "lowpass", dur: .5, amp: .12, delay: .1 }); },
    catch() { if (!ensure()) return; burst({ f0: 160, f1: 1100, type: "lowpass", dur: .55, amp: .32 }); tone({ f0: 70, f1: 110, dur: .5, amp: .12 }); },
    sparkle() { if (!ensure()) return; [1568, 2093, 2637].forEach((f, i) => tone({ f0: f, dur: .4, amp: .03, type: "triangle", delay: i * .07 })); },
    // The garden's crickets, chirping in little trills while the bench is open.
    garden(open) {
      if (!open) { clearInterval(crickets); crickets = null; this.rest(); return; }
      if (crickets) return;
      crickets = setInterval(() => {
        if (!on() || !ctx || performance.now() < chirpAt) return;
        chirpAt = performance.now() + 1400 + Math.random() * 2600;
        const f = 4100 + Math.random() * 500;
        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) tone({ f0: f, dur: .045, amp: .012, delay: i * .07 });
      }, 250);
    },
  };
}
