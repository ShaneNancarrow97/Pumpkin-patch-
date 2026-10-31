// Curios: d07 monstera, d08 autumn bouquet, d12 ghost plush, d13 bubbling cauldron, d14 grandfather clock, d15 pumpkin trio, d16 witch's broom and hat.
// Mostly round and growing things, so they are turned, swollen and grown in
// the round rather than pushed back from the art; each part takes its colours
// from where it is in the art, shaded by its own form so it reads from every side.

const lum = (c) => (c >> 16) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
const hash = (a, b, c) => { let h = (Math.floor(a) * 374761393 + Math.floor(b) * 668265263 + Math.floor(c) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// A radius at height y from [y, r] pairs read straight off the art.
const profile = (pts) => (y) => {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [y0, a] = pts[i - 1], [y1, b] = pts[i]; return a + ((b - a) * (y - y0)) / (y1 - y0 || 1); }
  return pts[pts.length - 1][1];
};
// A rod along a path of [x, y, z, r] points, joined round.
const path = (k, pts, paint, opts = {}) => { for (let i = 1; i < pts.length; i++) k.cyl(pts[i - 1].slice(0, 3), pts[i].slice(0, 3), [pts[i - 1][3], pts[i][3]], paint, { caps: true, ...opts }); };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// A ring of radius R and thickness r round centre c, lying in the plane of a and b.
function ring(k, c, a, b, R, r, paint, opts) {
  const n = cross(a, b), m = R + r;
  return k.shape(c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m, (x, y, z) => {
    const p = sub([x, y, z], c);
    return (Math.hypot(dot(p, a), dot(p, b)) - R) ** 2 + dot(p, n) ** 2 <= r * r + 0.01;
  }, paint, opts);
}

// Wood grain: a colour streaking along y (or x) in runs of `len` voxels.
const grain = (k, c, { len = 7, amount = 0.08, along = "y" } = {}) => (x, y, z) => {
  const i = Math.floor(x * 1.5), j = Math.floor(y * 1.5), l = Math.floor(z * 1.5);
  return k.scale(c, 1 + (along === "x" ? hash(Math.floor((i + 7 * hash(0, j, l)) / len), j, l) : hash(i, Math.floor((j + 7 * hash(i, 0, l)) / len), l)) * 2 * amount - amount);
};
// An ivy leaf: three rounded lobes about a point, lying in the plane of a and b (b up the leaf).
function ivy(k, c, a, b, s, paint, opts) {
  const n = cross(a, b), m = s * 1.4;
  return k.shape(c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m, (x, y, z) => {
    const p = sub([x, y, z], c), u = dot(p, a) / s, v = dot(p, b) / s, w = dot(p, n);
    if (Math.abs(w + 0.25 * (u * u + v * v) * s) > 0.55) return false;
    const r = Math.hypot(u, v), t = Math.atan2(u, v);
    return r < 0.55 + 0.45 * Math.abs(Math.cos(t * 1.5)) ** 0.6;
  }, paint, opts);
}

// A leaf: a thin sheet about centre c in the plane of a (across) and b (up the
// leaf), cupped a little; inside(r, t) says if a point at radius r (in leaf sizes)
// and angle t (from the tip, round) is in it.
function leafy(k, c, a, b, s, inside, paint, { cup = 0.25, thick = 0.6, opts } = {}) {
  const n = cross(a, b), m = s * 1.4;
  return k.shape(c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m, (x, y, z) => {
    const p = sub([x, y, z], c), u = dot(p, a) / s, v = dot(p, b) / s, w = dot(p, n);
    return Math.abs(w + cup * (u * u + v * v) * s) <= thick && inside(Math.hypot(u, v), Math.atan2(u, v));
  }, paint, opts);
}
const maple = (r, t) => r < 0.5 + 0.5 * Math.abs(Math.cos(t * 2.5)) ** 1.6;      // five pointed lobes, the stalk in the notch
const lobed = (r, t) => r < 0.62 + 0.38 * Math.abs(Math.cos(t * 2.5)) ** 1.5;   // a pumpkin leaf's five round lobes
// A pumpkin: a squat ball pinched into lobes, dimpled top and bottom, shaded by
// lobe and height from a palette of the art's own colours (deep, mid, light) so
// the colour follows the lobes from every side.
function pumpkin(k, [cx, cy, cz], [rx, ry, rz], { ribs = 12, groove = 0.1, dimple = 2.5, deep, mid, light, speck = null, opts } = {}) {
  const g = (x, z) => 1 - Math.abs(Math.cos(Math.atan2((x - cx) / rx, (z - cz) / rz) * (ribs / 2)));
  return k.shape(cx - rx, cy - ry, cz - rz, cx + rx, cy + ry, cz + rz, (x, y, z) => {
    const e = Math.hypot((x - cx) / rx, (z - cz) / rz), s = e / (1 - groove * g(x, z)), dy = (y - cy) / ry, pit = dimple * Math.exp(-((e / 0.22) ** 2));
    return s * s + dy * dy <= 1 && y <= cy + ry - pit && y >= cy - ry + pit * 0.6;
  }, (x, y, z) => {
    // In steps rather than smoothly, so the lobes shade in bands of voxels as a pixel artist would.
    const q = (v, n) => Math.round(v * n) / n, h = q(Math.min(1, Math.max(0, (y - cy + ry) / (2 * ry))), 6), gr = q(g(x, z) ** 0.7, 4);
    const c = k.mix(k.mix(deep, mid, Math.min(1, h * 2.2)), light, q(Math.max(0, Math.min(1, h * 1.5 - 0.15)) * (1 - gr), 5) * 0.85), out = k.mix(c, deep, gr * 0.55);
    return speck && hash(x * 1.3, y * 1.3, z * 1.3) < 0.06 ? k.mix(out, speck, 0.6) : out;
  }, opts);
}

// A monstera leaf hanging from its stalk: heart-shaped, the stalk in the notch at
// the top, the blade falling to its tip, split from the edge between the veins
// and curling back a little. n0: roughly the way its face turns.
function monstera(k, notch, tip, n0, W, { deep = 0x2a3610, mid = 0x3e5016, light = 0x4c6420, vein = 0x5a7426 } = {}) {
  const d = sub(tip, notch), L = Math.hypot(...d), b = norm(d), a = norm(cross(b, n0)), n = cross(a, b), m = Math.max(L, W) + 2;
  const half = (v) => { const t = (v / L - 0.36) / 0.64; return t < -1 || t > 1 ? 0 : (W / 2) * Math.sqrt(1 - t * t) * (1 - 0.3 * Math.max(0, (v / L - 0.6) / 0.4)); };
  // Splits run in from the edge between the veins, which sweep out towards the tip.
  const splits = [0.16, 0.38, 0.6], sa = Math.sin(0.55), ca = Math.cos(0.55), along = (u, v, vi) => -Math.abs(u) * sa + (v - vi * L) * ca;
  const cut = (u, v) => Math.abs(u) > 0.36 * half(v) && splits.some((vi) => Math.abs(along(u, v, vi)) < 0.5);
  const local = (x, y, z) => { const p = sub([x, y, z], notch); return [dot(p, a), dot(p, b), dot(p, n)]; };
  k.shape(Math.min(notch[0], tip[0]) - m, Math.min(notch[1], tip[1]) - m, Math.min(notch[2], tip[2]) - m, Math.max(notch[0], tip[0]) + m, Math.max(notch[1], tip[1]) + m, Math.max(notch[2], tip[2]) + m, (x, y, z) => {
    const [u, v, w] = local(x, y, z), h = half(v);
    if (h <= 0 || Math.abs(u) > h || (v < 0.1 * L && Math.abs(u) < (0.1 * L - v) * 1.4)) return false;
    return Math.abs(w + 0.12 * (v * v) / L - 0.06 * (u * u) / (W / 2)) <= 0.7 && !cut(u, v);
  }, (x, y, z) => {
    // A dark rim like the art's outline, the midrib and veins a little paler, the blade lighter towards the stalk.
    const [u, v] = local(x, y, z), h = half(v);
    if (Math.abs(u) < 0.6 && v > 0) return vein;
    if (Math.abs(u) > h - 0.7 || cut(u * 1.12, v) || cut(u * 0.9, v)) return deep;
    if (splits.some((vi) => Math.abs(along(u, v, vi + 0.11)) < 0.4)) return k.mix(mid, vein, 0.45);
    return v < L * 0.45 ? light : mid;
  });
}

// The plane of a flower or leaf facing f: [across, up], for leafy().
const facing = (f, up = [0, 1, 0]) => { const b = norm(sub(up, f.map((v) => v * dot(up, f)))); return [cross(b, f), b]; };
// A full round flower head (a carnation, a peony) facing f: a dome of ruffled
// petals, shaded in rings that open out from a golden heart.
function puff(k, c, f, r, light, { shadow = k.scale(light, 0.7), heart = 0xc89040 } = {}) {
  const [a, b] = facing(f);
  return k.shape(c[0] - r, c[1] - r, c[2] - r, c[0] + r, c[1] + r, c[2] + r, (x, y, z) => {
    const p = sub([x, y, z], c), w = dot(p, f), q = Math.hypot(dot(p, a), dot(p, b)), t = Math.atan2(dot(p, a), dot(p, b));
    const rr = r * (1 - 0.1 * Math.abs(Math.sin(t * 4 + q)));
    return w > -0.25 * r && (q / rr) ** 2 + (w / (0.7 * r)) ** 2 <= 1;
  }, (x, y, z) => {
    const p = sub([x, y, z], c), q = Math.hypot(dot(p, a), dot(p, b)), t = Math.atan2(dot(p, a), dot(p, b));
    if (q < r * 0.18) return heart;
    return ((q / r) * 3.2 + 0.5 * Math.sin(t * 5)) % 1 < 0.3 ? shadow : light;
  });
}
// A flower of open petals facing f: outline(r, t) as for leaves, a heart in the middle.
function bloom(k, c, f, r, outline, petal, heart) {
  const [a, b] = facing(f);
  leafy(k, c, a, b, r, outline, (x, y, z) => { const p = sub([x, y, z], c), q = Math.hypot(dot(p, a), dot(p, b)) / r; return q > 0.78 ? k.scale(petal, 0.8) : k.mix(petal, k.scale(petal, 1.15), Math.max(0, 0.6 - q)); }, { cup: -0.14 });
  k.ball(c[0] + f[0] * 0.8, c[1] + f[1] * 0.8, c[2] + f[2] * 0.8, r * 0.24, r * 0.24, r * 0.24, heart);
}
const petals5 = (r, t) => r < 0.4 + 0.6 * Math.abs(Math.cos(t * 2.5)) ** 0.7;
const petals6 = (r, t) => r < 0.25 + 0.75 * Math.abs(Math.cos(t * 3)) ** 1.8;
// A slim leaf from its base along d: an ellipse length long and width wide, bending
// down `droop` px by its tip, facing roughly f.
function blade(k, base, d, len, width, f, paint, droop = 0) {
  const b = norm(d), a = norm(cross(b, f)), n = cross(a, b), m = len + width + Math.abs(droop) + 1;
  return k.shape(base[0] - m, base[1] - m, base[2] - m, base[0] + m, base[1] + m, base[2] + m, (x, y, z) => {
    const p = sub([x, y, z], base), v = dot(p, b), u = dot(p, a), t = v / len;
    if (t < 0 || t > 1) return false;
    const off = droop * t * t, h = (width / 2) * Math.sin(Math.PI * t ** 0.8);
    return Math.abs(u) <= h && Math.abs(dot(p, n) + off) <= 0.6;
  }, paint);
}

export default {
  // A witch's hat lying on the floor, its wide brim gone soft and wavy, the
  // crumpled cone leaning and its tip flopping over; a plum ribbon round it,
  // tied in a bow with tails trailing over the brim, a gilt moon buckle, a posy
  // of autumn flowers and a dried sprig tucked into it. The besom leans across
  // it, its handle up in the air behind, the straw fanned out on the brim.
  d16: {
    depth: 60,
    build(k) {
      const cz = 30, hx = 31.5, felt = k.mottle(4, 4, 18, 12, { trim: 0.2, amount: 0.5, grain: 3 }), ribbon = k.vary(0x6a3640, 0.08), gold = k.vary(0xc8944c, 0.08);
      // The brim: a soft disc drooping from the crown to a wavy edge.
      const BR = 29, lift = (x, z) => { const q = Math.hypot((x - 29) / BR, (z - cz) / 28), t = Math.atan2(x - 29, z - cz); return 4 - 2.6 * q * q + 1.5 * Math.sin(t * 4 + 1) * q ** 3; };
      k.shape(0, 0, 1, 58.5, 8, 59, (x, y, z) => Math.hypot((x - 29) / BR, (z - cz) / 28) <= 1 && Math.abs(y - lift(x, z)) <= 0.8, (x, y, z) => (Math.hypot((x - 29) / BR, (z - cz) / 28) > 0.95 ? k.shade(felt, 0.8)(x, y, z) : felt(x, y, z)));
      // The cone, leaning right and a little crumpled, its tip flopping over to the right.
      const H = 42, axis = (y) => hx + 4 * ((y - 3) / H), rad = (y) => 12.6 * Math.max(0, 1 - (y - 3) / (H + 3)) ** 0.48;
      k.shape(hx - 13, 3, cz - 13, hx + 17, 3 + H, cz + 13, (x, y, z) => { const t = Math.atan2(x - axis(y), z - cz); return Math.hypot(x - axis(y), z - cz) <= rad(y) * (1 + 0.05 * Math.sin(t * 3 + y * 0.35)); }, felt);
      path(k, [[axis(3 + H) - 0.2, 3 + H - 1, cz, rad(2 + H)], [hx + 6.4, 48.5, cz, 2], [hx + 9.2, 49.6, cz - 0.4, 1.4], [hx + 12.2, 48.8, cz - 0.6, 0.9], [hx + 14, 47.4, cz - 0.6, 0.4]], felt);
      // The ribbon round the crown, the bow at the front right and its tails trailing over the brim.
      k.shape(hx - 14, 3, cz - 14, hx + 14, 9.5, cz + 14, (x, y, z) => { const d = Math.hypot(x - axis(y), z - cz); return d <= rad(y) + 0.8 && d > rad(y) - 1; }, ribbon);
      const bow = [hx + 5.5, 7.5, cz + 11.2];
      for (const s of [-1, 1]) ring(k, [bow[0] + s * 2.4, bow[1] + 0.6, bow[2] + 0.6], norm([1, s * 0.25, 0.2]), [0, 1, -0.3], 2.1, 0.8, ribbon);
      k.ball(...bow, 1.2, 1.2, 1, k.scale(0x6a3640, 0.85));
      path(k, [[bow[0], bow[1], bow[2] + 0.6, 0.8], [bow[0] + 2, 5.5, cz + 14.5, 0.8], [bow[0] + 4, 3.4, cz + 19, 0.75], [bow[0] + 6, 1.2, cz + 24, 0.7], [bow[0] + 7.5, 0.6, cz + 27, 0.6]], ribbon);
      path(k, [[bow[0], bow[1], bow[2] + 0.6, 0.8], [bow[0] + 4.5, 5.6, cz + 13, 0.8], [bow[0] + 9, 3.8, cz + 17, 0.75], [bow[0] + 12, 2, cz + 20.5, 0.6]], ribbon);
      // The gilt moon buckle on the ribbon.
      const ma = -0.36, mz = cz + Math.cos(ma) * (rad(7) + 0.4), mx = axis(7) + Math.sin(ma) * (rad(7) + 0.4);
      k.shape(mx - 5, 2, mz - 1.5, mx + 5, 12, mz + 2.6, (x, y, z) => Math.hypot(x - mx, y - 7) <= 3.9 && Math.hypot(x - mx - 1.6, y - 7.9) > 3 && Math.abs(z - mz - 0.6 - (x - mx) * Math.tan(-ma)) < 0.9, gold);
      // A posy tucked into the ribbon at the front left: a peach bloom, a smaller orange one, plum leaves.
      const at = (a, y, out = 0.6) => [axis(y) + Math.sin(a) * (rad(y) + out), y, cz + Math.cos(a) * (rad(y) + out)], face = (a) => norm([Math.sin(a), 0.5, Math.cos(a)]);
      bloom(k, at(-1.05, 7, 1.4), face(-1.05), 3.8, petals5, 0xd0905a, 0x8a4a1c);
      bloom(k, at(-1.4, 9.5, 1), face(-1.4), 2.5, petals5, 0xc06a2a, 0x6a3010);
      for (const [a, y, t] of [[-0.75, 10.5, 0.4], [-1.25, 4.5, -0.6], [-1.6, 7.5, 0.9]]) { const [ua, ub] = facing(face(a), [Math.sin(t), Math.cos(t), 0]); leafy(k, at(a, y, 1), ua, ub, 2.4, maple, k.vary(0x5a2a30, 0.08), { cup: -0.1 }); }
      // Autumn leaves tucked in at the back right, and a dried sprig standing up behind on the left.
      for (const [a, y, s, c] of [[1.3, 8, 3.4, 0xb4581e], [1.65, 6.5, 3, 0xc8702c]]) { const [ua, ub] = facing(face(a), [0.5, 1, 0]); leafy(k, at(a, y, 1.6), ua, ub, s, maple, k.vary(c, 0.08), { cup: -0.1 }); }
      for (const [x, z, tx, ty] of [[22, cz - 7, 18, 38], [24, cz - 8, 22, 40], [21, cz - 6, 15, 33]]) {
        path(k, [[x, 8, z, 0.4], [tx, ty, z - 1, 0.3]], 0x5a3a1c);
        for (let t = 0.35; t < 1; t += 0.13) for (const s of [-1, 1]) k.ball(x + (tx - x) * t + s * 1.2, 8 + (ty - 8) * t + 0.4, z - t + s * 0.3, 0.7, 0.9, 0.7, k.vary(0x7a5230, 0.12));
      }
      // The besom, from its handle's knob in the air behind to its straw fanned on the brim.
      const A = [9.5, 55, 28], B = [53, 6.5, 47], dir = norm(sub(B, A)), L = Math.hypot(...sub(B, A)), across = norm(cross(dir, [0, 0, 1])), thin = cross(across, dir);
      const along = (t) => A.map((v, i) => v + dir[i] * L * t), wood = (x, y, z) => k.mix(0x7e491f, 0xa06a32, hash(x, y * 0.3, z) * 0.6), twine = k.vary(0xc89a58, 0.06);
      k.cyl(along(0), along(0.48), [1.5, 1.3], wood, { caps: true });
      k.ball(...along(0), 1.8, 1.8, 1.8, wood);
      for (const [t, w] of [[0.29, 0.03], [0.6, 0.035], [0.46, 0.022]]) k.cyl(along(t - w), along(t + w), t < 0.4 ? 1.9 : 3.4, twine);
      for (const s of [-1, 1]) k.ball(...along(0.42).map((v, i) => v + across[i] * s * 1.8 + thin[i] * 0.8), 1.2, 1.2, 1.2, twine);
      const straw = [0xa87745, 0xc79357, 0x8a5a2a, 0xb5854d];
      k.shape(Math.min(A[0], B[0]) - 8, 0, Math.min(A[2], B[2]) - 8, Math.max(A[0], B[0]) + 8, 40, Math.max(A[2], B[2]) + 8, (x, y, z) => {
        const p = sub([x, y, z], A), t = dot(p, dir) / L;
        if (t < 0.44 || t > 1) return false;
        const u = dot(p, across), w = dot(p, thin), f = (t - 0.44) / 0.56, r = 2.5 + 7 * f ** 1.1, a = Math.atan2(w / 0.5, u);
        return Math.hypot(u, w / 0.5) <= r && t <= 1 - 0.035 * hash(Math.floor(a * 9), 1, 2);
      }, (x, y, z) => { const p = sub([x, y, z], A), a = Math.atan2(dot(p, thin) / 0.5, dot(p, across)); return straw[Math.floor(hash(Math.floor(a * 9), 3, 4) * 4)]; });
    },
  },
  // Autumn flowers in a plum vase: the vase turned round with its gilt bands and
  // the gilt sprig on its front; above it a full round dome of cream carnations,
  // peach and orange blooms and a red lily, with wheat plumes, sprigs of eucalyptus
  // and berries reaching out of it and long leaves falling over the vase's shoulder.
  // The flowers at the back are those at the front turned round, so it is full from every side.
  d08: {
    depth: 46,
    build(k) {
      const cz = 23, vx = 29.5, R = profile([[0, 7.2], [1.6, 7.6], [2.2, 6.8], [3, 8.4], [6, 11], [12, 12.6], [17, 12], [20, 10.8], [22, 8.4], [23, 7.4], [24.2, 7.6], [25, 8.7], [26.2, 8.5]]);
      const r = (x, z) => Math.hypot(x - vx, z - cz), gold = k.vary(0xc89a4c, 0.06), plum = k.mottle(20, 6, 38, 16, { trim: 0.3, amount: 0.4 });
      // The vase: the front takes the art (the gilt sprig), the rest plain plum, with gilt bands at the foot and lip.
      k.shape(vx - 13, 0, cz - 13, vx + 13, 26.2, cz + 13, (x, y, z) => r(x, z) <= R(y) && (y < 22 || r(x, z) > R(y) - 1.5), (x, y, z) => ((y > 1.2 && y < 2.2) || (y > 24.2 && y < 25.2) ? gold(x, y, z) : z > cz + 4 && y > 3 && y < 23 ? "art" : plum(x, y, z)), { part: 1 });
      // Under the flowers, a full mound of dark leaves, so nothing shows through between them.
      k.shape(13, 24, cz - 12, 47, 52, cz + 12, (x, y, z) => ((x - 30) / 16) ** 2 + ((y - 37) / 13) ** 2 + ((z - cz) / 11) ** 2 < 0.8 + 0.3 * hash(x / 3, y / 3, z / 3),
        (x, y, z) => [0x3e2018, 0x4c2a1a, 0x3a3218][Math.floor(hash(x / 3, y / 3, z / 3 + 9) * 3)]);
      // Stems gathered in the neck.
      for (let i = 0; i < 7; i++) { const a = i * 0.9; k.cyl([vx + Math.sin(a) * 3, 23, cz + Math.cos(a) * 3], [vx + Math.sin(a) * 7, 31, cz + Math.cos(a) * 6], 0.7, 0x4a4418); }
      // The flower heads: [kind, x, y, z, size, colour from the art].
      const out = (x, y, z) => norm([x - 30, (y - 30) * 0.7 + 3, z - cz]);
      const heads = [
        ["puff", 34.5, 34.5, cz + 12, 5.6, k.avg(32, 32, 37, 37)], ["puff", 42, 37.5, cz + 9, 5.6, k.avg(40, 35, 45, 40)], ["puff", 40.5, 29.5, cz + 11, 4.6, k.avg(38, 27, 43, 32)],
        ["puff", 38.5, 52.5, cz + 1, 4.2, k.avg(36, 50, 41, 55)], ["five", 18.5, 34.5, cz + 10, 5.4, k.avg(16, 32, 21, 37)], ["five", 25.5, 34, cz + 13, 5.8, k.avg(23, 31, 28, 37)],
        ["five", 21.5, 44, cz + 8, 5.2, k.avg(19, 42, 24, 47)], ["lily", 30.5, 44.5, cz + 7, 7, k.avg(27, 41, 34, 48)], ["five", 19.5, 28, cz + 9, 4.2, k.avg(17, 26, 22, 31)],
        ["five", 30, 51, cz - 1, 4.5, k.avg(25, 49, 30, 54)],
      ];
      for (const back of [false, true]) for (const [kind, x0, y, z0, size, c] of heads) {
        // Round the back: mirrored across and turned to face away, a little lower and closer in.
        const x = back ? 60 - x0 : x0, z = back ? cz - (z0 - cz) * 0.85 : z0, yy = back ? y + 1.5 : y, f = out(x, yy, z), at = [x, yy, z];
        if (kind === "puff") puff(k, at, f, size, k.scale(c, 1.12));
        else bloom(k, at, f, size, kind === "lily" ? petals6 : petals5, k.scale(c, 1.3), kind === "lily" ? 0xe0b050 : 0x6a3010);
      }
      // Wheat plumes: grains along a curve, tapering to the tip.
      const wheat = (pts, n = 14) => {
        for (let i = 0; i <= n; i++) {
          const t = i / n, seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))), u = t * (pts.length - 1) - seg, [a, b] = [pts[seg], pts[seg + 1]];
          const p = a.map((v, j) => v + (b[j] - v) * u), w = 1.4 * (1 - t * 0.6);
          if (t > 0.25) k.ball(p[0], p[1], p[2], w, w, w, k.vary(i % 2 ? 0xc8964a : 0xa87838, 0.05));
          else k.cyl(a, b, 0.4, 0x8a6a30);
        }
      };
      wheat([[22, 42, cz + 4], [12, 46, cz + 7], [2, 47.5, cz + 6]]);
      wheat([[24, 46, cz + 2], [21, 54, cz + 4], [19, 62, cz + 2]]);
      wheat([[36, 46, cz - 4], [44, 53, cz - 8], [52, 58, cz - 6]]);
      // Sprigs: a stem, with round eucalyptus leaves or berries along it in pairs.
      const sprig = (pts, kind) => {
        path(k, pts.map((p) => [...p, 0.45]), 0x4a3a20);
        for (let i = 1; i < pts.length; i++) for (const s of [-1, 1]) {
          const [a, b] = [pts[i - 1], pts[i]], m = a.map((v, j) => (v + b[j]) / 2), d = norm(sub(b, a)), side = norm(cross(d, [0, 0, 1]));
          const p = [m[0] + side[0] * s * 1.8, m[1] + side[1] * s * 1.8, m[2] + s * 0.5];
          if (kind === "berries") k.ball(...p, 1, 1, 1, k.vary(0xa8502a, 0.1));
          else { const [ua, ub] = facing(norm([d[0] * 0.2, 0.5, 1])); leafy(k, p, ua, ub, 2.2, (q) => q < 1, (x, y, z) => (Math.hypot(...sub([x, y, z], p)) > 1.5 ? 0x46523e : 0x606e56), { cup: 0.05 }); }
        }
      };
      sprig([[19, 45, cz + 3], [15, 50, cz + 4], [12, 55, cz + 4], [9, 60, cz + 3]], "leaves");
      sprig([[44, 42, cz + 5], [49, 45, cz + 6], [54, 49, cz + 6], [57, 52, cz + 5]], "leaves");
      sprig([[45, 33, cz + 7], [50, 32, cz + 8], [55, 30.5, cz + 7], [59, 29, cz + 6]], "leaves");
      sprig([[14, 34, cz + 6], [9, 33, cz + 7], [4.5, 32.5, cz + 6], [1, 31.5, cz + 5]], "leaves");
      sprig([[38, 48, cz + 2], [41, 53, cz + 2], [43, 58, cz + 1], [45, 62, cz]], "berries");
      sprig([[44, 52, cz + 3], [48, 56, cz + 3], [52, 59, cz + 2]], "berries");
      sprig([[47, 40, cz + 6], [52, 41, cz + 6], [56, 42.5, cz + 5]], "berries");
      sprig([[16, 46, cz - 6], [10, 52, cz - 9], [7, 57, cz - 9]], "leaves");
      sprig([[42, 44, cz - 6], [48, 50, cz - 10], [52, 54, cz - 10]], "berries");
      // Long leaves falling over the vase's shoulder, and a few more round the back.
      for (const [x, y, z, dx, dy, len, w, c, droop] of [
        [42, 31, cz + 9, 0.35, -1, 16, 4.5, 0x9a8436, 1.5], [46, 30, cz + 6, 0.6, -1, 13, 4, 0x8a7430, 1], [50, 28, cz + 6, 0.5, -1, 9, 3.6, 0xb0602a, 0.5],
        [16, 30, cz + 7, -0.5, -1, 12, 3.6, 0x8a4a24, 1], [12, 31, cz + 5, -0.6, -1, 10, 3.2, 0x7a4220, 0.8], [22, 28, cz + 10, -0.2, -1, 8, 3, 0x9a5a28, 0.6],
        [18, 30, cz - 7, -0.5, -1, 12, 3.8, 0x9a8436, 1], [42, 30, cz - 8, 0.5, -1, 12, 3.6, 0x8a4a24, 1],
      ]) blade(k, [x, y, z], [dx, dy, (z - cz) * 0.04], len, w, norm([dx * 0.5, 0.3, z > cz ? 1 : -1]), k.vary(c, 0.06), droop);
    },
  },
  // A monstera in a terracotta pot: big split leaves hanging from tall stalks
  // that rise out of the soil, turned every way so the plant is full from all
  // round, and strings of pearls trailing over the rim and down the pot.
  d07: {
    depth: 46,
    build(k) {
      const cz = 23, px = 27.5, pot = profile([[0, 7.4], [2, 8.2], [18, 11.2], [18.6, 12.2], [22.6, 12.6]]), r = (x, z) => Math.hypot(x - px, z - cz);
      // The pot, its rim and the soil; the front takes the art, the back plain terracotta.
      const clay = k.mottle(24, 10, 34, 18, { trim: 0.3, amount: 0.5 });
      k.shape(px - 13, 0, cz - 13, px + 13, 22.6, cz + 13, (x, y, z) => r(x, z) <= pot(y) && (y < 20.4 || r(x, z) > 11), (x, y, z) => (z > cz - 4 ? "art" : clay(x, y, z)), { part: 1 });
      k.shape(px - 11.5, 19.6, cz - 11.5, px + 11.5, 20.6, cz + 11.5, (x, y, z) => r(x, z) < 11.5, (x, y, z) => (hash(x / 2, z / 2, 7) < 0.25 ? 0x3c4a18 : 0x2a1c10));
      // Leaves: [notch, tip, which way the face turns, width], the front ones first.
      const leaves = [
        [[26.8, 58.6, cz - 3], [24.6, 42.5, cz + 4], [0, 0.45, 1], 20],
        [[16.5, 55, cz - 1], [4, 38, cz + 3], [-0.45, 0.45, 0.8], 17],
        [[37.7, 50.5, cz], [51.5, 34, cz + 3], [0.5, 0.45, 0.75], 18],
        [[19.7, 40.5, cz + 7], [17, 23.5, cz + 13], [-0.15, 0.5, 0.9], 19],
        [[10, 30.5, cz + 4], [3.5, 16, cz + 8], [-0.65, 0.45, 0.6], 14],
        [[42, 31, cz + 4], [51.5, 16, cz + 8], [0.65, 0.45, 0.6], 15],
        [[31, 44, cz - 7], [42, 30, cz - 3], [0.3, 0.45, 0.85], 15],
        [[19, 50, cz - 10], [11, 36, cz - 16], [-0.4, 0.45, -0.8], 15],
        [[36, 47, cz - 9], [44, 34, cz - 15], [0.4, 0.45, -0.8], 14],
      ];
      // Stalks out of the soil to just behind each notch, arching a little.
      leaves.forEach(([n], i) => {
        const s = [px + ((i % 3) - 1) * 2.4, 20.5, cz + ((i % 2) * 2 - 1) * 2], top = [n[0], n[1] + 0.8, n[2] - 1], mid = [s[0] + (top[0] - s[0]) * 0.45, s[1] + (top[1] - s[1]) * 0.75, s[2] + (top[2] - s[2]) * 0.5];
        path(k, [[...s, 0.85], [...mid, 0.75], [...top, 0.6]], k.vary(0x3a4c18, 0.08));
      });
      for (const [n, t, f, w] of leaves) monstera(k, n, t, norm(f), w);
      // Strings of pearls trailing over the rim and down the side of the pot.
      for (const [a, end] of [[-1.62, 4], [-0.62, 9], [1.05, 3], [1.45, 6.5], [-1.2, 12]]) {
        for (let y = 22.6, i = 0; y > end; y -= 1.5, i++) {
          const rr = (y > 21 ? 13 : pot(y) + 0.8) + 0.3 * Math.sin(i * 1.7), aa = a + 0.04 * Math.sin(i * 0.9);
          k.ball(px + Math.sin(aa) * rr, y, cz + Math.cos(aa) * rr, 0.85, 0.85, 0.85, i % 2 ? 0x7e9a34 : 0x5e7a26);
        }
      }
    },
  },
  // A plush ghost sat on the floor: a soft round body, its head tilted, flaring
  // to a hem of six round lobes; stubby arms, one waving. Button eyes stand
  // proud of the face, the smile and cheeks are stitched on, and a felt heart
  // is sewn over a seam that runs right round it, as a plush's would.
  d12: {
    depth: 44,
    build(k) {
      const cz = 22, smooth = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
      const skirt = profile([[0, 21], [3, 24.5], [8, 25], [14, 23.5], [22, 20.5], [32, 18.4], [40, 17.2], [46, 16.8]]), R = (y) => (y < 46 ? skirt(y) : Math.sqrt(Math.max(0, 16.8 ** 2 - (y - 46) ** 2)));   // a round head over a flared skirt
      const cx = (y) => 29.5 - 3 * smooth(34, 61, y), deep = 0.8, ang = (x, z, y) => Math.atan2(x - cx(y), (z - cz) / deep);
      // The hem: lobes all round, touching the floor and bulging out, lifted between.
      const lobe = (x, y, z) => Math.abs(Math.sin(ang(x, z, y) * 3));
      const inside = (x, y, z) => {
        const l = lobe(x, y, z), r = R(y) * (y < 12 ? 1 + 0.08 * l * (1 - y / 12) : 1);
        return Math.hypot(x - cx(y), (z - cz) / deep) <= r && y >= 4.5 * (1 - l) ** 1.5;
      };
      // Where the front of the body is at (x, y), for sewing things on.
      const front = (x, y) => cz + deep * Math.sqrt(Math.max(0, R(y) ** 2 - (x - cx(y)) ** 2));
      const felt = k.vary(0xe2c29e, 0.03, 4), seam = 0x7a5032, thread = 0x5a3820, pink = 0xe0a088;
      const smile = (x, y) => Math.abs(Math.hypot(x - 32.4, y - 39.4) - 2.6) < 0.55 && y < 38.6;
      const stitch = (x, y, [ax, ay], [bx, by]) => { const dx = bx - ax, dy = by - ay, t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), d = Math.abs((x - ax) * dy - (y - ay) * dx) / Math.hypot(dx, dy); return t > 0 && t < 1 && (d < 0.45 || (d < 1.5 && (t * Math.hypot(dx, dy)) % 2.2 < 0.6)); };
      k.shape(0, 0, 0, 60, 62, 44, inside, (x, y, z) => {
        if (Math.abs(z - cz) < 0.7 && Math.floor(y / 1.5) % 2 === 0) return seam;
        if (z > cz + 4) {
          if (smile(x, y)) return thread;
          if (Math.hypot(x - 19.6, y - 35.4) < 2.3 || Math.hypot(x - 44, y - 40.6) < 2.1) return pink;
          if (stitch(x, y, [13, 11], [20.5, 19.5]) || stitch(x, y, [41, 3.5], [41.6, 8.5])) return thread;
        }
        return felt(x, y, z);
      });
      // Stubby arms: one out to the side, the other waving.
      path(k, [[17, 28, cz + 2, 5.2], [8, 29, cz + 2.5, 4.6], [3, 30, cz + 2.5, 3.6]], k.layers({ other: felt, back: felt, depth: 1 }));
      path(k, [[43, 35, cz + 1.5, 5], [51, 37.5, cz + 2, 4.6], [56, 39.5, cz + 2, 3.8]], felt);
      k.sym((X) => k.shape(0, 20, cz - 0.7, 60, 46, cz + 0.7, (x, y) => (X(1) > 1 ? Math.hypot(x - 8, y - 29) < 5 && x < 12 : Math.hypot(x - 52, y - 37.6) < 5 && x > 48) && Math.floor(y / 1.5) % 2 === 0, seam));
      // Button eyes, each with a glint.
      for (const [x, y, r] of [[22.6, 40.4, 3], [39.6, 44.6, 2.7]]) {
        const z = front(x, y);
        k.ball(x, y, z - 0.4, r, r, 1.6, 0x1e120e);
        k.ball(x - r * 0.35, y + r * 0.35, z + 0.9, 0.55, 0.55, 0.4, 0xf0e0c8);
      }
      // The felt heart, sewn on with pale thread.
      const heart = (x, y) => { const u = (x - 42.2) / 4.6, v = (y - 21) / 4.6; return (u * u + v * v - 1) ** 3 - u * u * v * v * v <= 0; };
      const rim = (x, y) => heart(x, y) && !heart(x + 0.9, y) + !heart(x - 0.9, y) + !heart(x, y + 0.9) + !heart(x, y - 0.9) > 0;
      k.shape(34, 13, 30, 50, 28, 44, (x, y, z) => heart(x, y) && z <= front(x, y) + 0.8, (x, y) => (rim(x, y) && Math.floor((x + y) * 0.9) % 2 ? 0xd8b48c : k.mix(0x6e4446, 0x8a5856, hash(x / 2, y / 2, 3) * 0.5)));
    },
  },
  // Three pumpkins stacked: a wide orange one on the floor, a cream one sat in
  // its crown and a little green one on top with a curling stalk. A vine winds
  // down over them, with autumn maple leaves and the pumpkins' own leaves lying
  // on their skins and tendrils curling off it.
  d15: {
    depth: 54,
    build(k) {
      const cz = 27, P = [
        { c: [27, 12, cz], r: [26, 12, 23.5], ribs: 12, groove: 0.1, deep: 0x5e1b07, mid: 0xaa4412, light: 0xdc7a34 },
        { c: [29, 30.6, cz], r: [19, 9.6, 17], ribs: 12, groove: 0.09, deep: 0x9a6a38, mid: 0xd4a46c, light: 0xf0cf94, speck: 0xa87745 },
        { c: [26.6, 46.6, cz], r: [13.6, 9, 12.4], ribs: 12, groove: 0.1, deep: 0x3a3412, mid: 0x5f5a24, light: 0x8c8a4c, speck: 0xb08a3c },
      ];
      P.forEach((p) => pumpkin(k, p.c, p.r, p));
      // A point on the front of the pumpkin under art (x, y), `off` px out from its skin.
      const on = (x, y, off = 0.4) => {
        let best = null;
        for (const { c: [px, py, pz], r: [rx, ry, rz] } of P) { const q = 1 - ((x - px) / rx) ** 2 - ((y - py) / ry) ** 2; if (q > 0) { const z = pz + rz * Math.sqrt(q); if (!best || z > best[2]) best = [x, y, z]; } }
        return best ? [best[0], best[1], best[2] + off] : [x, y, cz];
      };
      const outward = (x, y) => { const p = on(x, y, 0), q = on(x + 1, y, 0), r = on(x, y + 1, 0); return norm(cross(sub(q, p), sub(r, p))); };
      // The stalk, curling over to the right.
      path(k, [[26.8, 53, cz, 1.7], [27, 57, cz, 1.4], [28, 60.5, cz, 1.2], [30.5, 62.2, cz, 1], [32.8, 61.4, cz, 0.9], [33.4, 59.6, cz, 0.8], [32.4, 58.6, cz, 0.7]], (x, y) => k.mix(0x5a3414, 0x8a5a2a, Math.max(0, y - 53) / 9));
      // The vine: along the green one's foot, down across the cream one, round its
      // foot and down the orange one's front to the floor.
      const vine = [[10.5, 41.5], [14, 39.4], [19, 38.4], [24, 38.6], [25, 35], [23.6, 31], [25.6, 27], [30, 24.6], [35, 24.4], [39.5, 22], [41.5, 17], [41, 12], [44, 7.5], [48, 4.5], [51, 3.2]];
      path(k, vine.map(([x, y]) => [...on(x, y, 0.5), 0.75]), k.vary(0x5a4a1e, 0.08));
      path(k, [[30, 38.8], [36, 38.2], [41, 38.8], [45, 40.5]].map(([x, y]) => [...on(x, y, 0.5), 0.6]), k.vary(0x5a4a1e, 0.08));
      // Tendrils curling off it.
      for (const [x, y, s] of [[9, 41, 2.4], [45.5, 41.5, 1.8], [39.6, 12.5, 1.6], [37, 24.5, 1.3], [12, 26, 1.5]]) {
        const c = on(x, y, 1), pts = [];
        for (let t = 0; t <= 1.001; t += 0.05) { const a = t * 4 * Math.PI, rr = s * (1 - t * 0.7); pts.push([c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a), c[2] + t * 0.8, 0.5]); }
        path(k, pts, 0x6a5a26);
      }
      // Leaves: maples in autumn colours and the pumpkin's own, lying on the skins.
      const autumn = (base) => (x, y, z) => k.scale(k.mix(base, 0x8a2c08, hash(x / 2, y / 2, z / 2) * 0.4), 1);
      for (const [x, y, s, t, base] of [[14.5, 33, 5.6, 0.5, 0xc8662a], [18.5, 22.5, 5, -0.3, 0xb4501c], [47.5, 38.5, 5, -0.6, 0xc8702c], [26.5, 32, 3, 0.2, 0xd2803a], [51, 15.5, 4, -0.9, 0xb85a22], [23, 54.6, 3.6, 0.9, 0xc0602a], [12, 41, 3.4, 1.2, 0xb85a22]]) {
        const n = outward(x, y), up = norm(sub([Math.sin(t), Math.cos(t), 0], n.map((v) => v * dot([Math.sin(t), Math.cos(t), 0], n))));
        leafy(k, on(x, y, 0.9), cross(up, n), up, s, maple, autumn(base), { cup: -0.12 });
      }
      for (const [x, y, s, t] of [[7, 26, 6.4, 0.9], [13, 19, 4.4, 0.4], [31.5, 21.5, 4.6, -0.2], [42.5, 10.5, 4.4, -0.5], [48.5, 5, 4.6, -1.2]]) {
        const n = outward(x, y), up = norm(sub([Math.sin(t), Math.cos(t), 0], n.map((v) => v * dot([Math.sin(t), Math.cos(t), 0], n))));
        leafy(k, on(x, y, 0.9), cross(up, n), up, s, lobed, (x_, y_, z_) => k.mix(0x4a4a1a, 0x6e7030, hash(x_ / 2, y_ / 2, z_ / 2)), { cup: -0.12 });
      }
    },
  },
  // A longcase clock, front-on in the art: bracket feet under a plinth, a base
  // with a carved panel, a trunk between half-round columns with the pendulum
  // swinging in a deep arched window, a hood with the dial and its own corner
  // columns, a cornice and a swan-neck bonnet with urn finials and the moon.
  // Ivy climbs the right side. Built at three voxels to two pixels.
  d14: {
    depth: 16, res: 1.5,
    build(k) {
      const cx = 12.5, D = 16, wood = grain(k, k.avg(4, 4, 21, 10)), dark = k.shade(wood, 0.7), case_ = (o = wood) => k.layers({ front: "art", other: o, depth: 0.7 });
      const brass = k.vary(0xc08a48, 0.08), cream = k.vary(0xe2c69c, 0.04), ink = 0x2a1a10, leaf = (x, y, z) => k.scale(k.mix(0x4a5a1c, 0x6a7a2a, hash(x, y, z)), 1);
      // The plinth on four bracket feet, the base and its moulded cap.
      k.box(0.5, 0, 0.5, 24.5, 3.5, D, case_(dark));
      k.carve(5.5, 0, 3, 19.5, 1.6, D + 1); k.carve(0, 0, 4, 25, 1.6, D - 4);
      k.box(1.5, 3.5, 1, 23.5, 11, 15, case_());
      k.box(4.5, 5, 14.5, 20.5, 10, 15.6, case_());
      k.box(1, 11, 0.5, 24, 12.5, 15.6, case_(dark));
      k.box(2, 12.5, 1, 23, 14, 15, case_());
      // The trunk, a column standing proud at each front corner.
      k.box(3.5, 14, 1.5, 21.5, 39, 13.5, case_());
      k.sym((X) => {
        k.lathe(X(5.4), 13.4, 14.5, 38.5, [[0, 2.1], [0.05, 1.6], [0.9, 1.4], [0.95, 2.1], [1, 2.1]], case_());
        k.lathe(X(4.6), 14.4, 41, 53, [[0, 1.7], [0.08, 1.3], [0.9, 1.2], [0.95, 1.8], [1, 1.8]], case_());
      });
      // The pendulum window: an arched opening into the case, the rod and bob
      // hanging in it, and the two weights on their chains behind.
      const arch = (x, y) => y < 35.5 || Math.hypot(x - cx, (y - 35.5) * 1.3) < 4.2;
      k.carve(8.3, 16.5, 4, 16.7, 39.5, D, (x, y) => arch(x, y));
      k.shape(7.2, 15.5, 13, 17.8, 41, 14.2, (x, y) => !arch(x, y) && (x < 8.3 || x > 16.7 || y < 16.5 || Math.hypot(x - cx, (y - 35.5) * 1.3) < 5.6), k.layers({ front: k.shade(wood, 1.15), other: dark, depth: 0.7 }));
      k.box(8.3, 16.5, 4, 16.7, 17.2, 13, dark);
      k.cyl([cx, 38.5, 7.5], [cx, 21, 7.5], 0.35, brass);
      k.cyl([cx, 19.6, 6.9], [cx, 19.6, 8.1], 2.9, (x, y) => k.mix(0xd8a458, 0x8a5a2a, Math.max(0, Math.min(1, (cx - x + y - 19.6) / 5 + 0.5))));
      for (const x of [9.6, 15.4]) { k.cyl([x, 38.5, 5.4], [x, 32, 5.4], 0.25, brass); k.cyl([x, 32, 5.4], [x, 26, 5.4], 1, k.shade(brass, 0.85), { caps: true }); }
      // The hood: its waist moulding, the box, the dial in a brass bezel with
      // its hours and hands, the cornice over it.
      k.box(2, 39, 0.5, 23, 41, 15.2, case_(dark));
      k.box(3, 41, 1, 22, 53, 14.4, case_());
      const dial = (x, y) => Math.hypot(x - cx, y - 46.6);
      k.shape(6, 40.6, 14, 19, 52.6, 15.2, (x, y) => dial(x, y) <= 5.8, (x, y) => {
        const d = dial(x, y), a = Math.atan2(x - cx, y - 46.6), hour = Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) > 0.36;
        return d > 5 ? brass(x, y, 0) : d > 3.6 && d < 4.6 && hour ? ink : cream(x, y, 0);
      });
      const hand = (a, len, w) => k.shape(6, 40.6, 15.1, 19, 52.6, 15.8, (x, y) => { const u = (x - cx) * Math.sin(a) + (y - 46.6) * Math.cos(a), v = (x - cx) * Math.cos(a) - (y - 46.6) * Math.sin(a); return u > -0.6 && u < len && Math.abs(v) < w; }, ink);
      hand(0.5, 3.9, 0.4); hand(-2.2, 2.7, 0.55);
      k.ball(cx, 46.6, 15.6, 0.7, 0.7, 0.4, brass);
      k.box(0.5, 53, 0, 24.5, 55, D, case_(dark));
      k.box(1.5, 52.4, 0.5, 23.5, 53, 15.4, case_());
      // The bonnet: a swan-neck pediment arching up to a plinth and finial, urns at the
      // corners, and the gilt moon in its tympanum.
      const neck = (x) => 57.2 + 3.4 * Math.cos(Math.min(1, Math.abs(x - cx) / 9.5) * Math.PI / 2) ** 0.7;
      k.box(2, 55, 1.5, 23, 56.4, 14.6, case_(dark));
      k.shape(3, 55, 10.8, 22, 62, 13.4, (x, y) => y <= neck(x) && !(Math.abs(x - cx) < 2.4 && y > 58.4), case_());
      k.sym((X) => k.ball(X(10.4), 59.2, 13.4, 1, 1, 0.6, brass));
      k.box(11, 58.4, 9.5, 14, 61, 13, case_(dark));
      k.lathe(cx, 11.2, 61, 63, [[0, 1.1], [0.4, 1.3], [1, 0.3]], brass);
      k.sym((X) => { k.lathe(X(4), 12, 55, 59, [[0, 1.2], [0.2, 0.9], [0.5, 1.5], [0.8, 0.8], [1, 0.8]], case_()); k.ball(X(4), 59.4, 12, 0.6, 0.6, 0.6, brass); });
      k.shape(9.5, 54.5, 13, 15.5, 59.5, 14, (x, y) => Math.hypot(x - cx, y - 57) <= 2.3 && Math.hypot(x - cx - 1, y - 57.6) > 1.8, brass);
      // Ivy climbing the right side from the floor, round the front corner and up to the hood.
      const vine = [[23.6, 0.5, 11], [24, 6, 12.5], [23.4, 12, 14.5], [22.8, 18, 15], [23.6, 24, 13.4], [23.2, 30, 14.5], [22.2, 36, 14.6], [22.4, 41, 13.8]];
      path(k, vine.map(([x, y, z]) => [x, y, z, 0.45]), 0x3a3014);
      for (const [x, y, z, t] of [[24.8, 3, 12, 0.6], [26, 8.5, 11, 1.2], [25.2, 13, 14, 0.4], [23.6, 16, 15.6, -0.3], [25.6, 20, 13, 0.9], [24, 26.5, 14.6, 0.2], [25.4, 31, 13.6, 0.8], [22.6, 34.5, 15.6, -0.4], [24.2, 38.5, 14.4, 0.5], [21.8, 42.5, 14.6, -0.2]])
        ivy(k, [x, y, z], norm([Math.cos(t), 0, -Math.sin(t)]), [0, 1, 0], 1.9, leaf);
    },
  },
  // An iron cauldron, turned round: a squat round belly on three scrolled legs,
  // a rolled lip, ring handles hanging from lugs, and the gilt vine and moon
  // cast standing proud on its front. It brims with a glowing green brew, built
  // on its own (brew below) so decor.js can swirl it, break bubbles on it and
  // send steam off it. The art looks down a little, so it is projected at 16°
  // from the pot's middle.
  d13: {
    depth: 56, view: 16, front: 28,
    // The brew's surface: its centre, radius and top in art pixels, for the motion.
    brew: {
      centre: [30, 28], radius: 21.5, top: 40,
      // A little below the lip: lit lime where it heaves, darker in the lip's
      // shadow, a few pale flecks of foam.
      build(k) {
        const cx = 30, cz = 28, R = profile([[31, 25.8], [37, 24.4], [41, 22.6]]), r = (x, z) => Math.hypot(x - cx, z - cz);
        const lime = 0x6a9c2a, light = 0x94cc44, pale = 0xe4ec80, deep = 0x3e5a1a;
        k.shape(cx - 22, 35, cz - 22, cx + 22, 39.6, cz + 22, (x, y, z) => r(x, z) < R(y) - 1.6, (x, y, z) => {
          const e = r(x, z) / 21, h = hash(x / 2, z / 2, 2);
          return e > 0.86 ? k.mix(lime, deep, (e - 0.86) * 6) : h < 0.035 ? pale : k.mix(lime, light, hash(x / 3, z / 3, 5));
        }, { glow: true });
      },
    },
    build(k) {
      const cx = 30, cz = 28, R = profile([[8, 11], [10, 16], [13, 20.5], [18, 24], [24, 25.8], [31, 25.8], [37, 24.4], [41, 22.6]]);
      const r = (x, z) => Math.hypot(x - cx, z - cz), iron = k.mottle(6, 12, 20, 26, { trim: 0.3, amount: 0.3, grain: 3 }), dark = k.shade(iron, 0.75), copper = k.vary(k.avg(0, 27, 4, 38), 0.1);
      const gold = (c) => lum(c) > 85 && (c >> 16) > (c & 255) * 1.8;
      // The belly, hollow above the brew; the gilt cast on its front a little proud of
      // the iron. The front takes the art; the back and the inside, which the art
      // never shows, are plain iron (else they'd take the brew's green).
      const belly = (x, y, z) => (z > cz - 6 && r(x, z) > R(y) - 1 ? "art" : y > 33 && r(x, z) < R(y) - 1 ? k.shade(iron, 0.6)(x, y, z) : iron(x, y, z));
      k.shape(cx - 27, 8, cz - 27, cx + 27, 42, cz + 27, (x, y, z) => r(x, z) <= R(y) && (y < 33 || r(x, z) > R(y) - 2.2), belly, { part: 1 });
      const art = (x, y, z) => k.at(x, y * Math.cos(0.279) + (cz - z) * Math.sin(0.279));
      k.shape(cx - 27, 10, cz, cx + 27, 40, cz + 27, (x, y, z) => { const d = r(x, z) - R(y); return d > 0 && d < 0.9 && z > cz + 8 && gold(art(x, y, z)); }, "art", { part: 1 });
      // The rolled lip.
      ring(k, [cx, 42.6, cz], [1, 0, 0], [0, 0, 1], 22.4, 1.9, (x, y, z) => (z > cz - 6 ? "art" : iron(x, y, z)), { part: 2 });
      // Three scrolled legs, one at the back, curling out to a round toe.
      for (const a of [-1.05, 1.05, Math.PI]) {
        const at = (d, y, rr) => [cx + Math.sin(a) * d, y, cz + Math.cos(a) * d, rr];
        path(k, [at(17, 13, 2.8), at(21, 8.5, 2.4), at(22, 4.5, 1.9), at(23.8, 2, 1.8), at(26, 1.6, 1.7)], dark, { part: 3 });
        path(k, [at(26, 1.6, 1.7), at(27.4, 3.2, 1.2), at(26.4, 4.2, 0.9)], dark, { part: 3 });
      }
      // Lugs at the shoulders, a ring hanging from each.
      k.sym((X) => {
        const s = X(1) > 1 ? -1 : 1;
        k.box(X(2.6), 34, cz - 1.6, X(5.4), 38.5, cz + 1.6, dark);
        ring(k, [X(2.4), 31.2, cz + 0.8], [0, 1, 0], norm([s * 0.5, 0, 0.87]), 4.6, 1.15, copper);
      });
    },
  },
};
