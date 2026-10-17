function asset(path) {
  return globalThis.PumpkinPatchAssets?.[path] || path;
}

export { asset };
