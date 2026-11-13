import * as GPU from "three/webgpu";
// Own Texture and Source identities so renderer disposal listeners never attach
// to legacy resources. Only decoded images and pixel arrays are borrowed.
function createVillageNodeTextures() {
  const cache = /* @__PURE__ */ new WeakMap(), entries = /* @__PURE__ */ new Set(), synced = /* @__PURE__ */ new Set();
  let disposed = false, batchDepth = 0;
  const stats = { wrappers: 0, uploads: 0, synchronizations: 0 };
  function synchronize(entry) {
    if (batchDepth && synced.has(entry)) return;
    stats.synchronizations++;
    const source = entry.source, target = entry.texture;
    const sourceImage = source.image, image = sourceImage?.image ?? sourceImage;
    const width = image?.width, height = image?.height;
    const decoded = Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0 && image?.complete !== false;
    const status = target.userData.villageTextureSource ??= {};
    status.uuid = source.uuid; status.name = source.name; status.type = source.constructor?.name;
    status.sourceVersion = source.version; status.width = width ?? null; status.height = height ?? null; status.ready = decoded && source.version > 0;
    // Preserve Three's version-zero asynchronous texture path. Incrementing a
    // wrapper before its source is decoded forces an invalid real upload instead
    // of Three's own pending-texture binding. A replacement may keep its last
    // decoded image while the next image loads.
    for (const key of ["offset", "repeat", "center", "matrix"]) if (source[key] && target[key]?.copy) target[key].copy(source[key]);
    target.rotation = source.rotation;
    target.matrixAutoUpdate = source.matrixAutoUpdate;
    if (!decoded || source.version <= 0) {
      if (image && image.complete !== false && source.version > 0) throw new Error(`Village texture ${source.name || source.uuid} (${source.constructor?.name}) has invalid decoded dimensions ${width}x${height}`);
      if (batchDepth) synced.add(entry);
      return;
    }
    let changed = entry.version !== source.version || target.image !== sourceImage;
    target.image = sourceImage;
    for (const key of ["mapping", "wrapS", "wrapT", "magFilter", "minFilter", "anisotropy", "format", "internalFormat", "type", "generateMipmaps", "premultiplyAlpha", "flipY", "unpackAlignment", "colorSpace", "compareFunction"]) if (source[key] !== void 0 && target[key] !== source[key]) {
      target[key] = source[key];
      changed = true;
    }
    target.mipmaps = source.mipmaps;
    entry.version = source.version;
    if (changed) {
      target.needsUpdate = true;
      stats.uploads++;
    }
    if (batchDepth) synced.add(entry);
  }
  function resolve(source) {
    if (!source) return null;
    if (disposed) throw new Error("Village texture bridge is disposed");
    if (!source.isTexture) throw new TypeError("Village GPU texture needs a source Texture");
    let entry = cache.get(source);
    if (!entry) {
      let texture;
      if (source.isDataTexture) texture = new GPU.DataTexture(source.image?.data, source.image?.width, source.image?.height, source.format, source.type);
      else if (source.isCanvasTexture) texture = new GPU.CanvasTexture(source.image);
      else if (source.isCompressedTexture) throw new Error("Compressed village GPU texture requires an explicit format port");
      else texture = new GPU.Texture(source.image);
      // Constructors such as CanvasTexture opt into immediate upload. The
      // presentation wrapper follows its legacy source's readiness instead.
      texture.version = 0;
      texture.source.version = 0;
      texture.name = `GPU:${source.name || source.uuid}`;
      entry = { source, texture, version: -1 };
      cache.set(source, entry);
      entries.add(entry);
      stats.wrappers = entries.size;
    }
    synchronize(entry);
    return entry.texture;
  }
  return { resolve,
  // A render submission reads a synchronous source snapshot. Many per-mesh
  // materials borrow the same atlas; inspect each wrapper once in that scope.
  // Outside a batch, resolve/sync still observe edits immediately.
  batch(read) {
    if (disposed) throw new Error("Village texture bridge is disposed");
    batchDepth++;
    try { return read(); }
    finally { if (--batchDepth === 0) synced.clear(); }
  }, sync() {
    if (!disposed) for (const entry of entries) synchronize(entry);
  }, dispose() {
    if (disposed) return;
    disposed = true;
    for (const entry of entries) entry.texture.dispose();
    entries.clear();
    synced.clear();
    stats.wrappers = 0;
  }, stats };
}
export {
  createVillageNodeTextures
};
