// Build-time contact AO for arbitrary-sized, axis-aligned voxel boxes.
// No Three/browser dependency. Boxes use Voxels' [cx,cy,cz,w,h,d,...] convention.
// A multiresolution spatial hash inserts each box in at most eight cells;
// sampling visits only occupied scales, never every box in the world.
export const VOXEL_AO = Object.freeze({ attribute: "voxelAO", strength: .24, radius: .18, bytesPerInstance: 8, corners: 24 });

// +X,-X,+Y,-Y,+Z,-Z; each face is (-u,-v),(+u,-v),(-u,+v),(+u,+v).
export const VOXEL_AO_FACES = Object.freeze([
  [0, 1, 2, 1], [0, -1, 2, 1], [1, 1, 0, 2],
  [1, -1, 0, 2], [2, 1, 0, 1], [2, -1, 0, 1],
].map(Object.freeze));
const now = () => globalThis.performance?.now?.() ?? Date.now();
const key = (x, y, z) => Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791);

export function createVoxelAOIndex(boxes, { minCell = .125 } = {}) {
  if (!(minCell > 0) || !Number.isFinite(minCell)) throw new RangeError("AO minCell must be finite and positive");
  const started = now(), bounds = new Float64Array(boxes.length * 6), levels = new Map(), ids = new WeakMap();
  const stats = { boxes: boxes.length, levels: 0, buckets: 0, entries: 0, samples: 0, candidateTests: 0, boundsBytes: bounds.byteLength, buildMs: 0 };
  boxes.forEach((box, id) => {
    const [x, y, z, w, h, d] = box;
    if (![x, y, z, w, h, d].every(Number.isFinite) || !(w > 0 && h > 0 && d > 0)) throw new RangeError("AO boxes need finite centres and positive dimensions");
    ids.set(box, id);
    const p = id * 6;
    bounds[p] = x - w / 2; bounds[p + 1] = y - h / 2; bounds[p + 2] = z - d / 2;
    bounds[p + 3] = x + w / 2; bounds[p + 4] = y + h / 2; bounds[p + 5] = z + d / 2;
    const size = Math.max(minCell, 2 ** Math.ceil(Math.log2(Math.max(w, h, d)))), inverse = 1 / size;
    let level = levels.get(size);
    if (!level) levels.set(size, level = { inverse, cells: new Map() });
    // The upper bound is exclusive. A box ending exactly on a cell boundary
    // cannot occupy the next cell (and neighbour faces do not self-occlude).
    const lo = [bounds[p], bounds[p + 1], bounds[p + 2]].map(v => Math.floor(v * inverse));
    const hi = [bounds[p + 3], bounds[p + 4], bounds[p + 5]].map(v => Math.ceil(v * inverse) - 1);
    for (let ix = lo[0]; ix <= hi[0]; ix++) for (let iy = lo[1]; iy <= hi[1]; iy++) for (let iz = lo[2]; iz <= hi[2]; iz++) {
      const k = key(ix, iy, iz); let cell = level.cells.get(k);
      if (!cell) { level.cells.set(k, cell = []); stats.buckets++; }
      cell.push(id); stats.entries++;
    }
  });
  // Small contacts usually answer in the first scale. Numeric hash collisions
  // are harmless: every candidate still passes its exact six-bound test.
  const scales = [...levels].sort(([a], [b]) => a - b).map(([, level]) => level);
  stats.levels = scales.length; stats.buildMs = now() - started;
  const occupied = (x, y, z, ignore = -1) => {
    stats.samples++;
    for (const { inverse, cells } of scales) {
      const cell = cells.get(key(Math.floor(x * inverse), Math.floor(y * inverse), Math.floor(z * inverse)));
      if (!cell) continue;
      for (const id of cell) {
        if (id === ignore) continue;
        stats.candidateTests++;
        const p = id * 6;
        if (x >= bounds[p] && x < bounds[p + 3] && y >= bounds[p + 1] && y < bounds[p + 4] && z >= bounds[p + 2] && z < bounds[p + 5]) return true;
      }
    }
    return false;
  };
  return { occupied, ids, stats };
}

// Two Float32 words each hold twelve base-4 values, at most 2^24-1: every
// integer is exactly representable on both WebGL and WebGPU vertex inputs.
export function packVoxelAO(corners, target = new Float32Array(2), offset = 0) {
  for (let word = 0; word < 2; word++) {
    let packed = 0, place = 1;
    for (let i = 0; i < 12; i++, place *= 4) {
      const level = corners[word * 12 + i];
      if (!Number.isInteger(level) || level < 0 || level > 3) throw new RangeError("AO corners must be integers from zero to three");
      packed += level * place;
    }
    target[offset + word] = packed;
  }
  return target;
}
export function unpackVoxelAO(words, corner, offset = 0) {
  if (!Number.isInteger(corner) || corner < 0 || corner >= 24) throw new RangeError("AO corner must be zero through twenty-three");
  return Math.floor(words[offset + (corner >= 12 ? 1 : 0)] / 4 ** (corner % 12)) % 4;
}

export function bakeVoxelAmbientOcclusion(boxes, { index = createVoxelAOIndex(boxes), radius = VOXEL_AO.radius } = {}) {
  if (!(radius > 0) || !Number.isFinite(radius)) throw new RangeError("AO radius must be finite and positive");
  const started = now(), packed = new Float32Array(boxes.length * 2), corners = new Uint8Array(24), sample = [0, 0, 0];
  let darkCorners = 0;
  boxes.forEach((box, id) => {
    const ignore = index.ids.get(box) ?? -1;
    for (let face = 0; face < 6; face++) {
      const [normal, direction, u, v] = VOXEL_AO_FACES[face];
      // Samples just outside the face, with two side contacts and one diagonal.
      // Coplanar adjacent top faces stay bright; a wall rising beside that face
      // occludes it. Radius follows fine boxes rather than leaping over them.
      const reach = Math.min(radius, box[u + 3] * .25, box[v + 3] * .25), epsilon = Math.max(1e-7, Math.min(reach, box[normal + 3]) * .002);
      for (let corner = 0; corner < 4; corner++) {
        const su = corner & 1 ? 1 : -1, sv = corner & 2 ? 1 : -1;
        sample[0] = box[0]; sample[1] = box[1]; sample[2] = box[2];
        sample[normal] += direction * (box[normal + 3] / 2 + epsilon);
        const cu = box[u] + su * box[u + 3] / 2, cv = box[v] + sv * box[v + 3] / 2;
        sample[u] = cu + su * reach; sample[v] = cv - sv * reach;
        const sideU = +index.occupied(sample[0], sample[1], sample[2], ignore);
        sample[u] = cu - su * reach; sample[v] = cv + sv * reach;
        const sideV = +index.occupied(sample[0], sample[1], sample[2], ignore);
        let occlusion;
        if (sideU && sideV) occlusion = 3;
        else {
          sample[u] = cu + su * reach; sample[v] = cv + sv * reach;
          occlusion = sideU + sideV + +index.occupied(sample[0], sample[1], sample[2], ignore);
        }
        corners[face * 4 + corner] = occlusion; if (occlusion) darkCorners++;
      }
    }
    packVoxelAO(corners, packed, id * 2);
  });
  return { packed, stats: { ...index.stats, bakeMs: now() - started, bytes: packed.byteLength, instances: boxes.length, darkCorners, radius } };
}

// An axis permutation/sign change (e.g. a 90-degree parent rotation) does not
// change occupancy, but the packed world-face order must follow the local cube.
export function remapVoxelAO(words, axes, target = new Float32Array(2), offset = 0) {
  if (axes[0].axis === 0 && axes[0].sign === 1 && axes[1].axis === 1 && axes[1].sign === 1 && axes[2].axis === 2 && axes[2].sign === 1) {
    target[offset] = words[0]; target[offset + 1] = words[1]; return target;
  }
  const corners = new Uint8Array(24);
  for (let face = 0; face < 6; face++) {
    const [normal, direction, u, v] = VOXEL_AO_FACES[face], axis = axes[normal];
    const worldFace = axis.axis * 2 + (axis.sign * direction < 0 ? 1 : 0), [, , wu, wv] = VOXEL_AO_FACES[worldFace];
    for (let c = 0; c < 4; c++) {
      const signs = [0, 0, 0]; signs[u] = c & 1 ? 1 : -1; signs[v] = c & 2 ? 1 : -1;
      const su = signs[axes.findIndex(a => a.axis === wu)] * axes.find(a => a.axis === wu).sign;
      const sv = signs[axes.findIndex(a => a.axis === wv)] * axes.find(a => a.axis === wv).sign;
      corners[face * 4 + c] = unpackVoxelAO(words, worldFace * 4 + (su > 0 ? 1 : 0) + (sv > 0 ? 2 : 0));
    }
  }
  return packVoxelAO(corners, target, offset);
}
