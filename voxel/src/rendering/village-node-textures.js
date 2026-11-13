import * as GPU from "three/webgpu";
// Own Texture and Source identities so renderer disposal listeners never attach
// to legacy resources. Only decoded images and pixel arrays are borrowed.
function createVillageNodeTextures() {
  const cache = /* @__PURE__ */ new WeakMap(), entries = /* @__PURE__ */ new Set();
  let disposed = false;
  const stats = { wrappers: 0, uploads: 0 };
  function synchronize(entry) {
    const source = entry.source, target = entry.texture;
    let changed = entry.version !== source.version || target.image !== source.image;
    target.image = source.image;
    for (const key of ["mapping", "wrapS", "wrapT", "magFilter", "minFilter", "anisotropy", "format", "internalFormat", "type", "generateMipmaps", "premultiplyAlpha", "flipY", "unpackAlignment", "colorSpace", "compareFunction"]) if (source[key] !== void 0 && target[key] !== source[key]) {
      target[key] = source[key];
      changed = true;
    }
    target.mipmaps = source.mipmaps;
    target.rotation = source.rotation;
    target.matrixAutoUpdate = source.matrixAutoUpdate;
    for (const key of ["offset", "repeat", "center", "matrix"]) if (source[key] && target[key]?.copy) target[key].copy(source[key]);
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
