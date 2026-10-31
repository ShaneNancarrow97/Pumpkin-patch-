// Standard MIDI (format 0/1, PPQ): running status, tempo maps, sustain, program
// changes and percussion. Pure decoding, independent of Web Audio and the DOM.
export function decodeMidi(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 0;
  const text = (n) => { const s = String.fromCharCode(...bytes.slice(pos, pos + n)); pos += n; return s; };
  const u16 = () => { const n = view.getUint16(pos); pos += 2; return n; };
  const u32 = () => { const n = view.getUint32(pos); pos += 4; return n; };
  const variable = () => { let n = 0; for (let i = 0; i < 4; i++) { const b = bytes[pos++]; if (b === undefined) throw Error("Incomplete MIDI"); n = n * 128 + (b & 127); if (!(b & 128)) return n; } throw Error("Invalid MIDI tick"); };
  if (text(4) !== "MThd") throw Error("Missing MIDI header");
  const header = u32(), format = u16(), tracks = u16(), ppq = u16();
  if (header < 6 || format > 1 || !ppq || ppq & 0x8000) throw Error("Unsupported MIDI timing");
  pos += header - 6;
  const events = [], tempos = [{ tick: 0, tempo: 500000 }];
  let endTick = 0;
  for (let track = 0; track < tracks; track++) {
    if (text(4) !== "MTrk") throw Error("Missing MIDI track");
    const length = u32(), end = pos + length;
    if (end > bytes.length) throw Error("Incomplete MIDI track");
    let tick = 0, running = 0;
    while (pos < end) {
      tick += variable(); let status = bytes[pos++];
      if (status < 128) { if (!running) throw Error("Invalid MIDI running status"); pos--; status = running; }
      if (status === 255) {
        const type = bytes[pos++], n = variable();
        if (type === 81 && n === 3) tempos.push({ tick, tempo: (bytes[pos] << 16) + (bytes[pos + 1] << 8) + bytes[pos + 2] });
        pos += n; if (type === 47) break;
      } else if (status === 240 || status === 247) { const n = variable(); pos += n; running = 0; }
      else if (status < 240) {
        running = status; const kind = status >> 4, ch = status & 15, a = bytes[pos++], b = kind === 12 || kind === 13 ? 0 : bytes[pos++];
        events.push({ tick, kind, ch, a, b, track });
      } else throw Error("Unsupported MIDI event");
    }
    endTick = Math.max(endTick, tick); pos = end;
  }
  tempos.sort((a, b) => a.tick - b.tick);
  let secs = 0, prevTick = 0, tempo = 500000;
  const map = tempos.map((t) => { secs += (t.tick - prevTick) * tempo / ppq / 1e6; prevTick = t.tick; tempo = t.tempo || 500000; return { ...t, seconds: secs, tempo }; });
  const seconds = (tick) => { let i = map.length - 1; while (i && map[i].tick > tick) i--; const t = map[i]; return t.seconds + (tick - t.tick) * t.tempo / ppq / 1e6; };
  events.sort((a, b) => a.tick - b.tick || a.track - b.track);
  const active = new Map(), sustain = Array(16).fill(false), programmes = Array(16).fill(0), volume = Array(16).fill(100), notes = [];
  const finish = (key, tick) => { const queue = active.get(key); if (!queue?.length) return; const n = queue.shift(); const duration = Math.max(.04, Math.min(12, seconds(tick) - n.time)); notes.push({ ...n, duration }); if (!queue.length) active.delete(key); };
  for (const e of events) {
    if (e.kind === 12) programmes[e.ch] = e.a;
    if (e.kind === 11 && e.a === 7) volume[e.ch] = e.b;
    if (e.kind === 11 && e.a === 64) { sustain[e.ch] = e.b >= 64; if (!sustain[e.ch]) for (const [key, q] of active) if (q[0]?.ch === e.ch) while (q.some((n) => n.released)) { const at = q.findIndex((n) => n.released); if (at > 0) [q[0], q[at]] = [q[at], q[0]]; finish(key, e.tick); } }
    const key = e.ch + ":" + e.a;
    if (e.kind === 9 && e.b) {
      const q = active.get(key) ?? [];
      q.push({ time: seconds(e.tick), pitch: e.a, velocity: e.b / 127 * volume[e.ch] / 127, ch: e.ch, program: programmes[e.ch] }); active.set(key, q);
    } else if (e.kind === 8 || e.kind === 9 && !e.b) {
      const q = active.get(key);
      if (sustain[e.ch] && q?.length) { const n = q.find((n) => !n.released); if (n) n.released = true; }
      else finish(key, e.tick);
    }
    if (e.kind === 11 && [120, 123].includes(e.a)) for (const [key, q] of active) if (q[0]?.ch === e.ch) while (q.length) finish(key, e.tick);
  }
  for (const [key, q] of active) while (q.length) finish(key, endTick);
  notes.sort((a, b) => a.time - b.time);
  return { notes, duration: Math.max(1, seconds(endTick), ...notes.map((n) => n.time + n.duration)) };
}
