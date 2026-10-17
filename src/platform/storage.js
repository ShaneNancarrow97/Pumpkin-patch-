import { SAVE_KEY, decodeSave, fresh, serialize } from "../core/model.mjs";

var RETAINED_SAVE_KEY = SAVE_KEY + "-before-schema-9";
function createPersistence(storage) {
  let retained = null, pendingRetention = false, blocked = false;
  return {
    load() {
      let raw;
      try {
        raw = storage?.getItem(SAVE_KEY) || null;
      } catch {
        return fresh();
      }
      if (!raw)
        return fresh();
      const decoded = decodeSave(raw);
      if (!decoded) {
        retained = raw;
        pendingRetention = true;
        blocked = true;
        return fresh();
      }
      if (JSON.parse(raw).version < 9) {
        retained = raw;
        pendingRetention = true;
      }
      return decoded;
    },
    save(state) {
      if (blocked)
        return { ok: false, reason: "The stored save could not be loaded and has been kept. Download its original, or deliberately load a compatible backup or reset progress." };
      try {
        if (!storage)
          throw new Error("Storage unavailable");
        if (pendingRetention && retained) {
          storage.setItem(RETAINED_SAVE_KEY, retained);
          pendingRetention = false;
        }
        storage.setItem(SAVE_KEY, serialize(state));
        return { ok: true };
      } catch {
        return { ok: false, reason: "Saving is unavailable in this browser. Download a backup to keep your current progress." };
      }
    },
    allowReplacement() {
      blocked = false;
    },
    get blocked() {
      return blocked;
    },
    get retainedSave() {
      if (retained)
        return retained;
      try {
        return storage?.getItem(RETAINED_SAVE_KEY) || storage?.getItem(SAVE_KEY + "-before-schema-8") || storage?.getItem(SAVE_KEY + "-before-schema-7") || storage?.getItem(SAVE_KEY + "-before-schema-6") || storage?.getItem(SAVE_KEY + "-before-schema-5") || storage?.getItem(SAVE_KEY + "-before-schema-4") || storage?.getItem(SAVE_KEY + "-before-schema-3") || storage?.getItem(SAVE_KEY + "-before-schema-2") || null;
      } catch {
        return null;
      }
    }
  };
}

export { createPersistence };
