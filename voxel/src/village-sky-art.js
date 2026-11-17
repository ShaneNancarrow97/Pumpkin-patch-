import * as THREE from "three";

// One small panorama is shared by live views. The lease owns its loader's
// texture; the sky shader only borrows it. Retired in-flight loads are never
// delivered to a replacement view and dispose once when their callback lands.
export const VILLAGE_SKY_ART = Object.freeze({ maxLongSide: 1024, maxTextures: 1 });
export function villageSkyTextureBytes(width, height) {
  if (![width, height].every(value => Number.isInteger(value) && value > 0)) throw new TypeError("Village sky texture dimensions must be positive integers.");
  let bytes = 0;
  for (;;) {
    bytes += width * height * 4;
    if (width === 1 && height === 1) return bytes;
    width = Math.max(1, Math.floor(width / 2)); height = Math.max(1, Math.floor(height / 2));
  }
}

export function createVillageSkyArtCache({ loader = new THREE.TextureLoader() } = {}) {
  const entries = new Map();
  const disposeTexture = entry => {
    if (entry.disposed) return;
    entry.disposed = true; (entry.texture ?? entry.pending)?.dispose();
  };
  function acquire(url, { onReady, onError, encodedBytes = 0 } = {}) {
    if (typeof url !== "string" || !url) throw new TypeError("Village sky art needs a panorama URL.");
    let entry = entries.get(url), fresh = false;
    if (!entry) {
      if (entries.size >= VILLAGE_SKY_ART.maxTextures) throw new RangeError("Village sky art is limited to one shared panorama.");
      fresh = true; entry = { refs: 0, listeners: new Set(), status: "loading", texture: null, pending: null, info: null, error: null, disposed: false }; entries.set(url, entry);
    }
    const listener = { onReady, onError }; entry.refs++; entry.listeners.add(listener);
    let released = false;
    const fail = error => {
      entry.status = "failed"; entry.error = error; disposeTexture(entry);
      for (const target of entry.listeners) target.onError?.(error);
    };
    if (fresh) {
      try {
        const pending = loader.load(url, texture => {
          entry.texture = texture;
          if (!entry.refs) { disposeTexture(entry); return; }
          const width = texture.image?.naturalWidth || texture.image?.width, height = texture.image?.naturalHeight || texture.image?.height;
          if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 1 || width !== height * 2 || Math.max(width, height) > VILLAGE_SKY_ART.maxLongSide) {
            fail(new RangeError("Village sky art must be a 2:1 panorama no larger than 1024 pixels.")); return;
          }
          texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.generateMipmaps = true; texture.anisotropy = 1; texture.needsUpdate = true;
          entry.status = "ready"; entry.info = Object.freeze({ width, height, textureBytes: villageSkyTextureBytes(width, height), encodedBytes: Math.max(0, encodedBytes) });
          for (const target of entry.listeners) target.onReady?.(texture, entry.info);
        }, undefined, error => fail(error));
        entry.pending = pending;
        // Synchronous loaders are useful in tests; a synchronous failure still
        // owns the texture returned by load, even before pending was assigned.
        if (entry.disposed && pending && pending !== entry.texture) pending.dispose();
      } catch (error) { fail(error); }
    } else if (entry.status === "ready") onReady?.(entry.texture, entry.info);
    else if (entry.status === "failed") onError?.(entry.error);
    return {
      get status() { return released ? "released" : entry.status; },
      release() {
        if (released) return; released = true; entry.listeners.delete(listener); entry.refs--;
        if (!entry.refs) { if (entries.get(url) === entry) entries.delete(url); if (entry.status !== "loading") disposeTexture(entry); }
      },
    };
  }
  return { acquire, get size() { return entries.size; } };
}
const cache = createVillageSkyArtCache();
export const acquireVillageSkyArt = (url, options) => cache.acquire(url, options);

// View integration stays small and testable without importing a runtime asset
// in Node. A material retirement releases the lease and restores its shader;
// explicit release drops just the art, leaving the procedural layer usable.
export function attachVillageSkyArt(material, layer, url, { encodedBytes = 0, resourceCache = cache } = {}) {
  let lease, released = false;
  const onDisposed = () => { release(); layer.dispose(); };
  function release() {
    if (released) return; released = true;
    material.removeEventListener("dispose", onDisposed); layer.clearArt(); lease?.release();
  }
  material.addEventListener("dispose", onDisposed);
  try {
    lease = resourceCache.acquire(url, { encodedBytes, onReady: (texture, info) => { if (!released) layer.setArt(texture, info); }, onError: () => { if (!released) layer.clearArt(); } });
  } catch (error) { release(); throw error; }
  return { release, get status() { return released ? "released" : lease.status; } };
}
