import * as GPU from "three/webgpu";
// Own Texture and Source identities so renderer disposal listeners never attach
// to legacy resources. Only decoded images and pixel arrays are borrowed.
function createVillageNodeTextures() {
  const cache = /* @__PURE__ */ new WeakMap(), entries = /* @__PURE__ */ new Set();
  let disposed = false;
  const stats = { wrappers: 0, uploads: 0 };
  function synchronize(entry) {
    const source = entry.source, target = entry.texture;
    const image = source.image?.image ?? source.image;
    const width = image?.width, height = image?.height;
    const decoded = Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0 && image?.complete !== false;
    target.userData.villageTextureSource = { uuid: source.uuid, name: source.name, type: source.constructor?.name, sourceVersion: source.version, width: width ?? null, height: height ?? null, ready: decoded && source.version > 0 };
    // Preserve Three's version-zero asynchronous texture path. Incrementing a
    // wrapper before its source is decoded forces an invalid real upload instead
    // of Three's own pending-texture binding. A replacement may keep its last
    // decoded image while the next image loads.
    for (const key of ["offset", "repeat", "center", "matrix"]) if (source[key] && target[key]?.copy) target[key].copy(source[key]);
    target.rotation = source.rotation;
    target.matrixAutoUpdate = source.matrixAutoUpdate;
    if (!decoded || source.version <= 0) {
      if (image && image.complete !== false && source.version > 0) throw new Error(`Village texture ${source.name || source.uuid} (${source.constructor?.name}) has invalid decoded dimensions ${width}x${height}`);
      return;
    }
    let changed = entry.version !== source.version || target.image !== source.image;
    target.image = source.image;
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
  return { resolve, sync() {
    if (!disposed) for (const entry of entries) synchronize(entry);
  }, dispose() {
    if (disposed) return;
    disposed = true;
    for (const entry of entries) entry.texture.dispose();
    entries.clear();
    stats.wrappers = 0;
  }, stats };
}
export {
  createVillageNodeTextures
};
