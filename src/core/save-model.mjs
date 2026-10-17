import { serialize } from "./model.mjs";
import { SAVE_SCHEMA, repairSave, saveSchema } from "./save-repair.mjs";

function makeBackup(state, gameVersion) {
  return JSON.stringify({ format: "pumpkin-patch-backup", revision: 1, gameVersion, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), state: JSON.parse(serialize(state)) });
}
// Reads a backup file or a raw save. Damaged sections are repaired and listed
// in repairs, so the import preview can say what will change.
function readBackupWithRepairs(text) {
  if (typeof text !== "string" || text.length > 8e6)
    throw new Error("Choose a Pumpkin Patch backup smaller than 8 MB.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not a readable Pumpkin Patch backup.");
  }
  if (data?.format !== void 0) {
    if (data.format !== "pumpkin-patch-backup" || data.revision !== 1)
      throw new Error("This backup comes from an unsupported version.");
    data = data.state;
  }
  const raw = JSON.stringify(data), schema = saveSchema(raw);
  if (schema !== null && schema > SAVE_SCHEMA)
    throw new Error("This backup comes from a newer version of the game (save format " + schema + "). Your current patch has been kept.");
  const restored = repairSave(raw);
  if (!restored)
    throw new Error("This backup is incomplete. Your current patch has been kept.");
  return restored;
}
function readBackup(text) {
  return readBackupWithRepairs(text).state;
}

export { makeBackup, readBackup, readBackupWithRepairs };
