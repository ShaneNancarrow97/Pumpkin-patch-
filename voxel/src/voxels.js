import * as THREE from "three";

const BOX = new THREE.BoxGeometry(1, 1, 1);
const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), quat = new THREE.Quaternion();

// Collects boxes, then builds them as two instanced meshes: lit voxels that
// cast and take shadows, and glowing voxels that ignore light (and bloom).
export class Voxels {
  constructor() { this.solid = []; this.glow = []; }

  // A box by its minimum corner and size, in world units. y is up.
  // A box flat on any axis draws nothing, but its normals divide by zero and the
  // bloom spreads the NaN across the screen, so skip it. A negative size is the
  // same box measured the other way; turn it round so it isn't lit inside out.
  box(x, y, z, w, h, d, color, glow = false) {
    if (!(w && h && d)) return this;
    (glow ? this.glow : this.solid).push([x + w / 2, y + h / 2, z + d / 2, Math.abs(w), Math.abs(h), Math.abs(d), color]);
    return this;
  }

  // A box centred on (x, z), standing on y.
  block(x, y, z, w, h, d, color, glow = false) {
    return this.box(x - w / 2, y, z - d / 2, w, h, d, color, glow);
  }

  build({ shadows = true } = {}) {
    const group = new THREE.Group();
    const make = (list, material, cast) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(BOX, material, list.length);
      const color = new THREE.Color();
      list.forEach(([x, y, z, w, h, d, c], i) => {
        mesh.setMatrixAt(i, matrix.compose(position.set(x, y, z), quat, scale.set(w, h, d)));
        mesh.setColorAt(i, color.set(c));
      });
      mesh.castShadow = cast && shadows;
      mesh.receiveShadow = shadows;
      group.add(mesh);
    };
    make(this.solid, new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 }), true);
    make(this.glow, new THREE.MeshBasicMaterial({ toneMapped: false }), false);
    return group;
  }
}

// Small deterministic random numbers, so the world looks the same every load.
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Nudges a colour lighter or darker so repeated voxels don't look flat.
export function vary(hex, amount, r) {
  const c = new THREE.Color(hex), k = 1 + (r() - 0.5) * 2 * amount;
  return c.setRGB(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k)).getHex();
}

// Voxels split into squares of the ground, each built as its own meshes, so the
// renderer skips the squares out of view (the hayride's long woodland uses it).
export function chunkedVoxels(size = 16) {
  const chunks = new Map();
  return {
    at(x, z) { const key = `${Math.floor(x / size)},${Math.floor(z / size)}`; let v = chunks.get(key); if (!v) chunks.set(key, v = new Voxels()); return v; },
    build(root) { for (const v of chunks.values()) root.add(v.build()); return root; },
    get boxes() { let n = 0; for (const v of chunks.values()) n += v.solid.length + v.glow.length; return n; },
    get count() { return chunks.size; },
  };
}
