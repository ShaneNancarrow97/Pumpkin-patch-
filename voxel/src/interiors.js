import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { GRID } from "./model.js";
import { Face as Panel } from "./face.js";
class Face extends Panel { constructor(cols, rows = ROWS) { super(cols, rows, V); } }

// Inside the cottage and the shop: voxel dioramas seen from the front, like
// the main game's painted rooms, with the front wall lifted away. Rooms are
// built at eight times the overworld's voxel density (V = 1/16 unit) so they
// can carry that detail: fluted columns, panelled wainscot, a cornice with
// dentils, traceried windows onto the night, and wallpaper you can feel.
// Each wall is painted cell by cell like pixel art (Face), then built from
// boxes merged wherever neighbouring cells match, so the cost follows the
// detail rather than the area.
// A room's floor is GRID.w x GRID.d units from (0, 0) at the back-left corner;
// the back wall stands along z = 0, the side walls along x = 0 and x = GRID.w.
export const V = 0.0625;
// The room being built: the little cottage's 10 x 6 parlour unless the house
// layout says otherwise (rooms grow with the house). The shop is always GRID.
let R = GRID;
export const WALL_H = 5.2;
const T = 0.25;                                                     // wall thickness
const ROWS = Math.ceil(WALL_H / V);                                 // the top row tucks under the cap
const cell = (x) => Math.round(x / V);
// The wall's bands, in rows from the floor: skirting and panelled wainscot up
// to the chair rail, the field (paper or plaster), then dentils and cornice,
// and the frieze up to the cap.
const ROW = { rail: 20, field: 23, cornice: 68, frieze: 75 };
// The camera indoors: in front, a little above, looking down into the room.
export const INTERIOR = { pitch: THREE.MathUtils.degToRad(26), fov: 40, lean: 0.12 };

// Each style's palette and features, after the main game's ten room paintings.
const STYLES = {
  "parlour-warm": { wall: 0xdcc39c, wall2: 0xd2b78f, wood: 0x6a4428, dark: 0x3e2716, trim: 0x8a5a36, floor: 0x7a4a2a, window: "round" },
  "parlour-crooked": { wall: 0x7d7c48, wall2: 0x737240, wood: 0x5a3a22, dark: 0x34221a, trim: 0x8a6a36, floor: 0x744628, window: "round", sconces: true },
  "parlour-manor": { wall: 0x5c2232, wall2: 0x521d2c, wood: 0x4a2418, dark: 0x2a1410, trim: 0xc9a050, floor: 0x6a3c22, window: "gothic", chandelier: true, sconces: true, damask: true },
  "parlour-haunted": { wall: 0x4a2440, wall2: 0x42203a, wood: 0x5a3220, dark: 0x2a1610, trim: 0xb07a3a, floor: 0x5e3420, window: "gothic", cobwebs: true, candles: true, arches: true, damask: true },
  "bedroom-base": { wall: 0xc08c7c, wall2: 0xb88474, wood: 0x6a4428, dark: 0x3e2716, trim: 0x8a5a36, floor: 0x7a4a2a, window: "round", curtains: 0x6e1f30 },
  "bedroom-celestial": { wall: 0x2f2b55, wall2: 0x2a264d, wood: 0x3a2a3a, dark: 0x22182a, trim: 0xc9a050, floor: 0x6e4226, window: "gothic", curtains: 0x4e2c72, stars: true, chandelier: true },
  "kitchen-base": { wall: 0xdcc8a6, wall2: 0xd2bd99, wood: 0x6a4428, dark: 0x3e2716, trim: 0x8a5a36, floor: 0x7a4a2a, window: "square", hearth: "stone", jars: true },
  "kitchen-apothecary": { wall: 0x3f5c40, wall2: 0x36523a, wood: 0x4a3020, dark: 0x2e2018, trim: 0xb0683a, floor: 0x6e4428, window: "square", hearth: "copper", jars: true, tiles: true, herbs: true },
  "attic-base": { wall: 0xd6c29e, wall2: 0xcbb690, wood: 0x6a4428, dark: 0x4a2e1c, trim: 0x7a5236, floor: 0x7a4a2a, window: "round", rafters: true, roundWindow: true, cobwebs: true },
  "attic-starlight": { wall: 0x36426e, wall2: 0x303b64, wood: 0x4a3020, dark: 0x2e1e14, trim: 0x8a6a3a, floor: 0x6e4428, window: "gothic", rafters: true, roundWindow: true, stars: true, fairyLights: true },
};
// Colours mixed in sRGB, channel by channel, as a painter would mix them.
const mix = (a, b, t) => {
  const ch = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
const shade = (c, t) => mix(c, 0x000000, t), tint = (c, t) => mix(c, 0xffffff, t);
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// Smooth value noise, for plaster that blotches like limewash.
function noise(x, y) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}

// How far a cell is from a shape's edge, up to n: the nearest ring of cells
// around it where test() gives `want` (1 = next door), or 0 if none.
function ring(test, i, j, n, want) {
  for (let k = 1; k <= n; k++) for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) if ((Math.abs(a) === k || Math.abs(b) === k) && test(i + a, j + b) === want) return k;
  return 0;
}
// Soft shadow into the corners and down to the floor, in steps of a few cells
// so neighbours still merge.
const crease = (d) => (d < 3 ? 0.2 : d < 7 ? 0.1 : d < 12 ? 0.04 : 0);
const soft = (d, j) => 1 - (1 - crease(d)) * (1 - crease(j));

// A wallpaper tile of P x Q cells, drawn with a few strokes and wrapped so it
// repeats seamlessly; x right, y up. Each cell holds an ink.
function tile(P, Q) {
  const cells = new Array(P * Q).fill(null), wrap = (n, m) => ((Math.round(n) % m) + m) % m;
  const t = {
    at: (i, j) => cells[wrap(j, Q) * P + wrap(i, P)],
    plot(x, y, ink) { if (ink) cells[wrap(y, Q) * P + wrap(x, P)] = ink; },
    // Pixel art as rows of text, top down, centred on (x, y).
    text(art, inks, x, y, flip = 1) { art.forEach((row, r) => [...row].forEach((ch, c) => t.plot(x + flip * (c - (row.length >> 1)), y + (art.length >> 1) - r, inks[ch]))); },
    line(x0, y0, x1, y1, ink) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) || 1; for (let s = 0; s <= n; s++) t.plot(x0 + ((x1 - x0) * s) / n, y0 + ((y1 - y0) * s) / n, ink); },
    // A curve from a to c, pulled towards b.
    curve([a, b, c], ink) { for (let s = 0; s <= 48; s++) { const u = s / 48, p = (1 - u) ** 2, q = 2 * u * (1 - u), w = u * u; t.plot(p * a[0] + q * b[0] + w * c[0], p * a[1] + q * b[1] + w * c[1], ink); } },
    ring(x, y, rx, ry, ink, a0 = 0, a1 = Math.PI * 2) { const n = Math.ceil((rx + ry) * 6); for (let s = 0; s <= n; s++) { const a = a0 + ((a1 - a0) * s) / n; t.plot(x + Math.cos(a) * rx, y + Math.sin(a) * ry, ink); } },
    disc(x, y, rx, ry, ink, keep = () => true) {
      for (let j = Math.ceil(y - ry); j <= y + ry; j++) for (let i = Math.ceil(x - rx); i <= x + rx; i++) if (((i - x) / rx) ** 2 + ((j - y) / ry) ** 2 <= 1 && keep(i - x, j - y)) t.plot(i, j, ink);
    },
    // A four-pointed star: a bright heart, arms fading out.
    sparkle(x, y, arm, bright, dim) { t.plot(x, y, bright); for (let k = 1; k <= arm; k++) for (const [a, b] of [[k, 0], [-k, 0], [0, k], [0, -k]]) t.plot(x + a, y + b, k < arm ? bright : dim); },
  };
  return t;
}

const FLEUR = [
  ".......G.......",
  "......GGG......",
  "......GgG......",
  ".....GGgGG.....",
  ".....GgggG.....",
  ".GG..GgggG..GG.",
  "GggG.GgggG.GggG",
  "Gg.GGGgggGGG.gG",
  "G...GGGgGGG...G",
  ".G...GGgGG...G.",
  "..G..GGgGG..G..",
  "GGGGGGGGGGGGGGG",
  "GgggggggggggggG",
  "GGGGGGGGGGGGGGG",
  "...GG.GgG.GG...",
  "..GG..GgG..GG..",
  ".GG...GgG...GG.",
  ".G.....G.....G.",
  "......GGG......",
];
const MOTH = [
  "......A...A......",
  ".......A.A.......",
  "wwwww...B...wwwww",
  "wWWWWWw.B.wWWWWWw",
  "wWWWoWWwBwWWoWWWw",
  ".wWoeoWWBWWoeoWw.",
  ".wWWoWWWBWWWoWWw.",
  "..wWWWWwBwWWWWw..",
  "...wwwwwBwwwww...",
  "....wWWwBwWWw....",
  "...wWWWWBWWWWw...",
  "...wWwWwBwWwWw...",
  "....ww..B..ww....",
];
const GHOST = [
  ".....GGG.....",
  "...GGGGGGG...",
  "..GGGGGGGGg..",
  "..GGoGGGoGg..",
  ".GGGoGGGoGGg.",
  ".GGcGGGGGcGg.",
  ".GGGGGmGGGGg.",
  "GGGGGGmGGGGGg",
  ".GGGGGGGGGGg.",
  ".GGGGGGGGGGg.",
  ".GGGGGGGGGGg.",
  ".GGGGGGGGGgg.",
  ".GG.GGG.GGgg.",
  ".G...G...Gg..",
];
// Fleurs-de-lis on the main points of a half-drop, lozenges between.
function damask(t, G, g) {
  for (const [x, y] of [[8, 8], [24, 24]]) t.text(FLEUR, { G, g }, x, y);
  for (const [x, y] of [[24, 8], [8, 24]]) { t.disc(x, y, 2.2, 2.2, g, (a, b) => Math.abs(a) + Math.abs(b) <= 2); t.plot(x, y, G); }
  return t;
}
// A constellation: faint threads, then its stars, the brightest with arms.
function constellation(t, pts, gold, dim, thread) {
  for (let k = 1; k < pts.length; k++) t.line(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], thread);
  pts.forEach(([x, y], k) => t.sparkle(x, y, k % 3 === 0 ? 1 : 0, gold, dim));
}

// The eight wallpapers, after the main game's tiles in their catalogue colours:
// each motif drawn at V in the originals' line colours, standing a little proud.
const PAPERS = {
  // Midnight damask: gold fleurs-de-lis and lozenges.
  w01: (base) => damask(tile(32, 32), [mix(0xbfad84, base, 0.1), 0.035], [mix(0x88775f, base, 0.15), 0.02]),
  // Moss and moths: pale moths with eyed wings; sprigs of moss between.
  w02(base) {
    const t = tile(32, 32), B = [0xd5c398, 0.045], inks = { W: [mix(0xb4ba8e, base, 0.1), 0.03], w: [mix(0xb4ba8e, base, 0.45), 0.025], B, A: [mix(0xd5c398, base, 0.2), 0.03], o: [shade(base, 0.4), 0.03], e: [0xe8dcb0, 0.04] };
    const moss = [mix(0x7a8a4a, base, 0.35), 0.02], tip = [mix(0xb4ba8e, base, 0.25), 0.025];
    for (const [x, y] of [[8, 8], [24, 24]]) t.text(MOTH, inks, x, y);
    for (const [x, y] of [[24, 8], [8, 24]]) {
      t.line(x, y - 3, x, y + 1, moss); t.line(x, y - 1, x - 2, y + 1, moss); t.line(x, y - 2, x + 2, y, moss);
      t.plot(x, y + 2, tip); t.plot(x - 2, y + 2, tip); t.plot(x + 2, y + 1, tip);
    }
    return t;
  },
  // Pumpkin toile: pumpkins drawn in cream line with ribs, a curling stem and
  // a leaf, between parentheses of vine; a sprig of three berries between.
  w03(base) {
    const t = tile(36, 36), line = [mix(0xe6ca9b, base, 0.1), 0.03], rib = [mix(0xe6ca9b, base, 0.35), 0.025], stem = [0xcfce9b, 0.04];
    const vine = [mix(0xdcb384, base, 0.15), 0.025], leaf = [mix(0xcfce9b, base, 0.3), 0.03];
    for (const [x, y] of [[9, 9], [27, 27]]) {
      t.disc(x, y - 1, 6.5, 5, [mix(0xe6ca9b, base, 0.82), 0.012]);
      t.ring(x, y - 1, 3, 5, rib); t.ring(x, y - 1, 0.6, 5, rib, Math.PI / 2, Math.PI * 1.5);
      t.ring(x, y - 1, 6.5, 5, line);
      t.line(x, y + 4, x, y + 6, stem); t.curve([[x, y + 6], [x + 0.5, y + 8], [x + 2.5, y + 7.5]], stem);
      t.disc(x - 2.2, y + 6.2, 1.8, 0.9, leaf);
      for (const s of [-1, 1]) {
        t.curve([[x + s * 8.5, y - 6], [x + s * 12.5, y - 1], [x + s * 8.5, y + 5]], vine);
        t.ring(x + s * 7.5, y + 5.5, 1, 1, vine, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI : Math.PI * 2);
      }
    }
    for (const [x, y] of [[27, 9], [9, 27]]) { t.line(x, y - 2, x, y + 1, vine); for (const [a, b] of [[-1, 2], [1, 2], [0, 3]]) t.plot(x + a, y + b, line); }
    return t;
  },
  // Plum constellations: lilac crescent moons with sparkles; between them,
  // stars joined by faint threads.
  w04(base) {
    const t = tile(32, 32), moon = [mix(0xbda4bf, base, 0.1), 0.035], gold = [0xceb688, 0.04], dim = [mix(0xceb688, base, 0.5), 0.02], thread = [mix(0xceb688, base, 0.75), 0.006];
    for (const [x, y] of [[8, 8], [24, 24]]) {
      t.disc(x, y, 5.5, 5.5, moon, (a, b) => (a - 2.6) ** 2 + (b - 1.2) ** 2 > 4.6 ** 2);
      t.sparkle(x + 7, y + 6, 2, gold, dim); t.sparkle(x - 6, y - 6, 1, gold, dim); t.plot(x + 7, y - 4, gold);
    }
    constellation(t, [[19, 4], [22, 7], [26, 6], [29, 10], [27, 13]], gold, dim, thread);
    constellation(t, [[3, 21], [6, 25], [10, 26], [12, 22], [8, 19]], gold, dim, thread);
    return t;
  },
  // Cobweb lace: webs of fine silver thread; a spider hangs between some.
  w05(base) {
    const t = tile(32, 32), silk = [mix(0xc5bbc5, base, 0.15), 0.025], fine = [mix(0xc5bbc5, base, 0.45), 0.015], body = [shade(base, 0.55), 0.04];
    for (const [x, y] of [[8, 8], [24, 24]]) {
      for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; t.line(x, y, x + Math.cos(a) * 11.5, y + Math.sin(a) * 11.5, silk); }
      for (const [r, ink] of [[3.5, fine], [7, silk], [10.5, fine]]) for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4, b = a + Math.PI / 4, m = (a + b) / 2;
        t.curve([[x + Math.cos(a) * r, y + Math.sin(a) * r], [x + Math.cos(m) * r * 0.72, y + Math.sin(m) * r * 0.72], [x + Math.cos(b) * r, y + Math.sin(b) * r]], ink);
      }
    }
    for (const [x, y] of [[24, 8], [8, 24]]) {
      t.line(x, y + 7, x, y + 2, fine);
      for (const s of [-1, 1]) { t.line(x + s, y, x + s * 3, y + 2, body); t.line(x + s, y - 1, x + s * 3, y - 2, body); t.line(x + s, y + 1, x + s * 3, y + 3, body); }
      t.disc(x, y, 1, 1.4, body); t.plot(x, y + 2, body);
    }
    return t;
  },
  // Haunted library: shelves of books, their spines banded in gold and titled,
  // some standing proud, a few leaning in the gaps.
  w06(base) {
    const t = tile(192, 15), board = [shade(base, 0.45), 0.07], lip = [mix(0xc9b294, base, 0.55), 0.075];
    const tones = [0x7a2a2a, 0x2e4a3a, 0x3a3a6a, 0x8a6a2a, 0x5a2a4a, 0x6a4a3a].map((c) => mix(c, base, 0.3)), gold = mix(0xc9b294, base, 0.1), paper = mix(0xe8dcc0, base, 0.25);
    for (let x = 0; x < 192; x++) { t.plot(x, 0, board); t.plot(x, 1, lip); }
    for (let x = 0, n = 0; x < 186; n++) {
      const w = 2 + Math.floor(hash(n, 1) * 3), h = 8 + Math.floor(hash(n, 2) * 5), c = tones[Math.floor(hash(n, 3) * 6)], out = 0.022 + hash(n, 4) * 0.028;
      if (hash(n, 5) < 0.09) {                                         // a gap, with a book leaning across it
        for (let y = 0; y < 9; y++) for (let k = 0; k < 2; k++) t.plot(x + k + Math.floor(y * 0.45), 2 + y, [y === 7 ? gold : c, 0.03]);
        x += 6; continue;
      }
      for (let y = 0; y < h; y++) for (let k = 0; k < w; k++) {
        const band = y === 1 || y === h - 2, title = w > 2 ? k === 1 && Math.abs(y - (h >> 1)) <= 1 : k === 0 && y === h >> 1;
        t.plot(x + k, 2 + y, [band ? gold : title ? paper : c, out + (band ? 0.005 : 0)]);
      }
      x += w;
    }
    return t;
  },
  // Blackthorn botanical: thorny stems climbing in a sway, leaves with a
  // midrib, sloes and the odd white blossom.
  w07(base) {
    const t = tile(32, 32), stem = [mix(0x9b967c, base, 0.2), 0.03], leaf = [mix(0xb4b394, base, 0.15), 0.03], rib = [mix(0x9b967c, base, 0.4), 0.025];
    const thorn = [mix(0x9b967c, base, 0.05), 0.035], sloe = [0x3e3a62, 0.04], shine = [0x8a86b8, 0.045], petal = [0xe8e2d0, 0.04], eye = [0xd8b860, 0.045];
    for (const [x0, phase] of [[8, 0], [24, Math.PI]]) {
      const at = (y) => x0 + 2.5 * Math.sin((y * Math.PI * 2) / 32 + phase);
      for (let y = 0; y < 32; y++) t.line(at(y), y, at(y + 1), y + 1, stem);
      for (let n = 0; n < 4; n++) {
        const y = n * 8 + 4, s = n % 2 ? 1 : -1, x = at(y), dx = s * 0.82, dy = 0.57;
        for (let a = 0; a <= 6; a += 0.5) for (let b = -2.2; b <= 2.2; b += 0.5) if (Math.abs(b) < 2.2 * Math.sin((Math.PI * a) / 6)) t.plot(x + dx * a - dy * b * s, y + dy * a + dx * b * s, Math.abs(b) < 0.3 ? rib : leaf);
        t.plot(at(y - 4) - s, y - 4, thorn); t.plot(at(y - 4) - 2 * s, y - 3, thorn);
        if (n === 1) { t.disc(x - s * 2, y - 2, 1.1, 1.1, sloe); t.plot(x - s * 2 - 0.5, y - 1.5, shine); }
        if (n === 3) { for (const [a, b] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) t.plot(x - s * 3 + a, y + 1 + b, petal); t.plot(x - s * 3, y + 1, eye); }
      }
    }
    return t;
  },
  // Ghost garden: little ghosts with faces among curling fronds and flowers.
  w08(base) {
    const t = tile(32, 32), G = [mix(0xddd0cd, base, 0.08), 0.04], inks = { G, g: [mix(0xddd0cd, base, 0.38), 0.035], o: [0x2e2638, 0.045], m: [0x3a2e48, 0.045], c: [0xd8a0b8, 0.042] };
    const frond = [mix(0xb7a6b7, base, 0.15), 0.025], petal = [0xd88ab8, 0.035], heart = [0xf0d080, 0.04];
    const flower = (x, y) => { for (const [a, b] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) t.plot(x + a, y + b, petal); t.plot(x, y, heart); };
    for (const [x, y] of [[8, 8], [24, 24]]) {
      t.text(GHOST, inks, x, y);
      for (const s of [-1, 1]) { t.curve([[x + s * 8, y - 7], [x + s * 11.5, y - 3], [x + s * 8, y + 1]], frond); flower(x + s * 8, y + 2); }
    }
    for (const [x, y] of [[24, 8], [8, 24]]) { t.curve([[x, y - 4], [x - 1, y], [x - 2, y + 2]], frond); t.curve([[x, y - 4], [x + 1, y - 1], [x + 2, y + 1]], frond); flower(x - 2, y + 3); flower(x + 2, y + 2); }
    return t;
  },
};

// The field: the chosen wallpaper over a softly mottled ground, or the style's
// own wall: limewash in blotches like the paintings', faint damask, a starry
// night, or glazed tiles.
function papered(paper) {
  const t = PAPERS[paper.id]?.(paper.base), ground = [[shade(paper.base, 0.07), 0], [paper.base, 0]];
  return (i, j) => t?.at(i, j) ?? ground[noise(i / 14, j / 10) < 0.42 ? 0 : 1];
}
function plain(look, seed) {
  if (look.tiles) return tiles(look);
  const tones = [[mix(look.wall2, look.dark, 0.16), 0], [look.wall2, 0], [look.wall, 0], [tint(look.wall, 0.07), 0.008]], s = seed * 131;
  const plaster = (i, j) => {
    const n = noise((i + s) / 11, j / 8) * 0.7 + noise((i + s) / 4, j / 4) * 0.3;
    return tones[n < 0.33 ? 0 : n < 0.5 ? 1 : n < 0.68 ? 2 : 3];
  };
  if (look.damask) { const t = damask(tile(32, 32), [mix(look.wall, look.trim, 0.3), 0.015], [tint(look.wall, 0.06), 0.008]); return (i, j) => t.at(i, j) ?? plaster(i, j); }
  if (look.stars) { const t = starfield(look); return (i, j) => t.at(i, j + seed * 17) ?? plaster(i, j); }
  return plaster;
}
// Gold stars scattered on a jittered grid, a few crescents, and in the attic constellations.
function starfield(look) {
  const t = tile(48, 48), gold = [mix(look.wall, 0xf2d27a, 0.85), 0.04], dim = [mix(look.wall, 0xf2d27a, 0.45), 0.02], thread = [mix(look.wall, 0xf2d27a, 0.2), 0.006];
  for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
    const h = hash(a + 31, b + 17), x = a * 8 + 1 + Math.floor(hash(a, b + 5) * 6), y = b * 8 + 1 + Math.floor(hash(a + 9, b) * 6);
    if (h < 0.07) t.sparkle(x, y, 3, gold, dim); else if (h < 0.22) t.sparkle(x, y, 1, gold, dim); else if (h < 0.5) t.plot(x, y, dim);
  }
  for (const [x, y] of [[12, 34], [38, 12]]) t.disc(x, y, 2.6, 2.6, gold, (a, b) => (a - 1.4) ** 2 + (b - 0.8) ** 2 > 2.2 ** 2);
  if (look.fairyLights) { constellation(t, [[20, 40], [24, 43], [29, 42], [33, 45], [36, 41]], gold, dim, thread); constellation(t, [[4, 6], [7, 10], [12, 9], [14, 4]], gold, dim, thread); }
  return t;
}
// Glazed tiles, each a slightly different green, in grout, a few with a cross.
function tiles(look) {
  const grout = [shade(look.wall2, 0.3), 0], cross = [mix(look.wall, look.trim, 0.55), 0.03];
  return (i, j) => {
    const a = Math.floor(i / 6), b = Math.floor((j - ROW.field) / 6), x = i - a * 6, y = j - ROW.field - b * 6;
    if (x === 5 || y === 5) return grout;
    const h = hash(a, b + 40);
    if (h < 0.14 && (x === 2 || y === 2) && Math.abs(x - 2) + Math.abs(y - 2) <= 1) return cross;
    return [x === 0 && y === 4 ? tint(look.wall, 0.12) : mix(look.wall2, look.wall, h), 0.015];
  };
}

// One wall: back (along x at z = 0), left (along z at x = 0) or right (x = R.w).
// put(u, y, w, h, relief, colour, glow) places a block whose face stands `relief` out.
function wall(v, side) {
  if (side === "back") return (u, y, w, h, relief, c, glow) => v.box(u, y, -T, w, h, T + relief, c, glow);
  if (side === "left") return (u, y, w, h, relief, c, glow) => v.box(-T, y, u, T + relief, h, w, c, glow);
  return (u, y, w, h, relief, c, glow) => v.box(R.w - relief, y, u, T + relief, h, w, c, glow);
}

// The openings in the back wall, between the columns: where they are and their shape.
const windows = () => [{ cx: 1.625, moon: { x: 1.85, y: 3.55, r: 0.2 } }, { cx: R.w - 1.625 }];
const WIN = { w: 1.375, bottom: 1.625, spring: 3.125, top: 3.875 };
function inOpening(kind, dx, y) {
  const half = WIN.w / 2;
  if (Math.abs(dx) > half || y < WIN.bottom) return false;
  if (y <= WIN.spring) return true;
  const h = y - WIN.spring;
  if (kind === "square") return y <= WIN.top;
  if (kind === "round") return dx * dx + h * h <= half * half;
  const r = WIN.w * 0.75, off = r - half;                           // a pointed Gothic arch
  return (Math.abs(dx) + off) ** 2 + h * h <= r * r;
}

// Pines along the view, one every `gap`, of jittered height, in tiers.
function pine(u, h, gap, tall, base, seed) {
  const k = Math.round(u / gap);
  for (let n = k - 1; n <= k + 1; n++) {
    const x = n * gap + (hash(n, seed) - 0.5) * gap * 0.5, top = base + tall * (0.55 + hash(seed, n) * 0.45), down = top - h;
    if (down < 0) continue;
    const tier = (down % 0.16) / 0.16;
    if (Math.abs(u - x) < Math.min(gap * 0.8, down * 0.3 * (0.6 + tier * 0.5) + 0.02)) return true;
  }
  return false;
}
// The night through the glass at a point on the wall: a violet sky paling to a
// pink haze, stars, the moon with craters and a halo, a far ridge and two rows of pines.
function night(u, y, moon, floor = WIN.bottom) {
  const h = y - floor, b = Math.floor(Math.min(1, Math.max(0, h / 2.5)) * 12) / 12;
  let c = b < 0.25 ? mix(0x9a64b4, 0x6a4ab0, b * 4) : mix(0x6a4ab0, 0x221550, (b - 0.25) / 0.75);
  if (moon) {
    const d = Math.hypot(u - moon.x, y - moon.y);
    if (d < moon.r) return Math.hypot(u - moon.x + 0.07, y - moon.y - 0.05) < 0.055 || Math.hypot(u - moon.x - 0.06, y - moon.y + 0.07) < 0.045 ? 0xe8d49a : 0xfff2c8;
    if (d < moon.r + 0.14) c = mix(c, 0xd8c0ff, 0.28);
  }
  if (pine(u, h, 0.31, 0.62, 0, 3)) return 0x120e26;
  if (pine(u, h, 0.23, 0.5, 0.2, 11)) return 0x271c52;
  if (h < 0.6 + 0.22 * Math.abs(Math.sin(u * 1.7 + 0.6)) + 0.07 * Math.sin(u * 5.3)) return mix(0x3e2f78, c, 0.2);
  return hash(cell(u) + 7, cell(y)) < 0.022 ? 0xfff2c8 : c;
}
// What crosses the glass: the mullion, then Gothic tracery (two lancets under
// a ring), a round head's fan, or a cottage window's transom and glazing bars.
function tracery(kind, dx, y, look) {
  const wood = [mix(look.dark, look.trim, 0.3), -0.055], lead = [0x2a2032, -0.085], h = y - WIN.spring, ax = Math.abs(dx), half = WIN.w / 2;
  const lights = h < 0 && Math.floor((y - WIN.bottom) / V) % 7 === 6;
  if (kind === "gothic") {
    if (h < 0.06 && ax < V) return wood;
    if (h > 0) {
      const lh = half / 2, r = lh * 1.5, off = r - lh, f = Math.hypot(Math.abs(ax - lh) + off, h) - r;
      if (Math.abs(f) < 0.035 && h < 0.5) return wood;
      const o = Math.hypot(dx, h - 0.72);
      if (Math.abs(o - 0.19) < 0.035 || (o < 0.19 && (ax < V || Math.abs(h - 0.72) < 0.032))) return wood;
    }
    return lights ? lead : null;
  }
  if (kind === "round") {
    if ((h < 0 || ax < V) && ax < V) return wood;
    if (h >= 0 && h < 2 * V) return wood;
    if (h > 0 && (Math.abs(ax - h) < 0.045 || Math.abs(Math.hypot(dx, h) - 0.3) < 0.035)) return wood;
    return lights ? lead : null;
  }
  if (ax < V || Math.abs(y - 3.03) < V) return wood;
  return Math.abs(ax - half / 2) < V / 2 || Math.floor((y - WIN.bottom) / V) % 6 === 5 ? lead : null;
}
// A window in the back wall's face: the night and its tracery, set back, in a
// stepped frame with a keystone over an arch.
function windowFace(face, look, w) {
  const c = cell(w.cx), kind = look.window, open = (i, j) => inOpening(kind, (i + 0.5) * V - w.cx, (j + 0.5) * V);
  let apex = 0;
  face.paint(c - 14, cell(WIN.bottom) - 2, c + 14, ROW.cornice, (i, j) => {
    const dx = (i + 0.5) * V - w.cx, y = (j + 0.5) * V;
    if (open(i, j)) { apex = Math.max(apex, j); return tracery(kind, dx, y, look) ?? [night(w.cx + dx, y, w.moon), -0.1, true]; }
    const d = ring(open, i, j, 2, true);
    return d === 1 ? [mix(look.trim, look.dark, 0.35), 0.05] : d === 2 ? [look.trim, 0.08] : null;
  });
  if (kind !== "square") face.rect(c - 2, apex + 1, c + 2, apex + 4, [tint(look.trim, 0.12), 0.1]);
}
// Drapes either side of a window, in folds, gathered by a gold cord with a
// tassel, under a scalloped pelmet.
function curtains(face, look, w) {
  const c = cell(w.cx), half = cell(WIN.w / 2), outer = half + 7, tie = 37, top = 63;
  const folds = [[tint(look.curtains, 0.12), 0.18], [look.curtains, 0.16], [shade(look.curtains, 0.35), 0.12], [shade(look.curtains, 0.12), 0.15]];
  const gold = [0xc9a050, 0.21], dull = [0x9a7a3a, 0.2], at = (s, k) => (s < 0 ? c - 1 - k : c + k);
  for (const s of [-1, 1]) {
    for (let j = ROW.field; j < top; j++) {
      const inner = j >= tie ? half + 4 - Math.round(5 * Math.min(1, (j - tie) / 12) ** 0.7) : half + 4 - Math.round(2 * Math.min(1, (tie - j) / 14));
      for (let k = inner; k < outer; k++) face.set(at(s, k), j, j === tie || j === tie - 1 ? gold : folds[(outer - k) % 4]);
    }
    for (let j = tie - 6; j < tie - 1; j++) for (const k of [half + 4, half + 5]) face.set(at(s, k), j, j === tie - 6 ? dull : gold);
  }
  for (let i = c - outer; i < c + outer; i++) for (let j = top - 2; j < ROW.cornice; j++) {
    const x = ((i - c + outer) % 6 + 6) % 6, scallop = j >= top || (j === top - 1 && x > 0 && x < 5) || (j === top - 2 && x > 1 && x < 4);
    if (scallop) face.set(i, j, j === top - 2 || (j === top - 1 && (x === 1 || x === 4)) ? gold : [shade(look.curtains, 0.2), 0.19]);
  }
}
// The sill under a window, with candles on the haunted and grand rooms' sills.
function sill(v, look, w, lights) {
  v.box(w.cx - WIN.w / 2 - 0.1875, WIN.bottom - 0.1875, 0, WIN.w + 0.375, 0.125, 0.3, look.trim);
  v.box(w.cx - WIN.w / 2 - 0.125, WIN.bottom - 0.25, 0, WIN.w + 0.25, 0.0625, 0.22, mix(look.trim, look.dark, 0.4));
  v.box(w.cx - WIN.w / 2 - 0.1875, WIN.bottom - 0.0625, 0.28, WIN.w + 0.375, 0.0025, 0.02, tint(look.trim, 0.15));
  if (!look.candles && !look.chandelier) return;
  for (const dx of [-0.56, 0.56]) candle(v, w.cx + dx, WIN.bottom - 0.0625, 0.15, 0.28 + (dx > 0 ? 0.06 : 0));
  lights.push({ x: w.cx, y: WIN.bottom + 0.6, z: 0.6, intensity: 5 });
}
// A candle in a brass dish: wax with a drip, a wick, and a flame with a bright tip.
function candle(v, x, y, z, h = 0.3) {
  v.box(x - 0.08, y, z - 0.08, 0.16, 0.03, 0.16, 0xb08a3a);
  v.box(x - 0.045, y + 0.03, z - 0.045, 0.09, h, 0.09, 0xe8dcc8);
  v.box(x - 0.05, y + h - 0.03, z - 0.05, 0.03, 0.05, 0.1, 0xf6eedc);
  v.box(x - 0.008, y + 0.03 + h, z - 0.008, 0.016, 0.03, 0.016, 0x2a2018);
  v.box(x - 0.028, y + 0.05 + h, z - 0.028, 0.056, 0.06, 0.056, 0xffa030, true);
  v.box(x - 0.018, y + 0.11 + h, z - 0.018, 0.036, 0.06, 0.036, 0xffe08a, true);
}

// Builds one wall face: skirting, wainscot panels in each bay, chair rail,
// the field, dentils, cornice and frieze. Bays are [from, to] along the wall.
function wallFace(face, look, field, bays) {
  const { cols } = face, edge = mix(look.trim, look.dark, 0.45);
  face.rect(0, 0, cols, 3, [look.dark, 0.07]);
  face.rect(0, 3, cols, 4, [mix(look.dark, look.trim, 0.35), 0.055]);
  face.rect(0, 4, cols, ROW.rail, [look.wood, 0.05]);
  for (const [u0, u1] of bays) {
    const a = cell(u0), span = cell(u1) - a, n = Math.max(1, Math.round(span / 20)), w = span / n;
    for (let p = 0; p < n; p++) panel(face, Math.round(a + p * w) + 3, 7, Math.round(a + (p + 1) * w) - 3, 17, look);
  }
  face.rect(0, ROW.rail, cols, ROW.rail + 1, [mix(look.trim, look.dark, 0.4), 0.08]);
  face.rect(0, ROW.rail + 1, cols, ROW.rail + 2, [look.trim, 0.11]);
  face.rect(0, ROW.rail + 2, cols, ROW.field, [tint(look.trim, 0.1), 0.095]);
  face.paint(0, ROW.field, cols, ROW.cornice, field);
  face.paint(0, 68, cols, 70, (i) => (i % 4 < 2 ? [look.trim, 0.13] : [edge, 0.07]));
  face.paint(0, 70, cols, 71, (i) => [i % 3 ? tint(look.trim, 0.12) : edge, 0.15]);
  face.rect(0, 71, cols, 72, [look.trim, 0.19]);
  face.rect(0, 72, cols, 73, [look.trim, 0.22]);
  face.rect(0, 73, cols, 74, [tint(look.trim, 0.14), 0.24]);
  face.rect(0, 74, cols, ROW.frieze, [edge, 0.17]);
  // The frieze: a dark beam in long streaks of grain, and in the haunted parlour a blind arcade.
  face.paint(0, ROW.frieze, cols, ROWS, (i, j) => [hash(Math.floor((i + j * 7) / 23), j) < 0.3 ? mix(look.dark, look.wood, 0.25) : look.dark, 0.02]);
  if (look.arches) face.paint(0, ROW.frieze, cols, ROWS, (i, j) => {
    const x = (i % 16) - 7.5, y = j - 77;
    return y >= 0 && Math.abs(Math.hypot(x, y) - 5.5) < 0.6 ? [look.trim, 0.05] : y < 0 && j === 76 ? [mix(look.trim, look.dark, 0.3), 0.04] : null;
  });
}
// A moulded panel: a lit top and left edge, a shadowed bottom and right, a
// sunk ground and a raised field.
function panel(face, i0, j0, i1, j1, look) {
  if (i1 - i0 < 6) return;
  const lit = [tint(look.wood, 0.14), 0.04], dim = [mix(look.wood, look.dark, 0.5), 0.04];
  face.rect(i0, j0, i1, j1, [mix(look.wood, look.dark, 0.28), 0.02]);
  face.rect(i0, j1 - 1, i1, j1, lit); face.rect(i0, j0, i0 + 1, j1, lit);
  face.rect(i0 + 1, j0, i1, j0 + 1, dim); face.rect(i1 - 1, j0, i1, j1 - 1, dim);
  if (i1 - i0 > 8) face.rect(i0 + 3, j0 + 3, i1 - 3, j1 - 3, [mix(look.wood, look.dark, 0.08), 0.035]);
}
// A pilaster: plinth with a carved lozenge, fluted shaft, capital under the
// cornice, and a block in the frieze, all standing out of the wall.
function column(face, u, look) {
  const c = cell(u), groove = [mix(look.wood, look.dark, 0.45), 0.165], ridge = [tint(look.wood, 0.06), 0.205], side = [look.wood, 0.21];
  const lozenge = (row, ink) => face.paint(c - 3, row - 2, c + 3, row + 3, (i, j) => (Math.abs(i + 0.5 - c) + Math.abs(j - row) <= 2.5 ? ink : null));
  face.rect(c - 5, 0, c + 5, 7, [look.dark, 0.26]);
  lozenge(3, [look.trim, 0.275]);
  face.rect(c - 5, 7, c + 5, 8, [tint(look.trim, 0.08), 0.28]);
  face.rect(c - 4, 8, c + 4, 9, [mix(look.trim, look.dark, 0.3), 0.24]);
  face.paint(c - 4, 9, c + 4, 62, (i, j) => { const k = i - c + 4; return k === 0 || k === 7 || j < 11 || j > 59 ? side : k % 2 ? groove : ridge; });
  face.rect(c - 4, 62, c + 4, 63, [mix(look.trim, look.dark, 0.3), 0.22]);
  face.rect(c - 5, 63, c + 5, 65, [look.trim, 0.25]);
  face.rect(c - 6, 65, c + 6, 67, [tint(look.trim, 0.1), 0.28]);
  face.rect(c - 6, 67, c + 6, 68, [mix(look.trim, look.dark, 0.3), 0.27]);
  face.rect(c - 5, ROW.frieze, c + 5, ROWS, [mix(look.wood, look.dark, 0.3), 0.24]);
  lozenge(79, [look.trim, 0.255]);
}
// The central panel's moulding, its corners cusped inwards.
function panelFrame(face, look) {
  const i0 = 55, i1 = face.cols - 55, j0 = 26, j1 = 66, r = 4.5;
  const inside = (i, j) => i >= i0 && i < i1 && j >= j0 && j < j1 && (Math.min(i - i0, i1 - 1 - i) ** 2 + Math.min(j - j0, j1 - 1 - j) ** 2 >= r * r);
  face.paint(i0, j0, i1, j1, (i, j) => {
    if (!inside(i, j)) return null;
    const d = ring(inside, i, j, 2, false);
    return d === 1 ? [look.trim, 0.06] : d === 2 ? [mix(look.trim, look.dark, 0.35), 0.035] : null;
  });
}
// The attic's round window: a wheel of tracery round the moon.
function roundWindow(face, look, lights) {
  const cx = R.w / 2, cy = 3, rg = 0.84, wood = [mix(look.dark, look.trim, 0.3), -0.055];
  face.paint(cell(cx - 1.1), cell(cy - 1.1), cell(cx + 1.1), cell(cy + 1.1), (i, j) => {
    const x = (i + 0.5) * V - cx, y = (j + 0.5) * V - cy, d = Math.hypot(x, y), a = Math.atan2(y, x);
    if (d < rg) {
      if (Math.abs(d - 0.38) < 0.035 || (d < 0.38 && Math.abs(x) < V) || (d > 0.38 && Math.abs(Math.sin(a * 4)) * d < 0.04)) return wood;
      return [night(cx + x, cy + y, { x: cx + 0.18, y: cy + 0.32, r: 0.18 }, cy - rg), -0.1, true];
    }
    return d < rg + 0.08 ? [mix(look.trim, look.dark, 0.35), 0.05] : d < rg + 0.17 ? [look.trim, 0.09] : d < rg + 0.23 ? [look.dark, 0.06] : null;
  });
  lights.push({ x: cx, y: cy, z: 1.2, color: 0xb8a8ff, intensity: 4 });
}
// Cobwebs in a top corner of the field: spokes from the corner and sagging threads.
function cobweb(face, i0, dir, look) {
  const j0 = ROW.cornice - 1, silk = [mix(0xc8c0d0, look.wall, 0.25), 0.03];
  face.paint(Math.min(i0, i0 + dir * 18), j0 - 18, Math.max(i0, i0 + dir * 18) + 1, j0 + 1, (i, j) => {
    const x = (i - i0) * dir, y = j0 - j, d = Math.hypot(x, y), a = Math.atan2(y, x);
    if (x < 0 || y < 0 || d > 17) return null;
    const spoke = [0.15, 0.55, 0.95, 1.35].some((s) => Math.abs(Math.sin(a - s)) * d < 0.5);
    const thread = [4.5, 9, 13.5].some((r) => Math.abs(d - r * (0.86 + 0.14 * Math.abs(Math.cos((a - 0.15) * Math.PI / 0.4)))) < 0.5);
    return spoke || thread ? silk : null;
  });
}

function backWall(v, r, look, paper, lights, feature) {
  const face = new Face(cell(R.w));
  wallFace(face, look, paper ? papered(paper) : plain(look, 0), [[0.5625, 2.6875], [3.3125, R.w - 3.3125], [R.w - 2.6875, R.w - 0.5625]]);
  if (feature === "panel") panelFrame(face, look);
  if (feature === "round") roundWindow(face, look, lights);
  if (feature === "hearth") { centreHearth(); hearthFace(face, look); }
  for (const w of windows()) { windowFace(face, look, w); if (look.curtains) curtains(face, look, w); }
  if (look.cobwebs) { cobweb(face, 11, 1, look); cobweb(face, face.cols - 12, -1, look); }
  for (const u of [0.25, 3, R.w - 3, R.w - 0.25]) column(face, u, look);
  face.shade((i, j) => soft(Math.min(i, face.cols - 1 - i), j));
  face.build(wall(v, "back"));
  for (const w of windows()) sill(v, look, w, lights);
  if (feature === "hearth") hearth(v, r, look, lights);
}

// A glass jar: its contents, glass above, shoulder, neck, cork, and sometimes a paper label round it.
const JARS = [0xc8641e, 0x9d55e6, 0xd8b04a, 0x6aa04a, 0xe8dcc8];
function jar(v, x, y, z, h, colour, glow, label) {
  const glass = mix(colour, 0xf4ecff, 0.6), w = 0.1875, body = h * 0.95;
  v.box(x, y, z, w, body * 0.7, w, colour, glow);
  v.box(x, y + body * 0.7, z, w, body * 0.3, w, glass);
  v.box(x + 0.03, y + body, z + 0.03, w - 0.06, 0.03, w - 0.06, glass);
  v.box(x + 0.045, y + body + 0.03, z + 0.045, w - 0.09, 0.05, w - 0.09, 0x9a6a3e);
  if (label) v.box(x - 0.006, y + body * 0.2, z - 0.006, w + 0.012, body * 0.28, w + 0.012, 0xe8dcc0);
}

// The kitchen hearth in the back wall's face: courses of brick (stone, or dark
// under the copper hood) with a voussoired arch over a sooty firebox.
// The hearth stands in the middle of the back wall, however wide the room.
const HEARTH = { i0: 56, i1: 104, top: 38, c: 80, half: 12, spring: 24 };
const centreHearth = () => { const k = cell(R.w / 2) - 80; Object.assign(HEARTH, { i0: 56 + k, i1: 104 + k, c: 80 + k }); return R.w / 2 - 5; };
const hearthOpen = (i, j) => { const dx = i + 0.5 - HEARTH.c; return Math.abs(dx) < HEARTH.half && (j < HEARTH.spring || j + 0.5 - HEARTH.spring < 4 * (1 - (dx / HEARTH.half) ** 2)); };
function hearthFace(face, look) {
  const stone = look.hearth === "copper" ? 0x5a4a44 : 0x8a8090, mortar = [mix(stone, look.hearth === "copper" ? 0x000000 : 0xffffff, 0.3), 0.47], { i0, i1, top, c } = HEARTH;
  face.paint(i0, 0, i1, top, (i, j) => {
    if (hearthOpen(i, j)) {
      const brick = j % 4 !== 3 && (i + (Math.floor(j / 4) % 2) * 3) % 7 !== 6;
      return [j > HEARTH.spring - 3 ? 0x140e10 : brick ? 0x2a1c1c : 0x1a1214, 0.02];
    }
    const a = Math.atan2(j - HEARTH.spring + 8, i + 0.5 - c);
    if (j >= HEARTH.spring - 2 && ring(hearthOpen, i, j, 3, true)) {                // the arch's wedge bricks
      const s = a / 0.17, k = Math.round(s);
      return Math.abs(s - k) < 0.14 ? mortar : [mix(stone, hash(k, 3) < 0.5 ? 0x000000 : 0xffffff, hash(k, 5) * 0.12), 0.52];
    }
    const course = Math.floor(j / 4), x = i + (course % 2) * 3, id = Math.floor(x / 7);
    if (j % 4 === 3 || x % 7 === 6) return mortar;
    return [mix(stone, hash(id, course) < 0.5 ? 0x000000 : 0xffffff, hash(course, id) * 0.14), 0.5];
  });
  face.rect(c - 2, HEARTH.spring + 4, c + 2, HEARTH.spring + 8, [tint(stone, 0.15), 0.55]);    // the keystone
}
// The hearth in the round: hearthstones, mantel, firedogs, logs and a fire,
// a cauldron on a crane, and the copper hood or a row of jars above.
function hearth(room, r, look, lights) {
  // Built for a 10-wide wall, then moved along to the middle of this one.
  const dx = R.w / 2 - 5, v = { box: (x, ...a) => room.box(x + dx, ...a), block: (x, ...a) => room.block(x + dx, ...a) };
  const copper = look.hearth === "copper", stone = copper ? 0x5a4a44 : 0x8a8090, iron = 0x2a2226;
  for (let k = 0; k < 3; k++) v.box(3.4 + k * 1.07, 0, 0, 1.06, 0.08, 1.15, vary(shade(stone, 0.25), 0.1, r));
  v.box(3.3, 2.375, 0, 3.4, 0.125, 0.72, look.wood);
  v.box(3.35, 2.3125, 0, 3.3, 0.0625, 0.62, mix(look.wood, look.dark, 0.35));
  for (const x of [3.42, 6.43]) v.box(x, 1.9, 0.5, 0.15, 0.42, 0.16, mix(look.wood, look.dark, 0.2));
  for (const x of [4.42, 5.5]) { v.box(x, 0.08, 0.12, 0.08, 0.34, 0.08, iron); v.box(x - 0.015, 0.42, 0.105, 0.11, 0.07, 0.11, 0x4a3a3e); v.box(x, 0.08, 0.12, 0.08, 0.05, 0.42, iron); }
  for (const [x, y, z, len] of [[4.38, 0.12, 0.16, 1.24], [4.46, 0.12, 0.33, 1.06], [4.62, 0.25, 0.24, 0.8]]) {
    v.box(x, y, z, len, 0.13, 0.12, 0x4a2a18);
    for (const e of [x - 0.01, x + len - 0.005]) v.box(e, y + 0.015, z + 0.015, 0.015, 0.1, 0.09, 0x9a7048);
    for (let k = 0; k < 3; k++) v.box(x + 0.2 + k * 0.3 + r() * 0.1, y + 0.13, z + 0.03, 0.06, 0.012, 0.06, 0xff7020, true);
  }
  // The fire: columns of flame, hottest at the root, licking up unevenly.
  for (let x = 4.5; x < 5.5 - 1e-6; x += V) for (const z of [0.12, 0.2, 0.28]) {
    const dx = Math.abs(x + V / 2 - 5) / 0.5, h = (1 - dx * dx) * (0.7 + r() * 0.45) * (z > 0.25 ? 0.7 : z > 0.15 ? 0.88 : 1);
    if (h < 0.08) continue;
    v.box(x, 0.24, z, V, h * 0.35, V, 0xffe08a, true);
    v.box(x, 0.24 + h * 0.35, z, V, h * 0.3, V, 0xffa030, true);
    v.box(x, 0.24 + h * 0.65, z, V, h * 0.35, V, 0xff5a1a, true);
  }
  if (copper) {
    // A riveted copper hood stepping in to the chimney breast, pans hung from its rail.
    for (let k = 0; k < 8; k++) {
      const x = 3.55 + k * 0.09, w = 2.9 - k * 0.18, d = 0.62 - k * 0.055, y = 2.5 + k * 0.25, c = vary(look.trim, 0.05, r);
      v.box(x, y, 0, w, 0.25, d, c);
      v.box(x, y + 0.22, d - 0.01, w, 0.03, 0.02, tint(c, 0.22));
      if (k === 0) for (let p = x + 0.1; p < x + w - 0.05; p += 0.2) v.box(p, y + 0.08, d, 0.03, 0.03, 0.01, shade(c, 0.45));
    }
    for (const [x, s] of [[3.75, 0.36], [6.0, 0.3], [6.35, 0.24]]) {
      v.box(x + s / 2 - 0.015, 2.08, 0.66, 0.03, 0.42 - s / 2, 0.03, 0x3a2a24);
      v.box(x, 1.72 - s / 2 + 0.2, 0.62, s, s, 0.06, vary(look.trim, 0.08, r));
      v.box(x + s * 0.2, 1.72 - s / 2 + 0.2 + s * 0.2, 0.68, s * 0.6, s * 0.6, 0.01, tint(look.trim, 0.25));
    }
  } else {
    // An iron crane over the fire with a cauldron of stew.
    v.box(4.3, 1.3, 0.34, 0.06, 0.06, 0.06, iron); v.box(4.36, 1.31, 0.35, 0.7, 0.04, 0.04, iron); v.box(4.99, 0.98, 0.355, 0.03, 0.33, 0.03, iron);
    for (const [y, w, h] of [[0.56, 0.3, 0.05], [0.61, 0.46, 0.08], [0.69, 0.52, 0.14], [0.83, 0.48, 0.06], [0.89, 0.42, 0.04]]) { v.block(5, y, 0.37, w, h, w * 0.8, 0x1e1a1e); v.block(5, y, 0.37, w * 0.8, h, w, 0x1e1a1e); }
    v.block(5, 0.92, 0.37, 0.36, 0.02, 0.3, 0xc87838, true);
    v.block(5, 0.93, 0.37, 0.5, 0.03, 0.5, 0x2a262a);
    for (let i = 0; i < 6; i++) jar(v, 3.68 + i * 0.47, 2.5, 0.25, 0.24 + (i % 2) * 0.08, JARS[i % 4], i % 3 === 0, i % 2 === 1);
  }
  lights.push({ x: R.w / 2, y: 0.8, z: 1.2, color: 0xff8a3a, intensity: 12 });
}

function sideWall(v, r, look, paper, side, lights, door = false, arches = [], stair = false) {
  const face = new Face(cell(R.d)), x = side === "left" ? 0 : R.w, sx = side === "left" ? 1 : -1;
  wallFace(face, look, paper ? papered(paper) : plain(look, side === "left" ? 1 : 2), [[0.3125, R.d - 0.5625]]);
  const sconces = look.sconces && !stair && !arches.length;
  if (sconces) face.paint(44, 44, 52, 54, (i, j) => (Math.abs(i - 47.5) + Math.max(0, j - 50) <= 3.5 ? [j === 44 || i === 44 ? tint(look.trim, 0.1) : look.trim, 0.06] : null));
  if (look.jars) for (let k = 0; k < 2; k++) for (const u of [1.4, 4.6]) face.paint(cell(u) - 1, cell(2.6 + k * 0.8) - 5, cell(u) + 1, cell(2.6 + k * 0.8), (i, j) => [look.wood, 0.06 + (j - cell(2.6 + k * 0.8) + 5) * 0.05]);
  if (door) doorway(face, look);
  for (const a of arches) archway(v, face, look, side, a, lights);
  column(face, R.d - 0.25, look);
  face.shade((i, j) => soft(i, j));
  face.build(wall(v, side));
  if (sconces) {
    v.box(x + sx * 0.06 - (sx < 0 ? 0.16 : 0), 3.05, 2.97, 0.16, 0.04, 0.06, look.trim);
    candle(v, x + sx * 0.24, 3.0, 3, 0.22);
    lights.push({ x: x + sx * 0.6, y: 3.4, z: 3, intensity: 5 });
  }
  if (look.jars) for (let k = 0; k < 2; k++) {
    const y = 2.6 + k * 0.8;
    v.box(sx > 0 ? 0 : R.w - 0.36, y, 1, 0.36, 0.0625, 4, look.wood);
    v.box(sx > 0 ? 0.33 : R.w - 0.36, y - 0.03, 1, 0.03, 0.03, 4, mix(look.wood, look.dark, 0.3));
    for (let i = 0; i < 9; i++) jar(v, sx > 0 ? 0.07 : R.w - 0.26, y + 0.0625, 1.1 + i * 0.42, 0.24 + (i % 3) * 0.06, JARS[(i + k) % 5], i % 4 === 0, (i + k) % 3 === 1);
  }
}

// An archway through a side wall to the next room: an arched opening with a
// moulded architrave and keystone, a stone threshold, and beyond it a glimpse
// of the room next door, lamplit. a is the house layout's door { at, width }.
const ARCH = { spring: 2.4 };
function archway(v, face, look, side, a, lights) {
  const u0 = a.at + 0.1875, u1 = a.at + a.width - 0.1875, mid = (u0 + u1) / 2, rad = (u1 - u0) / 2;
  const open = (i, j) => { const u = (i + 0.5) * V, y = (j + 0.5) * V; return u > u0 && u < u1 && (y < ARCH.spring || (u - mid) ** 2 + (y - ARCH.spring) ** 2 < rad * rad); };
  const i0 = cell(u0) - 4, i1 = cell(u1) + 4, top = cell(ARCH.spring + rad) + 5;
  face.paint(i0, 0, i1, top, (i, j) => {
    if (open(i, j)) return null;
    const d = ring(open, i, j, 3, true);
    return d === 1 ? [mix(look.trim, look.dark, 0.4), 0.06] : d === 2 ? [look.trim, 0.1] : d === 3 ? [tint(look.trim, 0.1), 0.12] : null;
  });
  face.rect(cell(mid) - 2, cell(ARCH.spring + rad) - 1, cell(mid) + 2, cell(ARCH.spring + rad) + 4, [tint(look.trim, 0.18), 0.15]);  // keystone
  face.cut(i0, 0, i1, top, open);
  // Beyond the wall: a short passage, its floor, a far wall with a lamp, all a little darker.
  const out = side === "left" ? -1 : 1, edge = side === "left" ? 0 : R.w, far = 2.2, x0 = side === "left" ? edge - far : edge;
  const z0 = a.at, w = a.width, through = shade(look.wall, 0.4);
  v.box(x0, -0.12, z0, far, 0.12, w, shade(look.floor, 0.25));
  v.box(side === "left" ? x0 - 0.1 : edge + far, 0, z0 - 0.4, 0.1, 3.6, w + 0.8, through);
  for (const z of [z0 - 0.1, z0 + w]) v.box(x0, 0, z, far, 3.6, 0.1, shade(look.wall, 0.55));
  v.box(x0, 3.5, z0 - 0.1, far, 0.1, w + 0.2, look.dark);
  v.box(side === "left" ? x0 : edge + far - 0.05, 1.5, z0 + w / 2 - 0.12, 0.05, 0.3, 0.24, 0xffc46a, true);
  v.box(edge - (side === "left" ? T : 0), 0, z0 + 0.1875, T, 0.04, w - 0.375, 0x8a8090);           // the threshold
  lights.push({ x: edge + out * 1.3, y: 2, z: z0 + w / 2, color: 0xffb070, intensity: 4 });
}

// Stairs and ladders between the storeys, from the house layout: a staircase
// climbing to the room above, the open stairwell it arrives through, a ladder
// up to the attic and the hatch it comes up through. Each returns the box a tap
// on it should catch, to go to the room it leads to.
const LANDING = WALL_H - 0.15, STEPS = 10;
function staircase(v, look, st) {
  const x0 = st.x, w = st.w, zb = st.z, front = st.z + st.d, dz = (st.d - 1) / STEPS, rise = LANDING / (STEPS + 1);
  const body = mix(look.wood, look.dark, 0.3), tread = tint(look.floor, 0.08), riser = shade(look.wood, 0.25), rail = look.trim;
  for (let k = 0; k < STEPS; k++) {
    const zf = front - k * dz, z = zf - dz, top = (k + 1) * rise;
    v.box(x0 + 0.06, 0, z, w - 0.06, top - 0.0625, dz, body);
    v.box(x0, top - 0.0625, z - 0.0625, w, 0.0625, dz + 0.0625, tread);
    v.box(x0 + 0.03, top - rise, zf - 0.03, w - 0.03, rise - 0.0625, 0.03, riser);
    for (const t of [0.25, 0.75]) v.box(x0 + 0.03, top, z + dz * t - 0.025, 0.05, 0.9, 0.05, look.dark);   // spindles
    v.box(x0 + 0.005, top + 0.9, z - 0.03, 0.1, 0.07, dz + 0.06, rail);                                      // the handrail, stepping up
  }
  v.box(x0 + 0.06, 0, zb, w - 0.06, LANDING - 0.0625, 1, body);                                            // the landing, and the cupboard under it
  v.box(x0, LANDING - 0.0625, zb, w, 0.0625, 1, tread);
  v.box(x0 + 0.03, 0.12, zb + 0.15, 0.03, 2.1, 0.7, shade(look.wood, 0.4));
  v.box(x0 + 0.01, 0.2, zb + 0.22, 0.03, 1.94, 0.56, mix(look.wood, look.dark, 0.15));
  v.box(x0 - 0.01, 1.1, zb + 0.72, 0.03, 0.06, 0.05, rail);
  v.box(x0, 0, front - 0.14, 0.14, 1.3, 0.14, look.wood);                                                 // the newel post, capped
  v.box(x0 - 0.02, 1.3, front - 0.16, 0.18, 0.06, 0.18, rail);
  v.block(x0 + 0.07, 1.36, front - 0.07, 0.1, 0.1, 0.1, tint(rail, 0.15));
  return { x: x0, y: 0, z: zb, w, h: LANDING, d: st.d };
}
function stairwell(v, look, st) {
  const x0 = st.x, w = st.w, z0 = st.z + 1, z1 = st.z + st.d, dz = (st.d - 1) / STEPS, rise = LANDING / (STEPS + 1), dark = shade(look.wall, 0.6);
  for (let k = 0; k < 6; k++) {
    const z = z0 + k * dz, top = -(k + 1) * rise;
    v.box(x0 + 0.03, top - 0.0625, z, w - 0.03, 0.0625, dz + 0.0625, shade(tint(look.floor, 0.08), 0.12 + k * 0.1));
    v.box(x0 + 0.03, top, z - 0.03, w - 0.03, rise, 0.03, shade(look.wood, 0.3 + k * 0.08));
  }
  v.box(x0, -2.8, z0, w, 0.1, z1 - z0, 0x120c10);                                                        // the dark below
  v.box(x0 - 0.06, -2.8, z0, 0.06, 2.8, z1 - z0, dark);
  v.box(x0, -2.8, z1, w, 2.8, 0.06, dark);
  // A balustrade round the well: posts, spindles and a rail.
  for (let z = z0 + 0.25; z < z1; z += 0.5) v.box(x0 - 0.04, 0, z - 0.025, 0.05, 0.9, 0.05, look.dark);
  for (let x = x0 + 0.25; x < x0 + w; x += 0.5) v.box(x - 0.025, 0, z1 - 0.02, 0.05, 0.9, 0.05, look.dark);
  v.box(x0 - 0.06, 0.9, z0, 0.1, 0.07, z1 - z0 + 0.06, look.trim);
  v.box(x0 - 0.06, 0.9, z1 - 0.04, w + 0.06, 0.07, 0.1, look.trim);
  v.box(x0 - 0.08, 0, z1 - 0.08, 0.14, 1.1, 0.14, look.wood);
  v.block(x0 - 0.01, 1.1, z1 - 0.01, 0.12, 0.08, 0.12, look.trim);
  return { x: x0, y: -0.6, z: z0, w, h: 1.6, d: z1 - z0 };
}
function ladderUp(v, look, st) {
  const x0 = st.x, w = st.w, z = st.z, top = WALL_H + 0.25, wood = shade(look.wood, 0.1);
  for (let y = 0; y < top; y += 0.25) {
    const lean = 0.55 - (y / top) * 0.4;                                                                    // its feet out from the wall
    for (const x of [x0 + 0.18, x0 + w - 0.26]) v.box(x, y, z + lean, 0.08, 0.26, 0.08, wood);
    if (y > 0.1) v.box(x0 + 0.2, y, z + lean + 0.01, w - 0.42, 0.04, 0.06, tint(wood, 0.1));
  }
  v.box(x0 - 0.04, WALL_H - 0.02, z - 0.04, w + 0.08, 0.1, 0.9, look.dark);                                // the hatch's frame overhead
  v.box(x0 + 0.08, WALL_H + 0.06, z + 0.06, w - 0.16, 0.02, 0.7, 0x120c10);
  return { x: x0, y: 0, z, w, h: WALL_H, d: 1 };
}
function hatch(v, look, st) {
  const x0 = st.x, w = st.w, z = st.z, wood = shade(look.wood, 0.1);
  v.box(x0, -1.6, z, w, 0.1, 1, 0x120c10);
  v.box(x0 - 0.06, -1.6, z + 1, w + 0.06, 1.6, 0.06, shade(look.wall, 0.6));
  v.box(x0 - 0.06, -1.6, z, 0.06, 1.6, 1, shade(look.wall, 0.6));
  for (const x of [x0 + 0.18, x0 + w - 0.26]) v.box(x, -1.4, z + 0.3, 0.08, 2.2, 0.08, wood);              // the ladder's top, through the hatch
  for (let y = -1.2; y < 0.7; y += 0.3) v.box(x0 + 0.2, y, z + 0.31, w - 0.42, 0.04, 0.06, tint(wood, 0.1));
  v.box(x0 + 0.05, 0, z + 0.02, w - 0.1, 0.95, 0.06, look.wood);                                           // the trapdoor, propped open
  for (const y of [0.2, 0.7]) v.box(x0 + 0.08, y, z + 0.08, w - 0.16, 0.05, 0.02, 0x2a2226);
  for (const [a, b] of [[0, 0], [w - 0.08, 0], [0, 0.92], [w - 0.08, 0.92]]) v.box(x0 + a, 0, z + b, 0.08, 0.06, 0.08, look.dark);
  return { x: x0, y: -0.4, z, w, h: 1.4, d: 1 };
}

// The floor: boards in lengths, each in strips of grain with nails at its
// ends, darker where it runs in under the walls.
function floor(v, r, look, holes = []) {
  // The dark gaps between boards, in strips round any openings.
  const under = holes.length ? holes[0] : null;
  if (!under) v.box(0, -0.3, 0, R.w, 0.27, R.d, shade(look.floor, 0.55));
  else {
    v.box(0, -0.3, 0, under.x0, 0.27, R.d, shade(look.floor, 0.55));
    v.box(under.x0, -0.3, 0, R.w - under.x0, 0.27, under.z0, shade(look.floor, 0.55));
    v.box(under.x0, -0.3, under.z1, R.w - under.x0, 0.27, R.d - under.z1, shade(look.floor, 0.55));
  }
  const W = 0.375, nail = shade(look.floor, 0.6), dim = (d) => (d < 0.25 ? 0.24 : d < 0.55 ? 0.12 : d < 0.9 ? 0.05 : 0);
  for (let x = 0; x < R.w - 1e-6; x += W) {
    const bw = Math.min(W, R.w - x) - 0.016, side = dim(Math.min(x + W / 2, R.w - x - W / 2));
    let z = -r() * 1.5;
    while (z < R.d) {
      const len = [1.5, 2.25, 3][(r() * 3) | 0], z0 = Math.max(0, z) + 0.008, z1 = Math.min(R.d, z + len) - 0.008, colour = vary(look.floor, 0.14, r);
      if (z1 - z0 > 0.05) {
        const strips = r() < 0.5 ? [2, 1, 3] : [3, 1, 2], cuts = [z0, ...[0.25, 0.55, 0.9].filter((c) => c > z0 && c < z1), z1];
        for (const h of holes) if (x + bw > h.x0 && x < h.x1) cuts.push(...[h.z0, h.z1].filter((c) => c > z0 && c < z1));
        cuts.sort((a, b) => a - b);
        for (let s = 1; s < cuts.length; s++) {
          const dark = 1 - (1 - side) * (1 - dim(cuts[s - 1] + 0.01)), mid = (cuts[s - 1] + cuts[s]) / 2;
          // Where a stairwell or hatch opens, the board stops at its edge.
          const hole = holes.find((h) => mid > h.z0 && mid < h.z1 && x + bw > h.x0 && x < h.x1), end = hole ? hole.x0 : Infinity;
          let sx = x + 0.008;
          strips.forEach((n, k) => {
            const sw = Math.min((bw * n) / 6, end - sx), c = n === 1 ? shade(colour, 0.12) : k ? tint(colour, 0.04) : colour;
            if (sw > 0.01) v.box(sx, -0.12, cuts[s - 1], sw, 0.12, cuts[s] - cuts[s - 1], shade(c, dark));
            sx += (bw * n) / 6;
          });
        }
        for (const nz of [z0 + 0.05, z1 - 0.09]) if (nz > 0.02 && nz < R.d - 0.06) for (const nx of [x + 0.07, x + bw - 0.1]) v.box(nx, 0, nz, 0.04, 0.006, 0.04, nail);
        if (r() < 0.2) v.box(x + bw * 0.4, 0, z0 + (z1 - z0) * r(), 0.06, 0.004, 0.1, shade(colour, 0.3));
      }
      z += len;
    }
  }
  v.box(-T, -0.6, R.d, R.w + 2 * T, 0.6, 0.2, look.dark);                              // the stage's front edge
  v.box(-T, -0.0625, R.d, R.w + 2 * T, 0.0625, 0.24, tint(look.dark, 0.08));
}

function extras(v, r, look, lights) {
  if (look.chandelier) {
    const cx = R.w / 2, cz = 2.6, y = 4.1, brass = look.trim;
    v.box(cx - 0.025, y + 0.45, cz - 0.025, 0.05, WALL_H - y - 0.45, 0.05, 0x2a1a14);
    v.block(cx, y + 0.3, cz, 0.16, 0.16, 0.16, brass);
    v.block(cx, y - 0.22, cz, 0.08, 0.52, 0.08, brass);
    v.block(cx, y - 0.32, cz, 0.13, 0.1, 0.13, tint(brass, 0.15));
    for (let a = 0; a < Math.PI * 2 - 1e-6; a += Math.PI / 12) v.block(cx + Math.cos(a) * 0.55, y - 0.05, cz + Math.sin(a) * 0.4, 0.09, 0.05, 0.09, brass);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, x = cx + Math.cos(a) * 0.55, z = cz + Math.sin(a) * 0.4;
      v.block(cx + Math.cos(a) * 0.28, y - 0.12, cz + Math.sin(a) * 0.2, 0.05, 0.05, 0.05, brass);
      candle(v, x, y, z, 0.18);
      if (look.stars) v.block(cx + Math.cos(a + 0.4) * 0.5, y - 0.2, cz + Math.sin(a + 0.4) * 0.36, 0.04, 0.12, 0.04, 0xc8b8f0);
    }
    lights.push({ x: cx, y: y, z: cz, intensity: 10 });
  }
  if (look.herbs) for (let i = 0; i < 12; i++) {
    const x = 0.8 + i * 0.75, top = 4.25 - (i % 3) * 0.12, c = [0x5a7a3a, 0x7a6a9a, 0x8a7a3a][i % 3];
    v.box(x + 0.06, top, 0.31, 0.015, WALL_H - 0.05 - top, 0.015, 0x3a2a1a);
    for (let k = 0; k < 4; k++) v.box(x + k * 0.035, top - 0.5 + (k % 2) * 0.06, 0.25 + (k % 2) * 0.04, 0.04, 0.44, 0.06, vary(c, 0.18, r));
    v.box(x - 0.01, top - 0.08, 0.24, 0.17, 0.04, 0.1, 0xc9a050);
  }
  if (look.rafters) for (const z of [1.5, 3, 4.5]) {
    v.box(-T, WALL_H - 0.1, z, R.w + 2 * T, 0.3, 0.3, look.dark);
    v.box(-T, WALL_H - 0.1, z + 0.28, R.w + 2 * T, 0.04, 0.03, tint(look.dark, 0.12));
    for (const [x, d] of [[0, 1], [R.w, -1]]) for (let k = 0; k < 16; k++) v.box(x + d * k * 0.125 - (d < 0 ? 0.125 : 0), WALL_H - 0.95 + k * 0.05, z, 0.125, 0.2, 0.3, look.dark);
  }
  if (look.fairyLights) for (let s = 0; s < 8; s++) {
    const x0 = 0.2 + s * 1.2, sag = (t) => WALL_H - 0.4 - Math.sin(Math.PI * t) * 0.22;
    for (let k = 0; k < 4; k++) {
      const t0 = k / 4, t1 = (k + 1) / 4, x = x0 + t0 * 1.2;
      v.box(x, Math.min(sag(t0), sag(t1)), 0.42, 0.3, 0.015, 0.015, 0x2a3a24);
      if (k) { v.box(x - 0.03, sag(t0) - 0.09, 0.4, 0.06, 0.07, 0.06, [0xffd894, 0xc89cff, 0xffc46a][(s + k) % 3], true); v.box(x - 0.02, sag(t0) - 0.03, 0.41, 0.04, 0.03, 0.04, 0x2a3a24); }
    }
  }
  lights.push({ x: R.w / 2, y: 3.4, z: R.d + 1, color: 0xffd0a0, intensity: 2.5 });   // the room's warm fill
}

// A room in a style, with the chosen wallpaper (a catalogue item) or none.
// layout is the house's roomLayout for the room: its size, doorways and stairs.
// Returns the voxels, the lights, and links: the boxes of stairs, ladders and
// doorways, and the room each leads to.
export function buildRoom(style, wallpaper, layout) {
  R = layout ? { w: layout.w, d: layout.d } : GRID;
  const look = STYLES[style] ?? STYLES["parlour-warm"], v = new Voxels(), r = seeded(style.length * 31 + (wallpaper ? 7 : 0) + R.w), lights = [], links = [];
  const paper = wallpaper ? { id: wallpaper.id, base: parseInt(wallpaper.color.slice(1), 16) } : null;
  const doors = layout?.doors ?? [], stairs = layout?.stairs ?? [];
  // Stairwells and hatches open in the floor of the room they arrive in.
  const holes = stairs.filter((st) => st.down).map((st) => (st.kind === "ladder" ? { x0: st.x, x1: st.x + st.w, z0: st.z, z1: st.z + 1 } : { x0: st.x, x1: st.x + st.w, z0: st.z + 1, z1: st.z + st.d }));
  floor(v, r, look, holes);
  backWall(v, r, look, paper, lights, look.hearth ? "hearth" : look.roundWindow ? "round" : "panel");
  for (const side of ["left", "right"]) sideWall(v, r, look, paper, side, lights, false, doors.filter((d) => d.wall === side), stairs.some((st) => st.wall === side));
  for (const d of doors) links.push({ to: d.to, x: d.wall === "left" ? -0.8 : R.w - 0.2, y: 0, z: d.at, w: 1, h: 3, d: d.width });
  for (const st of stairs) {
    const build = st.kind === "ladder" ? (st.up ? ladderUp : hatch) : st.up ? staircase : stairwell;
    links.push({ to: st.up ?? st.down, ...build(v, look, st) });
  }
  extras(v, r, look, lights);
  return { group: v.build(), lights, links };
}

// The shop: shelves of glowing jars, the display tables, Skyla's counter and the door.
export const SHOP_SPOTS = {
  door: { x: 0.6, z: 5.4 },
  tables: [{ x: 2, z: 2.2 }, { x: 4.6, z: 2.2 }, { x: 2, z: 4 }, { x: 4.6, z: 4 }],
  counter: { x: 8, z: 2.4 },
  pay: { x: 6.7, z: 2.8 },
  queue: [{ x: 6.7, z: 4 }, { x: 6.7, z: 5.1 }, { x: 5.6, z: 5.4 }, { x: 4.5, z: 5.5 }, { x: 3.4, z: 5.5 }],
};
// The open door in the shop's left wall, onto the lantern-lit path at night.
function doorway(face, look) {
  const z0 = 70, z1 = 94, top = 41, open = (i, j) => i >= z0 && i < z1 && j < top;
  face.paint(z0 - 3, 0, z1 + 3, top + 4, (i, j) => {
    if (open(i, j)) {
      const u = (i + 0.5 - (z0 + z1) / 2) * V, y = (j + 0.5) * V, path = Math.abs(u + 0.1 - y * 0.25) < 0.42 - y * 0.32;
      if (y < 0.55) return [path ? mix(0x9a88b8, 0x6a5a88, y * 1.5) : 0x1e2a1c, -0.2, true];
      if (Math.abs(u - 0.55) < V && y < 1.5) return [0x1a1418, -0.2, true];
      if (Math.abs(u - 0.55) < 0.07 && Math.abs(y - 1.56) < 0.08) return [0xffc46a, -0.2, true];
      return [night(u * 3 + 20, y + 0.9, null, 0.6), -0.2, true];
    }
    const d = ring(open, i, j, 3, true);
    return d === 1 ? [mix(look.trim, look.dark, 0.35), 0.05] : d === 2 ? [look.trim, 0.09] : d === 3 && j >= top ? [tint(look.trim, 0.1), 0.11] : null;
  });
}
export function buildShopInterior() {
  R = GRID;
  const look = { wall: 0x5a3a26, wall2: 0x523420, wood: 0x6a4428, dark: 0x3a2214, trim: 0x8a5a36, floor: 0x7a4a2a, window: "round" }, v = new Voxels(), r = seeded(404), lights = [];
  floor(v, r, look);
  const back = new Face(cell(R.w));
  wallFace(back, look, plain(look, 0), [[0.5625, 9.4375]]);
  for (const y of [1.9, 2.75, 3.6]) for (let x = 1; x < R.w - 0.5; x += 2) back.paint(cell(x) - 1, cell(y) - 4, cell(x) + 1, cell(y), (i, j) => [look.wood, 0.08 + (j - cell(y) + 4) * 0.08]);
  for (const u of [0.25, R.w - 0.25]) column(back, u, look);
  back.shade((i, j) => soft(Math.min(i, back.cols - 1 - i), j));
  back.build(wall(v, "back"));
  // Shelves along the back wall: jars, and a little pumpkin every so often.
  for (const y of [1.9, 2.75, 3.6]) {
    v.box(0.5, y, 0, R.w - 1, 0.0625, 0.45, look.trim);
    v.box(0.5, y - 0.03, 0.42, R.w - 1, 0.05, 0.04, shade(look.trim, 0.25));
    for (let i = 0; i < 26; i++) {
      const x = 0.6 + i * 0.34;
      if ((i + y * 2) % 7 < 1) { v.block(x + 0.1, y + 0.0625, 0.2, 0.22, 0.16, 0.2, 0xe8761e); v.block(x + 0.1, y + 0.0625, 0.2, 0.16, 0.18, 0.24, 0xf0821e); v.block(x + 0.1, y + 0.24, 0.2, 0.03, 0.06, 0.03, 0x4a6a2a); continue; }
      jar(v, x, y + 0.0625, 0.1, 0.24 + (i % 3) * 0.06, [0xffb85a, 0xf0821e, 0xb774ff, 0xd9d2ff, 0xf5c84a][(i + y * 3) % 5 | 0], i % 3 === 0, i % 4 === 2);
    }
  }
  // The side walls: the door on the left, open onto the lantern-lit path.
  sideWall(v, r, look, null, "left", lights, true);
  sideWall(v, r, look, null, "right", lights);
  // Display tables on legs, with a runner, a shelf beneath and a crate on it.
  for (const t of SHOP_SPOTS.tables) {
    v.box(t.x - 0.85, 0.8, t.z - 0.55, 1.7, 0.1, 1.1, 0x8a5a36);
    v.box(t.x - 0.85, 0.86, t.z + 0.55, 1.7, 0.04, 0.005, tint(0x8a5a36, 0.15));
    v.box(t.x - 0.3, 0.9, t.z - 0.56, 0.6, 0.008, 1.12, 0x7a2a3a);
    v.box(t.x - 0.75, 0.66, t.z - 0.45, 1.5, 0.14, 0.9, look.wood);
    for (const [a, b] of [[-0.72, -0.42], [0.62, -0.42], [-0.72, 0.32], [0.62, 0.32]]) v.box(t.x + a, 0, t.z + b, 0.1, 0.66, 0.1, look.dark);
    v.box(t.x - 0.7, 0.16, t.z - 0.4, 1.4, 0.05, 0.8, mix(look.wood, look.dark, 0.25));
    v.box(t.x - 0.5, 0.21, t.z - 0.28, 0.5, 0.24, 0.5, 0x9a6a3e);
    for (let k = 0; k < 3; k++) v.box(t.x - 0.51, 0.25 + k * 0.08, t.z + 0.215, 0.52, 0.04, 0.01, 0x7a4e2c);
  }
  // Skyla's counter: panelled, with the till, the bell, a lantern and the ledger.
  const c = SHOP_SPOTS.counter;
  v.box(c.x - 0.5, 0, c.z - 1.6, 1.4, 1.15, 3.2, look.wood);
  v.box(c.x - 0.6, 1.15, c.z - 1.7, 1.6, 0.12, 3.4, 0x8a5a36);
  v.box(c.x - 0.54, 0, c.z - 1.6, 0.04, 0.12, 3.2, look.dark);
  for (let z = -1.45; z < 1.5; z += 0.75) { v.box(c.x - 0.53, 0.22, c.z + z, 0.03, 0.78, 0.6, mix(look.wood, look.dark, 0.3)); v.box(c.x - 0.55, 0.32, c.z + z + 0.1, 0.03, 0.58, 0.4, tint(look.wood, 0.06)); }
  v.box(c.x - 0.3, 0.22, c.z + 1.6, 1.0, 0.78, 0.03, mix(look.wood, look.dark, 0.3));
  v.box(c.x, 1.27, c.z + 0.7, 0.6, 0.3, 0.4, 0xd9a35a);
  v.box(c.x + 0.05, 1.57, c.z + 0.72, 0.5, 0.12, 0.2, 0xc8923a);
  for (let k = 0; k < 4; k++) v.box(c.x + 0.08 + k * 0.12, 1.57, c.z + 0.95, 0.08, 0.03, 0.08, 0xe8dcc0);
  v.box(c.x + 0.15, 1.69, c.z + 0.75, 0.3, 0.14, 0.03, 0xf0e4c8);
  v.box(c.x + 0.12, 1.27, c.z - 1.22, 0.2, 0.03, 0.2, 0xb08a3a);
  v.block(c.x + 0.22, 1.3, c.z - 1.12, 0.14, 0.08, 0.14, 0xd9a35a);
  v.block(c.x + 0.22, 1.38, c.z - 1.12, 0.04, 0.04, 0.04, 0xd9a35a);
  v.box(c.x - 0.25, 1.27, c.z - 0.75, 0.32, 0.05, 0.24, 0x6a1f2a);
  v.box(c.x - 0.24, 1.32, c.z - 0.74, 0.3, 0.012, 0.22, 0xf0e4c8);
  v.box(c.x + 0.58, 1.27, c.z - 0.92, 0.34, 0.04, 0.34, 0x2a2226);
  for (const [a, b] of [[0, 0], [0.29, 0], [0, 0.29], [0.29, 0.29]]) v.box(c.x + 0.6 + a, 1.31, c.z - 0.9 + b, 0.03, 0.36, 0.03, 0x2a2226);
  v.box(c.x + 0.64, 1.31, c.z - 0.86, 0.22, 0.32, 0.22, 0xffc46a, true);
  v.box(c.x + 0.58, 1.67, c.z - 0.92, 0.34, 0.05, 0.34, 0x2a2226);
  v.block(c.x + 0.75, 1.72, c.z - 0.75, 0.06, 0.08, 0.06, 0x2a2226);
  // The till's lamp hangs to Skyla's left and low, so it lights the counter, not her (she's cream and white).
  lights.push({ x: c.x - 0.6, y: 2.4, z: c.z + 1.2, intensity: 4 }, { x: 3.2, y: 3.6, z: 2.6 }, { x: 3.2, y: 3.4, z: 5, color: 0xffc890, intensity: 6 }, { x: 0.4, y: 1.5, z: 5.2, color: 0xb8a8ff, intensity: 4 });
  return { group: v.build(), lights };
}
