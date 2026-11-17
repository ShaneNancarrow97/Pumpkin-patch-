import { VoxelGrid } from "../voxel-mesh.js";

// The modelling kit behind every recipe (see index.js for how to use it).
// A model is built in its art's own pixels: x right from the art's left edge,
// y up from its base, z forwards from the back. Shapes fill voxels whose centres
// fall inside them; later shapes paint over earlier ones. Colour comes from the
// art: projected onto whatever the art can see, and carried round to the faces
// it can't (sides, backs, undersides), a touch darker.
const ART = 1, FILL = 2;                                           // pending paints, settled in finish()
const HIDDEN = 0.86;                                               // how much darker unseen faces are
export const glows = (c) => { const r = c >> 16, g = (c >> 8) & 255, b = c & 255, max = Math.max(r, g, b), min = Math.min(r, g, b); return max > 215 && (max - min) / max > 0.3 && !(b > r && b > g); };
export const rgbOf = (c) => [c >> 16, (c >> 8) & 255, c & 255];
const lum = (c) => (c >> 16) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
const pack = (r, g, b) => (Math.max(0, Math.min(255, Math.round(r))) << 16) | (Math.max(0, Math.min(255, Math.round(g))) << 8) | Math.max(0, Math.min(255, Math.round(b)));
export const scale = (c, k) => pack((c >> 16) * k, ((c >> 8) & 255) * k, (c & 255) * k);
export const mix = (a, b, t) => pack((a >> 16) + ((b >> 16) - (a >> 16)) * t, ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t, (a & 255) + ((b & 255) - (a & 255)) * t);
const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const lerpProfile = (pts, t) => {
  if (typeof pts === "function") return pts(t);
  if (typeof pts === "number") return pts;
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, a] = pts[i - 1], [t1, b] = pts[i]; return a + (b - a) * ((t - t0) / (t1 - t0 || 1)); }
  return pts[pts.length - 1][1];
};
const order = (a, b) => (a <= b ? [a, b] : [b, a]);

// pixels: rows top-down of 0xrrggbb or -1 where the art is clear.
export function buildModel(recipe, art, pixels) {
  const W = recipe.width ?? art.w, H = recipe.height ?? art.h, D = recipe.depth ?? 8, res = recipe.res ?? 1;
  const grid = new VoxelGrid(Math.ceil(W * res), Math.ceil(H * res), Math.ceil(D * res)), n = grid.kind.length;
  const mode = new Uint8Array(n), part = new Uint16Array(n), sockets = [], glowAreas = [];
  let parts = 0;
  // The art, by recipe coordinates (y up). Outside or clear: null.
  const px = (x, y) => { const c = Math.floor(x), r = art.h - 1 - Math.floor(y); return c >= 0 && r >= 0 && c < art.w && r < art.h && pixels[r][c] >= 0 ? pixels[r][c] : null; };
  // The nearest opaque pixel, for edges that overhang the art.
  const near = (x, y) => {
    for (let d = 0; d < 12; d++) for (let i = -d; i <= d; i++) for (const [a, b] of [[i, -d], [i, d], [-d, i], [d, i]]) { const c = px(x + a, y + b); if (c !== null) return c; }
    return 0x808080;
  };
  const region = (x0, y0, x1, y1) => {
    [x0, x1] = order(x0, x1); [y0, y1] = order(y0, y1);
    const list = [];
    for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) { const c = px(x, y); if (c !== null) list.push(c); }
    return list.length ? list : [near((x0 + x1) / 2, (y0 + y1) / 2)];
  };

  // Writes one voxel with a paint: a colour, "art", "fill", or a function of (x, y, z, box).
  function put(i, j, k, paint, box, glow, id) {
    const x = (i + 0.5) / res, y = (j + 0.5) / res, z = (k + 0.5) / res;
    let p = typeof paint === "function" ? paint(x, y, z, box) : paint;
    if (p === null || p === undefined) p = "art";
    const at = grid.index(i, j, k);
    grid.kind[at] = glow ? 2 : 1; part[at] = id;
    if (typeof p === "number") { grid.rgb[at] = p; mode[at] = 0; } else mode[at] = p === "fill" ? FILL : ART;
  }
  // Visits every voxel whose centre lies in a box (recipe units), calling test(x, y, z).
  function each(x0, y0, z0, x1, y1, z1, test, paint, opts = {}) {
    [x0, x1] = order(x0, x1); [y0, y1] = order(y0, y1); [z0, z1] = order(z0, z1);
    const box = { x0, y0, z0, x1, y1, z1 }, id = opts.part ?? ++parts;
    const i0 = Math.max(0, Math.floor(x0 * res)), i1 = Math.min(grid.nx, Math.ceil(x1 * res));
    const j0 = Math.max(0, Math.floor(y0 * res)), j1 = Math.min(grid.ny, Math.ceil(y1 * res));
    const k0 = Math.max(0, Math.floor(z0 * res)), k1 = Math.min(grid.nz, Math.ceil(z1 * res));
    for (let k = k0; k < k1; k++) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      const x = (i + 0.5) / res, y = (j + 0.5) / res, z = (k + 0.5) / res;
      if (x < x0 || x > x1 || y < y0 || y > y1 || z < z0 || z > z1 || !test(x, y, z)) continue;
      if (paint === CARVE) grid.kind[grid.index(i, j, k)] = 0;
      else put(i, j, k, paint, box, opts.glow, id);
    }
    return id;
  }
  // A steady random number for the block of `grain` voxels round a point: speckle in
  // blocks rather than single voxels lets neighbouring faces match and merge.
  const speckle = (x, y, z, grain) => hash(Math.floor((x * res) / grain), Math.floor((y * res) / grain), Math.floor((z * res) / grain));
  const CARVE = {};
  const all = () => true;

  const view = ((recipe.view ?? 0) * Math.PI) / 180, front = recipe.front ?? D, lift = recipe.lift ?? 0;
  const k = {
    W, H, D, res, art,
    // The height at depth z that shows at art row v from the recipe's view, for
    // reading positions off art drawn from above (with view 0 it is just v).
    y: (v, z = front) => (v - lift - (front - z) * Math.sin(view)) / Math.cos(view),
    // Colours from the art, in recipe coordinates.
    at: (x, y) => px(x, y) ?? near(x, y),
    avg(x0, y0, x1, y1) { const l = region(x0, y0, x1, y1), s = [0, 0, 0]; for (const c of l) { s[0] += c >> 16; s[1] += (c >> 8) & 255; s[2] += c & 255; } return pack(s[0] / l.length, s[1] / l.length, s[2] / l.length); },
    // A region of the art as a texture: stretched over the shape's box (or tiled
    // at one pixel per voxel), on its front ("xy"), top ("xz", back at the art's top) or side ("zy").
    tex(x0, y0, x1, y1, { plane = "xy", tile = false, flip = false } = {}) {
      [x0, x1] = order(x0, x1); [y0, y1] = order(y0, y1);
      return (x, y, z, b) => {
        let u, v, us, vs;
        if (plane === "xz") { u = x - b.x0; us = b.x1 - b.x0; v = b.z1 - z; vs = b.z1 - b.z0; }
        else if (plane === "zy") { u = z - b.z0; us = b.z1 - b.z0; v = y - b.y0; vs = b.y1 - b.y0; }
        else { u = x - b.x0; us = b.x1 - b.x0; v = y - b.y0; vs = b.y1 - b.y0; }
        if (flip) u = us - u;
        const ax = tile ? x0 + (((u % (x1 - x0)) + (x1 - x0)) % (x1 - x0)) : x0 + (u / (us || 1)) * (x1 - x0);
        const ay = tile ? y0 + (((v % (y1 - y0)) + (y1 - y0)) % (y1 - y0)) : y0 + (v / (vs || 1)) * (y1 - y0);
        return px(Math.min(ax, x1 - 0.01), Math.min(ay, y1 - 0.01)) ?? near(ax, ay);
      };
    },
    // Colours scattered from a region of the art: a fabric or a grain without its
    // layout. trim drops that share of the darkest and lightest pixels (outlines, glints);
    // amount: how far each voxel strays from the region's average; grain: the speckle's size in voxels.
    mottle(x0, y0, x1, y1, { trim = 0.15, amount = 1, grain = 2 } = {}) {
      const all = region(x0, y0, x1, y1).sort((a, b) => lum(a) - lum(b)), cut = Math.floor(all.length * trim), l = all.slice(cut, all.length - cut || undefined);
      const list = l.length ? l : all, s = list.reduce((a, c) => [a[0] + (c >> 16), a[1] + ((c >> 8) & 255), a[2] + (c & 255)], [0, 0, 0]), base = pack(s[0] / list.length, s[1] / list.length, s[2] / list.length);
      return (x, y, z) => mix(base, list[Math.floor(speckle(x, y, z, grain) * list.length)], amount);
    },
    // Different paints for a shape's outer faces: front, back, top, bottom, left
    // and right, each taking the voxels nearest that face of the shape's box (to
    // `depth` pixels in); other paints the rest.
    layers({ depth = 2, other = "fill", ...faces }) {
      const names = ["front", "top", "left", "right", "back", "bottom"];
      return (x, y, z, b) => {
        const d = [b.z1 - z, b.y1 - y, x - b.x0, b.x1 - x, z - b.z0, y - b.y0];
        let best = -1;
        for (let i = 0; i < 6; i++) if (faces[names[i]] !== undefined && d[i] < depth && (best < 0 || d[i] < d[best])) best = i;
        const p = best < 0 ? other : faces[names[best]];
        return typeof p === "function" ? p(x, y, z, b) : p;
      };
    },
    vary: (c, amount = 0.08, grain = 2) => (x, y, z) => scale(c, 1 + (speckle(x, y, z, grain) - 0.5) * 2 * amount),
    shade: (paint, f) => (typeof paint === "number" ? scale(paint, f) : (x, y, z, b) => { const c = typeof paint === "function" ? paint(x, y, z, b) : paint; return typeof c === "number" ? scale(c, f) : c; }),
    mix, scale,

    // Shapes. paint defaults to "art"; opts: { glow, part }.
    // A box from corner to corner; round: radius of rounded edges (all, or only
    // those along one axis with axis: "x" | "y" | "z").
    box(x0, y0, z0, x1, y1, z1, paint, opts = {}) {
      const r = opts.round ?? 0;
      if (!r) return each(x0, y0, z0, x1, y1, z1, all, paint, opts);
      [x0, x1] = order(x0, x1); [y0, y1] = order(y0, y1); [z0, z1] = order(z0, z1);
      const c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], h = [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2], skip = { x: 0, y: 1, z: 2 }[opts.axis] ?? -1;
      return each(x0, y0, z0, x1, y1, z1, (...p) => {
        let s = 0;
        for (let a = 0; a < 3; a++) { if (a === skip) continue; const d = Math.max(0, Math.abs(p[a] - c[a]) - (h[a] - r)); s += d * d; }
        return s <= r * r + 0.01;
      }, paint, opts);
    },
    // A square post centred on (x, z).
    post(x, z, w, y0, y1, paint, opts = {}) { const d = opts.d ?? w; return k.box(x - w / 2, y0, z - d / 2, x + w / 2, y1, z + d / 2, paint, opts); },
    // A rod from point a to point b ([x, y, z]), radius r or [r at a, r at b]; caps: round ends.
    cyl(a, b, r, paint, opts = {}) {
      const [ra, rb] = Array.isArray(r) ? r : [r, r], m = Math.max(ra, rb), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 || 1;
      return each(Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.min(a[2], b[2]) - m, Math.max(a[0], b[0]) + m, Math.max(a[1], b[1]) + m, Math.max(a[2], b[2]) + m, (x, y, z) => {
        let t = ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / len2;
        if (!opts.caps && (t < 0 || t > 1)) return false;
        t = Math.max(0, Math.min(1, t));
        const rr = ra + (rb - ra) * t;
        return (x - a[0] - d[0] * t) ** 2 + (y - a[1] - d[1] * t) ** 2 + (z - a[2] - d[2] * t) ** 2 <= rr * rr + 0.01;
      }, paint, opts);
    },
    // A turned shape round a vertical axis at (x, z), from y0 to y1. profile: radius,
    // [[t, r], ...] with t from 0 at y0 to 1 at y1, or a function of t.
    // opts: depth (z radius as a share of x radius), ribs: [count, depth] for pumpkin lobes.
    lathe(x, z, y0, y1, profile, paint, opts = {}) {
      const rmax = typeof profile === "number" ? profile : typeof profile === "function" ? opts.max ?? 32 : Math.max(...profile.map((p) => p[1])), dz = opts.depth ?? 1;
      return each(x - rmax, y0, z - rmax * dz, x + rmax, y1, z + rmax * dz, (px_, py, pz) => {
        let r = lerpProfile(profile, (py - y0) / (y1 - y0 || 1));
        const ax = px_ - x, az = (pz - z) / dz;
        if (opts.ribs) r *= 1 - opts.ribs[1] * Math.abs(Math.sin((Math.atan2(az, ax) * opts.ribs[0]) / 2));
        return ax * ax + az * az <= r * r + 0.01;
      }, paint, opts);
    },
    // An ellipsoid centred on (x, y, z) with radii rx, ry, rz; ribs as for lathe.
    ball(x, y, z, rx, ry, rz, paint, opts = {}) {
      return each(x - rx, y - ry, z - rz, x + rx, y + ry, z + rz, (a, b, c) => {
        let s = 1;
        if (opts.ribs) s = 1 - opts.ribs[1] * Math.abs(Math.sin((Math.atan2((c - z) / rz, (a - x) / rx) * opts.ribs[0]) / 2));
        return ((a - x) / rx) ** 2 + ((b - y) / ry) ** 2 + ((c - z) / rz) ** 2 <= s * s;
      }, paint, opts);
    },
    // Anything else: every voxel in the box where test(x, y, z) is true.
    shape(x0, y0, z0, x1, y1, z1, test, paint, opts) { return each(x0, y0, z0, x1, y1, z1, test, paint, opts); },
    // The art's own silhouette (within rect [x0, y0, x1, y1], where where(colour, x, y)
    // allows), pushed back from z0 to z1. round: depth falls away over that many
    // pixels from the silhouette's edge, front and back, like a cushion (back: false keeps the back flat).
    extrude(z0, z1, paint, opts = {}) {
      const [x0, y0, x1, y1] = opts.rect ?? [0, 0, art.w, art.h], r = opts.round ?? 0, where = opts.where ?? all;
      const w = Math.ceil(x1) - Math.floor(x0), h = Math.ceil(y1) - Math.floor(y0), ox = Math.floor(x0), oy = Math.floor(y0);
      const inside = (x, y) => { if (x < x0 || x >= x1 || y < y0 || y >= y1) return false; const c = px(x, y); return c !== null && where(c, Math.floor(x), Math.floor(y)); };
      // Distance from the silhouette's edge, in pixels (a two-pass chamfer).
      let dist = null;
      if (r) {
        dist = new Float32Array(w * h).fill(1e9);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!inside(ox + x + 0.5, oy + y + 0.5)) dist[y * w + x] = 0;
        const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : dist[y * w + x]);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dist[y * w + x] = Math.min(dist[y * w + x], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
        for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) dist[y * w + x] = Math.min(dist[y * w + x], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
      }
      // Swept along the view, so from the room camera its outline is the art's.
      const [za, zb] = order(z0, z1), v = (y, z) => y * Math.cos(view) + (front - z) * Math.sin(view) + lift;
      const yLow = view ? (y0 - lift - (front - za) * Math.sin(view)) / Math.cos(view) : y0, yHigh = view ? (y1 - lift - (front - zb) * Math.sin(view)) / Math.cos(view) : y1;
      return each(x0, Math.min(yLow, y0), za, x1, Math.max(yHigh, y1), zb, (x, y, z) => {
        const vy = v(y, z);
        if (!inside(x, vy)) return false;
        if (!r) return true;
        const d = Math.min(r, dist[(Math.floor(vy) - oy) * w + Math.floor(x) - ox] - 0.5), inset = r - Math.sqrt(Math.max(0, r * r - (r - d) ** 2));
        return z <= zb - inset && (opts.back === false || z >= za + inset);
      }, paint, opts);
    },
    // Cloth hanging from a rail between a = [x, z] and b = [x, z], from y top down
    // to y bottom, in folds (folds: px between ridges, amp: px deep, thick: px).
    // tie: { at, y, gather } ties it back at height y towards `at` (0 to 1 along
    // the rail), leaving `gather` of its width, and lets it fall loose below.
    drape(a, b, top, bottom, paint, opts = {}) {
      const { folds = 6, amp = 1.2, thick = 1.2, tie = null, flare = 1.6 } = opts;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, nx = -uz, nz = ux;
      const m = amp * 2.5 + thick, [yb, yt] = order(bottom, top);
      const span = (y) => {
        if (!tie) return [0, 1];
        const g = tie.gather ?? 0.25, at = tie.at ?? 0, s = y >= tie.y ? g + (1 - g) * ((y - tie.y) / (yt - tie.y || 1)) : Math.min(1, g * (1 + (flare - 1) * ((tie.y - y) / (tie.y - yb || 1))));
        return [at - at * s, at + (1 - at) * s];
      };
      return each(Math.min(a[0], b[0]) - m, yb, Math.min(a[1], b[1]) - m, Math.max(a[0], b[0]) + m, yt, Math.max(a[1], b[1]) + m, (x, y, z) => {
        const t = ((x - a[0]) * ux + (z - a[1]) * uz) / len, o = (x - a[0]) * nx + (z - a[1]) * nz, [t0, t1] = span(y);
        if (t < t0 || t > t1) return false;
        const c = (t - t0) / (t1 - t0 || 1), bunch = 1 / Math.max(0.35, t1 - t0), w = (2 * Math.PI * len) / folds;
        const f = amp * Math.min(2.2, bunch) * Math.sin(c * w), slope = amp * Math.min(2.2, bunch) * Math.cos(c * w) * w / (len * (t1 - t0) || 1);
        return Math.abs(o - f) <= (thick / 2) * Math.sqrt(1 + slope * slope);
      }, paint, opts);
    },
    // Takes voxels away: a box, or a test over a box.
    carve(x0, y0, z0, x1, y1, z1, test = all) { each(x0, y0, z0, x1, y1, z1, test, CARVE); },
    // Mirror pairs: fn(X) runs twice, with X(x) = x and X(x) = W - x.
    sym(fn) { fn((x) => x); fn((x) => W - x); },
    // A slot a book stands in: left x, shelf top y, back z, and its width, height and depth.
    socket(x, y, z, w, h, d) { sockets.push({ x, y, z, w, h, d }); },
    // Art-painted voxels whose art pixel lies in the rect and passes test (bright, warm by default) glow.
    glowArt(x0, y0, x1, y1, test = glows) { glowAreas.push({ x0, y0, x1, y1, test }); },
  };

  recipe.build(k);
  finish();
  return { grid, sockets, size: [W, H, D], part };

  // Paints the art onto everything it can see from the recipe's view (degrees
  // down from straight on), then carries colour round to everything else.
  function finish() {
    const { nx, ny, nz, kind, rgb } = grid, sin = Math.sin(view), cos = Math.cos(view), stepY = sin * 0.5, stepZ = cos * 0.5, graze = recipe.graze ?? 0.45;
    const filled = (i, j, l) => i >= 0 && j >= 0 && l >= 0 && i < nx && j < ny && l < nz && kind[(l * ny + j) * nx + i] !== 0;
    const known = new Uint8Array(n);
    for (let l = 0; l < nz; l++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const at = (l * ny + j) * nx + i;
      if (!kind[at]) continue;
      if (mode[at] !== ART) { known[at] = mode[at] === 0 ? 1 : 0; continue; }
      // Only faces turned towards the view take the art; at a grazing angle it
      // would smear into stripes when seen from anywhere else.
      if (!((cos >= graze && !filled(i, j, l + 1)) || (sin >= graze && !filled(i, j + 1, l)))) continue;
      // Can the art see it? March towards the viewer until we leave the grid.
      let y = j + 0.5, z = l + 0.5, seen = true;
      for (;;) {
        y += stepY; z += stepZ;
        const jj = Math.floor(y), ll = Math.floor(z);
        if (jj >= ny || ll >= nz) break;
        if ((jj !== j || ll !== l) && filled(i, jj, ll)) { seen = false; break; }
      }
      if (!seen) continue;
      const x = (i + 0.5) / res, yy = (j + 0.5) / res, zz = (l + 0.5) / res, v = yy * cos + (front - zz) * sin + lift;
      const c = px(x, v);
      rgb[at] = c ?? near(x, v); known[at] = 1;
      if (glowAreas.some((g) => x >= g.x0 && x < g.x1 && v >= g.y0 && v < g.y1 && g.test(rgb[at]))) kind[at] = 2;
    }
    // Each shape's colours as the art painted them: a palette and its mean.
    const palettes = new Map();
    for (let at = 0; at < n; at++) if (kind[at] && known[at] === 1) {
      let p = palettes.get(part[at]);
      if (!p) palettes.set(part[at], (p = { list: [], sum: [0, 0, 0] }));
      const c = rgb[at];
      if (p.list.length < 512) p.list.push(c);
      p.sum[0] += c >> 16; p.sum[1] += (c >> 8) & 255; p.sum[2] += c & 255; p.n = (p.n ?? 0) + 1;
    }
    for (const p of palettes.values()) p.mean = pack(p.sum[0] / p.n, p.sum[1] / p.n, p.sum[2] / p.n);
    // Unseen voxels carry on the colour of the nearest seen one in their shape,
    // fading over a few voxels into the shape's own mottle, a touch darker; a
    // shape the art never sees borrows from its neighbours.
    const dist = new Uint16Array(n), src = new Uint32Array(n);
    for (const sameShape of [true, false]) {
      let queue = [];
      for (let at = 0; at < n; at++) if (kind[at] && known[at]) { queue.push(at); if (known[at] === 1) src[at] = rgb[at]; }
      while (queue.length) {
        const next = [];
        for (const at of queue) {
          const i = at % nx, j = Math.floor(at / nx) % ny, l = Math.floor(at / (nx * ny));
          for (const [di, dj, dl] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
            const a = i + di, b = j + dj, c = l + dl;
            if (!filled(a, b, c)) continue;
            const to = (c * ny + b) * nx + a;
            if (known[to] || (sameShape && part[to] !== part[at])) continue;
            known[to] = 2; dist[to] = dist[at] + 1; src[to] = src[at];
            const p = palettes.get(part[to]);
            if (sameShape && p && mode[to] === ART) {
              // In steps and in blocks of two voxels, so neighbouring faces often match and merge.
              const base = mix(p.mean, src[to], 0.5 ** ((dist[to] >> 1) / 1.5));
              rgb[to] = scale(mix(base, p.list[Math.floor(hash(a >> 1, b >> 1, c >> 1) * p.list.length)], 0.3), HIDDEN);
            } else rgb[to] = rgb[at];
            next.push(to);
          }
        }
        queue = next;
      }
    }
  }
}
