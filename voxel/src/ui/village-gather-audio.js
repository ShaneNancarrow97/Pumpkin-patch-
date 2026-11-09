// Short material sounds share the game's context, noise buffer and limiter.
// This module never opens audio or advances a gathering job itself.
export const GATHER_AUDIO_LIMIT = 8;
const materialKinds = Object.freeze({ logs: "wood", hardwood: "wood", stone: "stone", iron: "stone", moonstone: "stone", clay: "stone", "star-amber": "stone", fibre: "plant", herbs: "plant", "moth-silk": "plant", emberbloom: "plant", "cursed-spores": "blackroot", blackroot: "blackroot", blight: "blackroot" });
export const gatherAudioKind = material => typeof material === "string" ? Object.hasOwn(materialKinds, material) ? materialKinds[material] : material.startsWith("blight:") ? "blackroot" : "" : "";
const tone = (frequency, end, duration, amp, type = "sine", offset = 0) => ({ source: "tone", frequency, end, duration, amp, type, offset, filter: "lowpass", cutoff: 4200 });
const rustle = (cutoff, duration, amp, filter = "bandpass", offset = 0, q = .7) => ({ source: "noise", cutoff, duration, amp, filter, offset, q });
const scores = {
  wood: {
    start: [rustle(850, .09, .012, "lowpass")],
    strike: [tone(176, 62, .14, .048, "triangle"), rustle(1100, .065, .031, "bandpass", .005), tone(670, 260, .055, .012, "triangle", .02)],
    complete: [rustle(1500, .13, .023, "highpass"), tone(260, 115, .09, .017, "triangle", .018)],
  },
  stone: {
    start: [rustle(1450, .065, .009, "highpass")],
    strike: [tone(1480, 1090, .13, .022), tone(660, 330, .085, .014, "triangle", .006), rustle(2600, .04, .025, "highpass")],
    complete: [rustle(1700, .14, .019, "highpass"), tone(1070, 720, .08, .012, "sine", .01)],
  },
  plant: {
    start: [rustle(1200, .08, .011)],
    strike: [rustle(1950, .115, .027), tone(330, 155, .07, .015, "triangle", .012)],
    complete: [rustle(1650, .15, .025, "highpass"), rustle(700, .085, .015, "bandpass", .035)],
  },
  blackroot: {
    start: [rustle(430, .11, .015, "lowpass")],
    strike: [rustle(480, .19, .034, "lowpass"), tone(142, 48, .16, .028), rustle(1140, .075, .02, "bandpass", .025, .45)],
    complete: [rustle(570, .22, .036, "lowpass"), tone(92, 52, .13, .023, "sine", .025)],
  },
};
for (const score of Object.values(scores)) for (const rows of Object.values(score)) { rows.forEach(Object.freeze); Object.freeze(rows); }

// A fixed node gets a subtle fixed pitch variation, without random audio drift.
export function villageGatherScore(material, phase, id = "") {
  const kind = gatherAudioKind(material), rows = scores[kind]?.[phase]; if (!rows) return [];
  let hash = 17; for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const pitch = .97 + (hash % 7) * .01;
  return rows.map(row => ({ ...row, ...(row.source === "tone" ? { frequency: row.frequency * pitch, end: row.end * pitch } : { cutoff: row.cutoff * pitch }) }));
}

export function createVillageGatherAudio({ getAudio, enabled = () => true } = {}) {
  const voices = new Set(); let job = null, strikes = 0;
  const key = event => event.job ?? event.id;
  const matches = event => job && key(event) === job.key && event.id === job.id;
  function release(voice, stop = false) {
    if (!voices.delete(voice)) return;
    if (stop) {
      try { voice.gain.gain.cancelScheduledValues(voice.ctx.currentTime); voice.gain.gain.setValueAtTime(.0001, voice.ctx.currentTime); voice.source.stop(voice.ctx.currentTime); } catch {}
    }
    for (const node of [voice.source, voice.filter, voice.gain]) { try { node.disconnect(); } catch {} }
  }
  function stop() { for (const voice of [...voices]) release(voice, true); job = null; strikes = 0; }
  function play(system, score) {
    const { ctx, output, noise } = system; if (!ctx || !output || !noise || ctx.state === "closed") return false;
    for (const note of score) {
      while (voices.size >= GATHER_AUDIO_LIMIT) release(voices.values().next().value, true);
      const source = note.source === "noise" ? ctx.createBufferSource() : ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      const at = ctx.currentTime + note.offset;
      filter.type = note.filter; filter.frequency.setValueAtTime(note.cutoff, at); if (filter.Q) filter.Q.value = note.q ?? .7;
      if (note.source === "noise") source.buffer = noise;
      else { source.type = note.type; source.frequency.setValueAtTime(note.frequency, at); source.frequency.exponentialRampToValueAtTime(note.end, at + note.duration); }
      gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(note.amp, at + .004); gain.gain.exponentialRampToValueAtTime(.0001, at + note.duration);
      source.connect(filter).connect(gain).connect(output);
      const voice = { source, filter, gain, ctx }; voices.add(voice); source.onended = () => release(voice);
      try { source.start(at); source.stop(at + note.duration + .02); } catch { release(voice, true); }
    }
    return true;
  }
  return {
    event(event = {}) {
      if (event.phase === "cancel") { if (event.id == null || matches(event)) stop(); return false; }
      if (!["start", "strike", "complete"].includes(event.phase) || typeof event.id !== "string" || !event.id) return false;
      const score = villageGatherScore(event.material, event.phase, event.id); if (!score.length) return false;
      if (!enabled()) { stop(); return false; }
      if (event.phase === "start") { if (matches(event)) return false; stop(); job = { key: key(event), id: event.id }; }
      else if (!matches(event) || event.phase === "strike" && strikes >= 3) return false;
      if (event.phase === "strike") strikes++;
      if (event.phase === "complete") job = null;
      try { const system = getAudio?.(); if (!system || !play(system, score)) { stop(); return false; } return true; } catch { stop(); return false; }
    }, stop,
    get status() { return { voices: voices.size, limit: GATHER_AUDIO_LIMIT, job: job?.id ?? null, strikes }; },
  };
}
