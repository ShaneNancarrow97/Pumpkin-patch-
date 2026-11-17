// A wall face painted cell by cell, then built as few boxes as it can be:
// shared by the rooms (interiors.js) and the farm's buildings (cottage.js).
const mix = (a, b, t) => {
  const ar = a >> 16, ag = (a >> 8) & 255, ab = a & 255;
  return (Math.round(ar + ((b >> 16) - ar) * t) << 16) | (Math.round(ag + (((b >> 8) & 255) - ag) * t) << 8) | Math.round(ab + ((b & 255) - ab) * t);
};
export const shadeHex = (c, t) => mix(c, 0x000000, t);
const shade = shadeHex;

// One wall's face, painted cell by cell at V: each cell an ink, [colour, how
// far it stands out of the wall (below 0 is set back), glows]; empty cells are
// holes. Built as boxes merged along each row and then up the rows wherever
// neighbours match, so a plain run of wall is one box.
export class Face {
  constructor(cols, rows, size) {
    Object.assign(this, { cols, rows, size, colour: new Int32Array(cols * rows).fill(-1), out: new Float32Array(cols * rows), glow: new Uint8Array(cols * rows) });
  }
  set(i, j, ink) {
    if (!ink || i < 0 || j < 0 || i >= this.cols || j >= this.rows) return;
    const k = j * this.cols + i;
    this.colour[k] = ink[0]; this.out[k] = ink[1]; this.glow[k] = ink[2] ? 1 : 0;
  }
  rect(i0, j0, i1, j1, ink) { for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) this.set(i, j, ink); }
  // Cuts a hole wherever test(i, j) is true.
  cut(i0, j0, i1, j1, test) {
    for (let j = Math.max(0, j0); j < Math.min(this.rows, j1); j++) for (let i = Math.max(0, i0); i < Math.min(this.cols, i1); i++) if (test(i, j)) this.colour[j * this.cols + i] = -1;
  }
  // Paints a block from a function of each cell, which returns an ink or nothing.
  paint(i0, j0, i1, j1, fn) {
    for (let j = Math.max(0, j0); j < Math.min(this.rows, j1); j++) for (let i = Math.max(0, i0); i < Math.min(this.cols, i1); i++) this.set(i, j, fn(i, j));
  }
  // Darkens cells by fn(i, j), except what glows or stands well out into the light.
  shade(fn) {
    for (let k = 0; k < this.colour.length; k++) {
      if (this.colour[k] < 0 || this.glow[k] || this.out[k] > 0.15) continue;
      const a = fn(k % this.cols, Math.floor(k / this.cols));
      if (a > 0) this.colour[k] = shade(this.colour[k], a);
    }
  }
  build(put) {
    const { cols, rows, colour, out, glow } = this, same = (a, b) => colour[a] === colour[b] && out[a] === out[b] && glow[a] === glow[b];
    const V = this.size, flush = (r) => put(r.i * V, r.j * V, (r.e - r.i) * V, r.h * V, out[r.k], colour[r.k], glow[r.k] === 1);
    let open = new Map();
    for (let j = 0; j < rows; j++) {
      const next = new Map();
      for (let i = 0; i < cols;) {
        const k = j * cols + i;
        if (colour[k] < 0) { i++; continue; }
        let e = i + 1;
        while (e < cols && same(k, j * cols + e)) e++;
        const key = i * 4096 + e, below = open.get(key);
        if (below && same(below.k, k)) { below.h++; open.delete(key); next.set(key, below); } else next.set(key, { i, e, j, h: 1, k });
        i = e;
      }
      open.forEach(flush);
      open = next;
    }
    open.forEach(flush);
  }
}
