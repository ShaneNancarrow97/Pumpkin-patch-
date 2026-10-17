import { SAVE_KEY, fresh, serialize } from "../core/model.mjs";
import { SAVE_SCHEMA, repairSave, saveSchema } from "../core/save-repair.mjs";

var RETAINED_SAVE_KEY = SAVE_KEY + "-before-schema-9";
var REPAIRED_SAVE_KEY = SAVE_KEY + "-before-repair";
var SNAPSHOTS_KEY = SAVE_KEY + "-snapshots";
var LAST_BACKUP_KEY = SAVE_KEY + "-last-backup";
var SNAPSHOT_COUNT = 3;
var SNAPSHOT_INTERVAL_MS = 10 * 60 * 1e3;
function createPersistence(storage, now = () => Date.now()) {
  let retained = null, retainedKey = RETAINED_SAVE_KEY, pendingRetention = false, blocked = false, repairs = [], newerSchema = null;
  const read = (key) => {
    try {
      return storage?.getItem(key) || null;
    } catch {
      return null;
    }
  };
  const readSnapshots = () => {
    try {
      const list = JSON.parse(read(SNAPSHOTS_KEY) || "[]");
      return Array.isArray(list) ? list.filter((s) => s && Number.isFinite(s.at) && typeof s.raw === "string") : [];
    } catch {
      return [];
    }
  };
  // Keeps up to three earlier copies, at least ten minutes apart.
  const snapshot = (raw) => {
    const list = readSnapshots(), at = now();
    if (list.length && at - list[0].at < SNAPSHOT_INTERVAL_MS && at >= list[0].at) return;
    try {
      storage.setItem(SNAPSHOTS_KEY, JSON.stringify([{ at, raw }, ...list].slice(0, SNAPSHOT_COUNT)));
    } catch {
    }
  };
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
      const result = repairSave(raw);
      if (!result) {
        const schema = saveSchema(raw);
        newerSchema = schema !== null && schema > SAVE_SCHEMA ? schema : null;
        retained = raw;
        pendingRetention = true;
        blocked = true;
        return fresh();
      }
      repairs = result.repairs;
      if (repairs.length) {
        retained = raw;
        retainedKey = REPAIRED_SAVE_KEY;
        pendingRetention = true;
      } else if (saveSchema(raw) < SAVE_SCHEMA) {
        retained = raw;
        pendingRetention = true;
      }
      return result.state;
    },
    save(state) {
      if (blocked)
        return { ok: false, reason: newerSchema ? "This patch was saved by a newer version of the game (save format " + newerSchema + ") and has been kept untouched. Open it with that version, or download the saved original below." : "The stored save could not be loaded and has been kept. Download its original, or deliberately load a compatible backup or reset progress." };
      try {
        if (!storage)
          throw new Error("Storage unavailable");
        if (pendingRetention && retained) {
          storage.setItem(retainedKey, retained);
          pendingRetention = false;
        }
        const raw = serialize(state);
        storage.setItem(SAVE_KEY, raw);
        snapshot(raw);
        return { ok: true };
      } catch {
        return { ok: false, reason: "Saving is unavailable in this browser. Download a backup to keep your current progress." };
      }
    },
    allowReplacement() {
      blocked = false;
      newerSchema = null;
    },
    get blocked() {
      return blocked;
    },
    // Section names reset while loading the stored save; empty when it was intact.
    get repairs() {
      return repairs;
    },
    get newerSchema() {
      return newerSchema;
    },
    // Earlier copies, newest first: [{ at, raw }].
    get snapshots() {
      return readSnapshots();
    },
    get lastBackup() {
      const at = Number(read(LAST_BACKUP_KEY));
      return Number.isFinite(at) && at > 0 ? at : null;
    },
    markBackup() {
      try {
        storage?.setItem(LAST_BACKUP_KEY, String(now()));
      } catch {
      }
    },
    get retainedSave() {
      if (retained)
        return retained;
      for (const key of [REPAIRED_SAVE_KEY, RETAINED_SAVE_KEY, ...[8, 7, 6, 5, 4, 3, 2].map((n) => SAVE_KEY + "-before-schema-" + n)]) {
        const raw = read(key);
        if (raw) return raw;
      }
      return null;
    }
  };
}

export { createPersistence };
