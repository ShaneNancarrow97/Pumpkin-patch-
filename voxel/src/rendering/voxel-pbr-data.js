// Original, deterministic micro-surfaces. No browser, Three or model state is
// involved: the same height field produces albedo, tangent normals and ORM.
export const VOXEL_PBR = Object.freeze({
  size: 256, grid: 2, tileSize: 128, body: 112, gutter: 8,
  repeat: 1.2, strength: .32, normalStrength: .28,
  surfaces: Object.freeze(["stone", "wood", "slate", "metal"]),
  channels: Object.freeze({ orm: "R: occlusion, G: roughness, B: metalness", albedo: "sRGB", normal: "linear tangent-space +Y", ormSpace: "linear" }),
});

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const fract = v => v - Math.floor(v);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const mod = (x, n) => ((x % n) + n) % n;
const byte = v => Math.round(clamp(v) * 255);
const srgb = v => v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055;

function hash(x, y, seed) {
  let h = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967295;
}

function noise(u, v, frequency, seed) {
  const x = u * frequency, y = v * frequency, ix = Math.floor(x), iy = Math.floor(y), fx = smooth(fract(x)), fy = smooth(fract(y));
  const at = (a, b) => hash(mod(a, frequency), mod(b, frequency), seed);
  return mix(mix(at(ix, iy), at(ix + 1, iy), fx), mix(at(ix, iy + 1), at(ix + 1, iy + 1), fx), fy);
}

// All terms are periodic over a tile, including the grooves. Wrapped gutters
// therefore meet exactly and finite differences never invent a border ridge.
export function voxelSurfaceHeight(tile, u, v) {
  u = fract(u); v = fract(v);
  const broad = noise(u, v, 8, 417 + tile * 31), fine = noise(u, v, 32, 991 + tile * 23);
  if (tile === 1) {
    const grain = Math.sin((u * 25 + Math.sin(v * Math.PI * 4) * .23 + broad * .22) * Math.PI * 2);
    const edge = Math.min(fract(u * 4), 1 - fract(u * 4));
    return .003 * grain + .004 * broad + .0012 * fine - .006 * (1 - clamp(edge / .055));
  }
  if (tile === 2) {
    const row = Math.floor(v * 4), x = fract(u * 4 + mod(row, 2) * .5), y = fract(v * 4);
    const seam = Math.min(x, 1 - x, y, 1 - y);
    return .004 * broad + .0015 * fine - .008 * (1 - clamp(seam / .065));
  }
  if (tile === 3) return .0018 * broad + .0007 * fine;
  return .005 * broad + .0018 * fine + .0005 * noise(u, v, 64, 713);
}

// Conservative authored-colour classification, used only on finished solid
// voxel batches. Greens and bright saturated props retain their painted finish.
// Explicit material.surface overrides can choose one of the four tiles.
export function classifyVoxelSurface(r, g, b) {
  const hi = Math.max(r, g, b), lo = Math.min(r, g, b), sat = (hi - lo) / Math.max(.0001, hi);
  if (g > r * 1.08 && g > b * .95 || hi < .006) return { tile: 0, weight: 0 };
  if (sat < .23) return { tile: 0, weight: 1 };
  if (hi > .3 && g / Math.max(r, .0001) > .65 && g / Math.max(r, .0001) < .94 && b / Math.max(r, .0001) > .1 && b / Math.max(r, .0001) < .55) return { tile: 3, weight: .8 };
  if (b > r * .8 && b > g * 1.15 && r > g * 1.04) return { tile: 2, weight: .8 };
  if (r > g * 1.16 && g > b * 1.25 && hi < .46) return { tile: 1, weight: .7 };
  return { tile: 0, weight: 0 };
}

// Deliberately exported as a shared port contract, not a guessed reimplementation.
export const VOXEL_PBR_CLASSIFY_GLSL = `
vec2 pbrClassify(vec3 c) {
  float hi = max(c.r, max(c.g, c.b)), lo = min(c.r, min(c.g, c.b));
  float sat = (hi - lo) / max(.0001, hi);
  if ((c.g > c.r * 1.08 && c.g > c.b * .95) || hi < .006) return vec2(0., 0.);
  if (sat < .23) return vec2(0., 1.);
  float gr = c.g / max(c.r, .0001), br = c.b / max(c.r, .0001);
  if (hi > .3 && gr > .65 && gr < .94 && br > .1 && br < .55) return vec2(3., .8);
  if (c.b > c.r * .8 && c.b > c.g * 1.15 && c.r > c.g * 1.04) return vec2(2., .8);
  if (c.r > c.g * 1.16 && c.g > c.b * 1.25 && hi < .46) return vec2(1., .7);
  return vec2(0., 0.);
}`;

// Same dominant-face layout as the finish. Tangent orientation comes from the
// derivatives of this *unwrapped* coordinate, so negative faces are correct.
export function voxelPbrFace(position, normal) {
  const [x, y, z] = position, [nx, ny] = normal.map(Math.abs);
  return ny > .5 ? [x, z] : nx > .5 ? [z, y] : [x, y];
}

export function voxelPbrUv(face, tile) {
  const { body, gutter, tileSize, size, repeat } = VOXEL_PBR;
  return [(mod(tile, 2) * tileSize + gutter + fract(face[0] * repeat) * body) / size,
    (Math.floor(tile / 2) * tileSize + gutter + fract(face[1] * repeat) * body) / size];
}

function sample(tile, u, v, resolution = VOXEL_PBR.body) {
  const h = voxelSurfaceHeight(tile, u, v), delta = 1 / resolution;
  const du = (voxelSurfaceHeight(tile, u + delta, v) - voxelSurfaceHeight(tile, u - delta, v)) / (2 * delta);
  const dv = (voxelSurfaceHeight(tile, u, v + delta) - voxelSurfaceHeight(tile, u, v - delta)) / (2 * delta);
  // One texture period is 1/repeat metres. The finite differences are genuine
  // height derivatives in that plane, not random blue-purple colour noise.
  const normal = [-du * VOXEL_PBR.repeat, -dv * VOXEL_PBR.repeat, 1], length = Math.hypot(...normal);
  const relief = noise(u, v, 8, 417 + tile * 31), fine = noise(u, v, 32, 991 + tile * 23);
  const baseRoughness = [.86, .77, .8, .36][tile];
  const albedo = clamp(.96 + (relief - .5) * .06 + (fine - .5) * .018, .9, 1);
  const cavity = clamp(1 + Math.min(0, h) * 14, .82, 1);
  return {
    albedo: [byte(srgb(albedo)), byte(srgb(albedo)), byte(srgb(albedo)), 255],
    normal: [byte(normal[0] / length * .5 + .5), byte(normal[1] / length * .5 + .5), byte(normal[2] / length * .5 + .5), 255],
    orm: [byte(cavity), byte(clamp(baseRoughness + (fine - .5) * .07, .28, .92)), tile === 3 ? byte(.72) : 0, 255],
  };
}

// Mips are generated within each tile, then its own wrapped border is filled.
// Driver-generated atlas mips would blend slate/metal and stone/wood at seams.
export function buildVoxelPbrAtlasData({ mipmaps = true } = {}) {
  const maps = { albedo: [], normal: [], orm: [] };
  const size = VOXEL_PBR.size, { tileSize, body, gutter } = VOXEL_PBR;
  const buffers = Object.fromEntries(Object.keys(maps).map(k => [k, new Uint8Array(size * size * 4)]));
  for (let tile = 0; tile < 4; tile++) for (let y = 0; y < tileSize; y++) for (let x = 0; x < tileSize; x++) {
      const u = fract((x + .5 - gutter) / body), v = fract((y + .5 - gutter) / body);
      const values = sample(tile, u, v, Math.max(1, body));
      const at = (((tile >> 1) * tileSize + y) * size + (tile % 2) * tileSize + x) * 4;
      for (const key of Object.keys(maps)) buffers[key].set(values[key], at);
  }
  for (const key of Object.keys(maps)) maps[key].push({ data: buffers[key], width: size, height: size });
  if (!mipmaps) return maps;
  // Power-of-two tile boundaries remain aligned at every level down to 2px.
  // Each 2×2 footprint therefore belongs to exactly one surface, never its
  // neighbour. Renormalise averaged normals; average sRGB albedo in linear light.
  const linear = v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  for (let nextSize = size / 2; nextSize >= 2; nextSize /= 2) for (const key of Object.keys(maps)) {
    const prior = maps[key].at(-1), out = new Uint8Array(nextSize * nextSize * 4);
    for (let y = 0; y < nextSize; y++) for (let x = 0; x < nextSize; x++) {
      const sums = [0, 0, 0];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const at = ((y * 2 + dy) * prior.width + x * 2 + dx) * 4;
        for (let c = 0; c < 3; c++) sums[c] += key === "albedo" ? linear(prior.data[at + c] / 255) : prior.data[at + c] / 255;
      }
      const at = (y * nextSize + x) * 4;
      if (key === "normal") {
        const n = sums.map(v => v / 2 - 1), length = Math.hypot(...n);
        for (let c = 0; c < 3; c++) out[at + c] = byte(n[c] / length * .5 + .5);
      } else for (let c = 0; c < 3; c++) out[at + c] = byte(key === "albedo" ? srgb(sums[c] / 4) : sums[c] / 4);
      out[at + 3] = 255;
    }
    maps[key].push({ data: out, width: nextSize, height: nextSize });
  }
  // At 1px no tile separation can exist. All effects fade before this level;
  // use neutral albedo/normal, conservative nonmetal ORM rather than tile bleed.
  maps.albedo.push({ data: Uint8Array.of(255, 255, 255, 255), width: 1, height: 1 });
  maps.normal.push({ data: Uint8Array.of(128, 128, 255, 255), width: 1, height: 1 });
  maps.orm.push({ data: Uint8Array.of(255, 224, 0, 255), width: 1, height: 1 });
  return maps;
}

export function voxelPbrAtlasBytes() {
  let pixels = 0; for (let size = VOXEL_PBR.size; size >= 1; size /= 2) pixels += size * size;
  return pixels * 4 * 3;
}
